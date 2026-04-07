import { useTheme } from "@/context/ThemeContext";
import { getReviewerApplications } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

// ─── Types ────────────────────────────────────────────────────────────────────
type ApplicationUser = {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    fullname: string;
};

type ApplicationAttachment = {
    id: number;
    filename: string;
    filesize: number;
    mimetype: string;
    fileurl: string;
};

type AppItem = {
    id: number;
    user: ApplicationUser;
    application_text: string | null;
    status: "approved" | "rejected" | "applied" | "new" | "pending" | null;
    priority: number;
    assigned_reviewer_id: number | null;
    is_bookmarked: boolean;
    attachments: ApplicationAttachment[];
    timecreated: string;
    timemodified: string;
};

type PaginationData = {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
};

type ParsedApplicationData = {
    application_text?: string;
    fullname?: string;
    email?: string;
    phone?: string;
    student_id?: string;
    institution?: string;
    major?: string;
    graduation_date?: string;
    current_year?: string;
    gpa?: string;
    activities?: string;
    financial_info?: string;
};

const STATUS_TABS: Array<"All" | "new" | "approved" | "rejected" | "applied"> = [
    "All",
    "new",
    "approved",
    "rejected",
    "applied",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStatusConfig(status: AppItem["status"]) {
    switch (status) {
        case "new":
            return {
                color: "#6366F1",
                bg: "rgba(99,102,241,0.1)",
                bg2: "#EEF2FF",
                label: "New",
                icon: "sparkles" as const,
                gradient: ["#818CF8", "#6366F1"]
            };
        case "approved":
            return {
                color: "#059669",
                bg: "rgba(16,185,129,0.1)",
                bg2: "#D1FAE5",
                label: "Approved",
                icon: "checkmark-circle" as const,
                gradient: ["#10B981", "#059669"]
            };
        case "rejected":
            return {
                color: "#DC2626",
                bg: "rgba(239,68,68,0.1)",
                bg2: "#FEE2E2",
                label: "Rejected",
                icon: "close-circle" as const,
                gradient: ["#EF4444", "#DC2626"]
            };
        case "applied":
        case "pending":
            return {
                color: "#6366F1",
                bg: "rgba(99,102,241,0.1)",
                bg2: "#EEF2FF",
                label: "Applied",
                icon: "time-outline" as const,
                gradient: ["#6366F1", "#4F46E5"]
            };
        default:
            return {
                color: "#6366F1",
                bg: "rgba(148,163,184,0.1)",
                bg2: "#F1F5F9",
                label: "Applied",
                icon: "document-outline" as const,
                gradient: ["#94A3B8", "#475569"]
            };
    }
}

function getAvatarColor(name: string) {
    const colors = [
        { bg: "#EEF2FF", text: "#6366F1" },
        { bg: "#D1FAE5", text: "#059669" },
        { bg: "#FEF3C7", text: "#D97706" },
        { bg: "#FEE2E2", text: "#DC2626" },
        { bg: "#F3E8FF", text: "#9333EA" },
        { bg: "#FFEDD5", text: "#EA580C" },
        { bg: "#CFFAFE", text: "#0891B2" },
        { bg: "#FCE7F3", text: "#DB2777" },
    ];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
}

function formatDate(dateStr: string) {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return dateStr;
    }
}



function parseApplicationText(text: string | null): ParsedApplicationData | null {
    if (!text) return null;
    try {
        const trimmed = text.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            const parsed = JSON.parse(trimmed);
            if (typeof parsed === "object" && parsed !== null) {
                return parsed;
            }
        }
    } catch {
        // Not valid JSON
    }
    return null;
}

