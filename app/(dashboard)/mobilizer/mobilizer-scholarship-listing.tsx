import { AppHeader, SearchBar } from "@/components";
import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import { bookmarkScholarship, getMobilizerScholarships, getMobilizerStudents } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
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
    const descriptionText = stripHtml(scholarship?.summary || scholarship?.description || "");
    const tagsText = Array.isArray(scholarship?.tags)
        ? scholarship.tags.join(" ")
        : scholarship?.tags || "";
    const keywordsText = Array.isArray(scholarship?.keywords)
        ? scholarship.keywords.join(" ")
        : scholarship?.keywords || "";

    return normalizeText(
        [
            scholarship?.name, // Adjusted for 'name'
            scholarship?.title,
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

export default function MobilizerScholarshipListingScreen() {
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

    // Student Selection Modal State
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [selectedScholarshipForApply, setSelectedScholarshipForApply] = useState<number | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [studentSearchQuery, setStudentSearchQuery] = useState("");
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
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

            // Call getMobilizerScholarships API with search query
            const response = await getMobilizerScholarships(token, {
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


    // Fetch Students for Selection Modal
    const fetchStudents = async () => {
        try {
            setLoadingStudents(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) return;
            const { token } = JSON.parse(authDataStr);

            const response = await getMobilizerStudents(token, 1, 100, studentSearchQuery);
            if (response.success && response.data?.students) {
                setStudents(response.data.students);
            } else {
                setStudents([]);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoadingStudents(false);
        }
    };

    // Effect to fetch students when modal opens or search changes
    useEffect(() => {
        if (showStudentModal) {
            fetchStudents();
        }
    }, [showStudentModal, studentSearchQuery]);


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
                const dateA = a.end_date || a.deadline
                    ? new Date(a.end_date || a.deadline).getTime()
                    : Number.MAX_SAFE_INTEGER;
                const dateB = b.end_date || b.deadline
                    ? new Date(b.end_date || b.deadline).getTime()
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
            const hasApplied = item.has_applied === true;
            const deadline = item.deadline || item.end_date;
            const summaryText = stripHtml(item.summary || item.description || "");
            const shortDescription = summaryText.length > 100 ? summaryText.substring(0, 100) + "..." : summaryText;
            const title = item.name || item.title || "Scholarship";

            // Default to 0 if progress is missing
            const progressPercent = item.progress_percent !== undefined ? item.progress_percent : 0;

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
                            {title}
                        </Text>
                        {item.provider && (
                            <Text style={[styles.providerText, { color: colors.textSecondary }]}>
                                by {item.provider}
                            </Text>
                        )}
                        {shortDescription ? (
                            <Text style={[styles.cardSubtitle, { color: colors.textSecondary, marginTop: 4 }]} numberOfLines={2}>
                                {shortDescription}
                            </Text>
                        ) : null}
                    </View>

                    {/* Dates Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, paddingHorizontal: 16, marginBottom: 16 }}>
                        <View>
                            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Opens</Text>
                            <Text style={[styles.dateValue, { color: colors.text }]}>
                                TBA
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
                            <Text style={{ fontSize: 12, fontWeight: '700', color: progressPercent === 100 ? "#10B981" : categoryColor }}>
                                {progressPercent}%
                            </Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                            <View
                                style={{
                                    height: '100%',
                                    width: `${progressPercent}%`,
                                    backgroundColor: progressPercent === 100 ? '#10B981' : categoryColor,
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
                                    pathname: "/(dashboard)/mobilizer/mobilizer-scholarship-details",
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
                                onPress={() => {
                                    setSelectedScholarshipForApply(item.id);
                                    setShowStudentModal(true);
                                }}
                                style={[
                                    styles.applyBtn,
                                    { backgroundColor: categoryColor }
                                ]}
                            >
                                <Text style={[styles.applyBtnText, { color: "#FFF" }]}>Apply For</Text>
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

                            {/* Show Expired Checkbox */}
                            <TouchableOpacity
                                onPress={() => setShowExpired(!showExpired)}
                                style={[styles.checkboxRow, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f9fa", borderColor: colors.border }]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>Show Expired</Text>
                                    <Text style={[styles.checkboxSublabel, { color: colors.textSecondary }]}>Include closed scholarships</Text>
                                </View>
                                <Switch
                                    trackColor={{ false: "#767577", true: `${colors.primary}66` }}
                                    thumbColor={showExpired ? colors.primary : "#f4f3f4"}
                                    ios_backgroundColor="#3e3e3e"
                                    onValueChange={setShowExpired}
                                    value={showExpired}
                                />
                            </TouchableOpacity>

                            {/* Show Applied Checkbox */}
                            <TouchableOpacity
                                onPress={() => setShowApplied(!showApplied)}
                                style={[styles.checkboxRow, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f9fa", borderColor: colors.border }]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>Applied Only</Text>
                                    <Text style={[styles.checkboxSublabel, { color: colors.textSecondary }]}>Show scholarships I applied to</Text>
                                </View>
                                <Switch
                                    trackColor={{ false: "#767577", true: `${colors.primary}66` }}
                                    thumbColor={showApplied ? colors.primary : "#f4f3f4"}
                                    ios_backgroundColor="#3e3e3e"
                                    onValueChange={setShowApplied}
                                    value={showApplied}
                                />
                            </TouchableOpacity>

                            {/* Show Bookmarked Checkbox */}
                            <TouchableOpacity
                                onPress={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
                                style={[styles.checkboxRow, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f9fa", borderColor: colors.border }]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>Bookmarked Only</Text>
                                    <Text style={[styles.checkboxSublabel, { color: colors.textSecondary }]}>Show my saved scholarships</Text>
                                </View>
                                <Switch
                                    trackColor={{ false: "#767577", true: `${colors.primary}66` }}
                                    thumbColor={showBookmarkedOnly ? colors.primary : "#f4f3f4"}
                                    ios_backgroundColor="#3e3e3e"
                                    onValueChange={setShowBookmarkedOnly}
                                    value={showBookmarkedOnly}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Sort Section */}
                        <View style={[styles.filterSection, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Sort By</Text>
                            <View style={styles.sortContainer}>
                                {sortOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option}
                                        onPress={() => setSelectedSort(option)}
                                        style={[
                                            styles.sortOption,
                                            { borderColor: colors.border },
                                            selectedSort === option && { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }
                                        ]}
                                    >
                                        <Ionicons
                                            name={option === "Latest" ? "time-outline" : "hourglass-outline"}
                                            size={18}
                                            color={selectedSort === option ? colors.primary : colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.sortOptionText,
                                            { color: isDark ? colors.text : "#555" },
                                            selectedSort === option && { color: colors.primary, fontWeight: "700" }
                                        ]}>
                                            {option}
                                        </Text>
                                        {selectedSort === option && (
                                            <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: "auto" }} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={[styles.modalFooter, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: inset.bottom + 20 }]}>
                        <TouchableOpacity onPress={applyFilters} style={[styles.applyFilterBtn, { backgroundColor: colors.primary }]}>
                            <Text style={styles.applyFilterText}>Show {data.length} Results</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Toast
                visible={toastVisible}
                message={toastMessage}
                type={toastType}
                onHide={() => setToastVisible(false)}
            />

            {/* Student Selection Modal */}
            <Modal
                visible={showStudentModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowStudentModal(false)}
            >
                <View style={[styles.fullScreenModal, { backgroundColor: isDark ? "#121212" : "#f5f5f5" }]}>
                    <View style={[styles.modalHeader, { paddingTop: inset.top + 12, backgroundColor: isDark ? "#1E1E1E" : "#fff", borderBottomColor: colors.border }]}>
                        <View style={styles.modalHeaderTop}>
                            <TouchableOpacity onPress={() => setShowStudentModal(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Student</Text>
                            <View style={{ width: 24 }} />
                        </View>
                        <SearchBar
                            value={studentSearchQuery}
                            onChangeText={setStudentSearchQuery}
                            placeholder="Search student..."
                            onClear={() => setStudentSearchQuery("")}
                            style={{ paddingHorizontal: 0, marginTop: 10, paddingVertical: 0, borderRadius: 12 }}
                        />
                    </View>

                    {loadingStudents ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={students}
                            keyExtractor={(item) => String(item.id)}
                            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                            renderItem={({ item }) => {
                                const isSelected = selectedStudent === item.id;
                                const avatarColor = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"][item.id % 5];
                                const initials = ((item.firstname || "S").charAt(0) + (item.lastname || "").charAt(0)).toUpperCase();

                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.studentCard,
                                            {
                                                backgroundColor: isDark ? colors.card : "#fff",
                                                borderColor: isSelected ? colors.primary : isDark ? colors.border : 'transparent',
                                                borderWidth: isSelected ? 2 : 1
                                            }
                                        ]}
                                        onPress={() => setSelectedStudent(item.id)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            {item.picture && !item.picture.includes("gravatar.com/avatar/default") ? (
                                                <Image
                                                    source={{ uri: item.picture }}
                                                    style={styles.studentAvatar}
                                                    contentFit="cover"
                                                />
                                            ) : (
                                                <View style={[styles.studentAvatarPlaceholder, { backgroundColor: avatarColor }]}>
                                                    <Text style={styles.studentInitials}>{initials}</Text>
                                                </View>
                                            )}
                                            <View style={{ marginLeft: 12, flex: 1 }}>
                                                <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>
                                                    {item.fullname || `${item.firstname} ${item.lastname}`}
                                                </Text>
                                                <Text style={[styles.studentDetail, { color: colors.textSecondary }]} numberOfLines={1}>
                                                    {item.email}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{
                                            width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                                            borderColor: isSelected ? colors.primary : colors.textSecondary,
                                            justifyContent: 'center', alignItems: 'center'
                                        }}>
                                            {isSelected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={{ alignItems: 'center', marginTop: 50 }}>
                                    <Text style={{ color: colors.textSecondary }}>No students found</Text>
                                </View>
                            }
                        />
                    )}

                    <View style={[styles.modalFooter, { backgroundColor: isDark ? "#1E1E1E" : "#fff", borderTopColor: colors.border, paddingBottom: inset.bottom + 20 }]}>
                        <TouchableOpacity
                            style={[
                                styles.applyFilterBtn,
                                { backgroundColor: selectedStudent ? colors.primary : (isDark ? "#333" : "#ccc"), opacity: selectedStudent ? 1 : 0.7 }
                            ]}
                            disabled={!selectedStudent}
                            onPress={() => {
                                if (selectedStudent && selectedScholarshipForApply) {
                                    setShowStudentModal(false);
                                    router.push({
                                        pathname: "/(dashboard)/mobilizer/mobilizer-apply-form",
                                        params: {
                                            scholarshipId: selectedScholarshipForApply,
                                            studentId: selectedStudent
                                        },
                                    });
                                    // Reset selection slightly after navigation
                                    setTimeout(() => setSelectedStudent(null), 500);
                                }
                            }}
                        >
                            <Text style={styles.applyFilterText}>Proceed to Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    filterIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
    },
    filterBadge: {
        position: "absolute",
        top: 0,
        right: 0,
        backgroundColor: "#F44336",
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#fff",
    },
    filterBadgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "bold",
    },
    listContent: {
        paddingTop: 20,
        paddingBottom: 40,
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
    providerText: {
        fontSize: 13,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    cardDivider: {
        height: 1,
        width: '100%',
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
        paddingVertical: 100,
        paddingHorizontal: 30,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 8,
        color: "#666",
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
    },
    loadingFooter: {
        paddingVertical: 24,
        alignItems: "center",
    },
    loadingText: {
        fontSize: 14,
        color: "#999",
    },

    // Modal Styles
    fullScreenModal: {
        flex: 1,
    },
    modalHeader: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    modalHeaderTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    closeBtn: {
        padding: 4,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    resetText: {
        fontSize: 16,
        fontWeight: "600",
    },
    modalScrollContent: {
        padding: 20,
    },
    filterSection: {
        marginBottom: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        height: 50,
    },
    filterInput: {
        flex: 1,
        fontSize: 16,
        height: "100%",
    },
    chipContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: "500",
    },

    // Checkbox Row
    checkboxRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    checkboxLabel: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    checkboxSublabel: {
        fontSize: 13,
    },

    // Sort Styles
    sortContainer: {
        gap: 12,
    },
    sortOption: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    sortOptionText: {
        fontSize: 16,
        fontWeight: "500",
    },

    modalFooter: {
        paddingHorizontal: 20,
        paddingTop: 20,
        borderTopWidth: 1,
    },
    applyFilterBtn: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
    },
    applyFilterText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    // Student Modal Styles
    studentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    studentAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    studentAvatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    studentInitials: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    studentName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    studentDetail: {
        fontSize: 12,
    },
});
