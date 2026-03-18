import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HelloWave } from "./HelloWave";

type DashboardHeaderProps = {
  userName: string;
  profilePhotoUrl?: string | null;
  unreadCount?: number;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
};

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
  profilePhotoUrl,
  unreadCount = 0,
  onNotificationPress,
  onProfilePress,
}) => {
  const { isDark, colors } = useTheme();
  const inset = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: inset.top + 16 }]}>
      <View style={styles.content}>
        {/* Left Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: isDark ? "rgba(255,255,255,0.55)" : "#666" }]}>
            Welcome Back,
          </Text>
          <View style={styles.nameRow}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
              {userName}
            </Text>
            <HelloWave />
          </View>
        </View>

        {/* Right Actions Section */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onNotificationPress}
            activeOpacity={0.7}
            style={[
              styles.actionBtn,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                borderColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.05)"
              }
            ]}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.accent || "#F2C44D" }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onProfilePress} activeOpacity={0.8} style={styles.avatarWrapper}>
            <View style={[styles.avatarBorder, { borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)" }]}>
              {profilePhotoUrl ? (
                <Image
                  source={{
                    uri: profilePhotoUrl.includes('?')
                      ? `${profilePhotoUrl}&t=${Date.now()}`
                      : `${profilePhotoUrl}?t=${Date.now()}`
                  }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" }]}>
                  <Ionicons name="person-outline" size={20} color={colors.text} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeSection: {
    flex: 1,
    marginRight: 12,
  },
  welcomeText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  badgeText: {
    color: "#000",
    fontSize: 9,
    fontWeight: "800",
  },
  avatarWrapper: {},
  avatarBorder: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1.5,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
