import { useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useIncomingMessagePreviewStore } from "../state/incomingMessagePreviewStore";
const AUTO_DISMISS_MS = 5500;

export function IncomingMessageBanner() {
  const banner = useIncomingMessagePreviewStore((s) => s.banner);
  const dismiss = useIncomingMessagePreviewStore((s) => s.dismiss);
  const { top } = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    if (!banner) return;

    opacity.setValue(0);
    translateY.setValue(-12);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const t = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [banner, dismiss, opacity, translateY]);

  if (!banner) return null;

  return (
    <View
      className="absolute left-0 right-0 px-3"
      style={{ top: top + 6, zIndex: 100 }}
      pointerEvents="box-none"
    >
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Pressable
          onPress={dismiss}
          accessibilityRole="alert"
          accessibilityLabel={`New message: ${banner.title}. ${banner.body}`}
        >
          <View className="rounded-xl border border-border bg-card px-4 py-3 shadow-md shadow-black/20">
            <Text
              className="text-sm font-semibold text-foreground"
              numberOfLines={1}
            >
              {banner.title}
            </Text>
            <Text
              className="text-muted-foreground mt-1 text-sm leading-snug"
              numberOfLines={4}
            >
              {banner.body}
            </Text>
            <Text variant="muted" className="mt-2 text-xs opacity-50">
              Tap to dismiss
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
