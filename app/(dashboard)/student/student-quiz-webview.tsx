import { AppHeader, Button } from '@/components';
import { useTheme } from '@/context/ThemeContext';
import { getQuizAccessInfo, getQuizMyAttempts, startQuizAttempt } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function StudentQuizWebView() {
    const { cmid, name } = useLocalSearchParams();
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [accessInfo, setAccessInfo] = useState<any>(null);
    const [attempts, setAttempts] = useState<any[]>([]);
    const [baseUrls, setBaseUrls] = useState<any>({ attempt: '', review: '' });
    const [error, setError] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        fetchQuizData();
    }, []);

    const fetchQuizData = async () => {
        setLoading(true);
        try {
            const authData = await AsyncStorage.getItem('authData');
            if (!authData) return;
            const { token } = JSON.parse(authData);

            const [accessRes, attemptsRes] = await Promise.all([
                getQuizAccessInfo(token, Number(cmid)),
                getQuizMyAttempts(token, Number(cmid))
            ]);

            // ── Parse access info ────────────────────────────────────────────
            // The API may return: { success:true, data: { success:false, data:{...}, message:"..." } }
            // OR on success:      { success:true, data: { success:true,  data:{...} } }
            let accessData: any = null;
            let accessError: string | null = null;

            if (accessRes.success && accessRes.data) {
                const outer = accessRes.data;
                // Inner wrapper has its own success flag
                if (outer.success === false) {
                    // Quiz not accessible (not enrolled, not yet unlocked, etc.)
                    accessError = outer.message || 'This quiz is not accessible at this time.';
                } else {
                    accessData = outer.data || outer;
                }
            } else if (!accessRes.success) {
                // requireloginerror or other Moodle exception
                const errCode = (accessRes as any).errorcode;
                if (errCode === 'requireloginerror' || errCode === 'nopermissions') {
                    accessError = 'This quiz is not yet available to you.';
                } else {
                    accessError = accessRes.error || 'This quiz information could not be retrieved.';
                }
            }

            if (accessData) {
                setAccessInfo(accessData);
            }

            // ── Parse attempts ───────────────────────────────────────────────
            if (attemptsRes.success && attemptsRes.data) {
                const actualData = attemptsRes.data.data || attemptsRes.data;
                setAttempts(actualData.attempts || []);
                setBaseUrls({
                    attempt: actualData.attempt_url,
                    review: actualData.review_url
                });
            } else {
                // requireloginerror / nopermissions / any error → treat as no attempts yet
                setAttempts([]);
            }

            // ── Set error only if access info is truly unavailable ───────────
            if (accessError && !accessData) {
                setError(accessError);
            }
        } catch (err) {
            setError('An error occurred while loading quiz');
        } finally {
            setLoading(false);
        }
    };

    // Opens a quiz URL inside the app (in-app WebView)
    const openInApp = (url: string) => {
        router.push({
            pathname: '/(dashboard)/student/student-quiz-attempt',
            params: { url: encodeURIComponent(url), title: String(name) },
        });
    };

    const handleStartQuiz = async () => {
        setStarting(true);
        try {
            // ── 1. If already finished → open review ───────────────────────────
            if (accessInfo?.isfinished) {
                const lastAttempt = attempts[attempts.length - 1];
                if (lastAttempt && baseUrls.review) {
                    openInApp(`${baseUrls.review}${lastAttempt.id}`);
                    return;
                }
            }

            // ── 2. If there's an in-progress attempt → resume directly (no API call needed) ──
            if (inProgressAttempt && baseUrls.attempt) {
                openInApp(`${baseUrls.attempt}${inProgressAttempt.id}`);
                return;
            }

            // ── 3. Start a brand-new attempt ───────────────────────────────────
            const authData = await AsyncStorage.getItem('authData');
            if (!authData) return;
            const { token } = JSON.parse(authData);

            const response = await startQuizAttempt(token, Number(cmid));
            const actualData = response.data?.data || response.data;

            if ((response.success || actualData?.success) && actualData?.attempt_url) {
                openInApp(actualData.attempt_url);
            } else {
                Alert.alert('Notice', actualData?.message || 'You cannot start this quiz at this time.');
            }
        } catch (err) {
            Alert.alert('Error', 'Could not access the quiz');
        } finally {
            setStarting(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <AppHeader title={name as string || 'Quiz'} onBack={() => router.back()} />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    if (error) {
        const isAccessError = error.includes('not yet available') || error.includes('not accessible');
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <AppHeader title={name as string || 'Quiz'} onBack={() => router.back()} />
                <View style={styles.center}>
                    <View style={[styles.errorIconContainer, isAccessError && { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons
                            name={isAccessError ? 'lock-closed-outline' : 'document-lock-outline'}
                            size={60}
                            color={isAccessError ? '#D97706' : colors.textSecondary}
                        />
                    </View>
                    <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                    {isAccessError && (
                        <Text style={[styles.errorSubText, { color: colors.textSecondary }]}>
                            Complete the previous steps to unlock this quiz.
                        </Text>
                    )}
                    <Button title="Go Back" onPress={() => router.back()} style={styles.backBtn} />
                </View>
            </View>
        );
    }

    const canAttempt = accessInfo?.preventnewattemptreasons?.length === 0 && !accessInfo?.isfinished;
    const inProgressAttempt = attempts.find((a: any) => a.state === 'inprogress');

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0F0F' : '#F8F9FA' }]}>
            <AppHeader title={name as string || 'Quiz Details'} onBack={() => router.back()} />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={[styles.mainCard, { backgroundColor: isDark ? '#1A1A1A' : '#FFF' }]}>
                    <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
                    <View style={styles.cardContent}>
                        <View style={styles.quizHeader}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="document-text" size={24} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.quizName, { color: colors.text }]} numberOfLines={2}>{name}</Text>
                                <Text style={[styles.quizSub, { color: colors.textSecondary }]}>Assessment Quiz</Text>
                            </View>
                        </View>

                        <View style={styles.statusSection}>
                            {accessInfo?.isfinished ? (
                                <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
                                    <Ionicons name="checkmark-circle" size={14} color="#166534" />
                                    <Text style={[styles.badgeText, { color: '#166534' }]}>Completed</Text>
                                </View>
                            ) : inProgressAttempt ? (
                                <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}>
                                    <Ionicons name="play-circle" size={14} color="#1D4ED8" />
                                    <Text style={[styles.badgeText, { color: '#1D4ED8' }]}>In Progress</Text>
                                </View>
                            ) : (
                                <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                                    <Ionicons name="time" size={14} color="#92400E" />
                                    <Text style={[styles.badgeText, { color: '#92400E' }]}>Pending</Text>
                                </View>
                            )}
                        </View>

                        {!canAttempt && accessInfo?.preventnewattemptreasons?.length > 0 && (
                            <View style={styles.warningBox}>
                                <Ionicons name="information-circle" size={20} color="#F59E0B" />
                                <Text style={styles.warningText}>{accessInfo.preventnewattemptreasons[0]}</Text>
                            </View>
                        )}

                        <Button
                            title={accessInfo?.isfinished ? "Review Quiz" : inProgressAttempt ? "Continue Attempt" : "Start Quiz Attempt"}
                            onPress={handleStartQuiz}
                            loading={starting}
                            disabled={!canAttempt && !accessInfo?.isfinished && !inProgressAttempt}
                            style={styles.startBtn}
                        />
                    </View>
                </View>

                {/* Attempt History */}
                <View style={styles.historySection}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="list" size={20} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Attempt History</Text>
                    </View>

                    {attempts.length === 0 ? (
                        <View style={[styles.emptyHistory, { backgroundColor: isDark ? '#1A1A1A' : '#FFF' }]}>
                            <Ionicons name="reader-outline" size={40} color={colors.textSecondary + '50'} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No attempts found for this quiz.</Text>
                        </View>
                    ) : (
                        attempts.map((attempt: any) => {
                            const isFinished = attempt.state === 'finished';
                            let reviewUrl = '';

                            if (isFinished && baseUrls.review) {
                                reviewUrl = `${baseUrls.review}${attempt.id}`;
                            }

                            const CardBody = (
                                <View style={[styles.attemptCard, { backgroundColor: isDark ? '#1A1A1A' : '#FFF' }]}>
                                    <View style={styles.attemptTop}>
                                        <View>
                                            <Text style={[styles.attemptDate, { color: colors.text }]}>
                                                {formatDate(attempt.timestart)}
                                            </Text>
                                            <Text style={[styles.attemptTime, { color: colors.textSecondary }]}>
                                                Started: {formatTime(attempt.timestart)}
                                            </Text>
                                            {attempt.timefinish > 0 && (
                                                <Text style={[styles.attemptTime, { color: colors.textSecondary }]}>
                                                    Finished: {formatTime(attempt.timefinish)}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={[styles.stateBadge, {
                                            backgroundColor: attempt.state === 'finished' ? '#E0F2FE' :
                                                attempt.state === 'inprogress' ? '#DBEAFE' : '#F3F4F6'
                                        }]}>
                                            <Text style={[styles.stateText, {
                                                color: attempt.state === 'finished' ? '#0369A1' :
                                                    attempt.state === 'inprogress' ? '#1D4ED8' : '#4B5563'
                                            }]}>
                                                {attempt.state}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Grade row — shown for finished; resume row — shown for in-progress */}
                                    <View style={styles.gradeBox}>
                                        <View>
                                            <Text style={[styles.gradeLabel, { color: colors.textSecondary }]}>
                                                {isFinished ? 'Grade Achieved' : 'Status'}
                                            </Text>
                                            {isFinished ? (
                                                <Text style={[styles.gradeValue, { color: colors.primary }]}>
                                                    {parseFloat(attempt.sumgrades ?? 0).toFixed(2)}
                                                </Text>
                                            ) : (
                                                <Text style={[styles.gradeValue, { color: '#1D4ED8', fontSize: 15 }]}>
                                                    In Progress
                                                </Text>
                                            )}
                                        </View>
                                        {/* Action label */}
                                        <View style={styles.reviewAction}>
                                            <Text style={[styles.reviewText, { color: colors.primary }]}>
                                                {isFinished ? 'Review' : 'Resume'}
                                            </Text>
                                            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                                        </View>
                                    </View>
                                </View>
                            );

                            // Both finished AND in-progress attempts are now tappable
                            const tapUrl = isFinished
                                ? reviewUrl
                                : `${baseUrls.attempt}${attempt.id}`;

                            if (tapUrl) {
                                return (
                                    <TouchableOpacity
                                        key={attempt.id}
                                        style={{ marginBottom: 16 }}
                                        activeOpacity={0.8}
                                        onPress={() => openInApp(tapUrl)}
                                    >
                                        {CardBody}
                                    </TouchableOpacity>
                                );
                            }

                            return (
                                <View key={attempt.id} style={{ marginBottom: 16 }}>
                                    {CardBody}
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    errorIconContainer: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    scroll: { padding: 20 },
    mainCard: {
        borderRadius: 24, overflow: 'hidden', elevation: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, marginBottom: 32,
    },
    cardAccent: { height: 6, width: '100%' },
    cardContent: { padding: 24 },
    quizHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    iconContainer: {
        width: 50, height: 50, borderRadius: 15,
        backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center',
    },
    quizName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    quizSub: { fontSize: 14, fontWeight: '500' },
    statusSection: { flexDirection: 'row', marginBottom: 24 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    warningBox: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        backgroundColor: '#FFFBEB', borderColor: '#FEF3C7', borderWidth: 1,
        borderRadius: 16, marginBottom: 24, gap: 12,
    },
    warningText: { fontSize: 14, color: '#92400E', flex: 1, lineHeight: 20, fontWeight: '500' },
    startBtn: { height: 56, borderRadius: 16 },
    historySection: { marginTop: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '800' },
    emptyHistory: {
        padding: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.1)',
    },
    emptyText: { textAlign: 'center', marginTop: 16, fontSize: 15, fontWeight: '500' },
    attemptCard: {
        borderRadius: 20, padding: 20, marginBottom: 16,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
    },
    attemptTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    attemptDate: { fontSize: 16, fontWeight: '700' },
    attemptTime: { fontSize: 13, fontWeight: '500', marginTop: 2 },
    stateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    stateText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    gradeBox: {
        borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 16,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    gradeLabel: { fontSize: 13, fontWeight: '500' },
    gradeValue: { fontSize: 20, fontWeight: '900' },
    reviewAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    reviewText: { fontSize: 13, fontWeight: '700' },
    errorText: { fontSize: 16, textAlign: 'center', marginTop: 20, marginBottom: 12, lineHeight: 24, fontWeight: '600' },
    errorSubText: { fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 22, paddingHorizontal: 12 },
    backBtn: { minWidth: 180 },
});
