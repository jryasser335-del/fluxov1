import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  emoji: string;
  badge?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function Section({ title, emoji, badge, children, actions, className }: SectionProps) {
  return (
    <section className={cn(
      "relative mt-5 p-5 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-xl shadow-xl shadow-black/20 animate-fade-in overflow-hidden",
      className
    )}>
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap relative z-10">
        <h2 className="font-display text-2xl tracking-wider flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <span className="gradient-text">{title}</span>
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          {badge && (
            <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground text-xs font-medium backdrop-blur-sm">
              {badge}
            </span>
          )}
          {actions}
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}
