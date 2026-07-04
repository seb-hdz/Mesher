import { useMemo, useState, useCallback, useRef } from "react";
import { LayoutChangeEvent, StyleSheet, View, type ViewProps } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useColorScheme } from "react-native";
import {
  buildMeshGraph,
  MESH_NODE_COUNT,
  MESH_WORLD_SIZE,
} from "./meshGraph";

type Props = {
  neighborCount: number;
  accessibilityLabel: string;
} & Pick<ViewProps, "style">;

const NODE_R = 7;
const CONNECTED_GREEN = "#22c55e";
const NODE_GRAY_LIGHT = "#94a3b8";
const NODE_GRAY_DARK = "#64748b";

export function MeshNetworkCanvas({ neighborCount, accessibilityLabel, style }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { nodes, edges } = useMemo(() => buildMeshGraph(), []);

  const [layout, setLayout] = useState({ w: 0, h: 0 });

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const didCenterRef = useRef(false);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setLayout({ w: width, h: height });
      if (width > 0 && height > 0 && !didCenterRef.current) {
        didCenterRef.current = true;
        tx.value = (width - MESH_WORLD_SIZE) / 2;
        ty.value = (height - MESH_WORLD_SIZE) / 2;
      }
    },
    [tx, ty],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          startTx.value = tx.value;
          startTy.value = ty.value;
        })
        .onUpdate((e) => {
          tx.value = startTx.value + e.translationX;
          ty.value = startTy.value + e.translationY;
        }),
    [],
  );

  const graphStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  const connected = Math.min(Math.max(0, neighborCount), MESH_NODE_COUNT);

  const edgeStroke = isDark ? "rgba(148, 163, 184, 0.42)" : "rgba(148, 163, 184, 0.45)";
  const nodeGray = isDark ? NODE_GRAY_DARK : NODE_GRAY_LIGHT;

  const gradTop = isDark ? "#f87171" : "#38bdf8";
  const gradTopOpacity = isDark ? 0.38 : 0.5;

  return (
    <View
      style={[styles.root, style]}
      onLayout={onLayout}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {layout.w > 0 && layout.h > 0 ? (
        <GestureDetector gesture={pan}>
          <View style={styles.fill}>
            <Svg
              width={layout.w}
              height={layout.h}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Defs>
                <LinearGradient id="meshSkyFade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={gradTop} stopOpacity={gradTopOpacity} />
                  <Stop offset="0.55" stopColor={gradTop} stopOpacity={gradTopOpacity * 0.25} />
                  <Stop offset="1" stopColor={gradTop} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={layout.w} height={layout.h} fill="url(#meshSkyFade)" />
            </Svg>

            <Animated.View
              pointerEvents="box-none"
              style={[
                {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: MESH_WORLD_SIZE,
                  height: MESH_WORLD_SIZE,
                },
                graphStyle,
              ]}
            >
              <Svg width={MESH_WORLD_SIZE} height={MESH_WORLD_SIZE} viewBox={`0 0 ${MESH_WORLD_SIZE} ${MESH_WORLD_SIZE}`}>
                {edges.map((e) => (
                  <Path
                    key={`${e.i}-${e.j}`}
                    d={e.pathD}
                    stroke={edgeStroke}
                    strokeWidth={1.5}
                    fill="none"
                  />
                ))}
                {nodes.map((p, index) => (
                  <Circle
                    key={index}
                    cx={p.x}
                    cy={p.y}
                    r={NODE_R}
                    fill={index < connected ? CONNECTED_GREEN : nodeGray}
                  />
                ))}
              </Svg>
            </Animated.View>
          </View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: "hidden",
  },
  fill: {
    flex: 1,
  },
});
