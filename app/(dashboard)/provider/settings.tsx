import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Linking, ScrollView, StyleProp, StyleSheet, Switch, Text, TouchableOpacity, View, ViewStyle } from "react-native";

export default function ProviderSettingsScreen() {
  const router = useRouter();
  const { theme, toggleTheme, isDark, colors } = useTheme();
  const [language, setLanguage] = useState("English");
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifyInApp, setNotifyInApp] = useState(true);

  const openLinkOrSoon = async (url?: string) => {
    try {
      if (url) {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      }
    } catch { }
    Alert.alert("Coming soon", "This will be available soon.");
  };

  const confirmLogout = () => {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: { color: colors.textSecondary } as any },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            try {
              // Clear authData from AsyncStorage
              await AsyncStorage.removeItem("authData");

              // Navigate to welcome screen
              router.replace("/(auth)/welcome");
            } catch (error) {
              console.error("Error during logout:", error);
              // Even if there's an error, try to navigate to welcome screen
              router.replace("/(auth)/welcome");
            }
          },
        },
      ]
    );
  };

  type SettingCardProps = { children: React.ReactNode; style?: StyleProp<ViewStyle> };
  const SettingCard: React.FC<SettingCardProps> = ({ children, style }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: isDark ? "#000" : "#000" }, style]}>
      {children}
    </View>
  );

  type SettingRowProps = {
    icon?: keyof typeof Ionicons.glyphMap | any;
    label: string;
    value?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    subtitle?: string;
  };
  const SettingRow: React.FC<SettingRowProps> = ({ icon, label, value, onPress, rightElement, subtitle }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={onPress ? 0.6 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.2)" : "#EEF2FF" }]}>
            <Ionicons name={icon} size={22} color={colors.primary} />
          </View>
        )}
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.rowRight}>
        {value && <Text style={[styles.value, { color: colors.primary }]}>{value}</Text>}
        {rightElement}
        {onPress && !rightElement && (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={styles.chevron} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader title="Settings" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
          <SettingCard>
            <SettingRow
              icon="moon-outline"
              label="Dark Mode"
              subtitle="Toggle dark theme"
              rightElement={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: isDark ? "#374151" : "#E5E7EB", true: "#818CF8" }}
                  thumbColor={isDark ? "#6366F1" : "#F3F4F6"}
                  ios_backgroundColor={isDark ? "#374151" : "#E5E7EB"}
                />
              }
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="language-outline"
              label="Language"
              subtitle="Select your preferred language"
              value={language}
              onPress={() => setLanguage(language === "English" ? "Hindi" : "English")}
            />
          </SettingCard>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notifications</Text>
          <SettingCard>
            <SettingRow
              icon="notifications-outline"
              label="Push Notifications"
              subtitle="Receive alerts and updates"
              rightElement={
                <Switch
                  value={notifyPush}
                  onValueChange={setNotifyPush}
                  trackColor={{ false: isDark ? "#374151" : "#E5E7EB", true: "#818CF8" }}
                  thumbColor={notifyPush ? "#6366F1" : "#F3F4F6"}
                  ios_backgroundColor={isDark ? "#374151" : "#E5E7EB"}
                />
              }
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="mail-outline"
              label="Email Notifications"
              subtitle="Get updates via email"
              rightElement={
                <Switch
                  value={notifyEmail}
                  onValueChange={setNotifyEmail}
                  trackColor={{ false: isDark ? "#374151" : "#E5E7EB", true: "#818CF8" }}
                  thumbColor={notifyEmail ? "#6366F1" : "#F3F4F6"}
                  ios_backgroundColor={isDark ? "#374151" : "#E5E7EB"}
                />
              }
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="chatbox-outline"
              label="In-App Notifications"
              subtitle="Show notifications within app"
              rightElement={
                <Switch
                  value={notifyInApp}
                  onValueChange={setNotifyInApp}
                  trackColor={{ false: isDark ? "#374151" : "#E5E7EB", true: "#818CF8" }}
                  thumbColor={notifyInApp ? "#6366F1" : "#F3F4F6"}
                  ios_backgroundColor={isDark ? "#374151" : "#E5E7EB"}
                />
              }
            />
          </SettingCard>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
          <SettingCard>
            <SettingRow
              icon="person-outline"
              label="Profile Settings"
              onPress={() => router.push("/(dashboard)/provider/profile")}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="shield-checkmark-outline"
              label="Privacy & Security"
              onPress={() => Alert.alert("Coming soon", "This will be available soon.")}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="key-outline"
              label="Change Password"
              onPress={() => router.push("/(auth)/reset")}
            />
          </SettingCard>
        </View>

        {/* Support Section */}
        {/* <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
          <SettingCard>
            <SettingRow
              icon="help-circle-outline"
              label="Help Center"
              onPress={() => openLinkOrSoon()}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="information-circle-outline"
              label="About"
              onPress={() => router.push("/(dashboard)/provider/about")}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="document-text-outline"
              label="Terms & Conditions"
              onPress={() => router.push("/(dashboard)/provider/terms-conditions")}
            />
          </SettingCard>
        </View> */}


        <Text style={[styles.version, { color: colors.textSecondary }]}>App Version 1.0.0</Text>
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: 16,
    padding: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 64,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
  },
  chevron: {
    marginLeft: 4,
  },
  divider: {
    height: 1,
    marginLeft: 70,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EF4444",
  },
  version: {
    textAlign: "center",
    fontWeight: "500",
    fontSize: 13,
    marginTop: 24,
    marginBottom: 8,
  },
  bottomPadding: {
    height: 20,
  },
});