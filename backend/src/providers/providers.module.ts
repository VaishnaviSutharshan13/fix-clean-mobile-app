import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsModule } from '../reviews/reviews.module.js';
import { ProvidersController } from './providers.controller.js';
import { ProvidersService } from './providers.service.js';
import { ProviderProfile, ProviderProfileSchema } from './schemas/provider-profile.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ProviderProfile.name, schema: ProviderProfileSchema }]),
    ReviewsModule,
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
