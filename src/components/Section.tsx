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
      "relative mt-6 animate-fade-in",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <h2 className="text-xl font-semibold flex items-center gap-3 text-white">
          <span className="text-xl">{emoji}</span>
          <span>{title}</span>
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          {badge && (
            <span className="px-3 py-1 rounded-full bg-white/5 text-white/50 text-xs font-medium">
              {badge}
            </span>
          )}
          {actions}
        </div>
      </div>
      
      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </section>
  );
}
