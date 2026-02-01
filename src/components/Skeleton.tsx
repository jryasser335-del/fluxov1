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
    <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-gradient-to-b from-white/[0.04] via-black/80 to-black/95 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 animate-shimmer" />
          <div className="space-y-1.5">
            <div className="h-3 w-16 sm:w-20 bg-white/10 animate-shimmer rounded" />
            <div className="h-2 w-10 sm:w-12 bg-white/10 animate-shimmer rounded" />
          </div>
        </div>
        <div className="h-5 sm:h-6 w-14 sm:w-16 rounded-full bg-white/10 animate-shimmer" />
      </div>

      {/* Teams matchup - NBA style */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 mb-4">
        {/* Away team */}
        <div className="flex-1 flex flex-col items-center">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-white/10 animate-shimmer mb-2" />
          <div className="h-3 sm:h-4 w-8 sm:w-12 bg-white/10 animate-shimmer rounded mb-1" />
          <div className="h-2 sm:h-3 w-12 sm:w-16 bg-white/10 animate-shimmer rounded" />
        </div>

        {/* Score */}
        <div className="flex flex-col items-center px-2 sm:px-4">
          <div className="h-8 sm:h-10 w-16 sm:w-20 bg-white/10 animate-shimmer rounded mb-1" />
          <div className="h-4 sm:h-5 w-12 sm:w-16 bg-white/10 animate-shimmer rounded-full" />
        </div>

        {/* Home team */}
        <div className="flex-1 flex flex-col items-center">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-white/10 animate-shimmer mb-2" />
          <div className="h-3 sm:h-4 w-8 sm:w-12 bg-white/10 animate-shimmer rounded mb-1" />
          <div className="h-2 sm:h-3 w-12 sm:w-16 bg-white/10 animate-shimmer rounded" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <div className="h-3 w-16 sm:w-20 bg-white/10 animate-shimmer rounded" />
        <div className="flex gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 animate-shimmer" />
          <div className="w-12 sm:w-16 h-8 sm:h-9 rounded-xl bg-white/10 animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonChannelCard() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-transparent p-3 flex items-center gap-3 animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-white/10 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className="h-2 w-16 rounded bg-white/10" />
      </div>
      <div className="w-9 h-9 rounded-lg bg-white/10" />
    </div>
  );
}
