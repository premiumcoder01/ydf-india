import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getPrivacyPolicy } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { MotiView } from "moti";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import RenderHtml from "react-native-render-html";

export default function ReviewerPrivacyScreen() {
    const { isDark, colors } = useTheme();
    const { width } = useWindowDimensions();
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const authDataStr = await AsyncStorage.getItem("authData");
                if (authDataStr) {
                    const authData = JSON.parse(authDataStr);
                    if (authData.token) {
                        const res = await getPrivacyPolicy(authData.token);
                        if (res.success && res.data) {
                            setContent(res.data.content || "<p>No privacy policy available.</p>");
                        } else {
                            setContent("<p>Failed to load privacy policy.</p>");
                        }
                    }
                } else {
                    setContent("<p>Please login to view privacy policy.</p>");
                }
            } catch (e) {
                setContent("<p>Failed to load privacy policy.</p>");
            } finally {
                setLoading(false);
            }
        };
        fetchPolicy();
    }, []);

    const tagsStyles = {
        body: {
            color: colors.text,
            fontSize: 15,
            lineHeight: 24,
            fontFamily: 'System',
        },
        p: {
            color: colors.textSecondary,
            marginBottom: 16,
            lineHeight: 24,
        },
        h1: {
            color: colors.text,
            marginTop: 24,
            marginBottom: 12,
            fontSize: 24,
            fontWeight: '700',
        },
        h2: {
            color: colors.text,
            marginTop: 24,
            marginBottom: 12,
            fontSize: 20,
            fontWeight: '700',
        },
        h3: {
            color: colors.text,
            marginTop: 20,
            marginBottom: 12,
            fontSize: 18,
            fontWeight: '700',
        },
        h4: {
            color: colors.text,
            marginTop: 18,
            marginBottom: 10,
            fontSize: 16,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        strong: {
            color: colors.text,
            fontWeight: '700',
        },
        a: {
            color: colors.primary,
            textDecorationLine: 'none',
            fontWeight: '600',
        },
        ul: {
            marginBottom: 16,
            paddingLeft: 4,
        },
        li: {
            color: colors.textSecondary,
            marginBottom: 8,
            lineHeight: 22,
        },
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#ffffff", "#ffffff", "#f8f9fa"]}
                style={styles.background}
                locations={[0, 0.4, 1]}
            />

            <AppHeader title="Privacy Policy" onBack={() => router.back()} />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 600 }}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.contentContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[styles.infoBanner, { backgroundColor: colors.primary + '10' }]}>
                            <Ionicons name="lock-closed" size={24} color={colors.primary} />
                            <Text style={[styles.infoBannerText, { color: colors.text }]}>
                                Your privacy is important to us. Learn how we handle your personal data and protect your information.
                            </Text>
                        </View>

                        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <RenderHtml
                                contentWidth={width - 72}
                                source={{ html: content }}
                                tagsStyles={tagsStyles as any}
                                systemFonts={["System", "sans-serif"]}
                            />
                        </View>


                        {/* Copyright Notice */}
                        <View style={styles.footer}>
                            <Text style={[styles.footerText, { color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }]}>
                                © {new Date().getFullYear()} Youth Dreamers Foundation. All rights reserved.
                            </Text>
                        </View>
                    </ScrollView>
                </MotiView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 60,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        gap: 12,
    },
    infoBannerText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    card: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
    },
    footer: {
        marginTop: 32,
        marginBottom: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
});
