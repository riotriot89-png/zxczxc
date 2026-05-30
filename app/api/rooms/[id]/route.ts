import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getRoom, setRoom } from '@/lib/store';
import { pusherServer, PUSHER_EVENTS } from '@/lib/pusher';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const room = getRoom(id);
  if (!room) return NextResponse.json({ error: 'Phòng không tồn tại' }, { status: 404 });

  // Return room data, masking other players' hands
  const sanitized = {
    ...room,
    players: room.players.map(p => ({
      ...p,
      hand: p.id === authUser.id ? p.hand : p.hand.map(() => ({ id: 'hidden', suit: 'hidden', rank: 'hidden' })),
    })),
  };

  return NextResponse.json({ room: sanitized });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const room = getRoom(id);
  if (!room) return NextResponse.json({ error: 'Phòng không tồn tại' }, { status: 404 });

  const { password } = await req.json();

  if (room.password && room.password !== password) {
    return NextResponse.json({ error: 'Sai mật khẩu phòng' }, { status: 403 });
  }

  if (room.players.length >= room.maxPlayers) {
    return NextResponse.json({ error: 'Phòng đã đầy' }, { status: 400 });
  }

  if (room.status !== 'waiting') {
    return NextResponse.json({ error: 'Ván đang diễn ra' }, { status: 400 });
  }

  // Check if already in room
  const alreadyIn = room.players.find(p => p.id === authUser.id);
  if (!alreadyIn) {
    room.players.push({
      id: authUser.id,
      username: authUser.username,
      hand: [],
      score: 0,
      isReady: false,
      isConnected: true,
    });
    setRoom(room);

    await pusherServer.trigger(`room-${id}`, PUSHER_EVENTS.PLAYER_JOINED, {
      playerId: authUser.id,
      username: authUser.username,
      room: sanitizeRoom(room, authUser.id),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

export function sanitizeRoom(room: any, viewerId: string) {
  return {
    ...room,
    players: room.players.map((p: any) => ({
      ...p,
      hand: p.id === viewerId ? p.hand : p.hand.map(() => ({ id: 'hidden', suit: 'hidden', rank: 'hidden' })),
    })),
  };
}
