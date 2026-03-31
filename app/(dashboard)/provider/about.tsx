import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getAboutPage } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { MotiView } from "moti";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import RenderHtml from "react-native-render-html";

export default function ProviderAboutScreen() {
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
      fontFamily: 'System',
    },
    p: {
      color: colors.textSecondary,
      marginBottom: 16,
      lineHeight: 24,
    },
    h1: {
      color: colors.text,
      marginTop: 24,
      marginBottom: 12,
      fontSize: 24,
      fontWeight: '700',
    },
    h2: {
      color: colors.text,
      marginTop: 24,
      marginBottom: 12,
      fontSize: 20,
      fontWeight: '700',
    },
    h3: {
      color: colors.text,
      marginTop: 20,
      marginBottom: 12,
      fontSize: 18,
      fontWeight: '700',
    },
    h4: {
      color: colors.text,
      marginTop: 18,
      marginBottom: 10,
      fontSize: 16,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    strong: {
      color: colors.text,
      fontWeight: '700',
    },
    a: {
      color: colors.primary,
      textDecorationLine: 'none',
      fontWeight: '600',
    },
    ul: {
      marginBottom: 16,
      paddingLeft: 4,
    },
    li: {
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 22,
    },
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#ffffff", "#ffffff", "#f8f9fa"]}
        style={styles.background}
        locations={[0, 0.4, 1]}
      />

      <AppHeader title="About Us" onBack={() => router.back()} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >


            {/* Main Content Card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <RenderHtml
                contentWidth={width - 72}
                source={{ html: content }}
                tagsStyles={tagsStyles as any}
                systemFonts={["System", "sans-serif"]}
              />
            </View>

            {/* Support Links Section */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Help & Support
            </Text>

            <View style={styles.linksContainer}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push("/(dashboard)/provider/terms-conditions")}
                style={[styles.linkRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.linkLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: "rgba(33, 150, 243, 0.1)" }]}>
                    <Ionicons name="document-text-outline" size={20} color="#2196F3" />
                  </View>
                  <View>
                    <Text style={[styles.linkText, { color: colors.text }]}>Terms of Service</Text>
                    <Text style={[styles.linkSubtext, { color: colors.textSecondary }]}>View policies and conditions</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push("/(dashboard)/provider/help-support")}
                style={[styles.linkRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.linkLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: "rgba(255, 152, 0, 0.1)" }]}>
                    <Ionicons name="help-circle-outline" size={20} color="#FF9800" />
                  </View>
                  <View>
                    <Text style={[styles.linkText, { color: colors.text }]}>Help Center</Text>
                    <Text style={[styles.linkSubtext, { color: colors.textSecondary }]}>FAQs and guides</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push("/(dashboard)/provider/contact-support")}
                style={[styles.linkRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.linkLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: "rgba(156, 39, 176, 0.1)" }]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#9C27B0" />
                  </View>
                  <View>
                    <Text style={[styles.linkText, { color: colors.text }]}>Contact Support</Text>
                    <Text style={[styles.linkSubtext, { color: colors.textSecondary }]}>Get direct assistance</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerSubText, { color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }]}>
                © {new Date().getFullYear()} Youth Dreamers Foundation. All rights reserved.
              </Text>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </MotiView>
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
    padding: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  appIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  versionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  linksContainer: {
    gap: 12,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  linkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  linkSubtext: {
    fontSize: 12,
    opacity: 0.8,
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerSubText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});