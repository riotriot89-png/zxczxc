'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import CardComponent from './Card';
import type { Card, GameRoom, Play } from '@/lib/types';
import { identifyPlay, canBeat } from '@/lib/gameEngine';

interface GameRoomProps {
  roomId: string;
}

export default function GameRoom({ roomId }: GameRoomProps) {
  const { user, token } = useAuth();
  const router = useRouter();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [lastPlayAnim, setLastPlayAnim] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<any>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRoom = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { router.push('/'); return; }
      const data = await res.json();
      setRoom(data.room);
    } catch {}
    setLoading(false);
  }, [token, roomId, router]);

  // Setup Pusher for realtime
  useEffect(() => {
    if (!token || !user) return;
    fetchRoom();

    // Poll as fallback (Pusher may not be configured)
    pollRef.current = setInterval(fetchRoom, 2000);

    // Try Pusher
    try {
      const PusherJS = require('pusher-js');
      const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
      if (pusherKey && pusherKey !== 'demo') {
        const pusher = new PusherJS(pusherKey, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
          authEndpoint: '/api/pusher/auth',
        });

        const roomChannel = pusher.subscribe(`room-${roomId}`);
        const playerChannel = pusher.subscribe(`player-${user.id}`);

        const handleUpdate = (data: any) => {
          if (data.room) {
            setRoom(data.room);
            setLastPlayAnim(true);
            setTimeout(() => setLastPlayAnim(false), 500);
          }
        };

        roomChannel.bind('room-updated', handleUpdate);
        roomChannel.bind('game-started', handleUpdate);
        roomChannel.bind('player-played', handleUpdate);
        roomChannel.bind('player-passed', handleUpdate);
        roomChannel.bind('player-joined', handleUpdate);
        roomChannel.bind('player-left', handleUpdate);
        roomChannel.bind('player-ready', handleUpdate);
        roomChannel.bind('chat-message', (msg: any) => {
          setRoom(prev => prev ? { ...prev, chat: [...(prev.chat || []), msg] } : prev);
        });

        playerChannel.bind('game-started', handleUpdate);
        playerChannel.bind('player-played', handleUpdate);
        playerChannel.bind('player-passed', handleUpdate);

        pusherRef.current = pusher;
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(fetchRoom, 5000); // slower poll with pusher
      }
    } catch {}

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (pusherRef.current) {
        pusherRef.current.unsubscribe(`room-${roomId}`);
        pusherRef.current.unsubscribe(`player-${user.id}`);
      }
    };
  }, [token, user, roomId, fetchRoom]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.chat?.length]);

  const api = useCallback(async (endpoint: string, body?: object) => {
    const res = await fetch(`/api/rooms/${roomId}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Loi');
    await fetchRoom();
    return data;
  }, [token, roomId, fetchRoom]);

  const toggleCard = (cardId: string) => {
    setSelectedCards(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const playCards = async () => {
    if (selectedCards.length === 0) return;
    setActionError('');
    try {
      await api('play', { cardIds: selectedCards });
      setSelectedCards([]);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const pass = async () => {
    setActionError('');
    try {
      await api('pass');
      setSelectedCards([]);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const startGame = async () => {
    try { await api('start'); } catch (err: any) { setActionError(err.message); }
  };

  const toggleReady = async () => {
    try { await api('ready'); } catch {}
  };

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    try {
      await fetch(`/api/rooms/${roomId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: chatMsg }),
      });
      setChatMsg('');
    } catch {}
  };

  const leaveRoom = async () => {
    await fetch(`/api/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    router.push('/');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a2e12' }}>
      <div style={{ color: '#c9952a', fontFamily: 'Playfair Display, serif', fontSize: 22 }}>Dang tai...</div>
    </div>
  );

  if (!room) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a2e12' }}>
      <div>
        <p style={{ color: '#e74c3c', marginBottom: 16 }}>Phong khong ton tai</p>
        <button className="btn-primary" onClick={() => router.push('/')}>Quay Ve</button>
      </div>
    </div>
  );

  const me = room.players.find(p => p.id === user?.id);
  const isMyTurn = room.status === 'playing' && room.players[room.currentPlayerIndex]?.id === user?.id;
  const isHost = room.hostId === user?.id;

  // Validate current selection
  const myHand = me?.hand || [];
  const selectedCardObjs = myHand.filter((c: Card) => selectedCards.includes(c.id));
  const currentPlay = selectedCardObjs.length > 0 ? identifyPlay(selectedCardObjs) : null;
  const canPlaySelected = currentPlay && (!room.lastPlay || !room.lastPlayerId || room.lastPlayerId === user?.id || canBeat(currentPlay, room.lastPlay));

  // Player positions for up to 4 players
  const otherPlayers = room.players.filter(p => p.id !== user?.id);

  const positions = [
    { top: '50%', left: 0, transform: 'translateY(-50%)' },  // left
    { top: 0, left: '50%', transform: 'translateX(-50%)' },   // top
    { top: '50%', right: 0, transform: 'translateY(-50%)' },  // right
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(ellipse at center, #236b35 0%, #1a5c2a 40%, #0a2e12 100%)' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        background: 'rgba(6,15,9,0.6)',
        borderBottom: '1px solid rgba(201,149,42,0.2)',
        backdropFilter: 'blur(8px)',
        zIndex: 10,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={leaveRoom} style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.45)', cursor: 'pointer', fontSize: 13, transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#c9952a')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.45)')}>
            Roi Phong
          </button>
          <span style={{ color: 'rgba(245,240,232,0.3)' }}>|</span>
          <span style={{ fontFamily: 'Playfair Display, serif', color: '#c9952a', fontWeight: 700 }}>{room.name}</span>
          <span style={{ fontFamily: 'monospace', color: 'rgba(201,149,42,0.5)', fontSize: 13 }}>#{room.id}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {room.status === 'playing' && (
            <span style={{ fontSize: 13, color: 'rgba(245,240,232,0.5)' }}>
              Luot {room.turn} - {isMyTurn ? <span style={{ color: '#2ecc71', fontWeight: 600 }}>Luot ban</span> : <span>Cho {room.players[room.currentPlayerIndex]?.username}...</span>}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'rgba(245,240,232,0.3)' }}>{user?.username}</span>
        </div>
      </div>

      {/* Main game area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Game table */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Felt table oval */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60%',
            height: '55%',
            borderRadius: '50%',
            border: '3px solid rgba(201,149,42,0.25)',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.3), 0 0 40px rgba(0,0,0,0.3)',
            background: 'rgba(15,61,28,0.4)',
            pointerEvents: 'none',
          }} />

          {/* Other players */}
          {otherPlayers.map((player, idx) => {
            const pos = positions[idx % 3];
            const isTurn = room.status === 'playing' && room.players[room.currentPlayerIndex]?.id === player.id;
            return (
              <div
                key={player.id}
                style={{
                  position: 'absolute',
                  ...pos,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: 16,
                }}
              >
                {/* Name tag */}
                <div style={{
                  background: isTurn ? 'rgba(46,204,113,0.15)' : 'rgba(15,61,28,0.7)',
                  border: isTurn ? '1px solid #2ecc71' : '1px solid rgba(201,149,42,0.2)',
                  borderRadius: 8,
                  padding: '5px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  {isTurn && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2ecc71', animation: 'none' }} />}
                  <span style={{ fontWeight: 600, color: '#f5f0e8', fontSize: 13 }}>{player.username}</span>
                  <span style={{ color: 'rgba(245,240,232,0.4)', fontSize: 12 }}>{player.hand.length} la</span>
                  {player.finishPosition && (
                    <span style={{ background: '#c9952a', color: '#1a1a1a', padding: '1px 6px', borderRadius: 3, fontSize: 11, fontWeight: 700 }}>
                      #{player.finishPosition}
                    </span>
                  )}
                </div>

                {/* Face-down cards */}
                <div style={{ display: 'flex', gap: -8 }}>
                  {Array.from({ length: Math.min(player.hand.length, 13) }).map((_, i) => (
                    <div key={i} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                      <CardComponent
                        card={{ id: 'hidden', suit: 'spades', rank: '3' }}
                        faceDown
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Center - last play */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}>
            {room.lastPlay && room.lastPlay.cards.length > 0 ? (
              <div style={{ animation: lastPlayAnim ? 'cardPlay 0.4s ease' : 'none' }}>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                  {room.lastPlay.cards.map((card: Card) => (
                    <CardComponent key={card.id} card={card} size="md" />
                  ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: 8, color: 'rgba(245,240,232,0.45)', fontSize: 12 }}>
                  {room.players.find(p => p.id === room.lastPlayerId)?.username} vua danh
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'rgba(245,240,232,0.2)', fontSize: 14 }}>
                {room.status === 'waiting' ? 'Cho nguoi choi...' : room.status === 'playing' ? 'Danh bai dau tien' : ''}
              </div>
            )}
          </div>

          {/* Waiting room overlay */}
          {room.status === 'waiting' && (
            <div style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(10,46,18,0.9)',
              border: '1px solid rgba(201,149,42,0.3)',
              borderRadius: 12,
              padding: '20px 32px',
              textAlign: 'center',
              backdropFilter: 'blur(8px)',
              minWidth: 300,
            }}>
              <p style={{ color: '#c9952a', fontFamily: 'Playfair Display, serif', fontSize: 18, marginBottom: 16 }}>
                Phong {room.name}
              </p>
              <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: 14, marginBottom: 20 }}>
                {room.players.length}/{room.maxPlayers} nguoi choi
              </p>

              {/* Players list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {room.players.map(p => (
                  <div key={p.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 6,
                    padding: '6px 12px',
                  }}>
                    <span style={{ color: '#f5f0e8', fontSize: 14 }}>
                      {p.username}
                      {p.id === room.hostId && <span style={{ marginLeft: 6, fontSize: 11, color: '#c9952a' }}>Chu phong</span>}
                    </span>
                    <span style={{ fontSize: 12, color: p.isReady ? '#2ecc71' : 'rgba(245,240,232,0.3)' }}>
                      {p.id === user?.id ? (p.isReady ? 'San sang' : 'Chua san sang') : (p.isReady ? 'San sang' : 'Cho...')}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                {me && (
                  <button className="btn-secondary" onClick={toggleReady} style={{ fontSize: 14 }}>
                    {me.isReady ? 'Huy San Sang' : 'San sang'}
                  </button>
                )}
                {isHost && (
                  <button
                    className="btn-primary"
                    onClick={startGame}
                    disabled={room.players.length < 2}
                    style={{ fontSize: 14 }}
                  >
                    Bat Dau
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Game over overlay */}
          {room.status === 'finished' && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}>
              <div style={{
                background: 'rgba(10,46,18,0.97)',
                border: '1px solid rgba(201,149,42,0.5)',
                borderRadius: 16,
                padding: '40px 48px',
                textAlign: 'center',
                boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
              }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, color: '#c9952a', marginBottom: 24 }}>
                  Ket Qua
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {[...room.players].sort((a, b) => (a.finishPosition || 99) - (b.finishPosition || 99)).map(p => (
                    <div key={p.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '10px 20px',
                      background: p.finishPosition === 1 ? 'rgba(201,149,42,0.15)' : 'rgba(255,255,255,0.04)',
                      borderRadius: 8,
                      border: p.finishPosition === 1 ? '1px solid rgba(201,149,42,0.4)' : '1px solid transparent',
                    }}>
                      <span style={{ fontSize: 22, fontFamily: 'Playfair Display, serif', color: p.finishPosition === 1 ? '#c9952a' : 'rgba(245,240,232,0.4)', width: 32 }}>
                        #{p.finishPosition || '?'}
                      </span>
                      <span style={{ fontWeight: 600, color: '#f5f0e8', fontSize: 16 }}>{p.username}</span>
                      {p.finishPosition === 1 && <span style={{ color: '#c9952a', fontSize: 14 }}>Thang!</span>}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  {isHost && (
                    <button className="btn-primary" onClick={startGame}>Choi Lai</button>
                  )}
                  <button className="btn-secondary" onClick={leaveRoom}>Roi Phong</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel - Chat */}
        <div style={{
          width: 260,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(6,15,9,0.6)',
          borderLeft: '1px solid rgba(201,149,42,0.15)',
          flexShrink: 0,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(201,149,42,0.15)' }}>
            <span style={{ color: 'rgba(245,240,232,0.5)', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
              Tin nhan
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(room.chat || []).map(msg => (
              <div key={msg.id}>
                <span style={{ color: '#c9952a', fontSize: 12, fontWeight: 600 }}>{msg.username}: </span>
                <span style={{ color: 'rgba(245,240,232,0.7)', fontSize: 13 }}>{msg.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={sendChat} style={{ padding: '12px', borderTop: '1px solid rgba(201,149,42,0.15)', display: 'flex', gap: 8 }}>
            <input
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              placeholder="Nhan tin..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(201,149,42,0.2)',
                borderRadius: 6,
                color: '#f5f0e8',
                padding: '6px 10px',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'Crimson Pro, serif',
              }}
            />
            <button type="submit" style={{
              background: 'rgba(201,149,42,0.2)',
              border: '1px solid rgba(201,149,42,0.3)',
              borderRadius: 6,
              color: '#c9952a',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: 13,
            }}>Gui</button>
          </form>
        </div>
      </div>

      {/* My hand - bottom */}
      {room.status === 'playing' && me && me.hand.length > 0 && (
        <div style={{
          background: 'rgba(6,15,9,0.7)',
          borderTop: '1px solid rgba(201,149,42,0.2)',
          padding: '16px 20px',
          backdropFilter: 'blur(8px)',
          flexShrink: 0,
        }}>
          {/* Selection info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.45)' }}>
              Bai cua ban ({me.hand.length} la)
              {selectedCards.length > 0 && (
                <span style={{ marginLeft: 12, color: currentPlay ? (canPlaySelected ? '#2ecc71' : '#e67e22') : '#e74c3c' }}>
                  {selectedCards.length} la chon
                  {currentPlay ? ` - ${currentPlay.type}` : ' - Khong hop le'}
                </span>
              )}
            </div>

            {isMyTurn && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {actionError && (
                  <span style={{ color: '#e74c3c', fontSize: 13 }}>{actionError}</span>
                )}
                <button
                  className="btn-secondary"
                  onClick={pass}
                  disabled={!room.lastPlay || room.lastPlayerId === user?.id}
                  style={{ fontSize: 13, padding: '6px 16px' }}
                >
                  Bo Qua
                </button>
                <button
                  className="btn-primary"
                  onClick={playCards}
                  disabled={!currentPlay || !canPlaySelected || !isMyTurn}
                  style={{ fontSize: 14, padding: '8px 20px' }}
                >
                  Danh Bai
                </button>
              </div>
            )}
            {!isMyTurn && room.status === 'playing' && (
              <span style={{ color: 'rgba(245,240,232,0.3)', fontSize: 13 }}>
                Cho den luot ban...
              </span>
            )}
          </div>

          {/* Hand */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            justifyContent: 'center',
          }}>
            {me.hand.map((card: Card, idx: number) => (
              <CardComponent
                key={card.id}
                card={card}
                selected={selectedCards.includes(card.id)}
                onClick={() => isMyTurn ? toggleCard(card.id) : undefined}
                size="lg"
                disabled={!isMyTurn}
                style={{ animationDelay: `${idx * 30}ms` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
