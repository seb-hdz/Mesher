import { cn } from "@/lib/utils";
import { View, type ViewProps } from "react-native";

type Props = ViewProps & { className?: string };

/** Safe padding and background aligned with React Native Reusables / Nativewind tokens. */
export function ScreenContainer({ className, style, ...rest }: Props) {
  return <View className={cn("flex-1 bg-background px-4 pt-14", className)} style={style} {...rest} />;
}
