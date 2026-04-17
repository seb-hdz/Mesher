import { create } from "zustand";

type State = {
  overlayVisible: boolean;
  panelExpanded: boolean;
  toggleOverlay: () => void;
  collapsePanel: () => void;
  expandPanel: () => void;
};

export const useDebugLogUiStore = create<State>((set, get) => ({
  overlayVisible: false,
  panelExpanded: true,
  toggleOverlay: () => {
    if (get().overlayVisible) set({ overlayVisible: false });
    else set({ overlayVisible: true, panelExpanded: true });
  },
  collapsePanel: () => set({ panelExpanded: false }),
  expandPanel: () => set({ panelExpanded: true }),
}));
