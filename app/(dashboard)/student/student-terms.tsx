import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function StudentTermsScreen() {
    const { isDark, colors } = useTheme();
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
                style={styles.background}
                locations={[0, 0.3, 1]}
            />

            <AppHeader title="Terms of Service" onBack={() => router.back()} />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>1. Acceptance of Terms</Text>
                    <Text style={[styles.text, { color: colors.textSecondary }]}>
                        By accessing and using this Student Portal, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Use of the Portal</Text>
                    <Text style={[styles.text, { color: colors.textSecondary }]}>
                        This portal is intended for students seeking scholarships and educational opportunities. You agree to provide accurate and complete information during registration and application processes.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Privacy and Data</Text>
                    <Text style={[styles.text, { color: colors.textSecondary }]}>
                        Your use of the portal is also governed by our Privacy Policy. We collect and process data as described in the policy to provide our services.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>4. User Responsibilities</Text>
                    <Text style={[styles.text, { color: colors.textSecondary }]}>
                        You are responsible for maintaining the confidentiality of your account credentials. You agree not to use the portal for any unlawful or prohibited purposes.
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Modifications</Text>
                    <Text style={[styles.text, { color: colors.textSecondary }]}>
                        We reserve the right to modify these terms at any time. Continued use of the portal after such changes constitutes acceptance of the new terms.
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
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: "rgba(51, 51, 51, 0.08)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
        marginTop: 20,
        marginBottom: 8,
    },
    text: {
        fontSize: 15,
        color: "#666",
        lineHeight: 22,
    },
});
