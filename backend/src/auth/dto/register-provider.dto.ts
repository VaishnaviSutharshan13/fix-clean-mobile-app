import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, Max, Min } from 'class-validator';
import { ServiceCategory } from '../../providers/schemas/provider-profile.schema.js';
import { SRI_LANKA_DISTRICTS } from '../../providers/sri-lanka-districts.js';
import { RegisterDto } from './register.dto.js';

// Provider Sign Up (Figma): account details plus primary trade, operating
// district and experience. The role and verification status are always set
// by the server.
export class RegisterProviderDto extends RegisterDto {
  @IsEnum(ServiceCategory, { message: 'Please choose your primary trade' })
  category: ServiceCategory;

  @IsIn(SRI_LANKA_DISTRICTS, { message: 'Please choose your operating district' })
  serviceArea: string;

  @Type(() => Number)
  @IsInt({ message: 'Please choose your experience' })
  @Min(0)
  @Max(60)
  experienceYears: number;
}
