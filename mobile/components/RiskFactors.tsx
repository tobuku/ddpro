import { View, Text } from "react-native";
import type { RiskFactor } from "../../shared/schema";

interface Props {
  factors: RiskFactor[];
}

const levelConfig = {
  Poor: { barColor: "bg-red-500", textColor: "text-red-600" },
  Average: { barColor: "bg-yellow-500", textColor: "text-yellow-600" },
  Good: { barColor: "bg-green-500", textColor: "text-green-600" },
  Excellent: { barColor: "bg-blue-500", textColor: "text-blue-600" },
};

export default function RiskFactors({ factors }: Props) {
  return (
    <View className="bg-white rounded-xl shadow p-5 mb-4">
      <Text className="text-base font-semibold text-slate-700 mb-4">Key Risk Factors</Text>
      {factors.map((factor, i) => {
        const cfg = levelConfig[factor.level] ?? levelConfig.Average;
        return (
          <View key={i} className={`${i < factors.length - 1 ? "mb-4" : ""}`}>
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-sm font-medium text-slate-700">{factor.name}</Text>
              <Text className={`text-sm font-medium ${cfg.textColor}`}>{factor.level}</Text>
            </View>
            <View className="w-full bg-slate-200 rounded-full h-2">
              <View
                className={`${cfg.barColor} h-2 rounded-full`}
                style={{ width: `${factor.score}%` }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
