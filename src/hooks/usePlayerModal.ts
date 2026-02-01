import { create } from "zustand";

type ContentType = "live" | "movie" | "series" | "dorama";

interface PlayerModalState {
  isOpen: boolean;
  title: string;
  url: string;
  contentType: ContentType;
  openPlayer: (title: string, url: string, contentType?: ContentType) => void;
  closePlayer: () => void;
}

export const usePlayerModal = create<PlayerModalState>((set) => ({
  isOpen: false,
  title: "",
  url: "",
  contentType: "live",
  openPlayer: (title, url, contentType = "live") => set({ isOpen: true, title, url, contentType }),
  closePlayer: () => set({ isOpen: false, title: "", url: "", contentType: "live" }),
}));
