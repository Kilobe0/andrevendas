import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, UseGuards } from '@nestjs/common';
import { OrdersService, CreateOrderDto } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  // Webhook do Mercado Pago — público. Aceita o formato novo (type/data.id)
  // e o legado (topic/id), via query string ou body.
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Query() query: Record<string, string>,
    @Body() body: any,
  ) {
    const type = query.type || query.topic || body?.type;
    const paymentId = query['data.id'] || query.id || body?.data?.id;
    if (type === 'payment' && paymentId) {
      await this.ordersService.handleWebhook(String(paymentId));
    }
    return { received: true };
  }

  // Público: só o status, sem dados do cliente. A página de retorno do
  // checkout faz polling aqui até o webhook confirmar o Pix/boleto.
  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.ordersService.getPublicStatus(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats() {
    return this.ordersService.getStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
