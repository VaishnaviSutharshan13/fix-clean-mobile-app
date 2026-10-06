import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import type { Types } from 'mongoose';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import { NotificationsService } from './notifications.service.js';
import type { NotificationListResponse, NotificationView } from './notifications.types.js';

// Notification Management for every signed-in role. The user is always the
// authenticated one; a user id is never accepted from the client.
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  listMine(
    @CurrentUser() user: AuthUser,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<NotificationListResponse> {
    return this.notificationsService.listForUser(user.id, query.bookingId);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<NotificationView> {
    return this.notificationsService.setRead(user.id, String(id), true);
  }

  @Patch(':id/unread')
  markUnread(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<NotificationView> {
    return this.notificationsService.setRead(user.id, String(id), false);
  }
}
