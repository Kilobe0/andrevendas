import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  BOLETO = 'BOLETO',
}

@Schema()
class Address {
  @Prop() street: string;
  @Prop() number: string;
  @Prop() complement: string;
  @Prop() neighborhood: string;
  @Prop() city: string;
  @Prop() state: string;
  @Prop() zipCode: string;
}

@Schema()
class Customer {
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) email: string;
  @Prop() phone: string;
  @Prop() cpf: string;
  @Prop({ type: Address }) address: Address;
}

@Schema()
class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Artwork', required: true })
  artwork: Types.ObjectId;

  @Prop({ required: true }) title: string;
  @Prop({ required: true }) price: number;
  @Prop() image: string;
  @Prop() variant: string;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  paymentMethod: PaymentMethod;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ type: Customer, required: true })
  customer: Customer;

  @Prop({ type: [OrderItem], required: true })
  items: OrderItem[];

  // Rastreamento do Mercado Pago (Checkout Pro)
  @Prop()
  preferenceId: string;

  @Prop()
  paymentId: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
