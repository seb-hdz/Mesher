import React from "react";
import { Text, View } from "react-native";
import { UserConfig } from "./UserConfig";
import { NetworkConfig } from "./NetworkConfig";
import { Settings } from "lucide-react-native";
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
      <Logo withAuthor />
    </View>
  );
};

export default ConfigPanel;
