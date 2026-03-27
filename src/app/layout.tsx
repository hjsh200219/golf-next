import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';

export const metadata: Metadata = {
  title: '골프 예약 조회 | GolfShin',
  description: '실시간 골프장 티타임 예약 조회 — 26개 골프장, 5분 간격 업데이트',
  openGraph: {
    title: '골프 예약 조회 | GolfShin',
    description: '실시간 골프장 티타임 예약 조회 서비스',
    locale: 'ko_KR',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="antialiased">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-dvh bg-golf-bg noise-overlay">
        <Header />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 md:pb-8 lg:px-8">
          {children}
        </main>
        <MobileNav />
      </body>
    </html>
  );
}
