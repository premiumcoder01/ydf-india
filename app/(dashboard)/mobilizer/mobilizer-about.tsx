import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

export default function MobilizerAboutScreen() {
    const { isDark, colors } = useTheme();

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDark ? ["#121212", "#1e1e1e"] : ["#ffffff", "#f8f9fa"]}
                style={styles.background}
            />

            <AppHeader title="About App" onBack={() => router.back()} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                <View style={styles.logoSection}>
                    <View style={[styles.outerLogoBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(242, 196, 77, 0.1)" }]}>
                        <LinearGradient
                            colors={["#f2c44d", "#e5b53d"]}
                            style={styles.logoBox}
                        >
                            <Ionicons name="school" size={40} color="#fff" />
                        </LinearGradient>
                    </View>
                    <Text style={[styles.appName, { color: colors.text }]}>Scholarship Mobilizer</Text>

                </View>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="information-circle-outline" size={24} color={colors.primary} style={styles.infoIcon} />
                    <Text style={[styles.desc, { color: colors.text }]}>
                        The Scholarship Mobilizer app empowers teachers and counselors to manage student applications, track scholarship opportunities, and ensure that every eligible student gets the financial support they need for their education.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Legal & Policy</Text>

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => router.push("/(dashboard)/student/student-terms")}
                        style={[styles.linkRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                        <View style={styles.linkLeft}>
                            <View style={[styles.iconWrapper, { backgroundColor: "rgba(242, 196, 77, 0.1)" }]}>
                                <Ionicons name="document-text-outline" size={20} color="#e5b53d" />
                            </View>
                            <Text style={[styles.linkText, { color: colors.text }]}>Terms of Service</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => router.push("/(dashboard)/student/student-privacy")}
                        style={[styles.linkRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                        <View style={styles.linkLeft}>
                            <View style={[styles.iconWrapper, { backgroundColor: "rgba(242, 196, 77, 0.1)" }]}>
                                <Ionicons name="shield-checkmark-outline" size={20} color="#e5b53d" />
                            </View>
                            <Text style={[styles.linkText, { color: colors.text }]}>Privacy Policy</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>


                </View>


            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    background: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    content: {
        paddingVertical: 32,
        paddingHorizontal: 20
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 40
    },
    outerLogoBox: {
        width: 100,
        height: 100,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    logoBox: {
        width: 72,
        height: 72,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#f2c44d",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    appName: {
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: -0.5
    },
    versionBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    version: {
        fontSize: 13,
        fontWeight: '600'
    },
    card: {
        padding: 24,
        borderRadius: 20,
        marginBottom: 32,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    infoIcon: {
        marginBottom: 12,
        alignSelf: 'center'
    },
    desc: {
        fontSize: 15,
        lineHeight: 24,
        textAlign: 'center',
        opacity: 0.9
    },
    section: {
        gap: 12
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 1
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    linkLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    linkText: {
        fontSize: 16,
        fontWeight: '600'
    },
    footer: {
        marginTop: 48,
        alignItems: 'center',
        gap: 4
    },
    copyright: {
        fontSize: 13,
        fontWeight: '600'
    },
    rights: {
        fontSize: 12,
        opacity: 0.7
    }
});
