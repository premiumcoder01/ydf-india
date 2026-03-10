import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";

// ─── JS injected into Moodle to detect quiz submission ───────────────────────
const QUIZ_OBSERVER_JS = `
(function() {
    // Watch for Moodle "quiz summary" and "review" pages after submission
    var _lastUrl = location.href;
    setInterval(function() {
        if (location.href !== _lastUrl) {
            _lastUrl = location.href;
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'navigation', url: location.href }));
        }
    }, 800);
    // Tell RN the page title when it changes
    var observer = new MutationObserver(function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'title', title: document.title }));
    });
    observer.observe(document.querySelector('title') || document.head, { childList: true, subtree: true });
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready', url: location.href }));
})();
true;
`;

export default function StudentQuizAttempt() {
    const { isDark, colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { url, title } = useLocalSearchParams<{ url: string; title: string }>();

    const webViewRef = useRef<WebView>(null);
    const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
    const [progress, setProgress] = useState(0);
    const [pageTitle, setPageTitle] = useState<string>(title || "Quiz");
    const [canGoBack, setCanGoBack] = useState(false);

    // ── No URL guard ──────────────────────────────────────────────────────────
    if (!url) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? "#0f0f0f" : "#FAFAFA" }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: insets.top + 4,
                            backgroundColor: isDark ? "#111" : "#FFF",
                            borderBottomColor: isDark ? "#222" : "#EDEDED",
                        },
                    ]}
                >
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.headerBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={24} color={isDark ? "#FFF" : "#111"} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? "#FFF" : "#111" }]} numberOfLines={1}>
                        Quiz
                    </Text>
                    <View style={styles.headerBtn} />
                </View>
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={52} color={colors.textSecondary} />
                    <Text style={[styles.errorTitle, { color: colors.text }]}>No quiz URL provided.</Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                    >
                        <Text style={styles.retryBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Handle messages from Moodle page ──────────────────────────────────────
    const handleMessage = (event: any) => {
        try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === "title" && msg.title) {
                setPageTitle(msg.title);
            }
            // Detect quiz review page (submitted successfully)
            if (msg.type === "navigation" && msg.url) {
                const u: string = msg.url;
                if (u.includes("review.php") || u.includes("summary.php")) {
                    // Quiz was submitted — user is now on review or summary page
                    // We could optionally pop back to the quiz landing, but let the
                    // student read the review first — they can press Close
                }
            }
        } catch (_) { }
    };

    // ── Warn before closing if quiz might be in progress ─────────────────────
    const handleClose = () => {
        if (loadState === "ready" && !pageTitle.toLowerCase().includes("review")) {
            Alert.alert(
                "Close Quiz?",
                "Your progress is automatically saved. You can continue this attempt later.",
                [
                    { text: "Keep Attempting", style: "cancel" },
                    { text: "Close", style: "destructive", onPress: () => router.back() },
                ],
                { cancelable: true }
            );
        } else {
            router.back();
        }
    };

    const decodedUrl = decodeURIComponent(url);
    console.log(decodedUrl)

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#0f0f0f" : "#FFF" }]}>
            <StatusBar
                barStyle={isDark ? "light-content" : "dark-content"}
                backgroundColor={isDark ? "#0f0f0f" : "#FFF"}
            />

            {/* ── Header ─────────────────────────────────────────────────── */}
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top + 4,
                        backgroundColor: isDark ? "#111" : "#FFF",
                        borderBottomColor: isDark ? "#222" : "#EDEDED",
                    },
                ]}
            >
                {/* Back / Close */}
                <TouchableOpacity
                    onPress={handleClose}
                    style={styles.headerBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="close" size={24} color={isDark ? "#FFF" : "#111"} />
                </TouchableOpacity>

                {/* Title */}
                <View style={styles.headerMid}>
                    {loadState === "loading" && (
                        <ActivityIndicator
                            size="small"
                            color={colors.primary}
                            style={{ marginBottom: Platform.OS === "ios" ? 0 : 2 }}
                        />
                    )}
                    <Text
                        style={[styles.headerTitle, { color: isDark ? "#FFF" : "#111" }]}
                        numberOfLines={1}
                    >
                        {title || "Quiz Attempt"}
                    </Text>
                </View>

                {/* Reload */}
                <TouchableOpacity
                    onPress={() => webViewRef.current?.reload()}
                    style={styles.headerBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="refresh" size={20} color={isDark ? "#FFF" : "#111"} />
                </TouchableOpacity>
            </View>

            {/* ── Progress bar ────────────────────────────────────────────── */}
            <View style={[styles.progressBg, { backgroundColor: isDark ? "#1A1A1A" : "#F3F4F6" }]}>
                <View
                    style={[
                        styles.progressFill,
                        {
                            width: loadState === "ready" ? "100%" : `${progress}%`,
                            backgroundColor: colors.primary,
                            opacity: loadState === "ready" ? 0 : 1,
                        },
                    ]}
                />
            </View>

            {/* ── Error state ─────────────────────────────────────────────── */}
            {loadState === "error" && (
                <View style={styles.center}>
                    <View style={[styles.errorIconRing, { backgroundColor: "#FEE2E2" }]}>
                        <Ionicons name="wifi-outline" size={36} color="#EF4444" />
                    </View>
                    <Text style={[styles.errorTitle, { color: colors.text }]}>Failed to Load</Text>
                    <Text style={[styles.errorSubText, { color: colors.textSecondary }]}>
                        Check your internet connection and try again.
                    </Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                        onPress={() => {
                            setLoadState("loading");
                            webViewRef.current?.reload();
                        }}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="refresh" size={16} color="#FFF" />
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── WebView ─────────────────────────────────────────────────── */}
            <WebView
                ref={webViewRef}
                source={{ uri: decodedUrl }}
                style={[styles.webview, loadState === "error" && { height: 0, flex: 0 }]}
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
                onHttpError={({ nativeEvent }) => {
                    // Only treat real HTTP errors (4xx, 5xx) as errors
                    if (nativeEvent.statusCode >= 400) setLoadState("error");
                }}
                onNavigationStateChange={(navState) => {
                    setCanGoBack(navState.canGoBack);
                }}
                onMessage={handleMessage}
                injectedJavaScript={QUIZ_OBSERVER_JS}
                javaScriptEnabled
                domStorageEnabled
                thirdPartyCookiesEnabled
                sharedCookiesEnabled
                mixedContentMode="compatibility"
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                scalesPageToFit={Platform.OS === "android"}
                renderLoading={() => (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                            Loading quiz…
                        </Text>
                    </View>
                )}
                startInLoadingState
            />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 6,
        paddingBottom: 8,
        borderBottomWidth: 1,
    },
    headerBtn: {
        width: 44, height: 44, borderRadius: 22,
        justifyContent: "center", alignItems: "center",
        flexShrink: 0,
    },
    headerMid: {
        flex: 1, flexDirection: "row", alignItems: "center",
        justifyContent: "center", gap: 8,
    },
    headerTitle: {
        fontSize: 16, fontWeight: "700", letterSpacing: -0.3,
        textAlign: "center", flexShrink: 1,
    },

    // Progress bar
    progressBg: { height: 3, width: "100%" },
    progressFill: { height: 3 },

    // WebView
    webview: { flex: 1 },

    // States
    center: {
        flex: 1, justifyContent: "center", alignItems: "center",
        padding: 28, gap: 12,
    },
    errorIconRing: {
        width: 80, height: 80, borderRadius: 40,
        justifyContent: "center", alignItems: "center", marginBottom: 8,
    },
    errorTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
    errorSubText: { fontSize: 14, textAlign: "center", lineHeight: 21 },
    loadingText: { fontSize: 14, fontWeight: "500", marginTop: 8 },
    retryBtn: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 28, paddingVertical: 14,
        borderRadius: 14, marginTop: 8,
    },
    retryBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
