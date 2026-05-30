'use client';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import AuthPage from '@/components/AuthPage';
import GameRoom from '@/components/GameRoom';
import { use } from 'react';

function RoomContent({ roomId }: { roomId: string }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a2e12' }}>
      <div style={{ color: '#c9952a', fontFamily: 'Playfair Display, serif', fontSize: 22 }}>...</div>
    </div>
  );
  if (!user) return <AuthPage />;
  return <GameRoom roomId={roomId} />;
}

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthProvider>
      <RoomContent roomId={id} />
    </AuthProvider>
  );
}
