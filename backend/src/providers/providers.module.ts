import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsModule } from '../reviews/reviews.module.js';
import { ProviderAccountController } from './provider-account.controller.js';
import { ProvidersController } from './providers.controller.js';
import { ProvidersService } from './providers.service.js';
import { ProviderProfile, ProviderProfileSchema } from './schemas/provider-profile.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ProviderProfile.name, schema: ProviderProfileSchema }]),
    ReviewsModule,
  ],
  controllers: [ProvidersController, ProviderAccountController],
  providers: [ProvidersService],
  exports: [ProvidersService, MongooseModule],
})
export class ProvidersModule {}
