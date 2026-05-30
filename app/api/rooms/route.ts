import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getAllRooms, setRoom } from '@/lib/store';
import { pusherServer, PUSHER_EVENTS } from '@/lib/pusher';
import { GameRoom } from '@/lib/types';

export async function GET(req: NextRequest) {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rooms = getAllRooms().map(room => ({
    id: room.id,
    name: room.name,
    hasPassword: !!room.password,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    status: room.status,
    hostId: room.hostId,
    createdAt: room.createdAt,
  }));

  return NextResponse.json({ rooms });
}

export async function POST(req: NextRequest) {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, password, maxPlayers } = await req.json();

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: 'Tên phòng phải ít nhất 2 ký tự' }, { status: 400 });
  }

  const roomId = Math.floor(1000 + Math.random() * 9000).toString();

  const room: GameRoom = {
    id: roomId,
    name: name.trim(),
    password: password || undefined,
    hostId: authUser.id,
    players: [{
      id: authUser.id,
      username: authUser.username,
      hand: [],
      score: 0,
      isReady: false,
      isConnected: true,
    }],
    spectators: [],
    maxPlayers: Math.min(4, Math.max(2, maxPlayers || 4)),
    status: 'waiting',
    currentPlayerIndex: 0,
    lastPlay: null,
    lastPlayerId: null,
    passCount: 0,
    deck: [],
    turn: 0,
    roundWinner: null,
    createdAt: Date.now(),
    chat: [],
  };

  setRoom(room);

  await pusherServer.trigger('lobby', PUSHER_EVENTS.ROOM_UPDATED, {
    type: 'created',
    room: { id: room.id, name: room.name, hasPassword: !!room.password, playerCount: 1, maxPlayers: room.maxPlayers, status: 'waiting', hostId: room.hostId, createdAt: room.createdAt }
  }).catch(() => {});

  return NextResponse.json({ roomId });
}
