import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getRoom, setRoom } from '@/lib/store';
import { pusherServer, PUSHER_EVENTS } from '@/lib/pusher';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const room = getRoom(id);
  if (!room) return NextResponse.json({ error: 'Phòng không tồn tại' }, { status: 404 });

  const player = room.players.find(p => p.id === authUser.id);
  if (!player) return NextResponse.json({ error: 'Bạn không ở trong phòng này' }, { status: 400 });

  player.isReady = !player.isReady;
  setRoom(room);

  await pusherServer.trigger(`room-${id}`, PUSHER_EVENTS.PLAYER_READY, {
    playerId: authUser.id,
    isReady: player.isReady,
    room: {
      ...room,
      players: room.players.map(p => ({ ...p, hand: [] })),
    },
  }).catch(() => {});

  return NextResponse.json({ isReady: player.isReady });
}
