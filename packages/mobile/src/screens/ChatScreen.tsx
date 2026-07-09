import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator } from "react-native";
import { KeyboardAvoidingView } from "react-native";
import { Platform } from "react-native";
import { Pressable } from "react-native";
import { TextInput } from "react-native";
import { View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ChevronLeft, Send } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useL } from "../../languages/language.store";
import { ChatBubble } from "../components/messages/ChatBubble";
import type { ChatMessageUi } from "../messages/buildConversation";
import { isSameLocalMinute } from "../components/messages/MessageItem";
import type { RootStackParamList } from "../navigation/types";
import { useMeshStore } from "../state/meshStore";
import { useIconColors } from "../ui/iconColors";
import { ScreenContainer } from "../ui/ScreenContainer";
import { peerInitials } from "../utils/peerInitials";
import useKeyboard from "@/hooks/useKeyboard";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { cn } from "@/lib/utils";

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

export function ChatScreen({ route, navigation }: Props) {
  const { peerId } = route.params;
  const l = useL();
  const icon = useIconColors();
  const insets = useSafeAreaInsets();
  const { keyboardOpen } = useKeyboard();
  const listRef = useRef<FlashListRef<ChatMessageUi>>(null);

  const peers = useMeshStore((s) => s.peers);
  const chatState = useMeshStore((s) => s.chatByPeer[peerId]);
  const loadChatPage = useMeshStore((s) => s.loadChatPage);
  const loadOlderChatMessages = useMeshStore((s) => s.loadOlderChatMessages);
  const sendMessage = useMeshStore((s) => s.sendMessage);

  const [body, setBody] = useState("");
  const unknownLabel = l("CONTACTS.UNKNOWN_PEER");
  const unknownBodyLabel = l("CHAT.UNKNOWN_BODY");

  const peer = peers.find((p) => p.id === peerId);
  const displayName = peer?.displayName.trim() || unknownLabel;
  const initials = peer?.displayName.trim()
    ? peerInitials(peer.displayName, peer.id)
    : null;

  const messages = chatState?.messages ?? [];
  const canSend = Boolean(body.trim());

  useEffect(() => {
    void loadChatPage(peerId);
  }, [loadChatPage, peerId]);

  const scrollToEnd = useCallback(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToEnd();
  }, [messages.length, scrollToEnd]);

  const onLoadOlder = useCallback(() => {
    void loadOlderChatMessages(peerId);
  }, [loadOlderChatMessages, peerId]);

  const onSend = useCallback(() => {
    const text = body.trim();
    if (!text) return;
    setBody("");
    void sendMessage(peerId, text, unknownLabel).then(() => scrollToEnd());
  }, [body, peerId, scrollToEnd, sendMessage, unknownLabel]);

  return (
    <ScreenContainer
      className="pb-0 pt-0"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-row items-center gap-3 border-b border-border pb-2">
        <Button
          variant="outline"
          size="icon"
          accessibilityLabel={l("COMMON.BACK")}
          onPress={() => navigation.goBack()}
          className="h-11 w-11 shrink-0 rounded-full border-border shadow-sm shadow-black/10"
        >
          <ChevronLeft color={icon.foreground} size={24} strokeWidth={2} />
        </Button>
        {initials ? (
          <View className="h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
            <Text className="text-sm font-semibold text-foreground">
              {initials}
            </Text>
          </View>
        ) : null}
        <Text variant="h4" className="flex-1 text-foreground">
          {displayName}
        </Text>
      </View>

      <KeyboardAvoidingView
        className="min-h-0 flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlashList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.messageId}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
          onContentSizeChange={() => scrollToEnd()}
          ListHeaderComponent={
            chatState?.loadingOlder ? (
              <View className="items-center py-2">
                <ActivityIndicator color={icon.muted} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <Text variant="muted" className="italic">
                {l("CHAT.EMPTY")}
              </Text>
            </View>
          }
          onScroll={(e) => {
            if (
              e.nativeEvent.contentOffset.y <= 24 &&
              chatState?.hasMoreOlder
            ) {
              onLoadOlder();
            }
          }}
          scrollEventThrottle={200}
          renderItem={({ item, index }) => {
            const next = messages[index + 1];
            const showMetadata =
              !next ||
              item.direction !== next.direction ||
              !isSameLocalMinute(item.atMs, next.atMs);

            return (
              <ChatBubble
                direction={item.direction}
                body={item.body}
                atMs={item.atMs}
                status={item.status}
                unknownBodyLabel={unknownBodyLabel}
                showMetadata={showMetadata}
              />
            );
          }}
        />

        <View
          className={cn(
            "border-t border-border flex-row items-end gap-2 px-1 pt-2",
            keyboardOpen ? "pb-2" : ""
          )}
        >
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={l("CHAT.INPUT_PLACEHOLDER")}
            placeholderTextColor={icon.muted}
            multiline
            className="native:text-base max-h-28 min-h-[44px] flex-1 border border-border bg-background px-3.5 py-2.5 text-base text-foreground overflow-hidden rounded-3xl"
            accessibilityLabel={l("CHAT.INPUT_PLACEHOLDER")}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={l("CHAT.SEND_A11Y")}
            disabled={!canSend}
            onPress={onSend}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80 disabled:opacity-40"
          >
            <Send color={icon.onPrimary} size={20} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
