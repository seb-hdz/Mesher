import { useIsFocused } from "@react-navigation/native";
import { useEffect, type ComponentType, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const DURATION_MS = 240;
const OFF_Y = 10;

type TabScreenEntranceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Runs a short fade + slide-in when the tab gains focus. Resets instantly on
 * blur so the entrance can replay. Keeps screens free of transition logic.
 */
export function TabScreenEntrance({ children, style }: TabScreenEntranceProps) {
  const focused = useIsFocused();
  const opacity = useSharedValue(focused ? 1 : 0);
  const translateY = useSharedValue(focused ? 0 : OFF_Y);

  useEffect(() => {
    if (focused) {
      opacity.value = withTiming(1, { duration: DURATION_MS });
      translateY.value = withTiming(0, { duration: DURATION_MS });
    } else {
      opacity.value = 0;
      translateY.value = OFF_Y;
    }
  }, [focused, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View className="flex-1 bg-background" style={style}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>{children}</Animated.View>
    </View>
  );
}

export function withTabEntrance<P extends object>(
  Screen: ComponentType<P>
): ComponentType<P> {
  function WrappedTabScreen(props: P) {
    return (
      <TabScreenEntrance>
        <Screen {...props} />
      </TabScreenEntrance>
    );
  }

  const name = Screen.displayName ?? Screen.name ?? "Screen";
  WrappedTabScreen.displayName = `withTabEntrance(${name})`;

  return WrappedTabScreen;
}
