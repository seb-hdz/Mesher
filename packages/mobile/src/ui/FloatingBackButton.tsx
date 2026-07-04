import { useNavigation } from "@react-navigation/native";
import { ChevronLeft } from "lucide-react-native";
import { View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useL } from "../../languages/language.store";
import { useIconColors } from "./iconColors";

type Props = {
  onPress?: () => void;
  className?: string;
  style?: ViewProps["style"];
};

export function FloatingBackButton({ onPress, className, style }: Props) {
  const l = useL();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const icon = useIconColors();

  return (
    <View
      className={cn("absolute left-4 z-10", className)}
      style={[{ top: insets.top + 8 }, style]}
      pointerEvents="box-none"
    >
      <Button
        variant="outline"
        size="icon"
        accessibilityLabel={l("COMMON.BACK")}
        onPress={onPress ?? (() => navigation.goBack())}
        className="h-11 w-11 rounded-full border-border shadow-sm shadow-black/10"
      >
        <ChevronLeft color={icon.foreground} size={24} strokeWidth={2} />
      </Button>
    </View>
  );
}
