import { Card, Suit, Rank, Play, PlayType } from './types';

const SUITS: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];
const RANKS: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

// Suit order: Spades < Clubs < Diamonds < Hearts
const SUIT_ORDER: Record<Suit, number> = {
  spades: 0,
  clubs: 1,
  diamonds: 2,
  hearts: 3,
};

const RANK_ORDER: Record<Rank, number> = {
  '3': 0, '4': 1, '5': 2, '6': 3, '7': 4, '8': 5,
  '9': 6, '10': 7, 'J': 8, 'Q': 9, 'K': 10, 'A': 11, '2': 12,
};

export function cardValue(card: Card): number {
  return RANK_ORDER[card.rank] * 4 + SUIT_ORDER[card.suit];
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}_${suit}` });
    }
  }
  return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dealCards(deck: Card[], playerCount: number): Card[][] {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  for (let i = 0; i < deck.length; i++) {
    if (i < playerCount * 13) {
      hands[i % playerCount].push(deck[i]);
    }
  }
  // Sort each hand
  return hands.map(hand => hand.sort((a, b) => cardValue(a) - cardValue(b)));
}

export function identifyPlay(cards: Card[]): Play | null {
  if (cards.length === 0) return null;
  const sorted = [...cards].sort((a, b) => cardValue(a) - cardValue(b));

  if (cards.length === 1) {
    return { cards: sorted, type: 'single', value: cardValue(sorted[0]) };
  }

  if (cards.length === 2) {
    if (sorted[0].rank === sorted[1].rank) {
      return { cards: sorted, type: 'pair', value: cardValue(sorted[1]) };
    }
    return null;
  }

  if (cards.length === 3) {
    if (sorted[0].rank === sorted[1].rank && sorted[1].rank === sorted[2].rank) {
      return { cards: sorted, type: 'triple', value: cardValue(sorted[2]) };
    }
    return null;
  }

  if (cards.length === 4) {
    if (sorted[0].rank === sorted[1].rank && sorted[1].rank === sorted[2].rank && sorted[2].rank === sorted[3].rank) {
      return { cards: sorted, type: 'four', value: cardValue(sorted[3]) };
    }
    return null;
  }

  // Sequences: 3+ consecutive ranks, no 2s
  if (cards.length >= 3) {
    // Check if it's a sequence (straight)
    if (isSequence(sorted)) {
      return { cards: sorted, type: 'sequence', value: cardValue(sorted[sorted.length - 1]) };
    }

    // Pair sequence (double sequence): 6, 8, 10, 12 cards
    if (cards.length >= 6 && cards.length % 2 === 0 && isPairSequence(sorted)) {
      return { cards: sorted, type: 'pair_sequence', value: cardValue(sorted[sorted.length - 1]) };
    }

    // Triple with pair (5 cards)
    if (cards.length === 5) {
      const tripleWithPair = isTripleWithPair(sorted);
      if (tripleWithPair) return { cards: sorted, type: 'triple_with_pair', value: tripleWithPair };
    }

    // Four with pair (6 cards)
    if (cards.length === 6) {
      const fourWithPair = isFourWithPair(sorted);
      if (fourWithPair !== null) return { cards: sorted, type: 'four_with_pair', value: fourWithPair };
    }
  }

  return null;
}

function isSequence(sorted: Card[]): boolean {
  // No 2s in sequence
  if (sorted.some(c => c.rank === '2')) return false;
  for (let i = 1; i < sorted.length; i++) {
    if (RANK_ORDER[sorted[i].rank] !== RANK_ORDER[sorted[i - 1].rank] + 1) return false;
  }
  return true;
}

function isPairSequence(sorted: Card[]): boolean {
  if (sorted.some(c => c.rank === '2')) return false;
  const pairCount = sorted.length / 2;
  // Group by rank
  const groups: Record<string, Card[]> = {};
  for (const c of sorted) {
    if (!groups[c.rank]) groups[c.rank] = [];
    groups[c.rank].push(c);
  }
  const ranks = Object.keys(groups);
  if (ranks.length !== pairCount) return false;
  if (!ranks.every(r => groups[r].length === 2)) return false;
  // Check consecutive
  const rankValues = ranks.map(r => RANK_ORDER[r as Rank]).sort((a, b) => a - b);
  for (let i = 1; i < rankValues.length; i++) {
    if (rankValues[i] !== rankValues[i - 1] + 1) return false;
  }
  return true;
}

function isTripleWithPair(sorted: Card[]): number | null {
  // Find 3 of same rank + 2 of same rank
  const groups: Record<string, Card[]> = {};
  for (const c of sorted) {
    if (!groups[c.rank]) groups[c.rank] = [];
    groups[c.rank].push(c);
  }
  const vals = Object.values(groups);
  const triple = vals.find(g => g.length === 3);
  const pair = vals.find(g => g.length === 2);
  if (triple && pair) return cardValue(triple[2]);
  return null;
}

function isFourWithPair(sorted: Card[]): number | null {
  const groups: Record<string, Card[]> = {};
  for (const c of sorted) {
    if (!groups[c.rank]) groups[c.rank] = [];
    groups[c.rank].push(c);
  }
  const vals = Object.values(groups);
  const four = vals.find(g => g.length === 4);
  const pair = vals.find(g => g.length === 2);
  if (four && pair) return cardValue(four[3]);
  return null;
}

export function canBeat(current: Play, against: Play): boolean {
  // Same type, higher value
  if (current.type === against.type && current.cards.length === against.cards.length) {
    return current.value > against.value;
  }

  // Four of a kind beats any single 2, or pair of 2s, or pair sequence
  if (current.type === 'four') {
    if (against.type === 'single' && against.cards[0].rank === '2') return true;
    if (against.type === 'pair' && against.cards[0].rank === '2') return true;
  }

  // Four with pair beats pair of 2s
  if (current.type === 'four_with_pair') {
    if (against.type === 'pair' && against.cards[0].rank === '2') return true;
  }

  // Pair sequence of 3 pairs beats single 2
  if (current.type === 'pair_sequence' && current.cards.length >= 6) {
    if (against.type === 'single' && against.cards[0].rank === '2') return true;
  }

  return false;
}

export function hasCardWith3Spades(hand: Card[]): boolean {
  return hand.some(c => c.rank === '3' && c.suit === 'spades');
}

export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => cardValue(a) - cardValue(b));
}
