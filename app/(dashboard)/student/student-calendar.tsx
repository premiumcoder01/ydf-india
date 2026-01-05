import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Calendar } from "react-native-calendars";

const initialEvents = [
  {
    id: 1,
    title: "Merit Scholarship Deadline",
    date: "2024-03-15",
    time: "11:59 PM",
    type: "deadline",
    priority: "high",
    color: "#F44336",
    description: "Submit your Merit Scholarship application"
  },
  {
    id: 2,
    title: "Document Upload Due",
    date: "2024-03-12",
    time: "5:00 PM",
    type: "document",
    priority: "high",
    color: "#FF9800",
    description: "Upload official transcript for Need-Based Grant"
  },
  {
    id: 3,
    title: "Application Review Meeting",
    date: "2024-03-20",
    time: "2:00 PM",
    type: "meeting",
    priority: "medium",
    color: "#2196F3",
    description: "Committee review session for STEM Excellence Award"
  },
  {
    id: 4,
    title: "Scholarship Results Announcement",
    date: "2024-03-25",
    time: "10:00 AM",
    type: "announcement",
    priority: "high",
    color: "#4CAF50",
    description: "Results for Community Service Scholarship will be announced"
  },
  {
    id: 5,
    title: "Personal Reminder",
    date: "2024-03-18",
    time: "3:00 PM",
    type: "personal",
    priority: "low",
    color: "#9C27B0",
    description: "Prepare for scholarship interview"
  }
];

const upcomingDeadlines = [
  {
    id: 1,
    title: "STEM Excellence Award",
    deadline: "2024-03-10",
    daysLeft: 3,
    color: "#F44336"
  },
  {
    id: 2,
    title: "Need-Based Grant",
    deadline: "2024-03-20",
    daysLeft: 13,
    color: "#FF9800"
  },
  {
    id: 3,
    title: "International Student Fund",
    deadline: "2024-03-18",
    daysLeft: 11,
    color: "#2196F3"
  }
];

const eventTypes = {
  deadline: { icon: "time", color: "#F44336" },
  document: { icon: "document", color: "#FF9800" },
  meeting: { icon: "people", color: "#2196F3" },
  announcement: { icon: "megaphone", color: "#4CAF50" },
  personal: { icon: "person", color: "#9C27B0" }
};

