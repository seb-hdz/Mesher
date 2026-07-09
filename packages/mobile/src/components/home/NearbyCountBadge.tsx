import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useL } from "../../../languages/language.store";
import { FrostedBlurSurface } from "../../ui/FrostedBlurSurface";

type Props = {
  className?: string;
  count: number;
};

export function NearbyCountBadge({ count, className }: Props) {
  const l = useL();
  const textClassName = count > 0 ? "text-green-600" : "text-red-600";

  return (
    <FrostedBlurSurface
      className={cn(
        "items-center rounded-full border !border-border px-5 pt-1 pb-2",
        className
      )}
    >
      <Text className={cn("text-3xl font-bold", textClassName)}>{count}</Text>
      <Text variant="muted" className={cn("text-xs font-bold", textClassName)}>
        {l("HOME.NEARBY_CAPTION")}
      </Text>
    </FrostedBlurSurface>
  );
}
