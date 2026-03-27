'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: '예약', icon: '🔍' },
  { href: '/weather', label: '날씨', icon: '🌤' },
  { href: '/settings', label: '설정', icon: '⚙' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-gray-100/60 safe-area-bottom">
      <div className="flex justify-around px-2 py-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex flex-col items-center py-1.5 px-5 rounded-xl text-[11px] spring-hover',
                isActive
                  ? 'text-golf-primary font-semibold'
                  : 'text-gray-400 active:scale-95',
              ].join(' ')}
            >
              <span className="text-base leading-none mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
