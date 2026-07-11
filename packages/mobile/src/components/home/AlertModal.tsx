import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useL } from "@/languages/language.store";
import { FrostedBlurSurface } from "@/src/ui/FrostedBlurSurface";
import React from "react";
import { Modal, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { FadeIn, FadeInDown } from "react-native-reanimated";
import { FadeOut, FadeOutDown } from "react-native-reanimated";
import { cn } from "@/lib/utils";
import { getIconColor, getTextColorClass } from "./Alert.helpers";
import { useIconColors } from "@/src/ui/iconColors";
import { AlertModalProps } from "@/src/ui/Alert/Alert.types";

const AlertModal = (props: AlertModalProps) => {
  const l = useL();
  const { bottom } = useSafeAreaInsets();
  const iconColor = useIconColors();

  const renderTitle = () => {
    if (typeof props.content === "string") {
      return (
        <Text
          className={cn(
            "font-semibold text-2xl",
            getTextColorClass(props.type)
          )}
        >
          {props.content}
        </Text>
      );
    }
    return props.content;
  };

  const renderIcon = () => {
    if (!props.icon) return null;
    const Icon = props.icon;
    return <Icon color={getIconColor(props.type, iconColor)} size={56} />;
  };

  return (
    <Modal visible transparent>
      <View className="flex-1 items-center justify-end">
        <Animated.View
          className="bg-black/40 absolute top-0 left-0 right-0 bottom-0"
          entering={FadeIn}
          exiting={FadeOut}
        />
        <Animated.View
          entering={FadeInDown}
          exiting={FadeOutDown}
          className="w-full"
        >
          <FrostedBlurSurface className="bg-background/50 px-5 items-center justify-center rounded-t-3xl border-t border-t-foreground/10">
            <View className="flex-row items-center justify-center bg-foreground/5 p-2 border border-foreground/10 rounded-full w-28 h-28 mb-8 mt-6">
              {renderIcon()}
            </View>
            <View className="border border-foreground/15 bg-background/80 px-7 py-6 rounded-3xl gap-2 w-full">
              <View>{renderTitle()}</View>
              <Text className="text-foreground">{props.details}</Text>
              <Button onPress={props.dismiss} className="mt-4">
                <Text className="font-semibold text-base">
                  {l("COMMON.GOT_IT")}
                </Text>
              </Button>
            </View>
            <View style={{ paddingBottom: bottom }} />
          </FrostedBlurSurface>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default AlertModal;
