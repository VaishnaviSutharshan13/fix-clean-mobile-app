import { AVATAR_MAX_BYTES, avatarPath, parseAvatarDataUrl } from './avatar.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const toDataUrl = (type: string, data: Buffer) => `data:${type};base64,${data.toString('base64')}`;

describe('avatar helpers', () => {
  it('builds a versioned path only when a photo exists', () => {
    expect(avatarPath('abc', null)).toBeNull();
    expect(avatarPath('abc', new Date(1000))).toBe('/users/abc/avatar?v=1000');
  });

  it('accepts real JPEG and PNG data', () => {
    expect(parseAvatarDataUrl(toDataUrl('image/png', PNG))).toMatchObject({ contentType: 'image/png' });
    expect(parseAvatarDataUrl(toDataUrl('image/jpeg', JPEG))).toMatchObject({ contentType: 'image/jpeg' });
  });

  it('rejects other types, mismatched bytes, empty and oversized images', () => {
    expect(parseAvatarDataUrl('not a data url')).toHaveProperty('error');
    expect(parseAvatarDataUrl(toDataUrl('image/gif', PNG))).toHaveProperty('error');
    expect(parseAvatarDataUrl(toDataUrl('image/jpeg', PNG))).toHaveProperty('error');
    expect(parseAvatarDataUrl(toDataUrl('image/png', Buffer.from('hello')))).toHaveProperty('error');
    const big = Buffer.concat([JPEG, Buffer.alloc(AVATAR_MAX_BYTES)]);
    expect(parseAvatarDataUrl(toDataUrl('image/jpeg', big))).toEqual({
      error: 'The photo is too large (maximum 512 KB).',
    });
  });
});
