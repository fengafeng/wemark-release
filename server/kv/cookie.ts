import { type CookieEntity } from '~/server/utils/CookieStore';

export type CookieKVKey = string;

export interface CookieKVValue {
  token: string;
  cookies: CookieEntity[];
}

const COOKIE_TTL = 60 * 60 * 24 * 4; // 4 days

export async function setMpCookie(key: CookieKVKey, data: CookieKVValue): Promise<boolean> {
  try {
    // Use secure storage (encrypted in Electron, KV fallback in Web)
    return await setSecureCookie(key, data, COOKIE_TTL);
  } catch (err) {
    console.error('setMpCookie failed:', err);
    return false;
  }
}

export async function getMpCookie(key: CookieKVKey): Promise<CookieKVValue | null> {
  try {
    // Use secure storage (encrypted in Electron, KV fallback in Web)
    return await getSecureCookie(key);
  } catch (err) {
    console.error('getMpCookie failed:', err);
    return null;
  }
}
