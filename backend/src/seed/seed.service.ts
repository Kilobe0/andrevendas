import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../categories/category.schema';
import { Artwork, ArtworkDocument } from '../artworks/artwork.schema';
import { AuthService } from '../auth/auth.service';

// O acervo agora é real e gerenciado pelo painel admin — o seed cuida apenas
// da infraestrutura mínima (admin e categorias), nunca de obras.
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Artwork.name) private artworkModel: Model<ArtworkDocument>,
    private authService: AuthService,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  private async seed() {
    try {
      await this.authService.createAdmin(
        'André Valença',
        process.env.ADMIN_EMAIL || 'admin@andrevendas.com',
        process.env.ADMIN_PASSWORD || 'admin123',
      );

      await this.seedCategories();

      // Migração 2026-07: obras criadas antes do campo `quantity` valem 1 unidade.
      await this.artworkModel
        .updateMany({ quantity: { $exists: false } }, { $set: { quantity: 1 } })
        .exec();

      this.logger.log('✅ Seed concluído com sucesso');
    } catch (err) {
      this.logger.error('Erro no seed:', err.message);
    }
  }

  private async seedCategories(): Promise<void> {
    const list = [
      { name: 'Esculturas', slug: 'esculturas', description: 'Obras tridimensionais em diversos materiais' },
      { name: 'Pinturas', slug: 'pinturas-em-tela', description: 'Pinturas em técnica mista sobre tela' },
      { name: 'Desenhos', slug: 'desenhos', description: 'Obras em papel, grafite e técnicas diversas' },
    ];

    for (const cat of list) {
      const doc = await this.categoryModel.findOne({ slug: cat.slug }).exec();
      if (!doc) await this.categoryModel.create(cat);
    }
  }
}
