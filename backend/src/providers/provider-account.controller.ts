import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Role } from '../users/schemas/user.schema.js';
import { UpdateAvailabilityDto } from './dto/update-availability.dto.js';
import { UpdateServicesDto } from './dto/update-services.dto.js';
import { ProvidersService } from './providers.service.js';
import type { ProviderAccountView } from './providers.types.js';

// The signed-in provider's own profile and availability.
@Controller('provider')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Provider)
export class ProviderAccountController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<ProviderAccountView> {
    return this.providersService.getAccount(user);
  }

  @Put('availability')
  updateAvailability(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAvailabilityDto,
  ): Promise<ProviderAccountView> {
    return this.providersService.updateAvailability(user, dto);
  }

  @Put('services')
  updateServices(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateServicesDto,
  ): Promise<ProviderAccountView> {
    return this.providersService.updateServices(user, dto);
  }
}
