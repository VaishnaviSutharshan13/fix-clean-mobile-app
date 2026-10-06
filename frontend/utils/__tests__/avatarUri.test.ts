import { describe, expect, it } from 'vitest';

import { avatarUri } from '../avatarUri';

describe('avatarUri', () => {
  it('returns undefined when there is no photo', () => {
    expect(avatarUri('http://10.0.0.5:3000', null)).toBeUndefined();
    expect(avatarUri('http://10.0.0.5:3000', '')).toBeUndefined();
  });

  it('joins the API base URL and the photo path', () => {
    expect(avatarUri('http://10.0.0.5:3000', '/users/abc/avatar?v=1')).toBe('http://10.0.0.5:3000/users/abc/avatar?v=1');
    expect(avatarUri('http://10.0.0.5:3000/', '/users/abc/avatar?v=1')).toBe('http://10.0.0.5:3000/users/abc/avatar?v=1');
  });

  it('keeps absolute URLs unchanged', () => {
    expect(avatarUri('http://x', 'https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
  });
});
