import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

export default function MobilizerHelpScreen() {
    const { isDark, colors } = useTheme();

    const faqs = [
        { q: "How do I add a student?", a: "Go to 'My Students' and click the '+' button to add a new student profile." },
        { q: "Can I apply for multiple scholarships?", a: "Yes, you can apply for as many scholarships as your students are eligible for." },
        { q: "How do I check application status?", a: "Go to 'My Applications' to see the real-time status of all submitted applications." },
    ];

    const ContactItem = ({ icon, label, sublabel, onPress }: any) => (
        <TouchableOpacity
            style={[styles.contactItem, { backgroundColor: isDark ? colors.card : "#fff" }]}
            onPress={onPress}
        >
            <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name={icon} size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.contactLabel, { color: colors.text }]}>{label}</Text>
                <Text style={[styles.contactSub, { color: colors.textSecondary }]}>{sublabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f5f5f5" }]}>
            <AppHeader title="Help & Support" onBack={() => router.back()} />
            <ScrollView contentContainerStyle={styles.content}>

                <View style={[styles.banner, { backgroundColor: colors.primary }]}>
                    <Ionicons name="headset" size={48} color="#fff" />
                    <Text style={styles.bannerTitle}>How can we help you?</Text>
                    <Text style={styles.bannerText}>Our support team is available 24/7 to assist you.</Text>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Us</Text>
                <View style={{ gap: 12 }}>
                    <ContactItem
                        icon="mail"
                        label="Email Support"
                        sublabel="helpdesk@youthdreamersfoundation.org"
                        onPress={() => Linking.openURL('mailto:helpdesk@youthdreamersfoundation.org')}
                    />
                    <ContactItem
                        icon="call"
                        label="Call Us"
                        sublabel="+91 9599681997"
                        onPress={() => Linking.openURL('tel:+919599681997')}
                    />

                </View>

                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Frequently Asked Questions</Text>
                <View style={{ gap: 12 }}>
                    {faqs.map((item, index) => (
                        <View key={index} style={[styles.faqItem, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                            <Text style={[styles.faqQ, { color: colors.text }]}>{item.q}</Text>
                            <Text style={[styles.faqA, { color: colors.textSecondary }]}>{item.a}</Text>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20 },
    banner: { padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 24 },
    bannerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 12, marginBottom: 4 },
    bannerText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    contactItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 16 },
    iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    contactLabel: { fontSize: 16, fontWeight: '600' },
    contactSub: { fontSize: 13, marginTop: 2 },
    faqItem: { padding: 16, borderRadius: 16 },
    faqQ: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
    faqA: { fontSize: 14, lineHeight: 20 },
});
