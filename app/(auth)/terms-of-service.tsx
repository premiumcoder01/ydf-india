import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Dimensions, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function TermsOfServiceScreen() {
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
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <Text style={styles.headerSubtitle}>Legal Agreement</Text>
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
          <Text style={styles.welcomeTitle}>Welcome to YDF</Text>
          <Text style={styles.introParagraph}>
            Welcome to the YDF Scholarships App, operated by Youth Dreamers Foundation (“YDF”, “we”, “our”, or “us”). By accessing or using the YDF App, you agree to comply with and be bound by the following Terms of Service. Please read them carefully.
          </Text>
        </View>

        <Section title="1. Acceptance of Terms" icon="check-circle-outline">
          <Text style={styles.paragraph}>
            By creating an account or using the YDF Scholarships App, you agree to these Terms of Service and our policies. If you do not agree, please do not use the app.
          </Text>
        </Section>

        <Section title="2. Eligibility" icon="account-check-outline">
          <Text style={styles.paragraph}>
            The YDF Scholarships App is intended for students, parents/relatives, outreach partners/volunteers and scholarship providers associated with YDF programs. By using the app, you confirm that:
          </Text>
          <View style={styles.bulletList}>
            <BulletItem text="You are providing accurate and complete information" />
            <BulletItem text="You are eligible to participate in YDF programs" />
            <BulletItem text="If you are under 18, you have consent from a parent or guardian" />
          </View>
        </Section>

        <Section title="3. User Account" icon="shield-account-outline">
          <View style={styles.bulletList}>
            <BulletItem text="You are responsible for maintaining the confidentiality of your login credentials" />
            <BulletItem text="You agree to provide accurate, current, and complete information" />
            <BulletItem text="You are responsible for all activities under your account" />
            <BulletItem text="YDF reserves the right to suspend or terminate accounts without any prior notice" />
          </View>
        </Section>

        <Section title="4. Use of the App" icon="cellphone-cog">
          <Text style={styles.paragraph}>You agree to use the YDF Scholarships App only for lawful purposes. You must not:</Text>
          <View style={styles.bulletList}>
            <BulletItem text="Misuse the platform or attempt unauthorized access" />
            <BulletItem text="Upload false, misleading, or fraudulent documents" />
            <BulletItem text="Impersonate someone else or abuse someone else's identity" />
            <BulletItem text="Engage in harmful, abusive, or disruptive behavior" />
            <BulletItem text="Interfere with the functioning of the app" />
          </View>
        </Section>

        <Section title="5. Document Submission & Verification" icon="file-document-outline">
          <View style={styles.bulletList}>
            <BulletItem text="Users may be required to upload documents for application and verification purposes" />
            <BulletItem text="You confirm that all submitted documents are authentic and valid" />
            <BulletItem text="YDF reserves the right to verify, reject, or request additional documents at any time" />
            <BulletItem text="Submission of false documents may result in disqualification or account termination" />
          </View>
        </Section>

        <Section title="6. Scholarships & Program Participation" icon="school-outline">
          <View style={styles.bulletList}>
            <BulletItem text="Use of the app does not guarantee selection for any scholarship or program" />
            <BulletItem text="Selection is subject to YDF’s eligibility criteria and review process" />
            <BulletItem text="YDF reserves the right to modify, suspend, or discontinue any program without prior notice" />
          </View>
        </Section>

        <Section title="7. Notifications & Communication" icon="bell-outline">
          <Text style={styles.paragraph}>By using the app, you agree to receive:</Text>
          <View style={styles.bulletList}>
            <BulletItem text="Important announcements and updates" />
            <BulletItem text="Notifications regarding your application or program status" />
            <BulletItem text="Communication from YDF via the app, email, or other channels" />
          </View>
        </Section>

        <Section title="8. Data Privacy" icon="lock-outline">
          <Text style={styles.paragraph}>
            Your privacy is important to us. By using the app, you agree to the collection and use of your data in accordance with our Privacy Policy. YDF takes reasonable measures to protect your information.
          </Text>
        </Section>

        <Section title="9. Intellectual Property" icon="copyright">
          <Text style={styles.paragraph}>
            All content, design, logos, and materials within the YDF App are the property of Youth Dreamers Foundation and are protected by applicable laws. You may not copy, distribute, or reuse any content without permission.
          </Text>
        </Section>

        <Section title="10. Limitation of Liability" icon="alert-circle-outline">
          <Text style={styles.paragraph}>YDF is not responsible for:</Text>
          <View style={styles.bulletList}>
            <BulletItem text="Any technical issues, interruptions, or data loss" />
            <BulletItem text="Decisions made based on the information provided in the app" />
            <BulletItem text="Any indirect or consequential damages arising from app usage" />
          </View>
        </Section>

        <Section title="11. Termination" icon="account-off-outline">
          <Text style={styles.paragraph}>YDF reserves the right to suspend or terminate access to the app at any time if:</Text>
          <View style={styles.bulletList}>
            <BulletItem text="These Terms are violated" />
            <BulletItem text="False information or documents are submitted" />
            <BulletItem text="Misuse of the platform is detected" />
          </View>
        </Section>

        <Section title="12. Changes to Terms" icon="update">
          <Text style={styles.paragraph}>
            YDF may update these Terms of Service from time to time. Upon changes, you will be notified to review and agree with them. Continued use of the app after changes indicates your acceptance of the updated terms.
          </Text>
        </Section>

        <Section title="13. Governing Law" icon="gavel">
          <Text style={styles.paragraph}>
            These Terms shall be governed by and interpreted in accordance with the laws of India.
          </Text>
        </Section>

        <Section title="14. Contact Us" icon="information-outline">
          <Text style={styles.paragraph}>If you have any questions about these Terms, please contact us at:</Text>

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
            By using the YDF Scholarships App, you acknowledge that you have read, understood, and agreed to these Terms of Service.
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
  bulletList: {
    marginTop: 10,
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

