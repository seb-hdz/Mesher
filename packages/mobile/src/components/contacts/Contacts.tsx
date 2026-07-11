import { useNavigation } from "@react-navigation/native";
import { QrCode, Users } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Platform, SectionList, View } from "react-native";
import { KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { useL } from "../../../languages/language.store";
import type { ContactsTabScreenProps } from "../../navigation/types";
import { FLOATING_TAB_BAR_HEIGHT } from "../../navigation/floatingTabBarInset";
import { useMeshStore } from "../../state/meshStore";
import { ScreenContainer } from "../../ui/ScreenContainer";
import { useIconColors } from "../../ui/iconColors";
import { ContactSearchBar } from "./ContactSearchBar";
import { buildSections, filterPeersByQuery } from "./Contacts.helpers";
import useKeyboard from "@/hooks/useKeyboard";
import { cn } from "@/lib/utils";
import { ContactsProps } from "./Contacts.types";
import { ContactRow } from "./ContactRow";

export function Contacts(props: ContactsProps) {
  const { isPeerConnected } = props;
  const peers = useMeshStore((s) => s.peers);
  const bluetoothUnavailable = useMeshStore((s) => s.bluetoothUnavailable);
  const icon = useIconColors();
  const l = useL();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ContactsTabScreenProps["navigation"]>();
  const [query, setQuery] = useState("");
  const { keyboardOpen } = useKeyboard();

  const unknownLabel = l("CONTACTS.UNKNOWN_PEER");
  const otherSectionTitle = l("CONTACTS.SECTION_OTHER");

  const filteredPeers = useMemo(
    () => filterPeersByQuery(peers, query, unknownLabel),
    [peers, query, unknownLabel]
  );

  const sections = useMemo(
    () => buildSections(filteredPeers, unknownLabel, otherSectionTitle),
    [filteredPeers, unknownLabel, otherSectionTitle]
  );

  const bottomControlsHeight = FLOATING_TAB_BAR_HEIGHT + insets.bottom;

  return (
    <ScreenContainer className="pb-0" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView
        className="relative flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          className="flex-1"
          style={bluetoothUnavailable ? { opacity: 0.4 } : undefined}
          pointerEvents={bluetoothUnavailable ? "none" : "auto"}
        >
          <View className="mb-3 flex-row items-center justify-center gap-2.5 pt-1">
            <Users color={icon.foreground} size={24} />
            <Text className="text-2xl font-extrabold tracking-tight text-foreground">
              {l("CONTACTS.TITLE")}
            </Text>
          </View>

          {peers.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Text variant="muted" className="py-2 italic">
                {l("CONTACTS.EMPTY")}
              </Text>
            </View>
          ) : filteredPeers.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Text variant="muted" className="py-2">
                {l("CONTACTS.NO_SEARCH_RESULTS")}
              </Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              className="flex-1"
              stickySectionHeadersEnabled={false}
              keyboardShouldPersistTaps="handled"
              renderSectionHeader={({ section: { title } }) => (
                <View className="bg-background pb-1 pt-2">
                  <Text className="text-sm font-bold tracking-wide text-foreground">
                    {title}
                  </Text>
                  <Separator className="mt-2" />
                </View>
              )}
              renderItem={({ item }) => (
                <ContactRow
                  peer={item}
                  showConnectedBadge={isPeerConnected?.(item) ?? false}
                  onChevronPress={() =>
                    navigation.navigate("Chat", { peerId: item.id })
                  }
                  chevronColor={icon.foreground}
                  unknownLabel={unknownLabel}
                  connectedBadgeA11y={l("CONTACTS.A11Y_CONNECTED_BADGE")}
                />
              )}
              SectionSeparatorComponent={() => null}
            />
          )}

          <View
            className={cn(
              "flex flex-row w-full gap-2.5 justify-between",
              keyboardOpen ? "pb-3" : ""
            )}
            pointerEvents="box-none"
            style={{
              marginBottom: !keyboardOpen ? bottomControlsHeight : 0,
            }}
          >
            <ContactSearchBar value={query} onChangeText={setQuery} />
            <Button
              variant="outline"
              size="icon"
              accessibilityLabel={l("CONTACTS.PAIR_WITH_QR")}
              onPress={() => navigation.navigate("Pair")}
              className="h-14 w-14 rounded-full border-border shadow-sm shadow-black/10"
            >
              <QrCode color={icon.foreground} size={26} strokeWidth={2} />
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
