import { Mail } from "lucide-react-native";
import { useMemo } from "react";
import { SectionList, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useL } from "../../../languages/language.store";
import type { OutboundRowUi } from "../../state/meshStore";
import { CollapsibleMessagePanel } from "./CollapsibleMessagePanel";
import { groupByAuthorKey } from "./groupByAuthor";
import {
  AuthorSectionHeader,
  MessageItem,
  MessageListSeparator,
  MESSAGE_ITEM_DIVIDER_INSET_COMPACT,
} from "./MessageItem";

export type OutboxProps = {
  outbound: OutboundRowUi[];
  expanded: boolean;
  onToggle: () => void;
};

const UNKNOWN_SECTION_KEY = "__unknown__";

export function Outbox({ outbound, expanded, onToggle }: OutboxProps) {
  const l = useL();
  const unknownLabel = l("CONTACTS.UNKNOWN_PEER");

  const canGroup = outbound.some(
    (m) => !!m.toPeerId || !!m.toDisplayName.trim()
  );

  const sections = useMemo(() => {
    if (!canGroup) return null;
    return groupByAuthorKey(outbound, {
      getAuthorKey: (m) => m.toPeerId ?? (m.toDisplayName.trim() || UNKNOWN_SECTION_KEY),
      getDisplayName: (m) => (m.toDisplayName.trim() ? m.toDisplayName : unknownLabel),
      hasKnownAuthor: (m) => !!m.toDisplayName.trim(),
      getInitialsFallback: (m) => m.toPeerId ?? m.messageId,
    }).map((group) => ({
      title: group.displayName,
      initials: group.initials,
      data: group.items,
    }));
  }, [outbound, canGroup, unknownLabel]);

  const listEmpty = (
    <Text variant="muted" className="py-2 italic">
      {l("OUTBOX.EMPTY")}
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
      renderItem={({ item }) => <MessageItem item={item} grouped />}
      ListEmptyComponent={listEmpty}
      ItemSeparatorComponent={() => (
        <MessageListSeparator inset={MESSAGE_ITEM_DIVIDER_INSET_COMPACT} />
      )}
      SectionSeparatorComponent={() => null}
    />
  ) : (
    <SectionList
      sections={outbound.length ? [{ title: "", data: outbound }] : []}
      keyExtractor={(item) => item.messageId}
      className="flex-1"
      renderSectionHeader={() => null}
      renderItem={({ item }) => <MessageItem item={item} />}
      ListEmptyComponent={listEmpty}
      ItemSeparatorComponent={() => (
        <MessageListSeparator inset={MESSAGE_ITEM_DIVIDER_INSET_COMPACT} />
      )}
    />
  );

  return (
    <CollapsibleMessagePanel
      title={l("OUTBOX.TITLE")}
      icon={Mail}
      expanded={expanded}
      onToggle={onToggle}
      collapseA11y={l("OUTBOX.A11Y_COLLAPSE")}
      expandA11y={l("OUTBOX.A11Y_EXPAND")}
    >
      <View className="min-h-0 flex-1">{listContent}</View>
    </CollapsibleMessagePanel>
  );
}
