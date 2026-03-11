import { AppHeader } from '@/components';
import { useTheme } from '@/context/ThemeContext';
import { bookSchedulerSlot, getMySchedulerBookings, getSchedulerSlots } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function StudentSchedulerBooking() {
    const { cmid, name } = useLocalSearchParams();
    const { colors, isDark } = useTheme();

    const [loading, setLoading] = useState(true);
    const [slots, setSlots] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [bookingInProgress, setBookingInProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inset = useSafeAreaInsets();

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [groupedSlots, setGroupedSlots] = useState<Record<string, any[]>>({});

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const authData = await AsyncStorage.getItem('authData');
            if (!authData) return;
            const { token } = JSON.parse(authData);

            const [slotsRes, bookingsRes] = await Promise.all([
                getSchedulerSlots(token, Number(cmid)),
                getMySchedulerBookings(token, Number(cmid)),
            ]);

            if (slotsRes.success && slotsRes.data) {
                const actualData = slotsRes.data.data || slotsRes.data;
                const rawSlots: any[] = actualData.slots || [];
                setSlots(rawSlots);

                const groups: Record<string, any[]> = {};
                rawSlots.forEach((slot: any) => {
                    const dateKey = new Date(slot.starttime * 1000).toISOString().split('T')[0];
                    if (!groups[dateKey]) groups[dateKey] = [];
                    groups[dateKey].push(slot);
                });
                setGroupedSlots(groups);

                const sortedDates = Object.keys(groups).sort();
                if (sortedDates.length > 0) setSelectedDate(sortedDates[0]);
            } else if (slotsRes.errorcode === 'invalidrecordunknown') {
                setSlots([]);
                setGroupedSlots({});
            }

            if (bookingsRes.success && bookingsRes.data) {
                const actualData = bookingsRes.data.data || bookingsRes.data;
                setBookings(actualData.upcoming || actualData.bookings || []);
            } else if (bookingsRes.errorcode === 'invalidrecordunknown') {
                setBookings([]);
            }

            if (!slotsRes.success && slotsRes.errorcode !== 'invalidrecordunknown') {
                setError(slotsRes.error || 'Failed to fetch interview slots');
            }
        } catch (err) {
            setError('Failed to fetch interview details');
        } finally {
            setLoading(false);
        }
    };

    const handleBook = async (slotid: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setBookingInProgress(slotid);
        try {
            const authData = await AsyncStorage.getItem('authData');
            if (!authData) return;
            const { token } = JSON.parse(authData);

            const response = await bookSchedulerSlot(token, Number(cmid), slotid);
            if (response.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Booked!', 'Your interview slot has been confirmed.', [
                    {
                        text: 'View My Bookings',
                        onPress: () => {
                            setModalVisible(false);
                            fetchData();
                        },
                    },
                ]);
            } else {
                Alert.alert('Booking Failed', response.error || 'Could not book this slot');
            }
        } catch (err) {
            Alert.alert('Error', 'An error occurred during booking');
        } finally {
            setBookingInProgress(null);
        }
    };

    const formatDate = (timestamp: number) =>
        new Date(timestamp * 1000).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });

    const formatTime = (timestamp: number) =>
        new Date(timestamp * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });

    const getDayName = (dateStr: string) =>
        new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });

    const getDayNumber = (dateStr: string) => dateStr.split('-')[2];

    const getMonthName = (dateStr: string) =>
        new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' });

    const handleDateSelect = (date: string) => {
        Haptics.selectionAsync();
        setSelectedDate(date);
    };

    const openModal = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setModalVisible(true);
    };

    /* ───────────────────────────── LOADING ─────────────────────────── */
    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <AppHeader title={(name as string) || 'Interview'} onBack={() => router.back()} />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Fetching your schedule…
                    </Text>
                </View>
            </View>
        );
    }

    /* ───────────────────────────── ERROR ───────────────────────────── */
    if (error) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <AppHeader title={(name as string) || 'Interview'} onBack={() => router.back()} />
                <View style={styles.center}>
                    <View style={styles.errorIconWrap}>
                        <Ionicons name="cloud-offline-outline" size={44} color="#EF4444" />
                    </View>
                    <Text style={[styles.errorTitle, { color: colors.text }]}>Something went wrong</Text>
                    <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                        onPress={fetchData}
                    >
                        <Ionicons name="refresh" size={16} color="#fff" />
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const sortedDates = Object.keys(groupedSlots).sort();
    const currentSlots = selectedDate ? (groupedSlots[selectedDate] ?? []) : [];
    const bg = isDark ? '#0C0C0F' : '#F4F5F9';
    const cardBg = isDark ? '#18181C' : '#FFFFFF';

    /* ───────────────────────────── MAIN ────────────────────────────── */
    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <AppHeader title={(name as string) || 'Book Interview'} onBack={() => router.back()} />

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header Banner ── */}
                <View style={[styles.heroBanner, { backgroundColor: colors.primary }]}>
                    <View style={styles.heroContent}>
                        <Text style={styles.heroLabel}>INTERVIEW SCHEDULER</Text>
                        <Text style={styles.heroTitle}>My Bookings</Text>
                        <Text style={styles.heroSubtitle}>
                            {bookings.length > 0
                                ? `You have ${bookings.length} appointment${bookings.length > 1 ? 's' : ''}`
                                : 'No appointments yet'}
                        </Text>
                    </View>
                    <View style={styles.heroDecor}>
                        <Ionicons name="calendar" size={70} color="rgba(255,255,255,0.12)" />
                    </View>
                </View>

                {/* ── My Bookings ── */}
                {Array.isArray(bookings) && bookings.length > 0 ? (
                    <View style={styles.section}>
                        {bookings.map((booking: any, index: number) => (
                            <BookingCard
                                key={booking.appointment_id || booking.slotid || index}
                                booking={booking}
                                cardBg={cardBg}
                                isDark={isDark}
                                colors={colors}
                                formatTime={formatTime}
                                formatDate={formatDate}
                            />
                        ))}
                    </View>
                ) : (
                    /* ── Empty State ── */
                    <View style={[styles.emptyWrap, { backgroundColor: cardBg }]}>
                        <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + '12' }]}>
                            <Ionicons name="calendar-clear-outline" size={38} color={colors.primary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Bookings Yet</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                            You haven't booked any interview slot yet. Browse available slots and secure your spot.
                        </Text>
                    </View>
                )}

                {/* ── Check Slots CTA ── */}
                <TouchableOpacity
                    style={[styles.ctaButton, { backgroundColor: colors.primary }]}
                    onPress={openModal}
                    activeOpacity={0.85}
                >
                    <View style={styles.ctaInner}>
                        <View style={styles.ctaIconWrap}>
                            <Ionicons name="search" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.ctaTextWrap}>
                            <Text style={styles.ctaTitle}>Browse Available Slots</Text>
                            <Text style={styles.ctaSub}>
                                {slots.length > 0 ? `${slots.length} slot${slots.length > 1 ? 's' : ''} open` : "Check what's available"}                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                    </View>
                </TouchableOpacity>
            </ScrollView>

            {/* ══════════════════ AVAILABLE SLOTS MODAL ══════════════════ */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: bg, paddingTop: inset.top }]}>
                    {/* Modal Header */}
                    <View style={[styles.modalHeader, { backgroundColor: cardBg, borderBottomColor: isDark ? '#2A2A2E' : '#EEEEF2' }]}>
                        <View>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Available Slots</Text>
                            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                                {slots.length} slot{slots.length !== 1 ? 's' : ''} across {sortedDates.length} date{sortedDates.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.closeBtn, { backgroundColor: isDark ? '#2A2A2E' : '#F0F0F5' }]}
                            onPress={() => setModalVisible(false)}
                        >
                            <Ionicons name="close" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* ── Date Filter Strip ── */}
                    {sortedDates.length > 0 ? (
                        <>
                            <View style={[styles.dateStripWrapper, {
                                backgroundColor: cardBg,
                                borderBottomColor: isDark ? '#2A2A2E' : '#EEEEF2',
                            }]}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.dateStrip}
                                    contentContainerStyle={styles.dateStripContent}
                                >
                                    {sortedDates.map((date) => {
                                        const isActive = selectedDate === date;
                                        const slotCount = groupedSlots[date]?.length ?? 0;
                                        return (
                                            <TouchableOpacity
                                                key={date}
                                                onPress={() => handleDateSelect(date)}
                                                style={[
                                                    styles.dateChip,
                                                    isActive
                                                        ? { backgroundColor: colors.primary }
                                                        : { backgroundColor: isDark ? '#26262C' : '#EEEEF2' },
                                                ]}
                                            >
                                                <Text style={[styles.dateChipDay, { color: isActive ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]}>
                                                    {getDayName(date)}
                                                </Text>
                                                <Text style={[styles.dateChipNum, { color: isActive ? '#FFF' : colors.text }]}>
                                                    {getDayNumber(date)}
                                                </Text>
                                                <Text style={[styles.dateChipMonth, { color: isActive ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]}>
                                                    {getMonthName(date)}
                                                </Text>
                                                <View style={[
                                                    styles.dateChipBadge,
                                                    { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : (isDark ? '#333' : '#DDD') }
                                                ]}>
                                                    <Text style={[styles.dateChipBadgeText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                                                        {slotCount}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {/* ── Slot List ── */}
                            <ScrollView
                                contentContainerStyle={styles.modalScroll}
                                showsVerticalScrollIndicator={false}
                            >
                                {currentSlots.length === 0 ? (
                                    <View style={styles.noSlotsWrap}>
                                        <Ionicons name="time-outline" size={40} color={colors.textSecondary + '50'} />
                                        <Text style={[styles.noSlotsText, { color: colors.textSecondary }]}>
                                            No slots for this date
                                        </Text>
                                    </View>
                                ) : (
                                    currentSlots.map((slot: any) => {
                                        const slotId = slot.id || slot.slotid;
                                        const isBooking = bookingInProgress === slotId;
                                        const canBook = !!slot.can_book;
                                        const noPlaces = slot.remaining_places === 0;

                                        return (
                                            <View
                                                key={slotId}
                                                style={[styles.slotCard, { backgroundColor: cardBg }]}
                                            >
                                                {/* Left accent bar */}
                                                <View style={[styles.slotAccent, { backgroundColor: canBook ? colors.primary : (isDark ? '#3A3A3E' : '#DDD') }]} />

                                                <View style={styles.slotBody}>
                                                    {/* Time & Duration */}
                                                    <View style={styles.slotTopRow}>
                                                        <Text style={[styles.slotTime, { color: colors.text }]}>
                                                            {formatTime(slot.starttime)}
                                                        </Text>
                                                        <View style={[styles.durationPill, { backgroundColor: isDark ? '#2A2A2E' : '#F0F0F5' }]}>
                                                            <Ionicons name="timer-outline" size={12} color={colors.textSecondary} />
                                                            <Text style={[styles.durationPillText, { color: colors.textSecondary }]}>
                                                                {slot.duration_minutes} min
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {/* Reviewer & Location */}
                                                    <View style={styles.slotMeta}>
                                                        <View style={styles.slotMetaItem}>
                                                            <Ionicons name="person-circle-outline" size={14} color={colors.textSecondary} />
                                                            <Text style={[styles.slotMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                                                                {slot.teacher_name || 'Reviewer'}
                                                            </Text>
                                                        </View>
                                                        {slot.location ? (
                                                            <View style={styles.slotMetaItem}>
                                                                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                                                                <Text style={[styles.slotMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                                                                    {slot.location}
                                                                </Text>
                                                            </View>
                                                        ) : null}
                                                    </View>

                                                    {/* Places & Book */}
                                                    <View style={styles.slotFooter}>
                                                        <View style={[
                                                            styles.placesBadge,
                                                            { backgroundColor: noPlaces ? '#EF444415' : '#10B98115' }
                                                        ]}>
                                                            <Ionicons
                                                                name="people-outline"
                                                                size={13}
                                                                color={noPlaces ? '#EF4444' : '#10B981'}
                                                            />
                                                            <Text style={[styles.placesText, { color: noPlaces ? '#EF4444' : '#10B981' }]}>
                                                                {noPlaces ? 'Full' : `${slot.remaining_places} spot${slot.remaining_places !== 1 ? 's' : ''} left`}
                                                            </Text>
                                                        </View>

                                                        <TouchableOpacity
                                                            style={[
                                                                styles.bookBtn,
                                                                {
                                                                    backgroundColor: canBook
                                                                        ? colors.primary
                                                                        : (isDark ? '#2A2A2E' : '#EEEEF2'),
                                                                    opacity: canBook ? 1 : 0.7,
                                                                },
                                                            ]}
                                                            onPress={() => handleBook(slotId)}
                                                            disabled={!canBook || bookingInProgress !== null}
                                                        >
                                                            {isBooking ? (
                                                                <ActivityIndicator size="small" color="#fff" />
                                                            ) : (
                                                                <>
                                                                    <Text style={[
                                                                        styles.bookBtnText,
                                                                        { color: canBook ? '#fff' : colors.textSecondary }
                                                                    ]}>
                                                                        {canBook ? 'Book Now' : 'Unavailable'}
                                                                    </Text>
                                                                    {canBook && (
                                                                        <Ionicons name="arrow-forward" size={14} color="#fff" style={{ marginLeft: 4 }} />
                                                                    )}
                                                                </>
                                                            )}
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })
                                )}
                                <View style={{ height: 40 }} />
                            </ScrollView>
                        </>
                    ) : (
                        /* No Slots At All */
                        <View style={styles.modalEmpty}>
                            <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + '12' }]}>
                                <Ionicons name="calendar-clear-outline" size={38} color={colors.primary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Slots Available</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                                There are no interview slots currently open for booking. Check back later.
                            </Text>
                            <TouchableOpacity
                                style={[styles.retryBtn, { backgroundColor: colors.primary, marginTop: 20 }]}
                                onPress={() => { fetchData(); }}
                            >
                                <Ionicons name="refresh" size={15} color="#fff" />
                                <Text style={styles.retryBtnText}>Refresh</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}

/* ── Booking Card Sub-component ─────────────────────────────────── */
function BookingCard({ booking, cardBg, isDark, colors, formatTime, formatDate }: any) {
    const isCompleted = booking.attended;
    const statusColor = isCompleted ? '#10B981' : colors.primary;
    const statusLabel = isCompleted ? 'COMPLETED' : 'CONFIRMED';

    return (
        <View style={[styles.bookingCard, { backgroundColor: cardBg }]}>
            {/* Status pill */}
            <View style={[styles.statusPill, { backgroundColor: statusColor + '18' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>

            {/* Time Block */}
            <View style={styles.bookingRow}>
                <View style={[styles.timeBlock, { backgroundColor: isDark ? '#26262C' : '#F4F5F9' }]}>
                    <Text style={[styles.timeBlockText, { color: colors.text }]}>{formatTime(booking.starttime)}</Text>
                    <Text style={[styles.timeBlockDate, { color: colors.textSecondary }]}>{formatDate(booking.starttime)}</Text>
                </View>
                <View style={styles.bookingDetails}>
                    <View style={styles.detailRow}>
                        <Ionicons name="person-circle" size={15} color={colors.primary} />
                        <Text style={[styles.detailLabel, { color: colors.text }]} numberOfLines={1}>
                            {booking.teacher_name || 'Reviewer'}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="location" size={15} color={colors.primary} />
                        <Text style={[styles.detailLabel, { color: colors.text }]} numberOfLines={1}>
                            {booking.location || 'Online'}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="timer-outline" size={15} color={colors.primary} />
                        <Text style={[styles.detailLabel, { color: colors.text }]}>
                            {booking.duration_minutes} min session
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

/* ── Styles ─────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    scroll: { paddingBottom: 48 },

    /* Loading */
    loadingText: { marginTop: 14, fontSize: 14, fontWeight: '500' },

    /* Error */
    errorIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#EF444415', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    errorTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
    errorSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
    retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    /* Hero Banner */
    heroBanner: {
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 24,
        borderRadius: 24,
        padding: 28,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
    },
    heroContent: { flex: 1 },
    heroLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: 'rgba(255,255,255,0.65)', marginBottom: 6 },
    heroTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: -0.8, marginBottom: 4 },
    heroSubtitle: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.75)' },
    heroDecor: { position: 'absolute', right: -10, top: -8 },

    /* Section */
    section: { paddingHorizontal: 20, gap: 14 },

    /* Booking Card */
    bookingCard: {
        borderRadius: 20,
        padding: 18,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
    },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 14 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
    bookingRow: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
    timeBlock: { borderRadius: 14, padding: 14, justifyContent: 'center', alignItems: 'center', minWidth: 100 },
    timeBlockText: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5, marginBottom: 2 },
    timeBlockDate: { fontSize: 11, fontWeight: '600' },
    bookingDetails: { flex: 1, gap: 10, justifyContent: 'center' },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailLabel: { fontSize: 13, fontWeight: '600', flex: 1 },

    /* Empty State */
    emptyWrap: {
        marginHorizontal: 20,
        marginTop: 8,
        borderRadius: 24,
        padding: 36,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    emptyIconBg: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
    emptyTitle: { fontSize: 20, fontWeight: '900', marginBottom: 10 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, opacity: 0.75 },

    /* CTA Button */
    ctaButton: {
        marginHorizontal: 20,
        marginTop: 28,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
    },
    ctaInner: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
    ctaIconWrap: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    ctaTextWrap: { flex: 1 },
    ctaTitle: { fontSize: 16, fontWeight: '900', color: '#FFF', letterSpacing: -0.3 },
    ctaSub: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginTop: 2 },

    /* Modal */
    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 18,
        borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.6, marginBottom: 2 },
    modalSubtitle: { fontSize: 13, fontWeight: '500' },
    closeBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

    /* Date Filter Strip */
    dateStripWrapper: {
        borderBottomWidth: 1,
        zIndex: 10,
    },
    dateStrip: {
        flexGrow: 0,
    },
    dateStripContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20, // Added more bottom padding to prevent clipping
        gap: 12,
        flexDirection: 'row'
    },
    dateChip: {
        width: 74,
        height: 110,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
        elevation: 6, // Increased elevation
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    dateChipDay: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
    dateChipNum: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, lineHeight: 28 },
    dateChipMonth: { fontSize: 11, fontWeight: '600', opacity: 0.8 },
    dateChipBadge: {
        marginTop: 8,
        minWidth: 26,
        height: 22,
        paddingHorizontal: 6,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    dateChipBadgeText: { fontSize: 10, fontWeight: '900' },

    /* Slot Cards */
    modalScroll: { padding: 16, gap: 12 },
    slotCard: {
        borderRadius: 18,
        flexDirection: 'row',
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    slotAccent: { width: 4 },
    slotBody: { flex: 1, padding: 16, gap: 10 },
    slotTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    slotTime: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
    durationPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    durationPillText: { fontSize: 12, fontWeight: '700' },
    slotMeta: { flexDirection: 'row', gap: 16 },
    slotMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
    slotMetaText: { fontSize: 13, fontWeight: '500', flex: 1 },
    slotFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    placesBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    placesText: { fontSize: 13, fontWeight: '700' },
    bookBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
    },
    bookBtnText: { fontSize: 14, fontWeight: '800' },

    /* Modal Empty */
    modalEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },

    /* No slots for date */
    noSlotsWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
    noSlotsText: { fontSize: 15, fontWeight: '600' },
});