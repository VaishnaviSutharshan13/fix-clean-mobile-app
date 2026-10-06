import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { ComplaintsModule } from './complaints/complaints.module.js';
import { validateEnv } from './config/env.validation.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { ProvidersModule } from './providers/providers.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        // Keep a few connections open: opening one to a remote Atlas cluster
        // takes seconds, which otherwise delays the first requests after start.
        minPoolSize: 5,
      }),
    }),
    AuthModule,
    UsersModule,
    ProvidersModule,
    BookingsModule,
    ReviewsModule,
    ComplaintsModule,
    AdminModule,
    NotificationsModule,
  ],
})
export class AppModule {}
