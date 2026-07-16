import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Artwork, ArtworkDocument, ArtworkStatus } from './artwork.schema';
import { CreateArtworkDto, UpdateArtworkDto, FilterArtworksDto } from './artwork.dto';
import { PublishService } from '../publish/publish.service';

@Injectable()
export class ArtworksService {
  constructor(
    @InjectModel(Artwork.name) private artworkModel: Model<ArtworkDocument>,
    private readonly publishService: PublishService,
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
    const artwork = await this.artworkModel.create({
      ...dto,
      category: new Types.ObjectId(dto.category),
    });
    this.publishService.schedule(`obra criada: ${artwork.slug}`);
    return artwork;
  }

  async update(id: string, dto: UpdateArtworkDto): Promise<ArtworkDocument> {
    const update: Record<string, any> = { ...dto };
    if (dto.category) update.category = new Types.ObjectId(dto.category);
    const artwork = await this.artworkModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('category')
      .exec();
    if (!artwork) throw new NotFoundException('Obra não encontrada');
    this.publishService.schedule(`obra editada: ${artwork.slug}`);
    return artwork;
  }

  async remove(id: string): Promise<void> {
    const result = await this.artworkModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Obra não encontrada');
    this.publishService.schedule(`obra removida: ${result.slug}`);
  }

  // Confirma a venda de uma unidade (webhook de pagamento aprovado). A unidade
  // já saiu do estoque na reserva; a obra só vira SOLD quando o estoque zera —
  // obras com várias unidades idênticas continuam AVAILABLE enquanto sobrar alguma.
  async markAsSold(id: string): Promise<ArtworkDocument> {
    const artwork = await this.artworkModel.findById(id).exec();
    if (!artwork) throw new NotFoundException('Obra não encontrada');
    if (artwork.quantity <= 0) {
      artwork.status = ArtworkStatus.SOLD;
      await artwork.save();
    }
    this.publishService.schedule(`obra vendida: ${artwork.slug}`);
    return artwork;
  }

  // Reserva enquanto o cliente paga no Mercado Pago: consome uma unidade do
  // estoque de forma atômica (a condição quantity > 0 evita corrida entre dois
  // pedidos na última unidade). A obra só sai do catálogo quando a última
  // unidade é reservada; até lá permanece AVAILABLE para outros compradores.
  async markAsReserved(id: string): Promise<ArtworkDocument> {
    const artwork = await this.artworkModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), quantity: { $gt: 0 } },
        { $inc: { quantity: -1 } },
        { new: true },
      )
      .exec();
    if (!artwork) throw new BadRequestException('Não há unidades disponíveis desta obra');
    if (artwork.quantity <= 0) {
      artwork.status = ArtworkStatus.RESERVED;
      await artwork.save();
      this.publishService.schedule(`obra reservada: ${artwork.slug}`);
    }
    return artwork;
  }

  async markVariantAsReserved(id: string, variantName: string): Promise<ArtworkDocument> {
    return this.setVariantStatus(id, variantName, ArtworkStatus.RESERVED);
  }

  // Devolve uma unidade ao catálogo quando o pagamento falha ou é cancelado.
  // Recompõe o estoque e reabre a obra: cada release corresponde a uma reserva
  // anterior, então a unidade devolvida sempre pode voltar à venda — inclusive
  // se a obra ficou SOLD porque as demais unidades venderam nesse meio-tempo.
  async release(id: string): Promise<ArtworkDocument> {
    const artwork = await this.artworkModel.findById(id).exec();
    if (!artwork) throw new NotFoundException('Obra não encontrada');
    artwork.quantity += 1;
    if (artwork.status === ArtworkStatus.RESERVED || artwork.status === ArtworkStatus.SOLD) {
      artwork.status = ArtworkStatus.AVAILABLE;
    }
    await artwork.save();
    this.publishService.schedule(`obra devolvida ao catálogo: ${artwork.slug}`);
    return artwork;
  }

  async releaseVariant(id: string, variantName: string): Promise<ArtworkDocument> {
    const artwork = await this.artworkModel.findById(id).exec();
    if (!artwork) throw new NotFoundException('Obra não encontrada');
    const variant = artwork.variants.find(v => v.name === variantName);
    if (variant && variant.status === ArtworkStatus.RESERVED) {
      variant.status = ArtworkStatus.AVAILABLE;
    }
    // A obra volta a ser AVAILABLE se voltou a existir alguma variante livre.
    if (artwork.variants.some(v => v.status === ArtworkStatus.AVAILABLE)) {
      artwork.status = ArtworkStatus.AVAILABLE;
    }
    this.publishService.schedule(`variante liberada: ${artwork.slug}/${variantName}`);
    return artwork.save();
  }

  // Define o status de uma variante e recalcula o status da obra: ela só fica
  // RESERVED/SOLD quando não resta nenhuma variante disponível.
  private async setVariantStatus(
    id: string,
    variantName: string,
    status: ArtworkStatus,
  ): Promise<ArtworkDocument> {
    const artwork = await this.artworkModel.findById(id).exec();
    if (!artwork) throw new NotFoundException('Obra não encontrada');
    const variant = artwork.variants.find(v => v.name === variantName);
    if (!variant) throw new NotFoundException(`Variante "${variantName}" não encontrada`);

    variant.status = status;
    if (artwork.variants.every(v => v.status !== ArtworkStatus.AVAILABLE)) {
      artwork.status = status;
    }
    this.publishService.schedule(`variante atualizada: ${artwork.slug}/${variantName}`);
    return artwork.save();
  }

  // Marca uma variante específica como vendida; a obra inteira só vira SOLD
  // quando não restar nenhuma variante disponível.
  async markVariantAsSold(id: string, variantName: string): Promise<ArtworkDocument> {
    return this.setVariantStatus(id, variantName, ArtworkStatus.SOLD);
  }

  async seedCreate(data: Partial<Artwork> & { category: Types.ObjectId }): Promise<ArtworkDocument> {
    const existing = await this.artworkModel.findOne({ slug: data.slug }).exec();
    if (existing) return existing;
    return this.artworkModel.create(data);
  }
}
