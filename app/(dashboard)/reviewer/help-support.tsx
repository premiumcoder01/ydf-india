import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

export default function HelpSupportScreen() {
  const inset = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const faqItems: FAQItem[] = [
    // ... items
    {
      id: "1",
      question: "How to verify a document?",
      answer: "To verify a document, open the application details, review the uploaded documents, check for authenticity, completeness, and accuracy. Use the verification tools to mark documents as verified or request additional information if needed.",
    },
    {
      id: "2",
      question: "What happens after approval?",
      answer: "After approving an application, the student will be notified automatically. The application status will be updated in the system, and the scholarship provider will be informed. The student can then proceed with the next steps in the scholarship process.",
    },
    {
      id: "3",
      question: "How to reject an application?",
      answer: "To reject an application, provide a clear reason for rejection in the comments section. The student will receive feedback about why their application was rejected and what they can improve for future applications.",
    },
    {
      id: "4",
      question: "Can I change my review decision?",
      answer: "Yes, you can change your review decision before the final submission. Once submitted, you may need to contact the administrator to make changes depending on the application status.",
    },
    {
      id: "5",
      question: "How to report technical issues?",
      answer: "If you encounter technical issues, use the 'Contact Support' feature to raise a ticket. Include screenshots and detailed description of the problem for faster resolution.",
    },
    {
      id: "6",
      question: "What are the review criteria?",
      answer: "Review criteria include academic performance, financial need, extracurricular activities, essay quality, and document authenticity. Each scholarship may have specific criteria outlined in the application guidelines.",
    },
  ];

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleContactSupport = () => {
    router.push("/(dashboard)/reviewer/contact-support");
  };

  const handleViewGuide = () => {
    // This would typically open a PDF or web view
    // For now, we'll show an alert
    alert("Documentation guide will open in a new window");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Help & Support"
        subtitle="Get help and find answers"
      />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: inset.bottom + 20 }}>
        {/* Quick Help Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Help</Text>

          <View style={[styles.quickHelpCard, { backgroundColor: colors.card }]}>
            <View style={styles.quickHelpItem}>
              <View style={[styles.quickHelpIcon, { backgroundColor: isDark ? colors.border : "#E3F2FD" }]}>
                <Ionicons name="document-text-outline" size={24} color={isDark ? colors.primary : "#2196F3"} />
              </View>
              <View style={styles.quickHelpContent}>
                <Text style={[styles.quickHelpTitle, { color: colors.text }]}>Documentation</Text>
                <Text style={[styles.quickHelpSubtitle, { color: colors.textSecondary }]}>Complete user guide and tutorials</Text>
              </View>
              <TouchableOpacity
                style={[styles.quickHelpButton, { backgroundColor: isDark ? colors.primary : "#2196F3" }]}
                onPress={handleViewGuide}
                activeOpacity={0.8}
              >
                <Text style={styles.quickHelpButtonText}>View Guide</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>

          <View style={[styles.faqCard, { backgroundColor: colors.card }]}>
            {faqItems.map((item, index) => (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.faqItem}
                  onPress={() => toggleFAQ(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqQuestion}>
                    <Text style={[styles.faqQuestionText, { color: colors.text }]}>{item.question}</Text>
                    <Ionicons
                      name={expandedFAQ === item.id ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>

                {expandedFAQ === item.id && (
                  <View style={[styles.faqAnswer, { borderTopColor: colors.border }]}>
                    <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>{item.answer}</Text>
                  </View>
                )}

                {index < faqItems.length - 1 && <View style={[styles.faqDivider, { backgroundColor: colors.border }]} />}
              </View>
            ))}
          </View>
        </View>

        {/* Contact Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Need More Help?</Text>

          <View style={[styles.contactCard, { backgroundColor: colors.card }]}>
            <View style={[styles.contactIcon, { backgroundColor: isDark ? "rgba(255, 152, 0, 0.1)" : "#FFF3E0" }]}>
              <Ionicons name="mail-outline" size={32} color={isDark ? "#FFB74D" : "#FF9800"} />
            </View>
            <Text style={[styles.contactTitle, { color: colors.text }]}>Contact Support</Text>
            <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
              Can't find what you're looking for? Our support team is here to help you with any questions or issues.
            </Text>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContactSupport}
              activeOpacity={0.8}
            >
              <Text style={styles.contactButtonText}>Raise a Support Ticket</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Additional Resources */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Resources</Text>

          <View style={[styles.resourcesCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.resourceItem} activeOpacity={0.7}>
              <View style={[styles.resourceIcon, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="videocam-outline" size={20} color={isDark ? "#81C784" : "#4CAF50"} />
              </View>
              <View style={styles.resourceContent}>
                <Text style={[styles.resourceTitle, { color: colors.text }]}>Video Tutorials</Text>
                <Text style={[styles.resourceSubtitle, { color: colors.textSecondary }]}>Step-by-step video guides</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.resourceItem} activeOpacity={0.7}>
              <View style={[styles.resourceIcon, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="people-outline" size={20} color={isDark ? "#BA68C8" : "#9C27B0"} />
              </View>
              <View style={styles.resourceContent}>
                <Text style={[styles.resourceTitle, { color: colors.text }]}>Community Forum</Text>
                <Text style={[styles.resourceSubtitle, { color: colors.textSecondary }]}>Connect with other reviewers</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.resourceItem} activeOpacity={0.7}>
              <View style={[styles.resourceIcon, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}>
                <Ionicons name="calendar-outline" size={20} color={isDark ? "#E57373" : "#F44336"} />
              </View>
              <View style={styles.resourceContent}>
                <Text style={[styles.resourceTitle, { color: colors.text }]}>Training Sessions</Text>
                <Text style={[styles.resourceSubtitle, { color: colors.textSecondary }]}>Join live training workshops</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  quickHelpCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  quickHelpItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  quickHelpIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  quickHelpContent: {
    flex: 1,
  },
  quickHelpTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  quickHelpSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  quickHelpButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickHelpButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  faqCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  faqItem: {
    padding: 20,
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 12,
  },
  faqAnswer: {
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingHorizontal: 20,
  },
  faqAnswerText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  faqDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 20,
  },
  contactCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  contactIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF3E0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  contactSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF9800",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resourcesCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  resourceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  resourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  resourceSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 76,
  },
});
