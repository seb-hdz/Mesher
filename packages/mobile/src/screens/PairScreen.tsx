import { useCallback, useMemo, useRef, useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  cacheDirectory,
  deleteAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Camera, QrCode, ScanLine, X } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useL } from "../../languages/language.store";
import type { RootStackParamList } from "../navigation/types";
import { useMeshStore } from "../state/meshStore";
import { BackButton } from "../ui/FloatingBackButton";
import { useIconColors } from "../ui/iconColors";
import { ScreenContainer } from "../ui/ScreenContainer";

type Props = NativeStackScreenProps<RootStackParamList, "Pair">;

type QrSvgHandle = {
  toDataURL: (callback: (dataUrl: string) => void) => void;
};

export function PairScreen({ navigation }: Props) {
  const l = useL();
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
  const { top } = useSafeAreaInsets();
  const qrRef = useRef<QrSvgHandle | null>(null);

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

  const handleShareQR = useCallback(() => {
    if (!qrValue || !qrRef.current) return;

    qrRef.current.toDataURL((dataUrl) => {
      void (async () => {
        const base = cacheDirectory;
        if (!base) return;

        const uri = `${base}mesher-pair-qr.png`;
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");

        try {
          if (!(await Sharing.isAvailableAsync())) return;

          await writeAsStringAsync(uri, base64, { encoding: "base64" });
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            UTI: "public.png",
            dialogTitle: l("PAIR.SHARE_QR"),
          });
        } catch (err) {
          console.warn("[mesher:pair] share QR failed", err);
        } finally {
          await deleteAsync(uri, { idempotent: true }).catch(() => {});
        }
      })();
    });
  }, [l, qrValue]);

  return (
    <ScreenContainer style={{ paddingTop: top }}>
      <BackButton className="z-10" />

      <ScrollView
        contentContainerClassName="items-center pb-6 mt-2"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h3" className="mb-2 self-stretch text-center">
          {l("CONTACTS.PAIR_WITH_QR")}
        </Text>
        <Text variant="muted" className="mb-4 self-stretch mt-4">
          {l("PAIR.SUBTITLE")}
        </Text>

        <Card className="mb-4 w-full max-w-sm gap-0 py-6">
          <CardHeader>
            <View className="flex-row items-center justify-center gap-2 -ml-4">
              <QrCode color={icon.foreground} size={18} />
              <CardTitle className="text-center text-base">
                {l("PAIR.YOUR_CODE")}
              </CardTitle>
            </View>
          </CardHeader>
          <CardContent className="items-center">
            <View className="bg-card rounded-lg p-4">
              {qrValue ? (
                <QRCode
                  value={qrValue}
                  size={200}
                  getRef={(c) => {
                    qrRef.current = c as QrSvgHandle | null;
                  }}
                />
              ) : (
                <Text variant="muted">{l("PAIR.LOADING_QR")}</Text>
              )}
            </View>
            <Button
              variant="outline"
              disabled={!qrValue}
              onPress={handleShareQR}
            >
              <Text>{l("PAIR.SHARE_QR")}</Text>
            </Button>
            {displayName ? (
              <Text variant="muted" className="mt-4 text-center text-sm">
                {l("PAIR.ADDED_AS_NAME").replace("{name}", displayName)}
              </Text>
            ) : null}
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
            <Text>{l("PAIR.ALLOW_CAMERA")}</Text>
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
              <Text>
                {scanning ? l("COMMON.CANCEL") : l("PAIR.SCAN_PEER_QR")}
              </Text>
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
            {...(Platform.OS === "android"
              ? { ratio: "16:9" as const }
              : { videoStabilizationMode: "cinematic" as const })}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={onBarcode}
            onMountError={({ message }) => setCameraError(message)}
          />
          <BackButton
            invert
            onPress={stopScanning}
            className="absolute left-4"
            style={{ top }}
          />
          {cameraError ? (
            <View
              style={[
                styles.scannerChrome,
                {
                  paddingTop: Math.max(insets.top, 12) + 56,
                  paddingBottom: insets.bottom + 12,
                },
              ]}
              pointerEvents="box-none"
            >
              <Text className="text-destructive max-w-full text-sm">
                {cameraError}
              </Text>
            </View>
          ) : null}
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
