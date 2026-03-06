import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import { Animated, Platform, TextInput, TouchableOpacity, View } from "react-native";

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
  const { isDark } = useTheme();
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

  const hasValue = value.length > 0;

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
          // Fixed height avoids Android's unreliable paddingVertical on TextInput rows
          height: 48,
          borderWidth: 1.5,
          borderColor: hasValue
            ? isDark ? "rgba(108,99,255,0.6)" : "rgba(108,99,255,0.45)"
            : borderColor,
          shadowColor: hasValue ? "#6C63FF" : "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: hasValue ? 0.18 : 0.06,
          shadowRadius: 8,
          // elevation on Android always renders a GREY shadow — shadowColor is iOS-only
          // Use 0 on Android to avoid the ugly default grey box shadow
          elevation: Platform.OS === "android" ? 0 : (hasValue ? 4 : 1),
        }}
      >
        <Ionicons
          name="search-outline"
          size={19}
          color={hasValue ? "#6C63FF" : iconColor}
        />
        <TextInput
          style={{
            flex: 1,
            marginLeft: 10,
            fontSize: 15,
            // fontWeight "500" is not supported on Android default fonts — causes misalignment
            fontWeight: Platform.OS === "android" ? "400" : "500",
            color: textColor,
            // Critical Android fixes:
            textAlignVertical: "center",
            includeFontPadding: false,
            padding: 0,
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
        {hasValue && (
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
