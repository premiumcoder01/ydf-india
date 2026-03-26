import React from "react";
import { ScrollView, StyleSheet, Text, View, Linking, TouchableOpacity, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
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
          <Text style={styles.lastUpdated}>Last Updated: 18 March, 2026</Text>
        </View>

        <Text style={styles.introText}>
          Youth Dreamers Foundation ("YDF", "we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and share your information when you use the <Text style={styles.bold}>YDF Scholarships Portal</Text>, including its integration with our Scholarships Management Platform (SMP) powered by Moodle.
        </Text>

        <Text style={styles.introTextBold}>
          By using the YDF Scholarships App, you agree to this Privacy Policy.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          
          <Text style={styles.subsectionTitle}>a. Personal Information</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Full Name</Text>
            <Text style={styles.listItem}>• Email Address</Text>
            <Text style={styles.listItem}>• Phone Number</Text>
            <Text style={styles.listItem}>• Date of Birth</Text>
            <Text style={styles.listItem}>• Gender (if applicable)</Text>
            <Text style={styles.listItem}>• Parents Information</Text>
            <Text style={styles.listItem}>• Address and Educational Details</Text>
          </View>

          <Text style={styles.subsectionTitle}>b. Academic & Program Data</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Scheme enrollments and participation</Text>
            <Text style={styles.listItem}>• Quiz scores, assignments, and completion status (via Moodle-based SMP)</Text>
            <Text style={styles.listItem}>• Scholarship application status and progress</Text>
            <Text style={styles.listItem}>• Engagement data</Text>
          </View>

          <Text style={styles.subsectionTitle}>c. Documents & Uploaded Content</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Identity proofs (Aadhaar card, college ID)</Text>
            <Text style={styles.listItem}>• Income proof (Ration card, income certificate)</Text>
            <Text style={styles.listItem}>• Academic records (marksheets, certificates, receipts)</Text>
            <Text style={styles.listItem}>• Bank details (passbook, account details)</Text>
            <Text style={styles.listItem}>• Other verification documents</Text>
          </View>

          <Text style={styles.subsectionTitle}>d. Device & Usage Information</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Device type and operating system</Text>
            <Text style={styles.listItem}>• App usage data and activity logs</Text>
            <Text style={styles.listItem}>• IP address (for security and analytics)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Manage scholarship applications and participation</Text>
            <Text style={styles.listItem}>• Track academic progress and performance</Text>
            <Text style={styles.listItem}>• Verify documents and eligibility</Text>
            <Text style={styles.listItem}>• Send updates and important notifications</Text>
            <Text style={styles.listItem}>• Improve app functionality and user experience</Text>
            <Text style={styles.listItem}>• Ensure security and prevent fraud</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. SMP Integration</Text>
          <Text style={styles.introText}>The YDF Portal integrates with SMP to manage scholarship journeys.</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Data is shared between the mobile app and web platform</Text>
            <Text style={styles.listItem}>• Used for monitoring, reporting, and evaluation</Text>
            <Text style={styles.listItem}>• Stored securely on servers</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Sharing & Disclosure</Text>
          <Text style={styles.introText}>We do not sell your data. We may share it only:</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• With authorized YDF staff and scholarship providers</Text>
            <Text style={styles.listItem}>• With technology service providers</Text>
            <Text style={styles.listItem}>• When required by law or authorities</Text>
            <Text style={styles.listItem}>• To protect rights and safety</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Storage & Security</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Data is stored on secure servers</Text>
            <Text style={styles.listItem}>• Reasonable safeguards are implemented</Text>
            <Text style={styles.listItem}>• No system is 100% secure</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Data Retention</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Retained during program participation</Text>
            <Text style={styles.listItem}>• May be kept for reporting and compliance</Text>
            <Text style={styles.listItem}>• Deletion requests can be made (subject to conditions)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Your Rights</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Access your data</Text>
            <Text style={styles.listItem}>• Request corrections</Text>
            <Text style={styles.listItem}>• Request deletion (where applicable)</Text>
            <Text style={styles.listItem}>• Withdraw consent</Text>
          </View>
          <Text style={styles.introText}>To exercise your rights, contact us below.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Users under 18 require parent/guardian consent</Text>
            <Text style={styles.listItem}>• We take extra care for minors' data</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Third-Party Services</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Cloud hosting providers (e.g., DigitalOcean, Hostinger)</Text>
            <Text style={styles.listItem}>• Analytics tools (e.g., Google Looker Studio)</Text>
          </View>
          <Text style={styles.introText}>These services follow their own privacy policies.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
          <Text style={styles.introText}>We may update this policy from time to time. Continued use of the app means you accept the updated policy.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Contact Us</Text>
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
    marginBottom: 16,
  },
  introTextBold: {
    fontSize: 16,
    color: "#111",
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: "700",
  },
  bold: {
    fontWeight: "800",
    color: "#111",
  },
  section: {
    marginBottom: 32,
    paddingTop: 24,
    borderTopWidth: 1.5,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    marginBottom: 16,
    letterSpacing: -0.3,
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
