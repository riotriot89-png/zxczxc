import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUser } from '@/lib/store';

export async function GET(req: NextRequest) {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const user = getUser(authUser.id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    wins: user.wins,
    gamesPlayed: user.gamesPlayed,
  });
}
