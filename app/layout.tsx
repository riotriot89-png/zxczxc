import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tiến Lên - Đánh Bài Online',
  description: 'Tiến Lên Miền Nam',
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
