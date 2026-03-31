import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function StudentProfileAboutScreen() {
  const { isDark, colors } = useTheme();
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      <AppHeader title="About & Support" onBack={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.appIconContainer}>
              <LinearGradient
                colors={["#f2c44d", "#e8b738"]}
                style={styles.appIcon}
              >
                <Ionicons name="school" size={32} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>Student Portal</Text>
            <Text style={[styles.appDescription, { color: colors.textSecondary }]}>
              Empowering students by connecting them with donors and
              opportunities. We strive to make education accessible and
              equitable for everyone.
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 24, color: colors.text }]}>
            Information & Support
          </Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => router.push("/(dashboard)/student/student-terms")}
            >
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f8f8" }]}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color="#2196F3"
                  />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Terms of Service</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    Read our terms and conditions
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? colors.textSecondary : "#999"} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => router.push("/(dashboard)/student/student-privacy")}
            >
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f8f8" }]}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#4CAF50"
                  />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Privacy Policy</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    Learn how we protect your data
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? colors.textSecondary : "#999"} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => router.push("/(dashboard)/student/student-help-center")}
            >
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f8f8" }]}>
                  <Ionicons
                    name="help-circle-outline"
                    size={20}
                    color="#FF9800"
                  />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Help Center</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    Find answers to common questions
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? colors.textSecondary : "#999"} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              activeOpacity={0.7}
              onPress={() => router.push("/(dashboard)/student/student-contact-support")}
            >
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f8f8" }]}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={20}
                    color="#9C27B0"
                  />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Contact Support</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    Get help from our team
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? colors.textSecondary : "#999"} />
            </TouchableOpacity>
          </View>


        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
    marginTop: 8,
  },
  aboutCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  appIconContainer: {
    marginBottom: 16,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f2c44d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 13,
    marginBottom: 16,
  },
  appDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  settingsCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  copyrightText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 24,
  },
});







