import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getRoom, setRoom, updateUser, getUser } from '@/lib/store';
import { pusherServer, PUSHER_EVENTS } from '@/lib/pusher';
import { createDeck, dealCards, hasCardWith3Spades } from '@/lib/gameEngine';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const room = getRoom(id);
  if (!room) return NextResponse.json({ error: 'Phòng không tồn tại' }, { status: 404 });

  if (room.hostId !== authUser.id) {
    return NextResponse.json({ error: 'Chỉ chủ phòng mới được bắt đầu' }, { status: 403 });
  }

  if (room.players.length < 2) {
    return NextResponse.json({ error: 'Cần ít nhất 2 người chơi' }, { status: 400 });
  }

  if (room.status !== 'waiting') {
    return NextResponse.json({ error: 'Ván đang diễn ra' }, { status: 400 });
  }

  // Deal cards
  const deck = createDeck();
  const hands = dealCards(deck, room.players.length);

  // Find who has 3 of spades - they go first
  let firstPlayerIndex = 0;
  for (let i = 0; i < hands.length; i++) {
    if (hasCardWith3Spades(hands[i])) {
      firstPlayerIndex = i;
      break;
    }
  }

  room.players = room.players.map((p, i) => ({
    ...p,
    hand: hands[i],
    isReady: false,
    finishPosition: undefined,
  }));

  room.status = 'playing';
  room.currentPlayerIndex = firstPlayerIndex;
  room.lastPlay = null;
  room.lastPlayerId = null;
  room.passCount = 0;
  room.turn = 1;
  room.deck = deck;

  // Update gamesPlayed for all players
  for (const p of room.players) {
    const user = getUser(p.id);
    if (user) {
      user.gamesPlayed += 1;
      updateUser(user);
    }
  }

  setRoom(room);

  // Send each player their own hand privately
  for (const player of room.players) {
    const playerView = {
      ...room,
      players: room.players.map(p => ({
        ...p,
        hand: p.id === player.id ? p.hand : p.hand.map(() => ({ id: 'hidden', suit: 'hidden', rank: 'hidden' })),
      })),
    };

    await pusherServer.trigger(`player-${player.id}`, PUSHER_EVENTS.GAME_STARTED, {
      room: playerView,
    }).catch(() => {});
  }

  // Also send public room state
  const publicRoom = {
    ...room,
    players: room.players.map(p => ({
      ...p,
      hand: p.hand.map(() => ({ id: 'hidden', suit: 'hidden', rank: 'hidden' })),
    })),
  };

  await pusherServer.trigger(`room-${id}`, PUSHER_EVENTS.GAME_STARTED, {
    room: publicRoom,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
