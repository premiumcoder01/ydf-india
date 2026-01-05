import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Button from "../../../components/Button";

export default function ProviderNotificationsScreen() {
  const { isDark, colors } = useTheme();
  const [activeTab, setActiveTab] = useState<"All" | "New" | "KYC" | "Application">("All");
  const [items, setItems] = useState(
    () => [
      { id: "1", type: "Application" as const, text: "10 new applicants for XYZ Scholarship", ts: "2h ago", read: false },
      { id: "2", type: "KYC" as const, text: "Your KYC is under review", ts: "1d ago", read: false },
      { id: "3", type: "Application" as const, text: "Application ABC approved", ts: "2d ago", read: true },
      { id: "4", type: "KYC" as const, text: "KYC verified successfully", ts: "3d ago", read: true },
    ]
  );

  const tabs = useMemo(() => ["All", "New", "KYC", "Application"] as const, []);

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

  const markAllAsRead = () => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  const toggleRead = (id: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, read: !i.read } : i));
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
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notifications to display</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
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