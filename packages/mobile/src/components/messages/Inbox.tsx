import { Inbox as InboxIcon } from "lucide-react-native";
import { FlatList, View } from "react-native";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useL } from "../../../languages/language.store";
import { useIconColors } from "../../ui/iconColors";
import { peerInitials } from "../../utils/peerInitials";
import { MessageRow, MESSAGE_ITEM_DIVIDER_INSET } from "./MessageItem";

export type InboxProps = {
  messages: string[];
};

const TITLE_MAX = 40;

function inboxRowTitle(body: string, emptyLabel: string): string {
  const first = body.split(/\n/)[0]?.trim() ?? "";
  if (!first) return emptyLabel;
  if (first.length <= TITLE_MAX) return first;
  return `${first.slice(0, TITLE_MAX)}…`;
}

function InboxSeparator() {
  return (
    <View
      className="h-px bg-neutral-300"
      style={{ marginLeft: MESSAGE_ITEM_DIVIDER_INSET }}
    />
  );
}

function InboxMessageRow({ body, index }: { body: string; index: number }) {
  const l = useL();
  const initials = peerInitials(body, String(index));
  const title = inboxRowTitle(body, l("INBOX.ROW_EMPTY_BODY"));
  return <MessageRow initials={initials} title={title} preview={body} time="" />;
}

export function Inbox({ messages }: InboxProps) {
  const l = useL();
  const icon = useIconColors();

  return (
    <>
      <View className="mb-2 flex-row items-center gap-2">
        <InboxIcon color={icon.foreground} size={20} />
        <Text variant="h4" className="text-neutral-900">
          {l("INBOX.TITLE")}
        </Text>
      </View>
      <Card className="gap-0 py-2">
        <CardContent className="gap-0 px-4">
          <FlatList
            data={messages}
            scrollEnabled={messages.length > 4}
            className={messages.length > 4 ? "max-h-48" : undefined}
            keyExtractor={(_, i) => `inbox-${i}`}
            renderItem={({ item, index }) => <InboxMessageRow body={item} index={index} />}
            ListEmptyComponent={
              <Text variant="muted" className="py-2 italic text-neutral-500">
                {l("INBOX.EMPTY")}
              </Text>
            }
            ItemSeparatorComponent={InboxSeparator}
          />
        </CardContent>
      </Card>
    </>
  );
}
