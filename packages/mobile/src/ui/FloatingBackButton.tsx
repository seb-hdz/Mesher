import { useNavigation } from "@react-navigation/native";
import { ChevronLeft } from "lucide-react-native";
import { useColorScheme, View, type ViewProps } from "react-native";
import Animated, { useSharedValue, withSpring } from "react-native-reanimated";

import { Button } from "@/components/ui/button";
import { useL } from "../../languages/language.store";
import { FrostedBlurSurface } from "./FrostedBlurSurface";
import { useIconColors } from "./iconColors";
import { cn } from "@/lib/utils";

type Props = {
  onPress?: () => void;
  className?: string;
  style?: ViewProps["style"];
  invert?: boolean;
};

const BUTTON_SIZE = 48;
const AnimatedButton = Animated.createAnimatedComponent(Button);

const INVERTED_LIGHT_BORDER_CLASS =
  "border-t-border/25 border-l-border/30 border-b-border/40 border-r-border/30";

function useBackButtonChrome(invert?: boolean) {
  const scheme = useColorScheme();
  const icon = useIconColors();
  const invertedLightChrome = scheme === "light" && Boolean(invert);

  if (invertedLightChrome) {
    // Light + invert (e.g. camera): soft directional border, white chevron.
    return {
      iconColor: icon.onPrimary,
      borderClass: INVERTED_LIGHT_BORDER_CLASS,
    };
  }

  // Default: theme border from outline variant; foreground icon (~white in dark).
  return {
    iconColor: icon.foreground,
    borderClass: undefined,
  };
}

export function BackButton({ onPress, className, style, invert }: Props) {
  const l = useL();
  const navigation = useNavigation();
  const { iconColor, borderClass } = useBackButtonChrome(invert);

  const size = useSharedValue(BUTTON_SIZE);

  const animatePressIn = () => {
    size.value = withSpring(BUTTON_SIZE * 1.1);
  };

  const animatePressOut = () => {
    size.value = withSpring(BUTTON_SIZE);
  };

  return (
    <View className="relative h-0 w-0" pointerEvents="box-none">
      <AnimatedButton
        variant="outline"
        size="icon"
        accessibilityLabel={l("COMMON.BACK")}
        onPress={onPress ?? (() => navigation.goBack())}
        onPressIn={animatePressIn}
        onPressOut={animatePressOut}
        android_ripple={{ color: "transparent" }}
        style={[style, { width: size, height: size }]}
        className={cn(
          "absolute overflow-hidden rounded-full border bg-transparent p-0 shadow-lg shadow-background/25 active:bg-transparent dark:active:bg-transparent",
          borderClass,
          className
        )}
      >
        <FrostedBlurSurface className="absolute inset-0 items-center justify-center rounded-full border-0">
          <ChevronLeft color={iconColor} size={24} strokeWidth={2} />
        </FrostedBlurSurface>
      </AnimatedButton>
    </View>
  );
}
