import { create } from "zustand";

type ContentType = "live" | "movie" | "series" | "dorama";

export interface StreamUrls {
  url1: string;
  url2?: string;
  url3?: string;
}

interface PlayerModalState {
  isOpen: boolean;
  title: string;
  urls: StreamUrls;
  contentType: ContentType;
  openPlayer: (title: string, urls: StreamUrls, contentType?: ContentType) => void;
  closePlayer: () => void;
}

export const usePlayerModal = create<PlayerModalState>((set) => ({
  isOpen: false,
  title: "",
  urls: { url1: "" },
  contentType: "live",
  openPlayer: (title, urls, contentType = "live") => set({ isOpen: true, title, urls, contentType }),
  closePlayer: () => set({ isOpen: false, title: "", urls: { url1: "" }, contentType: "live" }),
}));
