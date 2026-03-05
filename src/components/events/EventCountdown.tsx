import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface EventCountdownProps {
  targetDate: string;
  compact?: boolean;
}

function FlipDigit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative">
        {/* Glassmorphism card */}
        <div className="relative w-10 h-12 sm:w-12 sm:h-14 rounded-lg overflow-hidden">
          {/* Background layers */}
          <div className="absolute inset-0 bg-white/[0.06] backdrop-blur-xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-black/30" />
          
          {/* Border glow */}
          <div className="absolute inset-0 rounded-lg ring-1 ring-white/[0.1]" />
          
          {/* Number */}
          <div className="relative flex items-center justify-center h-full">
            <span className="font-display text-2xl sm:text-3xl text-white tabular-nums tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]">
              {value}
            </span>
          </div>
        </div>
        
        {/* Bottom reflection */}
        <div className="absolute -bottom-0.5 inset-x-1 h-1 bg-primary/20 rounded-full blur-sm" />
      </div>
      <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] text-white/30">{label}</span>
    </div>
  );
}

function CompactDigit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-7 h-8 rounded-md overflow-hidden">
        <div className="absolute inset-0 bg-white/[0.08] backdrop-blur-xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent" />
        <div className="absolute inset-0 rounded-md ring-1 ring-primary/20" />
        <div className="relative flex items-center justify-center h-full">
          <span className="font-display text-sm text-primary tabular-nums font-bold">
            {value}
          </span>
        </div>
      </div>
      <span className="text-[6px] uppercase tracking-widest text-white/20 mt-0.5">{label}</span>
    </div>
  );
}

export function EventCountdown({ targetDate, compact = false }: EventCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - Date.now();
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const pad = (num: number) => num.toString().padStart(2, "0");
  const isZero = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  if (isZero) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Clock className="w-2.5 h-2.5 text-primary/60" />
        <div className="flex items-center gap-0.5">
          {timeLeft.days > 0 && <CompactDigit value={pad(timeLeft.days)} label="D" />}
          <CompactDigit value={pad(timeLeft.hours)} label="H" />
          <span className="text-primary/40 text-[10px] font-bold mx-px animate-pulse">:</span>
          <CompactDigit value={pad(timeLeft.minutes)} label="M" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Label */}
      <div className="flex items-center gap-1.5">
        <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/40">
          Starts in
        </span>
        <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
      </div>
      
      {/* Flip clock digits */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {timeLeft.days > 0 && (
          <>
            <FlipDigit value={pad(timeLeft.days)} label="Days" />
            <span className="text-white/20 text-lg font-bold self-start mt-3">:</span>
          </>
        )}
        <FlipDigit value={pad(timeLeft.hours)} label="Hrs" />
        <span className="text-white/20 text-lg font-bold self-start mt-3 animate-pulse">:</span>
        <FlipDigit value={pad(timeLeft.minutes)} label="Min" />
        <span className="text-white/20 text-lg font-bold self-start mt-3 animate-pulse">:</span>
        <FlipDigit value={pad(timeLeft.seconds)} label="Sec" />
      </div>
    </div>
  );
}
