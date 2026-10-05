import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { BookingStatus } from '../../bookings/booking-status.js';
import { ComplaintStatus } from '../../complaints/complaint-status.js';
import { VerificationStatus } from '../../providers/schemas/provider-profile.schema.js';
import { Role } from '../../users/schemas/user.schema.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

class SearchQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  search?: string;
}

export const PROVIDER_STATUS_FILTERS = [...Object.values(VerificationStatus), 'all'] as const;
export type ProviderStatusFilter = (typeof PROVIDER_STATUS_FILTERS)[number];

export class AdminProvidersQueryDto extends SearchQueryDto {
  @IsOptional()
  @IsIn(PROVIDER_STATUS_FILTERS, { message: 'status must be pending, verified, rejected or all' })
  status?: ProviderStatusFilter;
}

export class AdminUsersQueryDto extends SearchQueryDto {
  @IsOptional()
  @IsEnum(Role, { message: 'role must be customer, provider or admin' })
  role?: Role;

  @IsOptional()
  @IsIn(['active', 'suspended'], { message: 'status must be active or suspended' })
  status?: 'active' | 'suspended';
}

export class AdminBookingsQueryDto extends SearchQueryDto {
  @IsOptional()
  @IsEnum(BookingStatus, { message: 'Unknown booking status' })
  status?: BookingStatus;
}

export class AdminComplaintsQueryDto extends SearchQueryDto {
  @IsOptional()
  @IsEnum(ComplaintStatus, { message: 'Unknown complaint status' })
  status?: ComplaintStatus;
}
