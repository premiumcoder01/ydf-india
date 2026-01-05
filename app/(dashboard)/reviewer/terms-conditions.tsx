import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

export default function TermsConditionsScreen() {
  const inset = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const handleAccept = () => {
    // This would typically save the acceptance status
    alert("Terms and conditions accepted");
    router.back();
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Terms & Conditions"
        subtitle="Please read and accept our terms"
        showBackButton={true}
        onBackPress={handleBack}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: inset.bottom + 20 }}>
        <View style={[styles.termsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.termsTitle, { color: colors.text }]}>Terms of Service</Text>
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>Last updated: January 15, 2024</Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Acceptance of Terms</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              By accessing and using this scholarship review application, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Description of Service</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              This application provides a platform for reviewers to evaluate scholarship applications. The service includes document verification, application review, and decision management tools.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>3. User Responsibilities</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              As a reviewer, you are responsible for:
              {"\n"}• Maintaining the confidentiality of your login credentials
              {"\n"}• Conducting fair and unbiased reviews
              {"\n"}• Protecting applicant information and data
              {"\n"}• Reporting any security breaches or suspicious activity
              {"\n"}• Following all applicable laws and regulations
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Data Privacy and Security</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              We are committed to protecting your privacy and the privacy of applicants. All personal information is handled in accordance with our Privacy Policy and applicable data protection laws. You must not share, distribute, or misuse any applicant data.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Review Standards</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Reviews must be conducted fairly, objectively, and in accordance with established criteria. You must not discriminate based on race, gender, religion, or other protected characteristics. All decisions should be well-documented and justified.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Prohibited Activities</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              The following activities are strictly prohibited:
              {"\n"}• Sharing login credentials with others
              {"\n"}• Attempting to access unauthorized areas
              {"\n"}• Manipulating or falsifying review data
              {"\n"}• Using the service for any illegal purposes
              {"\n"}• Interfering with the service's operation
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Intellectual Property</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              The application and its content are protected by intellectual property laws. You may not copy, modify, or distribute any part of the service without explicit permission.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Limitation of Liability</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              The service is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>9. Termination</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              We reserve the right to terminate your access to the service at any time for violation of these terms or for any other reason at our sole discretion.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>10. Changes to Terms</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              We may update these terms from time to time. You will be notified of any significant changes, and continued use of the service constitutes acceptance of the updated terms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>11. Contact Information</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              If you have any questions about these terms, please contact us at support@scholarshipapp.com or through the in-app support system.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Text style={[styles.backButtonText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: isDark ? colors.primary : "#4CAF50" }]}
          onPress={handleAccept}
          activeOpacity={0.8}
        >
          <Text style={styles.acceptButtonText}>Accept & Continue</Text>
          <Ionicons name="checkmark" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
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
  termsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  termsTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  lastUpdated: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  actionContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  backButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  acceptButton: {
    flex: 2,
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
