import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getRoom, setRoom } from '@/lib/store';
import { pusherServer, PUSHER_EVENTS } from '@/lib/pusher';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const room = getRoom(id);
  if (!room) return NextResponse.json({ error: 'Phòng không tồn tại' }, { status: 404 });

  const { message } = await req.json();
  if (!message || message.trim().length === 0) {
    return NextResponse.json({ error: 'Tin nhắn trống' }, { status: 400 });
  }

  const chatMsg = {
    id: uuidv4(),
    userId: authUser.id,
    username: authUser.username,
    message: message.trim().slice(0, 200),
    timestamp: Date.now(),
  };

  room.chat.push(chatMsg);
  if (room.chat.length > 50) room.chat = room.chat.slice(-50);
  setRoom(room);

  await pusherServer.trigger(`room-${id}`, PUSHER_EVENTS.CHAT_MESSAGE, chatMsg).catch(() => {});

  return NextResponse.json({ ok: true });
}
