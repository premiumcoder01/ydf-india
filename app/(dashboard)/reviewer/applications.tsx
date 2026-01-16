import { useTheme } from "@/context/ThemeContext";
import { getReviewerApplications } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

// API Response types
type ApplicationUser = {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  fullname: string;
};

type ApplicationAttachment = {
  id: number;
  filename: string;
  filesize: number;
  mimetype: string;
  fileurl: string;
};

type AppItem = {
  id: number;
  user: ApplicationUser;
  application_text: string | null;
  status: "new" | "approved" | "waitlisted" | "rejected" | null;
  priority: number;
  assigned_reviewer_id: number | null;
  is_bookmarked: boolean;
  attachments: ApplicationAttachment[];
  timecreated: string;
  timemodified: string;
};

type PaginationData = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

const STATUS_TABS: Array<"All" | "new" | "approved" | "waitlisted" | "rejected"> = [
  "All",
  "new",
  "approved",
  "waitlisted",
  "rejected",
];

export default function ReviewerApplicationsScreen() {
  const inset = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] =
    useState<(typeof STATUS_TABS)[number]>("All");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // API state
  const [applications, setApplications] = useState<AppItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch applications from API
  const fetchApplications = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Get token from AsyncStorage
      const authDataStr = await AsyncStorage.getItem("authData");
      const authData = authDataStr ? JSON.parse(authDataStr) : null;
      const token = authData?.token;

      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }

      // For now, using a hardcoded scholarship_id
      // TODO: Get this from route params or context
      const scholarshipId = 51;

      // Prepare API parameters
      const apiParams: {
        status?: "new" | "approved" | "waitlisted" | "rejected";
        page: number;
        per_page: number;
      } = {
        page: 1,
        per_page: pageSize,
      };

      // Add status filter if not "All"
      if (activeTab !== "All") {
        apiParams.status = activeTab;
      }

      // Call API
      const response = await getReviewerApplications(token, scholarshipId, apiParams);
      console.log(response.data.applications[0]);

      if (response.success && response.data) {
        setApplications(response.data.applications || []);
        setPagination(response.data.pagination || null);
      } else {
        throw new Error(response.error || "Failed to fetch applications");
      }
    } catch (err: any) {
      console.error("Error fetching applications:", err);
      setError(err.message || "Failed to load applications");
      Alert.alert("Error", err.message || "Failed to load applications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch applications on mount and when activeTab changes
  useEffect(() => {
    fetchApplications();
  }, [activeTab]);

  // Toggle bookmark
  const toggleBookmark = (applicationId: number) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? { ...app, is_bookmarked: !app.is_bookmarked }
          : app
      )
    );
    // TODO: Call API to update bookmark status
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = applications.filter(
      (a) =>
        !q ||
        a.user.fullname.toLowerCase().includes(q) ||
        a.user.email.toLowerCase().includes(q) ||
        (a.application_text && a.application_text.toLowerCase().includes(q))
    );
    return items;
  }, [applications, query]);

  const visible = useMemo(
    () => filtered.slice(0, page * pageSize),
    [filtered, page]
  );

  const stats = useMemo(() => {
    return {
      total: applications.length,
      new: applications.filter((a) => a.status === "new").length,
      approved: applications.filter((a) => a.status === "approved").length,
      waitlisted: applications.filter((a) => a.status === "waitlisted").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
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
        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading applications...
            </Text>
          </View>
        )}

        {/* Content - Only show when not loading */}
        {!loading && (
          <>
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
                    : tab === "new"
                      ? stats.new
                      : tab === "approved"
                        ? stats.approved
                        : tab === "waitlisted"
                          ? stats.waitlisted
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
                      {tab === "All" ? tab : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                  {a.priority >= 7 && (
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
                          <Text style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={2}>
                            {a.application_text && a.application_text.trim()
                              ? a.application_text.substring(0, 60) + (a.application_text.length > 60 ? "..." : "")
                              : "No application text provided"}
                          </Text>

                        </View>
                        <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{a.user.fullname}</Text>
                        <Text style={[styles.listItemDate, { color: colors.textSecondary }]}>{new Date(a.timecreated).toLocaleDateString()}</Text>
                      </View>
                    </View>

                    <View style={styles.listItemRight}>
                      <TouchableOpacity
                        onPress={() => toggleBookmark(a.id)}
                        style={styles.bookmarkBtn}
                      >
                        <Ionicons
                          name={a.is_bookmarked ? "bookmark" : "bookmark-outline"}
                          size={20}
                          color={a.is_bookmarked ? "#2196F3" : colors.textSecondary}
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
                        {a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1) : "New"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/(dashboard)/reviewer/application-details",
                          params: { id: a.id }
                        })
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

function getStatusIcon(status: AppItem["status"]) {
  if (!status) return "document-text";
  switch (status) {
    case "approved":
      return "checkmark-circle";
    case "rejected":
      return "close-circle";
    case "waitlisted":
      return "time";
    default:
      return "document-text";
  }
}

function getStatusColor(status: AppItem["status"]) {
  if (!status) return "#2196F3";
  switch (status) {
    case "approved":
      return "#4CAF50";
    case "rejected":
      return "#F44336";
    case "waitlisted":
      return "#FF9800";
    default:
      return "#2196F3";
  }
}

function getStatusIconStyle(status: AppItem["status"], isDark: boolean) {
  const opacity = isDark ? 0.2 : 1;
  if (!status) return { backgroundColor: isDark ? `rgba(33, 150, 243, ${opacity})` : "#E3F2FD" };
  switch (status) {
    case "approved":
      return { backgroundColor: isDark ? `rgba(76, 175, 80, ${opacity})` : "#E8F5E9" };
    case "rejected":
      return { backgroundColor: isDark ? `rgba(244, 67, 54, ${opacity})` : "#FFEBEE" };
    case "waitlisted":
      return { backgroundColor: isDark ? `rgba(255, 152, 0, ${opacity})` : "#FFF3E0" };
    default:
      return { backgroundColor: isDark ? `rgba(33, 150, 243, ${opacity})` : "#E3F2FD" };
  }
}

function getStatusBadgeStyle(status: AppItem["status"], isDark: boolean) {
  const opacity = isDark ? 0.2 : 1;
  if (!status) return { backgroundColor: isDark ? `rgba(33, 150, 243, ${opacity})` : "#E3F2FD" };
  switch (status) {
    case "approved":
      return { backgroundColor: isDark ? `rgba(76, 175, 80, ${opacity})` : "#E8F5E9" };
    case "rejected":
      return { backgroundColor: isDark ? `rgba(244, 67, 54, ${opacity})` : "#FFEBEE" };
    case "waitlisted":
      return { backgroundColor: isDark ? `rgba(255, 152, 0, ${opacity})` : "#FFF3E0" };
    default:
      return { backgroundColor: isDark ? `rgba(33, 150, 243, ${opacity})` : "#E3F2FD" };
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
  },
});
