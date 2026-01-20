import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

export default function ReviewerSettingsScreen() {
  const inset = useSafeAreaInsets();
  const { theme, toggleTheme, isDark, colors } = useTheme();



  const handleHelpSupport = () => {
    router.push("/(dashboard)/reviewer/help-support");
  };

  const handleContactSupport = () => {
    router.push("/(dashboard)/reviewer/contact-support");
  };

  const handleTermsConditions = () => {
    router.push("/(dashboard)/reviewer/terms-conditions");
  };

  const handleAbout = () => {
    router.push("/(dashboard)/reviewer/about");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Settings"
        subtitle="App preferences and preferences"
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: inset.bottom + 20 }}>
        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>App Preferences</Text>

          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            {/* Theme Toggle */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: isDark ? "rgba(156, 39, 176, 0.2)" : "#f5f5f5" }]}>
                  <Ionicons name="moon-outline" size={20} color="#9C27B0" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Theme</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                    {isDark ? "Dark Mode" : "Light Mode"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.themeToggle}
                onPress={toggleTheme}
                activeOpacity={0.8}
              >
                <View style={[styles.themeToggleBg, isDark && styles.themeToggleBgActive]}>
                  <View style={[styles.themeToggleThumb, isDark && styles.themeToggleThumbActive]} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Support & Help */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Support & Help</Text>

          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.settingItem} onPress={handleHelpSupport} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: isDark ? "rgba(33, 150, 243, 0.2)" : "#f5f5f5" }]}>
                  <Ionicons name="help-circle-outline" size={20} color="#2196F3" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Help & Support</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>FAQs and documentation</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.settingItem} onPress={handleContactSupport} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: isDark ? "rgba(255, 152, 0, 0.2)" : "#f5f5f5" }]}>
                  <Ionicons name="mail-outline" size={20} color="#FF9800" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Contact Support</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>Raise a support ticket</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal & About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Legal & About</Text>

          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.settingItem} onPress={handleTermsConditions} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: isDark ? "rgba(102, 102, 102, 0.2)" : "#f5f5f5" }]}>
                  <Ionicons name="document-text-outline" size={20} color="#666" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Terms & Conditions</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>Read our terms of service</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.settingItem} onPress={handleAbout} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: isDark ? "rgba(76, 175, 80, 0.2)" : "#f5f5f5" }]}>
                  <Ionicons name="information-circle-outline" size={20} color="#4CAF50" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>About</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>App version and team info</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Version */}
        <View style={styles.section}>
          <View style={[styles.versionCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>App Version</Text>
            <Text style={[styles.versionNumber, { color: colors.text }]}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  settingsCard: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginLeft: 76,
  },
  themeToggle: {
    padding: 4,
  },
  themeToggleBg: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  themeToggleBgActive: {
    backgroundColor: "#6366F1",
  },
  themeToggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  themeToggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  versionCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  versionText: {
    fontSize: 14,
    marginBottom: 4,
  },
  versionNumber: {
    fontSize: 18,
    fontWeight: "700",
  },
});
