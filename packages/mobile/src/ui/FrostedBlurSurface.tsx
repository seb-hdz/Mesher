import { BlurView } from "expo-blur";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";

import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
};

const BLUR_INTENSITY = { ios: 12, android: 10 } as const;

export function FrostedBlurSurface({ children, className }: Props) {
  const scheme = useColorScheme();
  const blurTint =
    scheme === "dark"
      ? "systemChromeMaterialDark"
      : "systemChromeMaterialLight";

  return (
    <View className={cn("overflow-hidden bg-transparent", className)}>
      <BlurView
        intensity={
          Platform.OS === "ios" ? BLUR_INTENSITY.ios : BLUR_INTENSITY.android
        }
        tint={blurTint}
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={
          Platform.OS === "android" ? "dimezisBlurView" : undefined
        }
      />
      <View className="absolute inset-0 bg-background/25" />
      {children}
    </View>
  );
}
