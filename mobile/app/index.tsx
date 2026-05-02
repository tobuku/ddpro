import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import { analyzeProperty } from "../lib/api";
import { propertyAnalysisRequestSchema, type PropertyAnalysisResult } from "../../shared/schema";
import AddressInput from "../components/AddressInput";
import RiskScoreCard from "../components/RiskScoreCard";
import CategoryBreakdown from "../components/CategoryBreakdown";
import RiskFactors from "../components/RiskFactors";
import { TouchableOpacity } from "react-native";

export default function HomeScreen() {
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [result, setResult] = useState<PropertyAnalysisResult | null>(null);

  const mutation = useMutation({
    mutationFn: analyzeProperty,
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error: Error) => {
      Alert.alert("Analysis Failed", error.message || "Please try again.");
    },
  });

  const handleAnalyze = () => {
    setAddressError("");
    const parsed = propertyAnalysisRequestSchema.safeParse({ address });
    if (!parsed.success) {
      setAddressError(parsed.error.errors[0].message);
      return;
    }
    mutation.mutate(address);
  };

  const handleReset = () => {
    setResult(null);
    setAddress("");
    setAddressError("");
    mutation.reset();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-slate-50"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-slate-800">Due Diligence Pro</Text>
          <Text className="text-slate-500 text-sm mt-1">Analyze property investment risks instantly</Text>
        </View>

        {/* Input Card */}
        <View className="bg-white rounded-xl shadow p-5 mb-6">
          <Text className="text-base font-semibold text-slate-700 mb-3">Property Analysis</Text>
          <AddressInput
            value={address}
            onChangeText={(t) => {
              setAddress(t);
              if (addressError) setAddressError("");
            }}
            error={addressError}
            placeholder="e.g., 123 Main St, Honolulu, HI 96813"
          />

          <TouchableOpacity
            onPress={handleAnalyze}
            disabled={mutation.isPending}
            className={`mt-4 rounded-lg py-4 items-center justify-center ${
              mutation.isPending ? "bg-slate-400" : "bg-slate-600"
            }`}
          >
            {mutation.isPending ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#fff" size="small" />
                <Text className="text-white font-semibold text-base ml-2">Analyzing...</Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-base">Analyze Property</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Results */}
        {result && (
          <View>
            {/* Analyzed address */}
            <View className="bg-slate-100 rounded-lg px-4 py-3 mb-4">
              <Text className="text-xs text-slate-500 mb-1">Analyzed Property</Text>
              <Text className="text-slate-700 font-medium">{result.address}</Text>
            </View>

            <RiskScoreCard result={result} />
            <CategoryBreakdown categories={result.riskCategories} />
            <RiskFactors factors={result.riskFactors} />

            {/* Reset button */}
            <TouchableOpacity
              onPress={handleReset}
              className="mt-4 border border-slate-300 rounded-lg py-4 items-center bg-white"
            >
              <Text className="text-slate-600 font-semibold">Analyze Another Property</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
