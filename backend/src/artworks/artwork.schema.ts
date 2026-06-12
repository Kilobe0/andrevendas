import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ArtworkDocument = Artwork & Document;

export enum ArtworkStatus {
  AVAILABLE = 'AVAILABLE',
  SOLD = 'SOLD',
  RESERVED = 'RESERVED',
}

// Variante de uma série (ex.: pinturas individuais sob o mesmo título).
// Cada variante tem status próprio; a obra só fica SOLD quando todas venderem.
@Schema({ _id: false })
export class ArtworkVariant {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  image: string;

  @Prop({ type: String, enum: ArtworkStatus, default: ArtworkStatus.AVAILABLE })
  status: ArtworkStatus;
}

export const ArtworkVariantSchema = SchemaFactory.createForClass(ArtworkVariant);

@Schema({ timestamps: true })
export class Artwork {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  material: string;

  @Prop({ required: true })
  dimensions: string;

  @Prop()
  weight: string;

  @Prop()
  year: number;

  @Prop({ required: true })
  price: number;

  @Prop({ type: String, enum: ArtworkStatus, default: ArtworkStatus.AVAILABLE })
  status: ArtworkStatus;

  @Prop({ default: false })
  featured: boolean;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [ArtworkVariantSchema], default: [] })
  variants: ArtworkVariant[];

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;
}

export const ArtworkSchema = SchemaFactory.createForClass(Artwork);
