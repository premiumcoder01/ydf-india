import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

export default function ReviewerSettingsScreen() {
  const inset = useSafeAreaInsets();
  const { theme, toggleTheme, isDark, colors } = useTheme();
  const appVersion = Constants.expoConfig?.version;



  const handleHelpSupport = () => {
    router.push("/(dashboard)/reviewer/help-support");
  };

  const handleContactSupport = () => {
    router.push("/(dashboard)/reviewer/contact-support");
  };

  const handleTermsConditions = () => {
    router.push("/(dashboard)/reviewer/terms-conditions");
  };

  const handlePrivacyPolicy = () => {
    router.push("/(dashboard)/reviewer/privacy-policy");
  };

  const handleAbout = () => {
    router.push("/(dashboard)/reviewer/about");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Settings"
        subtitle="Manage your app preferences"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: inset.bottom + 40 }]}
      >
        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>App Preferences</Text>

          <LinearGradient
            colors={isDark ? ["#1E293B", "#0F172A"] : ["#FFFFFF", "#F8FAFC"]}
            style={[styles.settingsCardPremium, { borderColor: isDark ? "#334155" : "#E2E8F0" }]}
          >
            {/* Theme Toggle */}
            <View style={styles.settingItemPremium}>
              <View style={styles.settingLeft}>
                <LinearGradient
                  colors={isDark ? ["rgba(156, 39, 176, 0.3)", "rgba(156, 39, 176, 0.1)"] : ["#F3E5F5", "#EDE7F6"]}
                  style={styles.settingIconPremium}
                >
                  <Ionicons name={isDark ? "moon" : "sunny"} size={20} color="#9C27B0" />
                </LinearGradient>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Theme</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                    {isDark ? "Dark Mode" : "Light Mode"}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#CBD5E1", true: "#6366F1" }}
                thumbColor={Platform.OS === 'ios' ? undefined : "#FFFFFF"}
                ios_backgroundColor="#CBD5E1"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Support & Help */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Support & Help</Text>

          <LinearGradient
            colors={isDark ? ["#1E293B", "#0F172A"] : ["#FFFFFF", "#F8FAFC"]}
            style={[styles.settingsCardPremium, { borderColor: isDark ? "#334155" : "#E2E8F0" }]}
          >


            <View style={[styles.premiumDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]} />

            <TouchableOpacity style={styles.settingItemPremium} onPress={handleContactSupport} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <LinearGradient
                  colors={isDark ? ["rgba(255, 152, 0, 0.3)", "rgba(255, 152, 0, 0.1)"] : ["#FFF3E0", "#FFE0B2"]}
                  style={styles.settingIconPremium}
                >
                  <Ionicons name="mail" size={20} color="#FF9800" />
                </LinearGradient>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Contact Support</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>Raise a support ticket</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? "#475569" : "#CBD5E1"} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Legal & About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Legal & About</Text>

          <LinearGradient
            colors={isDark ? ["#1E293B", "#0F172A"] : ["#FFFFFF", "#F8FAFC"]}
            style={[styles.settingsCardPremium, { borderColor: isDark ? "#334155" : "#E2E8F0" }]}
          >
            <TouchableOpacity style={styles.settingItemPremium} onPress={handleTermsConditions} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <LinearGradient
                  colors={isDark ? ["rgba(100, 116, 139, 0.3)", "rgba(100, 116, 139, 0.1)"] : ["#F1F5F9", "#E2E8F0"]}
                  style={styles.settingIconPremium}
                >
                  <Ionicons name="document-text" size={20} color="#64748B" />
                </LinearGradient>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Terms & Conditions</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>Read our terms of service</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? "#475569" : "#CBD5E1"} />
            </TouchableOpacity>

            <View style={[styles.premiumDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]} />

            <TouchableOpacity style={styles.settingItemPremium} onPress={handlePrivacyPolicy} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <LinearGradient
                  colors={isDark ? ["rgba(3, 169, 244, 0.3)", "rgba(3, 169, 244, 0.1)"] : ["#E1F5FE", "#B3E5FC"]}
                  style={styles.settingIconPremium}
                >
                  <Ionicons name="shield-checkmark" size={20} color="#03A9F4" />
                </LinearGradient>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Privacy Policy</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>How we handle your data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? "#475569" : "#CBD5E1"} />
            </TouchableOpacity>

            <View style={[styles.premiumDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]} />

            <TouchableOpacity style={styles.settingItemPremium} onPress={handleAbout} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <LinearGradient
                  colors={isDark ? ["rgba(76, 175, 80, 0.3)", "rgba(76, 175, 80, 0.1)"] : ["#E8F5E9", "#C8E6C9"]}
                  style={styles.settingIconPremium}
                >
                  <Ionicons name="information-circle" size={20} color="#4CAF50" />
                </LinearGradient>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>About</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>App version and team info</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? "#475569" : "#CBD5E1"} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Copyright Notice */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }]}>
            © {new Date().getFullYear()} Youth Dreamers Foundation. All rights reserved.
          </Text>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    opacity: 0.6,
    marginLeft: 4,
  },
  settingsCardPremium: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  settingItemPremium: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    minHeight: 80,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIconPremium: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  settingSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.8,
  },
  premiumDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  versionContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingVertical: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderStyle: 'dashed',
  },
  versionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  versionValue: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  /* Footer */
  footer: {
    marginTop: 15,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
