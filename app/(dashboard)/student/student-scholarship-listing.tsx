import { AppHeader, SearchBar, ScholarshipFilterModal, FilterState, DEFAULT_FILTERS, countActiveFilters } from "@/components";
import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import { bookmarkScholarship, getAllScholarships, getDropdownDefinitions, DropdownData } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  TouchableOpacity,
  View,
  TextInput,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    "All India": "#F59E0B",
    Bihar: "#3B82F6",
    Delhi: "#6366F1",
    Gujarat: "#10B981",
    Maharashtra: "#06B6D4",
    Punjab: "#8B5CF6",
    Rajasthan: "#F43F5E",
    Sikar: "#64748B",
    General: "#6B7280",
  };
  return colors[category] || colors["General"];
};


// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ScholarshipListingScreen() {
  const { isDark, colors } = useTheme();
  const [query, setQuery] = useState("");
  const [bookmarks, setBookmarks] = useState<Record<number, boolean>>({});
  const [apiScholarships, setApiScholarships] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarking, setBookmarking] = useState<Record<number, boolean>>({});
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [dropdownData, setDropdownData] = useState<DropdownData | null>(null);

  const fetchDropdowns = useCallback(async () => {
    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (authDataString) {
        const authData = JSON.parse(authDataString);
        if (authData.token) {
          const response = await getDropdownDefinitions(authData.token);
          if (response.success && response.data) {
            setDropdownData(response.data);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch dropdowns:", e);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch scholarships
  const fetchScholarships = useCallback(async () => {
    try {
      setLoading(true);
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) { setLoading(false); return; }

      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) { setLoading(false); return; }

      const response = await getAllScholarships(token, {
        search: searchQuery || undefined,
        per_page: 100,
        status: activeFilters.status || undefined,
        applied: activeFilters.applied !== null ? String(activeFilters.applied) : undefined,
        bookmarked: activeFilters.bookmarked !== null ? String(activeFilters.bookmarked) : undefined,
        state: activeFilters.state || undefined,
        start_date: activeFilters.dateFrom || undefined,
        end_date: activeFilters.dateTo || undefined,
        progress_min: activeFilters.progressMin || undefined,
        progress_max: activeFilters.progressMax || undefined,
        annual_family_income_max: activeFilters.annualFamilyIncomeMax || undefined,
        special_category: activeFilters.specialCategory || undefined,
        last_class_percentage_min: activeFilters.lastClassPercentageMin || undefined,
        caste_category: activeFilters.casteCategory || undefined,
        gender: activeFilters.gender || undefined,
        course_name: activeFilters.courseName || undefined,
      });

      if (response.success && response.data) {
        const apiData = response.data.data || response.data;
        const scholarshipsList = Array.isArray(apiData)
          ? apiData
          : apiData?.data || apiData?.scholarships || [];

        setApiScholarships(scholarshipsList);

        const bookmarksMap: Record<number, boolean> = {};
        scholarshipsList.forEach((scholarship: any) => {
          if (scholarship.bookmarked !== undefined) {
            bookmarksMap[scholarship.id] = scholarship.bookmarked;
          }
        });
        setBookmarks(bookmarksMap);
      } else {
        setApiScholarships([]);
      }
    } catch (error) {
      setApiScholarships([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilters]);

  useFocusEffect(useCallback(() => { 
    fetchDropdowns();
    fetchScholarships(); 
  }, [fetchScholarships, fetchDropdowns]));
  useEffect(() => { fetchScholarships(); }, [searchQuery, activeFilters]);

  const searchIndex = useMemo(() => {
    const index = new Map<number, string>();
    apiScholarships.forEach((scholarship) => {
      if (scholarship?.id != null) {
        index.set(scholarship.id, getScholarshipSearchText(scholarship));
      }
    });
    return index;
  }, [apiScholarships]);

  // Dynamic categories from API data
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    apiScholarships.forEach((s) => { if (s.category) cats.add(s.category); });
    return Array.from(cats).sort();
  }, [apiScholarships]);

  // Filter + search combined
  const data = useMemo(() => {
    if (apiScholarships.length === 0) return [];
    let list = [...apiScholarships];

    // Note: Search is already performed at the API level in fetchScholarships,
    // so we don't need to re-filter here unless we want an "instant search" 
    // feel for already-loaded data. However, the user wants backend filtering now.
    
    // Client-side search (as a secondary fallback or instant filter)
    if (searchQuery.trim()) {
      const tokens = normalizeText(searchQuery).split(" ").filter(Boolean);
      list = list.filter((s) => {
        const text = searchIndex.get(s.id) || "";
        return tokens.every((t) => text.includes(t));
      });
    }

    return list;
  }, [apiScholarships, searchQuery, searchIndex]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  }, []);

  const toggleBookmark = useCallback(async (id: number, currentBookmarkState: boolean) => {
    if (bookmarking[id]) return;
    const newBookmarkState = !currentBookmarkState;
    setBookmarks((b) => ({ ...b, [id]: newBookmarkState }));
    setApiScholarships((prev) => prev.map((item) => item.id === id ? { ...item, bookmarked: newBookmarkState } : item));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      setBookmarking((prev) => ({ ...prev, [id]: true }));
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) {
        setBookmarks((b) => ({ ...b, [id]: !newBookmarkState }));
        setApiScholarships((prev) => prev.map((item) => item.id === id ? { ...item, bookmarked: !newBookmarkState } : item));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast("Authentication failed. Please login again.", "error");
        return;
      }
      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) {
        setBookmarks((b) => ({ ...b, [id]: !newBookmarkState }));
        setApiScholarships((prev) => prev.map((item) => item.id === id ? { ...item, bookmarked: !newBookmarkState } : item));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast("Authentication failed. Please login again.", "error");
        return;
      }
      const action = newBookmarkState ? "bookmark" : "unbookmark";
      const response = await bookmarkScholarship(token, id, action);
      if (response.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(newBookmarkState ? "Scholarship bookmarked!" : "Bookmark removed!", "success");
      } else {
        setBookmarks((b) => ({ ...b, [id]: !newBookmarkState }));
        setApiScholarships((prev) => prev.map((item) => item.id === id ? { ...item, bookmarked: !newBookmarkState } : item));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(response.error || response.message || "Failed to update bookmark", "error");
      }
    } catch (err: any) {
      setBookmarks((b) => ({ ...b, [id]: !newBookmarkState }));
      setApiScholarships((prev) => prev.map((item) => item.id === id ? { ...item, bookmarked: !newBookmarkState } : item));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("Network error. Please try again.", "error");
    } finally {
      setBookmarking((prev) => ({ ...prev, [id]: false }));
    }
  }, [bookmarking, showToast]);

  const filterCount = countActiveFilters(activeFilters);

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const categoryColor = getCategoryColor(item.category || "");
      const isBookmarked = item.bookmarked || bookmarks[item.id];
      const isExpired = item.expired;
      const hasApplied = item.has_applied;
      const deadline = item.end_date;

      let statusConfig = { text: "Open", color: "#10B981", bg: "rgba(16, 185, 129, 0.1)" };
      if (isExpired) statusConfig = { text: "Expired", color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" };
      else if (hasApplied) statusConfig = { text: "Applied", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" };
      else if (item.can_apply === false) statusConfig = { text: "Closed", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" };

      return (
        <View
          style={[
            styles.cardContainer,
            {
              backgroundColor: isDark ? "transparent" : colors.card,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
              borderLeftWidth: 4,
              borderLeftColor: isExpired ? "#9CA3AF" : categoryColor,
            },
          ]}
        >
          {isDark && (
            <LinearGradient
              colors={["#1e1e1e", "#000000"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}
          <View style={styles.cardHeader}>
            <View style={[styles.cardPill, { backgroundColor: isExpired ? "#F3F4F6" : `${categoryColor}15` }]}>
              <Ionicons name="location-sharp" size={10} color={isExpired ? "#6B7280" : categoryColor} />
              <Text style={[styles.cardPillText, { color: isExpired ? "#6B7280" : categoryColor }]}>
                {item.category || "General"}
              </Text>
            </View>
            <View style={[styles.cardPill, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.cardPillText, { color: statusConfig.color, fontWeight: "700" }]}>{statusConfig.text}</Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: isExpired ? colors.textSecondary : colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>

          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 15, paddingHorizontal: 16, marginBottom: 16 }}>
            <View>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Opens</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {item.start_date ? new Date(item.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "TBA"}
              </Text>
            </View>
            <View style={[styles.verticalSep, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "#E5E7EB" }]} />
            <View>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Closes</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {deadline ? new Date(deadline).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "No Deadline"}
              </Text>
            </View>
          </View>

          {item.progress_percent > 0 && (
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase" }}>Application Progress</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: item.progress_percent === 100 ? "#10B981" : categoryColor }}>
                  {item.progress_percent}%
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                <View
                  style={{
                    height: "100%",
                    width: `${item.progress_percent}%`,
                    backgroundColor: item.progress_percent === 100 ? "#10B981" : categoryColor,
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          )}

          <View style={[styles.cardDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6", marginBottom: 12 }]} />

          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/(dashboard)/student/student-scholarship-details", params: { scholarshipId: item.id } })}
              style={[styles.viewBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB", borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB" }]}
            >
              <Ionicons name="eye-outline" size={16} color={colors.text} />
              <Text style={[styles.viewBtnText, { color: colors.text }]}>Details</Text>
            </TouchableOpacity>

            {!isExpired && !hasApplied && item.can_apply !== false ? (
              <TouchableOpacity
                onPress={() => {
                  if (item.external_scheme_link) {
                    openBrowserAsync(item.external_scheme_link, {
                      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
                    });
                  } else {
                    router.push({ pathname: "/(dashboard)/student/student-apply-form", params: { scholarshipId: item.id } });
                  }
                }}
                style={[styles.applyBtn, { backgroundColor: categoryColor }]}
              >
                <Text style={[styles.applyBtnText, { color: "#FFF" }]}>Apply Now</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <View style={[styles.applyBtn, hasApplied
                ? { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "#DCFCE7", borderWidth: 1, borderColor: isDark ? "#065F46" : "#86EFAC" }
                : { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", opacity: 0.8 }
              ]}>
                <Text style={[styles.applyBtnText, { color: hasApplied ? (isDark ? "#34D399" : "#166534") : colors.textSecondary }]}>
                  {hasApplied ? "Applied" : "Closed"}
                </Text>
                <Ionicons name={hasApplied ? "checkmark-circle" : "lock-closed"} size={16} color={hasApplied ? (isDark ? "#34D399" : "#166534") : colors.textSecondary} />
              </View>
            )}

            <TouchableOpacity activeOpacity={0.7} onPress={() => toggleBookmark(item.id, isBookmarked)} style={styles.bookmarkIconBtn}>
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

      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
        <AppHeader title="Scholarships" onBack={() => router.back()} />
        <View style={styles.searchRowWrapper}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              onClear={() => setQuery("")}
              placeholder="Search scholarships..."
            />
          </View>
          {/* Filter Icon Button */}
          <TouchableOpacity
            onPress={() => setFilterVisible(true)}
            style={[
              styles.filterIconBtn,
              {
                backgroundColor: filterCount > 0
                  ? (isDark ? "rgba(108,99,255,0.22)" : "rgba(108,99,255,0.1)")
                  : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"),
                borderColor: filterCount > 0
                  ? (isDark ? "rgba(108,99,255,0.55)" : "rgba(108,99,255,0.4)")
                  : (isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.09)"),
                shadowColor: filterCount > 0 ? "#6C63FF" : "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: filterCount > 0 ? 0.22 : 0.05,
                shadowRadius: 8,
                elevation: Platform.OS === "android" ? 0 : filterCount > 0 ? 4 : 1,
              },
            ]}
            activeOpacity={0.75}
          >
            <Ionicons
              name={filterCount > 0 ? "options" : "options-outline"}
              size={21}
              color={filterCount > 0 ? "#6C63FF" : (isDark ? "rgba(255,255,255,0.55)" : "#888")}
            />
            {filterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active filter chips */}
        {filterCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activePillsRow}
          >
            {activeFilters.status && <ActiveFilterPill label={`Status: ${activeFilters.status}`} color="#6C63FF" onRemove={() => setActiveFilters((p: FilterState) => ({ ...p, status: "" }))} />}
            {activeFilters.applied !== null && <ActiveFilterPill label={activeFilters.applied ? "Applied" : "Not Applied"} color="#3B82F6" onRemove={() => setActiveFilters((p: FilterState) => ({ ...p, applied: null }))} />}
            {activeFilters.bookmarked !== null && <ActiveFilterPill label={activeFilters.bookmarked ? "Bookmarked" : "Not Bookmarked"} color="#8B5CF6" onRemove={() => setActiveFilters((p: FilterState) => ({ ...p, bookmarked: null }))} />}
            {activeFilters.state && <ActiveFilterPill label={`State: ${activeFilters.state}`} color="#F59E0B" onRemove={() => setActiveFilters((p: FilterState) => ({ ...p, state: "" }))} />}
            {activeFilters.dateFrom && <ActiveFilterPill label={`From: ${activeFilters.dateFrom}`} color="#EF4444" onRemove={() => setActiveFilters((p: FilterState) => ({ ...p, dateFrom: "" }))} />}
            {activeFilters.dateTo && <ActiveFilterPill label={`To: ${activeFilters.dateTo}`} color="#EF4444" onRemove={() => setActiveFilters((p: FilterState) => ({ ...p, dateTo: "" }))} />}
            {activeFilters.courseName && <ActiveFilterPill label={`Course: ${activeFilters.courseName}`} color="#10B981" onRemove={() => setActiveFilters((p: FilterState) => ({ ...p, courseName: "" }))} />}
            {activeFilters.annualFamilyIncomeMax && <ActiveFilterPill label={`Income < ${activeFilters.annualFamilyIncomeMax}`} color="#8B5CF6" onRemove={() => setActiveFilters((p: FilterState) => ({ ...p, annualFamilyIncomeMax: "" }))} />}
            {activeFilters.lastClassPercentageMin && <ActiveFilterPill label={`Min ${activeFilters.lastClassPercentageMin}%`} color="#10B981" onRemove={() => setActiveFilters((p: FilterState) => ({ ...p, lastClassPercentageMin: "" }))} />}
            {activeFilters.gender && <ActiveFilterPill label={`Gender: ${activeFilters.gender}`} color="#6C63FF" onRemove={() => setActiveFilters((p: FilterState) => ({ ...p, gender: "" }))} />}
            {activeFilters.casteCategory && <ActiveFilterPill label={`Caste: ${activeFilters.casteCategory}`} color="#8B5CF6" onRemove={() => setActiveFilters((p: FilterState) => ({ ...p, casteCategory: "" }))} />}
            {activeFilters.specialCategory && <ActiveFilterPill label={`Special: ${activeFilters.specialCategory}`} color="#F59E0B" onRemove={() => setActiveFilters((p: FilterState) => ({ ...p, specialCategory: "" }))} />}
            {(activeFilters.progressMin || activeFilters.progressMax) && (
              <ActiveFilterPill
                label={`Progress: ${activeFilters.progressMin || 0}% - ${activeFilters.progressMax || 100}%`}
                color="#3B82F6"
                onRemove={() => setActiveFilters((p: FilterState) => ({ ...p, progressMin: "", progressMax: "" }))}
              />
            )}
            <TouchableOpacity
              onPress={() => setActiveFilters(DEFAULT_FILTERS)}
              style={[styles.clearAllPill, { backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "#FEE2E2" }]}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#EF4444" }}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={fetchScholarships}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>{loading ? "Loading scholarships..." : "No scholarships found"}</Text>
            <Text style={styles.emptyStateSubtext}>{loading ? "Please wait..." : filterCount > 0 ? "Try adjusting your filters" : "Try adjusting your search"}</Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <ScholarshipFilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={activeFilters}
        onApply={setActiveFilters}
        isDark={isDark}
        colors={colors}
        dropdownData={dropdownData}
      />

      <Toast message={toastMessage} type={toastType} visible={toastVisible} onHide={() => setToastVisible(false)} duration={3000} />
    </View>
  );
}

// ─── Active Filter Pill ───────────────────────────────────────────────────────

function ActiveFilterPill({ label, color, onRemove }: { label: string; color: string; onRemove: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.activePill, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}
      onPress={onRemove}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: 12, fontWeight: "600", color }}>{label}</Text>
      <Ionicons name="close" size={12} color={color} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  fixedHeader: { backgroundColor: "transparent" },
  background: { position: "absolute", top: 0, left: 0, bottom: 0, right: 0 },
  listContent: { paddingTop: 16, paddingBottom: 40 },
  searchRowWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    paddingLeft: 0,
    gap: 8,
  },
  filterIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#6C63FF",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  filterBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  activePillsRow: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 10, gap: 8, alignItems: "center" },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  clearAllPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
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
    overflow: "hidden",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  cardPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  cardPillText: { fontSize: 12, fontWeight: "600" },
  cardContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: "800", lineHeight: 26 },
  cardSubtitle: { fontSize: 14, fontWeight: "500" },
  cardDivider: { height: 1, width: "100%" },
  dateLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 2, opacity: 0.7 },
  dateValue: { fontSize: 13, fontWeight: "700" },
  verticalSep: { width: 1, height: 24 },
  bookmarkIconBtn: { width: 44, height: 48, justifyContent: "center", alignItems: "center" },
  cardActionsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  viewBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  viewBtnText: { fontWeight: "700", fontSize: 14 },
  applyBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 14 },
  applyBtnText: { fontWeight: "700", fontSize: 14 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  emptyStateText: { fontSize: 18, fontWeight: "600", color: "#999", marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: "#bbb", marginTop: 4 },
});


