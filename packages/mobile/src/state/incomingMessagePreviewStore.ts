import { create } from "zustand";

export type IncomingBannerPayload = {
  id: number;
  title: string;
  body: string;
  peerId: string | null;
};

type IncomingMessagePreviewState = {
  banner: IncomingBannerPayload | null;
  show: (title: string, body: string, peerId: string | null) => void;
  dismiss: () => void;
};

let idSeq = 0;

export const useIncomingMessagePreviewStore = create<IncomingMessagePreviewState>((set) => ({
  banner: null,
  show: (title, body, peerId) =>
    set({ banner: { id: ++idSeq, title, body, peerId } }),
  dismiss: () => set({ banner: null }),
}));
