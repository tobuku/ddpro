import { View, Text } from "react-native";
import type { PropertyAnalysisResult } from "../../shared/schema";

interface Props {
  result: PropertyAnalysisResult;
}

const riskConfig = {
  low: {
    badgeBg: "bg-green-100",
    badgeText: "text-green-800",
    barColor: "bg-green-500",
  },
  medium: {
    badgeBg: "bg-yellow-100",
    badgeText: "text-yellow-800",
    barColor: "bg-yellow-500",
  },
  high: {
    badgeBg: "bg-red-100",
    badgeText: "text-red-800",
    barColor: "bg-red-500",
  },
};

export default function RiskScoreCard({ result }: Props) {
  const config = riskConfig[result.riskCategory];

  return (
    <View className="bg-white rounded-xl shadow p-5 mb-4">
      <Text className="text-base font-semibold text-slate-700 mb-4">Overall Risk Score</Text>

      {/* Score bar */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm text-slate-500">Score</Text>
        <Text className="text-3xl font-bold text-slate-800">{result.riskScore}</Text>
      </View>
      <View className="w-full bg-slate-200 rounded-full h-4 mb-1">
        <View
          className={`${config.barColor} h-4 rounded-full`}
          style={{ width: `${result.riskScore}%` }}
        />
      </View>
      <View className="flex-row justify-between mb-4">
        <Text className="text-xs text-slate-400">0 (High Risk)</Text>
        <Text className="text-xs text-slate-400">100 (Low Risk)</Text>
      </View>

      {/* Badge + description */}
      <View className={`${config.badgeBg} rounded-lg px-4 py-3`}>
        <Text className={`${config.badgeText} font-bold text-lg text-center mb-1`}>
          {result.riskLevel}
        </Text>
        <Text className="text-slate-600 text-sm text-center">{result.description}</Text>
      </View>
    </View>
  );
}
