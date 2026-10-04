import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import type { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Role } from '../users/schemas/user.schema.js';
import { ListProvidersQueryDto } from './dto/list-providers-query.dto.js';
import { ProvidersService } from './providers.service.js';
import type { CategorySummary, ProviderDetails, ProviderSummary } from './providers.types.js';

// Customer-facing provider discovery (Home, Provider List, Provider Details).
@Controller('providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Customer)
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  list(@Query() query: ListProvidersQueryDto): Promise<ProviderSummary[]> {
    return this.providersService.listVerified(query);
  }

  @Get('categories')
  categories(): Promise<CategorySummary[]> {
    return this.providersService.getCategories();
  }

  @Get(':id')
  details(@Param('id', ParseObjectIdPipe) id: Types.ObjectId): Promise<ProviderDetails> {
    return this.providersService.getVerifiedDetails(String(id));
  }
}
