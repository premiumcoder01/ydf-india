import { useTheme } from "@/context/ThemeContext";
import { getMyScholarships } from "@/utils/api";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { MotiView } from "moti";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReviewerHeader from "../../../components/ReviewerHeader";

type ScholarshipStatus = "Active" | "Closed" | "Draft" | "Pending";

interface Scholarship {
    id: string;
    title: string;
    shortname?: string;
    description?: string;
    fund_amount: number | null;
    total_seats: number | null;
    start_date: string;
    end_date: string | null;
    applications_count: number;
    status: string;
    category: string;
    visible: boolean;
    provider_name?: string;
    image?: string;
    created_at?: string;
}

const TABS: Array<{ key: "All" | "Active" | "Pending" | "Closed" | "Draft"; label: string }> = [
    { key: "All", label: "All Schemes" },
    { key: "Active", label: "Active" },
    { key: "Pending", label: "Pending" },
    { key: "Closed", label: "Closed" },
    { key: "Draft", label: "Drafts" },
];

export default function MyCreatedSchemesScreen() {
    const { isDark, colors } = useTheme();
    const [query, setQuery] = useState("");
    const [activeTab, setActiveTab] = useState<string>("All");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [scholarships, setScholarships] = useState<Scholarship[]>([]);
    const insets = useSafeAreaInsets();

    useFocusEffect(
        useCallback(() => {
            fetchMySchemes();
        }, [])
    );

    const fetchMySchemes = async () => {
        try {
            if (!refreshing) setLoading(true); // Don't show full loader if refreshing
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

            const response = await getMyScholarships(token, { per_page: 100 });

            if (response.success && response.data && Array.isArray(response.data.data)) {
                // Map API response to our Scholarship type
                const apiSchemes = response.data.data.map((item: any) => ({
                    id: String(item.id),
                    title: item.title || item.fullname || "Untitled",
                    shortname: item.shortname,
                    description: item.description,
                    fund_amount: item.fund_amount ?? item.scholarship_amount ?? null,
                    total_seats: item.total_seats ?? null,
                    start_date: item.start_date,
                    end_date: item.end_date ?? item.enddate,
                    applications_count: item.applications_count || 0,
                    status: (item.status || (item.visible == 1 ? "Active" : "Draft")),
                    category: item.category || "General",
                    visible: !!item.visible,
                    provider_name: item.provider_name,
                    image: item.image,
                    created_at: item.created_at
                }));
                setScholarships(apiSchemes);
            }
        } catch (error) {
            console.error("Error fetching my schemes:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchMySchemes();
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return scholarships
            .filter((s) => {
                // Normalize status for comparison
                const sStatus = s.status.toLowerCase();
                const tabFilter = activeTab.toLowerCase();

                let matchesTab = true;
                if (activeTab !== "All") {
                    matchesTab = sStatus === tabFilter;
                }

                const matchesQuery =
                    s.title.toLowerCase().includes(q) ||
                    s.category.toLowerCase().includes(q) ||
                    (s.shortname && s.shortname.toLowerCase().includes(q));

                return matchesTab && matchesQuery;
            })
        // Sort by newest first (assuming higher ID is newer if no created_at, or just order by API)
        // The API response seems to have created_at descending implicitly or we should sort.
        // Let's rely on API order but ensure 'Active' might be interesting to see.
        // For now, API order is usually best unless specified.
    }, [scholarships, query, activeTab]);

    const formatCurrency = (amount: number | null) => {
        if (amount === null) return "N/A";
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "No Date";
        // Handle unix timestamp if it comes as number/string of numbers
        if (!isNaN(Number(dateString)) && dateString.length < 13) {
            return new Date(Number(dateString) * 1000).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
        }
        return new Date(dateString).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const StatusBadge = ({ status }: { status: string }) => {
        let bg = isDark ? "#1E293B" : "#F1F5F9";
        let text = isDark ? "#94A3B8" : "#64748B"; // Default gray
        let border = isDark ? "#334155" : "#E2E8F0";

        const s = status.toLowerCase();

        if (s === 'active') {
            bg = isDark ? "rgba(16, 185, 129, 0.2)" : "#ECFDF5";
            text = isDark ? "#34D399" : "#059669";
            border = isDark ? "rgba(16, 185, 129, 0.4)" : "#A7F3D0";
        } else if (s === 'closed') {
            bg = isDark ? "rgba(239, 68, 68, 0.2)" : "#FEF2F2";
            text = isDark ? "#F87171" : "#DC2626";
            border = isDark ? "rgba(239, 68, 68, 0.4)" : "#FECACA";
        } else if (s === 'pending') {
            bg = isDark ? "rgba(245, 158, 11, 0.2)" : "#FFFBEB";
            text = isDark ? "#FBBF24" : "#D97706";
            border = isDark ? "rgba(245, 158, 11, 0.4)" : "#FDE68A";
        } else if (s === 'draft') {
            bg = isDark ? "rgba(99, 102, 241, 0.2)" : "#EEF2FF";
            text = isDark ? "#818CF8" : "#4F46E5";
            border = isDark ? "rgba(99, 102, 241, 0.4)" : "#C7D2FE";
        }

        return (
            <View style={[styles.statusBadge, { backgroundColor: bg, borderColor: border }]}>
                <View style={[styles.statusDot, { backgroundColor: text }]} />
                <Text style={[styles.statusText, { color: text }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
            </View>
        );
    };

    const renderItem = ({ item, index }: { item: Scholarship; index: number }) => {
        return (
            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 350, delay: index * 50 }}
                style={[
                    styles.card,
                    {
                        backgroundColor: isDark ? colors.card : "#FFFFFF",
                        shadowColor: colors.shadow,
                        borderColor: isDark ? colors.border : 'transparent',
                        borderWidth: isDark ? 1 : 0
                    }
                ]}
            >
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push({
                        pathname: "/(dashboard)/provider/my-scheme-details",
                        params: {
                            id: item.id,
                            title: item.title,
                            status: item.status,
                            description: item.description || "",
                            fund_amount: item.fund_amount?.toString() || "0",
                            end_date: item.end_date || "",
                            applications_count: item.applications_count.toString(),
                            start_date: item.start_date,
                            shortname: item.shortname || "",
                            category: item.category,
                            total_seats: item.total_seats?.toString() || "",
                            provider_name: item.provider_name || "",
                        }
                    })}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.cardHeaderLeft}>
                            <Text numberOfLines={2} style={[styles.cardTitle, { color: colors.text }]}>
                                {item.title}
                            </Text>
                            <Text style={[styles.cardCategory, { color: colors.textSecondary }]}>
                                {item.category} • ID: {item.id}
                            </Text>
                        </View>
                        <StatusBadge status={item.status} />
                    </View>

                    <View style={[styles.divider, { backgroundColor: isDark ? colors.border : "#F1F5F9" }]} />

                    <View style={styles.statsContainer}>
                        <View style={styles.statCol}>
                            <View style={styles.statLabelRow}>
                                <Ionicons name="wallet-outline" size={14} color={colors.textSecondary} />
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}> Fund Size</Text>
                            </View>
                            <Text style={[styles.statValue, { color: colors.primary }]}>{formatCurrency(item.fund_amount)}</Text>
                        </View>

                        <View style={styles.statCol}>
                            <View style={styles.statLabelRow}>
                                <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}> Applicants</Text>
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>{item.applications_count}</Text>
                        </View>

                        <View style={styles.statCol}>
                            <View style={styles.statLabelRow}>
                                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}> Deadline</Text>
                            </View>
                            <Text style={[styles.statValue, { color: item.end_date ? colors.text : colors.textSecondary, fontSize: 13 }]}>
                                {item.end_date ? formatDate(item.end_date) : "No Deadline"}
                            </Text>
                        </View>
                    </View>

                    {/* Progress / Seats info if available */}
                    {item.total_seats && (
                        <View style={[styles.seatsContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC" }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <MaterialCommunityIcons name="seat-outline" size={16} color={colors.textSecondary} />
                                <Text style={[styles.seatsText, { color: colors.textSecondary }]}>
                                    Total Seats: <Text style={{ color: colors.text, fontWeight: '600' }}>{item.total_seats}</Text>
                                </Text>
                            </View>
                            {/* Could add a progress bar here if we knew how many seats were filled */}
                        </View>
                    )}

                </TouchableOpacity>
            </MotiView>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ReviewerHeader
                title="Manage Schemes"
                subtitle="Overview of your scholarship programs"
            />

            <View style={styles.headerSection}>
                {/* Search Bar */}
                <View style={[
                    styles.searchWrapper,
                    {
                        backgroundColor: isDark ? colors.card : "#fff",
                        borderColor: isDark ? colors.border : "#E2E8F0"
                    }
                ]}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} />
                    <TextInput
                        placeholder="Search by title, category..."
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={query}
                        onChangeText={setQuery}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery("")}>
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter Tabs */}
                <View style={styles.tabsWrapper}>
                    <FlatList
                        data={TABS}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsContent}
                        keyExtractor={(item) => item.key}
                        renderItem={({ item }) => {
                            const isActive = activeTab === item.key;
                            return (
                                <TouchableOpacity
                                    onPress={() => setActiveTab(item.key)}
                                    style={[
                                        styles.tabItem,
                                        isActive && { backgroundColor: colors.primary },
                                        !isActive && {
                                            backgroundColor: isDark ? colors.card : "#FFFFFF",
                                            borderWidth: 1,
                                            borderColor: isDark ? colors.border : "#E2E8F0"
                                        }
                                    ]}
                                >
                                    <Text style={[
                                        styles.tabText,
                                        isActive ? { color: "#FFFFFF" } : { color: colors.textSecondary }
                                    ]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconInfo, { backgroundColor: isDark ? colors.card : "#EEF2FF" }]}>
                                <MaterialCommunityIcons name="file-document-outline" size={40} color={colors.primary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Schemes Found</Text>
                            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                                {query ? "Try adjusting your search query." : "You haven't created any schemes yet."}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Create FAB */}
            <TouchableOpacity
                style={styles.fabShadow}
                onPress={() => router.push("/(dashboard)/provider/add-scholarship")}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[colors.primary, '#6366f1']} // Use a nice gradient based on primary color
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fab}
                >
                    <Ionicons name="add" size={28} color="#fff" />
                    <Text style={styles.fabText}>Create</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerSection: {
        paddingVertical: 12,
    },
    searchWrapper: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        paddingHorizontal: 14,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        fontWeight: "500",
    },
    tabsWrapper: {
        maxHeight: 40,
    },
    tabsContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    tabItem: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        height: 36,
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 13,
        fontWeight: "600",
    },
    listContent: {
        padding: 16,
        gap: 16,
    },
    card: {
        borderRadius: 20,
        padding: 16,
        // Shadow for iOS
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        // Elevation for Android
        elevation: 3,
        marginBottom: 8,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    cardHeaderLeft: {
        flex: 1,
        marginRight: 10,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: "700",
        marginBottom: 4,
        lineHeight: 24,
    },
    cardCategory: {
        fontSize: 13,
        fontWeight: "500",
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: "700",
    },
    divider: {
        height: 1,
        marginVertical: 14,
        opacity: 0.6
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    statCol: {
        flex: 1,
    },
    statLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: "500",
    },
    statValue: {
        fontSize: 14,
        fontWeight: "700",
    },
    seatsContainer: {
        marginTop: 14,
        padding: 10,
        borderRadius: 10,
    },
    seatsText: {
        fontSize: 13,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 50,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 60,
        gap: 12,
    },
    emptyIconInfo: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    emptySub: {
        fontSize: 14,
        textAlign: "center",
        maxWidth: "70%",
    },
    fabShadow: {
        position: "absolute",
        bottom: 30,
        right: 20,
        shadowColor: "#6366f1",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    fab: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 30,
        gap: 8,
    },
    fabText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
});
