import { View, Text } from "react-native";
import type { RiskCategory } from "../../shared/schema";

interface Props {
  categories: RiskCategory[];
}

const levelConfig = {
  "Low Risk": { badgeBg: "bg-green-100", badgeText: "text-green-800", barColor: "bg-green-500" },
  "Medium Risk": { badgeBg: "bg-yellow-100", badgeText: "text-yellow-800", barColor: "bg-yellow-500" },
  "High Risk": { badgeBg: "bg-red-100", badgeText: "text-red-800", barColor: "bg-red-500" },
};

const categoryEmoji: Record<string, string> = {
  "Market Risk": "📈",
  "Location Risk": "📍",
  "Property Risk": "🏠",
};

export default function CategoryBreakdown({ categories }: Props) {
  return (
    <View className="bg-white rounded-xl shadow p-5 mb-4">
      <Text className="text-base font-semibold text-slate-700 mb-4">Risk Category Breakdown</Text>
      {categories.map((cat, i) => {
        const cfg = levelConfig[cat.level];
        return (
          <View key={i} className={`${i < categories.length - 1 ? "mb-5" : ""}`}>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-base">{categoryEmoji[cat.name] ?? "📊"}</Text>
                <Text className="text-sm font-semibold text-slate-800 ml-1">{cat.name}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className={`${cfg.badgeBg} rounded-full px-2 py-0.5`}>
                  <Text className={`${cfg.badgeText} text-xs font-medium`}>{cat.level}</Text>
                </View>
                <Text className="text-lg font-bold text-slate-800 ml-1">{cat.score}</Text>
              </View>
            </View>
            <View className="w-full bg-slate-200 rounded-full h-2.5 mb-1">
              <View
                className={`${cfg.barColor} h-2.5 rounded-full`}
                style={{ width: `${cat.score}%` }}
              />
            </View>
            <Text className="text-xs text-slate-500">{cat.description}</Text>
          </View>
        );
      })}
    </View>
  );
}
