import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './order.schema';
import { ArtworksService } from '../artworks/artworks.service';
import { ArtworkStatus } from '../artworks/artwork.schema';
import { MercadoPagoService } from '../payments/mercadopago.service';

export class CreateOrderDto {
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  customer: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    address: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  items: Array<{ artworkId: string; variant?: string }>;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private artworksService: ArtworksService,
    private mercadoPago: MercadoPagoService,
  ) {}

  async create(dto: CreateOrderDto): Promise<{ order: OrderDocument; initPoint: string }> {
    const orderItems: Array<{ artwork: Types.ObjectId; title: string; price: number; image: string; variant?: string }> = [];
    let total = 0;

    for (const item of dto.items) {
      const artwork = await this.artworksService.findById(item.artworkId);
      if (artwork.status !== ArtworkStatus.AVAILABLE) {
        throw new BadRequestException(`A obra "${artwork.title}" não está disponível`);
      }

      // Obras em série: o pedido precisa indicar qual variante está sendo comprada
      if (artwork.variants.length > 0) {
        const variant = artwork.variants.find(v => v.name === item.variant);
        if (!variant) {
          throw new BadRequestException(`Selecione qual pintura de "${artwork.title}" deseja adquirir`);
        }
        if (variant.status !== ArtworkStatus.AVAILABLE) {
          throw new BadRequestException(`"${artwork.title} — ${variant.name}" não está disponível`);
        }
        orderItems.push({
          artwork: new Types.ObjectId(item.artworkId),
          title: `${artwork.title} — ${variant.name}`,
          price: artwork.price,
          image: variant.image,
          variant: variant.name,
        });
      } else {
        orderItems.push({
          artwork: new Types.ObjectId(item.artworkId),
          title: artwork.title,
          price: artwork.price,
          image: artwork.images[0] || '',
        });
      }
      total += artwork.price;
    }

    const order = await this.orderModel.create({
      paymentMethod: dto.paymentMethod as any,
      customer: dto.customer,
      items: orderItems,
      totalAmount: total,
      status: OrderStatus.PENDING,
    });

    // Reserva as obras enquanto o cliente paga (saem do catálogo, mas não
    // são dadas como vendidas até o webhook confirmar o pagamento).
    for (const item of dto.items) {
      if (item.variant) {
        await this.artworksService.markVariantAsReserved(item.artworkId, item.variant);
      } else {
        await this.artworksService.markAsReserved(item.artworkId);
      }
    }

    // Cria a preference do Checkout Pro. Se falhar, libera a reserva e propaga.
    try {
      const pref = await this.mercadoPago.createPreference({
        orderId: String(order._id),
        items: orderItems.map(i => ({ title: i.title, quantity: 1, unit_price: i.price })),
        payer: { name: dto.customer.name, email: dto.customer.email },
      });
      order.preferenceId = pref.id;
      await order.save();
      return { order, initPoint: pref.initPoint };
    } catch (err) {
      await this.releaseItems(dto.items);
      order.status = OrderStatus.CANCELLED;
      await order.save();
      throw err;
    }
  }

  // Chamado pelo webhook do Mercado Pago. Confirma ou cancela o pedido conforme
  // o status real do pagamento. Idempotente: ignora pedidos já finalizados.
  async handleWebhook(paymentId: string): Promise<void> {
    const payment = await this.mercadoPago.getPayment(paymentId);
    const orderId = payment.externalReference;
    if (!orderId) {
      this.logger.warn(`Webhook sem external_reference (payment ${paymentId})`);
      return;
    }

    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      this.logger.warn(`Webhook para pedido inexistente: ${orderId}`);
      return;
    }
    if (order.status !== OrderStatus.PENDING) {
      // Já confirmado ou cancelado antes — nada a fazer.
      return;
    }

    const dtoItems = order.items.map(i => ({
      artworkId: String(i.artwork),
      variant: i.variant || undefined,
    }));

    if (payment.status === 'approved') {
      for (const item of dtoItems) {
        if (item.variant) {
          await this.artworksService.markVariantAsSold(item.artworkId, item.variant);
        } else {
          await this.artworksService.markAsSold(item.artworkId);
        }
      }
      order.status = OrderStatus.PAID;
      order.paymentId = payment.id;
      await order.save();
      this.logger.log(`Pedido ${orderId} confirmado (pagamento ${payment.id}).`);
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await this.releaseItems(dtoItems);
      order.status = OrderStatus.CANCELLED;
      order.paymentId = payment.id;
      await order.save();
      this.logger.log(`Pedido ${orderId} cancelado (pagamento ${payment.status}).`);
    }
    // pending / in_process: mantém o pedido PENDING e a obra reservada.
  }

  // Devolve obras/variantes ao catálogo.
  private async releaseItems(items: Array<{ artworkId: string; variant?: string }>): Promise<void> {
    for (const item of items) {
      try {
        if (item.variant) {
          await this.artworksService.releaseVariant(item.artworkId, item.variant);
        } else {
          await this.artworksService.release(item.artworkId);
        }
      } catch (err) {
        this.logger.error(`Falha ao liberar obra ${item.artworkId}`, err as Error);
      }
    }
  }

  async findAll(): Promise<OrderDocument[]> {
    return this.orderModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<OrderDocument> {
    return this.orderModel.findById(id).exec() as Promise<OrderDocument>;
  }

  async getStats(): Promise<{ total: number; sold: number; revenue: number; pendingOrders: number }> {
    const orders = await this.orderModel.find().exec();
    const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    return {
      total: orders.length,
      sold: orders.filter(o => o.status === OrderStatus.PAID).length,
      revenue,
      pendingOrders: orders.filter(o => o.status === OrderStatus.PENDING).length,
    };
  }
}
