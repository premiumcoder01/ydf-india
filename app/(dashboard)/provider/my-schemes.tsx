import { useTheme } from "@/context/ThemeContext";
import { getMyScholarships } from "@/utils/api";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { MotiView } from "moti";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReviewerHeader from "../../../components/ReviewerHeader";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
    status: "active" | "draft" | "closed";
    category: string;
    visible: boolean;
    provider_name?: string;
    image?: string;
    created_at?: string;
}

const TABS = [
    { key: "All", label: "All Schemes", icon: "albums-outline" as const, count_key: "all" },
    { key: "active", label: "Active", icon: "checkmark-circle-outline" as const, count_key: "active" },
    { key: "draft", label: "Drafts", icon: "document-text-outline" as const, count_key: "draft" },
    { key: "closed", label: "Closed", icon: "lock-closed-outline" as const, count_key: "closed" },
];

const STATUS_CONFIG = {
    active: {
        bg: "#ECFDF5", darkBg: "rgba(16,185,129,0.14)",
        text: "#059669", darkText: "#34D399",
        gradient: ["#34D399", "#10B981"] as [string, string],
        glow: "rgba(16,185,129,0.25)",
    },
    closed: {
        bg: "#FEF2F2", darkBg: "rgba(239,68,68,0.14)",
        text: "#DC2626", darkText: "#F87171",
        gradient: ["#F87171", "#EF4444"] as [string, string],
        glow: "rgba(239,68,68,0.25)",
    },
    draft: {
        bg: "#FFFBEB", darkBg: "rgba(245,158,11,0.14)",
        text: "#D97706", darkText: "#FBBF24",
        gradient: ["#FCD34D", "#F59E0B"] as [string, string],
        glow: "rgba(245,158,11,0.25)",
    },
};

// ─── Dot pattern background component ────────────────────────────────────────
const DotPattern = ({ isDark }: { isDark: boolean }) => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: 8 }).map((_, row) =>
            Array.from({ length: 6 }).map((_, col) => (
                <View
                    key={`${row}-${col}`}
                    style={{
                        position: "absolute",
                        top: row * 56 + 28,
                        left: col * 64 + 32,
                        width: 3,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: isDark ? "rgba(148,163,184,0.07)" : "rgba(100,116,139,0.08)",
                    }}
                />
            ))
        )}
    </View>
);

