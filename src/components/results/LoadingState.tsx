export default function LoadingState({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-gray-100">
      <div className="grid grid-cols-6 gap-3 border-b border-gray-100 px-4 py-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`h-${i}`} className="h-3 w-12 animate-shimmer rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-6 gap-3 border-b border-gray-50 last:border-b-0 px-4 py-3"
        >
          <div className="h-4 w-20 animate-shimmer rounded" style={{ animationDelay: `${i * 60}ms` }} />
          <div className="h-4 w-16 animate-shimmer rounded" style={{ animationDelay: `${i * 60 + 20}ms` }} />
          <div className="h-4 w-10 animate-shimmer rounded" style={{ animationDelay: `${i * 60 + 40}ms` }} />
          <div className="h-4 w-14 animate-shimmer rounded" style={{ animationDelay: `${i * 60 + 60}ms` }} />
          <div className="h-4 w-16 animate-shimmer rounded" style={{ animationDelay: `${i * 60 + 80}ms` }} />
          <div className="h-4 w-8 animate-shimmer rounded" style={{ animationDelay: `${i * 60 + 100}ms` }} />
        </div>
      ))}
    </div>
  );
}
