import jwt from 'jsonwebtoken';
import { AuthUser } from './types';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'tienlen-secret-key-2024-very-secure';

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function getAuthUserFromRequest(req: Request): AuthUser | null {
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return verifyToken(authHeader.slice(7));
  }
  const cookie = req.headers.get('cookie');
  if (cookie) {
    const match = cookie.match(/auth_token=([^;]+)/);
    if (match) return verifyToken(match[1]);
  }
  return null;
}
