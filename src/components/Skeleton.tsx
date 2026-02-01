export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden">
      <div className="h-[260px] bg-gradient-to-r from-white/[0.05] via-white/10 to-white/[0.05] bg-[length:200%_100%] animate-shimmer" />
      <div className="p-3">
        <div className="h-2.5 rounded-full bg-gradient-to-r from-white/[0.05] via-white/10 to-white/[0.05] bg-[length:200%_100%] animate-shimmer mt-2.5" />
        <div className="h-2.5 w-[62%] rounded-full bg-gradient-to-r from-white/[0.05] via-white/10 to-white/[0.05] bg-[length:200%_100%] animate-shimmer mt-2.5" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonEventCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] h-48 animate-pulse" />
  );
}

export function SkeletonChannelCard() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] h-[74px] animate-pulse" />
  );
}
