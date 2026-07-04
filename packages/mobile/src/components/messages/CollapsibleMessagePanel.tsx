import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useIconColors } from "../../ui/iconColors";

export type CollapsibleMessagePanelProps = {
  title: string;
  icon: LucideIcon;
  expanded: boolean;
  onToggle: () => void;
  collapseA11y: string;
  expandA11y: string;
  children: React.ReactNode;
};

export function CollapsibleMessagePanel({
  title,
  icon: Icon,
  expanded,
  onToggle,
  collapseA11y,
  expandA11y,
  children,
}: CollapsibleMessagePanelProps) {
  const icon = useIconColors();
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <View className={cn("min-h-0", expanded && "flex-1")}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? collapseA11y : expandA11y}
        onPress={onToggle}
        className="mb-2 flex-row items-center gap-2 active:opacity-70"
      >
        <Icon color={icon.foreground} size={20} />
        <Text variant="h4" className="flex-1 text-foreground">
          {title}
        </Text>
        <Chevron color={icon.muted} size={20} />
      </Pressable>
      {expanded ? (
        <Card className="min-h-0 flex-1 gap-0 py-2">
          <CardContent className="min-h-0 flex-1 gap-0 px-4">{children}</CardContent>
        </Card>
      ) : null}
    </View>
  );
}
