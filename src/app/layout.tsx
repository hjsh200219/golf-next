import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';

export const metadata: Metadata = {
  title: '골프 예약 조회',
  description: '실시간 골프장 티타임 예약 조회 서비스',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-golf-bg">
        <Header />
        <main className="container mx-auto px-4 pb-20 md:pb-4 pt-4">
          {children}
        </main>
        <MobileNav />
      </body>
    </html>
  );
}