// ─── Application Card ─────────────────────────────────────────────────────────
const FIELD_CONFIGS: Record<string, { icon: any; color: string; bg: string; darkBg: string }> = {
    phone: { icon: "call-outline", color: "#3B82F6", bg: "#EFF6FF", darkBg: "rgba(59,130,246,0.15)" },
    institution: { icon: "business-outline", color: "#10B981", bg: "#ECFDF5", darkBg: "rgba(16,185,129,0.15)" },
    major: { icon: "school-outline", color: "#6366F1", bg: "#EEF2FF", darkBg: "rgba(99,102,241,0.15)" },
    gpa: { icon: "stats-chart-outline", color: "#F59E0B", bg: "#FFFBEB", darkBg: "rgba(245,158,11,0.15)" },
    financial_info: { icon: "wallet-outline", color: "#8B5CF6", bg: "#F5F3FF", darkBg: "rgba(139,92,246,0.15)" },
    fullname: { icon: "person-outline", color: "#EC4899", bg: "#FDF2F8", darkBg: "rgba(236,72,153,0.15)" },
    graduation_date: { icon: "time-outline", color: "#64748B", bg: "#F8FAFC", darkBg: "rgba(100,116,139,0.15)" },
    current_year: { icon: "calendar-outline", color: "#64748B", bg: "#F8FAFC", darkBg: "rgba(100,116,139,0.15)" },
    activities: { icon: "sparkles-outline", color: "#06B6D4", bg: "#ECFEFF", darkBg: "rgba(6,182,212,0.15)" },
};

