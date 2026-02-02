import { Share2, Twitter, Facebook, MessageCircle, Link2, Calendar, Bell, Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ShareMenuProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  eventDate?: string;
}

export function ShareMenu({ title, isOpen, onClose, eventDate }: ShareMenuProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.href;
  const shareText = `🏀 Viendo: ${title} en Fluxo`;

  const shareOptions = [
    {
      icon: Twitter,
      label: "Twitter / X",
      color: "from-black to-gray-800",
      onClick: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
      }
    },
    {
      icon: Facebook,
      label: "Facebook",
      color: "from-blue-600 to-blue-700",
      onClick: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
      }
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      color: "from-green-500 to-green-600",
      onClick: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
      }
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Enlace copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Error al copiar el enlace");
    }
  };

  const addToCalendar = () => {
    if (!eventDate) {
      toast.info("Este evento no tiene fecha programada");
      return;
    }
    
    const startDate = new Date(eventDate);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // +3 hours
    
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    
    const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent('Ver en Fluxo: ' + shareUrl)}`;
    
    window.open(calendarUrl, '_blank');
    toast.success("Abriendo Google Calendar...");
  };

  const setReminder = () => {
    // Store in localStorage for notification simulation
    const reminders = JSON.parse(localStorage.getItem('fluxoReminders') || '[]');
    const newReminder = { title, date: eventDate, id: Date.now() };
    reminders.push(newReminder);
    localStorage.setItem('fluxoReminders', JSON.stringify(reminders));
    toast.success("⏰ Recordatorio configurado", {
      description: "Te notificaremos antes del partido"
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="absolute bottom-full right-0 mb-2 w-64 rounded-2xl overflow-hidden border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl shadow-black/50 z-50 animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <p className="text-xs text-white/50 uppercase tracking-wider font-medium">Compartir</p>
      </div>

      {/* Social buttons */}
      <div className="p-2 space-y-1">
        {shareOptions.map((option) => (
          <button
            key={option.label}
            onClick={() => { option.onClick(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors group"
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br", option.color)}>
              <option.icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-white/80 group-hover:text-white">{option.label}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10 mx-3" />

      {/* Action buttons */}
      <div className="p-2 space-y-1">
        <button
          onClick={copyLink}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/60" />}
          </div>
          <span className="text-sm text-white/80 group-hover:text-white">
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </span>
        </button>

        {eventDate && (
          <>
            <button
              onClick={addToCalendar}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-white/80 group-hover:text-white">Añadir a calendario</span>
            </button>

            <button
              onClick={setReminder}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-yellow-500 to-orange-500">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-white/80 group-hover:text-white">Recordarme</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
