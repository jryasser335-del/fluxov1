import { Tv, Radio, Clock, Calendar, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventsStatsProps {
  totalEvents: number;
  liveEvents: number;
  upcomingEvents: number;
  withLinks: number;
}

export function EventsStats({ totalEvents, liveEvents, upcomingEvents, withLinks }: EventsStatsProps) {
  const stats = [
    {
      icon: Calendar,
      label: "Total",
      value: totalEvents,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      icon: Radio,
      label: "En Vivo",
      value: liveEvents,
      color: "from-red-500 to-orange-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      pulse: liveEvents > 0
    },
    {
      icon: Clock,
      label: "Próximos",
      value: upcomingEvents,
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20"
    },
    {
      icon: Tv,
      label: "Con Señal",
      value: withLinks,
      color: "from-emerald-500 to-green-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20"
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            "relative rounded-2xl overflow-hidden border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] group",
            stat.bgColor,
            stat.borderColor
          )}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Gradient overlay */}
          <div className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
            `bg-gradient-to-br ${stat.color}`
          )} style={{ opacity: 0.05 }} />
          
          {/* Content */}
          <div className="relative p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center",
                `bg-gradient-to-br ${stat.color}`
              )}>
                <stat.icon className={cn(
                  "w-4 h-4 text-white",
                  stat.pulse && "animate-pulse"
                )} />
              </div>
              {stat.pulse && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-white tabular-nums">
              {stat.value}
            </div>
            <div className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
