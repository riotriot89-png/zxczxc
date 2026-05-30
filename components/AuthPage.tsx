'use client';
import { useState } from 'react';
import { useAuth } from './AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(ellipse at center, #1a5c2a 0%, #0a2e12 60%, #060f09 100%)',
      position: 'relative',
    }}>
      {/* Decorative circles */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        border: '1px solid rgba(201,149,42,0.08)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 700,
        height: 700,
        borderRadius: '50%',
        border: '1px solid rgba(201,149,42,0.05)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
          {['♠', '♥', '♦', '♣'].map((s, i) => (
            <span key={i} style={{
              fontSize: 32,
              color: i % 2 === 0 ? 'rgba(245,240,232,0.8)' : '#c0392b',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
            }}>{s}</span>
          ))}
        </div>
        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 52,
          fontWeight: 900,
          color: '#c9952a',
          letterSpacing: 3,
          textShadow: '0 2px 12px rgba(201,149,42,0.4)',
          lineHeight: 1,
          marginBottom: 8,
        }}>
          TIEN LEN
        </h1>
        <p style={{
          color: 'rgba(245,240,232,0.5)',
          fontStyle: 'italic',
          letterSpacing: 6,
          fontSize: 13,
          textTransform: 'uppercase',
        }}>
          Mien Nam
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: 'rgba(10,46,18,0.85)',
        border: '1px solid rgba(201,149,42,0.35)',
        borderRadius: 16,
        padding: '40px 48px',
        width: '100%',
        maxWidth: 420,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderBottom: '1px solid rgba(201,149,42,0.2)' }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1,
                padding: '10px 0',
                background: 'none',
                border: 'none',
                borderBottom: mode === m ? '2px solid #c9952a' : '2px solid transparent',
                color: mode === m ? '#c9952a' : 'rgba(245,240,232,0.4)',
                fontFamily: 'Playfair Display, serif',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: 1,
                marginBottom: -1,
              }}
            >
              {m === 'login' ? 'Dang Nhap' : 'Tao Tai Khoan'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: 'rgba(245,240,232,0.6)', fontSize: 13, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
              Ten dang nhap
            </label>
            <input
              className="input-field"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Nhap ten cua ban"
              autoComplete="username"
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: 'rgba(245,240,232,0.6)', fontSize: 13, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
              Mat khau
            </label>
            <input
              className="input-field"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'It nhat 6 ky tu' : 'Nhap mat khau'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(192,57,43,0.15)',
              border: '1px solid rgba(192,57,43,0.4)',
              borderRadius: 6,
              padding: '10px 14px',
              color: '#e74c3c',
              fontSize: 14,
              marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <button
            className="btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', fontSize: 16, padding: '13px' }}
          >
            {loading ? 'Dang xu ly...' : mode === 'login' ? 'Dang Nhap' : 'Tao Tai Khoan'}
          </button>
        </form>
      </div>

      <p style={{ marginTop: 24, color: 'rgba(245,240,232,0.25)', fontSize: 13 }}>
        Tien Len Mien Nam Online
      </p>
    </div>
  );
}
