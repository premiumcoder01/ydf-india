import { AppHeader, SearchBar } from "@/components";
import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import { bookmarkScholarship, getAllScholarships } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const sortOptions = ["Latest", "Ending Soon"] as const;

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

export default function ScholarshipListingScreen() {
  const { isDark, colors } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSort, setSelectedSort] =
    useState<(typeof sortOptions)[number]>("Latest");

  const [eligibility, setEligibility] = useState("");
  const [bookmarks, setBookmarks] = useState<Record<number, boolean>>({});
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [apiScholarships, setApiScholarships] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<{
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarking, setBookmarking] = useState<Record<number, boolean>>({});
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");
  const inset = useSafeAreaInsets();

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(query);
      setPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch scholarships from API
  const fetchScholarships = useCallback(async () => {
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

      // Call getAllScholarships API with search query
      const response = await getAllScholarships(token, {
        search: searchQuery || undefined,
        page: page,
        per_page: 100,
      });
      if (response.success && response.data) {
        const apiData = response.data.data || response.data;

        // Extract scholarships array
        const scholarshipsList = Array.isArray(apiData)
          ? apiData
          : apiData?.data || apiData?.scholarships || [];

        if (page === 1) {
          setApiScholarships(scholarshipsList);
          const bookmarksMap: Record<number, boolean> = {};
          scholarshipsList.forEach((scholarship: any) => {
            if (scholarship.bookmarked !== undefined) {
              bookmarksMap[scholarship.id] = scholarship.bookmarked;
            }
          });
          setBookmarks(bookmarksMap);
        } else {
          setApiScholarships((prev) => [...prev, ...scholarshipsList]);
          const newBookmarks: Record<number, boolean> = {};
          scholarshipsList.forEach((scholarship: any) => {
            if (scholarship.bookmarked !== undefined) {
              newBookmarks[scholarship.id] = scholarship.bookmarked;
            }
          });
          setBookmarks((prev) => ({ ...prev, ...newBookmarks }));
        }

        // Store pagination info
        if (apiData?.pagination) {
          setPagination(apiData.pagination);
        }
      } else {
        console.log("API call failed:", response.error || response.message);
        if (page === 1) {
          setApiScholarships([]);
        }
      }
    } catch (error) {
      console.error("Error fetching scholarships:", error);
      if (page === 1) {
        setApiScholarships([]);
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Reset to page 1 and fetch fresh data
      setPage(1);
      fetchScholarships();
    }, [fetchScholarships])
  );

  // Fetch when searchQuery or page changes
  useEffect(() => {
    fetchScholarships();
  }, [searchQuery, page]);


  // Extract unique categories from API data
  const categories = useMemo(() => {
    const cats = new Set<string>(["All"]);
    apiScholarships.forEach((scholarship) => {
      if (scholarship.category) {
        cats.add(scholarship.category);
      }
    });
    return Array.from(cats);
  }, [apiScholarships]);

  // Filter and sort API data
  const data = useMemo(() => {
    if (apiScholarships.length === 0) return [];

    let list = [...apiScholarships];

    // Client-side filtering
    list = list.filter((s) => {
      // Category filter
      const catMatch =
        selectedCategory === "All" || s.category === selectedCategory;

      const deadlineMatch = true; // Removed deadline filter

      // Eligibility filter (search in description)
      const descriptionText = stripHtml(s.description || "").toLowerCase();
      const eligMatch =
        !eligibility ||
        descriptionText.includes(eligibility.trim().toLowerCase()) ||
        (s.category && s.category.toLowerCase().includes(eligibility.trim().toLowerCase()));

      // Amount filter - Note: API doesn't provide amount, so we skip this
      // If you need amount filtering, you'll need to add it to the API response

      return catMatch && deadlineMatch && eligMatch;
    });

    // Sorting
    if (selectedSort === "Latest") {
      list = list.sort((a, b) => {
        const dateA = new Date(a.created_at || a.start_date || 0).getTime();
        const dateB = new Date(b.created_at || b.start_date || 0).getTime();
        return dateB - dateA;
      });
    } else if (selectedSort === "Ending Soon") {
      list = list.sort((a, b) => {
        const dateA = a.end_date
          ? new Date(a.end_date).getTime()
          : Number.MAX_SAFE_INTEGER;
        const dateB = b.end_date
          ? new Date(b.end_date).getTime()
          : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      });
    }
    // Note: "Highest Amount" sort is skipped as API doesn't provide amount

    return list;
  }, [
    apiScholarships,
    selectedCategory,
    selectedSort,
    eligibility,
  ]);

  const loadMore = useCallback(() => {
    if (
      pagination &&
      page < pagination.total_pages &&
      !loading &&
      data.length > 0
    ) {
      setPage((p) => p + 1);
    }
  }, [pagination, page, loading, data.length]);

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
    setBookmarks((b) => ({ ...b, [id]: newBookmarkState }));
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
        setBookmarks((b) => ({ ...b, [id]: !newBookmarkState }));
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
        setBookmarks((b) => ({ ...b, [id]: !newBookmarkState }));
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
      } else {
        // Revert on error
        setBookmarks((b) => ({ ...b, [id]: !newBookmarkState }));
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
      setBookmarks((b) => ({ ...b, [id]: !newBookmarkState }));
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
  }, [bookmarking, showToast]);

  const openFilters = useCallback(() => {
    setShowFilters(true);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();
  }, [slideAnim]);

  const closeFilters = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowFilters(false));
  }, [slideAnim]);

  const clearFilters = useCallback(() => {
    setSelectedCategory("All");
    setEligibility("");
    setSelectedSort("Latest");
  }, []);

  const applyFilters = useCallback(() => {
    setPage(1);
    closeFilters();
  }, [closeFilters]);

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
    return { text: `${diffDays} days left`, color: "#666" };
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "All") count++;
    // Removed deadline filter
    if (eligibility) count++;
    if (selectedSort !== "Latest") count++;
    return count;
  }, [selectedCategory, eligibility, selectedSort]);

  const Header = (
    <View>
      <AppHeader
        title="Scholarships"
        onBack={() => router.back()}
        rightIcon={
          <TouchableOpacity onPress={openFilters} style={[styles.filterIconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }]}>
            <Ionicons name="options-outline" size={22} color={colors.text} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />
      <SearchBar
        value={query}
        onChangeText={setQuery}
        onClear={() => setQuery("")}
        placeholder="Search scholarships..."
      />
    </View>
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const categoryColor = getCategoryColor(item.category || "");
      const deadline = item.end_date || item.start_date;
      const daysInfo = getDaysRemaining(deadline, item.expired);
      const description = stripHtml(item.description || "");
      const isBookmarked = item.bookmarked || bookmarks[item.id];
      const isExpired = item.expired || daysInfo.text === "Expired";

      return (
        <View
          style={[
            styles.scholarshipCard,
            { borderLeftColor: categoryColor, backgroundColor: colors.card, borderColor: colors.border },
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
                  {item.expired && (
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

          <View style={[styles.amountRow, { borderBottomColor: colors.border }]}>
            <View style={styles.amountContainer}>
              <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Application Period</Text>
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
              style={[styles.bookmarkBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9" }]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isBookmarked ? "bookmark" : "bookmark-outline"}
                size={24}
                color={isBookmarked ? "#FFB400" : (isDark ? colors.textSecondary : "#999")}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.scholarshipDetails}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Deadline</Text>
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
                <View style={[styles.detailIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }]}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>{item.category}</Text>
                </View>
              </View>
            )}
          </View>


          {/* NEW: Application Progress Bar */}
          {(item.progress_percent !== undefined) && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Application Progress</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: item.progress_percent === 100 ? "#4CAF50" : categoryColor }}>
                  {item.progress_percent}%
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${item.progress_percent}%`,
                    backgroundColor: item.progress_percent === 100 ? '#4CAF50' : categoryColor,
                    borderRadius: 3
                  }}
                />
              </View>
            </View>
          )}

          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(dashboard)/student/student-scholarship-details",
                  params: { scholarshipId: item.id },
                })
              }
              style={[styles.viewBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }]}
            >
              <Ionicons name="eye-outline" size={18} color={colors.text} />
              <Text style={[styles.viewBtnText, { color: colors.text }]}>Details</Text>
            </TouchableOpacity>

            {item.has_applied ? (
              <View
                style={[
                  styles.applyBtn,
                  {
                    backgroundColor: isDark ? "rgba(76, 175, 80, 0.2)" : "#E8F5E9",
                    borderWidth: 1,
                    borderColor: "#4CAF50"
                  }
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
    [bookmarks, toggleBookmark]
  );

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#f2c44d" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#121212" : "#fff"} />
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#FFF8E1"]}
        style={styles.background}
        locations={[0, 0.4, 1]}
      />

      {/* Fixed Header Outside FlatList */}
      <View style={styles.fixedHeader}>
        <AppHeader
          title="Scholarships"
          onBack={() => router.back()}
          rightIcon={
            <TouchableOpacity onPress={openFilters} style={[styles.filterIconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }]}>
              <Ionicons name="options-outline" size={22} color={colors.text} />
              {activeFiltersCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          }
        />
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery("")}
          placeholder="Search scholarships..."
        />
      </View>

      {/* Scrollable Content */}
      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        refreshing={loading && page === 1}
        onRefresh={() => {
          setPage(1);
          setSearchQuery(query);
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>
              {loading ? "Loading scholarships..." : "No scholarships found"}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {loading
                ? "Please wait..."
                : "Try adjusting your filters or search"}
            </Text>
          </View>
        }
        ListFooterComponent={
          loading && page > 1 ? (
            <View style={styles.loadingFooter}>
              <Text style={styles.loadingText}>Loading more...</Text>
            </View>
          ) : null
        }
      />

      <Modal
        visible={showFilters}
        animationType="fade"
        transparent
        onRequestClose={closeFilters}
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={closeFilters}
          />
          <Animated.View
            style={[
              styles.modalSheet,
              { transform: [{ translateY: modalTranslateY }], backgroundColor: colors.surface },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Filters & Sorting</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                  Refine your scholarship search
                </Text>
              </View>
              {activeFiltersCount > 0 && (
                <View style={styles.activeFiltersBadge}>
                  <Text style={styles.activeFiltersText}>
                    {activeFiltersCount}
                  </Text>
                </View>
              )}
            </View>

            {/* Category Section */}
            <View style={[styles.filterSection, styles.filterCard, { backgroundColor: isDark ? colors.card : 'rgba(255,255,255,0.5)', borderColor: colors.border }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.15)' : '#E8F5E9' }]}>
                  <Ionicons name="grid-outline" size={18} color="#4CAF50" />
                </View>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Category</Text>
              </View>
              <FlatList
                data={categories}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setSelectedCategory(item)}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff", borderColor: colors.border },
                      selectedCategory === item && [styles.categoryChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { color: colors.textSecondary },
                        selectedCategory === item && [styles.categoryTextActive, { color: "#fff" }],
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              />
            </View>



            {/* Eligibility Section */}
            <View style={[styles.filterSection, styles.filterCard, { backgroundColor: isDark ? colors.card : 'rgba(255,255,255,0.5)', borderColor: colors.border }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255, 152, 0, 0.15)' : '#FFF3E0' }]}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color="#FF9800"
                  />
                </View>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Eligibility Keywords</Text>
              </View>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff", borderColor: colors.border }]}>
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={eligibility}
                  onChangeText={setEligibility}
                  placeholder="e.g., STEM, GPA, Female"
                  style={[styles.filterInput, styles.fullWidthInput, { color: colors.text }]}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Sort Section */}
            <View style={[styles.filterSection, styles.filterCard, { backgroundColor: isDark ? colors.card : 'rgba(255,255,255,0.5)', borderColor: colors.border }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(156, 39, 176, 0.15)' : '#F3E5F5' }]}>
                  <Ionicons name="swap-vertical-outline" size={18} color="#9C27B0" />
                </View>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Sort By</Text>
              </View>
              <View style={styles.sortRow}>
                {sortOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setSelectedSort(opt)}
                    style={[
                      styles.sortChip,
                      { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff", borderColor: colors.border },
                      selectedSort === opt && [styles.sortChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.sortText,
                        { color: colors.textSecondary },
                        selectedSort === opt && [styles.sortTextActive, { color: "#fff" }],
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View style={[styles.sheetActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity onPress={clearFilters} style={[styles.clearBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }]}>
                <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.clearBtnText, { color: colors.textSecondary }]}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={applyFilters}
                style={styles.applyBtnSheet}
              >
                <Text style={styles.applyBtnSheetText}>Apply Filters</Text>
                <Ionicons name="checkmark-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>


      </Modal>



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
  fixedHeader: {
    backgroundColor: "transparent",
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    letterSpacing: -0.5,
  },
  filterIconBtn: {
    padding: 8,
    marginRight: -8,
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  clearSearchBtn: {
    padding: 4,
  },
  scholarshipsHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#999",
  },
  scholarshipCard: {
    backgroundColor: "#fff",
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
    color: "#333",
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
    color: "#666",
    lineHeight: 20,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f5f5f5",
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
    backgroundColor: "#f8f8f8",
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
    color: "#333",
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
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  viewBtnText: {
    color: "#333",
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
    color: "#999",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#bbb",
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  backdropTouchable: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: "#fff",
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  sheetSubtitle: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  activeFiltersBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFiltersText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  filterSection: {
    marginBottom: 16,
  },
  filterCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 15,
    color: "#333",
    fontWeight: "700",
  },
  categoryScroll: {
    gap: 8,
  },
  categoryChip: {
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
  },
  categoryChipActive: {
    backgroundColor: "#333",
    borderColor: "#333",
  },
  categoryText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  categoryTextActive: {
    color: "#fff",
  },
  advancedFiltersRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
  },
  filterField: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
  },
  currencySymbol: {
    fontSize: 16,
    color: "#999",
    marginRight: 8,
    fontWeight: "600",
  },
  inputIcon: {
    marginRight: 10,
  },
  filterInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  fullWidthInput: {
    paddingLeft: 0,
  },

  sortRow: {
    flexDirection: "row",
    gap: 10,
  },
  sortChip: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    alignItems: "center",
  },
  sortChipActive: {
    backgroundColor: "#333",
    borderColor: "#333",
  },
  sortText: {
    color: "#666",
    fontSize: 13,
    fontWeight: "700",
  },
  sortTextActive: {
    color: "#fff",
  },
  sheetActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  clearBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#f8f8f8",
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
  },
  clearBtnText: {
    color: "#666",
    fontWeight: "700",
    fontSize: 15,
  },
  applyBtnSheet: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#4CAF50",
  },
  applyBtnSheetText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadingText: {
    color: "#999",
    fontSize: 14,
  },
});
