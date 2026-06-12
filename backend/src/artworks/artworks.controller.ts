import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards
} from '@nestjs/common';
import { ArtworksService } from './artworks.service';
import { CreateArtworkDto, UpdateArtworkDto, FilterArtworksDto } from './artwork.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('artworks')
export class ArtworksController {
  constructor(private readonly artworksService: ArtworksService) {}

  @Get()
  findAll(@Query() filters: FilterArtworksDto) {
    return this.artworksService.findAll(filters);
  }

  @Get('featured')
  findFeatured() {
    return this.artworksService.findFeatured();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.artworksService.findBySlug(slug);
  }

  @Get(':id/related')
  findRelated(@Param('id') id: string, @Query('categoryId') categoryId: string) {
    return this.artworksService.findRelated(categoryId, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateArtworkDto) {
    return this.artworksService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateArtworkDto) {
    return this.artworksService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.artworksService.remove(id);
  }
}
