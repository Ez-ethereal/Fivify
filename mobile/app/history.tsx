import React from "react";
import {
  FlatList,
  TouchableOpacity,
  View,
  Text,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFormulaStore } from "@/store/formulaStore";
import { FormulaData } from "@/types/formula";

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const history = useFormulaStore((s) => s.history);
  const setFormula = useFormulaStore((s) => s.setFormula);

  const handleSelect = (item: FormulaData) => {
    setFormula(item);
    router.push(`/formula/${item.id}`);
  };

  const navigateBack = () => {
    router.back();
  };

  return (
    <View
      className="flex-1 bg-brand-cream"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-6 pt-4 pb-4 flex-row items-center border-b border-brand-sand">
        <TouchableOpacity
          onPress={navigateBack}
          activeOpacity={0.7}
          className="w-10 h-10 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(196, 177, 154, 0.2)" }}
        >
          <FontAwesome name="chevron-left" size={16} color="#3D4148" />
        </TouchableOpacity>
        <View className="flex-1 items-center mr-10">
          <Text className="text-lg font-bold text-brand-charcoal">
            Your Formulas
          </Text>
        </View>
      </View>

      {history.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(196, 177, 154, 0.2)" }}
          >
            <FontAwesome name="bookmark-o" size={32} color="#A89F95" />
          </View>
          <Text className="text-lg font-semibold text-brand-charcoal">
            No formulas yet
          </Text>
          <Text className="text-sm text-brand-muted mt-2 text-center max-w-[240px]">
            Capture or upload a formula to see it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id + item.timestamp}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="p-4 rounded-xl bg-brand-surface border border-brand-sand"
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <Text
                className="text-sm text-brand-charcoal"
                style={{ fontFamily: "SpaceMono" }}
                numberOfLines={1}
              >
                {item.latex}
              </Text>
              <View className="flex-row items-center mt-2">
                <View className="flex-row items-center mr-4">
                  <FontAwesome
                    name="code"
                    size={10}
                    color="#A89F95"
                    style={{ marginRight: 4 }}
                  />
                  <Text className="text-xs text-brand-muted">
                    {item.micro?.tokens ? `${item.micro.tokens.length} tokens` : "—"}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <FontAwesome
                    name="object-group"
                    size={10}
                    color="#A89F95"
                    style={{ marginRight: 4 }}
                  />
                  <Text className="text-xs text-brand-muted">
                    {item.macro.groups.length} groups
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
