import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Visual height of the pill (must fit icon + label; library no longer adds extra bottom inset). */
export const FLOATING_TAB_BAR_HEIGHT = 66;

/** Horizontal inset from screen edges (pill narrower = more “air” at sides). */
export const FLOATING_TAB_BAR_SIDE = 24;

/**
 * Gap between the physical bottom / home indicator row and the pill’s bottom edge.
 * Small value keeps the bar visually closer to the home indicator.
 */
export const FLOATING_TAB_BAR_ABOVE_HOME = 8;

/** Breathing room above the pill for scroll content. */
const FLOATING_TAB_BAR_CONTENT_GAP = 12;

/**
 * Extra bottom padding for scroll content so it clears the floating tab bar.
 */
export function useFloatingTabBarBottomInset(): number {
  const insets = useSafeAreaInsets();
  return (
    insets.bottom +
    FLOATING_TAB_BAR_ABOVE_HOME +
    FLOATING_TAB_BAR_HEIGHT +
    FLOATING_TAB_BAR_CONTENT_GAP
  );
}
