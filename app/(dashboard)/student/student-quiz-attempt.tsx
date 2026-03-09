import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

export default function StudentQuizAttempt() {
    const { isDark, colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { url, title } = useLocalSearchParams<{ url: string; title: string }>();

    const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
    const [progress, setProgress] = useState(0);

    if (!url) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? "#0f0f0f" : "#FAFAFA" }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <View style={[styles.header, { paddingTop: insets.top, backgroundColor: isDark ? "#0f0f0f" : "#FFF", borderBottomColor: isDark ? "#222" : "#EDEDED" }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close" size={24} color={isDark ? "#FFF" : "#111"} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? "#FFF" : "#111" }]} numberOfLines={1}>Quiz</Text>
                    <View style={styles.headerBtn} />
                </View>
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={52} color={colors.textSecondary} />
                    <Text style={[styles.errorText, { color: colors.text }]}>No quiz URL provided.</Text>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
                        <Text style={styles.retryBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#0f0f0f" : "#FFF" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#0f0f0f" : "#FFF"} />

            {/* ── Header ── */}
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top,
                        backgroundColor: isDark ? "#0f0f0f" : "#FFF",
                        borderBottomColor: isDark ? "#222" : "#EDEDED",
                    },
                ]}
            >
                {/* Close / Back */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.headerBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="close" size={24} color={isDark ? "#FFF" : "#111"} />
                </TouchableOpacity>

                {/* Title */}
                <Text
                    style={[styles.headerTitle, { color: isDark ? "#FFF" : "#111" }]}
                    numberOfLines={1}
                >
                    {title || "Quiz Attempt"}
                </Text>

                {/* Reload button */}
                <TouchableOpacity
                    onPress={() => setLoadState("loading")}
                    style={styles.headerBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="refresh" size={20} color={isDark ? "#FFF" : "#111"} />
                </TouchableOpacity>
            </View>

            {/* ── Progress bar ── */}
            {loadState === "loading" && (
                <View style={[styles.progressBg, { backgroundColor: isDark ? "#222" : "#F3F4F6" }]}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${progress}%`, backgroundColor: colors.primary },
                        ]}
                    />
                </View>
            )}

            {/* ── Error state ── */}
            {loadState === "error" && (
                <View style={styles.center}>
                    <View style={[styles.errorIconRing, { backgroundColor: "#FEE2E2" }]}>
                        <Ionicons name="wifi-outline" size={36} color="#EF4444" />
                    </View>
                    <Text style={[styles.errorTitle, { color: colors.text }]}>Failed to Load</Text>
                    <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                        Check your internet connection and try again.
                    </Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                        onPress={() => setLoadState("loading")}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="refresh" size={16} color="#FFF" />
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── WebView ── */}
            <WebView
                source={{ uri: decodeURIComponent(url) }}
                style={[styles.webview, loadState === "error" && { height: 0 }]}
                onLoadStart={() => {
                    setLoadState("loading");
                    setProgress(10);
                }}
                onLoadProgress={({ nativeEvent }) => {
                    setProgress(Math.round(nativeEvent.progress * 100));
                }}
                onLoad={() => {
                    setLoadState("ready");
                    setProgress(100);
                }}
                onError={() => setLoadState("error")}
                onHttpError={() => setLoadState("error")}
                javaScriptEnabled
                domStorageEnabled
                thirdPartyCookiesEnabled
                mixedContentMode="compatibility"
                allowsInlineMediaPlayback
                renderLoading={() => (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                            Loading quiz…
                        </Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    // ── Header ──────────────────────────────────────────────────────────────────
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 6,
        paddingVertical: 8,
        borderBottomWidth: 1,
        gap: 4,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    headerTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: -0.3,
        textAlign: "center",
    },

    // ── Progress bar ─────────────────────────────────────────────────────────────
    progressBg: {
        height: 3,
        width: "100%",
    },
    progressFill: {
        height: 3,
    },

    // ── WebView ──────────────────────────────────────────────────────────────────
    webview: {
        flex: 1,
    },

    // ── States ───────────────────────────────────────────────────────────────────
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 28,
        gap: 12,
    },
    errorIconRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: "800",
        letterSpacing: -0.3,
    },
    errorText: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 21,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: "500",
        marginTop: 8,
    },
    retryBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 8,
    },
    retryBtnText: {
        color: "#FFF",
        fontSize: 15,
        fontWeight: "700",
    },
});
