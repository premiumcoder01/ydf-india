import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Button from "../../../components/Button";

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

export default function ReviewerNotificationsScreen() {
  const { isDark, colors } = useTheme();
  const [activeTab, setActiveTab] = useState<"All" | "New" | "KYC" | "Application">("All");
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabs = useMemo(() => ["All", "New", "KYC", "Application"] as const, []);

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Helper function to determine notification type
  const getNotificationType = (component: string, eventType: string): "Application" | "KYC" => {
    // Map component/event types to our notification types
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

      console.log("Fetching notifications with token:", token.substring(0, 20) + "...");

      const response = await getNotifications(token, {
        page: 1,
        per_page: 200,
      });

      console.log("API Response:", JSON.stringify(response, null, 2));
      console.log("Response success:", response.success);
      console.log("Response data type:", typeof response.data);
      console.log("Response data:", response.data);

      if (response.success && response.data) {
        // The API wraps the response, so response.data contains the actual API response
        // which has { success: true, data: [...], pagination: {...} }
        let notificationsData: any[] = [];

        if (Array.isArray(response.data)) {
          // If response.data is directly an array
          notificationsData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // If response.data has a nested data property
          notificationsData = response.data.data;
        } else if (typeof response.data === 'object' && response.data.success && Array.isArray(response.data.data)) {
          // If the API response is wrapped again
          notificationsData = response.data.data;
        }

        console.log("Notifications data array:", notificationsData);
        console.log("Number of notifications:", notificationsData.length);

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

        console.log("Mapped notifications:", notifications);
        setItems(notifications);
        setError(null);
      } else {
        console.log("API call failed or no data");
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

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Pull to refresh
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
    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) {
        Alert.alert("Error", "No authentication data found");
        return;
      }

      const authData = JSON.parse(authDataString);
      const token = authData?.token;

      if (!token) {
        Alert.alert("Error", "No authentication token found");
        return;
      }

      const response = await markAllNotificationsRead(token);

      if (response.success) {
        // Update local state
        setItems((prev) => prev.map((i) => ({ ...i, read: true })));
        Alert.alert("Success", "All notifications marked as read");
      } else {
        Alert.alert("Error", response.error || "Failed to mark notifications as read");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "An error occurred");
    }
  };

  const toggleRead = async (id: string) => {
    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;

      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) return;

      // Find the notification to check if it's already read
      const notification = items.find(i => i.id === id);
      if (!notification || notification.read) {
        // If already read, do nothing
        return;
      }

      // Optimistically update UI
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, read: true } : i));

      // Call API to mark as read
      const response = await markNotificationRead(token, id);

      if (!response.success) {
        // Revert on failure
        setItems((prev) => prev.map((i) => i.id === id ? { ...i, read: false } : i));
        console.error("Failed to mark notification as read:", response.error);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Revert on error
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, read: false } : i));
    }
  };

  const renderItem = ({ item }: { item: (typeof items)[number] }) => (
    <TouchableOpacity
      onPress={() => toggleRead(item.id)}
      activeOpacity={0.7}
      style={[
        styles.item,
        { backgroundColor: colors.card, borderColor: colors.border },
        !item.read && [styles.itemUnread, { borderColor: isDark ? "#60A5FA" : "#3B82F6" }]
      ]}
    >
      <View style={styles.itemContent}>
        <View style={styles.itemLeft}>
          {!item.read && <View style={[styles.unreadDot, { backgroundColor: isDark ? "#60A5FA" : "#3B82F6" }]} />}
          <View style={styles.itemBody}>
            <View style={styles.itemHeader}>
              <View style={[
                styles.pill,
                item.type === "KYC"
                  ? [styles.pillKyc, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "#DBEAFE" }]
                  : [styles.pillApplication, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#D1FAE5" }]
              ]}>
                <Text style={[
                  styles.pillText,
                  item.type === "KYC"
                    ? [styles.pillTextKyc, { color: isDark ? "#60A5FA" : "#1E40AF" }]
                    : [styles.pillTextApp, { color: isDark ? "#34D399" : "#065F46" }]
                ]}>
                  {item.type}
                </Text>
              </View>
              <Text style={[styles.time, { color: colors.textSecondary }]}>{item.ts}</Text>
            </View>
            <Text style={[
              styles.itemText,
              { color: colors.textSecondary },
              !item.read && [styles.itemTextUnread, { color: colors.text }]
            ]}>{item.text}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader title="Notifications" />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading notifications...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error || "#EF4444" }]}>
            {error}
          </Text>
          <Button
            title="Retry"
            variant="primary"
            onPress={() => {
              setLoading(true);
              setError(null);
              fetchNotifications();
            }}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={() => (
            <View style={styles.listHeaderArea}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount} new</Text>
                  </View>
                )}
              </View>
              <View style={styles.tabs}>
                {tabs.map((t) => {
                  const count = t === "New" ? unreadCount :
                    t === "All" ? items.length :
                      items.filter(i => i.type === t).length;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setActiveTab(t)}
                      style={[
                        styles.tab,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        activeTab === t && [styles.tabActive, { borderColor: isDark ? colors.primary : "#F59E0B", backgroundColor: isDark ? colors.primary + "15" : "#FFFBEB" }]
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.tabText,
                        { color: colors.textSecondary },
                        activeTab === t && [styles.tabTextActive, { color: isDark ? colors.primary : "#92400E" }]
                      ]}>
                        {t}
                      </Text>
                      {count > 0 && (
                        <View style={[
                          styles.tabBadge,
                          { backgroundColor: isDark ? colors.surface : "#F3F4F6" },
                          activeTab === t && [styles.tabBadgeActive, { backgroundColor: isDark ? colors.primary + "33" : "#FCD34D" }]
                        ]}>
                          <Text style={[
                            styles.tabBadgeText,
                            { color: colors.textSecondary },
                            activeTab === t && [styles.tabBadgeTextActive, { color: isDark ? colors.primary : "#78350F" }]
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
          )}
          ListFooterComponent={() => (
            unreadCount > 0 ? (
              <View style={styles.footer}>
                <Button title="Mark All as Read" variant="secondary" onPress={markAllAsRead} />
              </View>
            ) : null
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No notifications to display
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  listContent: {
    padding: 20,
    paddingBottom: 24,
  },
  listHeaderArea: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabActive: {
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontWeight: "600",
    fontSize: 14,
  },
  tabTextActive: {
    fontWeight: "700",
  },
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    minWidth: 20,
    alignItems: "center",
  },
  tabBadgeActive: {
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tabBadgeTextActive: {
  },
  item: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  itemUnread: {
    borderWidth: 2,
    shadowColor: "#3B82F6",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  itemContent: {
    padding: 16,
  },
  itemLeft: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 6,
  },
  itemBody: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  pillKyc: {
  },
  pillApplication: {
  },
  pillText: {
    fontWeight: "700",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pillTextKyc: {
  },
  pillTextApp: {
  },
  time: {
    fontSize: 12,
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
  footer: {
    marginTop: 20,
  },
  empty: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
