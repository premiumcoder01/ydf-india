import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { router } from "expo-router";
import React, { useState } from "react";
import { LayoutAnimation, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ProviderHelpSupportScreen() {
  const { isDark, colors } = useTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "How to create a scholarship?",
      a: "Navigate to the Scholarships section from your dashboard, tap 'Add Scholarship', and complete the form with scholarship details including eligibility criteria, award amount, and application deadlines.",
      icon: "🎓"
    },
    {
      q: "How to verify KYC?",
      a: "Access the KYC verification screen, provide your business details, upload required documents (ID proof, business license), and submit for review. Verification typically takes 24-48 hours.",
      icon: "✅"
    },
    {
      q: "How to manage applications?",
      a: "View all scholarship applications in the Applications tab. You can filter by status, review applicant profiles, and approve or reject applications with feedback.",
      icon: "📋"
    },
    {
      q: "What payment methods are supported?",
      a: "We support bank transfers, UPI, credit/debit cards, and digital wallets for disbursing scholarship funds directly to recipients.",
      icon: "💳"
    },
  ];



  const toggle = (idx: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader title="Help & Support" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Hero Section */}
          <View style={styles.hero}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>How can we help you?</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Find answers, documentation, or reach out to our team</Text>
          </View>

          {/* FAQ Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
              <View style={[styles.badge, { backgroundColor: isDark ? colors.surface : "#F1F5F9" }]}>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{faqs.length}</Text>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {faqs.map((f, idx) => (
                <View key={f.q}>
                  <TouchableOpacity
                    style={[
                      styles.faqRow,
                      openIndex === idx && { backgroundColor: colors.surface }
                    ]}
                    onPress={() => toggle(idx)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.faqLeft}>
                      <View style={[styles.iconCircle, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9" }]}>
                        <Text style={styles.icon}>{f.icon}</Text>
                      </View>
                      <Text style={[styles.faqQ, { color: colors.text }]}>{f.q}</Text>
                    </View>
                    <View style={[
                      styles.chevron,
                      { backgroundColor: isDark ? colors.background : "#F8FAFC" },
                      openIndex === idx && styles.chevronOpen,
                      openIndex === idx && { backgroundColor: isDark ? colors.primary + "33" : "#E0E7FF" }
                    ]}>
                      <Text style={[styles.chevronText, { color: openIndex === idx ? (isDark ? colors.primary : "#6366f1") : colors.textSecondary }]}>›</Text>
                    </View>
                  </TouchableOpacity>

                  {openIndex === idx && (
                    <View style={styles.faqAnswer}>
                      <Text style={[styles.faqA, { color: colors.textSecondary }]}>{f.a}</Text>
                    </View>
                  )}

                  {idx < faqs.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                </View>
              ))}
            </View>
          </View>


          {/* Contact Support CTA */}
          <View style={[styles.ctaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.ctaContent}>
              <Text style={[styles.ctaTitle, { color: colors.text }]}>Still need help?</Text>
              <Text style={[styles.ctaSubtitle, { color: colors.textSecondary }]}>Our support team is available 24/7</Text>
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/(dashboard)/provider/contact-support")}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Contact Support</Text>

            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Average response time: ~2 hours</Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  hero: {
    marginBottom: 32,
    paddingTop: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  faqRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  faqLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 20,
  },
  faqQ: {
    fontWeight: "600",
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "90deg" }],
  },
  chevronOpen: {
    transform: [{ rotate: "270deg" }],
  },
  chevronText: {
    fontSize: 20,
    fontWeight: "700",
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingLeft: 68,
  },
  faqA: {
    fontWeight: "500",
    lineHeight: 22,
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  ctaCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  ctaContent: {
    gap: 4,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  ctaSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    fontWeight: "500",
  },
});