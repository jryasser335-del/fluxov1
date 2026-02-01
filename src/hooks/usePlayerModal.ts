import { create } from "zustand";

interface PlayerModalState {
  isOpen: boolean;
  title: string;
  url: string;
  openPlayer: (title: string, url: string) => void;
  closePlayer: () => void;
}

export const usePlayerModal = create<PlayerModalState>((set) => ({
  isOpen: false,
  title: "",
  url: "",
  openPlayer: (title, url) => set({ isOpen: true, title, url }),
  closePlayer: () => set({ isOpen: false, title: "", url: "" }),
}));
