import { useEffect } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Inbox,
  Mail,
  QrCode,
  Radio,
  RadioTower,
  RefreshCw,
  Send,
  TableRowsSplit,
  User,
  Users,
} from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import type { RootStackParamList } from "../navigation/types";
import { useDebugLogUiStore } from "../logging/debugLogUiStore";
import { useTripleTap } from "../logging/useTripleTap";
import { useMeshStore } from "../state/meshStore";
import { useIconColors } from "../ui/iconColors";
import { ScreenContainer } from "../ui/ScreenContainer";
import { cn } from "@/lib/utils";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const ready = useMeshStore((s) => s.ready);
  const displayName = useMeshStore((s) => s.displayName);
  const setDisplayName = useMeshStore((s) => s.setDisplayName);
  const peers = useMeshStore((s) => s.peers);
  const inbox = useMeshStore((s) => s.inbox);
  const outbound = useMeshStore((s) => s.outbound);
  const neighborCount = useMeshStore((s) => s.neighborCount);
  const lastGossipSent = useMeshStore((s) => s.lastGossipSent);
  const error = useMeshStore((s) => s.error);
  const init = useMeshStore((s) => s.init);
  const refreshPeers = useMeshStore((s) => s.refreshPeers);
  const runGossip = useMeshStore((s) => s.runGossip);
  const backgroundRelayEnabled = useMeshStore((s) => s.backgroundRelayEnabled);
  const setBackgroundRelayEnabled = useMeshStore(
    (s) => s.setBackgroundRelayEnabled
  );

  const toggleLogOverlay = useDebugLogUiStore((s) => s.toggleOverlay);
  const onSecretLogTrigger = useTripleTap(toggleLogOverlay);
  const icon = useIconColors();

  const neighboursTextClassName =
    neighborCount > 0 ? "text-green-600" : "text-red-600";

  useEffect(() => {
    void init();
  }, [init]);

  const renderContent = () => {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row justify-between items-start pt-4">
          <View className="flex-row items-center gap-2">
            <TableRowsSplit color={icon.foreground} size={20} />
            <Text variant="h3" className="mb-1">
              Mesher
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
              Nearby
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onSecretLogTrigger}
          accessibilityRole="text"
          className="mb-4 -mt-5 pt-0.5"
        >
          <Text variant="muted">Encrypted mesh communication</Text>
        </Pressable>

        {!ready ? (
          <Text variant="muted" className="mb-3">
            Initializing…
          </Text>
        ) : null}
        {error ? (
          <Text className="text-destructive mb-3 text-sm">{error}</Text>
        ) : null}

        <Card className="mb-4">
          <CardHeader>
            <View className="flex-row items-center gap-2">
              <Radio color={icon.foreground} size={20} />
              <CardTitle>Network</CardTitle>
            </View>
          </CardHeader>
          <CardContent className="gap-3 -mt-2">
            {lastGossipSent !== null ? (
              <Text variant="muted" className="text-sm">
                Last gossip round sent {lastGossipSent} pending packets
                {lastGossipSent === 1 ? "" : "s"} over the transport.
              </Text>
            ) : null}
            <View className="dark:bg-input/30 border-input bg-background flex h-10 w-full flex-row items-center rounded-md border px-2 shadow-sm shadow-black/5">
              <User color={icon.muted} size={18} />
              <Input
                className="min-w-0 flex-1 border-0 bg-transparent px-2 py-1 shadow-none"
                placeholder="Display name (for QR)"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>
            <Text variant="muted" className="text-xs opacity-50 -mt-2">
              Display name for contacts
            </Text>

            <Separator />

            <View className="flex-row items-center justify-between gap-3 py-1">
              <View className="flex-1 pr-2">
                <Text className="text-sm font-medium">Relay in background</Text>
                <Text variant="muted" className="text-xs/4 mt-1">
                  {Platform.OS === "android"
                    ? "Shows a persistent notification and keeps the process eligible for Bluetooth while the screen is off."
                    : "Uses Bluetooth background modes; iOS may still defer radio work — mesh works best with the app open."}
                </Text>
              </View>
              <Switch
                value={backgroundRelayEnabled}
                onValueChange={(v) => void setBackgroundRelayEnabled(v)}
                disabled={!ready}
              />
            </View>

            <Separator />

            <Button
              variant="outline"
              className="flex-1 min-w-[140px]"
              onPress={() => navigation.navigate("Pair")}
            >
              <QrCode color={icon.foreground} size={18} />
              <Text>Pair (QR)</Text>
            </Button>
            <Button
              className="flex-1 min-w-[140px]"
              onPress={() => navigation.navigate("Compose")}
            >
              <Send color={icon.onPrimary} size={18} />
              <Text>Send</Text>
            </Button>

            <Separator />

            <View>
              <Button
                variant="secondary"
                className="flex-1 min-w-[140px]"
                onPress={() => void refreshPeers()}
              >
                <RefreshCw color={icon.onSecondary} size={18} />
                <Text>Refresh peers</Text>
              </Button>
              <Text variant="muted" className="text-xs/4 mt-1 opacity-50">
                Reload contacts from the local database and refresh the neighbor
                count.
              </Text>
            </View>

            <View>
              <Button
                variant="secondary"
                className="flex-1 min-w-[140px]"
                onPress={() => void runGossip()}
              >
                <RadioTower color={icon.onSecondary} size={18} />
                <Text>Gossip round</Text>
              </Button>
              <Text variant="muted" className="text-xs/4 mt-1 opacity-50">
                Send every outbound message still marked as pending (shows how
                many were flushed).
              </Text>
            </View>
          </CardContent>
        </Card>

        <View className="mb-2 flex-row items-center gap-2">
          <Users color={icon.foreground} size={20} />
          <Text variant="h4">Contacts</Text>
        </View>
        <Card className="mb-4 gap-0 py-1">
          <CardContent className="gap-0 px-4">
            <FlatList
              data={peers}
              scrollEnabled={peers.length > 4}
              className={peers.length > 4 ? "max-h-48" : undefined}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View className="flex-row items-start gap-3 py-3">
                  <User color={icon.muted} size={20} style={{ marginTop: 2 }} />
                  <View className="min-w-0 flex-1">
                    <Text className="font-medium">{item.displayName}</Text>
                    <Text variant="muted" className="text-xs opacity-50">
                      {item.id.slice(0, 12)}…
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text variant="muted" className="py-2 italic">
                  No peers yet — scan a QR.
                </Text>
              }
              ItemSeparatorComponent={() => <Separator />}
            />
          </CardContent>
        </Card>

        <Separator className="mb-4" />

        <View className="mb-2 flex-row items-center gap-2">
          <Mail color={icon.foreground} size={20} />
          <Text variant="h4">Outbox</Text>
        </View>
        <Card className="mb-4 gap-0 py-2">
          <CardContent className="gap-0 px-4">
            <FlatList
              data={outbound}
              scrollEnabled={outbound.length > 4}
              className={outbound.length > 4 ? "max-h-40" : undefined}
              keyExtractor={(item) => item.messageId}
              renderItem={({ item }) => (
                <View className="py-2">
                  <Text className="text-sm">
                    To {item.toDisplayName} — {item.status}
                  </Text>
                  <Text variant="muted" className="font-mono text-xs">
                    {item.messageId.slice(0, 20)}…
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                <Text variant="muted" className="py-2 italic">
                  No outbound rows yet.
                </Text>
              }
              ItemSeparatorComponent={() => <Separator />}
            />
          </CardContent>
        </Card>

        <Separator className="mb-4" />

        <View className="mb-2 flex-row items-center gap-2">
          <Inbox color={icon.foreground} size={20} />
          <Text variant="h4">Inbox</Text>
        </View>
        <Card className="gap-0 py-4">
          <CardContent className="gap-0 px-4">
            <FlatList
              data={inbox}
              scrollEnabled={inbox.length > 4}
              className={inbox.length > 4 ? "max-h-48" : undefined}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <View className="border-border border-b py-2">
                  <Text className="text-sm leading-5">{item}</Text>
                </View>
              )}
              ListEmptyComponent={
                <Text variant="muted" className="py-2 italic">
                  No messages yet.
                </Text>
              }
            />
          </CardContent>
        </Card>
        <View className="h-8" />
      </ScrollView>
    );
  };

  return <ScreenContainer>{renderContent()}</ScreenContainer>;
}
