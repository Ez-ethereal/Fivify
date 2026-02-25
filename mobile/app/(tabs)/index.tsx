import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { ImageCapture } from "@/components/ImageCapture";
import { FormulaDemo } from "@/components/FormulaDemo";

function FadeInSection({
  delay,
  children,
  style,
}: {
  delay: number;
  children: React.ReactNode;
  style?: object;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 450 }));
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

export default function CaptureScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleImageSelected = (uri: string) => {
    router.push({ pathname: "/processing", params: { imageUri: uri } });
  };

  const navigateToHistory = () => {
    router.push("/history");
  };

  return (
    <View
      className="flex-1 bg-brand-cream"
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingHorizontal: 28,
      }}
    >
      <StatusBar barStyle="dark-content" />

      {/* ── Wordmark ───────────────────────────────── */}
      <FadeInSection delay={0}>
        <View style={{ paddingTop: 20 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "900",
              color: "#3D4148",
              letterSpacing: -0.5,
            }}
          >
            Fivify
          </Text>
        </View>
      </FadeInSection>

      {/* ── Spacer: absorbs 2/3 of leftover vertical space ── */}
      <View style={{ flex: 2 }} />

      {/* ── Hero Text ──────────────────────────────── */}
      <FadeInSection delay={100}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: "800",
            color: "#3D4148",
            letterSpacing: -1,
            lineHeight: 38,
          }}
        >
          Understand the math,{"\n"}
          <Text style={{ color: "#8A827A" }}>not just the symbols</Text>
        </Text>
      </FadeInSection>

      {/* ── Formula Demo Card ──────────────────────── */}
      <View style={{ paddingTop: 24 }}>
        <FormulaDemo />
      </View>

      {/* ── Subtitle ───────────────────────────────── */}
      <FadeInSection delay={700}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "500",
            color: "#8A827A",
            lineHeight: 22,
            maxWidth: 300,
            paddingTop: 16,
            paddingBottom: 20,
          }}
        >
          Capture any formula and see it come alive with color-coded
          breakdowns
        </Text>
      </FadeInSection>

      {/* ── Spacer: absorbs 1/3 of leftover vertical space ── */}
      <View style={{ flex: 1 }} />

      {/* ── Action Buttons ─────────────────────────── */}
      <FadeInSection delay={900}>
        <View style={{ paddingBottom: 12 }}>
          <ImageCapture onImageSelected={handleImageSelected} />

          {/* Divider */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginVertical: 14,
            }}
          >
            <View
              style={{ flex: 1, height: 1, backgroundColor: "#D4C5AE" }}
            />
            <Text
              style={{
                marginHorizontal: 16,
                fontSize: 11,
                fontWeight: "600",
                letterSpacing: 2,
                color: "#A89F95",
                textTransform: "uppercase",
              }}
            >
              or
            </Text>
            <View
              style={{ flex: 1, height: 1, backgroundColor: "#D4C5AE" }}
            />
          </View>

          {/* View Your Formulas */}
          <TouchableOpacity
            onPress={navigateToHistory}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 15,
              paddingHorizontal: 24,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(196, 177, 154, 0.5)",
              backgroundColor: "rgba(237, 231, 219, 0.5)",
            }}
          >
            <FontAwesome
              name="folder-open-o"
              size={16}
              color="#6B6560"
              style={{ marginRight: 10 }}
            />
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: "#6B6560",
              }}
            >
              View Your Formulas
            </Text>
          </TouchableOpacity>
        </View>
      </FadeInSection>

      {/* ── Footer ─────────────────────────────────── */}
      <FadeInSection delay={1100}>
        <View style={{ paddingBottom: 12, paddingTop: 8 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: "#A89F95",
              letterSpacing: 0.5,
              textAlign: "center",
            }}
          >
            Math, vivified.
          </Text>
        </View>
      </FadeInSection>
    </View>
  );
}
