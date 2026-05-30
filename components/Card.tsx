'use client';
import React from 'react';
import { Card as CardType } from '@/lib/types';

interface CardProps {
  card: CardType;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_NAMES: Record<string, string> = {
  hearts: 'Co',
  diamonds: 'Ro',
  clubs: 'Tuong',
  spades: 'Bich',
};

function isRed(suit: string) {
  return suit === 'hearts' || suit === 'diamonds';
}

const SIZES = {
  sm: { w: 52, h: 76, font: 14, sym: 20 },
  md: { w: 72, h: 104, font: 18, sym: 28 },
  lg: { w: 90, h: 130, font: 22, sym: 36 },
};

export default function Card({ card, selected, onClick, size = 'md', faceDown, disabled, style }: CardProps) {
  const s = SIZES[size];
  const red = isRed(card.suit);
  const color = red ? '#c0392b' : '#1a1a1a';
  const suit = SUIT_SYMBOLS[card.suit] || '?';
  const rank = card.rank;

  if (faceDown || card.id === 'hidden') {
    return (
      <div
        style={{
          width: s.w,
          height: s.h,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #1a5c2a 0%, #0f3d1c 50%, #1a5c2a 100%)',
          border: '2px solid rgba(201,149,42,0.4)',
          boxShadow: '0 3px 12px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        <div style={{
          width: s.w - 12,
          height: s.h - 12,
          border: '1px solid rgba(201,149,42,0.3)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(201,149,42,0.05) 3px, rgba(201,149,42,0.05) 6px)',
        }}>
          <span style={{ color: 'rgba(201,149,42,0.5)', fontSize: s.sym }}>TL</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{
        width: s.w,
        height: s.h,
        borderRadius: 8,
        background: selected 
          ? 'linear-gradient(180deg, #fffef8 0%, #f9f6ef 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #f5f2ea 100%)',
        border: selected ? '2px solid #c9952a' : '1px solid rgba(0,0,0,0.15)',
        boxShadow: selected 
          ? '0 10px 32px rgba(201,149,42,0.5), 0 0 0 1px rgba(201,149,42,0.3)'
          : '0 3px 12px rgba(0,0,0,0.35)',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '4px 5px',
        transform: selected ? 'translateY(-16px)' : 'translateY(0)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        userSelect: 'none',
        position: 'relative',
        ...style,
      }}
    >
      {/* Top left */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
        <span style={{ fontWeight: 700, fontSize: s.font, color, fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}>
          {rank}
        </span>
        <span style={{ fontSize: s.font - 3, color, lineHeight: 1 }}>{suit}</span>
      </div>

      {/* Center suit */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flex: 1,
      }}>
        <span style={{ 
          fontSize: s.sym, 
          color,
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
        }}>
          {suit}
        </span>
      </div>

      {/* Bottom right (rotated) */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'flex-end', 
        lineHeight: 1,
        transform: 'rotate(180deg)',
      }}>
        <span style={{ fontWeight: 700, fontSize: s.font, color, fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}>
          {rank}
        </span>
        <span style={{ fontSize: s.font - 3, color, lineHeight: 1 }}>{suit}</span>
      </div>

      {/* 2 card special glow */}
      {rank === '2' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          background: 'linear-gradient(135deg, rgba(192,57,43,0.06), transparent)',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}
