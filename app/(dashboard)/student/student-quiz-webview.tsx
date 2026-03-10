import { AppHeader, Button } from '@/components';
import { useTheme } from '@/context/ThemeContext';
import { getQuizAccessInfo, getQuizMyAttempts, startQuizAttempt } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function StudentQuizWebView() {
    const { cmid, name } = useLocalSearchParams();
    const { colors, isDark } = useTheme();

    // ── Core state ────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [accessInfo, setAccessInfo] = useState<any>(null);
    const [attempts, setAttempts] = useState<any[]>([]);
    const [baseUrls, setBaseUrls] = useState<any>({ attempt: '', review: '' });
    const [error, setError] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);

    // ── Preflight/password modal ──────────────────────────────────────────────
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [quizPassword, setQuizPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [submittingPassword, setSubmittingPassword] = useState(false);
    const passwordInputRef = useRef<TextInput>(null);

    // ── Animation for modal ───────────────────────────────────────────────────
    const modalSlide = useRef(new Animated.Value(60)).current;
    const modalOpacity = useRef(new Animated.Value(0)).current;

    const animateModalIn = () => {
        modalSlide.setValue(60);
        modalOpacity.setValue(0);
        Animated.parallel([
            Animated.spring(modalSlide, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
            Animated.timing(modalOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start();
    };

    useEffect(() => {
        fetchQuizData();
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // Data fetch
    // ─────────────────────────────────────────────────────────────────────────
    const fetchQuizData = async () => {
        setLoading(true);
        try {
            const authData = await AsyncStorage.getItem('authData');
            if (!authData) return;
            const { token } = JSON.parse(authData);

            const [accessRes, attemptsRes] = await Promise.all([
                getQuizAccessInfo(token, Number(cmid)),
                getQuizMyAttempts(token, Number(cmid)),
            ]);

            // ── Parse access info ────────────────────────────────────────────
            let accessData: any = null;
            let accessError: string | null = null;

            if (accessRes.success && accessRes.data) {
                const outer = accessRes.data;
                if (outer.success === false) {
                    accessError = outer.message || 'This quiz is not accessible at this time.';
                } else {
                    accessData = outer.data || outer;
                }
            } else if (!accessRes.success) {
                const errCode = (accessRes as any).errorcode;
                if (errCode === 'requireloginerror' || errCode === 'nopermissions') {
                    accessError = 'This quiz is not yet available to you.';
                } else {
                    accessError = accessRes.error || 'This quiz information could not be retrieved.';
                }
            }

            if (accessData) setAccessInfo(accessData);

            // ── Parse attempts ───────────────────────────────────────────────
            if (attemptsRes.success && attemptsRes.data) {
                const actualData = attemptsRes.data.data || attemptsRes.data;
                setAttempts(actualData.attempts || []);
                setBaseUrls({
                    attempt: actualData.attempt_url,
                    review: actualData.review_url,
                });
            } else {
                setAttempts([]);
            }

            if (accessError && !accessData) setError(accessError);
        } catch (err) {
            setError('An error occurred while loading quiz');
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Navigation helper — open URL in in-app WebView
    // ─────────────────────────────────────────────────────────────────────────
    const openInApp = (url: string) => {
        router.push({
            pathname: '/(dashboard)/student/student-quiz-attempt',
            params: { url: encodeURIComponent(url), title: String(name) },
        });
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Start / Resume / Review quiz
    // ─────────────────────────────────────────────────────────────────────────
    const handleStartQuiz = async () => {
        // ── If already finished → open review ────────────────────────────────
        if (accessInfo?.isfinished) {
            const lastAttempt = attempts[attempts.length - 1];
            if (lastAttempt && baseUrls.review) {
                // Open review with the specific attempt ID
                openInApp(`${baseUrls.review}${lastAttempt.id}`);
            } else if (baseUrls.review) {
                // Fallback: attempts list is empty but quiz is finished
                // Open the review URL without appending an attempt ID
                // — the server will redirect to the correct review page
                openInApp(baseUrls.review);
            } else {
                Alert.alert('Notice', 'Review page is not available at this time.');
            }
            return;
        }

        // ── If there is an in-progress attempt → resume ───────────────────────
        if (inProgressAttempt && baseUrls.attempt) {
            openInApp(`${baseUrls.attempt}${inProgressAttempt.id}`);
            return;
        }

        // ── Preflight check required? Show password modal ─────────────────────
        if (accessInfo?.ispreflightcheckrequired) {
            setQuizPassword('');
            setPasswordError('');
            setPasswordVisible(false);
            setShowPasswordModal(true);
            animateModalIn();
            setTimeout(() => passwordInputRef.current?.focus(), 400);
            return;
        }

        // ── Start a fresh attempt ─────────────────────────────────────────────
        await doStartAttempt({});
    };

    const doStartAttempt = async (preflightdata: Record<string, string>) => {
        setStarting(true);
        try {
            const authData = await AsyncStorage.getItem('authData');
            if (!authData) return;
            const { token } = JSON.parse(authData);

            const response = await startQuizAttempt(token, Number(cmid), preflightdata, false);
            const actualData = response.data?.data || response.data;

            if ((response.success || actualData?.success) && actualData?.attempt_url) {
                openInApp(actualData.attempt_url);
            } else {
                Alert.alert('Notice', actualData?.message || 'You cannot start this quiz at this time.');
            }
        } catch {
            Alert.alert('Error', 'Could not access the quiz');
        } finally {
            setStarting(false);
        }
    };

    // ── Submit quiz password ─────────────────────────────────────────────────
    const handlePasswordSubmit = async () => {
        if (!quizPassword.trim()) {
            setPasswordError('Please enter the quiz password.');
            return;
        }
        setPasswordError('');
        setSubmittingPassword(true);
        setShowPasswordModal(false);

        await doStartAttempt({ quizpassword: quizPassword.trim() });
        setSubmittingPassword(false);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    const formatDate = (timestamp: number) =>
        new Date(timestamp * 1000).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
        });

    const formatTime = (timestamp: number) =>
        new Date(timestamp * 1000).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit',
        });

    const formatDateTime = (timestamp: number) =>
        new Date(timestamp * 1000).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

    const isEndTimeSoon = (ts: number) => {
        if (!ts) return false;
        const diffMs = ts * 1000 - Date.now();
        return diffMs > 0 && diffMs < 24 * 60 * 60 * 1000; // less than 24 h
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Derived values
    // ─────────────────────────────────────────────────────────────────────────
    const canAttempt =
        accessInfo?.preventnewattemptreasons?.length === 0 && !accessInfo?.isfinished;
    const inProgressAttempt = attempts.find((a: any) => a.state === 'inprogress');
    const finishedAttempts = attempts.filter((a: any) => a.state === 'finished');
    const totalAttempts = attempts.length;
    const endtime: number = accessInfo?.endtime ?? 0;
    const endtimeExpired = endtime > 0 && endtime * 1000 < Date.now();

    // ─────────────────────────────────────────────────────────────────────────
    // Loading state
    // ─────────────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <AppHeader title={name as string || 'Quiz'} onBack={() => router.back()} />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Loading quiz details…
                    </Text>
                </View>
            </View>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Error state
    // ─────────────────────────────────────────────────────────────────────────
    if (error) {
        const isAccessError =
            error.includes('not yet available') || error.includes('not accessible');
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <AppHeader title={name as string || 'Quiz'} onBack={() => router.back()} />
                <View style={styles.center}>
                    <View
                        style={[
                            styles.errorIconContainer,
                            { backgroundColor: isAccessError ? '#FEF3C7' : 'rgba(0,0,0,0.04)' },
                        ]}
                    >
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

    // ─────────────────────────────────────────────────────────────────────────
    // Determine main button label
    // ─────────────────────────────────────────────────────────────────────────
    const getButtonLabel = () => {
        if (accessInfo?.isfinished) return 'Review Quiz';
        if (inProgressAttempt) return 'Continue Attempt';
        return 'Start Quiz Attempt';
    };
    const buttonDisabled =
        !canAttempt && !accessInfo?.isfinished && !inProgressAttempt;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0F0F' : '#F3F4F6' }]}>
            <AppHeader title={name as string || 'Quiz Details'} onBack={() => router.back()} />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Main quiz card ─────────────────────────────────────── */}
                <View style={[styles.mainCard, { backgroundColor: isDark ? '#1A1A1A' : '#FFF' }]}>
                    <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
                    <View style={styles.cardContent}>

                        {/* Header row */}
                        <View style={styles.quizHeader}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="document-text" size={26} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={[styles.quizName, { color: colors.text }]}
                                    numberOfLines={2}
                                >
                                    {name}
                                </Text>
                                <Text style={[styles.quizSub, { color: colors.textSecondary }]}>
                                    Assessment Quiz
                                    {totalAttempts > 0 && ` · ${totalAttempts} attempt${totalAttempts > 1 ? 's' : ''}`}
                                </Text>
                            </View>
                        </View>

                        {/* Status + End time row */}
                        <View style={styles.metaRow}>
                            {/* Status badge */}
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
                            ) : endtimeExpired ? (
                                <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                                    <Ionicons name="time" size={14} color="#B91C1C" />
                                    <Text style={[styles.badgeText, { color: '#B91C1C' }]}>Expired</Text>
                                </View>
                            ) : (
                                <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                                    <Ionicons name="time" size={14} color="#92400E" />
                                    <Text style={[styles.badgeText, { color: '#92400E' }]}>Pending</Text>
                                </View>
                            )}

                            {/* Password required badge */}
                            {accessInfo?.ispreflightcheckrequired && (
                                <View style={[styles.badge, { backgroundColor: '#F3E8FF', marginLeft: 8 }]}>
                                    <Ionicons name="key" size={13} color="#7C3AED" />
                                    <Text style={[styles.badgeText, { color: '#7C3AED' }]}>Password Required</Text>
                                </View>
                            )}
                        </View>

                        {/* End time info box */}
                        {endtime > 0 && !endtimeExpired && (
                            <View
                                style={[
                                    styles.infoBox,
                                    {
                                        backgroundColor: isEndTimeSoon(endtime)
                                            ? '#FFF7ED'
                                            : isDark ? '#1F2937' : '#F0F9FF',
                                        borderColor: isEndTimeSoon(endtime) ? '#FED7AA' : '#BAE6FD',
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={isEndTimeSoon(endtime) ? 'warning' : 'calendar-outline'}
                                    size={18}
                                    color={isEndTimeSoon(endtime) ? '#EA580C' : '#0284C7'}
                                />
                                <Text
                                    style={[
                                        styles.infoBoxText,
                                        { color: isEndTimeSoon(endtime) ? '#EA580C' : '#0369A1' },
                                    ]}
                                >
                                    {isEndTimeSoon(endtime) ? 'Closes soon — ' : 'Quiz closes on '}
                                    <Text style={{ fontWeight: '800' }}>{formatDateTime(endtime)}</Text>
                                </Text>
                            </View>
                        )}

                        {endtimeExpired && (
                            <View style={[styles.infoBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                                <Ionicons name="close-circle" size={18} color="#DC2626" />
                                <Text style={[styles.infoBoxText, { color: '#DC2626' }]}>
                                    This quiz closed on{' '}
                                    <Text style={{ fontWeight: '800' }}>{formatDateTime(endtime)}</Text>
                                </Text>
                            </View>
                        )}

                        {/* Warning reasons */}
                        {!canAttempt &&
                            !inProgressAttempt &&
                            accessInfo?.preventnewattemptreasons?.length > 0 && (
                                <View style={styles.warningBox}>
                                    <Ionicons name="information-circle" size={20} color="#F59E0B" />
                                    <Text style={styles.warningText}>
                                        {accessInfo.preventnewattemptreasons[0]}
                                    </Text>
                                </View>
                            )}

                        {/* Action button */}
                        <Button
                            title={getButtonLabel()}
                            onPress={handleStartQuiz}
                            loading={starting || submittingPassword}
                            disabled={buttonDisabled}
                            style={styles.startBtn}
                        />
                    </View>
                </View>

                {/* ── Attempt History ────────────────────────────────────── */}
                <View style={styles.historySection}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="list" size={20} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Attempt History
                        </Text>
                        {totalAttempts > 0 && (
                            <View style={[styles.countPill, { backgroundColor: colors.primary + '18' }]}>
                                <Text style={[styles.countPillText, { color: colors.primary }]}>
                                    {totalAttempts}
                                </Text>
                            </View>
                        )}
                    </View>

                    {attempts.length === 0 ? (
                        <View
                            style={[
                                styles.emptyHistory,
                                { backgroundColor: isDark ? '#1A1A1A' : '#FFF' },
                            ]}
                        >
                            <Ionicons
                                name="reader-outline"
                                size={42}
                                color={colors.textSecondary + '50'}
                            />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No attempts yet.
                            </Text>
                            <Text style={[styles.emptySubText, { color: colors.textSecondary + '90' }]}>
                                Your attempt history will appear here after you take the quiz.
                            </Text>
                        </View>
                    ) : (
                        attempts.map((attempt: any, idx: number) => {
                            const isFinished = attempt.state === 'finished';
                            const tapUrl = isFinished
                                ? `${baseUrls.review}${attempt.id}`
                                : `${baseUrls.attempt}${attempt.id}`;

                            const isHighScore =
                                isFinished &&
                                finishedAttempts.length > 1 &&
                                attempt.sumgrades ===
                                Math.max(...finishedAttempts.map((a: any) => parseFloat(a.sumgrades ?? 0)));

                            const CardBody = (
                                <View
                                    style={[
                                        styles.attemptCard,
                                        { backgroundColor: isDark ? '#1A1A1A' : '#FFF' },
                                        inProgressAttempt?.id === attempt.id && {
                                            borderWidth: 1.5,
                                            borderColor: colors.primary + '60',
                                        },
                                    ]}
                                >
                                    {/* Attempt number label */}
                                    <View style={styles.attemptTopRow}>
                                        <View style={styles.attemptNumberRow}>
                                            <Text style={[styles.attemptNumber, { color: colors.textSecondary }]}>
                                                Attempt {totalAttempts - idx}
                                            </Text>
                                            {isHighScore && (
                                                <View style={[styles.bestBadge, { backgroundColor: '#FEF3C7' }]}>
                                                    <Ionicons name="trophy" size={11} color="#D97706" />
                                                    <Text style={styles.bestBadgeText}>Best</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View
                                            style={[
                                                styles.stateBadge,
                                                {
                                                    backgroundColor:
                                                        attempt.state === 'finished'
                                                            ? '#E0F2FE'
                                                            : attempt.state === 'inprogress'
                                                                ? '#DBEAFE'
                                                                : '#F3F4F6',
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.stateText,
                                                    {
                                                        color:
                                                            attempt.state === 'finished'
                                                                ? '#0369A1'
                                                                : attempt.state === 'inprogress'
                                                                    ? '#1D4ED8'
                                                                    : '#4B5563',
                                                    },
                                                ]}
                                            >
                                                {attempt.state === 'inprogress' ? 'In Progress' : attempt.state}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Date/time row */}
                                    <View style={styles.attemptDateRow}>
                                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                                        <Text style={[styles.attemptDateText, { color: colors.textSecondary }]}>
                                            Started: {formatDate(attempt.timestart)}{' '}
                                            <Text style={{ fontWeight: '700' }}>
                                                {formatTime(attempt.timestart)}
                                            </Text>
                                        </Text>
                                    </View>
                                    {attempt.timefinish > 0 && (
                                        <View style={[styles.attemptDateRow, { marginTop: 4 }]}>
                                            <Ionicons
                                                name="checkmark-circle-outline"
                                                size={14}
                                                color={colors.textSecondary}
                                            />
                                            <Text style={[styles.attemptDateText, { color: colors.textSecondary }]}>
                                                Finished: {formatDate(attempt.timefinish)}{' '}
                                                <Text style={{ fontWeight: '700' }}>
                                                    {formatTime(attempt.timefinish)}
                                                </Text>
                                            </Text>
                                        </View>
                                    )}

                                    {/* Grade / action row */}
                                    <View style={[styles.gradeBox, { borderTopColor: isDark ? '#2A2A2A' : 'rgba(0,0,0,0.06)' }]}>
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
                                        <View style={styles.reviewAction}>
                                            <Text style={[styles.reviewText, { color: colors.primary }]}>
                                                {isFinished ? 'Review' : 'Resume'}
                                            </Text>
                                            <Ionicons
                                                name="chevron-forward"
                                                size={16}
                                                color={colors.primary}
                                            />
                                        </View>
                                    </View>
                                </View>
                            );

                            if (tapUrl) {
                                return (
                                    <TouchableOpacity
                                        key={attempt.id}
                                        style={{ marginBottom: 14 }}
                                        activeOpacity={0.8}
                                        onPress={() => openInApp(tapUrl)}
                                    >
                                        {CardBody}
                                    </TouchableOpacity>
                                );
                            }
                            return (
                                <View key={attempt.id} style={{ marginBottom: 14 }}>
                                    {CardBody}
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* ────────────────────────────────────────────────────────────── */}
            {/* Password Modal                                                 */}
            {/* ────────────────────────────────────────────────────────────── */}
            <Modal
                visible={showPasswordModal}
                transparent
                animationType="none"
                statusBarTranslucent
                onRequestClose={() => setShowPasswordModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowPasswordModal(false)}
                    />
                    <Animated.View
                        style={[
                            styles.modalSheet,
                            { backgroundColor: isDark ? '#1A1A1A' : '#FFF' },
                            { transform: [{ translateY: modalSlide }], opacity: modalOpacity },
                        ]}
                    >
                        {/* Handle pill */}
                        <View style={[styles.modalHandle, { backgroundColor: isDark ? '#3A3A3A' : '#E5E7EB' }]} />

                        {/* Icon */}
                        <View style={[styles.modalIconRing, { backgroundColor: '#F3E8FF' }]}>
                            <Ionicons name="key" size={28} color="#7C3AED" />
                        </View>

                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            Quiz Password Required
                        </Text>
                        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                            This quiz is password-protected. Enter the password provided by your instructor to begin.
                        </Text>

                        {/* Password input */}
                        <View
                            style={[
                                styles.passwordInputWrap,
                                {
                                    backgroundColor: isDark ? '#252525' : '#F9FAFB',
                                    borderColor: passwordError
                                        ? '#EF4444'
                                        : isDark
                                            ? '#333'
                                            : '#E5E7EB',
                                },
                            ]}
                        >
                            <Ionicons
                                name="lock-closed-outline"
                                size={20}
                                color={colors.textSecondary}
                                style={{ marginRight: 10 }}
                            />
                            <TextInput
                                ref={passwordInputRef}
                                style={[styles.passwordInput, { color: colors.text }]}
                                placeholder="Enter quiz password"
                                placeholderTextColor={colors.textSecondary + '80'}
                                secureTextEntry={!passwordVisible}
                                value={quizPassword}
                                onChangeText={(t) => {
                                    setQuizPassword(t);
                                    if (passwordError) setPasswordError('');
                                }}
                                returnKeyType="done"
                                onSubmitEditing={handlePasswordSubmit}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TouchableOpacity
                                onPress={() => setPasswordVisible(!passwordVisible)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons
                                    name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Error text */}
                        {passwordError ? (
                            <View style={styles.passwordErrRow}>
                                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                                <Text style={styles.passwordErrText}>{passwordError}</Text>
                            </View>
                        ) : null}

                        {/* Buttons */}
                        <View style={styles.modalBtns}>
                            <TouchableOpacity
                                style={[styles.modalCancelBtn, { borderColor: isDark ? '#333' : '#E5E7EB' }]}
                                onPress={() => setShowPasswordModal(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalStartBtn, { backgroundColor: colors.primary }]}
                                onPress={handlePasswordSubmit}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="play" size={16} color="#FFF" />
                                <Text style={styles.modalStartText}>Start Quiz</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 12 },
    loadingText: { fontSize: 15, fontWeight: '500', marginTop: 8 },

    // Error
    errorIconContainer: {
        width: 100, height: 100, borderRadius: 50,
        justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    errorText: { fontSize: 16, textAlign: 'center', lineHeight: 24, fontWeight: '600' },
    errorSubText: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 },
    backBtn: { minWidth: 180, marginTop: 8 },

    // Scroll
    scroll: { padding: 18, paddingBottom: 40 },

    // Main card
    mainCard: {
        borderRadius: 24, overflow: 'hidden', elevation: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08, shadowRadius: 10, marginBottom: 28,
    },
    cardAccent: { height: 5, width: '100%' },
    cardContent: { padding: 22 },
    quizHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
    iconContainer: {
        width: 52, height: 52, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
    },
    quizName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginBottom: 2 },
    quizSub: { fontSize: 13, fontWeight: '500' },

    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 },
    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    },
    badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

    // Info/warning boxes
    infoBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16,
    },
    infoBoxText: { fontSize: 13, lineHeight: 18, flex: 1, fontWeight: '500' },
    warningBox: {
        flexDirection: 'row', alignItems: 'center', padding: 14,
        backgroundColor: '#FFFBEB', borderColor: '#FEF3C7', borderWidth: 1,
        borderRadius: 14, marginBottom: 18, gap: 10,
    },
    warningText: { fontSize: 13, color: '#92400E', flex: 1, lineHeight: 20, fontWeight: '500' },

    startBtn: { height: 54, borderRadius: 16, marginTop: 2 },

    // History
    historySection: { marginTop: 4 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    sectionTitle: { fontSize: 18, fontWeight: '800', flex: 1 },
    countPill: {
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    countPillText: { fontSize: 13, fontWeight: '700' },

    emptyHistory: {
        padding: 48, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.09)',
    },
    emptyText: { fontSize: 16, fontWeight: '700', marginTop: 16 },
    emptySubText: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 6 },

    // Attempt card
    attemptCard: {
        borderRadius: 18, padding: 18,
        elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
    },
    attemptTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    attemptNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    attemptNumber: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    bestBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    bestBadgeText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
    stateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    stateText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

    attemptDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    attemptDateText: { fontSize: 13, fontWeight: '500' },

    gradeBox: {
        borderTopWidth: 1, paddingTop: 14, marginTop: 14,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    gradeLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
    gradeValue: { fontSize: 22, fontWeight: '900' },
    reviewAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    reviewText: { fontSize: 13, fontWeight: '700' },

    // Password Modal
    modalOverlay: {
        flex: 1, justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalSheet: {
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingBottom: 36, paddingTop: 16,
        alignItems: 'center',
        elevation: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.18, shadowRadius: 16,
    },
    modalHandle: { width: 44, height: 4, borderRadius: 2, marginBottom: 24 },
    modalIconRing: {
        width: 68, height: 68, borderRadius: 34,
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
    modalSubtitle: {
        fontSize: 14, textAlign: 'center', lineHeight: 21, fontWeight: '500',
        marginBottom: 24, paddingHorizontal: 8,
    },
    passwordInputWrap: {
        flexDirection: 'row', alignItems: 'center',
        width: '100%', borderWidth: 1.5, borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
    },
    passwordInput: { flex: 1, fontSize: 16, fontWeight: '500' },
    passwordErrRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 8 },
    passwordErrText: { fontSize: 13, color: '#EF4444', fontWeight: '500' },
    modalBtns: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 16 },
    modalCancelBtn: {
        flex: 1, borderWidth: 1.5, borderRadius: 14,
        paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
    },
    modalCancelText: { fontSize: 15, fontWeight: '700' },
    modalStartBtn: {
        flex: 2, borderRadius: 14, paddingVertical: 15,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    modalStartText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
