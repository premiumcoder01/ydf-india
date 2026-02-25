import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import { Animated, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  value: string;
  placeholder?: string;
  onChangeText: (t: string) => void;
  onClear?: () => void;
  style?: any;
};

export default function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = "Search...",
  style,
}: Props) {
  const { isDark, colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.01,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handleBlur = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const bgColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const borderColor = isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.09)";
  const iconColor = isDark ? "rgba(255,255,255,0.55)" : "#888";
  const textColor = isDark ? "#fff" : "#111";
  const placeholderColor = isDark ? "rgba(255,255,255,0.4)" : "#aaa";

  return (
    <View style={[{ paddingHorizontal: 16, paddingVertical: 8 }, style]}>
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: bgColor,
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 11,
          borderWidth: 1.5,
          borderColor: value.length > 0
            ? isDark ? "rgba(108,99,255,0.6)" : "rgba(108,99,255,0.45)"
            : borderColor,
          shadowColor: value.length > 0 ? "#6C63FF" : "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: value.length > 0 ? 0.18 : 0.06,
          shadowRadius: 8,
          elevation: value.length > 0 ? 4 : 1,
        }}
      >
        <Ionicons
          name="search-outline"
          size={19}
          color={value.length > 0 ? "#6C63FF" : iconColor}
        />
        <TextInput
          style={{
            flex: 1,
            marginLeft: 10,
            fontSize: 15,
            fontWeight: "500",
            color: textColor,
            minHeight: 22,
            letterSpacing: 0.1,
          }}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={false}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={onClear}
            style={{
              padding: 4,
              backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.07)",
              borderRadius: 10,
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={14} color={iconColor} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}
