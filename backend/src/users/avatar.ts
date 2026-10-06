// Profile photo helpers (unit-tested in avatar.spec.ts).

export const AVATAR_MAX_BYTES = 512 * 1024;

export type AvatarContentType = 'image/jpeg' | 'image/png' | 'image/webp';

// Public URL path of a user's photo, or null when they have none. The version
// query changes on every upload, so clients and caches never show an old photo.
export function avatarPath(userId: string, updatedAt?: Date | null): string | null {
  return updatedAt ? `/users/${userId}/avatar?v=${updatedAt.getTime()}` : null;
}

// Parses a "data:image/...;base64,..." upload and checks that the bytes really
// are a JPEG, PNG or WebP image of at most AVATAR_MAX_BYTES. Returns an error
// message for the user instead of throwing.
export function parseAvatarDataUrl(
  dataUrl: string,
): { contentType: AvatarContentType; data: Buffer } | { error: string } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match) return { error: 'The photo must be a JPEG, PNG or WebP image.' };

  const contentType = match[1] as AvatarContentType;
  const data = Buffer.from(match[2]!.replace(/\s/g, ''), 'base64');
  if (data.length === 0) return { error: 'The photo is empty.' };
  if (data.length > AVATAR_MAX_BYTES) return { error: 'The photo is too large (maximum 512 KB).' };

  const isJpeg = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  const isPng = data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP';
  const matches =
    (contentType === 'image/jpeg' && isJpeg) ||
    (contentType === 'image/png' && isPng) ||
    (contentType === 'image/webp' && isWebp);
  if (!matches) return { error: 'The photo must be a JPEG, PNG or WebP image.' };

  return { contentType, data };
}
