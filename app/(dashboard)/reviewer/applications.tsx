import { useTheme } from "@/context/ThemeContext";
import { getReviewerApplications, getReviewerSchemes } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
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

type Scholarship = {
  id: number;
  title: string;
  category: string;
  description: string;
  start_date: string;
  end_date: string;
};

type AppItem = {
  id: number;
  user: ApplicationUser;
  application_text: string | null;
  status: "new" | "approved" | "waitlisted" | "rejected" | "not_applied" | null;
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

const STATUS_TABS: Array<"All" | "new" | "approved" | "waitlisted" | "rejected" | "not_applied"> = [
  "All",
  "new",
  "approved",
  "waitlisted",
  "rejected",
  "not_applied",
];

export default function ReviewerApplicationsScreen() {
  const inset = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] =
    useState<(typeof STATUS_TABS)[number]>("All");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // View state
  const [viewMode, setViewMode] = useState<"scholarships" | "applications">("scholarships");
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);

  // API state
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [applications, setApplications] = useState<AppItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch scholarships
  // Fetch schemes
  const fetchScholarships = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const authDataStr = await AsyncStorage.getItem("authData");
      const authData = authDataStr ? JSON.parse(authDataStr) : null;
      const token = authData?.token;

      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }

      // Updated to use the new reviewer API
      const response = await getReviewerSchemes(token, {
        page: 1,
        per_page: 200
      });

      if (response.success && response.data) {
        // Handle "schemes" array in response
        const list = Array.isArray(response.data.schemes)
          ? response.data.schemes
          : response.data.data || [];

        // Map to Scholarship type if needed, though structure seems similar
        // Based on the image, the fields match nicely (id, name, shortname, category, etc.)
        // We map 'name' to 'title' to match our local state
        const mappedList = list.map((scheme: any) => ({
          ...scheme,
          title: scheme.name || scheme.title,
        }));
        setScholarships(mappedList);
      } else {
        throw new Error(response.error || "Failed to fetch schemes");
      }
    } catch (err: any) {
      console.error("Error fetching schemes:", err);
      setError(err.message || "Failed to load schemes");
      Alert.alert("Error", err.message || "Failed to load schemes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch applications from API
  const fetchApplications = async (isRefresh = false) => {
    if (!selectedScholarship) return;
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const authDataStr = await AsyncStorage.getItem("authData");
      const authData = authDataStr ? JSON.parse(authDataStr) : null;
      const token = authData?.token;
      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }
      const scholarshipId = selectedScholarship.id;
      const apiParams: {
        status: "new" | "approved" | "waitlisted" | "rejected" | "not_applied" | "";
        page: number;
        per_page: number;
      } = {
        page: 1,
        per_page: pageSize,
        status: activeTab === "All" ? "" : activeTab,
      };
      const response = await getReviewerApplications(token, scholarshipId, apiParams);
      if (response.success && response.data) {
        const apps = response.data.applications || [];
        setApplications(apps);
        setPagination(response.data.pagination || null);
      } else {
        throw new Error(response.error || "Failed to fetch applications");
      }
    } catch (err: any) {
      console.log("Error fetching applications:", err);
      setError(err.message || "Failed to load applications");
      Alert.alert("Error", err.message || "Failed to load applications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchScholarships();
  }, []);

  // Fetch applications when entering applications view
  useEffect(() => {
    if (viewMode === "applications" && selectedScholarship) {
      fetchApplications();
    }
  }, [viewMode, selectedScholarship, activeTab]);

  const [showFilterModal, setShowFilterModal] = useState(false);

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
    if (viewMode === "scholarships") {
      const q = query.trim().toLowerCase();
      return scholarships.filter(
        (s) =>
          !q ||
          s.title.toLowerCase().includes(q) ||
          (s.category && s.category.toLowerCase().includes(q))
      );
    }

    const q = query.trim().toLowerCase();
    let items = applications.filter(
      (a) =>
        !q ||
        a.user.fullname.toLowerCase().includes(q) ||
        a.user.email.toLowerCase().includes(q) ||
        (a.application_text && a.application_text.toLowerCase().includes(q))
    );
    return items;
  }, [applications, scholarships, query, viewMode]);

  const visible = useMemo(
    () => filtered.slice(0, page * pageSize),
    [filtered, page]
  );

  const stats = useMemo(() => {
    return {
      total: viewMode === "applications" ? applications.length : scholarships.length,
      new: applications.filter((a) => a.status === "new").length,
      approved: applications.filter((a) => a.status === "approved").length,
      waitlisted: applications.filter((a) => a.status === "waitlisted").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
      not_applied: applications.filter((a) => a.status === "not_applied").length,
    };
  }, [applications, scholarships, viewMode]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title={viewMode === "scholarships" ? "Schemes" : "Applications"}
        subtitle={
          viewMode === "scholarships"
            ? "Select a scheme to review applications"
            : `${selectedScholarship?.title || "Scheme"} • ${filtered.length} applications`
        }
        showBackButton={true}
        onBackPress={() => {
          if (viewMode === "applications") {
            setViewMode("scholarships");
            setSelectedScholarship(null);
            setApplications([]);
            setQuery("");
          } else {
            router.back();
          }
        }}
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
              {viewMode === "scholarships" ? "Loading schemes..." : "Loading applications..."}
            </Text>
          </View>
        )}

        {/* Content - Only show when not loading */}
        {!loading && (
          <>
            {/* Enhanced Search Bar with Filter Button */}
            <View style={styles.searchContainer}>
              <View style={[
                styles.searchRow,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#fff",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e0e0e0"
                }
              ]}>
                <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  placeholder={viewMode === "scholarships" ? "Search schemes..." : "Search applications..."}
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

              {/* Filter Button - Only for Applications */}
              {viewMode === "applications" && (
                <TouchableOpacity
                  style={[
                    styles.filterIconBtn,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#fff",
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e0e0e0",
                      borderWidth: 1
                    },
                    activeTab !== "All" && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setShowFilterModal(true)}
                >
                  <Ionicons
                    name="filter"
                    size={20}
                    color={activeTab !== "All" ? "#fff" : colors.text}
                  />
                  {activeTab !== "All" && (
                    <View style={styles.filterActiveDot} />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Modal */}
            <Modal
              visible={showFilterModal}
              transparent
              animationType="fade"
              onRequestClose={() => setShowFilterModal(false)}
            >
              <View style={styles.modalBackdrop}>
                <View style={[styles.filterModal, { backgroundColor: colors.card }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Applications</Text>
                    <TouchableOpacity
                      onPress={() => setShowFilterModal(false)}
                      style={[styles.modalCloseBtn, { backgroundColor: isDark ? colors.surface : "#F5F5F5" }]}
                    >
                      <Ionicons name="close" size={20} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.filterOptions}>
                    {STATUS_TABS.map((tab) => {
                      const isActive = activeTab === tab;
                      return (
                        <TouchableOpacity
                          key={tab}
                          style={[
                            styles.filterOption,
                            { borderColor: colors.border },
                            isActive && { backgroundColor: isDark ? "rgba(33, 150, 243, 0.15)" : "#E3F2FD", borderColor: colors.primary }
                          ]}
                          onPress={() => {
                            setActiveTab(tab);
                            setPage(1);
                            setShowFilterModal(false);
                          }}
                        >
                          <View style={styles.filterOptionLeft}>
                            <View style={[
                              styles.filterOptionIcon,
                              { backgroundColor: isActive ? colors.primary : (isDark ? colors.surface : "#F5F5F5") }
                            ]}>
                              <Ionicons
                                name={
                                  tab === "All" ? "apps" :
                                    tab === "new" ? "document-text" :
                                      tab === "approved" ? "checkmark-circle" :
                                        tab === "waitlisted" ? "time" :
                                          tab === "rejected" ? "close-circle" :
                                            "document"
                                }
                                size={20}
                                color={isActive ? "#fff" : colors.textSecondary}
                              />
                            </View>
                            <Text style={[
                              styles.filterOptionText,
                              { color: colors.text },
                              isActive && { fontWeight: "700", color: colors.primary }
                            ]}>
                              {tab === "All"
                                ? "All Applications"
                                : tab === "not_applied"
                                  ? "Not Applied"
                                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                          </View>
                          {isActive && (
                            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* List */}
            <View style={styles.cardList}>
              {viewMode === "scholarships" ? (
                // Scholarships List
                (filtered as Scholarship[]).map((s, index) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.listItem,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff",
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "#f0f0f0",
                        borderWidth: 1
                      },
                      index === (filtered as Scholarship[]).length - 1 && styles.listItemLast,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedScholarship(s);
                      setViewMode("applications");
                      setQuery("");
                    }}
                  >
                    <View style={styles.listItemMain}>
                      <View style={styles.listItemLeft}>
                        <View
                          style={[
                            styles.listItemIcon,
                            { backgroundColor: isDark ? "rgba(33, 150, 243, 0.15)" : "#E3F2FD" }
                          ]}
                        >
                          <Ionicons
                            name="school"
                            size={22}
                            color="#2196F3"
                          />
                        </View>
                        <View style={styles.listItemBody}>
                          <Text style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={2}>
                            {s.title}
                          </Text>
                          <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>
                            {s.category || "General"}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                // Applications List
                (visible as AppItem[]).map((a, index) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[
                      styles.listItem,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      index === (visible as AppItem[]).length - 1 && styles.listItemLast,
                    ]}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: "/(dashboard)/reviewer/application-details",
                        params: { id: a.id }
                      })
                    }
                  >
                    {/* Priority Indicator */}
                    {a.priority >= 7 && (
                      <View style={styles.priorityIndicator} />
                    )}

                    {/* Header Section with User Info */}
                    <View style={styles.cardHeader}>
                      <View style={styles.userSection}>
                        {/* User Avatar */}
                        <View style={[styles.userAvatar, { backgroundColor: isDark ? "rgba(33, 150, 243, 0.2)" : "#E3F2FD" }]}>
                          <Text style={[styles.userAvatarText, { color: "#2196F3" }]}>
                            {a.user.firstname.charAt(0)}{a.user.lastname.charAt(0)}
                          </Text>
                        </View>

                        {/* User Details */}
                        <View style={styles.userInfo}>
                          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                            {a.user.fullname}
                          </Text>
                          <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                            {a.user.email}
                          </Text>
                        </View>
                      </View>

                      {/* Bookmark Button */}
                      {/* <TouchableOpacity
                        onPress={() => toggleBookmark(a.id)}
                        style={[styles.bookmarkBtn, { backgroundColor: isDark ? colors.surface : "#F5F7FA" }]}
                      >
                        <Ionicons
                          name={a.is_bookmarked ? "bookmark" : "bookmark-outline"}
                          size={20}
                          color={a.is_bookmarked ? "#2196F3" : colors.textSecondary}
                        />
                      </TouchableOpacity> */}
                    </View>

                    {/* Application Text */}
                    {a.application_text && a.application_text.trim() ? (
                      <Text style={[styles.applicationText, { color: colors.text }]} numberOfLines={2}>
                        {a.application_text}
                      </Text>
                    ) : (
                      <Text style={[styles.applicationTextEmpty, { color: colors.textSecondary }]}>
                        No application text provided
                      </Text>
                    )}

                    {/* Metadata Row */}
                    <View style={styles.metadataRow}>
                      <View style={styles.metadataItem}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                          {new Date(a.timecreated).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Text>
                      </View>

                      {a.attachments && a.attachments.length > 0 && (
                        <View style={styles.metadataItem}>
                          <Ionicons name="attach-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                            {a.attachments.length} {a.attachments.length === 1 ? 'file' : 'files'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Footer with Status and Action */}
                    <View style={styles.cardFooter}>
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
                        style={[styles.reviewBtn, { backgroundColor: "#2196F3" }]}
                      >
                        <Text style={styles.reviewBtnText}>Review</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}

              {(viewMode === "scholarships" ? filtered.length === 0 : visible.length === 0) && (
                <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? colors.surface : "#f5f5f5" }]}>
                    <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {viewMode === "scholarships" ? "No schemes found" : "No applications found"}
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Try adjusting your search or filters
                  </Text>
                </View>
              )}
            </View>

            {/* Enhanced Pagination */}
            {viewMode === "applications" && visible.length < filtered.length && (
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
    </View >
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
    case "not_applied":
      return "#9E9E9E";
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
    case "not_applied":
      return { backgroundColor: isDark ? `rgba(158, 158, 158, ${opacity})` : "#F5F5F5" };
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
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterActiveDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  // Filter Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  filterModal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  filterOptions: {
    padding: 16,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  filterOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  filterOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: "600",
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
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
    gap: 14,
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
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2196F3",
    letterSpacing: 0.5,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  // Scholarship card styles (used in scholarships list)
  listItemMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listItemLeft: {
    flexDirection: "row",
    flex: 1,
    gap: 12,
  },
  listItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  listItemBody: {
    flex: 1,
    gap: 4,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.3,
  },
  listItemSub: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  bookmarkBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7FA",
  },
  applicationText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  applicationTextEmpty: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#999",
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metadataText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#2196F3",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
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