function ApplicationCard({
    item,
    isDark,
    colors,
    onPress,
}: {
    item: AppItem;
    isDark: boolean;
    colors: any;
    onPress: () => void;
}) {
    const statusCfg = getStatusConfig(item.status);
    const avatarColor = getAvatarColor(item.user.fullname);

    const getFieldTag = (key: string, value: string) => {
        const config = FIELD_CONFIGS[key] || { icon: "information-circle-outline", color: "#64748B", bg: "#F8FAFC", darkBg: "rgba(100,116,139,0.1)" };
        return (
            <View key={key} style={[styles.noteItem, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
                <Ionicons name={config.icon} size={11} color={config.color} />
                <Text style={[styles.noteItemText, { color: isDark ? "#fff" : "#475569" }]} numberOfLines={1}>
                    {key === 'gpa' ? `GPA: ${value}` : value}
                </Text>
            </View>
        );
    };
    const initials =
        (item.user.firstname?.charAt(0) ?? "") +
        (item.user.lastname?.charAt(0) ?? "");

    const cardBg = isDark ? "#121212" : "#FFFFFF";
    const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
    const dividerColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
    const subTextColor = isDark ? "#94A3B8" : "#6B7280";

    const hasAttachments = item.attachments && item.attachments.length > 0;
    const isHighPriority = item.priority >= 7;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            style={[styles.cardContainer]}
        >
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                {/* ── Top row: Avatar + User Info + Priority ── */}
                <View style={styles.cardTop}>
                    <LinearGradient
                        colors={[avatarColor.bg, isDark ? "#334155" : avatarColor.bg]}
                        style={styles.avatar}
                    >
                        <Text style={[styles.avatarText, { color: isDark ? "#fff" : avatarColor.text }]}>
                            {initials.toUpperCase()}
                        </Text>
                    </LinearGradient>

                    <View style={styles.userBlock}>
                        <View style={styles.userNameRow}>
                            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                                {item.user.fullname}
                            </Text>
                            {isHighPriority && (
                                <View style={styles.priorityPill}>
                                    <Ionicons name="flash" size={10} color="#EF4444" />
                                    <Text style={styles.priorityText}>High</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.emailRow}>
                            <Text style={[styles.userEmail, { color: subTextColor }]} numberOfLines={1}>
                                {item.user.email}
                            </Text>
                            <View style={[styles.dot, { backgroundColor: subTextColor }]} />
                            <Text style={[styles.userId, { color: subTextColor }]}>
                                ID: {item.user.id}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.moreOptions}>
                        <Ionicons name="chevron-forward" size={18} color={isDark ? "#475569" : "#CBD5E1"} />
                    </TouchableOpacity>
                </View>

                {/* ── Content Section ── */}
                <View style={styles.contentSection}>
                    {item.application_text && item.application_text.trim() ? (() => {
                        const parsed = parseApplicationText(item.application_text);
                        if (parsed) {
                            return (
                                <View style={styles.parsedContent}>
                                    {parsed.application_text?.trim() ? (
                                        <Text style={[styles.appText, { color: colors.text }]} numberOfLines={2}>
                                            "{parsed.application_text}"
                                        </Text>
                                    ) : null}

                                    <View style={styles.tagsContainer}>
                                        {parsed.institution && getFieldTag('institution', parsed.institution)}
                                        {parsed.major && getFieldTag('major', parsed.major)}
                                        {parsed.gpa && getFieldTag('gpa', parsed.gpa)}
                                        {parsed.phone && getFieldTag('phone', parsed.phone)}
                                    </View>
                                </View>
                            );
                        }
                        return (
                            <Text style={[styles.appText, { color: colors.text }]} numberOfLines={2}>
                                {item.application_text}
                            </Text>
                        );
                    })() : (
                        <View style={styles.placeholderBox}>
                            <Text style={[styles.placeholderText, { color: subTextColor }]}>No application statement provided</Text>
                        </View>
                    )}
                </View>

                {/* ── Meta row ── */}
                <View style={styles.footerRow}>
                    <View style={styles.metaInfo}>
                        <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={13} color={subTextColor} />
                            <Text style={[styles.metaText, { color: subTextColor }]}>
                                {formatDate(item.timecreated)}
                            </Text>
                        </View>
                        {hasAttachments && (
                            <View style={styles.metaItem}>
                                <Ionicons name="attach-outline" size={14} color={subTextColor} />
                                <Text style={[styles.metaText, { color: subTextColor }]}>
                                    {item.attachments.length}
                                </Text>
                            </View>
                        )}
                    </View>

                    <LinearGradient
                        colors={statusCfg.gradient as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.statusPill}
                    >
                        <Text style={styles.statusLabel}>{statusCfg.label}</Text>
                    </LinearGradient>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ─── State Cache ─────────────────────────────────────────────────────────────
const screenStateCache = new Map<number, { query: string; activeTab: any; page: number }>();

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SchemeApplicationsScreen() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const schemeId = params.id ? Number(params.id) : null;
    const schemeTitle = params.title ? String(params.title) : "Scheme";

    const [query, setQuery] = useState(() => (schemeId ? screenStateCache.get(schemeId)?.query : "") || "");
    const [activeTab, setActiveTab] = useState(() => (schemeId ? screenStateCache.get(schemeId)?.activeTab : "All") || "All");
    const [page, setPage] = useState(() => (schemeId ? screenStateCache.get(schemeId)?.page : 1) || 1);
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    const pageSize = 100;

    const [applications, setApplications] = useState<AppItem[]>([]);
    const [pagination, setPagination] = useState<PaginationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFilterModal, setShowFilterModal] = useState(false);

    // Debounce query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
            setPage(1); // Reset to first page when query changes
        }, 500);
        return () => clearTimeout(handler);
    }, [query]);

    // Sync state to cache whenever it changes
    useEffect(() => {
        if (schemeId) {
            screenStateCache.set(schemeId, { query, activeTab, page });
        }
    }, [schemeId, query, activeTab, page]);

    const fetchApplications = async (targetPage: number) => {
        if (!schemeId) return;
        try {
            setLoading(true);
            setError(null);
            const authDataStr = await AsyncStorage.getItem("authData");
            const authData = authDataStr ? JSON.parse(authDataStr) : null;
            const token = authData?.token;
            if (!token) throw new Error("No authentication token found. Please login again.");

            const apiParams: {
                status: "approved" | "rejected" | "applied" | "new" | "";
                page: number;
                per_page: number;
                search: string;
            } = {
                page: targetPage,
                per_page: pageSize,
                status: activeTab === "All" ? "" : activeTab,
                search: debouncedQuery,
            };

            const response = await getReviewerApplications(token, schemeId, apiParams);
            if (response.success && response.data) {
                let fetchedApps = response.data.applications || [];
                let pgData = response.data.pagination || null;

                // Map local status if needed (the API parameter is already updated)
                setApplications(fetchedApps);
                setPagination(pgData);
            } else {
                throw new Error(response.error || "Failed to fetch applications");
            }
        } catch (err: any) {
            console.log("Error fetching applications:", err);
            setError(err.message || "Failed to load applications");
            Alert.alert("Error", err.message || "Failed to load applications");
        } finally {
            setLoading(false);
        }
    };

    // Use useFocusEffect to fetch when focus returns (e.g. going back from details)
    useFocusEffect(
        useCallback(() => {
            if (schemeId) {
                fetchApplications(page);
            }
        }, [schemeId, page, activeTab, debouncedQuery])
    );

    // Server-side search results (API now handles query parameter)
    const filtered = useMemo(() => {
        return applications;
    }, [applications]);

    const searchBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
    const searchBorder = isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0";

    // Stats summary
    const totalCount = pagination?.total ?? applications.length;
    const totalPages = pagination?.total_pages ?? 1;

    // Pagination page-number window (show up to 5 page buttons)
    const getPaginationPages = () => {
        const delta = 2;
        const pages: number[] = [];
        for (
            let i = Math.max(1, page - delta);
            i <= Math.min(totalPages, page + delta);
            i++
        ) {
            pages.push(i);
        }
        return pages;
    };

    const handleTabChange = (tab: (typeof STATUS_TABS)[number]) => {
        setActiveTab(tab);
        setPage(1);
        setQuery("");
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={isDark ? ["#0f0f0f", "#1e1e1e"] : ["#F9FAFB", "#F3F4F6"]}
                style={StyleSheet.absoluteFill}
            />

            <ReviewerHeader
                title="Applications"
                subtitle={schemeTitle}
                showBackButton={true}
                onBackPress={() => router.back()}
            />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* ── Loading ── */}
                {loading && (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                            Loading applications…
                        </Text>
                    </View>
                )}

                {!loading && (
                    <>

                        {/* ── Search + Filter ── */}
                        <View style={styles.searchRow}>
                            <View style={[styles.searchBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF", borderColor: searchBorder }]}>
                                <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                                <TextInput
                                    placeholder="Search by name, email, ID…"
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
                            <TouchableOpacity
                                style={[
                                    styles.filterBtn,
                                    { backgroundColor: activeTab !== "All" ? "#6366F1" : (isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF") },
                                    { borderColor: activeTab !== "All" ? "#6366F1" : searchBorder },
                                ]}
                                onPress={() => setShowFilterModal(true)}
                            >
                                <Ionicons
                                    name="options-outline"
                                    size={20}
                                    color={activeTab !== "All" ? "#fff" : colors.text}
                                />
                                {activeTab !== "All" && <View style={styles.filterDot} />}
                            </TouchableOpacity>
                        </View>

                        {/* ── Page info line ── */}
                        <View style={styles.pageInfoRow}>
                            <Ionicons name="layers-outline" size={13} color={colors.textSecondary} />
                            <Text style={[styles.pageInfoText, { color: colors.textSecondary }]}>
                                {totalCount} applications  ·  Page {page} of {totalPages}
                            </Text>
                        </View>

                        {/* Active filter pill */}
                        {activeTab !== "All" && (
                            <View style={styles.activeFilterRow}>
                                <View style={[styles.activeFilterPill, { backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF" }]}>
                                    <Ionicons name="funnel" size={12} color="#6366F1" />
                                    <Text style={styles.activeFilterText}>
                                        {activeTab === "applied" ? "Applied" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                                    </Text>
                                    <TouchableOpacity onPress={() => handleTabChange("All")}>
                                        <Ionicons name="close-circle" size={14} color="#6366F1" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                                    {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                                </Text>
                            </View>
                        )}

                        {/* ── Filter Modal ── */}
                        <Modal
                            visible={showFilterModal}
                            transparent
                            animationType="slide"
                            onRequestClose={() => setShowFilterModal(false)}
                        >
                            <View style={styles.modalBackdrop}>
                                <View style={[styles.filterModal, { backgroundColor: isDark ? "#000" : "#FFFFFF" }]}>
                                    <View style={[styles.modalHandle, { backgroundColor: isDark ? "#475569" : "#CBD5E1" }]} />
                                    <View style={styles.modalHeader}>
                                        <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Status</Text>
                                        <TouchableOpacity
                                            onPress={() => setShowFilterModal(false)}
                                            style={[styles.modalCloseBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9" }]}
                                        >
                                            <Ionicons name="close" size={18} color={colors.text} />
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView style={styles.filterList} showsVerticalScrollIndicator={false}>
                                        {STATUS_TABS.map((tab) => {
                                            const isActive = activeTab === tab;
                                            const cfg = tab === "All" ? null : getStatusConfig(tab);
                                            return (
                                                <TouchableOpacity
                                                    key={tab}
                                                    style={[
                                                        styles.filterOption,
                                                        {
                                                            backgroundColor: isActive
                                                                ? (isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF")
                                                                : "transparent",
                                                            borderColor: isActive ? "#6366F1" : (isDark ? "rgba(255,255,255,0.07)" : "#E2E8F0"),
                                                        },
                                                    ]}
                                                    onPress={() => {
                                                        handleTabChange(tab);
                                                        setShowFilterModal(false);
                                                    }}
                                                >
                                                    <View style={[styles.filterOptionIcon, { backgroundColor: isActive ? "#6366F1" : (isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9") }]}>
                                                        <Ionicons
                                                            name={
                                                                tab === "All" ? "apps-outline" :
                                                                    cfg?.icon ?? "document-outline"
                                                            }
                                                            size={18}
                                                            color={isActive ? "#fff" : (cfg?.color ?? colors.textSecondary)}
                                                        />
                                                    </View>
                                                    <Text style={[styles.filterOptionText, { color: isActive ? "#6366F1" : colors.text }]}>
                                                        {tab === "All" ? "All Applications" :
                                                            tab === "applied" ? "Applied" :
                                                                tab.charAt(0).toUpperCase() + tab.slice(1)}
                                                    </Text>
                                                    {isActive && (
                                                        <Ionicons name="checkmark-circle" size={20} color="#6366F1" />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            </View>
                        </Modal>

                        {/* ── Cards ── */}
                        <View style={styles.cardList}>
                            {filtered.map((item) => (
                                <ApplicationCard
                                    key={item.id}
                                    item={item}
                                    isDark={isDark}
                                    colors={colors}
                                    onPress={() =>
                                        router.push({
                                            pathname: "/(dashboard)/reviewer/application-details",
                                            params: { id: item.id },
                                        })
                                    }
                                />
                            ))}

                            {filtered.length === 0 && (
                                <View style={[styles.emptyState, { backgroundColor: isDark ? "#000" : "#FFFFFF", borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0" }]}>
                                    <View style={[styles.emptyIconRing, { backgroundColor: isDark ? "rgba(99,102,241,0.1)" : "#EEF2FF" }]}>
                                        <Ionicons name="document-text-outline" size={36} color="#6366F1" />
                                    </View>
                                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No applications found</Text>
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                        Try adjusting your search or filter
                                    </Text>
                                </View>
                            )}
                        </View>

                    </>
                )}
            </ScrollView>

            {/* ── Fixed Pagination Footer ── */}
            {!loading && totalPages > 1 && (
                <BlurView
                    intensity={Platform.OS === "android" ? (isDark ? 100 : 95) : (isDark ? 50 : 80)}
                    tint={isDark ? "dark" : "light"}
                    style={[
                        styles.paginationFooter,
                        {
                            borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                            paddingBottom: insets.bottom + 12,
                            backgroundColor: Platform.OS === "android" ? (isDark ? "#0f0f0f" : "#FFFFFF") : "transparent",
                        },
                    ]}
                >
                    {/* Controls row */}
                    <View style={styles.paginationControls}>
                        {/* Prev */}
                        <TouchableOpacity
                            style={[
                                styles.pageBtn,
                                { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9", opacity: page === 1 ? 0.4 : 1 },
                            ]}
                            onPress={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={16} color={colors.text} />
                        </TouchableOpacity>

                        {/* Page numbers */}
                        <View style={styles.pageNumbers}>
                            {getPaginationPages().map((p) => {
                                const isActive = p === page;
                                return (
                                    <TouchableOpacity
                                        key={p}
                                        onPress={() => setPage(p)}
                                        activeOpacity={0.75}
                                        style={[
                                            styles.pageNumBtn,
                                            isActive && styles.pageNumBtnActive,
                                            !isActive && { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9" },
                                        ]}
                                    >
                                        <Text style={[
                                            styles.pageNumText,
                                            isActive && styles.pageNumTextActive,
                                            !isActive && { color: colors.text },
                                        ]}>{p}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Next */}
                        <TouchableOpacity
                            style={[
                                styles.pageBtn,
                                { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9", opacity: page === totalPages ? 0.4 : 1 },
                            ]}
                            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-forward" size={16} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </BlurView>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
    content: { padding: 16, gap: 16, paddingBottom: 110 },

    // Loading
    loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 100, gap: 16 },
    loadingText: { fontSize: 15, fontWeight: "600", color: "#6366F1" },

    // Search row
    searchRow: { flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 4 },
    searchBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    searchInput: { flex: 1, fontSize: 15, fontWeight: "500" },
    filterBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    filterDot: {
        position: "absolute",
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#fff",
        borderWidth: 2,
        borderColor: "#6366F1",
    },

    activeFilterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: -4,
    },
    activeFilterPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(99,102,241,0.2)",
    },
    activeFilterText: { fontSize: 12, fontWeight: "700", color: "#6366F1" },
    resultsCount: { fontSize: 12, fontWeight: "600" },
    pageInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        opacity: 0.8,
    },
    pageInfoText: { fontSize: 12, fontWeight: "600" },

    // Filter modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end",
    },
    filterModal: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHandle: {
        width: 44,
        height: 5,
        borderRadius: 3,
        alignSelf: "center",
        marginTop: 14,
        marginBottom: 6,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    modalTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
    modalCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    filterList: { paddingHorizontal: 20, maxHeight: 400 },
    filterOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        padding: 16,
        borderRadius: 20,
        marginBottom: 10,
        borderWidth: 1.5,
    },
    filterOptionIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    filterOptionText: { flex: 1, fontSize: 16, fontWeight: "700" },

    // Card list
    cardList: { gap: 16 },

    // ── Application Card ──
    cardContainer: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: "hidden",
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        fontSize: 16,
        fontWeight: "800",
    },
    userBlock: { flex: 1, gap: 2 },
    userNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    userName: { fontSize: 16, fontWeight: "800", letterSpacing: -0.4 },
    priorityPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "rgba(239,68,68,0.1)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    priorityText: { fontSize: 10, fontWeight: "800", color: "#EF4444", textTransform: "uppercase" },
    emailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    userEmail: { fontSize: 12, fontWeight: "500", opacity: 0.9 },
    dot: { width: 3, height: 3, borderRadius: 1.5 },
    userId: { fontSize: 11, fontWeight: "600" },
    moreOptions: { padding: 4 },

    contentSection: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    parsedContent: { gap: 10 },
    appText: { fontSize: 14, lineHeight: 20, fontWeight: "500", fontStyle: "italic", opacity: 0.8 },
    tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    noteItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    noteItemText: { fontSize: 11, fontWeight: "700" },
    placeholderBox: {
        padding: 12,
        borderRadius: 14,
        backgroundColor: "rgba(0,0,0,0.02)",
        borderStyle: "dashed",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    placeholderText: { fontSize: 13, fontStyle: "italic" },

    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderTopWidth: 1,
        borderColor: "rgba(0,0,0,0.03)",
    },
    metaInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 12, fontWeight: "600" },
    statusPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statusLabel: { color: "#fff", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },

    // Empty state
    emptyState: {
        alignItems: "center",
        padding: 60,
        borderRadius: 32,
        borderWidth: 1,
        gap: 16,
        marginTop: 40,
    },
    emptyIconRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: { fontSize: 18, fontWeight: "800" },
    emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },

    // Pagination footer
    paginationFooter: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        paddingTop: 12,
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 12,
    },
    paginationControls: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    pageBtn: {
        width: 44,
        height: 44,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    pageNumbers: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
    },
    pageNumBtn: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    pageNumBtnActive: {
        backgroundColor: "#6366F1",
    },
    pageNumText: { fontSize: 15, fontWeight: "700" },
    pageNumTextActive: { color: "#fff" },
});
