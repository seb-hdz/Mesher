import { useCallback, useMemo, useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Camera, QrCode, ScanLine, X } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import type { RootStackParamList } from "../navigation/types";
import { useMeshStore } from "../state/meshStore";
import { useIconColors } from "../ui/iconColors";
import { ScreenContainer } from "../ui/ScreenContainer";

type Props = NativeStackScreenProps<RootStackParamList, "Pair">;

export function PairScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const displayName = useMeshStore((s) => s.displayName);
  const pairFromScan = useMeshStore((s) => s.pairFromScan);
  const ready = useMeshStore((s) => s.ready);
  const getPairingPayload = useMeshStore((s) => s.getPairingPayload);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [handled, setHandled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const icon = useIconColors();

  const qrValue = useMemo(() => {
    if (!ready) return "";
    try {
      return JSON.stringify(getPairingPayload(displayName));
    } catch {
      return "";
    }
  }, [ready, displayName, getPairingPayload]);

  const stopScanning = useCallback(() => {
    console.log("[mesher:pair] scan stopped");
    setHandled(false);
    setScanning(false);
    setCameraError(null);
  }, []);

  const onBarcode = useCallback(
    async ({ data }: { data: string }) => {
      if (handled) return;
      setHandled(true);
      console.log(`[mesher:pair] QR scanned dataLen=${data.length}`);
      try {
        await pairFromScan(data);
        console.log("[mesher:pair] pairFromScan UI success");
        stopScanning();
        navigation.goBack();
      } catch {
        console.warn("[mesher:pair] pairFromScan UI failed, scan re-enabled");
        setHandled(false);
      }
    },
    [handled, navigation, pairFromScan, stopScanning]
  );

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerClassName="items-center pb-6"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h3" className="mb-2 self-stretch text-center">
          Pair with QR
        </Text>
        <Text variant="muted" className="mb-6 self-stretch text-center">
          Show your code so a friend can add you, or scan theirs.
        </Text>

        <Card className="mb-4 w-full max-w-sm gap-0 py-6">
          <CardHeader>
            <View className="flex-row items-center justify-center gap-2">
              <QrCode color={icon.foreground} size={18} />
              <CardTitle className="text-center text-base">Your code</CardTitle>
            </View>
            <CardDescription className="text-center text-xs">
              Share this QR
            </CardDescription>
          </CardHeader>
          <CardContent className="items-center">
            <View className="bg-card rounded-lg p-4">
              {qrValue ? (
                <QRCode value={qrValue} size={200} />
              ) : (
                <Text variant="muted">Loading QR…</Text>
              )}
            </View>
            <Text
              variant="muted"
              className="mt-3 font-mono text-[10px] opacity-50"
              numberOfLines={3}
            >
              {qrValue ? `${qrValue.slice(0, 120)}…` : ""}
            </Text>
          </CardContent>
        </Card>

        {!permission?.granted ? (
          <Button
            className="w-full max-w-sm"
            onPress={() => {
              console.log("[mesher:pair] request camera permission");
              void requestPermission();
            }}
          >
            <Camera color={icon.onPrimary} size={18} />
            <Text>Allow camera</Text>
          </Button>
        ) : (
          <View className="w-full max-w-sm gap-3">
            <Button
              variant={scanning ? "secondary" : "default"}
              className="w-full"
              onPress={() => {
                if (scanning) {
                  stopScanning();
                } else {
                  console.log("[mesher:pair] scan UI opened");
                  setCameraError(null);
                  setHandled(false);
                  setScanning(true);
                }
              }}
            >
              {scanning ? (
                <X color={icon.onSecondary} size={18} />
              ) : (
                <ScanLine color={icon.onPrimary} size={18} />
              )}
              <Text>{scanning ? "Cancel" : "Scan peer QR"}</Text>
            </Button>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={scanning && !!permission?.granted}
        animationType="slide"
        onRequestClose={stopScanning}
      >
        <View style={styles.scannerRoot} collapsable={false}>
          <CameraView
            style={styles.camera}
            facing="back"
            {...(Platform.OS === "android" ? { ratio: "16:9" as const } : {})}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={onBarcode}
            onMountError={({ message }) => setCameraError(message)}
          />
          <View
            style={[
              styles.scannerChrome,
              {
                paddingTop: Math.max(insets.top, 12) + 8,
                paddingBottom: insets.bottom + 12,
              },
            ]}
            pointerEvents="box-none"
          >
            <Button
              variant="secondary"
              className="self-start"
              onPress={stopScanning}
            >
              <X color={icon.onSecondary} size={18} />
              <Text>Cancel</Text>
            </Button>
            {cameraError ? (
              <Text className="text-destructive mt-3 max-w-full text-sm">
                {cameraError}
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scannerRoot: {
    flex: 1,
    backgroundColor: "#000",
  },
  /** Native views need explicit flex + fill; absoluteFill inside ScrollView/NativeWind boxes often previews black/white. */
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scannerChrome: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 16,
    zIndex: 2,
  },
});
