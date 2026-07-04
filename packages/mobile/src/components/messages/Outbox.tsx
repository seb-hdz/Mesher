import { Mail } from "lucide-react-native";
import { FlatList, View } from "react-native";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useL } from "../../../languages/language.store";
import type { OutboundRowUi } from "../../state/meshStore";
import { useIconColors } from "../../ui/iconColors";
import { MessageItem, MESSAGE_ITEM_DIVIDER_INSET } from "./MessageItem";

export type OutboxProps = {
  outbound: OutboundRowUi[];
};

function OutboxSeparator() {
  return (
    <View
      className="h-px bg-neutral-300"
      style={{ marginLeft: MESSAGE_ITEM_DIVIDER_INSET }}
    />
  );
}

export function Outbox({ outbound }: OutboxProps) {
  const l = useL();
  const icon = useIconColors();

  return (
    <>
      <View className="mb-2 flex-row items-center gap-2">
        <Mail color={icon.foreground} size={20} />
        <Text variant="h4" className="text-neutral-900">
          {l("OUTBOX.TITLE")}
        </Text>
      </View>
      <Card className="mb-4 gap-0 py-2">
        <CardContent className="gap-0 px-4">
          <FlatList
            data={outbound}
            scrollEnabled={outbound.length > 4}
            className={outbound.length > 4 ? "max-h-40" : undefined}
            keyExtractor={(item) => item.messageId}
            renderItem={({ item }) => <MessageItem item={item} />}
            ListEmptyComponent={
              <Text variant="muted" className="py-2 italic text-neutral-500">
                {l("OUTBOX.EMPTY")}
              </Text>
            }
            ItemSeparatorComponent={OutboxSeparator}
          />
        </CardContent>
      </Card>
    </>
  );
}
