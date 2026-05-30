import Pusher from 'pusher';
import PusherJS from 'pusher-js';

// Server-side Pusher
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || 'demo',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'demo',
  secret: process.env.PUSHER_SECRET || 'demo',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
  useTLS: true,
});

// Client-side Pusher
export function createPusherClient(): PusherJS {
  return new PusherJS(process.env.NEXT_PUBLIC_PUSHER_KEY || 'demo', {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
  });
}

export const PUSHER_EVENTS = {
  ROOM_UPDATED: 'room-updated',
  GAME_STARTED: 'game-started',
  PLAYER_PLAYED: 'player-played',
  PLAYER_PASSED: 'player-passed',
  GAME_ENDED: 'game-ended',
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  CHAT_MESSAGE: 'chat-message',
  PLAYER_READY: 'player-ready',
};
