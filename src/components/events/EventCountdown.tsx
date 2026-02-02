import { useState, useEffect } from "react";

interface EventCountdownProps {
  targetDate: string;
}

export function EventCountdown({ targetDate }: EventCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - Date.now();
      
      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  if (timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5 font-mono text-[10px] sm:text-xs">
        <span className="bg-white/10 px-1.5 py-0.5 rounded text-primary font-bold">
          {formatNumber(timeLeft.hours)}
        </span>
        <span className="text-white/30">:</span>
        <span className="bg-white/10 px-1.5 py-0.5 rounded text-primary font-bold">
          {formatNumber(timeLeft.minutes)}
        </span>
        <span className="text-white/30">:</span>
        <span className="bg-white/10 px-1.5 py-0.5 rounded text-primary font-bold">
          {formatNumber(timeLeft.seconds)}
        </span>
      </div>
    </div>
  );
}
