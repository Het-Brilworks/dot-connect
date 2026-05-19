import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Image,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FloatingDots } from "../components/FloatingDots";
import { COLOR_HEX, GRID_SIZE, MIN_CHAIN } from "../game/constants";
import {
  initGrid,
  isValidChainAddition,
  processChain,
} from "../game/gameEngine";
import { getHighScore, saveHighScore } from "../game/storage";
import type { Cell, Grid, Position } from "../game/types";

// ─── Bomb image map (one PNG per color) ──────────────────────────────────────

const BOMB_IMAGES = {
  red: require("../../assets/images/red.png"),
  blue: require("../../assets/images/blue.png"),
  yellow: require("../../assets/images/yellow.png"),
  pink: require("../../assets/images/pink.png"),
} as const;

// ─── Rainbow Star ────────────────────────────────────────────────────────────

function RainbowStar({ size }: { size: number }) {
  const half = size / 2;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: half,
        overflow: "hidden",
        flexDirection: "row",
        flexWrap: "wrap",
      }}
    >
      <View
        style={{ width: half, height: half, backgroundColor: COLOR_HEX.red }}
      />
      <View
        style={{ width: half, height: half, backgroundColor: COLOR_HEX.blue }}
      />
      <View
        style={{ width: half, height: half, backgroundColor: COLOR_HEX.yellow }}
      />
      <View
        style={{ width: half, height: half, backgroundColor: COLOR_HEX.pink }}
      />
    </View>
  );
}

// ─── Cell Content ─────────────────────────────────────────────────────────────

interface Connectors {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

function CellContent({
  cell,
  size,
  selected,
  connectors,
}: {
  cell: Cell | null;
  size: number;
  selected: boolean;
  connectors: Connectors;
}) {
  if (!cell) return <View style={{ width: size, height: size }} />;

  const color = COLOR_HEX[cell.color];
  const dotSize = size * 0.76;
  const thick = size * 0.34;
  const halfThick = thick / 2;
  const connColor = cell.type === "rainbow" ? "#9C64DD" : color;
  const scale = selected ? 1.15 : 1;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Connectors */}
      {connectors.top && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: size / 2 - halfThick,
            width: thick,
            height: size / 2,
            backgroundColor: connColor,
          }}
        />
      )}
      {connectors.bottom && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: size / 2 - halfThick,
            width: thick,
            height: size / 2,
            backgroundColor: connColor,
          }}
        />
      )}
      {connectors.left && (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: size / 2 - halfThick,
            width: size / 2,
            height: thick,
            backgroundColor: connColor,
          }}
        />
      )}
      {connectors.right && (
        <View
          style={{
            position: "absolute",
            right: 0,
            top: size / 2 - halfThick,
            width: size / 2,
            height: thick,
            backgroundColor: connColor,
          }}
        />
      )}

      {/* Dot */}
      {cell.type === "dot" && (
        <View
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: color,
            transform: [{ scale }],
            shadowColor: color,
            shadowOffset: { width: 0, height: selected ? 5 : 2 },
            shadowOpacity: selected ? 0.7 : 0.3,
            shadowRadius: selected ? 8 : 4,
            elevation: selected ? 8 : 3,
          }}
        />
      )}

      {/* Bomb — uses color-matched PNG with number overlaid */}
      {cell.type === "bomb" && (
        <View
          style={{
            width: size * 0.9,
            height: size * 0.9,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale }],
          }}
        >
          <Image
            source={BOMB_IMAGES[cell.color]}
            style={{ position: "absolute", width: "100%", height: "100%" }}
            resizeMode="contain"
          />
          {/* Number sits on the bomb body (lower-center of the image) */}
          <Text
            selectable={false}
            style={{
              color: "#fff",
              fontWeight: "900",
              fontSize: size * 0.28,
              marginTop: size * 0.2,
              marginLeft: -size * 0.15,
              textShadowColor: "rgba(0,0,0,0.55)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}
          >
            {cell.bombCount}
          </Text>
        </View>
      )}

      {/* Row bar */}
      {cell.type === "rowBar" && (
        <View
          style={{
            width: dotSize,
            height: dotSize * 0.38,
            borderRadius: 8,
            backgroundColor: color,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: selected ? 1.12 : 1 }],
            elevation: selected ? 6 : 2,
          }}
        >
          <Text
            selectable={false}
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: 10,
              fontWeight: "700",
            }}
          >
            ◀ ▶
          </Text>
        </View>
      )}

      {/* Col bar */}
      {cell.type === "colBar" && (
        <View
          style={{
            width: dotSize * 0.38,
            height: dotSize,
            borderRadius: 8,
            backgroundColor: color,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: selected ? 1.12 : 1 }],
            elevation: selected ? 6 : 2,
          }}
        >
          <Text
            selectable={false}
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: 8,
              fontWeight: "700",
            }}
          >
            {"▲\n▼"}
          </Text>
        </View>
      )}

      {/* Rainbow */}
      {cell.type === "rainbow" && (
        <View style={{ transform: [{ scale }], elevation: selected ? 8 : 3 }}>
          <RainbowStar size={dotSize} />
        </View>
      )}
    </View>
  );
}

