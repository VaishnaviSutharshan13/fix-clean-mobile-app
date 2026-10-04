import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Body for provider booking actions. Only decline uses `reason` (shown to the
// customer); any other field is rejected by the global ValidationPipe.
export class ProviderBookingActionDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(300)
  reason?: string;
}
