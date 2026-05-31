export const dynamic = 'force-dynamic';
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

  if (room.status !== 'playing') {
    return NextResponse.json({ error: 'Ván chưa bắt đầu' }, { status: 400 });
  }

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer.id !== authUser.id) {
    return NextResponse.json({ error: 'Chưa đến lượt bạn' }, { status: 400 });
  }

  if (!room.lastPlay || room.lastPlayerId === authUser.id) {
    return NextResponse.json({ error: 'Bạn phải đánh bài' }, { status: 400 });
  }

  const activePlayers = room.players.filter(p => p.hand.length > 0 && p.finishPosition === undefined);

  room.passCount += 1;
  room.turn += 1;

  // If everyone else passed → round winner gets to play freely
  if (room.passCount >= activePlayers.length - 1) {
    // Save winner ID BEFORE resetting
    const roundWinnerId = room.lastPlayerId;
    room.lastPlay = null;
    room.lastPlayerId = null;
    room.passCount = 0;

    const winnerIndex = room.players.findIndex(p => p.id === roundWinnerId);
    if (winnerIndex !== -1 && room.players[winnerIndex].hand.length > 0 && room.players[winnerIndex].finishPosition === undefined) {
      room.currentPlayerIndex = winnerIndex;
    } else {
      // Find next active player from current position
      let nextIndex = (room.currentPlayerIndex + 1) % room.players.length;
      let safety = 0;
      while ((room.players[nextIndex].hand.length === 0 || room.players[nextIndex].finishPosition !== undefined) && safety < room.players.length) {
        nextIndex = (nextIndex + 1) % room.players.length;
        safety++;
      }
      room.currentPlayerIndex = nextIndex;
    }
  } else {
    let nextIndex = (room.currentPlayerIndex + 1) % room.players.length;
    let safety = 0;
    while ((room.players[nextIndex].hand.length === 0 || room.players[nextIndex].finishPosition !== undefined) && safety < room.players.length) {
      nextIndex = (nextIndex + 1) % room.players.length;
      safety++;
    }
    room.currentPlayerIndex = nextIndex;
  }

  setRoom(room);

  for (const player of room.players) {
    const playerView = {
      ...room,
      players: room.players.map(p => ({
        ...p,
        hand: p.id === player.id ? p.hand : p.hand.map(() => ({ id: 'hidden', suit: 'hidden', rank: 'hidden' })),
      })),
    };

    await pusherServer.trigger(`player-${player.id}`, PUSHER_EVENTS.PLAYER_PASSED, {
      playerId: authUser.id,
      room: playerView,
    }).catch(() => {});
  }

  // Also update room channel (hidden hands for all)
  const publicRoom = {
    ...room,
    players: room.players.map(p => ({
      ...p,
      hand: p.hand.map(() => ({ id: 'hidden' as const, suit: 'hidden' as const, rank: 'hidden' as const })),
    })),
  };
  await pusherServer.trigger(`room-${id}`, PUSHER_EVENTS.PLAYER_PASSED, {
    playerId: authUser.id,
    room: publicRoom,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
