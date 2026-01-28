import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

const { width } = Dimensions.get("window");

interface Notification {
  id: string;
  type: "Application" | "KYC";
  text: string;
  ts: string;
  read: boolean;
  subject?: string;
  component?: string;
  event_type?: string;
}

// Notification Icon Component
const NotificationIcon = ({ type, isDark }: { type: "Application" | "KYC"; isDark: boolean }) => {
  const iconName = type === "KYC" ? "shield-checkmark" : "document-text";
  const iconColor = type === "KYC"
    ? (isDark ? "#60A5FA" : "#3B82F6")
    : (isDark ? "#34D399" : "#10B981");

  return (
    <View style={[
      styles.iconContainer,
      {
        backgroundColor: type === "KYC"
          ? (isDark ? "rgba(59, 130, 246, 0.2)" : "#DBEAFE")
          : (isDark ? "rgba(16, 185, 129, 0.2)" : "#D1FAE5")
      }
    ]}>
      <Ionicons name={iconName as any} size={20} color={iconColor} />
    </View>
  );
};

export default function ReviewerNotificationsScreen() {
  const { isDark, colors } = useTheme();
  const [activeTab, setActiveTab] = useState<"All" | "New" | "KYC" | "Application">("All");
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const tabs = useMemo(() => ["All", "New", "KYC", "Application"] as const, []);

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    // Format as date for older notifications
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Helper function to determine notification type
  const getNotificationType = (component: string, eventType: string): "Application" | "KYC" => {
    if (eventType?.toLowerCase().includes('kyc') || component?.toLowerCase().includes('kyc')) {
      return "KYC";
    }
    return "Application";
  };

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) {
        setError("No authentication data found");
        setLoading(false);
        return;
      }

      const authData = JSON.parse(authDataString);
      const token = authData?.token;

      if (!token) {
        setError("No authentication token found");
        setLoading(false);
        return;
      }

      const response = await getNotifications(token, {
        page: 1,
        per_page: 200,
      });

      if (response.success && response.data) {
        let notificationsData: any[] = [];

        if (Array.isArray(response.data)) {
          notificationsData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          notificationsData = response.data.data;
        } else if (typeof response.data === 'object' && response.data.success && Array.isArray(response.data.data)) {
          notificationsData = response.data.data;
        }

        const notifications: Notification[] = notificationsData.map((item: any) => ({
          id: String(item.id),
          type: getNotificationType(item.component, item.event_type),
          text: item.message || item.subject || "No message",
          subject: item.subject,
          ts: formatTimestamp(item.created_at),
          read: item.is_read === true || item.read_at !== null,
          component: item.component,
          event_type: item.event_type,
        }));

        setItems(notifications);
        setError(null);
      } else {
        setError(response.error || "Failed to load notifications");
      }
    } catch (err: any) {
      console.error("Error in fetchNotifications:", err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const filtered = useMemo(() => {
    switch (activeTab) {
      case "New":
        return items.filter((i) => !i.read);
      case "KYC":
        return items.filter((i) => i.type === "KYC");
      case "Application":
        return items.filter((i) => i.type === "Application");
      default:
        return items;
    }
  }, [activeTab, items]);

  const unreadCount = useMemo(() => items.filter(i => !i.read).length, [items]);

  const markAllAsRead = async () => {
    if (markingAll) return;

    setMarkingAll(true);
    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) {
        Alert.alert("Error", "No authentication data found");
        setMarkingAll(false);
        return;
      }

      const authData = JSON.parse(authDataString);
      const token = authData?.token;

      if (!token) {
        Alert.alert("Error", "No authentication token found");
        setMarkingAll(false);
        return;
      }

      const response = await markAllNotificationsRead(token);

      if (response.success) {
        setItems((prev) => prev.map((i) => ({ ...i, read: true })));
        // Success feedback without alert
      } else {
        Alert.alert("Error", response.error || "Failed to mark notifications as read");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "An error occurred");
    } finally {
      setMarkingAll(false);
    }
  };

  const toggleRead = async (id: string) => {
    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;

      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) return;

      const notification = items.find(i => i.id === id);
      if (!notification || notification.read) {
        return;
      }

      setItems((prev) => prev.map((i) => i.id === id ? { ...i, read: true } : i));

      const response = await markNotificationRead(token, id);

      if (!response.success) {
        setItems((prev) => prev.map((i) => i.id === id ? { ...i, read: false } : i));
        console.error("Failed to mark notification as read:", response.error);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, read: false } : i));
    }
  };

  const renderItem = ({ item, index }: { item: Notification; index: number }) => (
    <Animated.View style={{ opacity: 1 }}>
      <TouchableOpacity
        onPress={() => toggleRead(item.id)}
        activeOpacity={0.7}
        style={[
          styles.item,
          {
            backgroundColor: isDark ? colors.card : "#FFFFFF",
            borderColor: !item.read
              ? (isDark ? "#60A5FA" : "#3B82F6")
              : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)")
          },
          !item.read && styles.itemUnread,
        ]}
      >
        <View style={styles.itemContent}>
          <NotificationIcon type={item.type} isDark={isDark} />

          <View style={styles.itemBody}>
            <View style={styles.itemHeader}>
              <View style={styles.itemHeaderLeft}>
                <View style={[
                  styles.pill,
                  {
                    backgroundColor: item.type === "KYC"
                      ? (isDark ? "rgba(59, 130, 246, 0.15)" : "#EFF6FF")
                      : (isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5")
                  }
                ]}>
                  <Text style={[
                    styles.pillText,
                    {
                      color: item.type === "KYC"
                        ? (isDark ? "#60A5FA" : "#1E40AF")
                        : (isDark ? "#34D399" : "#065F46")
                    }
                  ]}>
                    {item.type}
                  </Text>
                </View>
                {!item.read && (
                  <View style={[styles.newBadge, { backgroundColor: isDark ? "#60A5FA" : "#3B82F6" }]}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.time, { color: colors.textSecondary }]}>{item.ts}</Text>
            </View>

            <Text
              style={[
                styles.itemText,
                { color: !item.read ? colors.text : colors.textSecondary },
                !item.read && styles.itemTextUnread
              ]}
              numberOfLines={3}
            >
              {item.text}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderHeader = () => (
    <View style={styles.listHeaderArea}>
      {/* Stats Section */}
      <View style={[
        styles.statsContainer,
        {
          backgroundColor: isDark ? "rgba(59, 130, 246, 0.1)" : "#EFF6FF",
          borderColor: isDark ? "rgba(59, 130, 246, 0.2)" : "#DBEAFE"
        }
      ]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: isDark ? "#60A5FA" : "#3B82F6" }]}>
            {items.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: isDark ? "#34D399" : "#10B981" }]}>
            {unreadCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Unread</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: isDark ? "#F59E0B" : "#D97706" }]}>
            {items.filter(i => i.type === "KYC").length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>KYC</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {tabs.map((t) => {
          const count = t === "New" ? unreadCount :
            t === "All" ? items.length :
              items.filter(i => i.type === t).length;
          const isActive = activeTab === t;

          return (
            <TouchableOpacity
              key={t}
              onPress={() => setActiveTab(t)}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive
                    ? (isDark ? colors.primary : "#3B82F6")
                    : (isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6"),
                  borderColor: isActive
                    ? (isDark ? colors.primary : "#3B82F6")
                    : "transparent"
                }
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                { color: isActive ? "#FFFFFF" : colors.textSecondary }
              ]}>
                {t}
              </Text>
              {count > 0 && (
                <View style={[
                  styles.tabBadge,
                  {
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.25)"
                      : (isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB")
                  }
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    { color: isActive ? "#FFFFFF" : colors.textSecondary }
                  ]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader title="Notifications" />

      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={[
            styles.loadingCard,
            { backgroundColor: isDark ? colors.card : "#FFFFFF" }
          ]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading notifications...
            </Text>
            <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>
              Please wait a moment
            </Text>
          </View>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <View style={[
            styles.errorCard,
            { backgroundColor: isDark ? colors.card : "#FFFFFF" }
          ]}>
            <View style={[styles.errorIconContainer, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2" }]}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
            </View>
            <Text style={[styles.errorTitle, { color: colors.text }]}>
              Oops! Something went wrong
            </Text>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setLoading(true);
                setError(null);
                fetchNotifications();
              }}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
                title="Pull to refresh"
                titleColor={colors.textSecondary}
              />
            }
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <View style={[
                  styles.emptyIconContainer,
                  { backgroundColor: isDark ? "rgba(59, 130, 246, 0.1)" : "#EFF6FF" }
                ]}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={64}
                    color={isDark ? "#60A5FA" : "#3B82F6"}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No notifications yet
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {activeTab === "All"
                    ? "You're all caught up! Check back later for updates."
                    : `No ${activeTab.toLowerCase()} notifications to display.`}
                </Text>
              </View>
            )}
            contentContainerStyle={[
              styles.listContent,
              filtered.length === 0 && styles.listContentEmpty
            ]}
            showsVerticalScrollIndicator={false}
          />

          {/* Floating Mark All as Read Button */}
          {/* {unreadCount > 0 && (
            <View style={styles.floatingButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.floatingButton,
                  {
                    backgroundColor: isDark ? colors.primary : "#3B82F6",
                    shadowColor: isDark ? colors.primary : "#3B82F6"
                  }
                ]}
                onPress={markAllAsRead}
                activeOpacity={0.8}
                disabled={markingAll}
              >
                {markingAll ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                    <Text style={styles.floatingButtonText}>
                      Mark all as read ({unreadCount})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )} */}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    minWidth: 280,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "700",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    maxWidth: 340,
  },
  errorIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  listHeaderArea: {
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    marginHorizontal: 12,
  },
  tabs: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontWeight: "700",
    fontSize: 14,
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  item: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  itemUnread: {
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  itemContent: {
    padding: 16,
    flexDirection: "row",
    gap: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  itemBody: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pillText: {
    fontWeight: "800",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  newBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 13,
    fontWeight: "600",
  },
  itemText: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
  itemTextUnread: {
    fontWeight: "600",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 128,
    height: 128,
    borderRadius: 64,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
  },
  floatingButtonContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  floatingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
