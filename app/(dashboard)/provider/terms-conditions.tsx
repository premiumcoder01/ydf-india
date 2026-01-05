import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function ProviderTermsScreen() {
  const { isDark, colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader title="Terms & Conditions" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(79, 70, 229, 0.15)" : "#EEF2FF" }]}>
            <Ionicons name="shield-checkmark" size={32} color="#4F46E5" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Terms & Conditions</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Please review our terms carefully before using the Provider Portal
          </Text>
        </View>

        {/* Section 1 */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#4F46E5" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Platform Usage</Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            These terms govern your use of the Provider Portal. By continuing, you agree to:
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletContainer}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>Comply with all applicable laws and regulations</Text>
            </View>
            <View style={styles.bulletContainer}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>Submit accurate and truthful information</Text>
            </View>
            <View style={styles.bulletContainer}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>Use the platform responsibly and ethically</Text>
            </View>
          </View>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            Information shared may be verified for fraud prevention and compliance purposes.
            Access may be revoked in case of misuse or violation of these terms.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="school" size={20} color="#4F46E5" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Scholarship Requirements</Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            All scholarships listed must adhere to legal and regulatory requirements, including:
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletContainer}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>Clear eligibility criteria and selection process</Text>
            </View>
            <View style={styles.bulletContainer}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>Transparent fund allocation and disbursement</Text>
            </View>
            <View style={styles.bulletContainer}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>Compliance with educational funding regulations</Text>
            </View>
          </View>
        </View>

        {/* Section 3 */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications" size={20} color="#4F46E5" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Communications & Updates</Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            By using this platform, you consent to receive notifications and updates related to:
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletContainer}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>Platform operations and maintenance</Text>
            </View>
            <View style={styles.bulletContainer}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>Policy changes and terms updates</Text>
            </View>
            <View style={styles.bulletContainer}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>Important announcements and compliance notices</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.updateText, { color: colors.textSecondary }]}>Last updated: October 2025</Text>
          <Text style={[styles.footerNote, { color: colors.textSecondary }]}>
            For questions or concerns about these terms, please contact our support team.
          </Text>
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
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletList: {
    marginVertical: 8,
  },
  bulletContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingLeft: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
    marginTop: 9,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
  },
  footer: {
    marginTop: 8,
    paddingTop: 24,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  updateText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  footerNote: {
    fontSize: 13,
    lineHeight: 20,
  },
});