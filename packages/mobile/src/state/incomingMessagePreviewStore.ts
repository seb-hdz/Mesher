import { create } from "zustand";

export type IncomingBannerPayload = {
  id: number;
  title: string;
  body: string;
};

type IncomingMessagePreviewState = {
  banner: IncomingBannerPayload | null;
  show: (title: string, body: string) => void;
  dismiss: () => void;
};

let idSeq = 0;

export const useIncomingMessagePreviewStore = create<IncomingMessagePreviewState>((set) => ({
  banner: null,
  show: (title, body) => set({ banner: { id: ++idSeq, title, body } }),
  dismiss: () => set({ banner: null }),
}));
