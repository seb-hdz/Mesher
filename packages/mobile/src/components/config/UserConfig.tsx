import { View } from "react-native";
import { User } from "lucide-react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useL } from "../../../languages/language.store";
import { useMeshStore } from "../../state/meshStore";
import { useIconColors } from "../../ui/iconColors";

export function UserConfig() {
  const l = useL();
  const displayName = useMeshStore((s) => s.displayName);
  const setDisplayName = useMeshStore((s) => s.setDisplayName);
  const icon = useIconColors();

  return (
    <Card className="gap-3 -mt-2">
      <CardHeader>
        <Text className="font-semibold">{l("USER_CONFIG.TITLE")}</Text>
      </CardHeader>
      <CardContent className="gap-3 -mt-2">
        <View className="dark:bg-input/30 border-input bg-background flex h-10 w-full flex-row items-center rounded-md border px-2 shadow-sm shadow-black/5">
          <User color={icon.muted} size={18} />
          <Input
            className="min-w-0 flex-1 border-0 bg-transparent px-2 py-1 shadow-none"
            placeholder={l("USER_CONFIG.NAME_PLACEHOLDER")}
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>
        <Text variant="muted" className="text-xs opacity-50 -mt-2">
          {l("USER_CONFIG.NAME_HINT")}
        </Text>
      </CardContent>
    </Card>

    // <Card className="mb-4">
    //   <CardHeader>
    //     <View className="flex-row items-center gap-2">
    //       {/* <User color={icon.foreground} size={20} /> */}
    //       <CardTitle>{l("USER_CONFIG.TITLE")}</CardTitle>
    //     </View>
    //   </CardHeader>
    //   <CardContent className="gap-3 -mt-2">
    //     <View className="dark:bg-input/30 border-input bg-background flex h-10 w-full flex-row items-center rounded-md border px-2 shadow-sm shadow-black/5">
    //       <User color={icon.muted} size={18} />
    //       <Input
    //         className="min-w-0 flex-1 border-0 bg-transparent px-2 py-1 shadow-none"
    //         placeholder={l("USER_CONFIG.NAME_PLACEHOLDER")}
    //         value={displayName}
    //         onChangeText={setDisplayName}
    //       />
    //     </View>
    //     <Text variant="muted" className="text-xs opacity-50 -mt-2">
    //       {l("USER_CONFIG.NAME_HINT")}
    //     </Text>
    //   </CardContent>
    // </Card>
  );
}
