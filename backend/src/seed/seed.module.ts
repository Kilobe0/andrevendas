import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedService } from './seed.service';
import { Category, CategorySchema } from '../categories/category.schema';
import { Artwork, ArtworkSchema } from '../artworks/artwork.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Artwork.name, schema: ArtworkSchema },
    ]),
    AuthModule,
  ],
  providers: [SeedService],
})
export class SeedModule {}
