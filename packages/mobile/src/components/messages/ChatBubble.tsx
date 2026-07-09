import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { OutboundStatus } from "@mesher/domain";
import { useLanguageStore, useL } from "../../../languages/language.store";
import { formatMessageTimeHMS, formatMessageTimestamp } from "./MessageItem";
import {
  ClockIcon,
  CheckIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react-native";
import { useIconColors } from "@/src/ui/iconColors";

export type ChatBubbleProps = {
  direction: "in" | "out";
  body: string;
  atMs: number;
  status?: OutboundStatus;
  unknownBodyLabel: string;
  showMetadata?: boolean;
};

function statusKey(status: OutboundStatus) {
  switch (status) {
    case "PENDING":
      return "OUTBOX.STATUS.PENDING";
    case "SENT":
      return "OUTBOX.STATUS.SENT";
    case "DELIVERED":
      return "OUTBOX.STATUS.DELIVERED";
    case "EXPIRED":
      return "OUTBOX.STATUS.EXPIRED";
  }
}

function statusIcon(
  status: OutboundStatus,
  iconColors: ReturnType<typeof useIconColors>
) {
  const iconProps = { size: 16, color: iconColors.onPrimary, strokeWidth: 2 };
  let Icon = null;

  switch (status) {
    case "PENDING":
      Icon = ClockIcon;
      break;
    case "SENT":
      Icon = CheckIcon;
      break;
    case "DELIVERED":
      Icon = CheckCircleIcon;
      break;
    case "EXPIRED":
      Icon = XCircleIcon;
      break;
  }

  return <Icon {...iconProps} />;
}

export function ChatBubble(props: ChatBubbleProps) {
  const {
    direction,
    body,
    atMs,
    status,
    unknownBodyLabel,
    showMetadata = true,
  } = props;
  const l = useL();
  const language = useLanguageStore((s) => s.language);
  const time = formatMessageTimestamp(
    atMs,
    language,
    l("OUTBOX.TIME_YESTERDAY")
  );
  const timeHMS = formatMessageTimeHMS(atMs, language);
  const [hours, minutes, seconds] = timeHMS.split(":");
  const displayBody = body.trim() || unknownBodyLabel;
  const isOut = direction === "out";
  const iconColors = useIconColors();

  return (
    <View
      className={cn(
        "max-w-[85%] relative",
        showMetadata ? "mb-2 pb-6" : "mb-1",
        isOut ? "self-end items-end" : "self-start items-start"
      )}
    >
      <View
        className={cn("items-end", isOut ? "flex-row" : "flex-row-reverse")}
      >
        <View
          className={cn(
            "rounded-full px-3.5 py-2.5 relative",
            isOut ? "bg-primary" : "bg-muted"
          )}
        >
          <Text
            className={cn(
              "text-base leading-snug",
              isOut ? "text-primary-foreground" : "text-foreground"
            )}
          >
            {displayBody}
          </Text>
        </View>
        <View
          className={cn(
            "rounded-full p-0.5 -mb-1",
            isOut ? "bg-primary -ml-4" : "bg-muted -mr-4 "
          )}
        >
          {status ? (
            <>{statusIcon(status, iconColors)}</>
          ) : (
            <View className="w-4 h-4" />
          )}
        </View>
      </View>
      {showMetadata ? (
        <View className="absolute bottom-0 flex-row items-center gap-1.5">
          <Text className="text-xs text-muted-foreground">
            {hours}:{minutes}
          </Text>
          {isOut && status ? (
            <Text className="text-xs text-muted-foreground">
              {l(statusKey(status))}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
