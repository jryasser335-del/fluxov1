import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

const FAVORITES_KEY = "fluxoFavorites";

export interface FavoriteItem {
  id: string;
  title: string;
  type: "channel" | "movie" | "series" | "dorama" | "event";
  thumbnail?: string;
  addedAt: number;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveFavorites = useCallback((items: FavoriteItem[]) => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
    } catch {
      // Storage full
    }
  }, []);

  const addFavorite = useCallback((item: Omit<FavoriteItem, "addedAt">) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.id === item.id)) return prev;
      const updated = [{ ...item, addedAt: Date.now() }, ...prev];
      saveFavorites(updated);
      toast.success("❤️ Añadido a favoritos");
      return updated;
    });
  }, [saveFavorites]);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      saveFavorites(updated);
      toast.info("Eliminado de favoritos");
      return updated;
    });
  }, [saveFavorites]);

  const toggleFavorite = useCallback((item: Omit<FavoriteItem, "addedAt">) => {
    const exists = favorites.some((f) => f.id === item.id);
    if (exists) {
      removeFavorite(item.id);
    } else {
      addFavorite(item);
    }
  }, [favorites, addFavorite, removeFavorite]);

  const isFavorite = useCallback((id: string) => {
    return favorites.some((f) => f.id === id);
  }, [favorites]);

  const getFavoritesByType = useCallback((type: FavoriteItem["type"]) => {
    return favorites.filter((f) => f.type === type);
  }, [favorites]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    getFavoritesByType
  };
}
