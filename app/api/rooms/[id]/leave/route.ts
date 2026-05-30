import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getRoom, setRoom, deleteRoom } from '@/lib/store';
import { pusherServer, PUSHER_EVENTS } from '@/lib/pusher';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const room = getRoom(id);
  if (!room) return NextResponse.json({ ok: true });

  room.players = room.players.filter(p => p.id !== authUser.id);

  if (room.players.length === 0) {
    deleteRoom(id);
    return NextResponse.json({ ok: true });
  }

  // Transfer host if needed
  if (room.hostId === authUser.id && room.players.length > 0) {
    room.hostId = room.players[0].id;
  }

  setRoom(room);

  await pusherServer.trigger(`room-${id}`, PUSHER_EVENTS.PLAYER_LEFT, {
    playerId: authUser.id,
    room: { ...room, players: room.players.map(p => ({ ...p, hand: [] })) },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
