import { peerInitials } from "@/src/utils/peerInitials";
import { ContactRowProps } from "./Contacts.types";
import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";

export function ContactRow(props: ContactRowProps) {
  const { peer, showConnectedBadge, onChevronPress } = props;
  const { chevronColor, unknownLabel, connectedBadgeA11y } = props;
  const initials = peerInitials(peer.displayName, peer.id);
  const subtitle = `${peer.id.slice(0, 12)}…`;

  const chevron = (
    <ChevronRight color={chevronColor} size={22} strokeWidth={2} />
  );

  return (
    <View className="flex-row items-center gap-3 py-3">
      <View className="relative h-12 w-12 shrink-0">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <Text className="text-base font-semibold text-foreground">
            {initials}
          </Text>
        </View>
        {showConnectedBadge ? (
          <View
            className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-green-600"
            accessibilityLabel={connectedBadgeA11y}
          />
        ) : null}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold leading-tight text-foreground">
          {peer.displayName || unknownLabel}
        </Text>
        <Text
          className="mt-0.5 text-xs leading-5 text-foreground/75"
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>
      {onChevronPress ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={onChevronPress}
          className="shrink-0 justify-center py-1 active:opacity-70"
        >
          {chevron}
        </Pressable>
      ) : (
        <View className="shrink-0 justify-center py-1">{chevron}</View>
      )}
    </View>
  );
}
