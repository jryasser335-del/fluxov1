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
    <section className={cn("mt-4 p-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] shadow-cinema animate-fade-in", className)}>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-display text-[22px] tracking-wider flex items-center gap-2.5">
          <span>{emoji}</span>
          {title}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {badge && (
            <span className="px-2.5 py-1.5 rounded-full border border-white/10 bg-black/35 text-muted-foreground text-xs">
              {badge}
            </span>
          )}
          {actions}
        </div>
      </div>
      {children}
    </section>
  );
}
