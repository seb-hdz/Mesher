import type { OutboundStatus } from "@mesher/domain";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import type { LanguagePath } from "../../../languages/language.store";
import { useLanguageStore, useL } from "../../../languages/language.store";
import type { OutboundRowUi } from "../../state/meshStore";
import { peerInitials } from "../../utils/peerInitials";

/** h-12 (48) + gap-3 (12), same as contact rows. */
export const MESSAGE_ITEM_DIVIDER_INSET = 48 + 12;

function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function formatOutboundTimestamp(
  createdAtMs: number,
  language: "es" | "en",
  yesterdayLabel: string
): string {
  const d = new Date(createdAtMs);
  const now = new Date();
  const todayStart = startOfLocalDayMs(now);
  const yesterdayStart = todayStart - 86400000;
  const t = d.getTime();
  const localeTag = language === "es" ? "es" : "en-GB";

  if (t >= todayStart) {
    return new Intl.DateTimeFormat(localeTag, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }
  if (t >= yesterdayStart) return yesterdayLabel;

  const itemDayStart = startOfLocalDayMs(d);
  const daysAgo = Math.floor((todayStart - itemDayStart) / 86400000);
  if (daysAgo < 7) {
    return new Intl.DateTimeFormat(localeTag, { weekday: "short" }).format(d);
  }
  return new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
  }).format(d);
}

function statusPath(status: OutboundStatus): LanguagePath {
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

export type MessageRowProps = {
  initials: string;
  title: string;
  preview: string;
  time: string;
};

/** Shared list row layout (outbox / inbox). */
export function MessageRow({ initials, title, preview, time }: MessageRowProps) {
  return (
    <View className="flex-row gap-3 py-3">
      <View className="h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted">
        <Text className="text-base font-semibold text-foreground">{initials}</Text>
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text numberOfLines={1} className="flex-1 text-base font-bold text-neutral-900">
            {title}
          </Text>
          {time ? (
            <Text className="shrink-0 text-sm text-neutral-900">{time}</Text>
          ) : null}
        </View>
        <Text
          variant="muted"
          numberOfLines={2}
          ellipsizeMode="tail"
          className="mt-1 text-sm leading-snug text-neutral-500"
        >
          {preview}
        </Text>
      </View>
    </View>
  );
}

export type MessageItemProps = {
  item: OutboundRowUi;
};

export function MessageItem({ item }: MessageItemProps) {
  const l = useL();
  const language = useLanguageStore((s) => s.language);
  const time = formatOutboundTimestamp(
    item.createdAtMs,
    language,
    l("OUTBOX.TIME_YESTERDAY")
  );
  const statusLabel = l(statusPath(item.status));
  const preview = `${statusLabel} · ${item.messageId}`;
  const unknownLabel = l("CONTACTS.UNKNOWN_PEER");
  const displayName = item.toDisplayName.trim()
    ? item.toDisplayName
    : unknownLabel;
  const initials = peerInitials(item.toDisplayName, item.messageId);

  return (
    <MessageRow
      initials={initials}
      title={displayName}
      preview={preview}
      time={time}
    />
  );
}
