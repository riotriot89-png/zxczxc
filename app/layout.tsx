import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tien Len - Danh Bai Online',
  description: 'Choi Tien Len Mien Nam online cung ban be',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </body>
    </html>
  );
}
