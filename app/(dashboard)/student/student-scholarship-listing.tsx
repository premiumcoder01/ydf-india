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
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
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

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const getScholarshipSearchText = (scholarship: any): string => {
  const descriptionText = stripHtml(scholarship?.description || "");
  const tagsText = Array.isArray(scholarship?.tags)
    ? scholarship.tags.join(" ")
    : scholarship?.tags || "";
  const keywordsText = Array.isArray(scholarship?.keywords)
    ? scholarship.keywords.join(" ")
    : scholarship?.keywords || "";

  return normalizeText(
    [
      scholarship?.title,
      scholarship?.name,
      scholarship?.shortname,
      scholarship?.category,
      scholarship?.state,
      scholarship?.location,
      scholarship?.provider_name,
      scholarship?.provider,
      scholarship?.organization,
      scholarship?.department,
      scholarship?.eligibility,
      scholarship?.type,
      tagsText,
      keywordsText,
      descriptionText,
    ]
      .filter(Boolean)
      .join(" ")
  );
};

// Helper function to get category color
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    "All India": "#F59E0B", // Amber
    Bihar: "#3B82F6",       // Blue
    Delhi: "#6366F1",       // Indigo
    Gujarat: "#10B981",     // Emerald
    Maharashtra: "#06B6D4", // Cyan
    Punjab: "#8B5CF6",      // Violet
    Rajasthan: "#F43F5E",   // Rose
    Sikar: "#64748B",       // Slate
    // Fallbacks/General
    General: "#6B7280",
  };
  return colors[category] || colors["General"];
};

