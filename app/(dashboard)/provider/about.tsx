import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProviderAboutScreen() {
  const { isDark, colors } = useTheme();

  const handleLinkPress = async (url: string, title: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", `Cannot open ${title}`);
      }
    } catch (error) {
      Alert.alert("Error", `Failed to open ${title}`);
      console.error("Link error:", error);
    }
  };

  const handleEmailPress = () => {
    handleLinkPress("mailto:support@ydf.org", "Email");
  };

  const handleWebsitePress = () => {
    handleLinkPress("https://ydf.org", "Website");
  };

  const handleTermsPress = () => {
    handleLinkPress("https://ydf.org/terms", "Terms of Service");
  };

  const handlePrivacyPress = () => {
    handleLinkPress("https://ydf.org/privacy", "Privacy Policy");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="About"
        subtitle="Learn more about YDF Provider Portal"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* App Info Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.logoRow}>
            <View style={[styles.logoContainer, { backgroundColor: isDark ? colors.surface : "#f5f5f5" }]}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.appInfo}>
              <Text style={[styles.appName, { color: colors.text }]}>YDF Provider Portal</Text>
              <View style={[styles.versionBadge, { backgroundColor: isDark ? colors.surface : "#f5f5f5" }]}>
                <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version 1.0.0</Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Simplifying scholarship management for providers and students with an intuitive,
            powerful workflow. Empowering education through seamless connection.
          </Text>

          <View style={[styles.statsRow, { backgroundColor: isDark ? colors.surface : "#f8f9fa" }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>10K+</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Students</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>500+</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Scholarships</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>100+</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Providers</Text>
            </View>
          </View>
        </View>

        {/* Features Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>✨ Key Features</Text>
          <View style={styles.featuresList}>
            <FeatureItem
              icon="create-outline"
              text="Easy scholarship creation & management"
            />
            <FeatureItem
              icon="people-outline"
              text="Student application tracking"
            />
            <FeatureItem
              icon="analytics-outline"
              text="Real-time analytics & insights"
            />
            <FeatureItem
              icon="notifications-outline"
              text="Automated notifications"
            />
          </View>
        </View>

        {/* Team & Credits Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>👥 Team & Credits</Text>
          <View style={styles.creditItem}>
            <Ionicons name="code-slash-outline" size={20} color={colors.textSecondary} />
            <View style={styles.creditText}>
              <Text style={[styles.creditLabel, { color: colors.textSecondary }]}>Development</Text>
              <Text style={[styles.creditValue, { color: colors.text }]}>YDF Engineering Team</Text>
            </View>
          </View>

          <View style={styles.creditItem}>
            <Ionicons name="color-palette-outline" size={20} color={colors.textSecondary} />
            <View style={styles.creditText}>
              <Text style={[styles.creditLabel, { color: colors.textSecondary }]}>Design & Product</Text>
              <Text style={[styles.creditValue, { color: colors.text }]}>YDF Design Studio</Text>
            </View>
          </View>

          <View style={styles.creditItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
            <View style={styles.creditText}>
              <Text style={[styles.creditLabel, { color: colors.textSecondary }]}>Quality Assurance</Text>
              <Text style={[styles.creditValue, { color: colors.text }]}>YDF QA Team</Text>
            </View>
          </View>
        </View>

        {/* Contact Us Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📞 Contact Us</Text>

          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: isDark ? colors.surface : "#f8f9fa" }]}
            onPress={handleEmailPress}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIcon, { backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "#eff6ff" }]}>
              <Ionicons name="mail-outline" size={20} color="#2563EB" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Email Support</Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>support@ydf.org</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: isDark ? colors.surface : "#f8f9fa" }]}
            onPress={handleWebsitePress}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIcon, { backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "#eff6ff" }]}>
              <Ionicons name="globe-outline" size={20} color="#2563EB" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Website</Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>www.ydf.org</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Legal Links Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 Legal & Policies</Text>

          <TouchableOpacity
            style={[styles.linkButton, { backgroundColor: isDark ? colors.surface : "#f8f9fa" }]}
            onPress={handleTermsPress}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={20} color="#2563EB" />
            <Text style={styles.linkText}>Terms of Service</Text>
            <Ionicons name="open-outline" size={16} color="#2563EB" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkButton, { backgroundColor: isDark ? colors.surface : "#f8f9fa" }]}
            onPress={handlePrivacyPress}
            activeOpacity={0.7}
          >
            <Ionicons name="lock-closed-outline" size={20} color="#2563EB" />
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={16} color="#2563EB" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkButton, { backgroundColor: isDark ? colors.surface : "#f8f9fa" }]}
            onPress={() => handleLinkPress("https://ydf.org/licenses", "Licenses")}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
            <Text style={styles.linkText}>Open Source Licenses</Text>
            <Ionicons name="open-outline" size={16} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Made with ❤️ by YDF Team
          </Text>
          <Text style={[styles.copyright, { color: colors.textSecondary }]}>
            © 2025 Youth Development Foundation. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Feature Item Component
const FeatureItem = ({ icon, text }: { icon: string; text: string }) => {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIconContainer, { backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "#eff6ff" }]}>
        <Ionicons name={icon as any} size={18} color="#2563EB" />
      </View>
      <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
  },

  // Logo Section
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  appInfo: {
    marginLeft: 16,
    flex: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  versionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  versionText: {
    fontWeight: "600",
    fontSize: 12,
  },

  divider: {
    height: 1,
    marginBottom: 16,
  },

  description: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "400",
    marginBottom: 20,
  },

  // Stats Section
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  // Features
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },

  // Credits
  creditItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  creditText: {
    marginLeft: 12,
    flex: 1,
  },
  creditLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  creditValue: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Contact Buttons
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Link Buttons
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  linkText: {
    fontSize: 15,
    color: "#2563EB",
    fontWeight: "600",
    flex: 1,
    marginLeft: 12,
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  copyright: {
    fontSize: 13,
    fontWeight: "500",
  },
});