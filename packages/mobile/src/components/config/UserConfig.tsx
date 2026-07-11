import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { User } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useL } from "../../../languages/language.store";
import { useMeshStore } from "../../state/meshStore";
import { useIconColors } from "../../ui/iconColors";

// TODO: maybe move to its own component
const SUCCESS_DISMISS_MS = 3000;

export function UserConfig() {
  const l = useL();
  const displayName = useMeshStore((s) => s.displayName);
  const saveDisplayName = useMeshStore((s) => s.saveDisplayName);
  const icon = useIconColors();
  const [draft, setDraft] = useState(displayName);
  const [showSave, setShowSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(displayName);
  }, [displayName]);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const trimmedDraft = draft.trim();
  const canSave =
    showSave &&
    trimmedDraft.length > 0 &&
    trimmedDraft !== displayName &&
    !saving;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await saveDisplayName(draft);
      setShowSave(false);
      setShowSuccess(true);
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(
        () => setShowSuccess(false),
        SUCCESS_DISMISS_MS
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="gap-3 -mt-2">
      <CardHeader>
        <Text className="font-semibold">{l("USER_CONFIG.TITLE")}</Text>
        <Text variant="muted" className="text-xs opacity-50 -mt-2 pb-1">
          {l("USER_CONFIG.NAME_HINT")}
        </Text>
      </CardHeader>
      <CardContent className="gap-3 -mt-2">
        <View className="dark:bg-input/30 border-input bg-background flex h-10 w-full flex-row items-center rounded-md border px-2 shadow-sm shadow-black/5">
          <User color={icon.muted} size={18} />
          <Input
            className="min-w-0 flex-1 border-0 bg-transparent px-2 py-1 shadow-none"
            placeholder={l("USER_CONFIG.NAME_PLACEHOLDER")}
            value={draft}
            onChangeText={setDraft}
            onFocus={() => setShowSave(true)}
          />
        </View>
        {showSave ? (
          <Button
            variant={canSave ? "default" : "outline"}
            size="sm"
            className="w-full"
            disabled={!canSave}
            onPress={() => void onSave()}
          >
            <Text>{l("USER_CONFIG.SAVE")}</Text>
          </Button>
        ) : null}
        {showSuccess ? (
          <Text className="text-sm text-green-600 dark:text-green-400">
            {l("USER_CONFIG.NAME_SAVED")}
          </Text>
        ) : null}
      </CardContent>
    </Card>
  );
}
