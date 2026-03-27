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
    <header className="bg-white shadow-sm border-b border-green-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="text-xl font-bold text-golf-primary">
            ⛳ 골프 예약
          </Link>
          <div className="flex items-center gap-2">
            <nav className="hidden md:flex gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-golf-primary text-white'
                      : 'text-gray-600 hover:bg-green-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <LoginButton />
          </div>
        </div>
      </div>
    </header>
  );
}
