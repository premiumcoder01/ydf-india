import { AppHeader } from "@/components";
import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import { bookmarkScholarship, getBookmarkedScholarships } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Helper function to strip HTML tags
const stripHtml = (html: string): string => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
};

// Helper function to get category color
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    Gujarat: "#4CAF50",
    Bihar: "#2196F3",
    "All India": "#FF9800",
    Punjab: "#9C27B0",
    Rajasthan: "#E91E63",
    Maharashtra: "#00BCD4",
    Delhi: "#795548",
    Sikar: "#607D8B",
  };
  return colors[category] || "#666";
};

export default function BookmarkedScholarshipsScreen() {
  const { isDark, colors } = useTheme();
  const [apiScholarships, setApiScholarships] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<{
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [bookmarking, setBookmarking] = useState<Record<number, boolean>>({});
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");
  const inset = useSafeAreaInsets();

  // Fetch bookmarked scholarships from API
  useEffect(() => {
    const fetchBookmarkedScholarships = async () => {
      try {
        setLoading(true);
        // Get token from AsyncStorage
        const authDataString = await AsyncStorage.getItem("authData");
        if (!authDataString) {
          console.log("No auth data found");
          setLoading(false);
          return;
        }

        const authData = JSON.parse(authDataString);
        const token = authData?.token;

        if (!token) {
          console.log("No token found in auth data");
          setLoading(false);
          return;
        }

        // Call getBookmarkedScholarships API
        const response = await getBookmarkedScholarships(token, {
          page: page,
          per_page: 20,
        });

        console.log("Bookmarked Scholarships Response:", JSON.stringify(response, null, 2));

        if (response.success && response.data) {
          // API response structure from user: { success: true, data: [...], pagination: {...} }
          // But our wrapper returns: { success: true, data: <api_response> }
          // So response.data contains the API response which has both data array and pagination
          const apiResponse = response.data;

          // Extract scholarships array
          // Check if apiResponse is directly an array, or has a data property
          const scholarshipsList = Array.isArray(apiResponse)
            ? apiResponse
            : apiResponse?.data || [];

          // Store scholarships
          if (page === 1) {
            setApiScholarships(scholarshipsList);
          } else {
            // Append for pagination
            setApiScholarships((prev) => [...prev, ...scholarshipsList]);
          }

          // Store pagination info
          // Pagination is at the same level as data in the API response
          if (apiResponse?.pagination) {
            setPagination(apiResponse.pagination);
          } else if (!Array.isArray(apiResponse) && (response as any).pagination) {
            // Fallback: check if pagination is at response level
            setPagination((response as any).pagination);
          }
        } else {
          console.log("API call failed:", response.error || response.message);
          if (page === 1) {
            setApiScholarships([]);
          }
        }
      } catch (error) {
        console.error("Error fetching bookmarked scholarships:", error);
        if (page === 1) {
          setApiScholarships([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarkedScholarships();
  }, [page]);

  // Show toast helper
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  }, []);

  // Handle bookmark/unbookmark with API
  const toggleBookmark = useCallback(async (id: number, currentBookmarkState: boolean) => {
    if (bookmarking[id]) return;

    const newBookmarkState = !currentBookmarkState;

    // Optimistic UI update - update immediately
    setApiScholarships((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, bookmarked: newBookmarkState } : item
      )
    );

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      setBookmarking((prev) => ({ ...prev, [id]: true }));

      // Get token from AsyncStorage
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) {
        // Revert on error
        setApiScholarships((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, bookmarked: !newBookmarkState } : item
          )
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast("Authentication failed. Please login again.", "error");
        return;
      }

      const authData = JSON.parse(authDataString);
      const token = authData?.token;

      if (!token) {
        // Revert on error
        setApiScholarships((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, bookmarked: !newBookmarkState } : item
          )
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast("Authentication failed. Please login again.", "error");
        return;
      }

      // Call bookmark API
      const action = newBookmarkState ? "bookmark" : "unbookmark";
      const response = await bookmarkScholarship(token, id, action);

      if (response.success) {
        // Success haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Show success toast
        showToast(
          newBookmarkState
            ? "Scholarship bookmarked successfully!"
            : "Scholarship unbookmarked successfully!",
          "success"
        );

        // If unbookmarked, remove from list after a short delay
        if (!newBookmarkState) {
          setTimeout(() => {
            setApiScholarships((prev) => prev.filter((item) => item.id !== id));
            // Update pagination total
            if (pagination) {
              setPagination((prev) => prev ? { ...prev, total: prev.total - 1 } : null);
            }
          }, 500);
        }
      } else {
        // Revert on error
        setApiScholarships((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, bookmarked: !newBookmarkState } : item
          )
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(
          response.error || response.message || "Failed to update bookmark",
          "error"
        );
        console.error("Bookmark error:", response.error);
      }
    } catch (err: any) {
      // Revert on error
      setApiScholarships((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, bookmarked: !newBookmarkState } : item
        )
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("Network error. Please try again.", "error");
      console.error("Bookmark error:", err);
    } finally {
      setBookmarking((prev) => ({ ...prev, [id]: false }));
    }
  }, [bookmarking, showToast, pagination]);

  const loadMore = useCallback(() => {
    if (
      pagination &&
      page < pagination.total_pages &&
      !loading &&
      apiScholarships.length > 0
    ) {
      setPage((p) => p + 1);
    }
  }, [pagination, page, loading, apiScholarships.length]);

  const getDaysRemaining = (deadline: string | null, isExpired: boolean = false) => {
    if (isExpired) return { text: "Expired", color: "#F44336" };
    if (!deadline) return { text: "Open", color: "#4CAF50" };

    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Expired", color: "#F44336" };
    if (diffDays === 0) return { text: "Today", color: "#FF9800" };
    if (diffDays === 1) return { text: "1 day left", color: "#FF9800" };
    if (diffDays <= 7)
      return { text: `${diffDays} days left`, color: "#FF9800" };
    return { text: `${diffDays} days left`, color: isDark ? colors.textSecondary : "#666" };
  };

  const Header = (
    <View style={{ marginBottom: 20 }}>
      <AppHeader
        title="Saved Scholarships"
        onBack={() => router.back()}
      />
      <View style={[styles.headerInfo, { backgroundColor: isDark ? colors.card : "#fff", borderBottomColor: colors.border }]}>
        <Ionicons name="bookmark" size={20} color="#FFB400" />
        <Text style={[styles.headerInfoText, { color: colors.textSecondary }]}>
          {apiScholarships.length} {apiScholarships.length === 1 ? "scholarship" : "scholarships"} saved
        </Text>
      </View>
    </View>
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const categoryColor = getCategoryColor(item.category || "");
      const deadline = item.end_date || item.start_date;
      const daysInfo = getDaysRemaining(deadline, item.expired);
      const description = stripHtml(item.description || "");
      const isBookmarked = item.bookmarked !== false;
      const isExpired = item.expired || daysInfo.text === "Expired" || description.toLowerCase().includes("applications closed") || description.toLowerCase().includes("!! applications closed !!");

      return (
        <View
          style={[
            styles.scholarshipCard,
            { borderLeftColor: categoryColor, backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 },
          ]}
        >
          <View style={styles.scholarshipHeader}>
            <View style={styles.scholarshipInfo}>
              <View style={styles.titleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scholarshipTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {isExpired && (
                    <View style={[styles.categoryBadge, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
                      <Text style={[styles.categoryBadgeText, { color: '#F44336' }]}>Expired</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: `${categoryColor}15` },
                    ]}
                  >
                    <Text
                      style={[styles.categoryBadgeText, { color: categoryColor }]}
                    >
                      {item.category || "General"}
                    </Text>
                  </View>
                </View>
              </View>
              {description ? (
                <Text style={[styles.scholarshipDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {description}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={[styles.amountRow, { borderColor: colors.border }]}>
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Application Period</Text>
              <Text style={[styles.amountText, { color: categoryColor }]}>
                {item.start_date
                  ? new Date(item.start_date).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                  : "Open"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => toggleBookmark(item.id, isBookmarked)}
              disabled={bookmarking[item.id]}
              style={styles.bookmarkBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name="bookmark"
                size={24}
                color="#FFB400"
              />
            </TouchableOpacity>
          </View>

          {item.bookmarked_at && (
            <View style={[styles.bookmarkedInfo, { backgroundColor: isDark ? "rgba(255, 180, 0, 0.1)" : "#FFF9E6" }]}>
              <Ionicons name="time-outline" size={14} color={isDark ? colors.textSecondary : "#999"} />
              <Text style={[styles.bookmarkedText, { color: colors.textSecondary }]}>
                Bookmarked on {new Date(item.bookmarked_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
          )}

          <View style={styles.scholarshipDetails}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: isDark ? colors.surface : "#f8f8f8" }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Deadline</Text>
                <View style={styles.deadlineRow}>
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {deadline
                      ? new Date(deadline).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                      : "No deadline"}
                  </Text>
                  {deadline && (
                    <Text
                      style={[styles.daysRemaining, { color: daysInfo.color }]}
                    >
                      • {daysInfo.text}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {item.category && (
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: isDark ? colors.surface : "#f8f8f8" }]}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>{item.category}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(dashboard)/student/student-scholarship-details",
                  params: { scholarshipId: item.id },
                })
              }
              style={[styles.viewBtn, { backgroundColor: isDark ? colors.surface : "#f8f8f8", borderColor: colors.border }]}
            >
              <Ionicons name="eye-outline" size={18} color={isDark ? colors.text : "#333"} />
              <Text style={[styles.viewBtnText, { color: colors.text }]}>Details</Text>
            </TouchableOpacity>

            {item.has_applied ? (
              <View
                style={[
                  styles.applyBtn,
                  { backgroundColor: isDark ? "rgba(76, 175, 80, 0.2)" : "#E8F5E9", borderWidth: 1, borderColor: "#4CAF50" }
                ]}
              >
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                <Text style={[styles.applyBtnText, { color: "#4CAF50" }]}>Applied</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/(dashboard)/student/student-apply-form",
                    params: { scholarshipId: item.id },
                  })
                }
                disabled={isExpired}
                style={[
                  styles.applyBtn,
                  { backgroundColor: categoryColor },
                  isExpired && { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#eee", opacity: 0.8 }
                ]}
              >
                <Ionicons
                  name={isExpired ? "close-circle-outline" : "paper-plane-outline"}
                  size={18}
                  color={isExpired ? (isDark ? colors.textSecondary : "#999") : "#fff"}
                />
                <Text style={[styles.applyBtnText, isExpired && { color: isDark ? colors.textSecondary : "#999" }]}>
                  {isExpired ? "Expired" : "Apply Now"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [bookmarking, toggleBookmark, colors, isDark]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? colors.background : "#fff"} />
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#FFF8E1"]}
        style={styles.background}
        locations={[0, 0.4, 1]}
      />
      <FlatList
        data={apiScholarships}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={Header}
        stickyHeaderIndices={[0]}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        refreshing={loading && page === 1}
        onRefresh={() => {
          setPage(1);
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={64} color={isDark ? colors.textSecondary : "#ccc"} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              {loading ? "Loading bookmarked scholarships..." : "No bookmarked scholarships"}
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
              {loading
                ? "Please wait..."
                : "Start bookmarking scholarships to see them here"}
            </Text>
            {!loading && (
              <TouchableOpacity
                onPress={() => router.push("/(dashboard)/student/student-scholarship-listing")}
                style={styles.browseButton}
              >
                <Ionicons name="search" size={18} color="#fff" />
                <Text style={styles.browseButtonText}>Browse Scholarships</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          loading && page > 1 ? (
            <View style={styles.loadingFooter}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading more...</Text>
            </View>
          ) : null
        }
      />

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
        duration={3000}
      />
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
  listContent: {
    paddingBottom: 40,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerInfoText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scholarshipCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  scholarshipHeader: {
    marginBottom: 16,
  },
  scholarshipInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 8,
  },
  scholarshipTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scholarshipDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  amountContainer: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountText: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
  },
  bookmarkBtn: {
    padding: 8,
  },
  bookmarkedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bookmarkedText: {
    fontSize: 12,
    fontWeight: "500",
  },
  scholarshipDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 14,
    fontWeight: "500",
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  daysRemaining: {
    fontSize: 13,
    fontWeight: "600",
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  viewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  viewBtnText: {
    fontWeight: "700",
    fontSize: 15,
  },
  applyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  applyBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  browseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#4CAF50",
  },
  browseButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
  },
});

