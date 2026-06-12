import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Artwork, ArtworkDocument, ArtworkStatus } from './artwork.schema';
import { CreateArtworkDto, UpdateArtworkDto, FilterArtworksDto } from './artwork.dto';

@Injectable()
export class ArtworksService {
  constructor(
    @InjectModel(Artwork.name) private artworkModel: Model<ArtworkDocument>,
  ) {}

  async findAll(filters: FilterArtworksDto = {}): Promise<ArtworkDocument[]> {
    const query: Record<string, any> = {};
    if (filters.status) query.status = filters.status;
    if (filters.material) query.material = { $regex: filters.material, $options: 'i' };
    if (filters.category) query.category = new Types.ObjectId(filters.category);
    return this.artworkModel.find(query).populate('category').sort({ createdAt: -1 }).exec();
  }

  async findBySlug(slug: string): Promise<ArtworkDocument> {
    const artwork = await this.artworkModel.findOne({ slug }).populate('category').exec();
    if (!artwork) throw new NotFoundException(`Obra "${slug}" não encontrada`);
    return artwork;
  }

  async findById(id: string): Promise<ArtworkDocument> {
    const artwork = await this.artworkModel.findById(id).populate('category').exec();
    if (!artwork) throw new NotFoundException('Obra não encontrada');
    return artwork;
  }

  async findRelated(categoryId: string, excludeId: string): Promise<ArtworkDocument[]> {
    return this.artworkModel
      .find({ category: new Types.ObjectId(categoryId), _id: { $ne: new Types.ObjectId(excludeId) } })
      .populate('category')
      .limit(4)
      .exec();
  }

  async findFeatured(): Promise<ArtworkDocument[]> {
    return this.artworkModel.find({ featured: true }).populate('category').limit(6).exec();
  }

  async create(dto: CreateArtworkDto): Promise<ArtworkDocument> {
    return this.artworkModel.create({
      ...dto,
      category: new Types.ObjectId(dto.category),
    });
  }

  async update(id: string, dto: UpdateArtworkDto): Promise<ArtworkDocument> {
    const update: Record<string, any> = { ...dto };
    if (dto.category) update.category = new Types.ObjectId(dto.category);
    const artwork = await this.artworkModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('category')
      .exec();
    if (!artwork) throw new NotFoundException('Obra não encontrada');
    return artwork;
  }

  async remove(id: string): Promise<void> {
    const result = await this.artworkModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Obra não encontrada');
  }

  async markAsSold(id: string): Promise<ArtworkDocument> {
    const artwork = await this.artworkModel
      .findByIdAndUpdate(id, { status: ArtworkStatus.SOLD }, { new: true })
      .exec();
    if (!artwork) throw new NotFoundException('Obra não encontrada');
    return artwork;
  }

  // Marca uma variante específica como vendida; a obra inteira só vira SOLD
  // quando não restar nenhuma variante disponível.
  async markVariantAsSold(id: string, variantName: string): Promise<ArtworkDocument> {
    const artwork = await this.artworkModel.findById(id).exec();
    if (!artwork) throw new NotFoundException('Obra não encontrada');

    const variant = artwork.variants.find(v => v.name === variantName);
    if (!variant) throw new NotFoundException(`Variante "${variantName}" não encontrada`);

    variant.status = ArtworkStatus.SOLD;
    if (artwork.variants.every(v => v.status !== ArtworkStatus.AVAILABLE)) {
      artwork.status = ArtworkStatus.SOLD;
    }
    return artwork.save();
  }

  async seedCreate(data: Partial<Artwork> & { category: Types.ObjectId }): Promise<ArtworkDocument> {
    const existing = await this.artworkModel.findOne({ slug: data.slug }).exec();
    if (existing) return existing;
    return this.artworkModel.create(data);
  }
}
