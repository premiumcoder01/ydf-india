import { AppHeader } from '@/components';
import { useTheme } from '@/context/ThemeContext';
import { getActivityDetails } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import RenderHTML from 'react-native-render-html';
import { WebView } from 'react-native-webview';

export default function StudentActivityDetail() {
    const { cmid, name } = useLocalSearchParams<{ cmid: string; name: string }>();
    const { colors, isDark } = useTheme();
    const { width } = Dimensions.get('window');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notAccessible, setNotAccessible] = useState(false);
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [webviewUrl, setWebviewUrl] = useState<string | null>(null);
    const [webviewLoading, setWebviewLoading] = useState(false);

    useEffect(() => {
        fetchActivityDetails();
    }, []);

    const fetchActivityDetails = async () => {
        setLoading(true);
        setError(null);
        setNotAccessible(false);
        setWebviewUrl(null);
        try {
            const authData = await AsyncStorage.getItem('authData');
            if (!authData) {
                setError('Authentication required. Please log in again.');
                return;
            }
            const { token } = JSON.parse(authData);

            const res = await getActivityDetails(token, Number(cmid));

            // ── HTTP-level failure (network / auth errors) ───────────────────────
            if (!res.success) {
                setError(res.error || res.message || 'Could not load this activity.');
                return;
            }

            // ── The server returns HTTP 200 even for business-logic errors.
            //    The actual success/failure lives in res.data.success (payload level).
            const payload = res.data;                          // { success, data, message }
            const payloadSuccess: boolean = payload?.success !== false; // treat missing as true
            const payloadData = payload?.data ?? payload;     // nested content object
            const payloadMessage: string = payload?.message ?? '';

            if (!payloadSuccess) {
                // Detect "not accessible": message says so OR webview_only + empty URL
                const isNotAccessible =
                    payloadMessage.toLowerCase().includes('not accessible') ||
                    (payloadData?.content_type === 'webview_only' && !payloadData?.webview_url);

                if (isNotAccessible) {
                    setNotAccessible(true);
                } else {
                    setError(payloadMessage || 'Could not load this activity.');
                }
                return;
            }

            // ── Render content ───────────────────────────────────────────────────
            const rawUrl = payloadData?.webview_url;
            const cleanUrl = rawUrl ? rawUrl.replace(/&amp;/g, "&") : null;

            if (payloadData?.content_type === 'html_page') {
                setHtmlContent(payloadData.content_html || '<p>No content available.</p>');
            } else if (payloadData?.content_type === 'webview_only' && cleanUrl) {
                setWebviewUrl(cleanUrl);
                setWebviewLoading(true);
            } else if (cleanUrl) {
                // Fallback: any response with a webview_url → open inline
                setWebviewUrl(cleanUrl);
                setWebviewLoading(true);
            } else {
                setError('This activity type is not yet supported.');
            }
        } catch (err: any) {
            setError('An error occurred while loading this activity.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0F0F' : '#F8F9FA' }]}>
                <AppHeader title={name || 'Activity'} onBack={() => router.back()} />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Loading content…
                    </Text>
                </View>
            </View>
        );
    }

    // ─── Not Accessible ─────────────────────────────────────────────────────────
    if (notAccessible) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0F0F' : '#F8F9FA' }]}>
                <AppHeader title={name || 'Activity'} onBack={() => router.back()} />
                <View style={styles.center}>
                    <View style={[styles.accessIconRing, { backgroundColor: isDark ? '#2A1A00' : '#FFF7ED' }]}>
                        <Ionicons name="lock-closed-outline" size={52} color="#F59E0B" />
                    </View>
                    <Text style={[styles.errorTitle, { color: colors.text }]}>Access Restricted</Text>
                    <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
                        You currently don't have access to this activity.{'\n'}
                        Please contact your instructor or check back later.
                    </Text>
                    <TouchableOpacity
                        style={[styles.backBtn, { borderColor: isDark ? '#333' : '#E5E7EB' }]}
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ─── Error ──────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0F0F' : '#F8F9FA' }]}>
                <AppHeader title={name || 'Activity'} onBack={() => router.back()} />
                <View style={styles.center}>
                    <View style={[styles.errorIconRing, { backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6' }]}>
                        <Ionicons name="alert-circle-outline" size={52} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.errorTitle, { color: colors.text }]}>Couldn't Load</Text>
                    <Text style={[styles.errorSub, { color: colors.textSecondary }]}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                        onPress={fetchActivityDetails}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="refresh" size={16} color="#FFF" />
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.backBtn, { borderColor: isDark ? '#333' : '#E5E7EB' }]}
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ─── WebView (webview_only) ──────────────────────────────────────────────────
    if (webviewUrl) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0F0F' : '#F8F9FA' }]}>
                <AppHeader title={name || 'Activity'} onBack={() => router.back()} />
                <View style={styles.webviewWrapper}>
                    <WebView
                        source={{ uri: webviewUrl }}
                        style={styles.webview}
                        onLoadStart={() => setWebviewLoading(true)}
                        onLoadEnd={() => setWebviewLoading(false)}
                        javaScriptEnabled
                        domStorageEnabled
                        startInLoadingState={false}
                        allowsBackForwardNavigationGestures
                    />
                    {webviewLoading && (
                        <View style={[styles.webviewLoader, { backgroundColor: isDark ? '#0F0F0F' : '#F8F9FA' }]}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                                Loading…
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    }

    // ─── HTML Page Content ──────────────────────────────────────────────────────
    const tagsStyles: any = {
        body: {
            color: colors.textSecondary,
            fontSize: 15,
            lineHeight: 24,
        },
        p: { marginBottom: 14, marginTop: 0 },
        strong: { fontWeight: '700', color: colors.text },
        ul: { marginBottom: 14, marginTop: 8, paddingLeft: 8 },
        ol: { marginBottom: 14, marginTop: 8, paddingLeft: 8 },
        li: { marginBottom: 10, fontSize: 15, lineHeight: 24 },
        h1: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 14, marginTop: 20, letterSpacing: -0.5 },
        h2: { color: colors.text, fontSize: 19, fontWeight: '700', marginBottom: 12, marginTop: 18, letterSpacing: -0.4 },
        h3: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 10, marginTop: 14, letterSpacing: -0.3 },
        img: { marginVertical: 12, borderRadius: 12 },
        a: { color: colors.primary, textDecorationLine: 'underline' },
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0F0F' : '#F8F9FA' }]}>
            <AppHeader title={name || 'Activity'} onBack={() => router.back()} />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.contentCard, { backgroundColor: isDark ? '#1A1A1A' : '#FFF', borderColor: isDark ? '#2A2A2A' : '#E5E7EB' }]}>
                    {htmlContent ? (
                        <RenderHTML
                            contentWidth={width - 64}
                            source={{ html: htmlContent }}
                            tagsStyles={tagsStyles}
                            enableExperimentalMarginCollapsing
                        />
                    ) : (
                        <Text style={[styles.noContent, { color: colors.textSecondary }]}>
                            No content available.
                        </Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 8,
    },
    errorIconRing: {
        width: 88,
        height: 88,
        borderRadius: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    accessIconRing: {
        width: 88,
        height: 88,
        borderRadius: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    errorSub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 4,
    },
    retryBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    backBtn: {
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    backBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    scroll: { flex: 1 },
    scrollContent: {
        padding: 20,
        paddingBottom: 60,
    },
    contentCard: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    noContent: {
        textAlign: 'center',
        fontSize: 15,
        padding: 24,
    },
    webviewWrapper: {
        flex: 1,
        position: 'relative',
    },
    webview: {
        flex: 1,
    },
    webviewLoader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
});