export default function CalendarScreen() {
  const { isDark, colors } = useTheme();
  const [events, setEvents] = useState(initialEvents);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderType, setReminderType] = useState<keyof typeof eventTypes>("personal");
  const [datePickerVisible, setDatePickerVisible] = useState<"date" | "time" | null>(null);
  const [reminderDate, setReminderDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [deviceCalendarId, setDeviceCalendarId] = useState<string | null>(null);
  const [deviceEvents, setDeviceEvents] = useState<any[]>([]);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [calendarModule, setCalendarModule] = useState<any>(null);
  const [addToDeviceCalendar, setAddToDeviceCalendar] = useState(false);

  useEffect(() => {
    (async () => {
      const savedPush = await AsyncStorage.getItem("pushRemindersEnabled");
      if (savedPush != null) setPushEnabled(savedPush === "true");
      const savedCustom = await AsyncStorage.getItem("customReminders");
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed)) setEvents([...initialEvents, ...parsed]);
      }
      const savedDeviceCalendarId = await AsyncStorage.getItem("deviceCalendarId");
      if (savedDeviceCalendarId) {
        setDeviceCalendarId(savedDeviceCalendarId);
      }
    })();
  }, []);

  const onTogglePush = async (value: boolean) => {
    setPushEnabled(value);
    await AsyncStorage.setItem("pushRemindersEnabled", String(value));
  };

  const saveCustomReminder = async () => {
    if (!reminderTitle.trim()) return;
    const dateIso = reminderDate.toISOString().slice(0, 10);
    const timeStr = reminderDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newItem = {
      id: Date.now(),
      title: reminderTitle.trim(),
      date: dateIso,
      time: timeStr,
      type: reminderType,
      priority: "low",
      color: eventTypes[reminderType].color,
      description: "Custom reminder"
    } as any;

    const existingRaw = await AsyncStorage.getItem("customReminders");
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = [...existing, newItem];
    await AsyncStorage.setItem("customReminders", JSON.stringify(updated));
    setEvents(prev => [...prev, newItem]);
    // Optionally add to device calendar
    try {
      if (addToDeviceCalendar && deviceCalendarId) {
        const CalendarMod = await ensureCalendarModule();
        const startDate = new Date(reminderDate);
        const endDate = new Date(reminderDate.getTime() + 30 * 60 * 1000);
        await CalendarMod.createEventAsync(deviceCalendarId, {
          title: newItem.title,
          startDate,
          endDate,
          notes: newItem.description,
        });
        if (selectedDate === dateIso) {
          await fetchDeviceEventsForDate(selectedDate);
        }
      }
    } catch { }
    setShowReminderModal(false);
    setReminderTitle("");
    setReminderType("personal");
    setAddToDeviceCalendar(false);
  };

  const eventsOnDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) {
      map[e.date] = (map[e.date] || 0) + 1;
    }
    return map;
  }, [events]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const markedDates = useMemo(() => {
    const grouped: Record<string, { dots: { color: string }[] }> = {};
    for (const e of events) {
      if (!grouped[e.date]) grouped[e.date] = { dots: [] };
      const color = (eventTypes as any)[e.type]?.color || "#4CAF50";
      if (!grouped[e.date].dots.find(d => d.color === color)) grouped[e.date].dots.push({ color });
    }
    const marks: Record<string, any> = {};
    for (const [date, { dots }] of Object.entries(grouped)) {
      marks[date] = {
        marked: true,
        dots,
        selected: date === selectedDate,
        selectedColor: "#4CAF50"
      };
    }
    if (!marks[selectedDate]) {
      marks[selectedDate] = { selected: true, selectedColor: "#4CAF50" };
    }
    return marks;
  }, [events, selectedDate, isDark]);

  useEffect(() => {
    if (deviceCalendarId) {
      fetchDeviceEventsForDate(selectedDate).catch(() => { });
    }
  }, [selectedDate, deviceCalendarId]);

  const ensureCalendarModule = async () => {
    if (calendarModule) return calendarModule;
    const mod = await import("expo-calendar");
    setCalendarModule(mod);
    return mod;
  };

  const connectDeviceCalendar = async () => {
    try {
      setIsConnectingCalendar(true);
      const CalendarMod = await ensureCalendarModule();
      const perm = await CalendarMod.requestCalendarPermissionsAsync();
      if (perm.status !== "granted") {
        setIsConnectingCalendar(false);
        return;
      }
      let defaultCal: any = null;
      try {
        defaultCal = await CalendarMod.getDefaultCalendarAsync();
      } catch { }
      if (!defaultCal) {
        const cals = await CalendarMod.getCalendarsAsync(CalendarMod.EntityTypes.EVENT);
        defaultCal = cals.find((c: any) => c.allowsModifications) || cals[0] || null;
      }
      if (!defaultCal) {
        setIsConnectingCalendar(false);
        return;
      }
      setDeviceCalendarId(defaultCal.id);
      await AsyncStorage.setItem("deviceCalendarId", String(defaultCal.id));
      await fetchDeviceEventsForDate(selectedDate);
    } finally {
      setIsConnectingCalendar(false);
    }
  };

  const fetchDeviceEventsForDate = async (dateIso: string) => {
    const CalendarMod = await ensureCalendarModule();
    if (!deviceCalendarId) return;
    const start = new Date(dateIso + "T00:00:00.000");
    const end = new Date(dateIso + "T23:59:59.999");
    const list = await CalendarMod.getEventsAsync([deviceCalendarId], start, end);
    setDeviceEvents(list || []);
  };

  const getDayTextRemainingColor = (days: number) => {
    if (days <= 7) return "#FF9800";
    return isDark ? colors.textSecondary : "#666";
  };

  // Agenda view removed

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      <AppHeader
        title="Calendar & Reminders"
        onBack={() => router.back()}
        rightIcon={
          <TouchableOpacity onPress={() => setShowReminderModal(true)} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#4CAF50" />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingVertical: 20 }} showsVerticalScrollIndicator={false}>
        {/* Legend */}
        <View style={styles.legendContainer}>
          {Object.entries(eventTypes).map(([key, meta]) => (
            <View key={key} style={[styles.legendItem, { backgroundColor: isDark ? colors.surface : "rgba(255,255,255,0.9)", borderColor: colors.border }]}>
              <View style={[styles.legendDot, { backgroundColor: meta.color }]} />
              <Text style={[styles.legendText, { color: colors.text }]}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.calendarContainer, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
          <Calendar
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            initialDate={selectedDate}
            enableSwipeMonths
            theme={{
              backgroundColor: "transparent",
              calendarBackground: "transparent",
              textSectionTitleColor: isDark ? colors.textSecondary : "#666",
              selectedDayBackgroundColor: "#4CAF50",
              selectedDayTextColor: "#fff",
              todayTextColor: "#4CAF50",
              dayTextColor: colors.text,
              textDisabledColor: isDark ? "#444" : "#ccc",
              dotColor: "#4CAF50",
              selectedDotColor: "#ffffff",
              arrowColor: isDark ? colors.text : "#666",
              disabledArrowColor: isDark ? "#444" : "#d9e1e8",
              monthTextColor: colors.text,
              indicatorColor: "#4CAF50",
              textDayFontWeight: "600",
              textMonthFontWeight: "bold",
              textDayHeaderFontWeight: "600",
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13,
            }}
          />
        </View>

        {/* Push Reminder Toggle */}
        <View style={[styles.settingsCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchTitle, { color: colors.text }]}>Push Reminders</Text>
              <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>Get notified before deadlines and events</Text>
            </View>
            <Switch value={pushEnabled} onValueChange={onTogglePush} trackColor={{ false: '#ccc', true: '#4CAF50' }} />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchTitle, { color: colors.text }]}>Add to device calendar</Text>
              <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>Creates a device event if connected</Text>
            </View>
            <Switch value={addToDeviceCalendar} onValueChange={setAddToDeviceCalendar} trackColor={{ false: '#ccc', true: '#4CAF50' }} />
          </View>
          {!deviceCalendarId && addToDeviceCalendar && (
            <Text style={[styles.switchHint, { marginTop: 6, color: colors.textSecondary }]}>Connect your device calendar below first.</Text>
          )}
          <Text style={[styles.switchHint, { color: isDark ? "#666" : "#999" }]}>To enable actual push notifications, install and configure `expo-notifications`.</Text>
        </View>

        {/* Upcoming Deadlines */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Deadlines</Text>
          {upcomingDeadlines.map((deadline) => (
            <View key={deadline.id} style={[styles.deadlineCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
              <View style={[styles.deadlineIndicator, { backgroundColor: deadline.color }]} />
              <View style={styles.deadlineInfo}>
                <Text style={[styles.deadlineTitle, { color: colors.text }]}>{deadline.title}</Text>
                <Text style={[styles.deadlineDate, { color: colors.textSecondary }]}>Due: {deadline.deadline}</Text>
              </View>
              <View style={styles.deadlineDays}>
                <Text style={[styles.deadlineDaysText, { color: deadline.color }]}>
                  {deadline.daysLeft}
                </Text>
                <Text style={[styles.deadlineDaysLabel, { color: colors.textSecondary }]}>days left</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Selected Day Events */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Events on {selectedDate}</Text>
          {events.filter(e => e.date === selectedDate).length === 0 && (
            <Text style={{ color: colors.textSecondary }}>No reminders on this date.</Text>
          )}
          {events.filter(e => e.date === selectedDate).map((event) => {
            const typeInfo = eventTypes[event.type as keyof typeof eventTypes];
            return (
              <View key={event.id} style={[styles.eventCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
                <View style={[styles.eventIcon, { backgroundColor: typeInfo.color + '20' }]}>
                  <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
                </View>
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                  <Text style={[styles.eventDescription, { color: colors.textSecondary }]}>{event.description}</Text>
                  <Text style={[styles.eventTime, { color: colors.textSecondary }]}>{event.time}</Text>
                </View>
                <View style={[styles.eventPriority, { backgroundColor: event.color }]} />
              </View>
            );
          })}
        </View>

        {/* Device Schedule (Expo Calendar) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Device Schedule</Text>
          {!deviceCalendarId ? (
            <View style={[styles.settingsCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border, marginHorizontal: 0 }]}>
              <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>Connect your device calendar to see events for {selectedDate}.</Text>
              <TouchableOpacity onPress={connectDeviceCalendar} style={[styles.primaryBtn, { marginTop: 12, opacity: isConnectingCalendar ? 0.7 : 1 }]} disabled={isConnectingCalendar}>
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>{isConnectingCalendar ? 'Connecting…' : 'Connect Device Calendar'}</Text>
              </TouchableOpacity>
              <Text style={[styles.switchHint, { color: isDark ? "#666" : "#999" }]}>
                This uses Expo Calendar. If not installed, run: yarn add expo-calendar
              </Text>
            </View>
          ) : (
            <>
              {deviceEvents.length === 0 ? (
                <Text style={{ color: colors.textSecondary }}>No device events on this date.</Text>
              ) : (
                deviceEvents.map((evt: any) => (
                  <View key={evt.id} style={[styles.eventCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
                    <View style={[styles.eventIcon, { backgroundColor: isDark ? colors.surface : '#33333320' }]}>
                      <Ionicons name="calendar" size={20} color={isDark ? colors.text : "#333"} />
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventTitle, { color: colors.text }]}>{evt.title || 'Untitled Event'}</Text>
                      <Text style={[styles.eventDescription, { color: colors.textSecondary }]}>
                        {evt.startDate ? new Date(evt.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        {evt.endDate ? ` - ${new Date(evt.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </Text>
                      {!!evt.location && <Text style={[styles.eventTime, { color: colors.textSecondary }]}>{evt.location}</Text>}
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </View>

        {/* This Week's Events */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week's Events</Text>
          {events.map((event) => {
            const typeInfo = eventTypes[event.type as keyof typeof eventTypes];
            return (
              <TouchableOpacity key={event.id} style={[styles.eventCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
                <View style={[styles.eventIcon, { backgroundColor: typeInfo.color + '20' }]}>
                  <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
                </View>
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                  <Text style={[styles.eventDescription, { color: colors.textSecondary }]}>{event.description}</Text>
                  <Text style={[styles.eventTime, { color: colors.textSecondary }]}>{event.date} • {event.time}</Text>
                </View>
                <View style={[styles.eventPriority, { backgroundColor: event.color }]} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Optional Device Calendar CTA */}
        <View style={styles.quickActionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]} onPress={() => setShowReminderModal(true)}>
              <Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
              <Text style={[styles.quickActionText, { color: colors.text }]}>Add Reminder</Text>
            </TouchableOpacity>
            <View style={[styles.quickActionCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={24} color="#2196F3" />
              <Text style={[styles.quickActionText, { color: colors.text }]}>Integrate Device Calendar</Text>
              <Text style={[styles.quickActionHint, { color: colors.textSecondary }]}>Install `expo-calendar` to sync events</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Reminder Modal */}
      <Modal visible={showReminderModal} animationType="slide" transparent>
        <View style={[styles.modalBackdrop, { backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.2)" }]}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surface : "#fff", borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Custom Reminder</Text>
              <TouchableOpacity onPress={() => setShowReminderModal(false)} style={{ padding: 8 }}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Title"
              value={reminderTitle}
              onChangeText={setReminderTitle}
              style={[styles.input, { backgroundColor: isDark ? colors.background : "#fafafa", borderColor: colors.border, color: colors.text }]}
              placeholderTextColor={isDark ? "#666" : "#999"}
            />
            <View style={styles.typeRow}>
              {Object.keys(eventTypes).map((k) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setReminderType(k as keyof typeof eventTypes)}
                  style={[
                    styles.typeChip,
                    { backgroundColor: isDark ? colors.background : "#fff", borderColor: colors.border },
                    reminderType === k && { backgroundColor: (eventTypes as any)[k].color + '20', borderColor: (eventTypes as any)[k].color }
                  ]}
                >
                  <Ionicons name={(eventTypes as any)[k].icon} size={14} color={(eventTypes as any)[k].color} />
                  <Text style={[styles.typeChipText, { color: colors.text }]}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity onPress={() => setDatePickerVisible('date')} style={[styles.dateBtn, { backgroundColor: isDark ? colors.background : "#fafafa", borderColor: colors.border }]}>
                <Ionicons name="calendar" size={16} color={colors.text} />
                <Text style={[styles.dateBtnText, { color: colors.text }]}>{reminderDate.toDateString()}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDatePickerVisible('time')} style={[styles.dateBtn, { backgroundColor: isDark ? colors.background : "#fafafa", borderColor: colors.border }]}>
                <Ionicons name="time" size={16} color={colors.text} />
                <Text style={[styles.dateBtnText, { color: colors.text }]}>
                  {reminderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>

            {datePickerVisible && (
              <DateTimePicker
                value={reminderDate}
                mode={datePickerVisible}
                themeVariant={isDark ? "dark" : "light"}
                onChange={(_, selected) => {
                  if (selected) setReminderDate(selected);
                  if (Platform.OS === 'android') {
                    setDatePickerVisible(null);
                  }
                }}
              />
            )}

            <TouchableOpacity onPress={saveCustomReminder} style={styles.primaryBtn}>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Save Reminder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  scrollView: {
    flex: 1,
  },
  addButton: {
    padding: 8,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  monthButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  calendarContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
  },
  calendarHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  calendarDayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  calendarDayToday: {
    backgroundColor: "#4CAF50",
    borderRadius: 20,
  },
  calendarDayWithEvent: {
    backgroundColor: "#f0f8ff",
  },
  calendarDayText: {
    fontSize: 16,
    color: "#333",
  },
  calendarDayTextInactive: {
    color: "#ccc",
  },
  calendarDayTextToday: {
    color: "#fff",
    fontWeight: "600",
  },
  eventDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#4CAF50",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  deadlineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
  },
  deadlineIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  deadlineDate: {
    fontSize: 14,
    color: "#666",
  },
  deadlineDays: {
    alignItems: "center",
  },
  deadlineDaysText: {
    fontSize: 20,
    fontWeight: "700",
  },
  deadlineDaysLabel: {
    fontSize: 10,
    color: "#666",
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  eventDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 12,
    color: "#999",
  },
  eventPriority: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    width: "47%",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
  },
  quickActionText: {
    fontSize: 12,
    color: "#333",
    marginTop: 8,
    textAlign: "center",
    fontWeight: "500",
  },
  quickActionHint: {
    fontSize: 10,
    color: "#666",
    marginTop: 6,
    textAlign: "center",
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.08)",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  settingsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  switchSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  switchHint: {
    fontSize: 11,
    color: "#999",
    marginTop: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#333",
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  typeChipText: {
    fontSize: 12,
    color: "#333",
    textTransform: "capitalize",
    fontWeight: "600",
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  dateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fafafa",
  },
  dateBtnText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#4CAF50",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