// ─── Filter Bottom Sheet ──────────────────────────────────────────────────────
const FilterModal = ({
    visible,
    onClose,
    activeTab,
    setActiveTab,
    counts,
    isDark,
}: {
    visible: boolean;
    onClose: () => void;
    activeTab: string;
    setActiveTab: (k: string) => void;
    counts: Record<string, number>;
    isDark: boolean;
}) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(300)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
                Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 340, duration: 260, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    return (
        <Modal transparent animationType="none" visible={visible} onRequestClose={onClose} statusBarTranslucent>
            {/* Backdrop */}
            <Animated.View style={[styles.modalBackdrop, { opacity: backdropAnim }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* Sheet */}
            <Animated.View
                style={[
                    styles.modalSheet,
                    {
                        backgroundColor: isDark ? "#121212" : "#FFFFFF",
                        transform: [{ translateY: slideAnim }],
                        paddingBottom: insets.bottom + 20,
                    },
                ]}
            >
                {/* Handle */}
                <View style={[styles.sheetHandle, { backgroundColor: isDark ? "#334155" : "#E2E8F0" }]} />

                <Text style={[styles.sheetTitle, { color: isDark ? "#F8FAFC" : "#121212" }]}>
                    Filter Schemes
                </Text>
                <Text style={[styles.sheetSubtitle, { color: isDark ? "#64748B" : "#94A3B8" }]}>
                    Select a category to narrow results
                </Text>

                <View style={styles.filterGrid}>
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.key;
                        const count = tab.key === "All" ? counts.all : counts[tab.key] ?? 0;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                onPress={() => { setActiveTab(tab.key); onClose(); }}
                                activeOpacity={0.8}
                                style={[
                                    styles.filterCard,
                                    {
                                        backgroundColor: isActive
                                            ? (isDark ? "#1D4ED8" : "#2563EB")
                                            : (isDark ? "#1E1E1E" : "#F8FAFC"),
                                        borderColor: isActive
                                            ? "transparent"
                                            : (isDark ? "#334155" : "#E2E8F0"),
                                        shadowColor: isActive ? "#2563EB" : "transparent",
                                        shadowOpacity: isActive ? 0.4 : 0,
                                        shadowRadius: 12,
                                        shadowOffset: { width: 0, height: 4 },
                                        elevation: isActive ? 8 : 0,
                                    },
                                ]}
                            >
                                <View style={[
                                    styles.filterCardIcon,
                                    { backgroundColor: isActive ? "rgba(255,255,255,0.18)" : (isDark ? "#121212" : "#EFF6FF") },
                                ]}>
                                    <Ionicons
                                        name={tab.icon}
                                        size={22}
                                        color={isActive ? "#FFFFFF" : (isDark ? "#60A5FA" : "#3B82F6")}
                                    />
                                </View>
                                <Text style={[
                                    styles.filterCardLabel,
                                    { color: isActive ? "#FFFFFF" : (isDark ? "#CBD5E1" : "#1E1E1E") },
                                ]}>
                                    {tab.label}
                                </Text>
                                <View style={[
                                    styles.filterCountBadge,
                                    { backgroundColor: isActive ? "rgba(255,255,255,0.22)" : (isDark ? "#121212" : "#E2E8F0") },
                                ]}>
                                    <Text style={[
                                        styles.filterCountText,
                                        { color: isActive ? "#FFFFFF" : (isDark ? "#94A3B8" : "#64748B") },
                                    ]}>
                                        {count}
                                    </Text>
                                </View>
                                {isActive && (
                                    <View style={styles.filterActiveCheck}>
                                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Animated.View>
        </Modal>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyCreatedSchemesScreen() {
    const { isDark } = useTheme();
    const [query, setQuery] = useState("");
    const [activeTab, setActiveTab] = useState<string>("All");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [scholarships, setScholarships] = useState<Scholarship[]>([]);
    const [filterVisible, setFilterVisible] = useState(false);
    const insets = useSafeAreaInsets();
    const scrollY = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        useCallback(() => { fetchMySchemes(); }, [])
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
                const apiSchemes = response.data.data.map((item: any) => {
                    const statusVal = String(item.status || "").toLowerCase();
                    const approval = String(item.approval_status || "").toLowerCase();
                    const isVis = !!item.visible;
                    let finalStatus: "active" | "draft" | "closed" = "draft";
                    if (statusVal === "closed" || approval === "closed") finalStatus = "closed";
                    else if (statusVal === "active" || approval === "approved") finalStatus = isVis ? "active" : "draft";
                    return {
                        id: String(item.id),
                        title: item.title || item.fullname || "Untitled Scheme",
                        shortname: item.shortname,
                        description: item.description,
                        fund_amount: item.fund_amount ?? item.scholarship_amount ?? null,
                        total_seats: item.total_seats ?? null,
                        start_date: item.start_date,
                        end_date: item.end_date ?? item.enddate,
                        applications_count: item.applications_count || 0,
                        status: finalStatus,
                        category: item.category || "General",
                        visible: isVis,
                        provider_name: item.provider_name,
                        image: item.image,
                        created_at: item.created_at,
                    };
                });
                setScholarships(apiSchemes);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const counts = useMemo(() => ({
        all: scholarships.length,
        active: scholarships.filter(s => s.status === "active").length,
        draft: scholarships.filter(s => s.status === "draft").length,
        closed: scholarships.filter(s => s.status === "closed").length,
    }), [scholarships]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return scholarships.filter(s => {
            const matchesTab = activeTab === "All" || s.status === activeTab;
            const matchesQuery = !q ||
                s.title.toLowerCase().includes(q) ||
                s.category.toLowerCase().includes(q) ||
                (s.shortname?.toLowerCase().includes(q)) ||
                (s.provider_name?.toLowerCase().includes(q));
            return matchesTab && matchesQuery;
        });
    }, [scholarships, query, activeTab]);

    const formatCurrency = (amount: number | null) => {
        if (!amount) return "--";
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
        return `₹${amount.toLocaleString("en-IN")}`;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Ongoing";
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "--";
        return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} '${d.getFullYear().toString().slice(-2)}`;
    };

    // ── Sticky top search bar ──────────────────────────────────────────────────
    const searchBarShadowOpacity = scrollY.interpolate({
        inputRange: [0, 20],
        outputRange: [0, 0.12],
        extrapolate: "clamp",
    });

    // ── Active filter label ────────────────────────────────────────────────────
    const activeTabLabel = TABS.find(t => t.key === activeTab)?.label ?? "All Schemes";
    const activeCount = activeTab === "All" ? counts.all : (counts as Record<string, number>)[activeTab] ?? 0;

    // ── Card renderer ──────────────────────────────────────────────────────────
    const renderItem = ({ item, index }: { item: Scholarship; index: number }) => {
        const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft;

        return (
            <MotiView
                from={{ opacity: 0, translateY: 24 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 380, delay: index * 55 }}
            >
                <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => router.push({
                        pathname: "/(dashboard)/provider/my-scheme-details",
                        params: { scheme: JSON.stringify(item) },
                    })}
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark ? "#121212" : "#FFFFFF",
                            borderColor: isDark ? "#1E1E1E" : "#F1F5F9",
                        },
                    ]}
                >
                    {/* ── Status side rail ── */}
                    <LinearGradient
                        colors={cfg.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.cardRail}
                    />

                    {/* ── Inner content ── */}
                    <View style={styles.cardInner}>
                        <View style={styles.cardInfoRow}>
                            <View style={styles.cardMainInfo}>
                                {/* Top row: Category + Status badge */}
                                <View style={styles.cardTopRow}>
                                    <View style={[styles.categoryPill, {
                                        backgroundColor: isDark ? "rgba(99,102,241,0.12)" : "#EEF2FF",
                                        borderColor: isDark ? "rgba(99,102,241,0.22)" : "#C7D2FE",
                                    }]}>
                                        <Ionicons name="grid-outline" size={11} color={isDark ? "#818CF8" : "#4F46E5"} />
                                        <Text style={[styles.categoryText, { color: isDark ? "#818CF8" : "#4F46E5" }]}>
                                            {item.category}
                                        </Text>
                                    </View>

                                    <View style={[styles.statusBadge, { backgroundColor: isDark ? cfg.darkBg : cfg.bg }]}>
                                        <View style={[styles.statusDot, { backgroundColor: isDark ? cfg.darkText : cfg.text }]} />
                                        <Text style={[styles.statusText, { color: isDark ? cfg.darkText : cfg.text }]}>
                                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Title */}
                                <Text style={[styles.cardTitle, { color: isDark ? "#F1F5F9" : "#121212" }]} numberOfLines={2}>
                                    {item.title}
                                </Text>

                                {/* Provider + ID row */}
                                <View style={styles.providerRow}>
                                    <Ionicons name="business-outline" size={12} color={isDark ? "#64748B" : "#94A3B8"} />
                                    <Text style={[styles.providerText, { color: isDark ? "#64748B" : "#94A3B8" }]} numberOfLines={1}>
                                        {item.provider_name || "YDF Verified Provider"}
                                    </Text>
                                    <View style={[styles.idPill, { backgroundColor: isDark ? "#1E1E1E" : "#F1F5F9" }]}>
                                        <Text style={[styles.idText, { color: isDark ? "#475569" : "#94A3B8" }]}>#{item.id}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Image Thumbnail */}
                            {item.image ? (
                                <Image
                                    source={{ uri: item.image }}
                                    style={styles.cardThumbnail}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[styles.cardThumbnailPlaceholder, { backgroundColor: isDark ? "#1E1E1E" : "#F8FAFC" }]}>
                                    <Ionicons name="image-outline" size={24} color={isDark ? "#334155" : "#E2E8F0"} />
                                </View>
                            )}
                        </View>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: isDark ? "#1E1E1E" : "#F1F5F9" }]} />

                        {/* Stats row */}
                        <View style={styles.statsRow}>
                            {/* Fund Amount */}
                            <View style={styles.statItem}>
                                <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(59,130,246,0.12)" : "#EFF6FF" }]}>
                                    <Ionicons name="cash-outline" size={14} color={isDark ? "#60A5FA" : "#3B82F6"} />
                                </View>
                                <View>
                                    <Text style={[styles.statLabel, { color: isDark ? "#64748B" : "#94A3B8" }]}>Fund</Text>
                                    <Text style={[styles.statValue, { color: isDark ? "#93C5FD" : "#2563EB" }]}>
                                        {formatCurrency(item.fund_amount)}
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.statSep, { backgroundColor: isDark ? "#1E1E1E" : "#F1F5F9" }]} />

                            {/* Applications */}
                            <View style={styles.statItem}>
                                <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "#ECFDF5" }]}>
                                    <Ionicons name="people-outline" size={14} color={isDark ? "#34D399" : "#059669"} />
                                </View>
                                <View>
                                    <Text style={[styles.statLabel, { color: isDark ? "#64748B" : "#94A3B8" }]}>Applied</Text>
                                    <Text style={[styles.statValue, { color: isDark ? "#6EE7B7" : "#059669" }]}>
                                        {item.applications_count}
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.statSep, { backgroundColor: isDark ? "#1E1E1E" : "#F1F5F9" }]} />

                            {/* Seats */}
                            <View style={styles.statItem} >
                                <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(249,115,22,0.12)" : "#FFF7ED" }]}>
                                    <MaterialCommunityIcons
                                        name="seat-outline"
                                        size={14}
                                        color={isDark ? "#FB923C" : "#EA580C"}
                                    />
                                </View>
                                <View>
                                    <Text style={[styles.statLabel, { color: isDark ? "#64748B" : "#94A3B8" }]}>
                                        Seats
                                    </Text>
                                    <Text style={[styles.statValue, { color: isDark ? "#FDBA74" : "#EA580C" }]}>
                                        {item.total_seats ?? 0}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Footer: dates + manage CTA */}
                        <View style={[styles.cardFooter, { backgroundColor: isDark ? "#121212" : "#F8FAFC" }]}>
                            <View style={styles.dateRange}>
                                <Ionicons name="calendar-outline" size={13} color={isDark ? "#475569" : "#94A3B8"} />
                                <Text style={[styles.dateText, { color: isDark ? "#64748B" : "#94A3B8" }]}>
                                    {formatDate(item.start_date)}
                                </Text>
                                <Ionicons name="arrow-forward" size={11} color={isDark ? "#334155" : "#CBD5E1"} />
                                <Text style={[styles.dateText, { color: isDark ? "#64748B" : "#94A3B8" }]}>
                                    {formatDate(item.end_date)}
                                </Text>
                            </View>

                            <LinearGradient
                                colors={["#3B82F6", "#2563EB"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.manageBtn}
                            >
                                <Text style={styles.manageBtnText}>Manage</Text>
                                <Feather name="arrow-right" size={13} color="#FFFFFF" />
                            </LinearGradient>
                        </View>
                    </View>
                </TouchableOpacity>

            </MotiView>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#000000" : "#F0F4FF" }]}>
            <DotPattern isDark={isDark} />

            {/* ── ReviewerHeader ────────────────────────────────── */}
            <ReviewerHeader
                title="Manage Schemes"
                subtitle="Oversee and manage your programs"
            />

            {/* ── STICKY SEARCH BAR ─────────────────────────────── */}
            <Animated.View style={[
                styles.stickySearch,
                {
                    backgroundColor: isDark ? "#000000" : "#F0F4FF",
                    shadowOpacity: searchBarShadowOpacity,
                },
            ]}>
                {/* Search input */}
                <View style={[
                    styles.searchBox,
                    {
                        backgroundColor: isDark ? "#121212" : "#FFFFFF",
                        borderColor: isDark ? "#1E1E1E" : "#E2E8F0",
                    },
                ]}>
                    <Ionicons name="search-outline" size={18} color={isDark ? "#475569" : "#94A3B8"} />
                    <TextInput
                        placeholder="Search title, category, provider…"
                        placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
                        style={[styles.searchInput, { color: isDark ? "#F1F5F9" : "#121212" }]}
                        value={query}
                        onChangeText={setQuery}
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close-circle" size={18} color={isDark ? "#475569" : "#94A3B8"} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter trigger button */}
                <TouchableOpacity
                    onPress={() => setFilterVisible(true)}
                    activeOpacity={0.8}
                    style={[
                        styles.filterBtn,
                        {
                            backgroundColor: isDark ? "#1D4ED8" : "#2563EB",
                            shadowColor: "#2563EB",
                        },
                    ]}
                >
                    <Ionicons name="options-outline" size={20} color="#FFFFFF" />
                    {activeTab !== "All" && (
                        <View style={styles.filterDot} />
                    )}
                </TouchableOpacity>
            </Animated.View>

            {/* ── Active filter chip ─────────────────────────────── */}
            <MotiView
                animate={{ opacity: 1, translateY: 0 }}
                from={{ opacity: 0, translateY: -4 }}
                transition={{ type: "timing", duration: 280 }}
                style={styles.activeFilterRow}
            >
                <View style={[styles.activeFilterChip, {
                    backgroundColor: isDark ? "rgba(59,130,246,0.12)" : "#DBEAFE",
                    borderColor: isDark ? "rgba(59,130,246,0.3)" : "#BFDBFE",
                }]}>
                    <Ionicons name="funnel-outline" size={12} color={isDark ? "#60A5FA" : "#2563EB"} />
                    <Text style={[styles.activeFilterText, { color: isDark ? "#60A5FA" : "#2563EB" }]}>
                        {activeTabLabel}
                    </Text>
                </View>
                <Text style={[styles.resultCount, { color: isDark ? "#475569" : "#94A3B8" }]}>
                    {activeCount} scheme{activeCount !== 1 ? "s" : ""}
                </Text>
            </MotiView>

            {/* ── List ──────────────────────────────────────────── */}
            <Animated.FlatList
                data={filtered}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 130 }]}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchMySchemes(); }}
                        tintColor={isDark ? "#3B82F6" : "#2563EB"}
                    />
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="large" color={isDark ? "#3B82F6" : "#2563EB"} />
                            <Text style={[styles.loadingText, { color: isDark ? "#475569" : "#94A3B8" }]}>
                                Loading schemes…
                            </Text>
                        </View>
                    ) : (
                        <MotiView
                            from={{ opacity: 0, scale: 0.93 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: "timing", duration: 320 }}
                            style={styles.emptyWrap}
                        >
                            <LinearGradient
                                colors={isDark ? ["#1E1E1E", "#121212"] : ["#EFF6FF", "#DBEAFE"]}
                                style={styles.emptyIconCircle}
                            >
                                <Ionicons name="folder-open-outline" size={40} color={isDark ? "#3B82F6" : "#2563EB"} />
                            </LinearGradient>
                            <Text style={[styles.emptyTitle, { color: isDark ? "#F1F5F9" : "#121212" }]}>
                                No Schemes Found
                            </Text>
                            <Text style={[styles.emptySub, { color: isDark ? "#475569" : "#94A3B8" }]}>
                                Try adjusting your filters or create a new scheme to get started.
                            </Text>
                        </MotiView>
                    )
                }
            />

            {/* ── FAB ───────────────────────────────────────────── */}
            <View style={[styles.fabWrap, { bottom: insets.bottom + 24 }]}>
                <TouchableOpacity
                    onPress={() => router.push("/(dashboard)/provider/add-scholarship")}
                    activeOpacity={0.85}
                    style={[styles.fabShadow, Platform.OS === "ios" && styles.fabShadowIos]}
                >
                    <LinearGradient
                        colors={["#3B82F6", "#1D4ED8"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.fab}
                    >
                        <Ionicons name="add" size={22} color="#FFFFFF" />
                        <Text style={styles.fabText}>New Scheme</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* ── Filter Bottom Sheet ────────────────────────────── */}
            <FilterModal
                visible={filterVisible}
                onClose={() => setFilterVisible(false)}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                counts={counts}
                isDark={isDark}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },

    // ── Sticky Search ──────────────────────────────────────
    stickySearch: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 10,
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 8,
        marginBottom: 10
    },
    searchBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: "500",
        height: "100%",
    },
    filterBtn: {
        width: 50,
        height: 50,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    filterDot: {
        position: "absolute",
        top: 9,
        right: 9,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FCD34D",
        borderWidth: 1.5,
        borderColor: "#2563EB",
    },

    // ── Active filter chip ─────────────────────────────────
    activeFilterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 10,
        paddingTop: 2,
    },
    activeFilterChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    activeFilterText: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    resultCount: {
        fontSize: 13,
        fontWeight: "600",
    },

    // ── List ───────────────────────────────────────────────
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 4,
        gap: 14,
    },

    // ── Card ───────────────────────────────────────────────
    card: {
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: "row",
        overflow: "hidden",
        ...Platform.select({
            ios: {
                shadowColor: "#121212",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.07,
                shadowRadius: 18,
            },
            android: { elevation: 4 },
        }),
    },
    cardRail: {
        width: 5,
        alignSelf: "stretch",
    },
    cardInner: {
        flex: 1,
        padding: 16,
        paddingLeft: 14,
    },
    cardInfoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    cardMainInfo: {
        flex: 1,
    },
    cardThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: "#F1F5F9",
    },
    cardThumbnailPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    cardTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    categoryPill: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        gap: 5,
    },
    categoryText: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.6,
        textTransform: "uppercase",
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: "800",
        lineHeight: 23,
        letterSpacing: -0.3,
        marginBottom: 8,
    },
    providerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 14,
    },
    providerText: {
        fontSize: 12,
        fontWeight: "500",
        flex: 1,
    },
    idPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    idText: {
        fontSize: 11,
        fontWeight: "700",
    },
    divider: {
        height: 1,
        marginBottom: 14,
    },

    // ── Stats ──────────────────────────────────────────────
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 0,
        marginBottom: 14,
    },
    statItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    statIconBox: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
    },
    statLabel: {
        fontSize: 10,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 14,
        fontWeight: "800",
        letterSpacing: -0.2,
    },
    statSep: {
        width: 1,
        height: 32,
        marginHorizontal: 8,
    },

    // ── Footer ─────────────────────────────────────────────
    cardFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 10,
    },
    dateRange: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        flex: 1,
    },
    dateText: {
        fontSize: 12,
        fontWeight: "600",
    },
    manageBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
        gap: 6,
    },
    manageBtnText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "700",
    },

    // ── Empty / Loading ────────────────────────────────────
    loadingWrap: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
        gap: 14,
    },
    loadingText: {
        fontSize: 15,
        fontWeight: "600",
    },
    emptyWrap: {
        alignItems: "center",
        paddingTop: 64,
        paddingHorizontal: 32,
    },
    emptyIconCircle: {
        width: 90,
        height: 90,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 22,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "800",
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 21,
        fontWeight: "500",
    },

    // ── FAB ────────────────────────────────────────────────
    fabWrap: {
        position: "absolute",
        right: 20,
    },
    fabShadow: {
        borderRadius: 28,
        elevation: 10,
    },
    fabShadowIos: {
        shadowColor: "#2563EB",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
    },
    fab: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 22,
        borderRadius: 28,
        gap: 10,
    },
    fabText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
    },

    // ── Filter Modal ───────────────────────────────────────
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.55)",
    },
    modalSheet: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 12,
        paddingHorizontal: 20,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -8 },
                shadowOpacity: 0.18,
                shadowRadius: 24,
            },
            android: { elevation: 24 },
        }),
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: "center",
        marginBottom: 20,
    },
    sheetTitle: {
        fontSize: 22,
        fontWeight: "800",
        letterSpacing: -0.4,
        marginBottom: 4,
    },
    sheetSubtitle: {
        fontSize: 14,
        fontWeight: "500",
        marginBottom: 24,
    },
    filterGrid: {
        flexDirection: "column",
        gap: 12,
        marginBottom: 8,
    },
    filterCard: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 14,
    },
    filterCardIcon: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    filterCardLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: -0.2,
    },
    filterCountBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    filterCountText: {
        fontSize: 12,
        fontWeight: "700",
    },
    filterActiveCheck: {
        marginLeft: 4,
    },
});