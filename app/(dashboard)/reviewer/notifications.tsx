import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

type NotificationType = "new" | "completed" | "system";
type FilterType = "all" | "new" | "completed" | "system";

interface Notification {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  timestamp: string;
  type: NotificationType;
  isRead: boolean;
  applicationId?: string;
  icon: string;
  iconColor: string;
}

export default function ReviewerNotificationsScreen() {
  const inset = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "New Application Received",
      message: "Application #1023 from Ravi Patel for STEM Excellence Scholarship",
      timeAgo: "2 minutes ago",
      timestamp: "12 Oct 2024, 2:30 PM",
      type: "new",
      isRead: false,
      applicationId: "1023",
      icon: "document-text-outline",
      iconColor: "#2196F3"
    },
    {
      id: "2",
      title: "Application Approved",
      message: "Application #1019 from Priya Sharma has been approved",
      timeAgo: "1 hour ago",
      timestamp: "12 Oct 2024, 1:30 PM",
      type: "completed",
      isRead: false,
      applicationId: "1019",
      icon: "checkmark-circle-outline",
      iconColor: "#4CAF50"
    },
    {
      id: "3",
      title: "System Maintenance",
      message: "Scheduled maintenance will occur tonight from 11 PM to 1 AM",
      timeAgo: "3 hours ago",
      timestamp: "12 Oct 2024, 11:30 AM",
      type: "system",
      isRead: true,
      icon: "settings-outline",
      iconColor: "#FF9800"
    },
    {
      id: "4",
      title: "Document Upload Required",
      message: "Application #1021 needs additional income certificate",
      timeAgo: "5 hours ago",
      timestamp: "12 Oct 2024, 9:30 AM",
      type: "new",
      isRead: false,
      applicationId: "1021",
      icon: "cloud-upload-outline",
      iconColor: "#FF5722"
    },
    {
      id: "5",
      title: "Application Rejected",
      message: "Application #1018 from Amit Kumar has been rejected",
      timeAgo: "1 day ago",
      timestamp: "11 Oct 2024, 4:15 PM",
      type: "completed",
      isRead: true,
      applicationId: "1018",
      icon: "close-circle-outline",
      iconColor: "#F44336"
    },
    {
      id: "6",
      title: "New Comment Added",
      message: "Team member added a comment on Application #1017",
      timeAgo: "1 day ago",
      timestamp: "11 Oct 2024, 2:45 PM",
      type: "new",
      isRead: true,
      applicationId: "1017",
      icon: "chatbubble-outline",
      iconColor: "#9C27B0"
    },
    {
      id: "7",
      title: "System Update",
      message: "New features added: Bulk approval and enhanced reporting",
      timeAgo: "2 days ago",
      timestamp: "10 Oct 2024, 10:00 AM",
      type: "system",
      isRead: true,
      icon: "refresh-outline",
      iconColor: "#607D8B"
    },
    {
      id: "8",
      title: "Application Completed",
      message: "Application #1015 from Suresh Singh has been fully processed",
      timeAgo: "2 days ago",
      timestamp: "10 Oct 2024, 3:20 PM",
      type: "completed",
      isRead: true,
      applicationId: "1015",
      icon: "checkmark-done-outline",
      iconColor: "#4CAF50"
    }
  ]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return notifications;
    return notifications.filter(n => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    );
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const filterTabs = [
    { key: "all" as FilterType, label: "All", count: notifications.length },
    { key: "new" as FilterType, label: "New", count: notifications.filter(n => n.type === "new").length },
    { key: "completed" as FilterType, label: "Completed", count: notifications.filter(n => n.type === "completed").length },
    { key: "system" as FilterType, label: "System", count: notifications.filter(n => n.type === "system").length },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Notifications"
        rightElement={
          unreadCount > 0 && (
            <TouchableOpacity
              style={[styles.markAllBtn, { backgroundColor: isDark ? "rgba(76, 175, 80, 0.1)" : "#E8F5E9" }]}
              onPress={markAllAsRead}
            >
              <Ionicons name="checkmark-done-outline" size={16} color="#4CAF50" />
              <Text style={styles.markAllText}>Mark All as Read</Text>
            </TouchableOpacity>
          )
        }
      />

      <View style={[styles.headerContent, { backgroundColor: colors.background, borderColor: colors.border, marginTop: 10 }]}>
        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                { backgroundColor: isDark ? colors.card : "#f5f5f5" },
                activeFilter === tab.key && [styles.activeTab, { backgroundColor: isDark ? colors.primary : "#333" }]
              ]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text style={[
                styles.tabText,
                { color: colors.textSecondary },
                activeFilter === tab.key && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[
                  styles.tabBadge,
                  { backgroundColor: isDark ? colors.background : "#fff" },
                  activeFilter === tab.key && styles.activeTabBadge
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    { color: colors.text },
                    activeFilter === tab.key && styles.activeTabBadgeText
                  ]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Mark All as Read Button */}

      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.cardList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {filteredNotifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[
                styles.listItem,
                { borderBottomColor: colors.border },
                !n.isRead && [styles.unreadItem, { backgroundColor: isDark ? "rgba(33, 150, 243, 0.1)" : "rgba(33, 150, 243, 0.02)" }]
              ]}
              activeOpacity={0.8}
              onPress={() => markAsRead(n.id)}
            >
              <View style={[styles.listItemIcon, { backgroundColor: `${n.iconColor}15` }]}>
                <Ionicons name={n.icon as any} size={18} color={n.iconColor} />
              </View>
              <View style={styles.listItemBody}>
                <View style={styles.listItemHeader}>
                  <Text style={[styles.listItemTitle, { color: colors.text }, !n.isRead && styles.unreadTitle]}>
                    {n.title}
                  </Text>
                  {!n.isRead && <View style={styles.unreadDot} />}
                </View>
                <Text style={[styles.listItemMessage, { color: colors.textSecondary }]}>{n.message}</Text>
                <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{n.timestamp}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
          {filteredNotifications.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={isDark ? colors.border : "#ccc"} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No {activeFilter} notifications</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },
  badge: {
    backgroundColor: "#F44336",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  tabsContainer: {
    marginBottom: 12,
  },
  tabsContent: {
    paddingRight: 20,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  activeTab: {
    backgroundColor: "#333",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  activeTabText: {
    color: "#fff",
  },
  tabBadge: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: "center",
  },
  activeTabBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#333",
  },
  activeTabBadgeText: {
    color: "#fff",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
    marginLeft: 4,
  },
  content: {
    padding: 20,
  },
  cardList: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(51, 51, 51, 0.06)",
  },
  unreadItem: {
    backgroundColor: "rgba(33, 150, 243, 0.02)",
    borderLeftWidth: 3,
    borderLeftColor: "#2196F3",
  },
  listItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  listItemBody: {
    flex: 1,
  },
  listItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  unreadTitle: {
    fontWeight: "700",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2196F3",
    marginLeft: 8,
  },
  listItemMessage: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 4,
  },
  listItemSub: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
    fontWeight: "500",
  },
});


