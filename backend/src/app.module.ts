import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesModule } from './categories/categories.module';
import { ArtworksModule } from './artworks/artworks.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { UploadModule } from './upload/upload.module';
import { SeedModule } from './seed/seed.module';
import { ShippingModule } from './shipping/shipping.module';
import { PublishModule } from './publish/publish.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI as string),
    CategoriesModule,
    ArtworksModule,
    AuthModule,
    OrdersModule,
    UploadModule,
    SeedModule,
    ShippingModule,
    PublishModule,
  ],
})
export class AppModule {}
