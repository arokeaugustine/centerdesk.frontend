/** Reads a JWT's payload (no verification — the API does that). Empty when it can't be parsed. */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(Array.from(json, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
  } catch {
    return {};
  }
}
