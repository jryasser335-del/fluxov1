import { useState } from "react";
import { Plus, X, Maximize2, Minimize2, Grid2X2, LayoutGrid, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayerModal, StreamUrls } from "@/hooks/usePlayerModal";

interface StreamSlot {
  id: number;
  title: string;
  url: string;
  isActive: boolean;
}

export function MultiStreamView() {
  const [layout, setLayout] = useState<2 | 4>(4);
  const [slots, setSlots] = useState<StreamSlot[]>([
    { id: 1, title: "", url: "", isActive: false },
    { id: 2, title: "", url: "", isActive: false },
    { id: 3, title: "", url: "", isActive: false },
    { id: 4, title: "", url: "", isActive: false },
  ]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState<number | null>(null);
  const [inputUrl, setInputUrl] = useState("");
  const [inputTitle, setInputTitle] = useState("");

  const activeSlots = slots.filter(s => s.isActive);
  const displaySlots = layout === 2 ? slots.slice(0, 2) : slots;

  const handleAddStream = (slotId: number) => {
    if (!inputUrl.trim()) return;
    
    setSlots(prev => prev.map(slot => 
      slot.id === slotId 
        ? { ...slot, url: inputUrl.trim(), title: inputTitle.trim() || `Stream ${slotId}`, isActive: true }
        : slot
    ));
    setShowUrlInput(null);
    setInputUrl("");
    setInputTitle("");
  };

  const handleRemoveStream = (slotId: number) => {
    setSlots(prev => prev.map(slot => 
      slot.id === slotId 
        ? { ...slot, url: "", title: "", isActive: false }
        : slot
    ));
  };

  const isEmbedUrl = (url: string) => {
    const embedPatterns = [
      /\/embed\//i,
      /\/player\//i,
      /\/e\//i,
      /#player=/i,
      /youtube\.com\/embed/i,
      /player\.twitch\.tv/i,
      /facebook\.com\/.*\/videos/i,
      /dailymotion\.com\/embed/i,
    ];
    return embedPatterns.some(pattern => pattern.test(url));
  };

  const formatStreamUrl = (url: string) => {
    if (!url) return "";
    
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Force autoplay params
    const separator = url.includes('?') ? '&' : '?';
    const autoplayParams = 'autoplay=1&auto_play=true&muted=0';
    
    return `${url}${separator}${autoplayParams}`;
  };

  return (
    <div className={cn(
      "min-h-screen bg-black p-4 md:p-6",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 flex items-center justify-center">
            <Tv className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-white">Multi Stream</h1>
            <p className="text-xs text-white/50">Ve múltiples eventos a la vez</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => setLayout(2)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                layout === 2 
                  ? "bg-primary text-white" 
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <Grid2X2 className="w-4 h-4" />
              2
            </button>
            <button
              onClick={() => setLayout(4)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                layout === 4 
                  ? "bg-primary text-white" 
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              4
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className={cn(
        "grid gap-3",
        layout === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2",
        isFullscreen && "h-[calc(100vh-100px)]"
      )}>
        {displaySlots.map((slot, index) => (
          <div
            key={slot.id}
            className={cn(
              "relative rounded-2xl overflow-hidden border transition-all duration-300",
              slot.isActive 
                ? "border-white/20 bg-black" 
                : "border-white/10 border-dashed bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20",
              layout === 2 ? "aspect-video" : "aspect-video"
            )}
          >
            {slot.isActive ? (
              <>
                {/* Stream iframe */}
                <iframe
                  src={formatStreamUrl(slot.url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />

                {/* Stream title overlay */}
                <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-bold text-white truncate max-w-[200px]">
                        {slot.title}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => handleRemoveStream(slot.id)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/60 hover:bg-red-500/80 border border-white/20 flex items-center justify-center text-white transition-all z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                {showUrlInput === slot.id ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 gap-4">
                    <input
                      type="text"
                      value={inputTitle}
                      onChange={(e) => setInputTitle(e.target.value)}
                      placeholder="Nombre del stream (opcional)"
                      className="w-full max-w-md px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-primary text-sm"
                    />
                    <input
                      type="text"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="URL del stream (embed o m3u8)"
                      className="w-full max-w-md px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-primary text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddStream(slot.id);
                        if (e.key === 'Escape') {
                          setShowUrlInput(null);
                          setInputUrl("");
                          setInputTitle("");
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddStream(slot.id)}
                        disabled={!inputUrl.trim()}
                        className="px-6 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/80 transition-all"
                      >
                        Añadir
                      </button>
                      <button
                        onClick={() => {
                          setShowUrlInput(null);
                          setInputUrl("");
                          setInputTitle("");
                        }}
                        className="px-6 py-2 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowUrlInput(slot.id)}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                      <Plus className="w-8 h-8 text-white/40 group-hover:text-white/60 transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-white/40 group-hover:text-white/60 transition-colors">
                      Añadir Stream
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Active streams counter */}
      <div className="mt-4 flex items-center justify-center">
        <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/50">
          {activeSlots.length} de {layout} streams activos
        </div>
      </div>
    </div>
  );
}
