import { Pressable, StyleSheet, View } from "react-native";
import type { HomeScreenProps } from "../navigation/types";
import { QrCode, Send, TableRowsSplit } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useDebugLogUiStore } from "../logging/debugLogUiStore";
import { useTripleTap } from "../logging/useTripleTap";
import { useMeshStore } from "../state/meshStore";
import { useIconColors } from "../ui/iconColors";
import { ScreenContainer } from "../ui/ScreenContainer";
import { cn } from "@/lib/utils";
import { useFloatingTabBarBottomInset } from "../navigation/floatingTabBarInset";
import { MeshNetworkCanvas } from "../components/home/MeshNetworkCanvas";
import { useL } from "../../languages/language.store";

export function HomeScreen({ navigation }: HomeScreenProps) {
  const l = useL();
  const ready = useMeshStore((s) => s.ready);
  const neighborCount = useMeshStore((s) => s.neighborCount);
  const error = useMeshStore((s) => s.error);
  const toggleLogOverlay = useDebugLogUiStore((s) => s.toggleOverlay);
  const onSecretLogTrigger = useTripleTap(toggleLogOverlay);
  const icon = useIconColors();
  const bottomPad = useFloatingTabBarBottomInset();

  const neighboursTextClassName =
    neighborCount > 0 ? "text-green-600" : "text-red-600";

  return (
    <ScreenContainer className="flex-1 bg-background px-0">
      <View className="flex-1">
        <MeshNetworkCanvas
          neighborCount={neighborCount}
          accessibilityLabel={l("HOME.MESH_A11Y")}
          style={StyleSheet.absoluteFillObject}
        />

        <View className="flex-1 justify-between px-4 pt-4" pointerEvents="box-none">
          <View pointerEvents="box-none">
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-center gap-2">
                <TableRowsSplit color={icon.foreground} size={20} />
                <Text variant="h3" className="mb-1">
                  {l("HOME.TITLE")}
                </Text>
              </View>
              <View className="items-center">
                <Text className={cn("text-3xl font-bold", neighboursTextClassName)}>
                  {neighborCount}
                </Text>
                <Text
                  variant="muted"
                  className={cn("text-xs font-bold", neighboursTextClassName)}
                >
                  {l("HOME.NEARBY_CAPTION")}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onSecretLogTrigger}
              accessibilityRole="text"
              className="mb-3 -mt-5 pt-0.5"
            >
              <Text variant="muted">{l("HOME.TAGLINE")}</Text>
            </Pressable>

            {!ready ? (
              <Text variant="muted" className="mb-2">
                {l("HOME.INITIALIZING")}
              </Text>
            ) : null}
            {error ? (
              <Text className="text-destructive mb-2 text-sm">{error}</Text>
            ) : null}
          </View>

          <View className="flex-row flex-wrap gap-2" style={{ paddingBottom: bottomPad }}>
            <Button
              variant="outline"
              className="min-w-[140px] flex-1"
              onPress={() => navigation.navigate("Pair")}
            >
              <QrCode color={icon.foreground} size={18} />
              <Text>{l("HOME.PAIR_QR")}</Text>
            </Button>
            <Button
              className="min-w-[140px] flex-1"
              onPress={() => navigation.navigate("Compose")}
            >
              <Send color={icon.onPrimary} size={18} />
              <Text>{l("HOME.SEND")}</Text>
            </Button>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}
