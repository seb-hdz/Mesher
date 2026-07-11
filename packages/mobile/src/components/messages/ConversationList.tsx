import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MessageSquare } from "lucide-react-native";
import { useCallback, useEffect } from "react";
import { FlatList, Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useL } from "../../../languages/language.store";
import type { ConversationPreviewUi } from "../../messages/buildConversation";
import type { MessagesTabScreenProps } from "../../navigation/types";
import { useMeshStore } from "../../state/meshStore";
import { useIconColors } from "../../ui/iconColors";
import { formatMessageTimestamp } from "./MessageItem";
import { useLanguageStore } from "../../../languages/language.store";
import { peerInitials } from "../../utils/peerInitials";

function ConversationRow({
  item,
  onPress,
  unknownLabel,
  emptyPreviewLabel,
  yesterdayLabel,
  language,
}: {
  item: ConversationPreviewUi;
  onPress: () => void;
  unknownLabel: string;
  emptyPreviewLabel: string;
  yesterdayLabel: string;
  language: "es" | "en";
}) {
  const hasKnownName = item.displayName !== unknownLabel;
  const initials = hasKnownName
    ? peerInitials(item.displayName, item.peerId)
    : null;
  const preview = item.lastMessage.trim() || emptyPreviewLabel;
  const time = formatMessageTimestamp(item.lastAtMs, language, yesterdayLabel);

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-3 active:opacity-70"
    >
      {initials ? (
        <View className="h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted">
          <Text className="text-base font-semibold text-foreground">
            {initials}
          </Text>
        </View>
      ) : (
        <View className="h-12 w-12 shrink-0 rounded-2xl bg-muted" />
      )}
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text
            numberOfLines={1}
            className="flex-1 text-base font-bold text-foreground"
          >
            {item.displayName}
          </Text>
          <Text className="shrink-0 text-sm text-muted-foreground">{time}</Text>
        </View>
        <Text numberOfLines={1} variant="muted" className="mt-0.5 text-sm">
          {preview}
        </Text>
      </View>
    </Pressable>
  );
}

export function ConversationList() {
  const l = useL();
  const language = useLanguageStore((s) => s.language);
  const icon = useIconColors();
  const navigation = useNavigation<MessagesTabScreenProps["navigation"]>();
  const conversations = useMeshStore((s) => s.conversations);
  const refreshConversations = useMeshStore((s) => s.refreshConversations);
  const ready = useMeshStore((s) => s.ready);
  const bluetoothUnavailable = useMeshStore((s) => s.bluetoothUnavailable);

  const unknownLabel = l("CONTACTS.UNKNOWN_PEER");

  useEffect(() => {
    if (ready) {
      void refreshConversations(unknownLabel);
    }
  }, [ready, refreshConversations, unknownLabel]);

  useFocusEffect(
    useCallback(() => {
      if (ready) {
        void refreshConversations(unknownLabel);
      }
    }, [ready, refreshConversations, unknownLabel])
  );

  return (
    <View
      className="flex-1"
      style={bluetoothUnavailable ? { opacity: 0.4 } : undefined}
      pointerEvents={bluetoothUnavailable ? "none" : "auto"}
    >
      <View className="mb-3 flex-row justify-center items-center gap-2.5 pt-1 -ml-2">
        <MessageSquare color={icon.foreground} size={24} />
        <Text className="text-2xl font-extrabold tracking-tight text-foreground">
          {l("CONVERSATIONS.TITLE")}
        </Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.peerId}
        className="flex-1"
        ListEmptyComponent={
          <Text variant="muted" className="py-2 italic">
            {l("CONVERSATIONS.EMPTY")}
          </Text>
        }
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            unknownLabel={unknownLabel}
            emptyPreviewLabel={l("CONVERSATIONS.LAST_MESSAGE_EMPTY")}
            yesterdayLabel={l("OUTBOX.TIME_YESTERDAY")}
            language={language}
            onPress={() => navigation.navigate("Chat", { peerId: item.peerId })}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-px bg-border" />}
      />
    </View>
  );
}
