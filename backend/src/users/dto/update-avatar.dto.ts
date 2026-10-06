import { IsString, MaxLength } from 'class-validator';

export class UpdateAvatarDto {
  // "data:image/jpeg;base64,..." — the image itself is checked in the service.
  @IsString()
  @MaxLength(800_000, { message: 'The photo is too large (maximum 512 KB).' })
  image: string;
}