export default function ScholarshipListingScreen() {
  const { isDark, colors } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSort, setSelectedSort] =
    useState<(typeof sortOptions)[number]>("Latest");
  const [eligibility, setEligibility] = useState("");
  const [showExpired, setShowExpired] = useState(false);
  const [showApplied, setShowApplied] = useState(false);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

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

  const searchIndex = useMemo(() => {
    const index = new Map<number, string>();
    apiScholarships.forEach((scholarship) => {
      if (scholarship?.id != null) {
        index.set(scholarship.id, getScholarshipSearchText(scholarship));
      }
    });
    return index;
  }, [apiScholarships]);

  // Filter and sort API data
  const data = useMemo(() => {
    if (apiScholarships.length === 0) return [];

    let list = [...apiScholarships];
    const keywordQuery = normalizeText(
      [searchQuery, eligibility].filter(Boolean).join(" ")
    );
    const keywordTokens = keywordQuery ? keywordQuery.split(" ") : [];

    // Client-side filtering
    list = list.filter((s) => {
      // Category filter
      const catMatch =
        selectedCategory === "All" || s.category === selectedCategory;

      // Expired Filter
      const isExpired = s.expired === true;
      const expiredMatch = showExpired ? isExpired : !isExpired;

      // Applied Filter
      const appliedMatch = showApplied ? s.has_applied === true : true;

      // Bookmarked Filter
      const isBookmarked = s.bookmarked || bookmarks[s.id];
      const bookmarkMatch = showBookmarkedOnly ? isBookmarked : true;

      // Keyword filter across multiple fields
      const searchText = searchIndex.get(s.id) || "";
      const keywordMatch =
        keywordTokens.length === 0 ||
        keywordTokens.every((token) => searchText.includes(token));

      return (
        catMatch &&
        expiredMatch &&
        appliedMatch &&
        bookmarkMatch &&
        keywordMatch
      );
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
    searchQuery,
    showExpired,
    showApplied,
    showBookmarkedOnly,
    bookmarks,
    searchIndex
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
    setShowExpired(false);
    setShowApplied(false);
    setShowBookmarkedOnly(false);
  }, []);

  const applyFilters = useCallback(() => {
    closeFilters();
  }, [closeFilters]);



  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "All") count++;
    if (eligibility) count++;
    if (selectedSort !== "Latest") count++;
    if (showExpired) count++;
    if (showApplied) count++;
    if (showBookmarkedOnly) count++;
    return count;
  }, [selectedCategory, eligibility, selectedSort, showExpired, showApplied, showBookmarkedOnly]);



  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const categoryColor = getCategoryColor(item.category || "");
      const isBookmarked = item.bookmarked || bookmarks[item.id];
      const isExpired = item.expired;
      const hasApplied = item.has_applied;
      const deadline = item.end_date || item.start_date;
      const shortDescription = item.shortname || (item.description ? stripHtml(item.description).substring(0, 60) + "..." : "");

      // Status Configuration
      let statusConfig = { text: "Open", color: "#10B981", bg: "rgba(16, 185, 129, 0.1)" };
      if (isExpired) {
        statusConfig = { text: "Expired", color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" };
      } else if (hasApplied) {
        statusConfig = { text: "Applied", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" };
      }

      return (
        <View
          style={[
            styles.cardContainer,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
              borderLeftWidth: 4,
              borderLeftColor: isExpired ? "#9CA3AF" : categoryColor
            }
          ]}
        >
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={[styles.cardPill, { backgroundColor: isExpired ? "#F3F4F6" : `${categoryColor}15` }]}>
              <Ionicons name="location-sharp" size={10} color={isExpired ? "#6B7280" : categoryColor} />
              <Text style={[styles.cardPillText, { color: isExpired ? "#6B7280" : categoryColor }]}>
                {item.category || "General"}
              </Text>
            </View>

            <View style={[styles.cardPill, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.cardPillText, { color: statusConfig.color, fontWeight: '700' }]}>
                {statusConfig.text}
              </Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: isExpired ? colors.textSecondary : colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            {shortDescription ? (
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary, marginTop: 4 }]} numberOfLines={1}>
                {shortDescription}
              </Text>
            ) : null}
          </View>

          {/* Dates Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, paddingHorizontal: 16, marginBottom: 16 }}>
            <View>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Opens</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {item.start_date ? new Date(item.start_date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }) : "TBA"}
              </Text>
            </View>

            <View style={[styles.verticalSep, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "#E5E7EB" }]} />

            <View>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Closes</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {deadline ? new Date(deadline).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }) : "No Deadline"}
              </Text>
            </View>
          </View>

          {/* Application Progress Bar */}

          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' }}>Application Progress</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: item.progress_percent === 100 ? "#10B981" : categoryColor }}>
                {item.progress_percent}%
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  width: `${item.progress_percent}%`,
                  backgroundColor: item.progress_percent === 100 ? '#10B981' : categoryColor,
                  borderRadius: 3
                }}
              />
            </View>
          </View>


          {/* Divider */}
          <View style={[styles.cardDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6", marginBottom: 12 }]} />

          {/* Actions Footer */}
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(dashboard)/student/student-scholarship-details",
                  params: { scholarshipId: item.id },
                })
              }
              style={[styles.viewBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB", borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB" }]}
            >
              <Ionicons name="eye-outline" size={16} color={colors.text} />
              <Text style={[styles.viewBtnText, { color: colors.text }]}>Details</Text>
            </TouchableOpacity>

            {!isExpired && !hasApplied ? (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/(dashboard)/student/student-apply-form",
                    params: { scholarshipId: item.id },
                  })
                }
                style={[
                  styles.applyBtn,
                  { backgroundColor: categoryColor }
                ]}
              >
                <Text style={[styles.applyBtnText, { color: "#FFF" }]}>Apply Now</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.applyBtn,
                  hasApplied
                    ? { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#DCFCE7", borderWidth: 1, borderColor: isDark ? "#065F46" : "#86EFAC" }
                    : { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", opacity: 0.8 }
                ]}
              >
                <Text style={[styles.applyBtnText, { color: hasApplied ? (isDark ? "#34D399" : "#166534") : colors.textSecondary }]}>
                  {hasApplied ? "Applied" : "Closed"}
                </Text>
                <Ionicons
                  name={hasApplied ? "checkmark-circle" : "lock-closed"}
                  size={16}
                  color={hasApplied ? (isDark ? "#34D399" : "#166534") : colors.textSecondary}
                />
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleBookmark(item.id, isBookmarked)}
              style={[styles.bookmarkIconBtn]}
            >
              <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={22} color={isBookmarked ? "#F59E0B" : colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [bookmarks, toggleBookmark, isDark, colors]
  );



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
            <TouchableOpacity
              onPress={openFilters}
              style={[
                styles.filterIconBtn,
                { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }
              ]}
            >
              <Ionicons
                name="filter-circle-outline"
                size={28}
                color={activeFiltersCount > 0 ? colors.primary : colors.text}
              />
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
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeFilters}
      >
        <View style={[styles.fullScreenModal, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { paddingTop: inset.top + 10, backgroundColor: isDark ? "#1E1E1E" : "#fff", borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderTop}>
              <TouchableOpacity onPress={closeFilters} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={[styles.resetText, { color: colors.primary }]}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[styles.modalScrollContent, { paddingBottom: inset.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
          >

         {/* Keywords Section */}
          <View style={[styles.filterSection, { borderBottomColor: colors.border }]}>
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Keywords</Text>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f9fa", borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  value={eligibility}
                  onChangeText={setEligibility}
                  placeholder="e.g. Merit, Sports, 10th Pass"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.filterInput, { color: colors.text }]}
                />
              </View>
            </View>

            {/* Category Section */}
            <View style={[styles.filterSection, { borderBottomColor: colors.border }]}>
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>State / Category</Text>
              <View style={styles.chipContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[
                      styles.filterChip,
                      { borderColor: colors.border, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f9fa" },
                      selectedCategory === cat && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { color: isDark ? colors.text : "#555" },
                      selectedCategory === cat && { color: "#fff", fontWeight: "700" }
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Status Section */}
            <View style={[styles.filterSection, { borderBottomWidth: 0 }]}>
              <Text style={[styles.filterSectionTitle, { color: colors.text, marginBottom: 16 }]}>Status & Availability</Text>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Show Expired</Text>
                  <Text style={[styles.switchSubLabel, { color: colors.textSecondary }]}>Include past scholarships</Text>
                </View>
                <Switch
                  value={showExpired}
                  onValueChange={setShowExpired}
                  trackColor={{ false: "#e0e0e0", true: colors.primary + "80" }}
                  thumbColor={showExpired ? colors.primary : "#f4f3f4"}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Applied Only</Text>
                  <Text style={[styles.switchSubLabel, { color: colors.textSecondary }]}>Show only applications submitted</Text>
                </View>
                <Switch
                  value={showApplied}
                  onValueChange={setShowApplied}
                  trackColor={{ false: "#e0e0e0", true: colors.primary + "80" }}
                  thumbColor={showApplied ? colors.primary : "#f4f3f4"}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Bookmarked</Text>
                  <Text style={[styles.switchSubLabel, { color: colors.textSecondary }]}>Show saved scholarships</Text>
                </View>
                <Switch
                  value={showBookmarkedOnly}
                  onValueChange={setShowBookmarkedOnly}
                  trackColor={{ false: "#e0e0e0", true: colors.primary + "80" }}
                  thumbColor={showBookmarkedOnly ? colors.primary : "#f4f3f4"}
                />
              </View>
            </View>



          

          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.modalFooter, { paddingBottom: inset.bottom + 20, backgroundColor: isDark ? "#1E1E1E" : "#fff", borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={applyFilters}
              style={[styles.applyFab, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.applyFabText}>Show Results</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
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
  // NEW CARD STYLES
  cardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  cardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  cardPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 26,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardDivider: {
    height: 1,
    width: '100%',
  },
  cardFooter: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
    opacity: 0.7,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  verticalSep: {
    width: 1,
    height: 24,
  },
  bookmarkBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkIconBtn: {
    width: 44,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  viewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  viewBtnText: {
    fontWeight: "700",
    fontSize: 14,
  },
  applyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  applyBtnText: {
    fontWeight: "700",
    fontSize: 14,
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
  // Modal Styles
  fullScreenModal: {
    flex: 1,
  },
  modalHeader: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  modalHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
    marginLeft: -4,
  },
  resetText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalScrollContent: {
    padding: 24,
  },
  filterSection: {
    marginBottom: 32,
    borderBottomWidth: 1,
    paddingBottom: 32,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  switchSubLabel: {
    fontSize: 13,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  applyFab: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  applyFabText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
