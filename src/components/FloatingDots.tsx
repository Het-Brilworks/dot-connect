import React, { useEffect, useRef } from "react";
import { Animated, View, useWindowDimensions } from "react-native";
import { COLOR_HEX } from "../game/constants";

const DOTS = [
  { color: COLOR_HEX.red,    topPct: 0.06, leftPct: 0.07, size: 26, delay: 0 },
  { color: COLOR_HEX.blue,   topPct: 0.11, leftPct: 0.84, size: 20, delay: 150 },
  { color: COLOR_HEX.yellow, topPct: 0.21, leftPct: 0.17, size: 14, delay: 300 },
  { color: COLOR_HEX.pink,   topPct: 0.06, leftPct: 0.61, size: 30, delay: 80 },
  { color: COLOR_HEX.blue,   topPct: 0.29, leftPct: 0.91, size: 12, delay: 220 },
  { color: COLOR_HEX.yellow, topPct: 0.38, leftPct: 0.04, size: 10, delay: 340 },
  { color: COLOR_HEX.pink,   topPct: 0.44, leftPct: 0.95, size: 14, delay: 120 },
  { color: COLOR_HEX.red,    topPct: 0.71, leftPct: 0.05, size: 22, delay: 100 },
  { color: COLOR_HEX.yellow, topPct: 0.79, leftPct: 0.89, size: 26, delay: 50 },
  { color: COLOR_HEX.pink,   topPct: 0.67, leftPct: 0.31, size: 10, delay: 260 },
  { color: COLOR_HEX.blue,   topPct: 0.84, leftPct: 0.56, size: 18, delay: 180 },
  { color: COLOR_HEX.red,    topPct: 0.91, leftPct: 0.24, size: 16, delay: 330 },
  { color: COLOR_HEX.blue,   topPct: 0.55, leftPct: 0.02, size: 8,  delay: 200 },
  { color: COLOR_HEX.yellow, topPct: 0.50, leftPct: 0.93, size: 10, delay: 280 },
  { color: COLOR_HEX.red,    topPct: 0.93, leftPct: 0.75, size: 20, delay: 160 },
];

function Dot({ color, top, left, size, delay }: {
  color: string; top: number; left: number; size: number; delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 2400 + (delay % 900),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 2400 + (delay % 900),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.15, 0.28, 0.15],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

export function FloatingDots() {
  const { width: winW, height: winH } = useWindowDimensions();

  return (
    <View style={{ position: "absolute", inset: 0 as any }} pointerEvents="none">
      {DOTS.map((d, i) => (
        <Dot
          key={i}
          color={d.color}
          top={winH * d.topPct}
          left={winW * d.leftPct}
          size={d.size}
          delay={d.delay}
        />
      ))}
    </View>
  );
}
