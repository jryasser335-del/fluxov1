import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

export function useSleepTimer() {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeoutRef = useRef<(() => void) | null>(null);

  const startTimer = useCallback((minutes: number, onTimeout: () => void) => {
    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const endTime = Date.now() + minutes * 60 * 1000;
    onTimeoutRef.current = onTimeout;
    setIsActive(true);
    setRemainingTime(minutes * 60);

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRemainingTime(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsActive(false);
        setRemainingTime(null);
        toast.info("⏰ Temporizador de sueño", {
          description: "El reproductor se ha detenido automáticamente"
        });
        onTimeoutRef.current?.();
      } else if (remaining === 60) {
        toast.warning("⏰ 1 minuto restante", {
          description: "El reproductor se detendrá pronto"
        });
      }
    }, 1000);
  }, []);

  const cancelTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    setRemainingTime(null);
    toast.success("Temporizador cancelado");
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    remainingTime,
    isActive,
    startTimer,
    cancelTimer,
    formatTime
  };
}
