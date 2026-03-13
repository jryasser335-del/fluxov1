import { create } from "zustand";

type ContentType = "live" | "upcoming" | "movie" | "series" | "dorama";

export interface StreamUrls {
  url1: string;
  url2?: string;
  url3?: string;
}

export interface StatusMessage {
  icon: "finished" | "upcoming";
  title: string;
  description: string;
}

interface PlayerModalState {
  isOpen: boolean;
  title: string;
  urls: StreamUrls;
  contentType: ContentType;
  statusMessage: StatusMessage | null;
  openPlayer: (title: string, urls: StreamUrls, contentType?: ContentType) => void;
  openWithMessage: (title: string, message: StatusMessage) => void;
  closePlayer: () => void;
}

export const usePlayerModal = create<PlayerModalState>((set) => ({
  isOpen: false,
  title: "",
  urls: { url1: "" },
  contentType: "live",
  statusMessage: null,
  openPlayer: (title, urls, contentType = "live") => set({ isOpen: true, title, urls, contentType, statusMessage: null }),
  openWithMessage: (title, statusMessage) => set({ isOpen: true, title, urls: { url1: "" }, contentType: "live", statusMessage }),
  closePlayer: () => set({ isOpen: false, title: "", urls: { url1: "" }, contentType: "live", statusMessage: null }),
}));
