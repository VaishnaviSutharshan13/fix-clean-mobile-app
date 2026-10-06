import { Body, Controller, Delete, Get, Param, Put, Res, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import type { Response } from 'express';
import type { Types } from 'mongoose';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { UpdateAvatarDto } from './dto/update-avatar.dto.js';
import { UsersService } from './users.service.js';

// Profile photos. Any signed-in user manages only their own photo (the user is
// taken from the JWT). Photos are served by user id so they can be shown with
// a plain image URL, like any profile picture.
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put('me/avatar')
  @UseGuards(JwtAuthGuard)
  setMyAvatar(@CurrentUser() user: AuthUser, @Body() dto: UpdateAvatarDto) {
    return this.usersService.setAvatar(user.id, dto.image);
  }

  @Delete('me/avatar')
  @UseGuards(JwtAuthGuard)
  removeMyAvatar(@CurrentUser() user: AuthUser) {
    return this.usersService.removeAvatar(user.id);
  }

  @Get(':id/avatar')
  async avatar(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Res() res: Response): Promise<void> {
    const { contentType, data } = await this.usersService.getAvatar(String(id));
    // URLs carry a version (?v=…) that changes on every upload, so they can be cached for long.
    res.set({ 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' });
    res.send(data);
  }
}
