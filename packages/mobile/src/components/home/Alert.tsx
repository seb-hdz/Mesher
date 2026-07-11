import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { FrostedBlurSurface } from "@/src/ui/FrostedBlurSurface";
import { Text } from "@/components/ui/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInRight, FadeOutRight } from "react-native-reanimated";
import { useIconColors } from "@/src/ui/iconColors";
import { useL } from "@/languages/language.store";
import { cn } from "@/lib/utils";
import useAlert from "./Alert.hooks";
import AlertModal from "./AlertModal";
import { getIconColor, getTextColorClass } from "./Alert.helpers";
import { AlertProps } from "@/src/ui/Alert/Alert.types";

const Alert = (props: AlertProps) => {
  const { top } = useSafeAreaInsets();
  const iconColor = useIconColors();
  const l = useL();
  const { iconAnimatedStyle } = useAlert();
  const [showModal, setShowModal] = useState(false);

  const handlePress = () => {
    if (!props.details) return;
    setShowModal(true);
  };

  const renderIcon = () => {
    if (!props.icon) return null;
    const Icon = props.icon;

    switch (props.type) {
      case "loading":
        return (
          <Animated.View style={iconAnimatedStyle}>
            <Icon color={getIconColor(props.type, iconColor)} size={30} />
          </Animated.View>
        );
      default:
        return <Icon color={getIconColor(props.type, iconColor)} size={30} />;
    }
  };

  const renderContent = () => {
    if (typeof props.content === "string") {
      return (
        <Text
          className={cn(
            "font-semibold max-w-28 leading-none text-center",
            getTextColorClass(props.type)
          )}
        >
          {props.content}
        </Text>
      );
    }
    return props.content;
  };

  return (
    <>
      {!showModal ? (
        <Pressable
          className="absolute top-0 right-0 flex-1 flex flex-col items-end justify-center"
          onPress={handlePress}
        >
          <Animated.View
            style={{ marginTop: top, elevation: 50, zIndex: 50 }}
            entering={FadeInRight}
            exiting={FadeOutRight}
          >
            <FrostedBlurSurface className="border border-t-foreground/5 border-l-foreground/10 border-b-foreground/15 border-r-none runded-t-3xl rounded-l-3xl rounded-b-3xl rounded-r-none">
              <View className="items-center my-2 ml-2">
                {renderIcon()}
                <View className="h-1" />
                {renderContent()}
              </View>
            </FrostedBlurSurface>
          </Animated.View>
        </Pressable>
      ) : null}
      {props.details && showModal ? (
        <AlertModal {...props} dismiss={() => setShowModal(false)} />
      ) : null}
    </>
  );
};

export default Alert;
