import type { PeerRecord } from "@mesher/domain";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { ChevronRight, QrCode, Search, Users } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { useL } from "../../../languages/language.store";
import type { ContactsTabScreenProps } from "../../navigation/types";
import {
  FLOATING_TAB_BAR_ABOVE_HOME,
  FLOATING_TAB_BAR_HEIGHT,
  useFloatingTabBarBottomInset,
} from "../../navigation/floatingTabBarInset";
import { useMeshStore } from "../../state/meshStore";
import { useIconColors } from "../../ui/iconColors";
import { peerInitials } from "../../utils/peerInitials";

const SECTION_OTHER = "__OTHER__";

export type ContactsProps = {
  isPeerConnected?: (peer: PeerRecord) => boolean;
  onPeerPress?: (peer: PeerRecord) => void;
};

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

function sortName(peer: PeerRecord, unknownLabel: string): string {
  const n = peer.displayName.trim();
  if (n) return n;
  return unknownLabel || peer.id;
}

function bucketKeyForPeer(peer: PeerRecord, unknownLabel: string): string {
  const key = sortName(peer, unknownLabel);
  const first = stripDiacritics(key).charAt(0);
  if (!first) return SECTION_OTHER;
  const upper = first.toLocaleUpperCase();
  if (/^[A-Z]$/.test(upper)) return upper;
  return SECTION_OTHER;
}

function buildSections(
  peers: PeerRecord[],
  unknownLabel: string,
  otherSectionTitle: string
): { title: string; data: PeerRecord[] }[] {
  const collator = new Intl.Collator(undefined, { sensitivity: "base" });
  const sorted = [...peers].sort((a, b) =>
    collator.compare(sortName(a, unknownLabel), sortName(b, unknownLabel))
  );

  const byLetter = new Map<string, PeerRecord[]>();
  for (const p of sorted) {
    const key = bucketKeyForPeer(p, unknownLabel);
    const list = byLetter.get(key) ?? [];
    list.push(p);
    byLetter.set(key, list);
  }

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const out: { title: string; data: PeerRecord[] }[] = [];
  for (const L of letters) {
    const data = byLetter.get(L);
    if (data?.length) out.push({ title: L, data });
  }
  const other = byLetter.get(SECTION_OTHER);
  if (other?.length) {
    out.push({ title: otherSectionTitle, data: other });
  }
  return out;
}

function filterPeersByQuery(
  peers: PeerRecord[],
  query: string,
  unknownLabel: string
): PeerRecord[] {
  const q = stripDiacritics(query.trim().toLowerCase());
  if (!q) return peers;
  return peers.filter((p) => {
    const name = stripDiacritics(sortName(p, unknownLabel).toLowerCase());
    const id = p.id.toLowerCase();
    return name.includes(q) || id.includes(q);
  });
}

function ContactRow({
  peer,
  showConnectedBadge,
  onChevronPress,
  chevronColor,
  unknownLabel,
  connectedBadgeA11y,
}: {
  peer: PeerRecord;
  showConnectedBadge: boolean;
  onChevronPress?: () => void;
  chevronColor: string;
  unknownLabel: string;
  connectedBadgeA11y: string;
}) {
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

export function Contacts({ isPeerConnected, onPeerPress }: ContactsProps) {
  const peers = useMeshStore((s) => s.peers);
  const icon = useIconColors();
  const l = useL();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<ContactsTabScreenProps["navigation"]>();
  const bottomPad = useFloatingTabBarBottomInset();
  const [query, setQuery] = useState("");

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

  const blurTint =
    scheme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight";

  const fabBottom =
    insets.bottom + FLOATING_TAB_BAR_ABOVE_HOME + FLOATING_TAB_BAR_HEIGHT + 12;

  const listBottomPad = bottomPad + 80;

  return (
    <View className="flex-1">
      <View className="mb-3 flex-row items-center gap-2.5 pt-1">
        <Users color={icon.foreground} size={24} />
        <Text className="text-2xl font-extrabold tracking-tight text-foreground">
          {l("CONTACTS.TITLE")}
        </Text>
      </View>

      <View className="mb-4 overflow-hidden rounded-2xl border border-border/40">
        <BlurView
          intensity={Platform.OS === "ios" ? 48 : 40}
          tint={blurTint}
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod={
            Platform.OS === "android" ? "dimezisBlurView" : undefined
          }
        />
        <View className="bg-background/45 flex-row items-center gap-2.5 px-3.5 py-2.5">
          <Search color={icon.muted} size={20} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={l("CONTACTS.SEARCH_PLACEHOLDER")}
            placeholderTextColor={icon.muted}
            className="native:text-base min-h-[40px] flex-1 py-1 text-base text-foreground"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel={l("CONTACTS.SEARCH_PLACEHOLDER")}
          />
        </View>
      </View>

      {peers.length === 0 ? (
        <Text variant="muted" className="py-2 italic">
          {l("CONTACTS.EMPTY")}
        </Text>
      ) : filteredPeers.length === 0 ? (
        <Text variant="muted" className="py-2">
          {l("CONTACTS.NO_SEARCH_RESULTS")}
        </Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          className="flex-1"
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: listBottomPad }}
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
              onChevronPress={
                onPeerPress ? () => onPeerPress(item) : undefined
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
        className="absolute right-0"
        style={{ bottom: fabBottom }}
        pointerEvents="box-none"
      >
        <Button
          variant="outline"
          size="icon"
          accessibilityLabel={l("CONTACTS.FAB_PAIR_A11Y")}
          onPress={() => navigation.navigate("Pair")}
          className="h-14 w-14 rounded-full border-border shadow-sm shadow-black/10"
        >
          <QrCode color={icon.foreground} size={26} strokeWidth={2} />
        </Button>
      </View>
    </View>
  );
}
