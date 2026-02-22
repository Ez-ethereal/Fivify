import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Image,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";
import { sendOCR, parseFormula, testParseFormula } from "@/services/api";
import { useFormulaStore } from "@/store/formulaStore";

// Processing stages
type ProcessingStage = "ocr" | "inference" | "done";

// Progressive messages per stage
const STAGE_MESSAGES: Record<ProcessingStage, string> = {
  ocr: "Processing formula...",
  inference: "Understanding the math...",
  done: "Almost there...",
};

export default function ProcessingScreen() {
  const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
  const router = useRouter();
  const setFormula = useFormulaStore((s) => s.setFormula);

  const [stage, setStage] = useState<ProcessingStage>("ocr");
  const [message, setMessage] = useState(STAGE_MESSAGES.ocr);
  const [showCancel, setShowCancel] = useState(false);

  // Keep track of whether we've navigated away
  const hasNavigated = useRef(false);
  // Ref to track if component is mounted
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Process the image
  useEffect(() => {
    if (!imageUri) {
      router.back();
      return;
    }

    const processImage = async () => {
      try {
        // Stage 1: OCR — image to LaTeX
        const ocrResult = await sendOCR(imageUri);
        console.log('OCR result:', JSON.stringify(ocrResult.latex));

        // Stage 2: AI inference — semantic analysis
        if (isMounted.current) {
          setStage("inference");
          setMessage(STAGE_MESSAGES.inference);
        }

        // Test parse endpoint
        const testParseResult = await testParseFormula(ocrResult.latex);
        console.log('\n=== PARSE RESULT ===');
        console.log('Explanation:', testParseResult.explanation);
        console.log('Components:');
        testParseResult.components.forEach(c => {
          console.log(`  ${c.symbol} → "${c.counterpart}" (${c.role})`);
        });
        console.log('Insights:', testParseResult.insights?.map((s, i) => `  ${i + 1}. ${s}`).join('\n') ?? '(none)');


        // Final parse and navigate
        const formulaData = await parseFormula(testParseResult);

        if (isMounted.current) {
          setStage("done");
          setMessage(STAGE_MESSAGES.done);
        }

        // Save to store and navigate
        if (isMounted.current && !hasNavigated.current) {
          hasNavigated.current = true;
          setFormula(formulaData);
          router.replace(`/formula/${formulaData.id}`);
        }
      } catch (error) {
        if (!isMounted.current || hasNavigated.current) return;

        handleError(error);
      }
    };

    processImage();
  }, [imageUri]);

  const handleError = (error: unknown) => {
    let errorMessage = "Something went wrong";
    let errorCode = "";

    if (axios.isAxiosError(error)) {
      errorCode = `Error ${error.response?.status || "NETWORK"}`;
      errorMessage = error.response?.data?.detail || "Something went wrong";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    Alert.alert("OCR Failed", `${errorMessage}\n\n${errorCode}`, [
      {
        text: "Retry",
        onPress: () => {
          setStage("ocr");
          setMessage(STAGE_MESSAGES.ocr);
          setShowCancel(false);
          // Re-trigger processing by navigating to self
          router.replace({ pathname: "/processing", params: { imageUri } });
        },
      },
      {
        text: "Retake",
        onPress: () => {
          hasNavigated.current = true;
          router.back();
        },
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => {
          hasNavigated.current = true;
          router.back();
        },
      },
    ]);
  };

  const handleCancel = () => {
    hasNavigated.current = true;
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Full-screen image */}
      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
        />
      )}

      {/* Semi-transparent overlay */}
      <View style={styles.overlay}>
        {/* Centered loading content */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C4B19A" />
          <Text style={styles.message}>{message}</Text>

          {/* Cancel button - appears after 5 seconds */}
          {showCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1B19",
  },
  image: {
    width: width,
    height: height,
    position: "absolute",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28, 27, 25, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 32,
  },
  message: {
    color: "#F5F0E8",
    fontSize: 18,
    fontWeight: "500",
    marginTop: 20,
    textAlign: "center",
  },
  cancelButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(196, 177, 154, 0.5)",
  },
  cancelButtonText: {
    color: "#F5F0E8",
    fontSize: 16,
    fontWeight: "500",
  },
});
