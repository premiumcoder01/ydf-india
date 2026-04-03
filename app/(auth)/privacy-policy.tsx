import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Dimensions, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const openEmail = () => {
    Linking.openURL("mailto:helpdesk@youthdreamersfoundation.org");
  };

  const openWebsite = () => {
    Linking.openURL("https://ydfindia.org/");
  };

  const Section = ({ title, children, icon }: { title: string; children: React.ReactNode; icon?: string }) => (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        {icon && (
          <View style={styles.sectionIconContainer}>
            <MaterialCommunityIcons name={icon as any} size={22} color="#f2c44d" />
          </View>
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Background Decoration */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <LinearGradient
        colors={["#ffffff", "#f8f9fa", "#fff9e6"]}
        style={styles.background}
        locations={[0, 0.7, 1]}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          {/* <Text style={styles.headerSubtitle}>Effective Date: 18th March, 2026</Text> */}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topInfo}>
          {/* <View style={styles.badge}>
            <Text style={styles.badgeText}>Last Updated: 18th March, 2026</Text>
          </View> */}
          <Text style={styles.welcomeTitle}>Privacy Matters</Text>
          <Text style={styles.introParagraph}>
            Youth Dreamers Foundation (“YDF”, “we”, “our”, or “us”) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and share your information when you use the YDF Scholarships App, including its integration with our Scholarships Management Platform (SMP) powered by Moodle.
          </Text>
          <Text style={[styles.introParagraph, { marginTop: 12, fontWeight: '600', color: '#1A1A1A' }]}>
            By using the YDF Scholarships App, you agree to the practices described in this Privacy Policy.
          </Text>
        </View>

        <Section title="1. Information We Collect" icon="database-search">
          <Text style={styles.paragraph}>We collect the following types of information:</Text>

          <Text style={styles.subheadline}>a. Personal Information</Text>
          <View style={styles.bulletList}>
            <BulletItem text="Full name" />
            <BulletItem text="Email address" />
            <BulletItem text="Phone number" />
            <BulletItem text="Date of birth" />
            <BulletItem text="Gender (if applicable)" />
            <BulletItem text="Parents Information" />
            <BulletItem text="Address and educational details" />
          </View>

          <Text style={styles.subheadline}>b. Academic & Program Data</Text>
          <View style={styles.bulletList}>
            <BulletItem text="Scheme enrollments and participation" />
            <BulletItem text="Quiz scores, assignments, and completion status (via Moodle-based SMP)" />
            <BulletItem text="Scholarship application status and progress" />
            <BulletItem text="Engagement data" />
          </View>

          <Text style={styles.subheadline}>c. Documents & Uploaded Content</Text>
          <View style={styles.bulletList}>
            <BulletItem text="Identity proofs (e.g., Aadhaar card, college ID cards)" />
            <BulletItem text="Income proof (Ration card, income certificate)" />
            <BulletItem text="Academic records (marksheets, fee receipts, certificates)" />
            <BulletItem text="Bank details (passbook, account details)" />
            <BulletItem text="Other documents required for verification" />
          </View>

          <Text style={styles.subheadline}>d. Device & Usage Information</Text>
          <View style={styles.bulletList}>
            <BulletItem text="Device type and operating system" />
            <BulletItem text="App usage data and activity logs" />
            <BulletItem text="IP address (for security and analytics purposes)" />
          </View>
        </Section>

        <Section title="2. How We Use Your Information" icon="cog-transfer">
          <Text style={styles.paragraph}>We use your information to:</Text>
          <View style={styles.bulletList}>
            <BulletItem text="Manage scholarship applications and program participation" />
            <BulletItem text="Track academic progress and performance" />
            <BulletItem text="Verify documents and eligibility" />
            <BulletItem text="Communicate updates, notifications, and important announcements" />
            <BulletItem text="Improve app functionality and user experience" />
            <BulletItem text="Ensure security and prevent fraud or misuse" />
          </View>
        </Section>

        <Section title="3. SMP Integration" icon="connection">
          <Text style={styles.paragraph}>
            The YDF App integrates with SMP to track and manage scholarship journey. By using the app, you acknowledge that:
          </Text>
          <View style={styles.bulletList}>
            <BulletItem text="Your scholarship application data (schemes, activities, progress) is shared between YDF Scholarships App and web platform" />
            <BulletItem text="This data is used for monitoring performance, reporting, and program evaluation" />
            <BulletItem text="SMP may store and process your scholarship-related data on secure servers" />
          </View>
        </Section>

        <Section title="4. Data Sharing & Disclosure" icon="share-variant">
          <Text style={styles.paragraph}>
            We do not sell your personal data. We may share your information only in the following cases:
          </Text>
          <View style={styles.bulletList}>
            <BulletItem text="With authorized YDF staff and scholarship providers for program management" />
            <BulletItem text="With technology service providers (e.g., hosting, SMP support)" />
            <BulletItem text="When required by law or government authorities" />
            <BulletItem text="To protect the rights, safety, and integrity of YDF and its users" />
          </View>
        </Section>

        <Section title="5. Data Storage & Security" icon="server-shield">
          <View style={styles.bulletList}>
            <BulletItem text="Your data is stored on secure servers with appropriate safeguards" />
            <BulletItem text="We implement reasonable technical and organizational measures to protect your data" />
            <BulletItem text="While we strive to protect your information, no system is completely secure" />
          </View>
        </Section>

        <Section title="6. Data Retention" icon="history">
          <View style={styles.bulletList}>
            <BulletItem text="We retain your data as long as you are part of YDF programs" />
            <BulletItem text="Data may be retained after program completion for reporting, compliance, and audit purposes" />
            <BulletItem text="You may request deletion of your data, subject to legal and operational requirements" />
          </View>
        </Section>

        <Section title="7. Your Rights" icon="account-details">
          <Text style={styles.paragraph}>You have the right to:</Text>
          <View style={styles.bulletList}>
            <BulletItem text="Access and review your personal data" />
            <BulletItem text="Request correction of inaccurate information" />
            <BulletItem text="Request deletion of your data (where applicable)" />
            <BulletItem text="Withdraw consent for certain data usage" />
          </View>
          <Text style={[styles.paragraph, { marginTop: 12 }]}>To exercise your rights, please contact us using the details provided below.</Text>
        </Section>

        <Section title="8. Children’s Privacy" icon="baby-face-outline">
          <Text style={styles.paragraph}>If you are under 18 years of age:</Text>
          <View style={styles.bulletList}>
            <BulletItem text="You must use the app with consent from a parent or guardian" />
            <BulletItem text="We take additional care to protect minors’ data" />
          </View>
        </Section>

        <Section title="9. Third-Party Services" icon="cloud-check">
          <Text style={styles.paragraph}>The app may use third-party services such as:</Text>
          <View style={styles.bulletList}>
            <BulletItem text="Cloud hosting providers (such as Digital Ocean, Hostinger, etc)" />
            <BulletItem text="Analytics tools (such as Google Lookerstudio, Cloud Services etc)" />
          </View>
          <Text style={[styles.paragraph, { marginTop: 12 }]}>These services may process your data in accordance with their own privacy policies.</Text>
        </Section>

        <Section title="10. Changes to This Policy" icon="update">
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. Updates will be posted within the app, and continued use of the app indicates acceptance of the revised policy.
          </Text>
        </Section>

        <Section title="11. Contact Us" icon="information-outline">
          <Text style={styles.paragraph}>If you have any questions or concerns about this Privacy Policy or your data, please contact us:</Text>

          <TouchableOpacity style={styles.contactChip} onPress={openEmail} activeOpacity={0.7}>
            <View style={styles.contactIcon}>
              <Ionicons name="mail" size={18} color="#f2c44d" />
            </View>
            <Text style={styles.contactText}>helpdesk@youthdreamersfoundation.org</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactChip} onPress={openWebsite} activeOpacity={0.7}>
            <View style={styles.contactIcon}>
              <Ionicons name="globe-outline" size={18} color="#f2c44d" />
            </View>
            <Text style={styles.contactText}>https://ydfindia.org/</Text>
          </TouchableOpacity>
        </Section>

        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>
            By using the YDF Scholarships App, you acknowledge that you have read and understood this Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const BulletItem = ({ text }: { text: string }) => (
  <View style={styles.bulletRow}>
    <View style={styles.bulletDot} />
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  bgCircle1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(242, 196, 77, 0.05)",
    zIndex: -1,
  },
  bgCircle2: {
    position: "absolute",
    bottom: 100,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(242, 196, 77, 0.03)",
    zIndex: -1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTitleContainer: {
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
    marginTop: -2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topInfo: {
    marginBottom: 24,
  },
  badge: {
    backgroundColor: "rgba(242, 196, 77, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#b08500",
    textTransform: "uppercase",
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1A1A1A",
    marginBottom: 12,
    letterSpacing: -1,
  },
  introParagraph: {
    fontSize: 16,
    color: "#4A4A4A",
    lineHeight: 24,
    fontWeight: "400",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(242, 196, 77, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    flex: 1,
    letterSpacing: -0.3,
  },
  sectionContent: {
    paddingLeft: 4,
  },
  paragraph: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
    fontWeight: "400",
  },
  subheadline: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginTop: 15,
    marginBottom: 8,
  },
  bulletList: {
    marginTop: 8,
    gap: 12,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f2c44d",
    marginTop: 8,
    marginRight: 12,
  },
  bulletText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
    flex: 1,
  },
  contactChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  contactIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  contactText: {
    fontSize: 10,
    color: "#333",
    fontWeight: "600",
    flex: 1,
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  footerLine: {
    width: 60,
    height: 4,
    backgroundColor: "#f2c44d",
    borderRadius: 2,
    marginBottom: 20,
    opacity: 0.3,
  },
  footerText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    fontStyle: "italic",
  },
});

