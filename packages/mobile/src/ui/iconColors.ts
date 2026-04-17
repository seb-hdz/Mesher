import { useColorScheme } from "react-native";

/**
 * HSL strings for lucide-react-native `color`, aligned with
 * packages/mobile/global.css (`:root` / `.dark:root`).
 */
export function useIconColors() {
  const scheme = useColorScheme();
  const dark = scheme === "dark";

  if (dark) {
    return {
      foreground: "hsl(0, 0%, 98%)",
      muted: "hsl(0, 0%, 63.9%)",
      onPrimary: "hsl(0, 0%, 9%)",
      onSecondary: "hsl(0, 0%, 98%)",
    } as const;
  }

  return {
    foreground: "hsl(0, 0%, 3.9%)",
    muted: "hsl(0, 0%, 45.1%)",
    onPrimary: "hsl(0, 0%, 98%)",
    onSecondary: "hsl(0, 0%, 9%)",
  } as const;
}
