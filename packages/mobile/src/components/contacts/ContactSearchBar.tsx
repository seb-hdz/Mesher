import { BlurView } from "expo-blur";
import { Search } from "lucide-react-native";
import {
  Platform,
  StyleProp,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useL } from "../../../languages/language.store";
import { useIconColors } from "../../ui/iconColors";
import { cn } from "@/lib/utils";

export type ContactSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

export function ContactSearchBar({
  value,
  onChangeText,
  className,
  style,
}: ContactSearchBarProps) {
  const icon = useIconColors();
  const l = useL();
  const scheme = useColorScheme();

  const blurTint =
    scheme === "dark"
      ? "systemChromeMaterialDark"
      : "systemChromeMaterialLight";

  return (
    <View
      className={cn(
        "rounded-full border border-border w-72 shadow shadow-foreground/10",
        className
      )}
      style={style}
    >
      <BlurView
        intensity={Platform.OS === "ios" ? 24 : 20}
        tint={blurTint}
        style={StyleSheet.absoluteFill}
        className="rounded-full overflow-hidden"
        experimentalBlurMethod={
          Platform.OS === "android" ? "dimezisBlurView" : undefined
        }
      />
      <View className="bg-background/45 flex-row items-center gap-2.5 px-3.5 pt-1 pb-1.5 rounded-full overflow-hidden">
        <Search color={icon.muted} size={20} strokeWidth={2} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={l("CONTACTS.SEARCH_PLACEHOLDER")}
          placeholderTextColor={icon.muted}
          className="flex-1 py-1 text-foreground text-base h-12 -mt-1"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel={l("CONTACTS.SEARCH_PLACEHOLDER")}
        />
      </View>
    </View>
  );
}
