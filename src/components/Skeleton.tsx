export function SkeletonCard() {
  return (
    <div className="rounded-lg overflow-hidden aspect-[2/3]">
      <div className="w-full h-full bg-gradient-to-r from-white/[0.05] via-white/10 to-white/[0.05] bg-[length:200%_100%] animate-shimmer" />
    </div>
  );
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonEventCard() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent">
      {/* Background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />
      
      {/* Top shine */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Side accents */}
      <div className="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent" />
      <div className="absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent" />
      
      <div className="relative p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.08] animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-20 bg-white/[0.08] rounded animate-pulse" />
              <div className="h-2 w-24 bg-white/[0.05] rounded animate-pulse" />
            </div>
          </div>
          <div className="h-7 w-20 rounded-full bg-white/[0.08] animate-pulse" />
        </div>

        {/* Matchup */}
        <div className="flex items-center justify-between gap-4 mb-4">
          {/* Away team */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-white/[0.08] animate-pulse mb-2" />
            <div className="h-4 w-12 bg-white/[0.08] rounded animate-pulse mb-1" />
            <div className="h-3 w-16 bg-white/[0.05] rounded animate-pulse mb-0.5" />
            <div className="h-2 w-10 bg-white/[0.03] rounded animate-pulse" />
          </div>

          {/* Score */}
          <div className="flex flex-col items-center px-4">
            <div className="h-12 w-28 bg-white/[0.08] rounded-xl animate-pulse mb-2" />
            <div className="h-5 w-20 bg-white/[0.06] rounded-full animate-pulse" />
          </div>

          {/* Home team */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-white/[0.08] animate-pulse mb-2" />
            <div className="h-4 w-12 bg-white/[0.08] rounded animate-pulse mb-1" />
            <div className="h-3 w-16 bg-white/[0.05] rounded animate-pulse mb-0.5" />
            <div className="h-2 w-10 bg-white/[0.03] rounded animate-pulse" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-5 bg-white/[0.08] rounded-lg animate-pulse" />
            <div className="h-3 w-20 bg-white/[0.05] rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.08] animate-pulse" />
            <div className="w-20 h-9 sm:h-10 rounded-xl bg-white/[0.08] animate-pulse" />
          </div>
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
