import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PublishService } from './publish.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('publish')
@UseGuards(JwtAuthGuard)
export class PublishController {
  constructor(private readonly publishService: PublishService) {}

  // Botão "Publicar site" do admin: dispara o rebuild do site estático agora.
  @Post()
  publish() {
    return this.publishService.publishNow();
  }

  @Get('status')
  status() {
    return this.publishService.status();
  }
}
