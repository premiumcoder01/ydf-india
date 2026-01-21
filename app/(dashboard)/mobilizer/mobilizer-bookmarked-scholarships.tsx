import { AppHeader, SearchBar } from "@/components";
import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import { bookmarkScholarship, getBookmarkedScholarships } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

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

export default function MobilizerBookmarkedScholarshipsScreen() {
    const { isDark, colors } = useTheme();
    const [allScholarships, setAllScholarships] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [bookmarking, setBookmarking] = useState<Record<number, boolean>>({});
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

    const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
    }, []);

    // Filter scholarships based on search query
    const scholarships = useMemo(() => {
        if (!searchQuery.trim()) return allScholarships;

        const query = searchQuery.toLowerCase();
        return allScholarships.filter((scholarship) => {
            const title = (scholarship.name || scholarship.title || "").toLowerCase();
            const description = stripHtml(scholarship.summary || scholarship.description || "").toLowerCase();
            const provider = (scholarship.provider || "").toLowerCase();
            const category = (scholarship.category || "").toLowerCase();

            return (
                title.includes(query) ||
                description.includes(query) ||
                provider.includes(query) ||
                category.includes(query)
            );
        });
    }, [allScholarships, searchQuery]);

    const fetchBookmarkedScholarships = async () => {
        try {
            setLoading(true);
            const authDataString = await AsyncStorage.getItem("authData");
            if (!authDataString) {
                setLoading(false);
                return;
            }

            const authData = JSON.parse(authDataString);
            const token = authData?.token;

            if (!token) {
                setLoading(false);
                return;
            }

            // Fetch only bookmarked scholarships
            const response = await getBookmarkedScholarships(token, {
                per_page: 100,
            });

            if (response.success && response.data) {
                const apiData = response.data.data || response.data;
                const scholarshipsList = Array.isArray(apiData)
                    ? apiData
                    : apiData?.data || apiData?.scholarships || [];
                setAllScholarships(scholarshipsList);
            } else {
                setAllScholarships([]);
            }
        } catch (error) {
            console.error("Error fetching bookmarked scholarships:", error);
            setAllScholarships([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchBookmarkedScholarships();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchBookmarkedScholarships();
    };

    const handleUnbookmark = useCallback(async (id: number) => {
        if (bookmarking[id]) return;

        // Optimistic UI update - remove from list immediately
        setAllScholarships((prev: any[]) => prev.filter((item: any) => item.id !== id));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            setBookmarking((prev) => ({ ...prev, [id]: true }));

            const authDataString = await AsyncStorage.getItem("authData");
            if (!authDataString) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showToast("Authentication failed. Please login again.", "error");
                fetchBookmarkedScholarships(); // Restore state
                return;
            }

            const authData = JSON.parse(authDataString);
            const token = authData?.token;

            if (!token) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showToast("Authentication failed. Please login again.", "error");
                fetchBookmarkedScholarships();
                return;
            }

            const response = await bookmarkScholarship(token, id, "unbookmark");

            if (response.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast("Scholarship removed from bookmarks!", "success");
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showToast(response.error || response.message || "Failed to remove bookmark", "error");
                fetchBookmarkedScholarships(); // Restore state
            }
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast("Network error. Please try again.", "error");
            fetchBookmarkedScholarships(); // Restore state
        } finally {
            setBookmarking((prev) => ({ ...prev, [id]: false }));
        }
    }, [bookmarking, showToast]);

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
        if (diffDays <= 7) return { text: `${diffDays} days left`, color: "#FF9800" };
        return { text: `${diffDays} days left`, color: "#666" };
    };

    const renderItem = useCallback(
        ({ item }: { item: any }) => {
            const categoryColor = getCategoryColor(item.category || "");
            const deadline = item.deadline || item.end_date;
            const daysInfo = getDaysRemaining(deadline, item.expired);
            const description = stripHtml(item.summary || item.description || "");
            const title = item.name || item.title || "Scholarship";

            const isExpired = item.expired === true || daysInfo.text === "Expired";
            const hasApplied = item.has_applied === true;
            const isClosed = item.status === 'closed';
            const isActive = item.status === 'active';

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
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={[styles.scholarshipTitle, { color: colors.text }]} numberOfLines={2}>
                                        {title}
                                    </Text>
                                    {item.provider && (
                                        <Text style={[styles.providerText, { color: colors.textSecondary }]}>
                                            by {item.provider}
                                        </Text>
                                    )}
                                </View>
                                <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                    <View
                                        style={[
                                            styles.categoryBadge,
                                            { backgroundColor: `${categoryColor} 15` },
                                        ]}
                                    >
                                        <Text
                                            style={[styles.categoryBadgeText, { color: categoryColor }]}
                                        >
                                            {item.category || "General"}
                                        </Text>
                                    </View>

                                    {hasApplied && (
                                        <View style={[styles.statusBadge, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                                            <Ionicons name="checkmark-circle" size={10} color="#4CAF50" />
                                            <Text style={[styles.statusBadgeText, { color: '#4CAF50' }]}>Applied</Text>
                                        </View>
                                    )}
                                    {!hasApplied && isExpired && (
                                        <View style={[styles.statusBadge, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
                                            <Text style={[styles.statusBadgeText, { color: '#F44336' }]}>Expired</Text>
                                        </View>
                                    )}
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
                            <Text style={[styles.amountText, { color: isExpired || isClosed ? '#F44336' : '#4CAF50' }]}>
                                {isExpired ? "Expired" : isClosed ? "Closed" : isActive ? "Open" : "Open"}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => handleUnbookmark(item.id)}
                            disabled={bookmarking[item.id]}
                            style={[styles.bookmarkBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9" }]}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="bookmark"
                                size={22}
                                color="#FFB400"
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
                                    {deadline && !isExpired && (
                                        <Text
                                            style={[styles.daysRemaining, { color: daysInfo.color }]}
                                        >
                                            • {daysInfo.text}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>

                        {(item.category || item.location) && (
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
                                    <Text style={[styles.detailText, { color: colors.text }]}>{item.category || item.location}</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                            onPress={() =>
                                router.push({
                                    pathname: "/(dashboard)/mobilizer/mobilizer-scholarship-details",
                                    params: { scholarshipId: item.id },
                                })
                            }
                            style={[
                                styles.viewBtn,
                                {
                                    backgroundColor: 'transparent',
                                    borderWidth: 1,
                                    borderColor: colors.border
                                }
                            ]}
                        >
                            <Ionicons name="eye-outline" size={18} color={colors.text} />
                            <Text style={[styles.viewBtnText, { color: colors.text }]}>Details</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() =>
                                router.push({
                                    pathname: "/(dashboard)/mobilizer/mobilizer-apply-form",
                                    params: { scholarshipId: item.id },
                                })
                            }
                            disabled={isExpired || hasApplied || isClosed}
                            style={[
                                styles.applyBtn,
                                { backgroundColor: categoryColor },
                                (isExpired || hasApplied || isClosed) && {
                                    backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#e0e0e0",
                                    opacity: 1
                                }
                            ]}
                        >
                            <Ionicons
                                name={hasApplied ? "checkmark-circle" : (isExpired || isClosed) ? "close-circle" : "paper-plane"}
                                size={18}
                                color={(isExpired || hasApplied || isClosed) ? (isDark ? colors.textSecondary : "#666") : "#fff"}
                            />
                            <Text style={[
                                styles.applyBtnText,
                                (isExpired || hasApplied || isClosed) && { color: isDark ? colors.textSecondary : "#666" }
                            ]}>
                                {hasApplied ? "Applied" : isExpired ? "Expired" : isClosed ? "Closed" : "Apply Now"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        },
        [colors, isDark, handleUnbookmark, bookmarking]
    );

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#f2c44d" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#121212" : "#fff"} />
            <LinearGradient
                colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#FFF8E1"]}
                style={styles.background}
                locations={[0, 0.4, 1]}
            />
            <AppHeader
                title="Bookmarked Scholarships"
                onBack={() => router.back()}
            />
            <View style={styles.searchContainer}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onClear={() => setSearchQuery("")}
                    placeholder="Search bookmarked scholarships..."
                />
            </View>
            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={scholarships}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="bookmark-outline" size={64} color="#ccc" />
                            <Text style={[styles.emptyStateText, { color: colors.text }]}>
                                No bookmarked scholarships
                            </Text>
                            <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                                Scholarships you bookmark will appear here
                            </Text>
                        </View>
                    }
                />
            )}
            <Toast
                visible={toastVisible}
                message={toastMessage}
                type={toastType}
                onHide={() => setToastVisible(false)}
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
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        paddingTop: 8,
    },
    scholarshipCard: {
        borderRadius: 16,
        borderLeftWidth: 4,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    scholarshipHeader: {
        marginBottom: 12,
    },
    scholarshipInfo: {
        flex: 1,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    scholarshipTitle: {
        fontSize: 17,
        fontWeight: "700",
        marginBottom: 4,
    },
    providerText: {
        fontSize: 13,
        marginTop: 2,
    },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryBadgeText: {
        fontSize: 11,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    scholarshipDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    amountRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 12,
        marginBottom: 12,
        borderBottomWidth: 1,
    },
    amountContainer: {
        flex: 1,
    },
    amountLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    amountText: {
        fontSize: 16,
        fontWeight: "700",
    },
    bookmarkBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    scholarshipDetails: {
        gap: 12,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    detailIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    detailText: {
        fontSize: 14,
        fontWeight: "600",
    },
    deadlineRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    daysRemaining: {
        fontSize: 12,
        fontWeight: "600",
    },
    cardActionsRow: {
        flexDirection: "row",
        gap: 10,
    },
    viewBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    viewBtnText: {
        fontSize: 14,
        fontWeight: "600",
    },
    applyBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    applyBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#fff",
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        textAlign: "center",
    },
});
