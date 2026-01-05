import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

type AppItem = {
  id: string;
  title: string;
  student: string;
  status: "Pending" | "Approved" | "Rejected";
  bookmarked?: boolean;
  date?: string;
  priority?: "high" | "medium" | "low";
};

const STATUS_TABS: Array<"All" | "Pending" | "Approved" | "Rejected"> = [
  "All",
  "Pending",
  "Approved",
  "Rejected",
];

export default function ReviewerApplicationsScreen() {
  const inset = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] =
    useState<(typeof STATUS_TABS)[number]>("All");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [applications, setApplications] = useState<AppItem[]>([
    {
      id: "1",
      title: "STEM Excellence Scholarship",
      student: "Ravi Patel",
      status: "Pending",
      date: "2 days ago",
      priority: "high",
    },
    {
      id: "2",
      title: "Global Leaders Grant",
      student: "Sara Lee",
      status: "Approved",
      date: "5 days ago",
      priority: "medium",
    },
    {
      id: "3",
      title: "Arts & Culture Fund",
      student: "Omar Hassan",
      status: "Rejected",
      date: "1 week ago",
      priority: "low",
    },
    {
      id: "4",
      title: "Women in Tech Award",
      student: "Priya Verma",
      status: "Pending",
      date: "1 day ago",
      priority: "high",
    },
    {
      id: "5",
      title: "Community Impact Scholarship",
      student: "Daniel Kim",
      status: "Approved",
      date: "3 days ago",
      priority: "medium",
    },
    {
      id: "6",
      title: "Future Innovators Fund",
      student: "Aisha Khan",
      status: "Pending",
      date: "4 hours ago",
      priority: "high",
    },
    {
      id: "7",
      title: "Entrepreneurship Bursary",
      student: "Luis Garcia",
      status: "Rejected",
      date: "2 weeks ago",
      priority: "low",
    },
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = applications.filter(
      (a) =>
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.student.toLowerCase().includes(q)
    );
    if (activeTab !== "All") {
      items = items.filter((a) => a.status === activeTab);
    }
    return items;
  }, [applications, query, activeTab]);

  const visible = useMemo(
    () => filtered.slice(0, page * pageSize),
    [filtered, page]
  );

  const stats = useMemo(() => {
    return {
      total: applications.length,
      pending: applications.filter((a) => a.status === "Pending").length,
      approved: applications.filter((a) => a.status === "Approved").length,
      rejected: applications.filter((a) => a.status === "Rejected").length,
    };
  }, [applications]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Applications"
        subtitle={`${filtered.length} ${filtered.length === 1 ? "result" : "results"}`}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            <TextInput
              placeholder="Search applications..."
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Enhanced Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {STATUS_TABS.map((tab) => {
            const count =
              tab === "All"
                ? stats.total
                : tab === "Pending"
                  ? stats.pending
                  : tab === "Approved"
                    ? stats.approved
                    : stats.rejected;

            const isActive = activeTab === tab;

            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => {
                  setActiveTab(tab);
                  setPage(1);
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: colors.textSecondary },
                    isActive && { color: "#fff" },
                  ]}
                >
                  {tab}
                </Text>
                <View
                  style={[
                    styles.tabBadge,
                    { backgroundColor: isDark ? colors.surface : "#f5f5f5" },
                    isActive && styles.tabBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      { color: colors.textSecondary },
                      isActive && styles.tabBadgeTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Enhanced Application Cards */}
        <View style={styles.cardList}>
          {visible.map((a, index) => (
            <TouchableOpacity
              key={a.id}
              style={[
                styles.listItem,
                { backgroundColor: colors.card, borderColor: colors.border },
                index === visible.length - 1 && styles.listItemLast,
              ]}
              activeOpacity={0.7}
              onPress={() =>
                router.push("/(dashboard)/reviewer/application-details")
              }
            >
              {/* Priority Indicator */}
              {a.priority === "high" && (
                <View style={styles.priorityIndicator} />
              )}

              <View style={styles.listItemMain}>
                <View style={styles.listItemLeft}>
                  <View
                    style={[styles.listItemIcon, getStatusIconStyle(a.status, isDark)]}
                  >
                    <Ionicons
                      name={getStatusIcon(a.status)}
                      size={20}
                      color={getStatusColor(a.status)}
                    />
                  </View>
                  <View style={styles.listItemBody}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>
                        {a.title}
                      </Text>

                    </View>
                    <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{a.student}</Text>
                    <Text style={[styles.listItemDate, { color: colors.textSecondary }]}>{a.date}</Text>
                  </View>
                </View>

                <View style={styles.listItemRight}>
                  <TouchableOpacity
                    onPress={() =>
                      setApplications((prev) =>
                        prev.map((it) =>
                          it.id === a.id
                            ? { ...it, bookmarked: !it.bookmarked }
                            : it
                        )
                      )
                    }
                    style={styles.bookmarkBtn}
                  >
                    <Ionicons
                      name={a.bookmarked ? "bookmark" : "bookmark-outline"}
                      size={20}
                      color={a.bookmarked ? "#2196F3" : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.listItemFooter, { borderTopColor: isDark ? colors.border : "#f5f5f5" }]}>
                <View
                  style={[styles.statusBadge, getStatusBadgeStyle(a.status, isDark)]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(a.status) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: getStatusColor(a.status) },
                    ]}
                  >
                    {a.status}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    router.push("/(dashboard)/reviewer/application-details")
                  }
                  style={[styles.viewBtn, { backgroundColor: isDark ? colors.surface : "#E3F2FD" }]}
                >
                  <Text style={[styles.viewBtnText, { color: isDark ? colors.primary : "#2196F3" }]}>Review</Text>
                  <Ionicons name="arrow-forward" size={14} color={isDark ? colors.primary : "#2196F3"} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}

          {visible.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? colors.surface : "#f5f5f5" }]}>
                <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No applications found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Try adjusting your search or filters
              </Text>
            </View>
          )}
        </View>

        {/* Enhanced Pagination */}
        {visible.length < filtered.length && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => setPage((p) => p + 1)}
          >
            <Text style={styles.loadMoreText}>
              Load More ({filtered.length - visible.length} remaining)
            </Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function getStatusIcon(status: AppItem["status"]) {
  switch (status) {
    case "Approved":
      return "checkmark-circle";
    case "Rejected":
      return "close-circle";
    default:
      return "time";
  }
}

