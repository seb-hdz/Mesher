import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  type TextInput,
  View,
} from "react-native";
import { User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useL } from "../../../languages/language.store";
import { useMeshStore } from "../../state/meshStore";
import { useIconColors } from "../../ui/iconColors";

export function WelcomeNameSheet() {
  const l = useL();
  const insets = useSafeAreaInsets();
  const icon = useIconColors();
  const ready = useMeshStore((s) => s.ready);
  const displayName = useMeshStore((s) => s.displayName);
  const displayNameLoaded = useMeshStore((s) => s.displayNameLoaded);
  const saveDisplayName = useMeshStore((s) => s.saveDisplayName);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const visible = ready && displayNameLoaded && displayName === "";
  const canSave = draft.trim().length > 0 && !saving;

  useEffect(() => {
    if (!visible) {
      setDraft("");
      return;
    }
    const id = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(id);
  }, [visible]);

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await saveDisplayName(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoid}
        >
          <View
            className="bg-card rounded-t-2xl px-6 pt-6"
            style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
          >
            <Text className="text-center text-2xl font-bold">
              {l("WELCOME_NAME.TITLE")}
            </Text>
            <Text variant="muted" className="mt-2 text-center text-sm">
              {l("WELCOME_NAME.SUBTITLE")}
            </Text>

            <View className="dark:bg-input/30 border-input bg-background mt-6 flex h-11 w-full flex-row items-center rounded-md border px-2 shadow-sm shadow-black/5">
              <User color={icon.muted} size={18} />
              <Input
                ref={inputRef}
                className="min-w-0 flex-1 border-0 bg-transparent px-2 py-1 shadow-none"
                placeholder={l("USER_CONFIG.NAME_PLACEHOLDER")}
                value={draft}
                onChangeText={setDraft}
                returnKeyType="done"
                onSubmitEditing={() => void onSave()}
              />
            </View>
            <Text variant="muted" className="mt-2 text-xs opacity-50">
              {l("USER_CONFIG.NAME_HINT")}
            </Text>

            <Button
              className="mt-6"
              disabled={!canSave}
              onPress={() => void onSave()}
            >
              <Text>{l("WELCOME_NAME.SAVE")}</Text>
            </Button>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  keyboardAvoid: {
    justifyContent: "flex-end",
  },
});
