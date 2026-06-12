import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './order.schema';
import { ArtworksService } from '../artworks/artworks.service';
import { ArtworkStatus } from '../artworks/artwork.schema';

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
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private artworksService: ArtworksService,
  ) {}

  async create(dto: CreateOrderDto): Promise<OrderDocument> {
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

    // Mark artworks (or specific variants) as sold
    for (const item of dto.items) {
      if (item.variant) {
        await this.artworksService.markVariantAsSold(item.artworkId, item.variant);
      } else {
        await this.artworksService.markAsSold(item.artworkId);
      }
    }

    return order;
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
