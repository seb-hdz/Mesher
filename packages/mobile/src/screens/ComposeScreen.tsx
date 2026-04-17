import { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MessageSquare, Send, User, Users } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import type { RootStackParamList } from "../navigation/types";
import { useMeshStore } from "../state/meshStore";
import { useIconColors } from "../ui/iconColors";
import { ScreenContainer } from "../ui/ScreenContainer";

type Props = NativeStackScreenProps<RootStackParamList, "Compose">;

export function ComposeScreen({ navigation }: Props) {
  const peers = useMeshStore((s) => s.peers);
  const sendMessage = useMeshStore((s) => s.sendMessage);
  const [peerId, setPeerId] = useState(peers[0]?.id ?? "");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!peerId && peers[0]) setPeerId(peers[0].id);
  }, [peers, peerId]);

  const canSend = Boolean(peerId && body.trim());
  const icon = useIconColors();

  return (
    <ScreenContainer>
      <View className="mb-4 flex-row items-center gap-2">
        <MessageSquare color={icon.foreground} size={24} />
        <Text variant="h3">Send mesh message</Text>
      </View>

      <Card className="mb-4 gap-0 py-4">
        <CardHeader>
          <View className="flex-row items-center gap-2">
            <Users color={icon.foreground} size={18} />
            <CardTitle className="text-base">Recipient</CardTitle>
          </View>
          <CardDescription>Tap a contact to select</CardDescription>
        </CardHeader>
        <CardContent className="max-h-52 px-4 pt-0">
          <FlatList
            data={peers}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => {
              const active = peerId === item.id;
              return (
                <Button
                  variant={active ? "secondary" : "outline"}
                  className="mb-2 h-auto justify-start px-3 py-3"
                  onPress={() => setPeerId(item.id)}
                >
                  <User
                    color={active ? icon.onSecondary : icon.foreground}
                    size={18}
                  />
                  <Text className={active ? "font-semibold" : ""}>
                    {item.displayName}
                  </Text>
                </Button>
              );
            }}
            ListEmptyComponent={
              <Text variant="muted" className="italic">
                Add a contact from Pair first.
              </Text>
            }
          />
        </CardContent>
      </Card>

      <Text
        variant="small"
        className="text-muted-foreground mb-2 font-semibold"
      >
        Message
      </Text>
      <Input
        className="native:min-h-28 mb-4 py-3"
        multiline
        textAlignVertical="top"
        placeholder="Hello from the crowd…"
        value={body}
        onChangeText={setBody}
      />

      <Button
        disabled={!canSend}
        className="w-full"
        onPress={() => {
          console.log(
            `[mesher:send] Compose send tapped peerId=${peerId} bodyLen=${body.trim().length}`,
          );
          void sendMessage(peerId, body).then(() => navigation.goBack());
        }}
      >
        <Send color={icon.onPrimary} size={18} />
        <Text>Send & gossip</Text>
      </Button>
    </ScreenContainer>
  );
}
