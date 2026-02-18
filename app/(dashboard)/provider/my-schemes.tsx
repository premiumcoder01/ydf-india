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
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReviewerHeader from "../../../components/ReviewerHeader";

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

const TABS: Array<{ key: string; label: string; icon: string }> = [
    { key: "All", label: "All", icon: "apps-outline" },
    { key: "active", label: "Active", icon: "checkmark-circle-outline" },
    { key: "pending", label: "Pending", icon: "time-outline" },
    { key: "closed", label: "Closed", icon: "close-circle-outline" },
    { key: "draft", label: "Draft", icon: "document-outline" },
];

const STATUS_CONFIG: Record<string, { bg: string; darkBg: string; text: string; darkText: string; border: string; darkBorder: string; gradient: [string, string] }> = {
    active: {
        bg: "#ECFDF5", darkBg: "rgba(16,185,129,0.15)",
        text: "#059669", darkText: "#34D399",
        border: "#A7F3D0", darkBorder: "rgba(16,185,129,0.35)",
        gradient: ["#10B981", "#059669"],
    },
    closed: {
        bg: "#FEF2F2", darkBg: "rgba(239,68,68,0.15)",
        text: "#DC2626", darkText: "#F87171",
        border: "#FECACA", darkBorder: "rgba(239,68,68,0.35)",
        gradient: ["#EF4444", "#DC2626"],
    },
    pending: {
        bg: "#FFFBEB", darkBg: "rgba(245,158,11,0.15)",
        text: "#D97706", darkText: "#FBBF24",
        border: "#FDE68A", darkBorder: "rgba(245,158,11,0.35)",
        gradient: ["#F59E0B", "#D97706"],
    },
    draft: {
        bg: "#EEF2FF", darkBg: "rgba(99,102,241,0.15)",
        text: "#4F46E5", darkText: "#818CF8",
        border: "#C7D2FE", darkBorder: "rgba(99,102,241,0.35)",
        gradient: ["#6366F1", "#4F46E5"],
    },
};

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
            if (!refreshing) setLoading(true);
            const authDataString = await AsyncStorage.getItem("authData");
            if (!authDataString) { setLoading(false); return; }
            const authData = JSON.parse(authDataString);
            const token = authData?.token;
            if (!token) { setLoading(false); return; }

            const response = await getMyScholarships(token, { per_page: 100 });
            if (response.success && response.data && Array.isArray(response.data.data)) {
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
                    status: (item.status || (item.visible == 1 ? "active" : "draft")).toLowerCase(),
                    category: item.category || "General",
                    visible: !!item.visible,
                    provider_name: item.provider_name,
                    image: item.image,
                    created_at: item.created_at,
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

    const handleRefresh = () => { setRefreshing(true); fetchMySchemes(); };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return scholarships.filter((s) => {
            const matchesTab = activeTab === "All" || s.status === activeTab.toLowerCase();
            const matchesQuery =
                s.title.toLowerCase().includes(q) ||
                s.category.toLowerCase().includes(q) ||
                (s.shortname && s.shortname.toLowerCase().includes(q)) ||
                (s.provider_name && s.provider_name.toLowerCase().includes(q));
            return matchesTab && matchesQuery;
        });
    }, [scholarships, query, activeTab]);

    // Summary stats
    const stats = useMemo(() => ({
        total: scholarships.length,
        active: scholarships.filter(s => s.status === "active").length,
        totalApplicants: scholarships.reduce((sum, s) => sum + s.applications_count, 0),
        totalFunds: scholarships.reduce((sum, s) => sum + (s.fund_amount || 0), 0),
    }), [scholarships]);

    const formatCurrency = (amount: number | null) => {
        if (amount === null || amount === 0) return "N/A";
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
        return `₹${amount}`;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "No Date";
        return new Date(dateString).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    };

    const getDaysLeft = (endDate: string | null) => {
        if (!endDate) return null;
        const diff = new Date(endDate).getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    const getStatusConfig = (status: string) => {
        return STATUS_CONFIG[status.toLowerCase()] || STATUS_CONFIG["draft"];
    };

    const getInitials = (title: string) => {
        return title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const cfg = getStatusConfig(status);
        const bg = isDark ? cfg.darkBg : cfg.bg;
        const textColor = isDark ? cfg.darkText : cfg.text;
        const border = isDark ? cfg.darkBorder : cfg.border;
        const label = status.charAt(0).toUpperCase() + status.slice(1);
        return (
            <View style={[styles.statusBadge, { backgroundColor: bg, borderColor: border }]}>
                <View style={[styles.statusDot, { backgroundColor: textColor }]} />
                <Text style={[styles.statusText, { color: textColor }]}>{label}</Text>
            </View>
        );
    };

    const renderSummaryCard = () => (
        <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 400 }}
        >
            <LinearGradient
                colors={isDark ? ["#1E293B", "#0F172A"] : ["#6366F1", "#4F46E5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summaryCard}
            >
                {/* Decorative circles */}
                <View style={styles.decorCircle1} />
                <View style={styles.decorCircle2} />

                <Text style={styles.summaryTitle}>My Scholarship Programs</Text>
                <Text style={styles.summarySubtitle}>Overview of all your schemes</Text>

                <View style={styles.summaryStatsRow}>
                    <View style={styles.summaryStat}>
                        <Text style={styles.summaryStatValue}>{stats.total}</Text>
                        <Text style={styles.summaryStatLabel}>Total</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryStat}>
                        <Text style={styles.summaryStatValue}>{stats.active}</Text>
                        <Text style={styles.summaryStatLabel}>Active</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryStat}>
                        <Text style={styles.summaryStatValue}>{stats.totalApplicants}</Text>
                        <Text style={styles.summaryStatLabel}>Applicants</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryStat}>
                        <Text style={styles.summaryStatValue}>{formatCurrency(stats.totalFunds)}</Text>
                        <Text style={styles.summaryStatLabel}>Total Funds</Text>
                    </View>
                </View>
            </LinearGradient>
        </MotiView>
    );

    const renderItem = ({ item, index }: { item: Scholarship; index: number }) => {
        const cfg = getStatusConfig(item.status);
        const daysLeft = getDaysLeft(item.end_date);
        const isExpired = daysLeft !== null && daysLeft < 0;
        const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
        const fillPercent = item.total_seats && item.applications_count
            ? Math.min((item.applications_count / item.total_seats) * 100, 100)
            : null;

        return (
            <MotiView
                from={{ opacity: 0, translateY: 24 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 380, delay: index * 60 }}
            >
                <TouchableOpacity
                    activeOpacity={0.88}
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
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                            shadowColor: isDark ? "#000" : "#6366F1",
                            borderColor: isDark ? "#334155" : "rgba(99,102,241,0.08)",
                        }
                    ]}
                >
                    {/* Top accent bar */}
                    <LinearGradient
                        colors={cfg.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.cardAccentBar}
                    />

                    {/* Card Header */}
                    <View style={styles.cardHeader}>
                        {/* Avatar / Initials */}
                        <LinearGradient
                            colors={cfg.gradient}
                            style={styles.avatarCircle}
                        >
                            <Text style={styles.avatarText}>{getInitials(item.title)}</Text>
                        </LinearGradient>

                        <View style={styles.cardHeaderContent}>
                            <View style={styles.cardTitleRow}>
                                <Text numberOfLines={2} style={[styles.cardTitle, { color: isDark ? "#F8FAFC" : "#111827" }]}>
                                    {item.title}
                                </Text>
                                <StatusBadge status={item.status} />
                            </View>

                            <View style={styles.providerRow}>
                                <Ionicons name="business-outline" size={12} color={isDark ? "#64748B" : "#9CA3AF"} />
                                <Text style={[styles.providerText, { color: isDark ? "#64748B" : "#9CA3AF" }]} numberOfLines={1}>
                                    {item.provider_name || "Unknown Provider"}
                                </Text>
                                <Text style={[styles.dotSep, { color: isDark ? "#475569" : "#D1D5DB" }]}>•</Text>
                                <Text style={[styles.categoryChip, {
                                    backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF",
                                    color: isDark ? "#818CF8" : "#4F46E5"
                                }]}>
                                    {item.category}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={[styles.divider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        {/* Fund Amount */}
                        <View style={[styles.statBox, { backgroundColor: isDark ? "rgba(99,102,241,0.1)" : "#F5F3FF" }]}>
                            <View style={styles.statIconWrap}>
                                <Ionicons name="wallet-outline" size={15} color={isDark ? "#818CF8" : "#6366F1"} />
                            </View>
                            <Text style={[styles.statBoxValue, { color: isDark ? "#818CF8" : "#4F46E5" }]}>
                                {formatCurrency(item.fund_amount)}
                            </Text>
                            <Text style={[styles.statBoxLabel, { color: isDark ? "#64748B" : "#9CA3AF" }]}>Fund Size</Text>
                        </View>

                        {/* Applicants */}
                        <View style={[styles.statBox, { backgroundColor: isDark ? "rgba(16,185,129,0.1)" : "#F0FDF4" }]}>
                            <View style={styles.statIconWrap}>
                                <Ionicons name="people-outline" size={15} color={isDark ? "#34D399" : "#10B981"} />
                            </View>
                            <Text style={[styles.statBoxValue, { color: isDark ? "#34D399" : "#059669" }]}>
                                {item.applications_count}
                            </Text>
                            <Text style={[styles.statBoxLabel, { color: isDark ? "#64748B" : "#9CA3AF" }]}>Applicants</Text>
                        </View>

                        {/* Total Seats */}
                        <View style={[styles.statBox, { backgroundColor: isDark ? "rgba(245,158,11,0.1)" : "#FFFBEB" }]}>
                            <View style={styles.statIconWrap}>
                                <MaterialCommunityIcons name="seat-outline" size={15} color={isDark ? "#FBBF24" : "#F59E0B"} />
                            </View>
                            <Text style={[styles.statBoxValue, { color: isDark ? "#FBBF24" : "#D97706" }]}>
                                {item.total_seats ?? "∞"}
                            </Text>
                            <Text style={[styles.statBoxLabel, { color: isDark ? "#64748B" : "#9CA3AF" }]}>Total Seats</Text>
                        </View>
                    </View>

                    {/* Fill Rate Progress Bar */}
                    {fillPercent !== null && (
                        <View style={styles.progressSection}>
                            <View style={styles.progressLabelRow}>
                                <Text style={[styles.progressLabel, { color: isDark ? "#94A3B8" : "#6B7280" }]}>
                                    Seat Fill Rate
                                </Text>
                                <Text style={[styles.progressPct, { color: isDark ? "#F8FAFC" : "#111827" }]}>
                                    {item.applications_count}/{item.total_seats} ({fillPercent.toFixed(0)}%)
                                </Text>
                            </View>
                            <View style={[styles.progressTrack, { backgroundColor: isDark ? "#334155" : "#E5E7EB" }]}>
                                <LinearGradient
                                    colors={fillPercent >= 80 ? ["#EF4444", "#DC2626"] : fillPercent >= 50 ? ["#F59E0B", "#D97706"] : ["#10B981", "#059669"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.progressFill, { width: `${fillPercent}%` }]}
                                />
                            </View>
                        </View>
                    )}

                    {/* Date Row */}
                    <View style={[styles.dateRow, { borderTopColor: isDark ? "#334155" : "#F1F5F9" }]}>
                        <View style={styles.dateItem}>
                            <Ionicons name="play-circle-outline" size={14} color={isDark ? "#64748B" : "#9CA3AF"} />
                            <Text style={[styles.dateLabel, { color: isDark ? "#64748B" : "#9CA3AF" }]}>Start</Text>
                            <Text style={[styles.dateValue, { color: isDark ? "#CBD5E1" : "#374151" }]}>
                                {formatDate(item.start_date)}
                            </Text>
                        </View>

                        <View style={[styles.dateDivider, { backgroundColor: isDark ? "#334155" : "#E5E7EB" }]} />

                        <View style={styles.dateItem}>
                            <Ionicons name="flag-outline" size={14} color={isDark ? "#64748B" : "#9CA3AF"} />
                            <Text style={[styles.dateLabel, { color: isDark ? "#64748B" : "#9CA3AF" }]}>Deadline</Text>
                            <Text style={[styles.dateValue, {
                                color: isExpired ? (isDark ? "#F87171" : "#DC2626") :
                                    isUrgent ? (isDark ? "#FBBF24" : "#D97706") :
                                        (isDark ? "#CBD5E1" : "#374151")
                            }]}>
                                {item.end_date ? formatDate(item.end_date) : "Open Ended"}
                            </Text>
                        </View>

                        {daysLeft !== null && (
                            <View style={[
                                styles.daysLeftBadge,
                                {
                                    backgroundColor: isExpired
                                        ? (isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2")
                                        : isUrgent
                                            ? (isDark ? "rgba(245,158,11,0.15)" : "#FFFBEB")
                                            : (isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5"),
                                }
                            ]}>
                                <Text style={[styles.daysLeftText, {
                                    color: isExpired ? (isDark ? "#F87171" : "#DC2626") :
                                        isUrgent ? (isDark ? "#FBBF24" : "#D97706") :
                                            (isDark ? "#34D399" : "#059669")
                                }]}>
                                    {isExpired ? "Expired" : `${daysLeft}d left`}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Footer: ID + Arrow */}
                    <View style={[styles.cardFooter, { borderTopColor: isDark ? "#334155" : "#F1F5F9" }]}>
                        <View style={styles.idBadge}>
                            <Text style={[styles.idText, { color: isDark ? "#475569" : "#9CA3AF" }]}>
                                ID #{item.id}
                            </Text>
                            {item.shortname && (
                                <Text style={[styles.shortnamePill, {
                                    backgroundColor: isDark ? "#334155" : "#F3F4F6",
                                    color: isDark ? "#94A3B8" : "#6B7280"
                                }]} numberOfLines={1}>
                                    {item.shortname.length > 20 ? item.shortname.substring(0, 20) + "…" : item.shortname}
                                </Text>
                            )}
                        </View>
                        <View style={[styles.viewBtn, { backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF" }]}>
                            <Text style={[styles.viewBtnText, { color: isDark ? "#818CF8" : "#4F46E5" }]}>View Details</Text>
                            <Ionicons name="arrow-forward" size={13} color={isDark ? "#818CF8" : "#4F46E5"} />
                        </View>
                    </View>
                </TouchableOpacity>
            </MotiView>
        );
    };

    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = { All: scholarships.length };
        scholarships.forEach(s => {
            const k = s.status.toLowerCase();
            counts[k] = (counts[k] || 0) + 1;
        });
        return counts;
    }, [scholarships]);

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#0F172A" : "#F5F6FA" }]}>
            <ReviewerHeader
                title="Manage Schemes"
                subtitle="Overview of your scholarship programs"
            />

            <FlatList
                data={filtered}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 110 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={isDark ? "#818CF8" : "#6366F1"} />
                }
                ListHeaderComponent={
                    <View>
                        {/* Summary Banner */}
                        {renderSummaryCard()}

                        {/* Search Bar */}
                        <View style={[
                            styles.searchWrapper,
                            {
                                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                                borderColor: isDark ? "#334155" : "#E5E7EB",
                                shadowColor: isDark ? "#000" : "#6366F1",
                            }
                        ]}>
                            <Ionicons name="search" size={19} color={isDark ? "#64748B" : "#9CA3AF"} />
                            <TextInput
                                placeholder="Search by title, provider, category..."
                                placeholderTextColor={isDark ? "#475569" : "#9CA3AF"}
                                style={[styles.searchInput, { color: isDark ? "#F8FAFC" : "#111827" }]}
                                value={query}
                                onChangeText={setQuery}
                            />
                            {query.length > 0 && (
                                <TouchableOpacity onPress={() => setQuery("")} style={styles.clearBtn}>
                                    <Ionicons name="close-circle" size={18} color={isDark ? "#64748B" : "#9CA3AF"} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Filter Tabs */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.tabsContent}
                            style={styles.tabsWrapper}
                        >
                            {TABS.map((tab) => {
                                const isActive = activeTab === tab.key;
                                const count = tabCounts[tab.key === "All" ? "All" : tab.key.toLowerCase()] || 0;
                                return (
                                    <TouchableOpacity
                                        key={tab.key}
                                        onPress={() => setActiveTab(tab.key)}
                                        style={[
                                            styles.tabItem,
                                            isActive
                                                ? { backgroundColor: isDark ? "#818CF8" : "#6366F1" }
                                                : {
                                                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                                                    borderWidth: 1,
                                                    borderColor: isDark ? "#334155" : "#E5E7EB",
                                                }
                                        ]}
                                    >
                                        <Ionicons
                                            name={tab.icon as any}
                                            size={14}
                                            color={isActive ? "#FFFFFF" : (isDark ? "#64748B" : "#9CA3AF")}
                                        />
                                        <Text style={[
                                            styles.tabText,
                                            isActive ? { color: "#FFFFFF" } : { color: isDark ? "#94A3B8" : "#6B7280" }
                                        ]}>
                                            {tab.label}
                                        </Text>
                                        {count > 0 && (
                                            <View style={[
                                                styles.tabCount,
                                                {
                                                    backgroundColor: isActive ? "rgba(255,255,255,0.25)" : (isDark ? "#334155" : "#F3F4F6"),
                                                }
                                            ]}>
                                                <Text style={[
                                                    styles.tabCountText,
                                                    { color: isActive ? "#FFFFFF" : (isDark ? "#94A3B8" : "#6B7280") }
                                                ]}>
                                                    {count}
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Results count */}
                        {!loading && (
                            <View style={styles.resultsRow}>
                                <Text style={[styles.resultsText, { color: isDark ? "#64748B" : "#9CA3AF" }]}>
                                    {filtered.length} scheme{filtered.length !== 1 ? "s" : ""} found
                                </Text>
                            </View>
                        )}
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={isDark ? "#818CF8" : "#6366F1"} />
                            <Text style={[styles.loadingText, { color: isDark ? "#64748B" : "#9CA3AF" }]}>
                                Loading schemes...
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <LinearGradient
                                colors={isDark ? ["#1E293B", "#0F172A"] : ["#EEF2FF", "#E0E7FF"]}
                                style={styles.emptyIconWrap}
                            >
                                <MaterialCommunityIcons name="file-document-outline" size={44} color={isDark ? "#818CF8" : "#6366F1"} />
                            </LinearGradient>
                            <Text style={[styles.emptyTitle, { color: isDark ? "#F8FAFC" : "#111827" }]}>
                                No Schemes Found
                            </Text>
                            <Text style={[styles.emptySub, { color: isDark ? "#64748B" : "#9CA3AF" }]}>
                                {query ? "Try adjusting your search or filter." : "You haven't created any schemes yet."}
                            </Text>
                            {!query && (
                                <TouchableOpacity
                                    style={[styles.emptyCreateBtn, { backgroundColor: isDark ? "#818CF8" : "#6366F1" }]}
                                    onPress={() => router.push("/(dashboard)/provider/add-scholarship")}
                                >
                                    <Ionicons name="add" size={18} color="#fff" />
                                    <Text style={styles.emptyCreateText}>Create First Scheme</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )
                }
            />

            {/* FAB */}
            <TouchableOpacity
                style={styles.fabShadow}
                onPress={() => router.push("/(dashboard)/provider/add-scholarship")}
                activeOpacity={0.85}
            >
                <LinearGradient
                    colors={["#818CF8", "#6366F1"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fab}
                >
                    <Ionicons name="add" size={26} color="#fff" />
                    <Text style={styles.fabText}>New Scheme</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Summary Card
    summaryCard: {
        marginTop: 16,
        marginBottom: 14,
        borderRadius: 20,
        padding: 20,
        overflow: "hidden",
        position: "relative",
    },
    decorCircle1: {
        position: "absolute", width: 120, height: 120, borderRadius: 60,
        backgroundColor: "rgba(255,255,255,0.06)", top: -30, right: -20,
    },
    decorCircle2: {
        position: "absolute", width: 80, height: 80, borderRadius: 40,
        backgroundColor: "rgba(255,255,255,0.04)", bottom: -20, left: 40,
    },
    summaryTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginBottom: 2 },
    summarySubtitle: { fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 18 },
    summaryStatsRow: { flexDirection: "row", alignItems: "center" },
    summaryStat: { flex: 1, alignItems: "center" },
    summaryStatValue: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
    summaryStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2, fontWeight: "500" },
    summaryDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.15)" },

    // Search
    searchWrapper: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: "500" },
    clearBtn: { padding: 4 },

    // Tabs
    tabsWrapper: { maxHeight: 46 },
    tabsContent: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
    tabItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 22,
        gap: 5,
        height: 36,
    },
    tabText: { fontSize: 13, fontWeight: "600" },
    tabCount: {
        minWidth: 20, height: 18, borderRadius: 9,
        alignItems: "center", justifyContent: "center", paddingHorizontal: 10,
    },
    tabCountText: { fontSize: 10, fontWeight: "700" },

    // Results
    resultsRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    resultsText: { fontSize: 13, fontWeight: "500" },

    // List
    listContent: { paddingHorizontal: 16, paddingTop: 0, gap: 14 },

    // Card
    card: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: "hidden",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardAccentBar: { height: 4, width: "100%" },
    cardHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 14,
        paddingBottom: 0,
        gap: 12,
    },
    avatarCircle: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
        flexShrink: 0,
    },
    avatarText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
    cardHeaderContent: { flex: 1 },
    cardTitleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 8,
        marginBottom: 6,
    },
    cardTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: "700",
        lineHeight: 21,
    },
    providerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        flexWrap: "wrap",
    },
    providerText: { fontSize: 12, fontWeight: "500", flex: 1 },
    dotSep: { fontSize: 12 },
    categoryChip: {
        fontSize: 11, fontWeight: "600",
        paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 6,
    },

    // Status Badge
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        gap: 5,
        flexShrink: 0,
    },
    statusDot: { width: 5, height: 5, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },

    // Divider
    divider: { height: 1, marginHorizontal: 14, marginTop: 14, marginBottom: 0 },

    // Stats Grid
    statsGrid: {
        flexDirection: "row",
        gap: 8,
        padding: 14,
        paddingTop: 12,
    },
    statBox: {
        flex: 1,
        borderRadius: 12,
        padding: 10,
        alignItems: "center",
        gap: 3,
    },
    statIconWrap: { marginBottom: 2 },
    statBoxValue: { fontSize: 15, fontWeight: "800" },
    statBoxLabel: { fontSize: 10, fontWeight: "500" },

    // Progress
    progressSection: {
        paddingHorizontal: 14,
        paddingBottom: 12,
    },
    progressLabelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    progressLabel: { fontSize: 11, fontWeight: "500" },
    progressPct: { fontSize: 11, fontWeight: "700" },
    progressTrack: {
        height: 6, borderRadius: 3, overflow: "hidden",
    },
    progressFill: { height: 6, borderRadius: 3 },

    // Date Row
    dateRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopWidth: 1,
        gap: 8,
    },
    dateItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
    dateLabel: { fontSize: 11, fontWeight: "500" },
    dateValue: { fontSize: 11, fontWeight: "700" },
    dateDivider: { width: 1, height: 24 },
    daysLeftBadge: {
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    daysLeftText: { fontSize: 11, fontWeight: "700" },

    // Card Footer
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopWidth: 1,
    },
    idBadge: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    idText: { fontSize: 11, fontWeight: "600" },
    shortnamePill: {
        fontSize: 10, fontWeight: "500",
        paddingHorizontal: 7, paddingVertical: 2,
        borderRadius: 6, maxWidth: 140,
    },
    viewBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    viewBtnText: { fontSize: 12, fontWeight: "700" },

    // Loading
    loadingContainer: {
        flex: 1, justifyContent: "center", alignItems: "center",
        paddingTop: 60, gap: 12,
    },
    loadingText: { fontSize: 14, fontWeight: "500" },

    // Empty State
    emptyState: {
        alignItems: "center", justifyContent: "center",
        paddingTop: 50, gap: 12,
    },
    emptyIconWrap: {
        width: 90, height: 90, borderRadius: 24,
        alignItems: "center", justifyContent: "center",
        marginBottom: 4,
    },
    emptyTitle: { fontSize: 20, fontWeight: "800" },
    emptySub: { fontSize: 14, textAlign: "center", maxWidth: "70%", lineHeight: 20 },
    emptyCreateBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8,
    },
    emptyCreateText: { color: "#fff", fontSize: 15, fontWeight: "700" },

    // FAB
    fabShadow: {
        position: "absolute",
        bottom: 50,
        right: 20,
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 12,
    },
    fab: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 50,
        gap: 8,
    },
    fabText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
