import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getRoom, setRoom, updateUser, getUser } from '@/lib/store';
import { pusherServer, PUSHER_EVENTS } from '@/lib/pusher';
import { identifyPlay, canBeat } from '@/lib/gameEngine';
import { Card } from '@/lib/types';

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

  const { cardIds } = await req.json() as { cardIds: string[] };

  // Get cards from hand
  const playedCards = cardIds.map(cid => currentPlayer.hand.find((c: Card) => c.id === cid)).filter(Boolean) as Card[];

  if (playedCards.length !== cardIds.length) {
    return NextResponse.json({ error: 'Bài không hợp lệ' }, { status: 400 });
  }

  // Identify the play
  const play = identifyPlay(playedCards);
  if (!play) {
    return NextResponse.json({ error: 'Tổ hợp bài không hợp lệ' }, { status: 400 });
  }

  // Check if it beats the last play
  if (room.lastPlay && room.lastPlayerId !== authUser.id) {
    if (!canBeat(play, room.lastPlay)) {
      return NextResponse.json({ error: 'Bài không thắng được bài trước' }, { status: 400 });
    }
  }

  // Remove played cards from hand
  const remainingCardIds = new Set(cardIds);
  currentPlayer.hand = currentPlayer.hand.filter((c: Card) => !remainingCardIds.has(c.id));

  room.lastPlay = play;
  room.lastPlayerId = authUser.id;
  room.passCount = 0;
  room.turn += 1;

  // Check if player finished
  if (currentPlayer.hand.length === 0) {
    const finishCount = room.players.filter(p => p.finishPosition !== undefined).length;
    currentPlayer.finishPosition = finishCount + 1;
    
    // Update wins if first
    if (currentPlayer.finishPosition === 1) {
      const user = getUser(currentPlayer.id);
      if (user) { user.wins += 1; updateUser(user); }
    }
  }

  // Find next active player (has cards)
  const activePlayers = room.players.filter(p => p.hand.length > 0 && p.finishPosition === undefined);
  
  if (activePlayers.length <= 1) {
    // Game over - last player loses
    const lastPlayer = activePlayers[0];
    if (lastPlayer) {
      const finishCount = room.players.filter(p => p.finishPosition !== undefined).length;
      lastPlayer.finishPosition = finishCount + 1;
    }
    room.status = 'finished';
  } else {
    // Next player
    let nextIndex = (room.currentPlayerIndex + 1) % room.players.length;
    while (room.players[nextIndex].hand.length === 0 || room.players[nextIndex].finishPosition !== undefined) {
      nextIndex = (nextIndex + 1) % room.players.length;
    }
    room.currentPlayerIndex = nextIndex;
  }

  setRoom(room);

  // Send personalized views
  for (const player of room.players) {
    const playerView = {
      ...room,
      players: room.players.map(p => ({
        ...p,
        hand: p.id === player.id ? p.hand : p.hand.map(() => ({ id: 'hidden', suit: 'hidden', rank: 'hidden' })),
      })),
    };

    await pusherServer.trigger(`player-${player.id}`, PUSHER_EVENTS.PLAYER_PLAYED, {
      playerId: authUser.id,
      play,
      room: playerView,
    }).catch(() => {});
  }

  const publicRoom = {
    ...room,
    players: room.players.map(p => ({
      ...p,
      hand: p.hand.map(() => ({ id: 'hidden' as const, suit: 'hidden' as const, rank: 'hidden' as const })),
    })),
  };

  await pusherServer.trigger(`room-${id}`, PUSHER_EVENTS.PLAYER_PLAYED, {
    playerId: authUser.id,
    play,
    room: publicRoom,
  }).catch(() => {});

  if (room.status === 'finished') {
    await pusherServer.trigger(`room-${id}`, PUSHER_EVENTS.GAME_ENDED, {
      players: room.players.map(p => ({ id: p.id, username: p.username, finishPosition: p.finishPosition })),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, play });
}
