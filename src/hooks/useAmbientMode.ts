import { useState, useCallback, useRef, useEffect } from "react";

interface AmbientColors {
  dominant: string;
  secondary: string;
  accent: string;
}

export function useAmbientMode(videoRef: React.RefObject<HTMLVideoElement>) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [colors, setColors] = useState<AmbientColors | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const extractColors = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended || !isEnabled) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = 16;
      canvasRef.current.height = 9;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    try {
      ctx.drawImage(video, 0, 0, 16, 9);
      const imageData = ctx.getImageData(0, 0, 16, 9).data;
      
      // Simple color extraction - get average colors from different regions
      const topColors = getRegionColor(imageData, 0, 0, 16, 3, 16);
      const midColors = getRegionColor(imageData, 0, 3, 16, 3, 16);
      const botColors = getRegionColor(imageData, 0, 6, 16, 3, 16);

      setColors({
        dominant: `rgb(${topColors.r}, ${topColors.g}, ${topColors.b})`,
        secondary: `rgb(${midColors.r}, ${midColors.g}, ${midColors.b})`,
        accent: `rgb(${botColors.r}, ${botColors.g}, ${botColors.b})`,
      });
    } catch {
      // CORS or other errors
    }

    animationRef.current = requestAnimationFrame(extractColors);
  }, [videoRef, isEnabled]);

  const getRegionColor = (data: Uint8ClampedArray, x: number, y: number, w: number, h: number, stride: number) => {
    let r = 0, g = 0, b = 0, count = 0;
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        const idx = (py * stride + px) * 4;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        count++;
      }
    }
    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count),
    };
  };

  const toggle = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  useEffect(() => {
    if (isEnabled) {
      animationRef.current = requestAnimationFrame(extractColors);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setColors(null);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isEnabled, extractColors]);

  return {
    isEnabled,
    colors,
    toggle
  };
}
