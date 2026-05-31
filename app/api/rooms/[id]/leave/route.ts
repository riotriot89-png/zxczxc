export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getRoom, setRoom, deleteRoom } from '@/lib/store';
import { pusherServer, PUSHER_EVENTS } from '@/lib/pusher';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser) return NextResponse.json({ ok: true });

  const { id } = await params;
  const room = getRoom(id);
  if (!room) return NextResponse.json({ ok: true });

  const wasInRoom = room.players.find(p => p.id === authUser.id);
  if (!wasInRoom) return NextResponse.json({ ok: true });

  const wasCurrentPlayer = room.status === 'playing' &&
    room.players[room.currentPlayerIndex]?.id === authUser.id;

  room.players = room.players.filter(p => p.id !== authUser.id);

  if (room.players.length === 0) {
    deleteRoom(id);
    return NextResponse.json({ ok: true });
  }

  // Transfer host if needed
  if (room.hostId === authUser.id) {
    room.hostId = room.players[0].id;
  }

  // If game is playing and the leaving player was current, advance turn
  if (room.status === 'playing') {
    const activePlayers = room.players.filter(p => p.hand.length > 0 && p.finishPosition === undefined);

    if (activePlayers.length <= 1) {
      // Game over
      room.status = 'finished';
      if (activePlayers.length === 1) {
        const finishCount = room.players.filter(p => p.finishPosition !== undefined).length;
        activePlayers[0].finishPosition = finishCount + 1;
      }
    } else if (wasCurrentPlayer) {
      // Advance to next active player
      let nextIndex = room.currentPlayerIndex % room.players.length;
      let safety = 0;
      while ((room.players[nextIndex]?.hand.length === 0 || room.players[nextIndex]?.finishPosition !== undefined) && safety < room.players.length) {
        nextIndex = (nextIndex + 1) % room.players.length;
        safety++;
      }
      room.currentPlayerIndex = nextIndex;
    } else {
      // Adjust index if needed after splice
      const leavingIdx = room.players.findIndex(p => p.id === authUser.id);
      if (room.currentPlayerIndex > 0) {
        room.currentPlayerIndex = room.currentPlayerIndex % room.players.length;
      }
    }
  }

  setRoom(room);

  const publicRoom = {
    ...room,
    players: room.players.map(p => ({ ...p, hand: p.hand.map(() => ({ id: 'hidden', suit: 'hidden', rank: 'hidden' })) })),
  };

  await pusherServer.trigger(`room-${id}`, PUSHER_EVENTS.PLAYER_LEFT, {
    playerId: authUser.id,
    room: publicRoom,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
