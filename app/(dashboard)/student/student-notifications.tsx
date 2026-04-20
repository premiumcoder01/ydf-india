import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type EventType =
  | "newlogin"
  | "assign_notification"
  | "assign_due_soon"
  | "enrolcoursewelcomemessage"
  | "system";

type NotificationItem = {
  id: number;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
  context_url: string | null;
  component: string;
  event_type: EventType | string;
  // computed
  timeAgo: string;
  dateISO: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseCreatedAt = (created_at: string): Date => {
  // "2026-02-23 18:32:29"  →  ISO
  return new Date(String(created_at).replace(" ", "T"));
};

const getTimeAgo = (date: Date): string => {
  const diff = Date.now() - date.getTime();
  if (diff < 0) return "Just now";
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
};

// ─── Event Config ─────────────────────────────────────────────────────────────

type EventConfig = {
  icon: string;
  color: string;
  label: string;
  bg: string;
};

const EVENT_CONFIG: Record<string, EventConfig> = {
  newlogin: {
    icon: "shield-checkmark",
    color: "#6C63FF",
    bg: "#EEF0FF",
    label: "Security",
  },
  assign_notification: {
    icon: "document-text",
    color: "#00B894",
    bg: "#E8FAF6",
    label: "Assignment",
  },
  assign_due_soon: {
    icon: "document-text",
    color: "#00B894",
    bg: "#E8FAF6",
    label: "Assignment",
  },
  enrolcoursewelcomemessage: {
    icon: "school",
    color: "#F4A261",
    bg: "#FEF4E8",
    label: "Enrollment",
  },
  system: {
    icon: "notifications",
    color: "#4895EF",
    bg: "#EBF5FF",
    label: "System",
  },
};

const getEventConfig = (event_type: string): EventConfig =>
  EVENT_CONFIG[event_type] ?? EVENT_CONFIG.system;

// ─── Filter Definitions ───────────────────────────────────────────────────────

const FILTERS = [
  { key: "all", label: "All" },
  { key: "assign_notification", label: "Assignments" },
  { key: "enrolcoursewelcomemessage", label: "Enrollments" },
  { key: "newlogin", label: "Security" },
];

// ─── Animated Notification Card ───────────────────────────────────────────────

function NotificationCard({
  item,
  isDark,
  colors,
  onPress,
}: {
  item: NotificationItem;
  isDark: boolean;
  colors: any;
  onPress: (item: NotificationItem) => void;
}) {
  const cfg = getEventConfig(item.event_type);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onPress(item)}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.card : "#FFFFFF",
            borderColor: isDark ? colors.border : "rgba(0,0,0,0.06)",
            transform: [{ scale: scaleAnim }],
          },
          !item.is_read && {
            borderLeftWidth: 3,
            borderLeftColor: cfg.color,
          },
        ]}
      >
        {/* Left icon */}
        <View style={[styles.cardIcon, { backgroundColor: isDark ? cfg.color + "30" : cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
        </View>

        {/* Content */}
        <View style={styles.cardBody}>
          {/* Badge + time row */}
          <View style={styles.cardMeta}>
            <View style={[styles.badge, { backgroundColor: isDark ? cfg.color + "30" : cfg.bg }]}>
              <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={[styles.timeText, { color: isDark ? "#666" : "#AAA" }]}>
              {item.timeAgo}
            </Text>
          </View>

          {/* Subject */}
          <Text
            style={[
              styles.subject,
              { color: colors.text },
              !item.is_read && { fontWeight: "700" },
            ]}
            numberOfLines={2}
          >
            {item.subject}
          </Text>

          {/* Message (if different from subject) */}
          {item.message && item.message !== item.subject && (
            <Text
              style={[styles.body, { color: isDark ? "#888" : "#888" }]}
              numberOfLines={2}
            >
              {item.message}
            </Text>
          )}

          {/* Context URL pill */}
          {/* {!!item.context_url && (
            <View style={styles.urlPill}>
              <Ionicons name="link-outline" size={11} color={cfg.color} />
              <Text style={[styles.urlText, { color: cfg.color }]}>View details</Text>
            </View>
          )} */}
        </View>

        {/* Unread dot */}
        {!item.is_read && (
          <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { isDark, colors } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [token, setToken] = useState<string | null>(null);

  // Fade-in animation for the list
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;
      const authData = JSON.parse(authDataString);
      const tok = authData?.token;
      if (!tok) return;
      setToken(tok);

      const response = await getNotifications(tok);

      if (response.success && response.data) {
        let raw: any[] = [];
        if (Array.isArray(response.data)) {
          raw = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          raw = response.data.data;
        } else if (response.data && Array.isArray(response.data.notifications)) {
          raw = response.data.notifications;
        }

        const mapped: NotificationItem[] = raw.map((n: any) => {
          const date = parseCreatedAt(n.created_at || "");
          return {
            id: n.id,
            subject: n.subject || "Notification",
            message: n.message || "",
            is_read: !!n.is_read,
            created_at: n.created_at,
            context_url: n.context_url ? n.context_url.replace(/&amp;/g, "&") : null,
            component: n.component || "",
            event_type: n.event_type || "system",
            timeAgo: getTimeAgo(date),
            dateISO: date.toISOString(),
          };
        });

        // Sort newest first
        mapped.sort(
          (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
        );
        setNotifications(mapped);

        // Animate in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    } catch (err) {
      console.error("Notification fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(true);
  }, [fetchNotifications]);

  // ── Mark single read ────────────────────────────────────────────────────────

  const handleCardPress = useCallback(
    async (item: NotificationItem) => {
      if (!item.is_read) {
        // Optimistic update
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        if (token) {
          await markNotificationRead(token, item.id);
        }
      }
    },
    [token]
  );

  // ── Mark all read ───────────────────────────────────────────────────────────

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (token) {
      await markAllNotificationsRead(token);
    }
  }, [token]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const filtered = useMemo(() => {
    if (activeFilter === "all") return notifications;
    if (activeFilter === "assign_notification") {
      return notifications.filter(
        (n) => n.event_type === "assign_notification" || n.event_type === "assign_due_soon"
      );
    }
    return notifications.filter((n) => n.event_type === activeFilter);
  }, [notifications, activeFilter]);

  // Group into Today / This Week / Older
  const groups = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const sevenAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const today: NotificationItem[] = [];
    const thisWeek: NotificationItem[] = [];
    const older: NotificationItem[] = [];

    filtered.forEach((n) => {
      const d = new Date(n.dateISO);
      if (d >= startOfToday) today.push(n);
      else if (d >= sevenAgo) thisWeek.push(n);
      else older.push(n);
    });

    return { today, thisWeek, older };
  }, [filtered]);

  // ── Render Helpers ──────────────────────────────────────────────────────────

  const renderGroup = (label: string, items: NotificationItem[]) => {
    if (items.length === 0) return null;
    return (
      <View key={label}>
        <View style={styles.groupLabelRow}>
          <View style={[styles.groupDot, { backgroundColor: isDark ? "#555" : "#DDD" }]} />
          <Text style={[styles.groupLabel, { color: isDark ? "#777" : "#AAA" }]}>
            {label.toUpperCase()}
          </Text>
          <View style={[styles.groupLine, { backgroundColor: isDark ? "#333" : "#EEE" }]} />
        </View>
        {items.map((item) => (
          <NotificationCard
            key={item.id}
            item={item}
            isDark={isDark}
            colors={colors}
            onPress={handleCardPress}
          />
        ))}
      </View>
    );
  };

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={isDark ? ["#121212", "#1a1a2e"] : ["#F8F9FF", "#EEF2FF"]}
          style={StyleSheet.absoluteFill}
        />
        <AppHeader title="Notifications" onBack={() => router.navigate("/(dashboard)/student-dashboard")} />
        <View style={styles.centeredLoader}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={[styles.loadingText, { color: isDark ? "#666" : "#AAA" }]}>
            Loading notifications…
          </Text>
        </View>
      </View>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={isDark ? ["#121212", "#1a1a2e"] : ["#F8F9FF", "#EEF2FF"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <AppHeader
        title="Notifications"
        onBack={() => router.navigate("/(dashboard)/student-dashboard")}
        rightIcon={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
              <Ionicons name="checkmark-done" size={16} color="#6C63FF" />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C63FF"
            colors={["#6C63FF"]}
          />
        }
      >
        {/* ── Stats Row ──────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard
            icon="mail-unread"
            value={unreadCount}
            label="Unread"
            color="#6C63FF"
            isDark={isDark}
            colors={colors}
          />
          <StatCard
            icon="notifications"
            value={notifications.length}
            label="Total"
            color="#00B894"
            isDark={isDark}
            colors={colors}
          />
          <StatCard
            icon="calendar"
            value={groups.thisWeek.length}
            label="This week"
            color="#F4A261"
            isDark={isDark}
            colors={colors}
          />
        </View>

        {/* ── Filter Chips ───────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive
                      ? "#6C63FF"
                      : isDark
                        ? "#1E1E2E"
                        : "#FFFFFF",
                    borderColor: isActive ? "#6C63FF" : isDark ? "#333" : "#E8E8F0",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isActive ? "#FFF" : isDark ? "#AAA" : "#666" },
                  ]}
                >
                  {f.label}
                </Text>
                {f.key !== "all" && (
                  <Text
                    style={[
                      styles.filterCount,
                      {
                        color: isActive ? "rgba(255,255,255,0.7)" : isDark ? "#555" : "#CCC",
                      },
                    ]}
                  >
                    {" "}
                    {f.key === "assign_notification"
                      ? notifications.filter(
                          (n) => n.event_type === "assign_notification" || n.event_type === "assign_due_soon"
                        ).length
                      : notifications.filter((n) => n.event_type === f.key).length}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Notification List ──────────────────────────────────────── */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {filtered.length === 0 ? (
            <EmptyState isDark={isDark} colors={colors} />
          ) : (
            <View style={styles.listContainer}>
              {renderGroup("Today", groups.today)}
              {renderGroup("This Week", groups.thisWeek)}
              {renderGroup("Older", groups.older)}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  color,
  isDark,
  colors,
}: {
  icon: string;
  value: number;
  label: string;
  color: string;
  isDark: boolean;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: isDark ? "#1E1E2E" : "#FFFFFF",
          borderColor: isDark ? "#2A2A3E" : "rgba(0,0,0,0.05)",
        },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: isDark ? "#666" : "#AAA" }]}>{label}</Text>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isDark, colors }: { isDark: boolean; colors: any }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIconBg, { backgroundColor: isDark ? "#1E1E2E" : "#F0F0FF" }]}>
        <Ionicons
          name="notifications-off-outline"
          size={48}
          color={isDark ? "#444" : "#C5C5E8"}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notifications</Text>
      <Text style={[styles.emptyDesc, { color: isDark ? "#555" : "#AAA" }]}>
        {"You're all caught up! Pull down to refresh."}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  scroll: { paddingBottom: 40 },

  // ── Loading
  centeredLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14 },

  // ── Mark-all button
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(108,99,255,0.1)",
  },
  markAllText: { fontSize: 12, color: "#6C63FF", fontWeight: "600" },

  // ── Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "500", textAlign: "center" },

  // ── Filters
  filterScroll: { marginBottom: 8 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: "600" },
  filterCount: { fontSize: 13 },

  // ── List
  listContainer: { paddingHorizontal: 16, paddingTop: 8 },

  // ── Group header
  groupLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 10,
    gap: 8,
  },
  groupDot: { width: 6, height: 6, borderRadius: 3 },
  groupLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  groupLine: { flex: 1, height: 1 },

  // ── Card
  card: {
    flexDirection: "row",
    borderRadius: 16,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  timeText: { fontSize: 11 },
  subject: { fontSize: 14, fontWeight: "600", lineHeight: 20, color: "#333" },
  body: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  urlPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  urlText: { fontSize: 11, fontWeight: "600" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
    flexShrink: 0,
  },

  // ── Empty
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 22 },
});
