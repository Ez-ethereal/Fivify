import React, { useState } from "react";
import {
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  View,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFormulaStore } from "@/store/formulaStore";
import { parseFormula } from "@/services/api";
import { ImageCapture } from "@/components/ImageCapture";

export default function CaptureScreen() {
  const router = useRouter();
  const setFormula = useFormulaStore((s) => s.setFormula);
  const [loading, setLoading] = useState(false);
  const [pendingCropUri, setPendingCropUri] = useState<string | null>(null);

  const handleMockCapture = async () => {
    setLoading(true);
    try {
      // For now, skip OCR and go straight to parse with the DFT formula
      const mockLatex =
        String.raw`X_k = \frac{1}{N} \sum_{n=0}^{N-1} x_n e^{-\frac{2\pi i}{N}kn}`;
      const data = await parseFormula(mockLatex);
      setFormula(data);
      router.push(`/formula/${data.id}`);
    } catch (err) {
      Alert.alert(
        "Connection Error",
        "Make sure the backend is running on localhost:8000"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelected = (uri: string) => {
    // Navigate to processing screen with the image URI
    router.push({ pathname: "/processing", params: { imageUri: uri } });
  };

  return (
    <View className="flex-1 justify-center p-6 bg-brand-cream">
      <View className="items-center mb-12">
        <FontAwesome name="superscript" size={48} color="#3D4148" />
        <Text className="text-2xl font-bold mt-4 text-brand-charcoal">
          Capture a Formula
        </Text>
        <Text className="text-[15px] text-brand-warmgray text-center mt-2 leading-[22px] px-5">
          Take a photo or use a mock formula to see the semantic highlighter in
          action.
        </Text>
      </View>

      <ImageCapture onImageSelected={handleImageSelected} />

      <View className="flex-row items-center my-6">
        <View className="flex-1 h-px bg-brand-sand" />
        <Text className="mx-4 text-sm text-brand-muted font-medium">OR</Text>
        <View className="flex-1 h-px bg-brand-sand" />
      </View>

      <TouchableOpacity
        className="flex-row bg-brand-cream border-2 border-brand-charcoal py-4 rounded-xl items-center justify-center"
        onPress={handleMockCapture}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#3D4148" />
        ) : (
          <>
            <FontAwesome
              name="magic"
              size={20}
              color="#3D4148"
              style={{ marginRight: 10 }}
            />
            <Text className="text-brand-charcoal text-base font-semibold">
              Try Mock Formula (DFT)
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
