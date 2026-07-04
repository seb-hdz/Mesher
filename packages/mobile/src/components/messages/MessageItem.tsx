import type { OutboundStatus } from "@mesher/domain";
import { View } from "react-native";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import type { LanguagePath } from "../../../languages/language.store";
import { useLanguageStore, useL } from "../../../languages/language.store";
import type { OutboundRowUi } from "../../state/meshStore";
import { peerInitials } from "../../utils/peerInitials";

/** h-12 (48) + gap-3 (12), same as contact rows. */
export const MESSAGE_ITEM_DIVIDER_INSET = 48 + 12;
export const MESSAGE_ITEM_DIVIDER_INSET_COMPACT = 0;

function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatMessageTimestamp(
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
  initials?: string | null;
  title?: string;
  preview: string;
  time?: string;
};

/** Shared list row layout (outbox / inbox). Avatar only when initials are provided. */
export function MessageRow({ initials, title, preview, time }: MessageRowProps) {
  const showAvatar = !!initials;
  const showTitle = !!title?.trim();

  return (
    <View className="flex-row gap-3 py-3">
      {showAvatar ? (
        <View className="h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted">
          <Text className="text-base font-semibold text-foreground">{initials}</Text>
        </View>
      ) : null}
      <View className="min-w-0 flex-1">
        {showTitle ? (
          <View className="flex-row items-start justify-between gap-2">
            <Text numberOfLines={1} className="flex-1 text-base font-bold text-foreground">
              {title}
            </Text>
            {time ? (
              <Text className="shrink-0 text-sm text-muted-foreground">{time}</Text>
            ) : null}
          </View>
        ) : null}
        <View
          className={
            showTitle
              ? "mt-1 flex-row items-start justify-between gap-2"
              : "flex-row items-start justify-between gap-2"
          }
        >
          <Text
            variant="muted"
            numberOfLines={2}
            ellipsizeMode="tail"
            className="flex-1 text-sm leading-snug"
          >
            {preview}
          </Text>
          {!showTitle && time ? (
            <Text className="shrink-0 text-sm text-muted-foreground">{time}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function AuthorSectionHeader({
  displayName,
  initials,
}: {
  displayName: string;
  initials: string | null;
}) {
  if (!initials) {
    return (
      <View className="bg-background pb-1 pt-2">
        <Text className="text-sm font-bold tracking-wide text-foreground">{displayName}</Text>
        <Separator className="mt-2" />
      </View>
    );
  }

  return (
    <View className="bg-background pb-1 pt-2">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
          <Text className="text-sm font-semibold text-foreground">{initials}</Text>
        </View>
        <Text className="text-sm font-bold tracking-wide text-foreground">{displayName}</Text>
      </View>
      <Separator className="mt-2" />
    </View>
  );
}

export function MessageListSeparator({ inset }: { inset: number }) {
  return (
    <View className="h-px bg-border" style={inset > 0 ? { marginLeft: inset } : undefined} />
  );
}

export type MessageItemProps = {
  item: OutboundRowUi;
  grouped?: boolean;
};

export function MessageItem({ item, grouped = false }: MessageItemProps) {
  const l = useL();
  const language = useLanguageStore((s) => s.language);
  const time = formatMessageTimestamp(
    item.createdAtMs,
    language,
    l("OUTBOX.TIME_YESTERDAY")
  );
  const statusLabel = l(statusPath(item.status));
  const preview = `${statusLabel} · ${item.messageId}`;
  const unknownLabel = l("CONTACTS.UNKNOWN_PEER");
  const hasKnownRecipient = !!item.toDisplayName.trim();
  const displayName = hasKnownRecipient ? item.toDisplayName : unknownLabel;
  const initials = hasKnownRecipient
    ? peerInitials(item.toDisplayName, item.toPeerId ?? item.messageId)
    : null;

  return (
    <MessageRow
      initials={grouped ? null : initials}
      title={grouped ? undefined : displayName}
      preview={preview}
      time={time}
    />
  );
}
