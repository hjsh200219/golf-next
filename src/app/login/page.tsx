'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type LoginView = 'main' | 'email' | 'email_sent';

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<LoginView>('main');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (oauthError) {
      setError('구글 로그인 중 오류가 발생했습니다. 다시 시도해 주세요.');
      setIsLoading(false);
    }
  };

  const handleEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    setIsLoading(false);

    if (otpError) {
      setError('이메일 전송 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } else {
      setView('email_sent');
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-3 text-4xl">⛳</div>
            <h1 className="text-2xl font-bold text-gray-900">골프 예약</h1>
            <p className="mt-1 text-sm text-gray-500">로그인하여 즐겨찾기를 동기화하세요</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Main view */}
          {view === 'main' && (
            <div className="space-y-3">
              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"
                    fill="#EA4335"
                  />
                </svg>
                구글로 로그인
              </button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs text-gray-400">
                  <span className="bg-white px-2">또는</span>
                </div>
              </div>

              {/* Email button */}
              <button
                onClick={() => { setView('email'); setError(null); }}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <rect x="1" y="3.5" width="16" height="11" rx="2" stroke="#6B7280" strokeWidth="1.5" />
                  <path d="M1.5 5l7.5 5 7.5-5" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                이메일로 로그인
              </button>
            </div>
          )}

          {/* Email input view */}
          {view === 'email' && (
            <form onSubmit={handleEmailOtp} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                  이메일 주소
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-golf-primary focus:ring-2 focus:ring-golf-primary/20"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full rounded-xl bg-golf-primary px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? '전송 중…' : '이메일 링크 전송'}
              </button>
              <button
                type="button"
                onClick={() => { setView('main'); setError(null); }}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
              >
                뒤로
              </button>
            </form>
          )}

          {/* Email sent confirmation */}
          {view === 'email_sent' && (
            <div className="space-y-4 text-center">
              <div className="text-4xl">📬</div>
              <p className="font-medium text-gray-800">이메일을 확인해 주세요</p>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">{email}</span>으로<br />
                로그인 링크를 보냈습니다.
              </p>
              <button
                onClick={() => { setView('main'); setEmail(''); setError(null); }}
                className="mt-2 text-sm text-golf-primary hover:underline"
              >
                다른 방법으로 로그인
              </button>
            </div>
          )}
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            로그인 없이 계속하기
          </button>
        </div>
      </div>
    </main>
  );
}