// ─── Animated Cell (module-level to satisfy hook rules) ──────────────────────

function AnimatedCell({
  isNew,
  dropY,
  dropOpacity,
  absLeft,
  absTop,
  size,
  children,
}: {
  isNew: boolean;
  dropY: SharedValue<number>;
  dropOpacity: SharedValue<number>;
  absLeft: number;
  absTop: number;
  size: number;
  children: React.ReactNode;
}) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isNew ? dropY.value : 0 }],
    opacity: isNew ? dropOpacity.value : 1,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: absLeft,
          top: absTop,
          width: size,
          height: size,
        },
        animStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ─── Game Screen ──────────────────────────────────────────────────────────────

const MAX_GRID = 450;

export default function GameScreen() {
  const { width: winW } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const GRID_W = Math.min(winW - 32, MAX_GRID);
  const CELL = GRID_W / GRID_SIZE;

  const [grid, setGrid] = useState<Grid>(() => initGrid());
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [chain, setChain] = useState<Position[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [newCellIds, setNewCellIds] = useState<Set<number>>(new Set());

  // Refs for PanResponder (avoids stale closures)
  const gridRef = useRef<Grid>(grid);
  const chainRef = useRef<Position[]>([]);
  const scoreRef = useRef(0);
  const isGameOverRef = useRef(false);
  const gridViewRef = useRef<View>(null);
  const gridPosRef = useRef({ x: 0, y: 0 });
  const cellSizeRef = useRef(CELL);
  const prevCellIdsRef = useRef<Set<number> | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lazy init: track initial cell IDs so first-move new cells are identified correctly
  if (!prevCellIdsRef.current) {
    prevCellIdsRef.current = new Set(
      grid
        .flat()
        .filter(Boolean)
        .map((c) => c!.id),
    );
  }

  // Reanimated shared values for the drop animation
  const dropY = useSharedValue(0);
  const dropOpacity = useSharedValue(1);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);
  useEffect(() => {
    cellSizeRef.current = CELL;
  }, [CELL]);

  useEffect(() => {
    getHighScore().then((hs) => setHighScore(hs));
  }, []);

  const handleGridLayout = useCallback((_e: LayoutChangeEvent) => {
    setTimeout(() => {
      gridViewRef.current?.measureInWindow((x, y) => {
        gridPosRef.current = { x, y };
      });
    }, 50);
  }, []);

  function cellFromTouch(pageX: number, pageY: number): Position | null {
    const { x, y } = gridPosRef.current;
    const cs = cellSizeRef.current;
    const col = Math.floor((pageX - x) / cs);
    const row = Math.floor((pageY - y) / cs);
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      return { row, col };
    }
    return null;
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isGameOverRef.current,
      onMoveShouldSetPanResponder: () => !isGameOverRef.current,

      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const pos = cellFromTouch(pageX, pageY);
        if (!pos || !gridRef.current[pos.row][pos.col]) return;
        chainRef.current = [pos];
        setChain([pos]);
      },

      onPanResponderMove: (evt) => {
        if (chainRef.current.length === 0) return;
        const { pageX, pageY } = evt.nativeEvent;
        const pos = cellFromTouch(pageX, pageY);
        if (!pos) return;

        const cur = chainRef.current;
        const last = cur[cur.length - 1];
        if (last.row === pos.row && last.col === pos.col) return;

        // Drag back to undo last dot
        if (cur.length >= 2) {
          const prev = cur[cur.length - 2];
          if (prev.row === pos.row && prev.col === pos.col) {
            const trimmed = cur.slice(0, -1);
            chainRef.current = trimmed;
            setChain([...trimmed]);
            return;
          }
        }

        if (isValidChainAddition(cur, pos, gridRef.current)) {
          const extended = [...cur, pos];
          chainRef.current = extended;
          setChain(extended);
        }
      },

      onPanResponderRelease: () => {
        const cur = chainRef.current;
        chainRef.current = [];
        setChain([]);
        if (cur.length < MIN_CHAIN) return;

        const result = processChain(cur, gridRef.current);
        gridRef.current = result.newGrid;

        // Identify which cells are brand new (just spawned from the top)
        const oldIds = prevCellIdsRef.current!;
        const newIds = new Set<number>();
        result.newGrid.flat().forEach((cell) => {
          if (cell && !oldIds.has(cell.id)) newIds.add(cell.id);
        });
        prevCellIdsRef.current = new Set(
          result.newGrid
            .flat()
            .filter(Boolean)
            .map((c) => c!.id),
        );

        // Trigger drop animation for new cells
        if (newIds.size > 0) {
          const dropDist = cellSizeRef.current * 1.5;
          dropY.value = -dropDist;
          dropOpacity.value = 0;
          dropY.value = withSpring(0, { damping: 15, stiffness: 140 });
          dropOpacity.value = withTiming(1, { duration: 220 });

          setNewCellIds(newIds);
          if (animTimerRef.current) clearTimeout(animTimerRef.current);
          animTimerRef.current = setTimeout(
            () => setNewCellIds(new Set()),
            500,
          );
        }

        setGrid(result.newGrid);

        if (result.score > 0) {
          const next = scoreRef.current + result.score;
          scoreRef.current = next;
          setScore(next);
          setHighScore((hs) => {
            if (next > hs) {
              saveHighScore(next);
              return next;
            }
            return hs;
          });
        }

        if (result.gameOver) {
          isGameOverRef.current = true;
          setIsGameOver(true);
        }
      },

      onPanResponderTerminate: () => {
        chainRef.current = [];
        setChain([]);
      },
    }),
  ).current;

  function restartGame() {
    const ng = initGrid();
    gridRef.current = ng;
    prevCellIdsRef.current = new Set(
      ng
        .flat()
        .filter(Boolean)
        .map((c) => c!.id),
    );
    chainRef.current = [];
    scoreRef.current = 0;
    isGameOverRef.current = false;
    setGrid(ng);
    setChain([]);
    setScore(0);
    setIsGameOver(false);
    setNewCellIds(new Set());
  }

  const chainSet = useMemo(() => {
    const s = new Set<string>();
    chain.forEach((p) => s.add(`${p.row},${p.col}`));
    return s;
  }, [chain]);

  function getConnectors(row: number, col: number): Connectors {
    if (!chainSet.has(`${row},${col}`)) {
      return { top: false, bottom: false, left: false, right: false };
    }
    const idx = chain.findIndex((p) => p.row === row && p.col === col);
    const adj = (r: number, c: number) => {
      const ni = chain.findIndex((p) => p.row === r && p.col === c);
      return ni !== -1 && Math.abs(ni - idx) === 1;
    };
    return {
      top: adj(row - 1, col),
      bottom: adj(row + 1, col),
      left: adj(row, col - 1),
      right: adj(row, col + 1),
    };
  }

  const n = chain.length;
  const previewPts = n >= MIN_CHAIN ? n * Math.max(1, n - 2) * 10 : 0;

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 8 },
      ]}
    >
      {/* ── Floating dots background (same as home screen) ── */}
      <FloatingDots />

      {/* ── Header ── */}
      <View style={[styles.header, { marginTop: 20 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("/")}
        >
          <Text selectable={false} style={styles.backText}>
            ✕
          </Text>
        </TouchableOpacity>
        <View style={styles.scoreBox}>
          <Text selectable={false} style={styles.scoreLbl}>
            SCORE
          </Text>
          <Text selectable={false} style={styles.scoreVal}>
            {score}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.scoreBox}>
          <Text selectable={false} style={styles.scoreLbl}>
            BEST
          </Text>
          <Text selectable={false} style={styles.scoreVal}>
            {highScore}
          </Text>
        </View>
      </View>

      {/* ── Centered content ── */}
      <View style={styles.center}>
        {/* Hint bar */}
        <View style={styles.hintRow}>
          {n > 0 ? (
            <Text
              selectable={false}
              style={[styles.hint, n < MIN_CHAIN && styles.hintWarn]}
            >
              {n < MIN_CHAIN
                ? `${MIN_CHAIN - n} more to go…`
                : `${n} dots  ✓  +${previewPts} pts${n >= 6 ? "  🌈" : ""}`}
            </Text>
          ) : (
            <Text selectable={false} style={styles.hintIdle}>
              Drag to connect same-color dots
            </Text>
          )}
        </View>

        {/* Grid */}
        <View
          ref={gridViewRef}
          style={[styles.grid, { width: GRID_W, height: GRID_W }]}
          onLayout={handleGridLayout}
          {...panResponder.panHandlers}
        >
          {grid.map((row, ri) =>
            row.map((cell, ci) => (
              <AnimatedCell
                key={cell?.id ?? `e-${ri}-${ci}`}
                isNew={cell !== null && newCellIds.has(cell.id)}
                dropY={dropY}
                dropOpacity={dropOpacity}
                absLeft={ci * CELL}
                absTop={ri * CELL}
                size={CELL}
              >
                <CellContent
                  cell={cell}
                  size={CELL}
                  selected={chainSet.has(`${ri},${ci}`)}
                  connectors={getConnectors(ri, ci)}
                />
              </AnimatedCell>
            )),
          )}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {[
            ["💣", "bomb"],
            ["◀▶", "row"],
            ["▲▼", "col"],
            ["🌈", "wildcard"],
          ].map(([icon, label]) => (
            <View key={label} style={styles.legendItem}>
              <Text selectable={false} style={styles.legendIcon}>
                {icon}
              </Text>
              <Text selectable={false} style={styles.legendText}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Game Over Modal ── */}
      <Modal transparent visible={isGameOver} animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.card, { width: Math.min(winW - 48, 320) }]}>
            <Text selectable={false} style={styles.goEmoji}>
              💥
            </Text>
            <Text selectable={false} style={styles.goTitle}>
              Game Over!
            </Text>
            <Text selectable={false} style={styles.goScore}>
              {score}
            </Text>
            <Text selectable={false} style={styles.goLbl}>
              SCORE
            </Text>
            {score > 0 && score >= highScore && (
              <Text selectable={false} style={styles.record}>
                🏆 New Record!
              </Text>
            )}
            <TouchableOpacity style={styles.replayBtn} onPress={restartGame}>
              <Text selectable={false} style={styles.replayText}>
                PLAY AGAIN
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.homeLink}
              onPress={() => router.replace("/")}
            >
              <Text selectable={false} style={styles.homeLinkText}>
                Home
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#12122A",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: MAX_GRID + 48,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
    alignSelf: "center",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  backText: { color: "#aaa", fontSize: 14, fontWeight: "700" },
  scoreBox: { flex: 1, alignItems: "center" },
  scoreLbl: {
    color: "#555",
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  scoreVal: { color: "#fff", fontSize: 28, fontWeight: "900", lineHeight: 34 },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  // ── center section fills remaining height and centers grid
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: 14,
    paddingHorizontal: 16,
  },
  hintRow: { height: 22 },
  hint: { color: COLOR_HEX.yellow, fontSize: 13, fontWeight: "700" },
  hintWarn: { color: "#666" },
  hintIdle: { color: "#3a3a5c", fontSize: 12 },
  grid: {
    backgroundColor: "#FAFAFD",
    borderRadius: 20,
    overflow: "hidden",
    // native shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 14,
    // subtle inner glow border
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendIcon: { fontSize: 13 },
  legendText: { color: "#444", fontSize: 11, fontWeight: "500" },
  // ── Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 40,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
  },
  goEmoji: { fontSize: 44, marginBottom: 4 },
  goTitle: { fontSize: 24, fontWeight: "800", color: "#1A1A2E" },
  goScore: {
    fontSize: 64,
    fontWeight: "900",
    color: COLOR_HEX.red,
    lineHeight: 72,
  },
  goLbl: { fontSize: 11, fontWeight: "700", letterSpacing: 3, color: "#bbb" },
  record: {
    fontSize: 16,
    fontWeight: "700",
    color: COLOR_HEX.yellow,
    marginTop: 4,
  },
  replayBtn: {
    backgroundColor: COLOR_HEX.red,
    paddingHorizontal: 0,
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 18,
    width: "100%",
    alignItems: "center",
    shadowColor: COLOR_HEX.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  replayText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 2,
  },
  homeLink: { marginTop: 6, paddingVertical: 6 },
  homeLinkText: { color: "#bbb", fontSize: 13, fontWeight: "600" },
});
