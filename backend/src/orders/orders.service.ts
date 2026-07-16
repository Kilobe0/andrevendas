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
import { MercadoPagoService, PREFERENCE_TTL_MS } from '../payments/mercadopago.service';
import { MelhorEnvioService, buildQuoteProduct, mergeVolume } from '../shipping/melhorenvio.service';

// Reservas de pedidos pendentes expiram depois disso. Margem de 5 min acima
// da validade do link de pagamento (PREFERENCE_TTL_MS): quando o backend
// libera a obra, o Mercado Pago já não aceita mais o pagamento antigo.
const RESERVATION_TTL_MS = PREFERENCE_TTL_MS + 5 * 60 * 1000;

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

// Frete escolhido pelo cliente. Só identifica a opção (transportadora +
// serviço) — o PREÇO é recotado no servidor; nunca confiamos no navegador.
class OrderShippingDto {
  @IsString() @IsNotEmpty() company: string;
  @IsString() @IsNotEmpty() service: string;
}

export class CreateOrderDto {
  // O método de pagamento não é escolhido aqui — quem decide é o Checkout Pro.
  // Ele é capturado do Mercado Pago no webhook (ver handleWebhook).
  @ValidateNested() @Type(() => OrderCustomerDto)
  customer: OrderCustomerDto;

  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional() @ValidateNested() @Type(() => OrderShippingDto)
  shipping?: OrderShippingDto;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private artworksService: ArtworksService,
    private mercadoPago: MercadoPagoService,
    private melhorEnvio: MelhorEnvioService,
  ) {}

  async create(dto: CreateOrderDto): Promise<{ order: OrderDocument; initPoint: string }> {
    // Antes de validar disponibilidade, devolve ao catálogo obras presas em
    // checkouts abandonados (pedido PENDING além do prazo da reserva).
    await this.expireStaleOrders();

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

    // Frete: recota no servidor e localiza a opção que o cliente escolheu.
    // Preço sempre o do servidor — o navegador só indica transportadora+serviço.
    let shipping: { serviceId: number; company: string; service: string; price: number; deliveryDays: number } | undefined;
    if (dto.shipping) {
      const zip = dto.customer.address?.zipCode?.replace(/\D/g, '') || '';
      if (zip.length !== 8) {
        throw new BadRequestException('Informe um CEP válido para calcular o frete');
      }
      const artworks = await Promise.all(dto.items.map(i => this.artworksService.findById(i.artworkId)));
      const options = await this.melhorEnvio.calculate(zip, artworks.map(a => buildQuoteProduct(a)));
      const chosen = options.find(
        o => o.company === dto.shipping!.company && o.service === dto.shipping!.service,
      );
      if (!chosen) {
        throw new BadRequestException(
          'A opção de frete escolhida não está mais disponível — recalcule o frete',
        );
      }
      shipping = chosen;
      total += chosen.price;
    }

    const order = await this.orderModel.create({
      customer: dto.customer,
      items: orderItems,
      totalAmount: total,
      shipping,
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
        items: [
          ...orderItems.map(i => ({ title: i.title, quantity: 1, unit_price: i.price })),
          ...(shipping
            ? [{
                title: `Frete — ${shipping.service} (${shipping.company})`,
                quantity: 1,
                unit_price: shipping.price,
              }]
            : []),
        ],
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
      // Já confirmado ou cancelado antes — nada a fazer. Exceção que merece
      // alarde: pagamento aprovado de um pedido que expirou nesse meio-tempo
      // (cliente pagou no limite do prazo). Precisa de ação manual do admin.
      if (payment.status === 'approved' && order.status === OrderStatus.CANCELLED) {
        this.logger.error(
          `Pagamento ${payment.id} APROVADO para pedido ${orderId} já cancelado/expirado — verificar reembolso ou reativação manual.`,
        );
      }
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

  // Compra a etiqueta no Melhor Envio para um pedido pago com frete.
  // Ação do admin (botão no painel) — debita a carteira Melhor Envio de
  // verdade, por isso nunca é disparada automaticamente pelo webhook.
  async buyShipment(id: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Só é possível comprar etiqueta de pedido pago');
    }
    if (!order.shipping) {
      throw new BadRequestException('Este pedido é de entrega local — não usa etiqueta');
    }
    if (order.shipment?.meOrderId && order.shipment.status !== 'canceled') {
      throw new BadRequestException('Este pedido já tem etiqueta comprada');
    }

    const a = order.customer.address;
    const zip = (a?.zipCode || '').replace(/\D/g, '');
    if (!a?.street || !a?.number || !a?.city || !a?.state || zip.length !== 8) {
      throw new BadRequestException('Endereço do cliente incompleto — confira antes de comprar a etiqueta');
    }

    // Embalagem: mesma derivação usada na cotação, fundida num volume só.
    const artworks = await Promise.all(
      order.items.map(i => this.artworksService.findById(String(i.artwork))),
    );
    const quoteProducts = artworks.map(art => buildQuoteProduct(art));
    const volume = mergeVolume(quoteProducts);
    const insuranceValue = order.items.reduce((sum, i) => sum + i.price, 0);

    // Pedidos antigos não guardaram o serviceId — recota e casa por nome.
    let serviceId = order.shipping.serviceId;
    if (!serviceId) {
      const options = await this.melhorEnvio.calculate(zip, quoteProducts);
      serviceId = options.find(
        o => o.company === order.shipping!.company && o.service === order.shipping!.service,
      )?.serviceId;
      if (!serviceId) {
        throw new BadRequestException(
          `O serviço "${order.shipping.service} (${order.shipping.company})" não está mais disponível para este destino`,
        );
      }
    }

    const label = await this.melhorEnvio.buyLabel({
      serviceId,
      to: {
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone || undefined,
        document: (order.customer.cpf || '').replace(/\D/g, '') || undefined,
        address: a.street,
        number: a.number,
        complement: a.complement || undefined,
        district: a.neighborhood || undefined,
        city: a.city,
        state_abbr: a.state,
        postal_code: zip,
      },
      products: order.items.map(i => ({ name: i.title, quantity: 1, unitary_value: i.price })),
      volume,
      insuranceValue,
    });

    order.shipment = {
      meOrderId: label.meOrderId,
      protocol: label.protocol,
      status: label.status,
      trackingCode: label.trackingCode || '',
      trackingUrl: label.trackingUrl || '',
      labelUrl: label.labelUrl || '',
      price: label.price,
      purchasedAt: new Date(),
    } as OrderDocument['shipment'];
    await order.save();
    this.logger.log(`Etiqueta comprada para o pedido ${id} (envio ${label.meOrderId}, R$ ${label.price}).`);
    return order;
  }

  // Reconsulta o Melhor Envio para completar etiqueta/rastreio de um envio já
  // comprado (ex.: código dos Correios que só sai depois da geração).
  async refreshShipment(id: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (!order.shipment?.meOrderId) {
      throw new BadRequestException('Este pedido ainda não tem etiqueta comprada');
    }
    const label = await this.melhorEnvio.refreshLabel({
      meOrderId: order.shipment.meOrderId,
      protocol: order.shipment.protocol,
      price: order.shipment.price,
      status: order.shipment.status,
    });
    order.shipment.status = label.status || order.shipment.status;
    if (label.protocol) order.shipment.protocol = label.protocol;
    if (label.trackingCode) order.shipment.trackingCode = label.trackingCode;
    if (label.trackingUrl) order.shipment.trackingUrl = label.trackingUrl;
    if (label.labelUrl) order.shipment.labelUrl = label.labelUrl;
    order.markModified('shipment');
    await order.save();
    return order;
  }

  // Webhook do Melhor Envio (order.posted, order.delivered...): atualiza o
  // envio do pedido dono da etiqueta. Ignora eventos de envios desconhecidos
  // (ex.: etiquetas compradas fora do site).
  async handleShippingWebhook(event: string, data: any): Promise<void> {
    const meOrderId = String(data?.id || '');
    if (!meOrderId) return;
    const order = await this.orderModel.findOne({ 'shipment.meOrderId': meOrderId }).exec();
    if (!order || !order.shipment) {
      this.logger.warn(`Webhook Melhor Envio para envio desconhecido: ${event} ${meOrderId}`);
      return;
    }
    if (data.status) order.shipment.status = String(data.status);
    if (data.tracking) order.shipment.trackingCode = String(data.tracking);
    if (data.tracking_url) order.shipment.trackingUrl = String(data.tracking_url);
    if (data.posted_at) order.shipment.postedAt = new Date(data.posted_at);
    if (data.delivered_at) order.shipment.deliveredAt = new Date(data.delivered_at);
    order.markModified('shipment');
    await order.save();
    this.logger.log(`Envio ${meOrderId} (pedido ${order._id}): ${event}.`);
  }

  // Cancela pedidos PENDING mais velhos que a reserva e libera suas obras.
  // Rodado a cada tentativa de checkout — não precisa de cron, o próprio
  // fluxo de compra mantém o catálogo saudável.
  private async expireStaleOrders(): Promise<void> {
    const cutoff = new Date(Date.now() - RESERVATION_TTL_MS);
    const stale = await this.orderModel
      .find({ status: OrderStatus.PENDING, createdAt: { $lt: cutoff } })
      .exec();
    for (const order of stale) {
      await this.releaseItems(
        order.items.map(i => ({ artworkId: String(i.artwork), variant: i.variant || undefined })),
      );
      order.status = OrderStatus.CANCELLED;
      await order.save();
      this.logger.log(`Pedido ${order._id} expirado após ${RESERVATION_TTL_MS / 60000} min; obra(s) liberada(s).`);
    }
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
