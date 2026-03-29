import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import Footer from '@/components/layout/Footer';
import JsonLdSchema from '@/components/JsonLdSchema';

export const metadata: Metadata = {
  title: '골프 예약 조회 | GolfShin',
  description: '실시간 골프장 티타임 예약 조회 — 30개+ 골프장, 5분 간격 업데이트',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GolfShin',
  },
  icons: {
    icon: [
      { url: '/favicon.webp', type: 'image/webp' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: '골프 예약 조회 | GolfShin',
    description: '실시간 골프장 티타임 예약 조회 서비스',
    locale: 'ko_KR',
    type: 'website',
    siteName: 'GolfShin',
  },
  twitter: {
    card: 'summary_large_image',
    title: '골프 예약 조회 | GolfShin',
    description: '실시간 골프장 티타임 예약 조회 서비스',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#16a34a',
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
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <JsonLdSchema />
      </head>
      <body className="min-h-dvh bg-golf-bg noise-overlay">
        <Header />
        <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 md:pb-8 lg:px-8">
          {children}
        </main>
        <Footer />
        <MobileNav />
        <Toaster position="top-center" richColors closeButton duration={3000} />
      </body>
    </html>
  );
}
