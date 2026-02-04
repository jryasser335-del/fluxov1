import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  emoji?: string;
  badge?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function Section({ title, emoji, badge, children, actions, className }: SectionProps) {
  return (
    <section className={cn("mb-10 animate-fade-in", className)}>
      {/* Premium Header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-4">
          {/* Premium decorative gradient line */}
          <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-primary via-accent to-primary/50 shadow-lg shadow-primary/30" />
          
          {/* Title with enhanced styling */}
          <h2 className="font-display text-xl tracking-wider text-white flex items-center gap-3">
            {emoji && (
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.1] flex items-center justify-center text-lg">
                {emoji}
              </span>
            )}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white/95 to-white/80">
              {title}
            </span>
          </h2>

          {/* Premium Badge */}
          {badge && (
            <span className="ml-1 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-primary/20 to-accent/15 text-primary border border-primary/25 shadow-sm shadow-primary/10">
              {badge}
            </span>
          )}
        </div>
        
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>

      {/* Content */}
      {children}
    </section>
  );
}
