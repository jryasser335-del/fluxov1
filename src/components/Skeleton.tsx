import { cn } from "@/lib/utils";

export function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden aspect-[2/3] border border-white/[0.04]">
      <div className="w-full h-full bg-gradient-to-r from-white/[0.03] via-white/[0.07] to-white/[0.03] bg-[length:200%_100%] animate-shimmer" />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-shimmer rounded-xl bg-gradient-to-r from-white/[0.03] via-white/[0.07] to-white/[0.03] bg-[length:200%_100%]", className)} />
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
    <div className="relative rounded-[17px] overflow-hidden border border-white/[0.04] bg-gradient-to-b from-card to-background">
      {/* Top shine */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent z-10" />
      
      {/* Match area skeleton */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-white/[0.03] to-transparent">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-shimmer bg-[length:200%_100%]" />
        
        {/* Badge skeleton */}
        <div className="absolute top-3 left-3">
          <div className="h-7 w-16 rounded-xl bg-white/[0.06] animate-pulse" />
        </div>
        
        {/* Team logos */}
        <div className="absolute inset-0 flex items-center justify-center gap-8 px-8">
          <div className="w-12 h-12 sm:w-[60px] sm:h-[60px] rounded-2xl bg-white/[0.05] animate-pulse" />
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] animate-pulse" />
          <div className="w-12 h-12 sm:w-[60px] sm:h-[60px] rounded-2xl bg-white/[0.05] animate-pulse" />
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="px-3.5 pt-3 pb-2.5 space-y-2">
        <div className="h-3.5 w-3/4 bg-white/[0.05] rounded-lg animate-pulse" />
        <div className="h-2.5 w-1/2 bg-white/[0.03] rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonChannelCard() {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-gradient-to-br from-white/[0.03] to-transparent p-3 flex items-center gap-3 animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 rounded bg-white/[0.06]" />
        <div className="h-2 w-16 rounded bg-white/[0.04]" />
      </div>
      <div className="w-9 h-9 rounded-lg bg-white/[0.06]" />
    </div>
  );
}
