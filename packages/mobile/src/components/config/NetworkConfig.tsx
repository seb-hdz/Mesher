import { Platform, Switch, View } from "react-native";
import { Radio, RadioTower, RefreshCw } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { useMeshStore } from "../../state/meshStore";
import { useIconColors } from "../../ui/iconColors";

export function NetworkConfig() {
  const ready = useMeshStore((s) => s.ready);
  const bluetoothUnavailable = useMeshStore((s) => s.bluetoothUnavailable);
  const lastGossipSent = useMeshStore((s) => s.lastGossipSent);
  const refreshPeers = useMeshStore((s) => s.refreshPeers);
  const runGossip = useMeshStore((s) => s.runGossip);
  const backgroundRelayEnabled = useMeshStore((s) => s.backgroundRelayEnabled);
  const setBackgroundRelayEnabled = useMeshStore(
    (s) => s.setBackgroundRelayEnabled
  );
  const icon = useIconColors();
  const meshActionsDisabled = !ready || bluetoothUnavailable;

  return (
    <Card className="mb-4">
      <CardHeader>
        <View className="flex-row items-center gap-2">
          <Radio color={icon.foreground} size={20} />
          <CardTitle>Conectividad</CardTitle>
        </View>
      </CardHeader>
      <CardContent className="gap-3 -mt-2">
        {lastGossipSent !== null ? (
          <Text variant="muted" className="text-sm">
            Last gossip round sent {lastGossipSent ?? 0} pending packet
            {lastGossipSent === 1 ? "" : "s"} over the transport.
          </Text>
        ) : null}

        <View className="flex-row items-center justify-between gap-3 py-1">
          <View className="flex-1 pr-2">
            <Text className="text-sm font-medium">Relay en segundo plano</Text>
            <Text variant="muted" className="text-xs/4 mt-1 opacity-50">
              {Platform.OS === "android"
                ? "Shows a persistent notification and keeps the process eligible for Bluetooth while the screen is off."
                : "Uses Bluetooth background modes. iOS may still defer radio work. Mesh works best with the app open."}
            </Text>
          </View>
          <Switch
            value={backgroundRelayEnabled}
            onValueChange={(v) => void setBackgroundRelayEnabled(v)}
            disabled={meshActionsDisabled}
          />
        </View>

        <Separator />

        <View>
          <Button
            variant="secondary"
            className="flex-1 min-w-[140px]"
            disabled={meshActionsDisabled}
            onPress={() => void runGossip()}
          >
            <RadioTower color={icon.onSecondary} size={18} />
            <Text className="font-medium">Gossip round</Text>
          </Button>
          <Text variant="muted" className="text-xs/4 mt-1 opacity-50">
            Send every outbound message still marked as pending
          </Text>
        </View>

        <Separator />

        <View>
          <Button
            variant="secondary"
            className="flex-1 min-w-[140px]"
            disabled={meshActionsDisabled}
            onPress={() => void refreshPeers()}
          >
            <RefreshCw color={icon.onSecondary} size={18} />
            <Text className="font-medium">Refresh peers</Text>
          </Button>
          <Text variant="muted" className="text-xs/4 mt-1 opacity-50">
            Reload contacts from device and refreshes neighbor count
          </Text>
        </View>
      </CardContent>
    </Card>
  );
}
