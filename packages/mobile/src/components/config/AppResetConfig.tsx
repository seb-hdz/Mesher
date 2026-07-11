import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  View,
} from "react-native";
import { Trash2 } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useL } from "../../../languages/language.store";
import { useMeshStore } from "../../state/meshStore";
import { useIconColors } from "../../ui/iconColors";

export function AppResetConfig() {
  const l = useL();
  const icon = useIconColors();
  const resetApp = useMeshStore((s) => s.resetApp);
  const ready = useMeshStore((s) => s.ready);
  const [resetting, setResetting] = useState(false);

  const performReset = async () => {
    setResetting(true);
    try {
      await resetApp();
    } catch (e) {
      setResetting(false);
      console.error("[mesher:ui] resetApp failed", e);
      Alert.alert(l("APP_RESET.ERROR_TITLE"), l("APP_RESET.ERROR_MESSAGE"));
    }
  };

  const onPressReset = () => {
    Alert.alert(l("APP_RESET.CONFIRM_TITLE"), l("APP_RESET.CONFIRM_MESSAGE"), [
      { text: l("COMMON.CANCEL"), style: "cancel" },
      {
        text: l("APP_RESET.CONFIRM_BUTTON"),
        style: "destructive",
        onPress: () => void performReset(),
      },
    ]);
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <Text className="font-semibold">{l("APP_RESET.TITLE")}</Text>
          <Text variant="muted" className="text-xs opacity-50 -mt-1 pb-1">
            {l("APP_RESET.DESCRIPTION")}
          </Text>
        </CardHeader>
        <CardContent className="-mt-2">
          <Button
            variant="destructive"
            className="self-start w-full"
            disabled={!ready || resetting}
            onPress={onPressReset}
          >
            <Trash2 color="white" size={18} />
            <Text>
              {resetting ? l("APP_RESET.RESETTING") : l("APP_RESET.BUTTON")}
            </Text>
          </Button>
        </CardContent>
      </Card>

      <Modal visible={resetting} transparent animationType="fade">
        <View style={styles.overlay}>
          <View
            style={styles.sheet}
            className="bg-card/70 border-border/15 border"
          >
            <ActivityIndicator size="large" />
            <Text className="mt-4 text-center font-medium">
              {l("APP_RESET.RESETTING")}
            </Text>
            <Text variant="muted" className="mt-2 text-center text-sm">
              {l("APP_RESET.RESETTING_HINT")}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
});
