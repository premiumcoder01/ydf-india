import { AppHeader, Button } from '@/components';
import { useTheme } from '@/context/ThemeContext';
import { bookSchedulerSlot, getMySchedulerBookings, getSchedulerSlots } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StudentSchedulerBooking() {
    const { cmid, name } = useLocalSearchParams();
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [slots, setSlots] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [bookingInProgress, setBookingInProgress] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const authData = await AsyncStorage.getItem('authData');
            if (!authData) return;
            const { token } = JSON.parse(authData);

            const [slotsRes, bookingsRes] = await Promise.all([
                getSchedulerSlots(token, Number(cmid)),
                getMySchedulerBookings(token, Number(cmid))
            ]);

            if (slotsRes.success && slotsRes.data) {
                // The API seems to be returning double-nested data: { success: true, data: { success: true, data: { ... } } }
                const actualData = slotsRes.data.data || slotsRes.data;
                setSlots(actualData.slots || []);
            } else if (slotsRes.errorcode === 'invalidrecordunknown') {
                setSlots([]);
            }

            if (bookingsRes.success && bookingsRes.data) {
                // The API seems to be returning double-nested data
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
        setBookingInProgress(true);
        try {
            const authData = await AsyncStorage.getItem('authData');
            if (!authData) return;
            const { token } = JSON.parse(authData);

            const response = await bookSchedulerSlot(token, Number(cmid), slotid);
            if (response.success) {
                Alert.alert('Success', 'Interview slot booked successfully');
                fetchData();
            } else {
                Alert.alert('Booking Failed', response.error || 'Could not book this slot');
            }
        } catch (err) {
            Alert.alert('Error', 'An error occurred during booking');
        } finally {
            setBookingInProgress(false);
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <AppHeader title={name as string || 'Interview'} onBack={() => router.back()} />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <AppHeader title={name as string || 'Interview'} onBack={() => router.back()} />
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
                    <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                    <Button title="Go Back" onPress={() => router.back()} style={styles.backBtn} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0f0f0f' : '#f8f9fa' }]}>
            <AppHeader title={name as string || 'Interview'} onBack={() => router.back()} />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {Array.isArray(bookings) && bookings.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="bookmark" size={20} color={colors.primary} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Booked Slots</Text>
                        </View>
                        {bookings.map((booking: any) => (
                            <View key={booking.appointment_id || booking.slotid} style={[styles.bookingCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: colors.primary + '30' }]}>
                                <View style={[styles.bookingAccent, { backgroundColor: colors.primary }]} />
                                <View style={styles.bookingContent}>
                                    <View style={styles.bookingTopRow}>
                                        <Text style={[styles.cardDate, { color: colors.text }]}>
                                            {formatDate(booking.starttime)} • {formatTime(booking.starttime)}
                                        </Text>
                                        <View style={[styles.statusMiniBadge, { backgroundColor: booking.attended ? '#DCFCE7' : (isDark ? '#333' : '#F3F4F6') }]}>
                                            <Text style={[styles.statusMiniText, { color: booking.attended ? '#166534' : colors.textSecondary }]}>
                                                {booking.attended ? 'Attended' : 'Confirmed'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.infoGrid}>
                                        <View style={styles.infoItem}>
                                            <Ionicons name="location-outline" size={16} color={colors.primary} />
                                            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{booking.location || 'Online'}</Text>
                                        </View>
                                        {booking.teacher_name && (
                                            <View style={styles.infoItem}>
                                                <Ionicons name="person-outline" size={16} color={colors.primary} />
                                                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{booking.teacher_name}</Text>
                                            </View>
                                        )}
                                        <View style={styles.infoItem}>
                                            <Ionicons name="time-outline" size={16} color={colors.primary} />
                                            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{booking.duration_minutes} Minutes</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="calendar" size={20} color="#F59E0B" />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Slots</Text>
                    </View>

                    {!Array.isArray(slots) || slots.length === 0 ? (
                        <View style={[styles.noItemsCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                            <Ionicons name="calendar-clear-outline" size={40} color={colors.textSecondary + '50'} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No available slots found at the moment.</Text>
                        </View>
                    ) : (
                        slots.map((slot: any) => {
                            const startTime = slot.starttime || slot.timestart;
                            const duration = slot.duration_minutes || slot.duration;
                            const remaining = slot.remaining_places !== undefined ? slot.remaining_places : (slot.remainingplaces || 0);

                            return (
                                <View key={slot.id || slot.slotid} style={[styles.slotCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: isDark ? '#333' : '#eee' }]}>
                                    <View style={styles.slotMain}>
                                        <View style={styles.timeWrapper}>
                                            <Text style={[styles.slotTime, { color: colors.text }]}>{formatTime(startTime)}</Text>
                                            <Text style={[styles.slotDate, { color: colors.textSecondary }]}>{formatDate(startTime)}</Text>
                                        </View>

                                        <View style={styles.slotDivider} />

                                        <View style={styles.slotDetails}>
                                            <View style={styles.metaRow}>
                                                <Ionicons name="hourglass-outline" size={14} color={colors.primary} />
                                                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{duration}m</Text>
                                                <View style={styles.separatorDot} />
                                                <Ionicons name="people-outline" size={14} color={colors.primary} />
                                                <Text style={[styles.metaText, { color: colors.textSecondary, fontWeight: '700' }]}>{remaining} left</Text>
                                            </View>

                                            {slot.teacher_name && (
                                                <View style={styles.metaRow}>
                                                    <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
                                                    <Text style={[styles.smallMetaText, { color: colors.textSecondary }]} numberOfLines={1}>{slot.teacher_name}</Text>
                                                </View>
                                            )}

                                            {slot.location && (
                                                <View style={styles.metaRow}>
                                                    <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                                                    <Text style={[styles.smallMetaText, { color: colors.textSecondary }]} numberOfLines={1}>{slot.location}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={[
                                            styles.bookBtnAction,
                                            {
                                                backgroundColor: slot.can_book ? colors.primary : (isDark ? '#333' : '#E5E7EB'),
                                            }
                                        ]}
                                        onPress={() => handleBook(slot.id || slot.slotid)}
                                        disabled={!slot.can_book || bookingInProgress}
                                    >
                                        {bookingInProgress ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={[styles.bookBtnText, { color: slot.can_book ? '#fff' : (isDark ? '#666' : '#9CA3AF') }]}>
                                                {slot.can_book ? 'Book' : 'Full'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
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
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scroll: {
        padding: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    bookingCard: {
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
        flexDirection: 'row',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    bookingAccent: {
        width: 6,
        height: '100%',
    },
    bookingContent: {
        flex: 1,
        padding: 20,
    },
    bookingTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardDate: {
        fontSize: 16,
        fontWeight: '700',
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.03)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    infoText: {
        fontSize: 13,
        fontWeight: '500',
    },
    noItemsCard: {
        padding: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(0,0,0,0.1)',
    },
    slotCard: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    slotMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    timeWrapper: {
        alignItems: 'center',
        width: 75,
    },
    slotTime: {
        fontSize: 16,
        fontWeight: '800',
    },
    slotDate: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    slotDivider: {
        width: 1,
        height: 35,
        backgroundColor: 'rgba(0,0,0,0.06)',
        marginHorizontal: 12,
    },
    slotDetails: {
        flex: 1,
        gap: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '600',
    },
    separatorDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: 'rgba(0,0,0,0.2)',
        marginHorizontal: 2,
    },
    smallMetaText: {
        fontSize: 11,
        fontWeight: '500',
        flex: 1,
    },
    bookBtnAction: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        minWidth: 75,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bookBtnText: {
        fontSize: 14,
        fontWeight: '800',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 12,
        fontSize: 15,
        lineHeight: 22,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 32,
        paddingHorizontal: 40,
        lineHeight: 24,
    },
    backBtn: {
        minWidth: 180,
    },
    statusMiniBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    statusMiniText: {
        fontSize: 11,
        fontWeight: "800",
        textTransform: 'uppercase',
    },
});
