import React from "react";
import { ScrollView, StyleSheet, Text, View, Linking, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

export default function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const openEmail = () => {
    Linking.openURL("mailto:helpdesk@youthdreamersfoundation.org");
  };

  const openWebsite = () => {
    Linking.openURL("https://ydfindia.org/");
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.4, 1]}
      />

      {/* Header with Back Button */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentHeader}>
          <Text style={styles.subHeader}>YDF Scholarships Portal</Text>
          <Text style={styles.lastUpdated}>Last Updated: 18 March, 2026</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.introText}>
            By using the YDF Scholarships App, you agree to these Terms and our Privacy Policy. If you do not agree, please do not use the application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Eligibility</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Users must provide accurate information</Text>
            <Text style={styles.listItem}>• Must be part of YDF programs (students, parents, volunteers, partners)</Text>
            <Text style={styles.listItem}>• Users under 18 require parental consent</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Account</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• You are responsible for your login credentials</Text>
            <Text style={styles.listItem}>• All activity under your account is your responsibility</Text>
            <Text style={styles.listItem}>• YDF may suspend accounts if misuse is detected</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Acceptable Use</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• No unauthorized access or misuse</Text>
            <Text style={styles.listItem}>• No fake or fraudulent documents</Text>
            <Text style={styles.listItem}>• No impersonation</Text>
            <Text style={styles.listItem}>• No harmful or abusive behavior</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Documents & Verification</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• All submitted documents must be valid</Text>
            <Text style={styles.listItem}>• YDF may verify or reject submissions</Text>
            <Text style={styles.listItem}>• False data may lead to disqualification</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Scholarships</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Selection is not guaranteed</Text>
            <Text style={styles.listItem}>• Based on eligibility and evaluation</Text>
            <Text style={styles.listItem}>• Programs may change or discontinue</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Communication</Text>
          <Text style={styles.introText}>
            You agree to receive updates via app, email, or notifications.
          </Text>
        </View>

        <View style={styles.divider} />
        
        <Text style={styles.mainSubheader}>Privacy Policy</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Information We Collect</Text>
          
          <Text style={styles.subsectionTitle}>Personal Information</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Name, Email, Phone</Text>
            <Text style={styles.listItem}>• Date of Birth, Gender</Text>
            <Text style={styles.listItem}>• Parent details</Text>
            <Text style={styles.listItem}>• Address & education details</Text>
          </View>

          <Text style={styles.subsectionTitle}>Academic Data</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Enrollments, scores, progress</Text>
            <Text style={styles.listItem}>• Application status</Text>
          </View>

          <Text style={styles.subsectionTitle}>Documents</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• ID Proofs (Aadhaar, ID Cards)</Text>
            <Text style={styles.listItem}>• Income & academic records</Text>
            <Text style={styles.listItem}>• Bank details</Text>
          </View>

          <Text style={styles.subsectionTitle}>Technical Data</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Device, OS, IP address</Text>
            <Text style={styles.listItem}>• Usage logs</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Use of Data</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Manage applications</Text>
            <Text style={styles.listItem}>• Verify eligibility</Text>
            <Text style={styles.listItem}>• Improve services</Text>
            <Text style={styles.listItem}>• Prevent fraud</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Data Sharing</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• With YDF staff & partners</Text>
            <Text style={styles.listItem}>• With service providers</Text>
            <Text style={styles.listItem}>• If required by law</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Data Security</Text>
          <Text style={styles.introText}>
            We use reasonable safeguards, but no system is fully secure.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. User Rights</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Access your data</Text>
            <Text style={styles.listItem}>• Request corrections</Text>
            <Text style={styles.listItem}>• Request deletion</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Children's Privacy</Text>
          <Text style={styles.introText}>
            Users under 18 must have parental consent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Third-Party Services</Text>
          <Text style={styles.introText}>
            We may use hosting and analytics providers.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. Changes</Text>
          <Text style={styles.introText}>
            Policies may be updated. Continued use means acceptance.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>16. Governing Law</Text>
          <Text style={styles.introText}>
            These terms are governed by the laws of India.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>17. Contact</Text>
          <TouchableOpacity style={styles.contactItem} onPress={openEmail} activeOpacity={0.6}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail" size={20} color="#1A1A1A" />
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactLink}>helpdesk@youthdreamersfoundation.org</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactItem} onPress={openWebsite} activeOpacity={0.6}>
            <View style={styles.iconCircle}>
              <Ionicons name="globe" size={20} color="#1A1A1A" />
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactLabel}>Website</Text>
              <Text style={styles.contactLink}>https://ydfindia.org/</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginLeft: 16,
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  contentHeader: {
    marginBottom: 24,
  },
  subHeader: {
    fontSize: 16,
    color: "#444",
    fontWeight: "600",
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 14,
    color: "#666",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  introText: {
    fontSize: 16,
    color: "#444",
    lineHeight: 24,
    marginBottom: 8,
  },
  section: {
    marginBottom: 32,
    paddingTop: 24,
    borderTopWidth: 1.5,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  mainSubheader: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111",
    marginBottom: 24,
    marginTop: 32,
    textAlign: "center",
  },
  divider: {
    height: 2,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    marginVertical: 40,
    borderRadius: 1,
  },
  subsectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
    marginTop: 12,
    marginBottom: 10,
  },
  list: {
    marginLeft: 4,
    gap: 10,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
    fontWeight: "500",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: "#777",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  contactLink: {
    fontSize: 15,
    color: "#111",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
