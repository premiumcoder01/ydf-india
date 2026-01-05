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

export default function AboutScreen() {
  const inset = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const handlePrivacyPolicy = () => {
    // Navigate to privacy policy
    alert("Privacy Policy will open in a new window");
  };

  const handleTermsConditions = () => {
    router.push("/(dashboard)/reviewer/terms-conditions");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="About"
        subtitle="App information and team"
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: inset.bottom + 20 }}
      >
        {/* App Logo and Info */}
        <View style={[styles.appInfoCard, { backgroundColor: colors.card }]}>
          <View style={styles.logoContainer}>
            <View style={[styles.logoPlaceholder, { backgroundColor: isDark ? colors.surface : "#E3F2FD" }]}>
              <Ionicons name="school-outline" size={48} color={isDark ? colors.primary : "#2196F3"} />
            </View>
          </View>

          <Text style={[styles.appName, { color: colors.text }]}>Scholarship Review App</Text>
          <Text style={[styles.appVersion, { color: colors.textSecondary }]}>Version 1.0.0</Text>
          <Text style={[styles.appDescription, { color: colors.textSecondary }]}>
            A comprehensive platform for reviewing and managing scholarship applications with advanced document verification and decision management tools.
          </Text>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About This App</Text>

          <View style={[styles.aboutCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
              The Scholarship Review App is designed to streamline the scholarship application review process. Our platform provides reviewers with powerful tools to efficiently evaluate applications, verify documents, and make informed decisions.
            </Text>

            <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
              Built with modern technology and user experience in mind, this app ensures secure, fair, and transparent scholarship review processes while maintaining the highest standards of data protection and privacy.
            </Text>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Features</Text>

          <View style={[styles.featuresCard, { backgroundColor: colors.card }]}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="document-text-outline" size={20} color={isDark ? colors.primary : "#2196F3"} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>Document Verification</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>Application Review Tools</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="notifications-outline" size={20} color="#FF9800" />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>Real-time Notifications</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="stats-chart-outline" size={20} color="#9C27B0" />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>Analytics & Reports</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.error} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>Secure Data Handling</Text>
            </View>
          </View>
        </View>

        {/* Development Team */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Development Team</Text>

          <View style={[styles.teamCard, { backgroundColor: colors.card }]}>
            <View style={styles.teamMember}>
              <View style={[styles.memberAvatar, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="person" size={24} color={colors.textSecondary} />
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text }]}>Tech Solutions Inc.</Text>
                <Text style={[styles.memberRole, { color: colors.textSecondary }]}>Development Team</Text>
              </View>
            </View>

            <View style={styles.teamMember}>
              <View style={[styles.memberAvatar, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="people" size={24} color={colors.textSecondary} />
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text }]}>Design Studio</Text>
                <Text style={[styles.memberRole, { color: colors.textSecondary }]}>UI/UX Design</Text>
              </View>
            </View>

            <View style={styles.teamMember}>
              <View style={[styles.memberAvatar, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="shield-checkmark" size={24} color={colors.textSecondary} />
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text }]}>Security Team</Text>
                <Text style={[styles.memberRole, { color: colors.textSecondary }]}>Data Protection</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>

          <View style={[styles.contactCard, { backgroundColor: colors.card }]}>
            <View style={styles.contactItem}>
              <View style={[styles.contactIcon, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="mail-outline" size={20} color={isDark ? colors.primary : "#2196F3"} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.contactValue, { color: colors.text }]}>support@scholarshipapp.com</Text>
              </View>
            </View>

            <View style={styles.contactItem}>
              <View style={[styles.contactIcon, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="call-outline" size={20} color={colors.success} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Phone</Text>
                <Text style={[styles.contactValue, { color: colors.text }]}>+1 (555) 123-4567</Text>
              </View>
            </View>

            <View style={styles.contactItem}>
              <View style={[styles.contactIcon, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="globe-outline" size={20} color="#FF9800" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Website</Text>
                <Text style={[styles.contactValue, { color: colors.text }]}>www.scholarshipapp.com</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Legal Links */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Legal</Text>

          <View style={[styles.legalCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.legalItem} onPress={handlePrivacyPolicy} activeOpacity={0.7}>
              <View style={[styles.legalIcon, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="shield-outline" size={20} color="#9C27B0" />
              </View>
              <View style={styles.legalContent}>
                <Text style={[styles.legalTitle, { color: colors.text }]}>Privacy Policy</Text>
                <Text style={[styles.legalSubtitle, { color: colors.textSecondary }]}>How we protect your data</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <TouchableOpacity style={styles.legalItem} onPress={handleTermsConditions} activeOpacity={0.7}>
              <View style={[styles.legalIcon, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="document-text-outline" size={20} color={colors.error} />
              </View>
              <View style={styles.legalContent}>
                <Text style={[styles.legalTitle, { color: colors.text }]}>Terms & Conditions</Text>
                <Text style={[styles.legalSubtitle, { color: colors.textSecondary }]}>Terms of service and usage</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Copyright */}
        <View style={[styles.copyrightCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.copyrightText, { color: colors.textSecondary }]}>
            © 2024 Scholarship Review App. All rights reserved.
          </Text>
          <Text style={[styles.copyrightSubtext, { color: colors.textSecondary }]}>
            Built with ❤️ for education
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  appInfoCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  aboutCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  aboutText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  featuresCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  teamCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  teamMember: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: "#666",
  },
  contactCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  legalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  legalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  legalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  legalContent: {
    flex: 1,
  },
  legalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  legalSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 76,
  },
  copyrightCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  copyrightText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 4,
  },
  copyrightSubtext: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
});
