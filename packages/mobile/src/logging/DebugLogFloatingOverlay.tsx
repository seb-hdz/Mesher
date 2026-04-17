import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrushCleaning, Terminal, Trash2, X } from "lucide-react-native";
import {
  clearMemory,
  getEntries,
  subscribe,
  type LogEntry,
} from "./captureStore";
import { useDebugLogUiStore } from "./debugLogUiStore";
import { clearLogFile } from "./fileSink";

function formatClock(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function lineForEntry(e: LogEntry): string {
  return `[${e.level}] (${formatClock(e.ts)}) - ${e.body}`;
}

export function DebugLogFloatingOverlay() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const overlayVisible = useDebugLogUiStore((s) => s.overlayVisible);
  const panelExpanded = useDebugLogUiStore((s) => s.panelExpanded);
  const collapsePanel = useDebugLogUiStore((s) => s.collapsePanel);
  const expandPanel = useDebugLogUiStore((s) => s.expandPanel);

  const [logVersion, setLogVersion] = useState(0);
  useEffect(() => subscribe(() => setLogVersion((v) => v + 1)), []);

  const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

  const entries = useMemo(
    () => [...getEntries()].sort((a, b) => a.ts - b.ts) as LogEntry[],
    [logVersion]
  );
  const palette = isDark
    ? {
        panelBg: "rgba(24,24,28,0.94)",
        headerBorder: "rgba(255,255,255,0.12)",
        text: "#e8e8ed",
        muted: "#9898a6",
        fabBg: "#3b3b45",
        warn: "#fbbf24",
        error: "#f87171",
      }
    : {
        panelBg: "rgba(250,250,252,0.96)",
        headerBorder: "rgba(0,0,0,0.1)",
        text: "#1a1a1e",
        muted: "#5c5c66",
        fabBg: "#2d2d33",
        warn: "#b45309",
        error: "#b91c1c",
      };

  if (!overlayVisible) return null;

  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 99999, elevation: 99999 }]}
      pointerEvents="box-none"
    >
      {panelExpanded ? (
        <View
          style={[
            styles.panel,
            {
              backgroundColor: palette.panelBg,
              borderColor: palette.headerBorder,
              top: insets.top + 8,
              left: 8,
              right: 8,
              bottom: Math.max(insets.bottom, 12) + 8,
            },
          ]}
          pointerEvents="auto"
        >
          <View
            style={[styles.header, { borderBottomColor: palette.headerBorder }]}
          >
            <Text
              style={[
                styles.headerTitle,
                { color: palette.text, fontFamily: mono },
              ]}
            >
              LOGS
            </Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => {
                  clearMemory();
                }}
                hitSlop={8}
                className="flex-row items-center gap-1"
              >
                <BrushCleaning color={palette.muted} size={12} />
                <Text style={[styles.headerBtn, { color: palette.muted }]}>
                  Clear
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void clearLogFile();
                }}
                hitSlop={8}
                className="flex-row items-center gap-1"
              >
                <Trash2 color={palette.muted} size={12} />
                <Text style={[styles.headerBtn, { color: palette.muted }]}>
                  Delete file
                </Text>
              </Pressable>
              <Pressable
                onPress={collapsePanel}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <X color={palette.error} size={16} />
              </Pressable>
            </View>
          </View>
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const color =
                item.level === "ERROR"
                  ? palette.error
                  : item.level === "WARN"
                  ? palette.warn
                  : palette.text;
              return (
                <Text style={[styles.line, { color }]} selectable>
                  {lineForEntry(item)}
                </Text>
              );
            }}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text
                style={[
                  styles.empty,
                  { color: palette.muted, fontFamily: mono },
                ]}
              >
                No captured logs yet.
              </Text>
            }
          />
        </View>
      ) : null}

      {!panelExpanded ? (
        <Pressable
          onPress={expandPanel}
          style={[
            styles.fab,
            {
              backgroundColor: palette.fabBg,
              bottom: Math.max(insets.bottom, 12) + 8,
              right: 12,
            },
          ]}
          pointerEvents="auto"
          accessibilityLabel="Open debug logs"
        >
          <Terminal color="#fff" size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  headerBtn: {
    fontSize: 11,
  },
  closeBtn: {
    marginLeft: 4,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    padding: 10,
    paddingBottom: 20,
  },
  line: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 6,
  },
  empty: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 12,
  },
  fab: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
