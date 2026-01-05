import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function StudentPrivacyScreen() {
    const { isDark, colors } = useTheme();
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
                style={styles.background}
                locations={[0, 0.3, 1]}
            />

            <AppHeader title="Privacy Policy" onBack={() => router.back()} />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>1. Data Collection</Text>
                    <Text style={[styles.text, { color: colors.textSecondary }]}>
                        We collect information that you provide to us directly, such as your name, email address, phone number, and academic details when you create an account or apply for scholarships.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Use of Information</Text>
                    <Text style={[styles.text, { color: colors.textSecondary }]}>
                        The information we collect is used to facilitate scholarship applications, communicate with you about opportunities, and improve our services.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Information Sharing</Text>
                    <Text style={[styles.text, { color: colors.textSecondary }]}>
                        We may share your information with scholarship providers and partners involved in the educational process. We do not sell your personal data to third parties.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Data Security</Text>
                    <Text style={[styles.text, { color: colors.textSecondary }]}>
                        We implement industry-standard security measures to protect your data from unauthorized access, disclosure, or alteration.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Your Rights</Text>
                    <Text style={[styles.text, { color: colors.textSecondary }]}>
                        You have the right to access, update, or delete your personal information. You can manage your data through your profile settings or by contacting us.
                    </Text>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    card: {
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginTop: 20,
        marginBottom: 8,
    },
    text: {
        fontSize: 15,
        lineHeight: 22,
    },
});
