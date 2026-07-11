import React from "react";
import { View } from "react-native";
import { Settings } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { UserConfig } from "./UserConfig";
import { NetworkConfig } from "./NetworkConfig";
import { AppResetConfig } from "./AppResetConfig";
import { useIconColors } from "@/src/ui/iconColors";
import Logo from "../Logo";

const ConfigPanel = () => {
  const icon = useIconColors();
  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-2 justify-center my-5">
        <Settings color={icon.foreground} size={20} />
        <Text className="text-2xl font-bold">Configuración</Text>
      </View>
      <UserConfig />
      <NetworkConfig />
      <AppResetConfig />
      <Logo withAuthor />
    </View>
  );
};

export default ConfigPanel;