function getStatusColor(status: AppItem["status"]) {
  switch (status) {
    case "Approved":
      return "#4CAF50";
    case "Rejected":
      return "#F44336";
    default:
      return "#FF9800";
  }
}

function getStatusIconStyle(status: AppItem["status"], isDark: boolean) {
  const opacity = isDark ? 0.2 : 1;
  switch (status) {
    case "Approved":
      return { backgroundColor: isDark ? `rgba(76, 175, 80, ${opacity})` : "#E8F5E9" };
    case "Rejected":
      return { backgroundColor: isDark ? `rgba(244, 67, 54, ${opacity})` : "#FFEBEE" };
    default:
      return { backgroundColor: isDark ? `rgba(255, 152, 0, ${opacity})` : "#FFF3E0" };
  }
}

function getStatusBadgeStyle(status: AppItem["status"], isDark: boolean) {
  const opacity = isDark ? 0.2 : 1;
  switch (status) {
    case "Approved":
      return { backgroundColor: isDark ? `rgba(76, 175, 80, ${opacity})` : "#E8F5E9" };
    case "Rejected":
      return { backgroundColor: isDark ? `rgba(244, 67, 54, ${opacity})` : "#FFEBEE" };
    default:
      return { backgroundColor: isDark ? `rgba(255, 152, 0, ${opacity})` : "#FFF3E0" };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    fontWeight: "500",
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F44336",
    borderWidth: 2,
    borderColor: "#fff",
  },
  statsContainer: {
    marginHorizontal: -20,
    marginBottom: 8,
  },
  statsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    minWidth: 100,
    gap: 4,
  },
  statCardTotal: {
    backgroundColor: "#2196F3",
  },
  statCardPending: {
    backgroundColor: "#FFF3E0",
  },
  statCardApproved: {
    backgroundColor: "#E8F5E9",
  },
  statCardRejected: {
    backgroundColor: "#FFEBEE",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  content: {
    padding: 20,
    gap: 16,
  },
  searchContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  searchRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    color: "#1a1a1a",
    fontSize: 15,
    fontWeight: "500",
  },
  filterIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 4,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
  },
  tabBtnActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  tabTextActive: { color: "#fff" },
  tabBadge: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 24,
    alignItems: "center",
  },
  tabBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
  },
  tabBadgeTextActive: {
    color: "#fff",
  },
  cardList: {
    gap: 12,
  },
  listItem: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
    overflow: "hidden",
  },
  listItemLast: {
    marginBottom: 8,
  },
  priorityIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#F44336",
  },
  listItemMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  listItemLeft: {
    flexDirection: "row",
    flex: 1,
    gap: 12,
  },
  listItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  listItemBody: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.3,
    flex: 1,
  },
  listItemSub: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  listItemDate: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  listItemRight: {
    marginLeft: 8,
  },
  bookmarkBtn: {
    padding: 8,
    borderRadius: 8,
  },
  listItemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#E3F2FD",
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2196F3",
  },
  emptyState: {
    padding: 48,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    borderStyle: "dashed",
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "center",
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: "#2196F3",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loadMoreText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
