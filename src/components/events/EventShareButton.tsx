import { Share2, Calendar, Bell, X, Twitter, Facebook, MessageCircle, Copy, Check, Link2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EventShareButtonProps {
  eventId: string;
  title: string;
  eventDate?: string;
}

export function EventShareButton({ eventId, title, eventDate }: EventShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = `🏀 ${title} - Ver en Fluxo`;
  const shareUrl = `${window.location.origin}?event=${eventId}`;

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    setIsOpen(false);
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    setIsOpen(false);
  };

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
    setIsOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Error al copiar");
    }
  };

  const addToCalendar = () => {
    if (!eventDate) {
      toast.info("Este evento no tiene fecha programada");
      return;
    }
    
    const startDate = new Date(eventDate);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
    
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    
    const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}`;
    
    window.open(calendarUrl, '_blank');
    setIsOpen(false);
  };

  const setReminder = () => {
    const reminders = JSON.parse(localStorage.getItem('fluxoReminders') || '[]');
    reminders.push({ id: eventId, title, date: eventDate, timestamp: Date.now() });
    localStorage.setItem('fluxoReminders', JSON.stringify(reminders));
    toast.success("⏰ Recordatorio configurado");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
      >
        <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          
          {/* Menu */}
          <div 
            className="absolute bottom-full right-0 mb-2 w-48 rounded-xl overflow-hidden border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl z-50 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-1.5 space-y-0.5">
              <button
                onClick={shareToTwitter}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                <Twitter className="w-4 h-4 text-white/60" />
                <span className="text-sm text-white/80">Twitter</span>
              </button>
              <button
                onClick={shareToFacebook}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                <Facebook className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white/80">Facebook</span>
              </button>
              <button
                onClick={shareToWhatsApp}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                <MessageCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white/80">WhatsApp</span>
              </button>
              
              <div className="h-px bg-white/10 my-1" />
              
              <button
                onClick={copyLink}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/60" />
                )}
                <span className="text-sm text-white/80">{copied ? "¡Copiado!" : "Copiar enlace"}</span>
              </button>

              {eventDate && (
                <>
                  <button
                    onClick={addToCalendar}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                  >
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-white/80">Calendario</span>
                  </button>
                  <button
                    onClick={setReminder}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                  >
                    <Bell className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-white/80">Recordatorio</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
