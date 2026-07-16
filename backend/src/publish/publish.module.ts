import { Global, Module } from '@nestjs/common';
import { PublishService } from './publish.service';
import { PublishController } from './publish.controller';

// Global: o catálogo muda a partir de vários módulos (admin cria/edita obra,
// webhook de pagamento vende/reserva) e todos precisam agendar a republicação.
@Global()
@Module({
  controllers: [PublishController],
  providers: [PublishService],
  exports: [PublishService],
})
export class PublishModule {}
