import { useCallback } from "react";
import { create } from "zustand";
import type { DeepPaths } from "./types";
import { es } from "./es";
import { en } from "./en";

/** Paths present as string leaves in both locales (keep `es` / `en` trees in sync). */
export type LanguagePath = DeepPaths<typeof es> & DeepPaths<typeof en>;

function getStringAtPath(root: typeof es | typeof en, path: string): string {
  const parts = path.split(".");
  let cur: unknown = root;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") {
      throw new Error(`Invalid language path: ${path}`);
    }
    cur = (cur as Record<string, unknown>)[p];
  }
  if (typeof cur !== "string") {
    throw new Error(`Language path must end in a string: ${path}`);
  }
  return cur;
}

interface LanguageStore {
  language: "es" | "en";
  setLanguage: (language: "es" | "en") => void;
  l: (path: LanguagePath) => string;
}

export const useLanguageStore = create<LanguageStore>((set, get) => ({
  language: "es",
  setLanguage: (language) => set({ language }),
  l: (path) => {
    const dict = get().language === "en" ? en : es;
    return getStringAtPath(dict, path);
  },
}));

export function useL() {
  const language = useLanguageStore((s) => s.language);
  return useCallback(
    (path: LanguagePath) => getStringAtPath(language === "en" ? en : es, path),
    [language]
  );
}
