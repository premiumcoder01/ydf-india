import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

export default function MobilizerAboutScreen() {
    const { isDark, colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f5f5f5" }]}>
            <AppHeader title="About App" onBack={() => router.back()} />
            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.logoContainer}>
                    <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
                        <Ionicons name="school" size={48} color="#fff" />
                    </View>
                    <Text style={[styles.appName, { color: colors.text }]}>Scholarship Mobilizer</Text>
                    <Text style={[styles.version, { color: colors.textSecondary }]}>Version 1.0.0 (Build 100)</Text>
                </View>

                <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                    <Text style={[styles.desc, { color: colors.text }]}>
                        The Scholarship Mobilizer app empowers teachers and counselors to manage student applications, track scholarship opportunities, and ensure that every eligible student gets the financial support they need for their education.
                    </Text>
                </View>

                <View style={[styles.section, { borderTopColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Legal</Text>
                    <View style={[styles.linkRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.linkText, { color: colors.text }]}>Terms of Service</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                    <View style={[styles.linkRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.linkText, { color: colors.text }]}>Privacy Policy</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                    <View style={[styles.linkRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.linkText, { color: colors.text }]}>Open Source Licenses</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                </View>

                <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 40, fontSize: 12 }}>
                    © 2026 Scholarship Foundation. All rights reserved.
                </Text>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20 },
    logoContainer: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
    logoBox: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    appName: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
    version: { fontSize: 14 },
    card: { padding: 20, borderRadius: 16, marginBottom: 32 },
    desc: { fontSize: 15, lineHeight: 24, textAlign: 'center' },
    section: { borderTopWidth: 1, paddingTop: 8 },
    sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
    linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
    linkText: { fontSize: 16, fontWeight: '500' },
});
