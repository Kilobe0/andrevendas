import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IsString, IsEmail, IsOptional, IsArray, IsNotEmpty, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Order, OrderDocument, OrderStatus } from './order.schema';
import { ArtworksService } from '../artworks/artworks.service';
import { ArtworkStatus } from '../artworks/artwork.schema';
import { MercadoPagoService } from '../payments/mercadopago.service';

// Decorators são obrigatórios: o ValidationPipe global (whitelist: true) descarta
// qualquer propriedade sem validação — sem isso o dto chega vazio no serviço.
class OrderAddressDto {
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() number?: string;
  @IsOptional() @IsString() complement?: string;
  @IsOptional() @IsString() neighborhood?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() zipCode?: string;
}

class OrderCustomerDto {
  @IsString() @IsNotEmpty() name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() @IsNotEmpty() cpf: string;
  @ValidateNested() @Type(() => OrderAddressDto) address: OrderAddressDto;
}

class OrderItemDto {
  @IsString() @IsNotEmpty() artworkId: string;
  @IsOptional() @IsString() variant?: string;
}

export class CreateOrderDto {
  // O método de pagamento não é escolhido aqui — quem decide é o Checkout Pro.
  // Ele é capturado do Mercado Pago no webhook (ver handleWebhook).
  @ValidateNested() @Type(() => OrderCustomerDto)
  customer: OrderCustomerDto;

  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];
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
      if (payment.paymentTypeId) order.paymentMethod = payment.paymentTypeId;
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

  // Versão pública do pedido: expõe apenas o status (a página de retorno do
  // checkout consulta sem autenticação). Id inválido cai em 404, não em 500.
  async getPublicStatus(id: string): Promise<{ status: OrderStatus }> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Pedido não encontrado');
    const order = await this.orderModel.findById(id).select('status').exec();
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return { status: order.status };
  }

  // Exclui um pedido. Se ainda estava PENDING, libera as obras reservadas
  // de volta ao catálogo (um pedido PAID não mexe nas obras já vendidas).
  async remove(id: string): Promise<void> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.status === OrderStatus.PENDING) {
      await this.releaseItems(
        order.items.map(i => ({ artworkId: String(i.artwork), variant: i.variant || undefined })),
      );
    }
    await this.orderModel.findByIdAndDelete(id).exec();
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
