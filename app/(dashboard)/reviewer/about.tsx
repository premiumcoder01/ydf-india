import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getAboutPage } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import RenderHtml from "react-native-render-html";

export default function ReviewerAboutScreen() {
  const { isDark, colors } = useTheme();
  const { width } = useWindowDimensions();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const authDataStr = await AsyncStorage.getItem("authData");
        if (authDataStr) {
          const authData = JSON.parse(authDataStr);
          if (authData.token) {
            const res = await getAboutPage(authData.token);
            if (res.success && res.data) {
              setContent(res.data.content || "<p>No content available.</p>");
            } else {
              setContent("<p>Failed to load about page.</p>");
            }
          }
        } else {
          setContent("<p>Please login to view about page.</p>");
        }
      } catch (e) {
        setContent("<p>Failed to load about page.</p>");
      } finally {
        setLoading(false);
      }
    };
    fetchAbout();
  }, []);

  const tagsStyles = {
    body: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 24,
    },
    p: {
      color: colors.textSecondary,
      marginBottom: 10,
    },
    h1: { color: colors.text, marginTop: 20, marginBottom: 10 },
    h2: { color: colors.text, marginTop: 20, marginBottom: 10 },
    h3: { color: colors.text, marginTop: 20, marginBottom: 10 },
    a: { color: colors.primary, textDecorationLine: 'none' },
    li: { color: colors.textSecondary },
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#121212", "#1e1e1e"] : ["#fff", "#f8f9fa"]}
        style={styles.background}
      />

      <ReviewerHeader title="About & Support" />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* About Content Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.appIconContainer}>
              <LinearGradient
                colors={["#667eea", "#764ba2"]}
                style={styles.appIcon}
              >
                <Ionicons name="business" size={32} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>Reviewer Portal</Text>
            <Text style={[styles.appVersion, { color: colors.textSecondary }]}>Version 1.0.0</Text>

            <RenderHtml
              contentWidth={width - 80}
              source={{ html: content }}
              tagsStyles={tagsStyles as any}
              systemFonts={["System", "sans-serif"]}
            />
          </View>

          {/* Information & Support Section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Information & Support
          </Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => router.push("/(dashboard)/reviewer/terms-conditions")}
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
              onPress={() => router.push("/(dashboard)/reviewer/help-support")}
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
              onPress={() => router.push("/(dashboard)/reviewer/contact-support")}
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

          <Text style={[styles.copyrightText, { color: colors.textSecondary }]}>
            © 2025 YDF India. All rights reserved.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    alignItems: "center",
    marginBottom: 24,
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
    shadowColor: "#667eea",
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
    marginBottom: 24,
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
  },
});
