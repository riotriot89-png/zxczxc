'use client';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import AuthPage from '@/components/AuthPage';
import Lobby from '@/components/Lobby';

function AppContent() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a2e12' }}>
      <div style={{ color: '#c9952a', fontFamily: 'Playfair Display, serif', fontSize: 22 }}>...</div>
    </div>
  );
  if (!user) return <AuthPage />;
  return <Lobby />;
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
