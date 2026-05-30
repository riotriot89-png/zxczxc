import { GameRoom, User } from './types';

// In-memory store - for production use Upstash Redis or similar
// This works for single-instance dev; for Vercel multi-instance use Redis

declare global {
  var __gameStore: {
    rooms: Map<string, GameRoom>;
    users: Map<string, User>;
    usersByUsername: Map<string, User>;
  } | undefined;
}

if (!global.__gameStore) {
  const bcrypt = require('bcryptjs');
  
  const adminUser: User = {
    id: 'admin',
    username: 'admin',
    password: bcrypt.hashSync('tdat123', 10),
    isAdmin: true,
    createdAt: Date.now(),
    wins: 0,
    gamesPlayed: 0,
  };

  global.__gameStore = {
    rooms: new Map(),
    users: new Map([['admin', adminUser]]),
    usersByUsername: new Map([['admin', adminUser]]),
  };
}

export const store = global.__gameStore;

export function getRoom(id: string): GameRoom | undefined {
  return store.rooms.get(id);
}

export function setRoom(room: GameRoom): void {
  store.rooms.set(room.id, room);
}

export function deleteRoom(id: string): void {
  store.rooms.delete(id);
}

export function getAllRooms(): GameRoom[] {
  return Array.from(store.rooms.values());
}

export function getUser(id: string): User | undefined {
  return store.users.get(id);
}

export function getUserByUsername(username: string): User | undefined {
  return store.usersByUsername.get(username);
}

export function createUser(user: User): void {
  store.users.set(user.id, user);
  store.usersByUsername.set(user.username, user);
}

export function updateUser(user: User): void {
  store.users.set(user.id, user);
  store.usersByUsername.set(user.username, user);
}
