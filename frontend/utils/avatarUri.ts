// Turns the API's photo path ("/users/<id>/avatar?v=…") into a full URL for
// <Image>. Returns undefined when there is no photo, so callers fall back to
// initials. Pure (no React Native imports) — unit-tested.
export function avatarUri(apiBaseUrl: string, path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${apiBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
