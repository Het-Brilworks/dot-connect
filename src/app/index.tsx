import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FloatingDots } from "../components/FloatingDots";
import { COLOR_HEX } from "../game/constants";

const COLORS = [COLOR_HEX.red, COLOR_HEX.blue, COLOR_HEX.yellow, COLOR_HEX.pink];

export default function HomeScreen() {
  const { width: winW } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Entry animations
  const titleAnim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(dotsAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.spring(titleAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }),
      Animated.spring(btnAnim, { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const contentMaxW = Math.min(winW, 480);

  return (
    <View style={styles.root}>
      {/* Floating background dots */}
      <FloatingDots />

      {/* Centered card */}
      <View
        style={[
          styles.card,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, maxWidth: contentMaxW },
        ]}
      >
        {/* Four colored logo dots */}
        <Animated.View
          style={[
            styles.logoRow,
            {
              opacity: dotsAnim,
              transform: [
                {
                  translateY: dotsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {COLORS.map((c, i) => (
            <View key={i} style={[styles.logoDot, { backgroundColor: c }]} />
          ))}
        </Animated.View>

        {/* Title */}
        <Animated.View
          style={{
            opacity: titleAnim,
            transform: [
              {
                translateY: titleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
            alignItems: "center",
          }}
        >
          <Text style={styles.title}>DOT</Text>
          <Text style={styles.subtitle}>CONNECT</Text>
          <View style={styles.rule} />
          <Text style={styles.tagline}>Connect • Clear • Conquer</Text>
        </Animated.View>

        {/* Play button */}
        <Animated.View
          style={{
            opacity: btnAnim,
            transform: [
              {
                scale: btnAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
              },
            ],
            width: "100%",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <TouchableOpacity
            style={styles.playBtn}
            onPress={() => router.push("/game")}
            activeOpacity={0.85}
          >
            <Text style={styles.playText}>PLAY</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Dot color swatches below button */}
        <Animated.View style={[styles.swatchRow, { opacity: btnAnim }]}>
          {COLORS.map((c, i) => (
            <View key={i} style={[styles.swatch, { backgroundColor: c }]} />
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#12122A",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  logoRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 8,
  },
  logoDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 80,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 10,
    textShadowColor: "rgba(233,30,99,0.5)",
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 20,
    lineHeight: 88,
  },
  subtitle: {
    fontSize: 30,
    fontWeight: "700",
    color: COLOR_HEX.yellow,
    letterSpacing: 14,
    marginTop: -6,
  },
  rule: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLOR_HEX.pink,
    marginTop: 20,
    marginBottom: 12,
  },
  tagline: {
    color: "#3a3a6a",
    fontSize: 13,
    letterSpacing: 1.5,
    fontWeight: "500",
  },
  playBtn: {
    backgroundColor: COLOR_HEX.red,
    paddingHorizontal: 72,
    paddingVertical: 20,
    borderRadius: 50,
    shadowColor: COLOR_HEX.red,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 10,
    marginTop: 8,
  },
  playText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 8,
  },
  swatchRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.5,
  },
});
