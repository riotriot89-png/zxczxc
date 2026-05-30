'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';

interface RoomInfo {
  id: string;
  name: string;
  hasPassword: boolean;
  playerCount: number;
  maxPlayers: number;
  status: string;
  hostId: string;
  createdAt: number;
}

export default function Lobby() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState<RoomInfo | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', password: '', maxPlayers: 4 });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/rooms', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.rooms) setRooms(data.rooms.sort((a: RoomInfo, b: RoomInfo) => b.createdAt - a.createdAt));
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/room/${data.roomId}`);
    } catch (err: any) {
      setCreateError(err.message);
      setCreating(false);
    }
  };

  const joinRoom = async (room: RoomInfo, pw?: string) => {
    setJoinError('');
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: pw || '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/room/${room.id}`);
    } catch (err: any) {
      setJoinError(err.message);
    }
  };

  const statusLabel = (s: string) => {
    if (s === 'waiting') return { text: 'Cho nguoi', color: '#2ecc71' };
    if (s === 'playing') return { text: 'Dang choi', color: '#e67e22' };
    return { text: 'Ket thuc', color: '#95a5a6' };
  };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #1a5c2a 0%, #0a2e12 50%, #060f09 100%)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        borderBottom: '1px solid rgba(201,149,42,0.2)',
        background: 'rgba(6,15,9,0.5)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: '#c9952a', letterSpacing: 2 }}>
            TIEN LEN
          </h1>
          <span style={{ color: 'rgba(245,240,232,0.3)', fontSize: 13 }}>Mien Nam</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#c9952a', fontWeight: 600, fontSize: 15 }}>
              {user?.username}
              {user?.isAdmin && <span style={{ marginLeft: 8, fontSize: 11, background: '#c9952a', color: '#1a1a1a', padding: '1px 6px', borderRadius: 3 }}>ADMIN</span>}
            </div>
          </div>
          <button className="btn-secondary" onClick={logout} style={{ padding: '6px 16px', fontSize: 14 }}>
            Dang Xuat
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: 'rgba(245,240,232,0.8)' }}>
            Danh Sach Phong  <span style={{ fontSize: 14, color: 'rgba(245,240,232,0.35)', fontFamily: 'Crimson Pro' }}>({rooms.length} phong)</span>
          </h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-secondary" onClick={fetchRooms} style={{ fontSize: 14 }}>Lam Moi</button>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>Tao Phong</button>
          </div>
        </div>

        {/* Room list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'rgba(245,240,232,0.3)' }}>Dang tai...</div>
        ) : rooms.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 40px',
            border: '1px dashed rgba(201,149,42,0.2)',
            borderRadius: 12,
            color: 'rgba(245,240,232,0.35)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>♠</div>
            <p style={{ fontSize: 18 }}>Chua co phong nao</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>Hay tao phong va moi ban be vao choi</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rooms.map(room => {
              const st = statusLabel(room.status);
              return (
                <div
                  key={room.id}
                  style={{
                    background: 'rgba(15,61,28,0.7)',
                    border: '1px solid rgba(201,149,42,0.2)',
                    borderRadius: 10,
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'border-color 0.2s, background 0.2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,149,42,0.45)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(15,61,28,0.9)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,149,42,0.2)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(15,61,28,0.7)';
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, color: '#f5f0e8' }}>
                        {room.name}
                      </span>
                      {room.hasPassword && (
                        <span style={{ fontSize: 12, color: '#c9952a', opacity: 0.7 }}>Co mat khau</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'rgba(245,240,232,0.45)' }}>
                      <span>Phong: <strong style={{ color: '#c9952a', fontFamily: 'monospace', fontSize: 15 }}>#{room.id}</strong></span>
                      <span style={{ color: st.color }}>{st.text}</span>
                      <span>{room.playerCount}/{room.maxPlayers} nguoi</span>
                    </div>
                  </div>

                  {room.status === 'waiting' && room.playerCount < room.maxPlayers && (
                    <button
                      className="btn-primary"
                      onClick={() => {
                        if (room.hasPassword) {
                          setShowJoin(room);
                          setJoinPassword('');
                          setJoinError('');
                        } else {
                          joinRoom(room);
                        }
                      }}
                      style={{ fontSize: 14 }}
                    >
                      Vao Phong
                    </button>
                  )}
                  {room.status === 'waiting' && room.playerCount >= room.maxPlayers && (
                    <span style={{ color: 'rgba(245,240,232,0.35)', fontSize: 13 }}>Day phong</span>
                  )}
                  {room.status === 'playing' && (
                    <button
                      className="btn-secondary"
                      onClick={() => joinRoom(room, joinPassword)}
                      style={{ fontSize: 14 }}
                    >
                      Xem
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create room modal */}
      {showCreate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: 24,
        }} onClick={() => setShowCreate(false)}>
          <div
            style={{
              background: 'rgba(10,46,18,0.97)',
              border: '1px solid rgba(201,149,42,0.4)',
              borderRadius: 14,
              padding: '36px 40px',
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: '#c9952a', marginBottom: 28 }}>
              Tao Phong Moi
            </h3>

            <form onSubmit={createRoom}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', color: 'rgba(245,240,232,0.55)', fontSize: 12, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Ten phong
                </label>
                <input
                  className="input-field"
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Phong cua Tien"
                  required
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', color: 'rgba(245,240,232,0.55)', fontSize: 12, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Mat khau phong (tuy chon)
                </label>
                <input
                  className="input-field"
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="De trong neu khong can mat khau"
                  type="password"
                />
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', color: 'rgba(245,240,232,0.55)', fontSize: 12, marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                  So nguoi choi: {createForm.maxPlayers}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[2, 3, 4].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCreateForm(f => ({ ...f, maxPlayers: n }))}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: 6,
                        border: createForm.maxPlayers === n ? '2px solid #c9952a' : '1px solid rgba(201,149,42,0.25)',
                        background: createForm.maxPlayers === n ? 'rgba(201,149,42,0.15)' : 'transparent',
                        color: createForm.maxPlayers === n ? '#c9952a' : 'rgba(245,240,232,0.45)',
                        cursor: 'pointer',
                        fontFamily: 'Playfair Display, serif',
                        fontSize: 16,
                        fontWeight: 700,
                        transition: 'all 0.15s',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {createError && (
                <div style={{ background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.4)', borderRadius: 6, padding: '8px 12px', color: '#e74c3c', fontSize: 14, marginBottom: 18 }}>
                  {createError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)} style={{ flex: 1 }}>Huy</button>
                <button type="submit" className="btn-primary" disabled={creating} style={{ flex: 2, fontSize: 15 }}>
                  {creating ? 'Dang tao...' : 'Tao Phong'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join password modal */}
      {showJoin && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: 24,
        }} onClick={() => setShowJoin(null)}>
          <div
            style={{
              background: 'rgba(10,46,18,0.97)',
              border: '1px solid rgba(201,149,42,0.4)',
              borderRadius: 14,
              padding: '32px 36px',
              width: '100%',
              maxWidth: 360,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, color: '#c9952a', marginBottom: 8 }}>
              Nhap Mat Khau
            </h3>
            <p style={{ color: 'rgba(245,240,232,0.45)', fontSize: 14, marginBottom: 24 }}>
              Phong "{showJoin.name}" yeu cau mat khau
            </p>

            <input
              className="input-field"
              type="password"
              value={joinPassword}
              onChange={e => setJoinPassword(e.target.value)}
              placeholder="Mat khau phong"
              onKeyDown={e => { if (e.key === 'Enter') joinRoom(showJoin, joinPassword); }}
              autoFocus
              style={{ marginBottom: 16 }}
            />

            {joinError && (
              <div style={{ color: '#e74c3c', fontSize: 14, marginBottom: 12 }}>{joinError}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setShowJoin(null)} style={{ flex: 1 }}>Huy</button>
              <button className="btn-primary" onClick={() => joinRoom(showJoin, joinPassword)} style={{ flex: 1 }}>Vao</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
