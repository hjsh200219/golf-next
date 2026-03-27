'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-golf-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="text-4xl">🔒</div>
        <p className="text-lg font-medium text-gray-700">로그인이 필요합니다</p>
        <p className="text-sm text-gray-500">이 기능을 사용하려면 로그인해 주세요.</p>
        <button
          onClick={() => router.push('/login')}
          className="mt-2 rounded-lg bg-golf-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
        >
          로그인하기
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
