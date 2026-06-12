import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Artwork, ArtworkSchema } from './artwork.schema';
import { ArtworksService } from './artworks.service';
import { ArtworksController } from './artworks.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Artwork.name, schema: ArtworkSchema }])],
  controllers: [ArtworksController],
  providers: [ArtworksService],
  exports: [ArtworksService, MongooseModule],
})
export class ArtworksModule {}
