import React from "react";
import LightIcon from "@/assets/icon-light.svg";
import DarkIcon from "@/assets/icon-dark.svg";
import { Image } from "expo-image";
import { useColorScheme, View } from "react-native";
import { Text } from "@/components/ui/text";

const Logo = (props: { withAuthor?: boolean }) => {
  const { withAuthor } = props;
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const iconSource = isDark ? DarkIcon : LightIcon;

  return (
    <View className="flex-row items-center justify-center gap-2">
      <Image
        accessibilityLabel="Mesher"
        contentFit="contain"
        source={iconSource}
        style={{ height: 40, width: 40 }}
      />
      <View>
        <Text className="font-bold text-lg -tracking-normal text-muted-foreground">
          Mesher
        </Text>
        {withAuthor ? (
          <Text className="tracking-tighter -mt-1 text-muted-foreground opacity-50">
            by{" "}
            <Text className="font-medium text-muted-foreground">@seb-hdz</Text>
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export default Logo;
