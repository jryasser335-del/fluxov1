import { useEffect, useRef } from "react";
import Hls from "hls.js";

export function HlsVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    let hls: Hls | null = null;

    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = src;
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal && hls) {
          if (data.type === "networkError") hls.startLoad();
          else if (data.type === "mediaError") hls.recoverMediaError();
        }
      });
    } else {
      v.src = src;
    }
    v.play().catch(() => {});

    return () => { hls?.destroy(); };
  }, [src]);

  return (
    <video
      ref={ref}
      className={className}
      controls
      autoPlay
      playsInline
      muted={false}
    />
  );
}
