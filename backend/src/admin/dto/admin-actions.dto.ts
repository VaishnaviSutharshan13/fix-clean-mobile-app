import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ComplaintStatus } from '../../complaints/complaint-status.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Admin review checklist (identity, contact, experience). These record the
// administrator's manual confirmation; they are not automated checks.
export class UpdateVerificationChecksDto {
  @IsOptional()
  @IsBoolean()
  identity?: boolean;

  @IsOptional()
  @IsBoolean()
  contact?: boolean;

  @IsOptional()
  @IsBoolean()
  experience?: boolean;
}

export class RejectProviderDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300, { message: 'Reason must be at most 300 characters' })
  reason?: string;
}

export class UpdateUserStatusDto {
  @IsBoolean({ message: 'isActive must be true or false' })
  isActive: boolean;
}

export class UpdateComplaintStatusDto {
  @IsEnum(ComplaintStatus, { message: 'Unknown complaint status' })
  status: ComplaintStatus;

  // Required when resolving (the resolution shown on the complaint).
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500, { message: 'Note must be at most 500 characters' })
  note?: string;
}
