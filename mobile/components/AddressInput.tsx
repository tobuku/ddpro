import { View, Text, TextInput, TextInputProps } from "react-native";

interface AddressInputProps extends Omit<TextInputProps, "value" | "onChangeText"> {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
}

export default function AddressInput({ value, onChangeText, error, placeholder, ...props }: AddressInputProps) {
  return (
    <View>
      <Text className="text-sm font-medium text-slate-700 mb-1">Property Address</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        className={`border rounded-lg px-4 py-3 text-slate-800 bg-white text-base ${
          error ? "border-red-400" : "border-slate-300"
        }`}
        {...props}
      />
      {error ? (
        <Text className="text-red-500 text-xs mt-1">{error}</Text>
      ) : (
        <Text className="text-slate-400 text-xs mt-1">Include city and state (e.g., 123 Main St, Honolulu, HI)</Text>
      )}
    </View>
  );
}
