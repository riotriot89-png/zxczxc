export type Suit = 'spades' | 'clubs' | 'diamonds' | 'hearts';
export type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export type PlayType = 'single' | 'pair' | 'triple' | 'four' | 'sequence' | 'pair_sequence' | 'triple_with_pair' | 'four_with_pair';

export interface Play {
  cards: Card[];
  type: PlayType;
  value: number; // for comparison
}

export interface Player {
  id: string;
  username: string;
  hand: Card[];
  score: number;
  isReady: boolean;
  isConnected: boolean;
  finishPosition?: number;
}

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface GameRoom {
  id: string;
  name: string;
  password?: string;
  hostId: string;
  players: Player[];
  spectators: string[];
  maxPlayers: number;
  status: GameStatus;
  currentPlayerIndex: number;
  lastPlay: Play | null;
  lastPlayerId: string | null;
  passCount: number;
  deck: Card[];
  turn: number;
  roundWinner: string | null;
  createdAt: number;
  chat: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface User {
  id: string;
  username: string;
  password: string; // hashed
  isAdmin: boolean;
  createdAt: number;
  wins: number;
  gamesPlayed: number;
}

export interface AuthUser {
  id: string;
  username: string;
  isAdmin: boolean;
}
