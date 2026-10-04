import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Role } from '../users/schemas/user.schema.js';
import { AuthService } from './auth.service.js';
import type { AuthResponse, AuthUser } from './auth.types.js';
import { CurrentUser } from './current-user.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './jwt.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/customer')
  registerCustomer(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto, Role.Customer);
  }

  @Post('register/provider')
  registerProvider(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto, Role.Provider);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
