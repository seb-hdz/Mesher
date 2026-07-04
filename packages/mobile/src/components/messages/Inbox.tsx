import { Inbox as InboxIcon } from "lucide-react-native";
import { useMemo } from "react";
import { SectionList, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useL } from "../../../languages/language.store";
import type { InboxRowUi } from "../../state/meshStore";
import { CollapsibleMessagePanel } from "./CollapsibleMessagePanel";
import { groupByAuthorKey } from "./groupByAuthor";
import {
  AuthorSectionHeader,
  formatMessageTimestamp,
  MessageListSeparator,
  MessageRow,
  MESSAGE_ITEM_DIVIDER_INSET_COMPACT,
} from "./MessageItem";
import { useLanguageStore } from "../../../languages/language.store";

export type InboxProps = {
  messages: InboxRowUi[];
  expanded: boolean;
  onToggle: () => void;
};

const UNKNOWN_SECTION_KEY = "__unknown__";

function inboxPreview(body: string, emptyLabel: string): string {
  const trimmed = body.trim();
  return trimmed || emptyLabel;
}

export function Inbox({ messages, expanded, onToggle }: InboxProps) {
  const l = useL();
  const language = useLanguageStore((s) => s.language);
  const unknownLabel = l("CONTACTS.UNKNOWN_PEER");

  const canGroup = messages.some(
    (m) => !!m.senderPeerId || !!m.senderDisplayName.trim()
  );

  const sections = useMemo(() => {
    if (!canGroup) return null;
    return groupByAuthorKey(messages, {
      getAuthorKey: (m) =>
        m.senderPeerId ?? (m.senderDisplayName.trim() || UNKNOWN_SECTION_KEY),
      getDisplayName: (m) =>
        m.senderDisplayName.trim() ? m.senderDisplayName : unknownLabel,
      hasKnownAuthor: (m) => !!m.senderDisplayName.trim(),
      getInitialsFallback: (m) => m.senderPeerId ?? m.messageId,
    }).map((group) => ({
      title: group.displayName,
      initials: group.initials,
      data: group.items,
    }));
  }, [messages, canGroup, unknownLabel]);

  const listEmpty = (
    <Text variant="muted" className="py-2 italic">
      {l("INBOX.EMPTY")}
    </Text>
  );

  const listContent = canGroup && sections ? (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.messageId}
      className="flex-1"
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <AuthorSectionHeader
          displayName={section.title}
          initials={section.initials}
        />
      )}
      renderItem={({ item }) => (
        <InboxGroupedRow item={item} language={language} yesterdayLabel={l("OUTBOX.TIME_YESTERDAY")} emptyLabel={l("INBOX.ROW_EMPTY_BODY")} />
      )}
      ListEmptyComponent={listEmpty}
      ItemSeparatorComponent={() => (
        <MessageListSeparator inset={MESSAGE_ITEM_DIVIDER_INSET_COMPACT} />
      )}
      SectionSeparatorComponent={() => null}
    />
  ) : (
    <SectionList
      sections={messages.length ? [{ title: "", data: messages }] : []}
      keyExtractor={(item) => item.messageId}
      className="flex-1"
      renderSectionHeader={() => null}
      renderItem={({ item }) => (
        <InboxFlatRow item={item} language={language} yesterdayLabel={l("OUTBOX.TIME_YESTERDAY")} emptyLabel={l("INBOX.ROW_EMPTY_BODY")} />
      )}
      ListEmptyComponent={listEmpty}
      ItemSeparatorComponent={() => (
        <MessageListSeparator inset={MESSAGE_ITEM_DIVIDER_INSET_COMPACT} />
      )}
    />
  );

  return (
    <CollapsibleMessagePanel
      title={l("INBOX.TITLE")}
      icon={InboxIcon}
      expanded={expanded}
      onToggle={onToggle}
      collapseA11y={l("INBOX.A11Y_COLLAPSE")}
      expandA11y={l("INBOX.A11Y_EXPAND")}
    >
      <View className="min-h-0 flex-1">{listContent}</View>
    </CollapsibleMessagePanel>
  );
}

function InboxFlatRow({
  item,
  language,
  yesterdayLabel,
  emptyLabel,
}: {
  item: InboxRowUi;
  language: "es" | "en";
  yesterdayLabel: string;
  emptyLabel: string;
}) {
  const time = formatMessageTimestamp(item.receivedAtMs, language, yesterdayLabel);
  return (
    <MessageRow
      preview={inboxPreview(item.body, emptyLabel)}
      time={time}
    />
  );
}

function InboxGroupedRow({
  item,
  language,
  yesterdayLabel,
  emptyLabel,
}: {
  item: InboxRowUi;
  language: "es" | "en";
  yesterdayLabel: string;
  emptyLabel: string;
}) {
  const time = formatMessageTimestamp(item.receivedAtMs, language, yesterdayLabel);
  return (
    <MessageRow
      preview={inboxPreview(item.body, emptyLabel)}
      time={time}
    />
  );
}
