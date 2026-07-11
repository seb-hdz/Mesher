import { useEffect } from "react";
import { Easing, useAnimatedStyle } from "react-native-reanimated";
import { useSharedValue, withRepeat } from "react-native-reanimated";
import { withTiming } from "react-native-reanimated";

const useAlert = () => {
  const rotation = useSharedValue(0);
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  return { iconAnimatedStyle };
};

export default useAlert;
