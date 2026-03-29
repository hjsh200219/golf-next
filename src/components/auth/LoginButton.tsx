'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginButton() {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-100" aria-hidden="true" />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-[160px] truncate text-xs text-gray-500 sm:block">
          {user.email}
        </span>
        <button
          onClick={() => signOut()}
          className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 min-h-[44px]"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => router.push('/login')}
      className="rounded-lg bg-golf-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 min-h-[44px]"
    >
      로그인
    </button>
  );
}
