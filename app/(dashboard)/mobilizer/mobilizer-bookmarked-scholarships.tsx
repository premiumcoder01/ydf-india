import { AppHeader } from "@/components";
import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import { bookmarkScholarship, getBookmarkedScholarships } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
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

export default function MobilizerBookmarkedScholarshipsScreen() {
    const { isDark, colors } = useTheme();
    const [apiScholarships, setApiScholarships] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
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
    const fetchBookmarkedScholarships = async (isRefreshing: boolean = false) => {
        try {
            if (isRefreshing) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const authDataString = await AsyncStorage.getItem("authData");
            if (!authDataString) {
                console.log("No auth data found");
                if (isRefreshing) setRefreshing(false);
                else setLoading(false);
                return;
            }
            const authData = JSON.parse(authDataString);
            const token = authData?.token;
            if (!token) {
                console.log("No token found in auth data");
                if (isRefreshing) setRefreshing(false);
                else setLoading(false);
                return;
            }
            const response = await getBookmarkedScholarships(token, {
                page: isRefreshing ? 1 : page,
                per_page: 200,
            });
            if (response.success && response.data) {
                const apiResponse = response.data;
                const scholarshipsList = Array.isArray(apiResponse)
                    ? apiResponse
                    : apiResponse?.data || [];
                if (page === 1 || isRefreshing) {
                    setApiScholarships(scholarshipsList);
                } else {
                    setApiScholarships((prev) => [...prev, ...scholarshipsList]);
                }
                if (apiResponse?.pagination) {
                    setPagination(apiResponse.pagination);
                } else if (!Array.isArray(apiResponse) && (response as any).pagination) {
                    setPagination((response as any).pagination);
                }
            } else {
                console.log("API call failed:", response.error || response.message);
                if (page === 1 || isRefreshing) {
                    setApiScholarships([]);
                }
            }
        } catch (error) {
            console.error("Error fetching bookmarked scholarships:", error);
            if (page === 1 || isRefreshing) {
                setApiScholarships([]);
            }
        } finally {
            if (isRefreshing) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    };

    // Fetch data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            // Reset to page 1 and fetch fresh data when screen is focused
            setPage(1);
            fetchBookmarkedScholarships(true);
        }, [])
    );

    // Fetch more data when page changes (pagination)
    useEffect(() => {
        if (page > 1) {
            fetchBookmarkedScholarships();
        }
    }, [page]);

    // Show toast helper
    const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
    }, []);

    // Handle pull to refresh
    const onRefresh = useCallback(() => {
        setPage(1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        fetchBookmarkedScholarships(true);
    }, []);

    // Handle bookmark/unbookmark with API
    const toggleBookmark = useCallback(async (id: number, currentBookmarkState: boolean) => {
        if (bookmarking[id]) return;
        const newBookmarkState = !currentBookmarkState;
        setApiScholarships((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, bookmarked: newBookmarkState } : item
            )
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            setBookmarking((prev) => ({ ...prev, [id]: true }));
            const authDataString = await AsyncStorage.getItem("authData");
            if (!authDataString) {
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
                setApiScholarships((prev) =>
                    prev.map((item) =>
                        item.id === id ? { ...item, bookmarked: !newBookmarkState } : item
                    )
                );
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showToast("Authentication failed. Please login again.", "error");
                return;
            }
            const action = newBookmarkState ? "bookmark" : "unbookmark";
            const response = await bookmarkScholarship(token, id, action);
            if (response.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast(
                    newBookmarkState
                        ? "Scholarship bookmarked successfully!"
                        : "Scholarship unbookmarked successfully!",
                    "success"
                );
                if (!newBookmarkState) {
                    setTimeout(() => {
                        setApiScholarships((prev) => prev.filter((item) => item.id !== id));
                        if (pagination) {
                            setPagination((prev) => prev ? { ...prev, total: prev.total - 1 } : null);
                        }
                    }, 500);
                }
            } else {
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
            !refreshing &&
            apiScholarships.length > 0
        ) {
            setPage((p) => p + 1);
        }
    }, [pagination, page, loading, refreshing, apiScholarships.length]);


    const renderItem = useCallback(
        ({ item }: { item: any }) => {
            const categoryColor = getCategoryColor(item.category || "");
            const isBookmarked = item.bookmarked !== false;
            const isExpired = item.expired;
            const hasApplied = item.has_applied;
            const deadline = item.end_date || item.start_date;
            const shortDescription = item.shortname || "";

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
                    {/* Header: Category & Status */}
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

                    {/* Content: Title & Shortname */}
                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: isExpired ? colors.textSecondary : colors.text }]} numberOfLines={2}>
                            {item.title}
                        </Text>
                        {shortDescription ? (
                            <Text style={[styles.cardSubtitle, { color: colors.textSecondary, marginTop: 4 }]} numberOfLines={1}>
                                {shortDescription}
                            </Text>
                        ) : null}

                        {item.bookmarked_at && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
                                <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                    Saved on {new Date(item.bookmarked_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                                </Text>
                            </View>
                        )}
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
                    {(item.progress_percent !== undefined) && (
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
                    )}

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
                                onPress={() =>
                                    router.push({
                                        pathname: "/(dashboard)/mobilizer/mobilizer-apply-form",
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
        [bookmarking, toggleBookmark, colors, isDark]
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? colors.background : "#fff"} />

            {/* Fixed Header Outside FlatList */}
            <View style={styles.fixedHeader}>
                <AppHeader
                    title="Saved Scholarships"
                    onBack={() => router.back()}
                />
                <LinearGradient
                    colors={isDark
                        ? ["rgba(255, 180, 0, 0.15)", "rgba(255, 180, 0, 0.05)"]
                        : ["rgba(255, 180, 0, 0.1)", "rgba(255, 235, 59, 0.05)"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.headerInfoGradient, { borderBottomColor: colors.border }]}
                >
                    <View style={styles.headerInfoContent}>
                        <View style={styles.headerIconContainer}>
                            <LinearGradient
                                colors={["#FFB400", "#FFA000"]}
                                style={styles.headerIconGradient}
                            >
                                <Ionicons name="bookmark" size={22} color="#fff" />
                            </LinearGradient>
                        </View>
                        <View style={styles.headerTextContainer}>
                            <Text style={[styles.headerInfoTitle, { color: colors.text }]}>
                                Your Collection
                            </Text>
                            <Text style={[styles.headerInfoSubtitle, { color: colors.textSecondary }]}>
                                {apiScholarships.length} {apiScholarships.length === 1 ? "scholarship" : "scholarships"} saved
                            </Text>
                        </View>
                        {pagination && pagination.total > 0 && (
                            <View style={styles.headerBadge}>
                                <Text style={styles.headerBadgeText}>{pagination.total}</Text>
                            </View>
                        )}
                    </View>
                </LinearGradient>
            </View>

            {/* Scrollable Content */}
            <FlatList
                data={apiScholarships}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={onRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? "rgba(255, 180, 0, 0.1)" : "rgba(255, 180, 0, 0.08)" }]}>
                            <Ionicons name="bookmark-outline" size={64} color="#FFB400" />
                        </View>
                        <Text style={[styles.emptyStateText, { color: colors.text }]}>
                            {loading ? "Loading your collection..." : "No Saved Scholarships"}
                        </Text>
                        <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                            {loading
                                ? "Please wait while we fetch your bookmarked scholarships"
                                : "Start bookmarking scholarships to build your personalized collection"}
                        </Text>
                        {!loading && (
                            <TouchableOpacity
                                onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-scholarship-listing")}
                                style={styles.browseButton}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={["#4CAF50", "#45a049"]}
                                    style={styles.browseButtonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Ionicons name="search" size={20} color="#fff" />
                                    <Text style={styles.browseButtonText}>Explore Scholarships</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                ListFooterComponent={
                    loading && page > 1 ? (
                        <View style={styles.loadingFooter}>
                            <View style={styles.loadingIndicator}>
                                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading more...</Text>
                            </View>
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
    fixedHeader: {
        backgroundColor: "transparent",
    },
    headerInfoGradient: {
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    headerInfoContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    headerIconContainer: {
        shadowColor: "#FFB400",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    headerIconGradient: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTextContainer: {
        flex: 1,
    },
    headerInfoTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 2,
        letterSpacing: 0.3,
    },
    headerInfoSubtitle: {
        fontSize: 13,
        fontWeight: "500",
    },
    headerBadge: {
        backgroundColor: "#FFB400",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        minWidth: 36,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#FFB400",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    headerBadgeText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "800",
    },
    background: {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
    listContent: {
        paddingTop: 20,
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
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
        shadowColor: "#FFB400",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    emptyStateText: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    emptyStateSubtext: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: "center",
        paddingHorizontal: 20,
    },
    browseButton: {
        marginTop: 28,
        borderRadius: 14,
        overflow: "hidden",
        shadowColor: "#4CAF50",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    browseButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 28,
        paddingVertical: 14,
    },
    browseButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
        letterSpacing: 0.3,
    },
    loadingFooter: {
        paddingVertical: 24,
        alignItems: "center",
    },
    loadingIndicator: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.05)",
    },
    loadingText: {
        fontSize: 14,
        fontWeight: "600",
    },
});
