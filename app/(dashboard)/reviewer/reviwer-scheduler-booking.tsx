import { AppHeader } from '@/components';
import { useTheme } from '@/context/ThemeContext';
import { createSchedulerSlots } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NewSlot {
    id: string;
    starttime: number;
    duration: number;
    location: string;
    maxstudents: number;
}

export default function ReviewerSchedulerBooking() {
    const { cmid, name } = useLocalSearchParams();
    const { colors, isDark } = useTheme();
    const inset = useSafeAreaInsets();

    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newSlots, setNewSlots] = useState<NewSlot[]>([]);

    // Form State
    const [date, setDate] = useState<Date>(new Date());
    const [time, setTime] = useState<Date>(new Date());
    const [duration, setDuration] = useState('30');
    const [location, setLocation] = useState('');
    const [maxStudents, setMaxStudents] = useState('1');

    // Pickers
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [isTimePickerVisible, setTimePickerVisibility] = useState(false);

    const showDatePicker = () => setDatePickerVisibility(true);
    const hideDatePicker = () => setDatePickerVisibility(false);

    const handleConfirmDate = (selectedDate: Date) => {
        setDate(selectedDate);
        hideDatePicker();
    };

    const showTimePicker = () => setTimePickerVisibility(true);
    const hideTimePicker = () => setTimePickerVisibility(false);

    const handleConfirmTime = (selectedTime: Date) => {
        setTime(selectedTime);
        hideTimePicker();
    };

    const handleAddSlot = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (!duration || isNaN(Number(duration))) {
            Alert.alert('Invalid Duration', 'Please enter a valid duration in minutes.');
            return;
        }

        if (!maxStudents || isNaN(Number(maxStudents))) {
            Alert.alert('Invalid Capacity', 'Please enter a valid number of students.');
            return;
        }

        const startDateTime = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            time.getHours(),
            time.getMinutes(),
            0
        );

        const proposedStartTime = Math.floor(startDateTime.getTime() / 1000);
        const proposedDuration = Number(duration);
        const proposedEndTime = proposedStartTime + proposedDuration * 60;

        // Check for overlap with already queued slots
        const isOverlap = newSlots.some(s => {
            const sEnd = s.starttime + s.duration * 60;
            return proposedStartTime < sEnd && proposedEndTime > s.starttime;
        });

        if (isOverlap) {
            Alert.alert('Time Conflict', 'This slot overlaps with an already queued slot.');
            return;
        }

        const newSlot: NewSlot = {
            id: Math.random().toString(36).substr(2, 9),
            starttime: proposedStartTime,
            duration: proposedDuration,
            location: location || 'Reviewer Office',
            maxstudents: Number(maxStudents),
        };

        setNewSlots([newSlot, ...newSlots]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Auto-advance time for the next slot
        const nextTime = new Date(startDateTime.getTime() + proposedDuration * 60000);
        setTime(nextTime);
        if (nextTime.getDate() !== date.getDate() || nextTime.getMonth() !== date.getMonth() || nextTime.getFullYear() !== date.getFullYear()) {
            setDate(nextTime);
        }
    };

    const handleRemoveSlot = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setNewSlots(newSlots.filter(s => s.id !== id));
    };

    const handleCreateSlots = async () => {
        if (newSlots.length === 0) {
            Alert.alert('No Slots', 'Please add at least one slot definition first.');
            return;
        }

        Alert.alert(
            'Confirm Creation',
            `You are about to create ${newSlots.length} interview slots. Continue?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Create All',
                    onPress: async () => {
                        setCreating(true);
                        try {
                            const authData = await AsyncStorage.getItem('authData');
                            if (!authData) return;
                            const { token } = JSON.parse(authData);

                            // The API expects an array of slots.
                            // The id field is temporary for local UI management, remove it if Moodle doesn't like it.
                            const slotsToSubmit = newSlots.map(({ starttime, duration, location, maxstudents }) => ({
                                starttime,
                                duration_minutes: duration,
                                location,
                                maxstudents
                            }));

                            const response = await createSchedulerSlots(token, Number(cmid), slotsToSubmit);

                            if (response.success) {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                Alert.alert(
                                    'Success!',
                                    `${newSlots.length} slots have been created successfully.`,
                                    [{ text: 'Great', onPress: () => router.back() }]
                                );
                            } else {
                                Alert.alert('Creation Failed', response.error || 'Failed to create slots.');
                            }
                        } catch (err) {
                            Alert.alert('Error', 'An unexpected error occurred while creating slots.');
                        } finally {
                            setCreating(false);
                        }
                    }
                }
            ]
        );
    };

    const formatDisplayDate = (d: Date) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const formatDisplayTime = (t: Date) => t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const bg = isDark ? '#0C0C0F' : '#F4F5F9';
    const cardBg = isDark ? '#18181C' : '#FFFFFF';

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <AppHeader title="Manage Interview Slots" onBack={() => router.back()} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Hero Banner */}
                    <View style={[styles.heroBanner, { backgroundColor: colors.primary }]}>
                        <View style={styles.heroContent}>
                            <Text style={styles.heroLabel}>SCHEDULER MANAGEMENT</Text>
                            <Text style={styles.heroTitle}>{'Add Your Interview Slots'}</Text>
                            <Text style={styles.heroSubtitle}> Define the available interview times for students. </Text>
                        </View>
                        <View style={styles.heroDecor}>
                            <Ionicons name="add-circle" size={80} color="rgba(255,255,255,0.15)" />
                        </View>
                    </View>

                    {/* Creation Form */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Add New Slot</Text>
                        <View style={[styles.card, { backgroundColor: cardBg }]}>
                            <View style={styles.formRow}>
                                <TouchableOpacity style={styles.inputGroup} onPress={showDatePicker}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#26262C' : '#F4F5F9' }]}>
                                        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                                        <Text style={[styles.inputText, { color: colors.text }]}>{formatDisplayDate(date)}</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.inputGroup} onPress={showTimePicker}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Start Time</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#26262C' : '#F4F5F9' }]}>
                                        <Ionicons name="time-outline" size={18} color={colors.primary} />
                                        <Text style={[styles.inputText, { color: colors.text }]}>{formatDisplayTime(time)}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formRow}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Duration (min)</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: isDark ? '#26262C' : '#F4F5F9', color: colors.text }]}
                                        value={duration}
                                        onChangeText={setDuration}
                                        keyboardType="number-pad"
                                        placeholder="30"
                                        placeholderTextColor={colors.textSecondary + '80'}
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Max Students</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: isDark ? '#26262C' : '#F4F5F9', color: colors.text }]}
                                        value={maxStudents}
                                        onChangeText={setMaxStudents}
                                        keyboardType="number-pad"
                                        placeholder="1"
                                        placeholderTextColor={colors.textSecondary + '80'}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Location / Link</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: isDark ? '#26262C' : '#F4F5F9', color: colors.text }]}
                                    value={location}
                                    onChangeText={setLocation}
                                    placeholder="Room 101 or Meeting Link"
                                    placeholderTextColor={colors.textSecondary + '80'}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                                onPress={handleAddSlot}
                            >
                                <Ionicons name="add" size={20} color="#fff" />
                                <Text style={styles.addBtnText}>Queue Slot</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Queued Slots */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                Pending Slots ({newSlots.length})
                            </Text>
                            {newSlots.length > 0 && (
                                <TouchableOpacity onPress={() => setNewSlots([])}>
                                    <Text style={{ color: '#EF4444', fontWeight: '600' }}>Clear All</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {newSlots.length === 0 ? (
                            <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                                <Ionicons name="list-outline" size={40} color={colors.textSecondary + '40'} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No slots in queue. Add one above.</Text>
                            </View>
                        ) : (
                            newSlots.map((slot) => (
                                <View key={slot.id} style={[styles.queuedCard, { backgroundColor: cardBg }]}>
                                    <View style={styles.queuedInfo}>
                                        <View style={styles.queuedTimeRow}>
                                            <Text style={[styles.queuedDate, { color: colors.text }]}>
                                                {new Date(slot.starttime * 1000).toLocaleDateString()}
                                            </Text>
                                            <Text style={[styles.queuedTime, { color: colors.primary }]}>
                                                {new Date(slot.starttime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                        <Text style={[styles.queuedMeta, { color: colors.textSecondary }]}>
                                            {slot.duration} min • {slot.maxstudents} students • {slot.location}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.removeBtn}
                                        onPress={() => handleRemoveSlot(slot.id)}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>

                {/* Confirm Footer */}
                <View style={[styles.footer, { backgroundColor: cardBg, paddingBottom: Math.max(inset.bottom, 20) }]}>
                    <TouchableOpacity
                        style={[
                            styles.submitBtn,
                            { backgroundColor: colors.primary, opacity: newSlots.length > 0 ? 1 : 0.5 }
                        ]}
                        disabled={newSlots.length === 0 || creating}
                        onPress={handleCreateSlots}
                    >
                        {creating ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.submitBtnText}>Confirm & Create {newSlots.length} Slots</Text>
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleConfirmDate}
                onCancel={hideDatePicker}
                date={date}
            />

            <DateTimePickerModal
                isVisible={isTimePickerVisible}
                mode="time"
                onConfirm={handleConfirmTime}
                onCancel={hideTimePicker}
                date={time}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { paddingBottom: 100 },
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
    heroTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', letterSpacing: -0.8, marginBottom: 4 },
    heroSubtitle: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.75)', lineHeight: 18 },
    heroDecor: { position: 'absolute', right: -20, top: -10 },

    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },

    card: {
        borderRadius: 24,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    formRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    inputGroup: { flex: 1, marginBottom: 16 },
    inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 10,
    },
    inputText: { fontSize: 15, fontWeight: '600' },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        fontSize: 15,
        fontWeight: '600',
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 18,
        gap: 8,
        marginTop: 8,
    },
    addBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    queuedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
    },
    queuedInfo: { flex: 1 },
    queuedTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    queuedDate: { fontSize: 15, fontWeight: '700' },
    queuedTime: { fontSize: 15, fontWeight: '800' },
    queuedMeta: { fontSize: 12, fontWeight: '500' },
    removeBtn: { padding: 8, borderRadius: 12, backgroundColor: '#EF444410' },

    emptyCard: {
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#ccc',
    },
    emptyText: { fontSize: 14, fontWeight: '500', opacity: 0.7 },

    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 20,
        gap: 10,
    },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});