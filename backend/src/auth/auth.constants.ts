import type { CookieOptions } from 'express';

export const SESSION_COOKIE = 'theo_session';

export interface JwtPayload {
  sub: number;
  role: string;
  /** tokenVersion del usuario al emitir el token */
  tv: number;
}

export function sessionDays(): number {
  return Number(process.env.SESSION_DAYS ?? 30);
}

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: sessionDays() * 86_400_000,
  };
}
