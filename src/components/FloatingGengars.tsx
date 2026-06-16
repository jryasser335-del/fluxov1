import { useEffect, useState } from "react";

/* Reusable Gengar silhouette */
function GengarSilhouette({ size = 80, hue = 280 }: { size?: number; hue?: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size}>
      <defs>
        <radialGradient id={`gbody-${hue}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={`hsl(${hue} 60% 45%)`} />
          <stop offset="60%" stopColor={`hsl(${hue - 5} 65% 22%)`} />
          <stop offset="100%" stopColor={`hsl(${hue - 10} 75% 9%)`} />
        </radialGradient>
        <radialGradient id={`geye-${hue}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(0 100% 92%)" />
          <stop offset="55%" stopColor="hsl(0 100% 62%)" />
          <stop offset="100%" stopColor="hsl(350 100% 40%)" />
        </radialGradient>
      </defs>
      <path d="M40 60 L55 30 L65 55 M75 50 L90 22 L100 50 M110 50 L125 22 L135 50 M145 55 L160 30 L155 65"
        fill={`url(#gbody-${hue})`} stroke="hsl(270 50% 6%)" strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="100" cy="115" rx="72" ry="68" fill={`url(#gbody-${hue})`} stroke="hsl(270 50% 6%)" strokeWidth="2" />
      <path d="M30 80 L18 55 L48 70 Z" fill={`url(#gbody-${hue})`} stroke="hsl(270 50% 6%)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M170 80 L182 55 L152 70 Z" fill={`url(#gbody-${hue})`} stroke="hsl(270 50% 6%)" strokeWidth="2" strokeLinejoin="round" />
      <g className="animate-eye-glow">
        <ellipse cx="72" cy="100" rx="14" ry="16" fill={`url(#geye-${hue})`} />
        <ellipse cx="128" cy="100" rx="14" ry="16" fill={`url(#geye-${hue})`} />
        <circle cx="72" cy="102" r="4" fill="hsl(270 80% 6%)" />
        <circle cx="128" cy="102" r="4" fill="hsl(270 80% 6%)" />
        <circle cx="74" cy="98" r="1.6" fill="white" />
        <circle cx="130" cy="98" r="1.6" fill="white" />
      </g>
      <g>
        <path d="M55 135 Q100 175 145 135 Q140 158 100 162 Q60 158 55 135 Z"
          fill="hsl(270 80% 5%)" stroke="hsl(270 50% 3%)" strokeWidth="1.5" />
        <path d="M65 138 L72 152 L79 138 M82 140 L89 156 L96 140 M100 141 L107 157 L114 141 M118 140 L125 156 L132 140 M135 138 L142 152 L149 138"
          fill="white" />
      </g>
    </svg>
  );
}

interface FloatingGengar {
  id: number;
  left: number;
  top: number;
  size: number;
  hue: number;
  duration: number;
  delay: number;
  drift: number;
}

export function FloatingGengars({ count = 5 }: { count?: number }) {
  const [items, setItems] = useState<FloatingGengar[]>([]);

  useEffect(() => {
    const arr: FloatingGengar[] = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: 5 + Math.random() * 90,
      top: 8 + Math.random() * 80,
      size: 60 + Math.random() * 70,
      hue: 265 + Math.floor(Math.random() * 60),
      duration: 8 + Math.random() * 8,
      delay: -Math.random() * 10,
      drift: (Math.random() - 0.5) * 60,
    }));
    setItems(arr);
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {items.map((g) => (
        <div
          key={g.id}
          className="absolute"
          style={{
            left: `${g.left}%`,
            top: `${g.top}%`,
            width: g.size,
            height: g.size,
            opacity: 0.18,
            animation: `ghost-float ${g.duration}s ease-in-out ${g.delay}s infinite`,
            ["--dx" as any]: `${g.drift}px`,
          }}
        >
          {/* Aura */}
          <div
            className="absolute inset-[-40%] rounded-full blur-3xl animate-shadow-pulse"
            style={{
              background: `radial-gradient(circle, hsl(${g.hue} 90% 55% / .55), transparent 65%)`,
            }}
          />
          <div className="relative drop-shadow-[0_15px_30px_hsl(275_90%_30%/.6)]">
            <GengarSilhouette size={g.size} hue={g.hue} />
          </div>
        </div>
      ))}
    </div>
  );
}
