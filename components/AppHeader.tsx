import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  title: string;
  onBack?: () => void;
  rightIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
};

export default function AppHeader({ title, onBack, rightIcon, rightElement }: Props) {
  const inset = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
        paddingTop: inset.top,
        backgroundColor: isDark ? colors.background : "#fff",
        borderBottomWidth: 1,
        borderColor: isDark ? colors.border : "#f0f0f0",
      }}
    >
      <TouchableOpacity onPress={onBack} style={{ padding: 8, marginLeft: -8 }}>
        <Ionicons name="arrow-back" size={24} color={isDark ? colors.text : "#333"} />
      </TouchableOpacity>
      <Text style={{ fontSize: 22, fontWeight: "700", color: isDark ? colors.text : "#333", letterSpacing: -0.5 }}>
        {title}
      </Text>
      {!rightElement && !rightIcon ? (
        <TouchableOpacity style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={24} color={isDark ? colors.background : "#fff"} />
        </TouchableOpacity>
      ) : (
        <View style={{ padding: 8, marginRight: -8, borderWidth: 1, borderColor: "#fff" }}>{rightElement || rightIcon}</View>
      )}
    </View>
  );
}