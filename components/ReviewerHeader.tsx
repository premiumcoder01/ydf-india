import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ReviewerHeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export default function ReviewerHeader({
  title,
  subtitle,
  rightElement,
  showBackButton = true,
  onBackPress,
}: ReviewerHeaderProps) {
  const inset = useSafeAreaInsets();
  const { isDark, colors } = useTheme();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={[
      styles.header,
      {
        paddingTop: inset.top,
        backgroundColor: isDark ? "#0f0f0f" : colors.card,
        borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : colors.border
      }
    ]}>
      <View style={styles.headerRow}>
        {showBackButton && (
          <TouchableOpacity
            onPress={handleBackPress}
            style={[styles.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }]}
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
        {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: "500",
  },
  rightElement: {
    alignItems: "center",
    justifyContent: "center",
  },
});

