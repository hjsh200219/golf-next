'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LoginButton from '@/components/auth/LoginButton';

const NAV_ITEMS = [
  { href: '/', label: '예약조회' },
  { href: '/weather', label: '날씨' },
  { href: '/settings', label: '설정' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 glass shadow-nav">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-golf-primary spring-hover hover:opacity-80"
          >
            GolfShin
          </Link>
          <div className="flex items-center gap-1">
            <nav className="hidden md:flex gap-0.5">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'relative px-4 py-2 rounded-lg text-sm font-medium spring-hover',
                    pathname === item.href
                      ? 'text-golf-primary bg-green-50/80'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50/60',
                  ].join(' ')}
                >
                  {item.label}
                  {pathname === item.href && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-golf-primary" />
                  )}
                </Link>
              ))}
            </nav>
            <div className="ml-2">
              <LoginButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
