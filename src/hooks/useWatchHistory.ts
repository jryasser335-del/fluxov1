import { useEffect, useState, useCallback } from "react";

interface WatchHistoryItem {
  id: string;
  title: string;
  url: string;
  timestamp: number;
  duration?: number;
  thumbnail?: string;
}

const HISTORY_KEY = "fluxoWatchHistory";
const MAX_HISTORY = 50;

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addToHistory = useCallback((item: Omit<WatchHistoryItem, "timestamp">) => {
    setHistory((prev) => {
      // Remove existing entry if present
      const filtered = prev.filter((h) => h.id !== item.id);
      
      // Add new entry at the beginning
      const updated = [
        { ...item, timestamp: Date.now() },
        ...filtered
      ].slice(0, MAX_HISTORY);

      // Save to localStorage
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Storage full or unavailable
      }

      return updated;
    });
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Storage full or unavailable
      }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // Storage unavailable
    }
  }, []);

  const getRecentlyWatched = useCallback((limit = 10) => {
    return history.slice(0, limit);
  }, [history]);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getRecentlyWatched
  };
}

// Time formatting
export function formatWatchTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Justo ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days} días`;
  
  return new Date(timestamp).toLocaleDateString();
}
