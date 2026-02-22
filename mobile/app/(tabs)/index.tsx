import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ImageCapture } from "@/components/ImageCapture";

export default function CaptureScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleImageSelected = (uri: string) => {
    router.push({ pathname: "/processing", params: { imageUri: uri } });
  };

  const navigateToHistory = () => {
    router.push("/(tabs)/history");
  };

  return (
    <View
      className="flex-1 bg-brand-cream"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header with Fivify wordmark matching splash screen */}
      <View className="px-8 pt-6">
        <View className="flex-row items-center">
          <View className="h-[1px] flex-1 bg-brand-sand" />
          <View className="mx-4">
            <Text
              style={{
                fontSize: 24,
                fontWeight: "900",
                color: "#3D4148",
                letterSpacing: -0.5,
              }}
            >
              Fivify
            </Text>
          </View>
          <View className="h-[1px] flex-1 bg-brand-sand" />
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 justify-center px-8">
        {/* Hero Section */}
        <View className="items-center mb-10">
          {/* Icon cluster representing math symbols */}
          <View className="mb-6 flex-row items-center">
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center mr-[-8px]"
              style={{ backgroundColor: "rgba(196, 177, 154, 0.25)" }}
            >
              <FontAwesome name="superscript" size={28} color="#3D4148" />
            </View>
            <View
              className="w-14 h-14 rounded-xl items-center justify-center z-10 border-2 border-brand-cream"
              style={{ backgroundColor: "#EDE7DB" }}
            >
              <Text className="text-2xl text-brand-charcoal font-bold">∑</Text>
            </View>
          </View>

          <Text
            className="text-[28px] font-bold text-brand-charcoal text-center tracking-tight"
            style={{ lineHeight: 34 }}
          >
            Understand the math,{"\n"}not just the symbols
          </Text>

          <Text className="text-[15px] text-brand-warmgray text-center mt-4 leading-[22px] max-w-[280px]">
            Capture any formula and see it come alive with color-coded breakdowns
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="w-full">
          <ImageCapture onImageSelected={handleImageSelected} />

          {/* Subtle divider */}
          <View className="flex-row items-center my-5">
            <View className="flex-1 h-[1px] bg-brand-sand" />
            <Text className="mx-4 text-[11px] tracking-[2px] text-brand-muted uppercase">
              or
            </Text>
            <View className="flex-1 h-[1px] bg-brand-sand" />
          </View>

          {/* View Your Formulas Button - matching "Choose from Gallery" contrast */}
          <TouchableOpacity
            className="flex-row items-center justify-center py-4 px-6 rounded-xl border border-brand-tan"
            onPress={navigateToHistory}
            activeOpacity={0.7}
            style={{
              backgroundColor: "rgba(196, 177, 154, 0.15)",
            }}
          >
            <FontAwesome
              name="folder-open-o"
              size={18}
              color="#3D4148"
              style={{ marginRight: 10 }}
            />
            <Text className="text-brand-charcoal text-[15px] font-semibold">
              View Your Formulas
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer - brand tagline */}
      <View className="px-8 pb-8">
        <Text
          className="text-center text-brand-warmgray"
          style={{ fontSize: 15, fontWeight: "500", letterSpacing: 0.5, opacity: 0.7 }}
        >
          Math, vivified.
        </Text>
      </View>
    </View>
  );
}
