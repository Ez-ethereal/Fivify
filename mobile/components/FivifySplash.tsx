import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const SPLASH_DISPLAY_MS = 2000;
const FADE_OUT_MS = 500;

interface FivifySplashProps {
  onFinished: () => void;
}

/**
 * Branded initialization screen matching the Fivify logo:
 * warm tan background, crossed pencil & ruler icon, bold wordmark.
 *
 * Starts at full opacity so the native splash can hand off seamlessly.
 * Holds for SPLASH_DISPLAY_MS, then fades out and calls onFinished
 * so the parent can unmount it.
 */
export default function FivifySplash({ onFinished }: FivifySplashProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Hide the native splash now that this component is mounted and opaque
    SplashScreen.hideAsync();

    // Gentle scale spring while holding
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Hold, then fade out
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(() => {
        onFinished();
      });
    }, SPLASH_DISPLAY_MS);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View
        style={[styles.content, { transform: [{ scale: scaleAnim }] }]}
      >
        {/* Crossed pencil & ruler icon */}
        <View style={styles.iconContainer}>
          <View style={styles.pencilWrap}>
            <MaterialCommunityIcons
              name="lead-pencil"
              size={64}
              color="#3D4148"
            />
          </View>
          <View style={styles.rulerWrap}>
            <MaterialCommunityIcons name="ruler" size={64} color="#3D4148" />
          </View>
        </View>

        {/* Wordmark */}
        <Text style={styles.wordmark}>Fivify</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>Math, vivified.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#C4B19A",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  content: {
    alignItems: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  pencilWrap: {
    position: "absolute",
    transform: [{ rotate: "45deg" }],
  },
  rulerWrap: {
    position: "absolute",
    transform: [{ rotate: "-45deg" }],
  },
  wordmark: {
    fontSize: 48,
    fontWeight: "900",
    color: "#3D4148",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: "#3D4148",
    opacity: 0.6,
    marginTop: 8,
    fontWeight: "500",
    letterSpacing: 1,
  },
});
