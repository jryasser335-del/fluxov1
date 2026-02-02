import { useEffect, useState } from "react";
import { Bell, X, Play, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Reminder {
  id: string;
  title: string;
  date?: string;
  timestamp: number;
}

export function NotificationCenter() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    // Load reminders
    const loadReminders = () => {
      try {
        const saved = localStorage.getItem('fluxoReminders');
        if (saved) {
          setReminders(JSON.parse(saved));
        }
      } catch {
        setReminders([]);
      }
    };

    loadReminders();

    // Check for upcoming events every minute
    const interval = setInterval(() => {
      loadReminders();
      checkUpcoming();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const checkUpcoming = () => {
    const now = Date.now();
    reminders.forEach(reminder => {
      if (reminder.date) {
        const eventTime = new Date(reminder.date).getTime();
        const diff = eventTime - now;
        
        // Notify 30 minutes before
        if (diff > 0 && diff <= 30 * 60 * 1000 && diff > 29 * 60 * 1000) {
          toast.info(`⏰ ${reminder.title}`, {
            description: "El partido comienza en 30 minutos"
          });
          setHasNew(true);
        }
        
        // Notify when starting
        if (diff <= 0 && diff > -60000) {
          toast.success(`🏀 ${reminder.title}`, {
            description: "¡El partido está comenzando!"
          });
          setHasNew(true);
        }
      }
    });
  };

  const removeReminder = (id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    localStorage.setItem('fluxoReminders', JSON.stringify(updated));
  };

  const clearAll = () => {
    setReminders([]);
    localStorage.removeItem('fluxoReminders');
    setIsOpen(false);
  };

  if (reminders.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Notification button */}
      <button
        onClick={() => { setIsOpen(!isOpen); setHasNew(false); }}
        className={cn(
          "relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300",
          "bg-gradient-to-br from-primary to-purple-600 hover:scale-105",
          "border border-white/20"
        )}
      >
        <Bell className="w-6 h-6 text-white" />
        {(hasNew || reminders.length > 0) && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
            {reminders.length}
          </span>
        )}
      </button>

      {/* Notification panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 rounded-2xl overflow-hidden border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-white">Recordatorios</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearAll}
                className="text-xs text-white/50 hover:text-white transition-colors"
              >
                Limpiar
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <X className="w-3 h-3 text-white/60" />
              </button>
            </div>
          </div>

          {/* Reminders list */}
          <div className="p-2 max-h-64 overflow-y-auto space-y-1">
            {reminders.map((reminder) => (
              <div 
                key={reminder.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{reminder.title}</p>
                  {reminder.date && (
                    <p className="text-xs text-white/40">
                      {new Date(reminder.date).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeReminder(reminder.id)}
                  className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                >
                  <X className="w-3 h-3 text-white/60" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
