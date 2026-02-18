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

    const formatCurrency = (amount: number | null) => {
        if (amount === null || amount === 0) return "N/A";
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
        return `₹${amount}`;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "No Date";
        return new Date(dateString).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
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

    const renderItem = ({ item, index }: { item: Scholarship; index: number }) => {
        const cfg = getStatusConfig(item.status);
        const daysLeft = getDaysLeft(item.end_date);
        const isExpired = daysLeft !== null && daysLeft < 0;
        const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
        const fillPercent = item.total_seats && item.applications_count
            ? Math.min((item.applications_count / item.total_seats) * 100, 100)
            : null;
        const statusCfg = getStatusConfig(item.status);
        const daysColor = isExpired ? "#EF4444" : isUrgent ? "#F59E0B" : "#10B981";
        const daysLightBg = isExpired ? "#FEF2F2" : isUrgent ? "#FFFBEB" : "#ECFDF5";
        const daysDarkBg = isExpired ? "rgba(239,68,68,0.15)" : isUrgent ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)";

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
                        params: { scheme: JSON.stringify(item) }
                    })}
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                            shadowColor: isDark ? "#000" : "#94A3B8",
                            borderColor: isDark ? "#334155" : "#E8EDF5",
                        }
                    ]}
                >
                    {/* Top accent bar — thick */}
                    <LinearGradient
                        colors={cfg.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.cardAccentBar}
                    />

                    {/* ── HEADER ── */}
                    <View style={styles.cardHeader}>
                        {/* Avatar */}
                        <LinearGradient colors={cfg.gradient} style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>{getInitials(item.title)}</Text>
                        </LinearGradient>

                        {/* Title + provider */}
                        <View style={styles.cardHeaderContent}>
                            <Text numberOfLines={1} style={[styles.cardTitle, { color: isDark ? "#F1F5F9" : "#0F172A" }]}>
                                {item.title}
                            </Text>
                            <View style={styles.providerRow}>
                                <MaterialCommunityIcons name="file-document-outline" size={12} color={isDark ? "#64748B" : "#94A3B8"} />
                                <Text style={[styles.providerText, { color: isDark ? "#64748B" : "#94A3B8" }]} numberOfLines={1}>
                                    {item.provider_name || "Unknown Provider"}
                                </Text>
                            </View>
                        </View>

                        {/* Right badges */}
                        <View style={styles.headerBadges}>
                            <StatusBadge status={item.status} />
                            <View style={[styles.categoryChipWrap, { backgroundColor: isDark ? "rgba(99,102,241,0.12)" : "#EEF2FF" }]}>
                                <Ionicons name="location-outline" size={11} color={isDark ? "#818CF8" : "#6366F1"} />
                                <Text style={[styles.categoryChipText, { color: isDark ? "#818CF8" : "#4F46E5" }]}>{item.category}</Text>
                            </View>
                        </View>
                    </View>

                    {/* ── STATS GRID ── */}
                    <View style={styles.statsGrid}>
                        {/* Fund */}
                        <View style={[styles.statBox, { backgroundColor: isDark ? "rgba(99,102,241,0.12)" : "#F0EEFF" }]}>
                            <View style={styles.statIconCircle}>
                                <Ionicons name="cash-outline" size={18} color={isDark ? "#818CF8" : "#6366F1"} />
                                <View style={[styles.statCheckDot, { backgroundColor: isDark ? "#818CF8" : "#6366F1" }]}>
                                    <Ionicons name="checkmark" size={7} color="#fff" />
                                </View>
                            </View>
                            <Text style={[styles.statBoxValue, { color: isDark ? "#818CF8" : "#4F46E5" }]}>{formatCurrency(item.fund_amount)}</Text>
                            <Text style={[styles.statBoxLabel, { color: isDark ? "#64748B" : "#94A3B8" }]}>Fund Size</Text>
                        </View>

                        {/* Applicants */}
                        <View style={[styles.statBox, { backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "#EDFAF4" }]}>
                            <View style={styles.statIconCircle}>
                                <Ionicons name="people-outline" size={18} color={isDark ? "#34D399" : "#10B981"} />
                                <View style={[styles.statCheckDot, { backgroundColor: isDark ? "#34D399" : "#10B981" }]}>
                                    <Ionicons name="checkmark" size={7} color="#fff" />
                                </View>
                            </View>
                            <Text style={[styles.statBoxValue, { color: isDark ? "#34D399" : "#059669" }]}>{item.applications_count}</Text>
                            <Text style={[styles.statBoxLabel, { color: isDark ? "#64748B" : "#94A3B8" }]}>Applicants</Text>
                        </View>

                        {/* Seats */}
                        <View style={[styles.statBox, { backgroundColor: isDark ? "rgba(245,158,11,0.12)" : "#FFF8EC" }]}>
                            <View style={styles.statIconCircle}>
                                <MaterialCommunityIcons name="seat-outline" size={18} color={isDark ? "#FBBF24" : "#F59E0B"} />
                                <View style={[styles.statCheckDot, { backgroundColor: isDark ? "#FBBF24" : "#F59E0B" }]}>
                                    <Ionicons name="checkmark" size={7} color="#fff" />
                                </View>
                            </View>
                            <Text style={[styles.statBoxValue, { color: isDark ? "#FBBF24" : "#D97706" }]}>{item.total_seats ?? "∞"}</Text>
                            <Text style={[styles.statBoxLabel, { color: isDark ? "#64748B" : "#94A3B8" }]}>Total Seats</Text>
                        </View>
                    </View>

                    {/* ── SEAT FILL RATE ── */}
                    {fillPercent !== null && (
                        <View style={styles.progressSection}>
                            <View style={styles.progressLabelRow}>
                                <View style={styles.progressLabelLeft}>
                                    <Ionicons name="bar-chart-outline" size={14} color={isDark ? "#818CF8" : "#6366F1"} />
                                    <Text style={[styles.progressLabel, { color: isDark ? "#CBD5E1" : "#374151" }]}>Seat Fill Rate</Text>
                                </View>
                                <View style={styles.progressRightGroup}>
                                    <Text style={[styles.progressSeats, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                                        {item.applications_count}/{item.total_seats} Seats Filled
                                    </Text>
                                    <View style={[styles.progressPctBadge, {
                                        backgroundColor: fillPercent >= 80
                                            ? (isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2")
                                            : fillPercent >= 50
                                                ? (isDark ? "rgba(245,158,11,0.15)" : "#FFFBEB")
                                                : (isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5")
                                    }]}>
                                        <View style={[styles.progressPctDot, {
                                            backgroundColor: fillPercent >= 80 ? "#EF4444" : fillPercent >= 50 ? "#F59E0B" : "#10B981"
                                        }]} />
                                        <Text style={[styles.progressPctText, {
                                            color: fillPercent >= 80
                                                ? (isDark ? "#F87171" : "#DC2626")
                                                : fillPercent >= 50
                                                    ? (isDark ? "#FBBF24" : "#D97706")
                                                    : (isDark ? "#34D399" : "#059669")
                                        }]}>{fillPercent.toFixed(0)}%</Text>
                                    </View>
                                </View>
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

                    {/* ── DATE SECTION ── */}
                    <View style={[styles.dateRow, { borderTopColor: isDark ? "#334155" : "#F1F5F9" }]}>
                        {/* Start Date */}
                        <View style={styles.dateCol}>
                            <View style={styles.dateLabelRow}>
                                <Ionicons name="calendar-outline" size={14} color={isDark ? "#64748B" : "#94A3B8"} />
                                <Text style={[styles.dateLabel, { color: isDark ? "#64748B" : "#94A3B8" }]}>Start Date</Text>
                            </View>
                            <Text style={[styles.dateValue, { color: isDark ? "#F1F5F9" : "#0F172A" }]}>
                                {formatDate(item.start_date)}
                            </Text>
                        </View>

                        <View style={[styles.dateDivider, { backgroundColor: isDark ? "#334155" : "#E2E8F0" }]} />

                        {/* End Date */}
                        <View style={styles.dateCol}>
                            <View style={styles.dateLabelRow}>
                                <Ionicons name="calendar-outline" size={14} color={isDark ? "#64748B" : "#94A3B8"} />
                                <Text style={[styles.dateLabel, { color: isDark ? "#64748B" : "#94A3B8" }]}>End Date</Text>
                            </View>
                            <Text style={[styles.dateValue, {
                                color: isExpired ? (isDark ? "#F87171" : "#DC2626") :
                                    isUrgent ? (isDark ? "#FBBF24" : "#D97706") :
                                        (isDark ? "#F1F5F9" : "#0F172A")
                            }]}>
                                {item.end_date ? formatDate(item.end_date) : "Open Ended"}
                            </Text>
                        </View>

                        <View style={[styles.dateDivider, { backgroundColor: isDark ? "#334155" : "#E2E8F0" }]} />

                        {/* Days Left Box */}
                        {daysLeft !== null ? (
                            <View style={styles.daysLeftBox}>
                                <View style={styles.daysLeftHeader}>
                                    <Ionicons name="time-outline" size={13} color={isDark ? (isExpired ? "#F87171" : isUrgent ? "#FBBF24" : "#34D399") : daysColor} />
                                    <Text style={[styles.daysLeftTitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>Days Left</Text>
                                </View>
                                <Text style={[styles.daysLeftCount, { color: isDark ? (isExpired ? "#F87171" : isUrgent ? "#FBBF24" : "#34D399") : daysColor }]}>
                                    {isExpired ? "Expired" : `${daysLeft} Days Left`}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.daysLeftBox}>
                                <Ionicons name="infinite-outline" size={20} color={isDark ? "#818CF8" : "#6366F1"} />
                                <Text style={[styles.daysLeftCount, { color: isDark ? "#818CF8" : "#4F46E5", fontSize: 11 }]}>Open Ended</Text>
                            </View>
                        )}
                    </View>

                    {/* ── FOOTER ── */}
                    <View style={[styles.cardFooter, { borderTopColor: isDark ? "#334155" : "#F1F5F9" }]}>
                        {/* Left: ID + shortname + copy + status */}
                        <View style={styles.footerLeft}>
                            <Text style={[styles.idText, { color: isDark ? "#475569" : "#94A3B8" }]}>ID #{item.id}</Text>
                            {item.shortname && (
                                <View style={[styles.shortnamePill, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}>
                                    <Text style={[styles.shortnameText, { color: isDark ? "#94A3B8" : "#64748B" }]} numberOfLines={1}>
                                        {item.shortname.length > 16 ? item.shortname.substring(0, 16) + "..." : item.shortname}
                                    </Text>
                                    <Ionicons name="copy-outline" size={11} color={isDark ? "#64748B" : "#94A3B8"} />
                                </View>
                            )}
                        </View>

                        {/* Divider */}
                        <View style={[styles.footerDivider, { backgroundColor: isDark ? "#334155" : "#E2E8F0" }]} />

                        {/* View Details */}
                        <TouchableOpacity
                            style={[styles.viewBtn, { borderColor: isDark ? "#818CF8" : "#6366F1" }]}
                            onPress={() => router.push({
                                pathname: "/(dashboard)/provider/my-scheme-details",
                                params: { scheme: JSON.stringify(item) }
                            })}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.viewBtnText, { color: isDark ? "#818CF8" : "#4F46E5" }]}>View Details</Text>
                            <Ionicons name="arrow-forward" size={14} color={isDark ? "#818CF8" : "#4F46E5"} />
                        </TouchableOpacity>
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
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
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
                                Try adjusting your search or filter
                            </Text>
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
        marginTop: 10
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: "500" },
    clearBtn: { padding: 4 },

    // Tabs
    tabsWrapper: { maxHeight: 46 },
    tabsContent: { gap: 8, alignItems: "center" },
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
        borderRadius: 18,
        borderWidth: 1,
        overflow: "hidden",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 4,
        marginBottom: 2,
    },
    cardAccentBar: { height: 6, width: "100%" },

    // Header
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 12,
        gap: 10,
    },
    avatarCircle: {
        width: 48, height: 48, borderRadius: 14,
        alignItems: "center", justifyContent: "center",
        flexShrink: 0,
    },
    avatarText: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
    cardHeaderContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: "700", lineHeight: 22, marginBottom: 3 },
    providerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    providerText: { fontSize: 12, fontWeight: "500" },
    headerBadges: { flexDirection: "column", alignItems: "flex-end", gap: 5 },
    categoryChipWrap: {
        flexDirection: "row", alignItems: "center", gap: 3,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    categoryChipText: { fontSize: 11, fontWeight: "600" },

    // Status Badge
    statusBadge: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 9, paddingVertical: 4,
        borderRadius: 20, borderWidth: 1, gap: 5,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: "700" },

    // Stats Grid
    statsGrid: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 14,
        paddingBottom: 14,
    },
    statBox: {
        flex: 1, borderRadius: 14,
        paddingVertical: 12, paddingHorizontal: 8,
        alignItems: "flex-start",
    },
    statIconCircle: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.6)",
        alignItems: "center", justifyContent: "center",
        marginBottom: 8, position: "relative",
    },
    statCheckDot: {
        position: "absolute", bottom: -2, right: -2,
        width: 14, height: 14, borderRadius: 7,
        alignItems: "center", justifyContent: "center",
        borderWidth: 1.5, borderColor: "#fff",
    },
    statBoxValue: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
    statBoxLabel: { fontSize: 11, fontWeight: "500" },

    // Progress
    progressSection: {
        paddingHorizontal: 14,
        paddingBottom: 14,
    },
    progressLabelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    progressLabelLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
    progressLabel: { fontSize: 13, fontWeight: "600" },
    progressRightGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
    progressSeats: { fontSize: 11, fontWeight: "500" },
    progressPctBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    },
    progressPctDot: { width: 6, height: 6, borderRadius: 3 },
    progressPctText: { fontSize: 11, fontWeight: "700" },
    progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
    progressFill: { height: 8, borderRadius: 4 },

    // Date Row
    dateRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderTopWidth: 1,
        gap: 0,
    },
    dateCol: { flex: 1, flexDirection: "column", gap: 4 },
    dateLabelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
    dateLabel: { fontSize: 12, fontWeight: "500" },
    dateValue: { fontSize: 11, fontWeight: "700" },
    dateDivider: { width: 1, height: 50, marginHorizontal: 10, marginTop: 2 },

    // Days Left Box
    daysLeftBox: {
        flex: 1,
        gap: 2,
    },
    daysLeftHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
    daysLeftTitle: { fontSize: 11, fontWeight: "500" },
    daysLeftCount: { fontSize: 11, fontWeight: "800", lineHeight: 18 },
    daysLeftFooter: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    daysLeftDot: { width: 5, height: 5, borderRadius: 3 },
    daysLeftSub: { fontSize: 10, fontWeight: "500" },

    // Card Footer
    cardFooter: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderTopWidth: 1,
        gap: 8,
    },
    footerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    idText: { fontSize: 12, fontWeight: "600" },
    shortnamePill: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    shortnameText: { fontSize: 11, fontWeight: "500", maxWidth: 110 },
    footerDivider: { width: 1, height: 28 },
    viewBtn: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1.5,
    },
    viewBtnText: { fontSize: 13, fontWeight: "700" },

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
        bottom: 60,
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
