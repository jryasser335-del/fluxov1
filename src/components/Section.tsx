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
    <section className={cn("mb-8 animate-fade-in", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Decorative line */}
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-primary to-accent" />
          
          {/* Title */}
          <h2 className="font-display text-lg tracking-wider text-white/90 flex items-center gap-2">
            {emoji && <span>{emoji}</span>}
            {title}
          </h2>

          {/* Badge */}
          {badge && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
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
