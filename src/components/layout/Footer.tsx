import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
      <p>GolfShin &copy; {new Date().getFullYear()} SH Consulting &middot; 골프 티타임 예약 조회</p>
      <p className="mt-1 space-x-3">
        <Link href="/privacy" className="underline-offset-2 hover:underline">개인정보처리방침</Link>
        <Link href="/support" className="underline-offset-2 hover:underline">지원</Link>
      </p>
    </footer>
  );
}
