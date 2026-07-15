import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShippingToken, ShippingTokenSchema } from './shipping-token.schema';
import { MelhorEnvioService } from './melhorenvio.service';
import { ShippingController } from './shipping.controller';
import { ArtworksModule } from '../artworks/artworks.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ShippingToken.name, schema: ShippingTokenSchema }]),
    ArtworksModule,
  ],
  controllers: [ShippingController],
  providers: [MelhorEnvioService],
  exports: [MelhorEnvioService],
})
export class ShippingModule {}
