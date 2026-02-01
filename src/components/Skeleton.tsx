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
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-transparent p-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10" />
          <div className="space-y-1">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="h-2 w-12 rounded bg-white/10" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-white/10" />
      </div>
      {/* Match */}
      <div className="rounded-xl bg-black/30 p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-white/10" />
            <div className="space-y-1">
              <div className="h-3 w-16 rounded bg-white/10" />
              <div className="h-2 w-8 rounded bg-white/10" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-6 w-16 rounded bg-white/10" />
            <div className="h-2 w-12 rounded bg-white/10" />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <div className="space-y-1 text-right">
              <div className="h-3 w-16 rounded bg-white/10 ml-auto" />
              <div className="h-2 w-8 rounded bg-white/10 ml-auto" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10" />
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <div className="h-3 w-20 rounded bg-white/10" />
        <div className="flex gap-2">
          <div className="w-9 h-9 rounded-xl bg-white/10" />
          <div className="w-20 h-9 rounded-xl bg-white/10" />
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
