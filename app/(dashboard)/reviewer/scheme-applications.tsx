import { useTheme } from "@/context/ThemeContext";
import { getReviewerApplications } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
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
    status: "new" | "approved" | "rejected" | "not_applied" | null;
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

const STATUS_TABS: Array<"All" | "new" | "approved" | "rejected" | "not_applied"> = [
    "All",
    "new",
    "approved",
    "rejected",
    "not_applied",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStatusConfig(status: AppItem["status"]) {
    switch (status) {
        case "approved":
            return { color: "#10B981", bg: "rgba(16,185,129,0.12)", bg2: "#D1FAE5", label: "Approved", icon: "checkmark-circle" as const };
        case "rejected":
            return { color: "#EF4444", bg: "rgba(239,68,68,0.12)", bg2: "#FEE2E2", label: "Rejected", icon: "close-circle" as const };
        case "not_applied":
            return { color: "#94A3B8", bg: "rgba(148,163,184,0.12)", bg2: "#F1F5F9", label: "Not Applied", icon: "document-outline" as const };
        case "new":
            return { color: "#6366F1", bg: "rgba(99,102,241,0.12)", bg2: "#EEF2FF", label: "New", icon: "sparkles" as const };
        default:
            return { color: "#6366F1", bg: "rgba(99,102,241,0.12)", bg2: "#EEF2FF", label: "New", icon: "sparkles" as const };
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

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ─── Application Card ─────────────────────────────────────────────────────────
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
    const initials =
        (item.user.firstname?.charAt(0) ?? "") +
        (item.user.lastname?.charAt(0) ?? "");

    const cardBg = isDark ? "#000" : "#FFFFFF";
    const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
    const dividerColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
    const subTextColor = isDark ? "#94A3B8" : "#64748B";

    const hasAttachments = item.attachments && item.attachments.length > 0;
    const isHighPriority = item.priority >= 7;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.82}
            style={[styles.card, { backgroundColor: cardBg, borderColor }]}
        >
            {/* Priority accent */}
            {isHighPriority && <View style={styles.priorityAccent} />}

            {/* ── Top row: Avatar + User Info + Bookmark ── */}
            <View style={styles.cardTop}>
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: isDark ? "rgba(99,102,241,0.18)" : avatarColor.bg }]}>
                    <Text style={[styles.avatarText, { color: isDark ? "#A5B4FC" : avatarColor.text }]}>
                        {initials.toUpperCase()}
                    </Text>
                </View>

                {/* User info */}
                <View style={styles.userBlock}>
                    <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                        {item.user.fullname}
                    </Text>
                    <View style={styles.emailRow}>
                        <Ionicons name="mail-outline" size={12} color={subTextColor} />
                        <Text style={[styles.userEmail, { color: subTextColor }]} numberOfLines={1}>
                            {item.user.email}
                        </Text>
                    </View>
                    <View style={styles.idRow}>
                        <Ionicons name="person-circle-outline" size={12} color={subTextColor} />
                        <Text style={[styles.userId, { color: subTextColor }]}>
                            User #{item.user.id}
                        </Text>
                        <View style={[styles.idSeparator, { backgroundColor: subTextColor }]} />

                    </View>
                </View>

                {/* Bookmark icon */}
                {/* <View style={styles.bookmarkWrap}>
                    {item.is_bookmarked ? (
                        <View style={styles.bookmarkActive}>
                            <Ionicons name="bookmark" size={22} color="#F59E0B" />
                        </View>
                    ) : (
                        <Ionicons name="bookmark-outline" size={22} color={isDark ? "#475569" : "#CBD5E1"} />
                    )}
                </View> */}
            </View>

            {/* ── Divider ── */}
            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            {/* ── Application text or placeholder ── */}
            <View style={styles.textSection}>
                {item.application_text && item.application_text.trim() ? (
                    <>
                        <View style={styles.textLabelRow}>
                            <Ionicons name="document-text-outline" size={13} color={subTextColor} />
                            <Text style={[styles.textLabel, { color: subTextColor }]}>Application Note</Text>
                        </View>
                        <Text style={[styles.appText, { color: colors.text }]} numberOfLines={2}>
                            {item.application_text}
                        </Text>
                    </>
                ) : (
                    <View style={[styles.noTextRow, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC" }]}>
                        <Ionicons name="document-outline" size={14} color={subTextColor} />
                        <Text style={[styles.noText, { color: subTextColor }]}>No application text provided</Text>
                    </View>
                )}
            </View>

            {/* ── Meta chips row ── */}
            <View style={styles.metaRow}>
                {/* Date created */}
                <View style={[styles.metaChip, { backgroundColor: isDark ? "rgba(99,102,241,0.1)" : "#EEF2FF" }]}>
                    <Ionicons name="calendar-outline" size={11} color="#6366F1" />
                    <Text style={[styles.metaChipText, { color: "#6366F1" }]}>
                        {formatDate(item.timecreated)}
                    </Text>
                </View>

                {/* Assigned reviewer */}
                {item.assigned_reviewer_id ? (
                    <View style={[styles.metaChip, { backgroundColor: isDark ? "rgba(16,185,129,0.1)" : "#D1FAE5" }]}>
                        <Ionicons name="person-outline" size={11} color="#059669" />
                        <Text style={[styles.metaChipText, { color: "#059669" }]}>Assigned</Text>
                    </View>
                ) : (
                    <View style={[styles.metaChip, { backgroundColor: isDark ? "rgba(148,163,184,0.1)" : "#F1F5F9" }]}>
                        <Ionicons name="person-outline" size={11} color={subTextColor} />
                        <Text style={[styles.metaChipText, { color: subTextColor }]}>Unassigned</Text>
                    </View>
                )}

                {/* Attachments */}
                {hasAttachments && (
                    <View style={[styles.metaChip, { backgroundColor: isDark ? "rgba(245,158,11,0.1)" : "#FEF3C7" }]}>
                        <Ionicons name="attach" size={11} color="#D97706" />
                        <Text style={[styles.metaChipText, { color: "#D97706" }]}>
                            {item.attachments.length} file{item.attachments.length > 1 ? "s" : ""}
                        </Text>
                    </View>
                )}
            </View>

            {/* ── Attachments list (if any) ── */}
            {hasAttachments && (
                <View style={[styles.attachmentsList, { borderColor: dividerColor }]}>
                    {item.attachments.slice(0, 2).map((att) => (
                        <View
                            key={att.id}
                            style={[styles.attachmentItem, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC" }]}
                        >
                            <Ionicons
                                name={
                                    att.mimetype?.includes("image") ? "image-outline" :
                                        att.mimetype?.includes("pdf") ? "document-outline" :
                                            "document-attach-outline"
                                }
                                size={14}
                                color={isDark ? "#A5B4FC" : "#6366F1"}
                            />
                            <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                                {att.filename}
                            </Text>
                            {att.filesize > 0 && (
                                <Text style={[styles.attachmentSize, { color: subTextColor }]}>
                                    {formatBytes(att.filesize)}
                                </Text>
                            )}
                        </View>
                    ))}
                    {item.attachments.length > 2 && (
                        <Text style={[styles.moreAttachments, { color: "#6366F1" }]}>
                            +{item.attachments.length - 2} more
                        </Text>
                    )}
                </View>
            )}

            {/* ── Footer: Status + Review button ── */}
            <View style={[styles.cardFooter, { borderTopColor: dividerColor }]}>
                {/* Status badge */}
                <View style={[styles.statusBadge, { backgroundColor: isDark ? statusCfg.bg : statusCfg.bg2 }]}>
                    <Ionicons name={statusCfg.icon} size={13} color={statusCfg.color} />
                    <Text style={[styles.statusText, { color: statusCfg.color }]}>
                        {statusCfg.label}
                    </Text>
                </View>

                {/* Review CTA */}
                <TouchableOpacity
                    onPress={onPress}
                    style={styles.reviewBtn}
                    activeOpacity={0.8}
                >
                    <Text style={styles.reviewBtnText}>Review</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SchemeApplicationsScreen() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const schemeId = params.id ? Number(params.id) : null;
    const schemeTitle = params.title ? String(params.title) : "Scheme";

    const [query, setQuery] = useState("");
    const [activeTab, setActiveTab] = useState<(typeof STATUS_TABS)[number]>("All");
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [applications, setApplications] = useState<AppItem[]>([]);
    const [pagination, setPagination] = useState<PaginationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFilterModal, setShowFilterModal] = useState(false);

    const fetchApplications = async (targetPage: number) => {
        if (!schemeId) return;
        try {
            setLoading(true);
            setError(null);
            const authDataStr = await AsyncStorage.getItem("authData");
            const authData = authDataStr ? JSON.parse(authDataStr) : null;
            const token = authData?.token;
            if (!token) throw new Error("No authentication token found. Please login again.");

            const isNotAppliedTab = activeTab === "not_applied";
            const apiParams: {
                status: "new" | "approved" | "rejected" | "not_applied" | "";
                page: number;
                per_page: number;
            } = {
                page: isNotAppliedTab ? 1 : targetPage,
                per_page: isNotAppliedTab ? 1000 : pageSize,
                status: activeTab === "All" || isNotAppliedTab ? "" : activeTab,
            };

            const response = await getReviewerApplications(token, schemeId, apiParams);
            if (response.success && response.data) {
                let fetchedApps = response.data.applications || [];
                let pgData = response.data.pagination || null;

                // Handle broken backend filter for not_applied users by filtering locally
                if (isNotAppliedTab) {
                    fetchedApps = fetchedApps.filter((a: AppItem) => a.status === "not_applied");
                    // Override pagination since we're forcing a bulk local filter
                    pgData = {
                        page: 1,
                        per_page: fetchedApps.length,
                        total: fetchedApps.length,
                        total_pages: 1,
                    };
                }

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

    // Re-fetch whenever the page or tab changes
    useEffect(() => {
        if (schemeId) fetchApplications(page);
    }, [schemeId, page, activeTab]);

    // Client-side search filters the current page only (API has no search param)
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return applications;
        return applications.filter(
            (a) =>
                a.user.fullname.toLowerCase().includes(q) ||
                a.user.email.toLowerCase().includes(q) ||
                String(a.id).includes(q) ||
                (a.application_text && a.application_text.toLowerCase().includes(q))
        );
    }, [applications, query]);

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
        setPage(1); // reset to first page on filter change
        setQuery("");
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                            <View style={[styles.searchBox, { backgroundColor: searchBg, borderColor: searchBorder }]}>
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
                                    { backgroundColor: activeTab !== "All" ? "#6366F1" : (isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF") },
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
                                        {activeTab === "not_applied" ? "Not Applied" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
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
                                                            tab === "not_applied" ? "Not Applied" :
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
                <View style={[
                    styles.paginationFooter,
                    {
                        backgroundColor: isDark ? "#000" : "#FFFFFF",
                        borderTopColor: isDark ? "rgba(255,255,255,0.07)" : "#E2E8F0",
                        paddingBottom: insets.bottom + 10,
                    },
                ]}>
                    {/* Controls row */}
                    <View style={styles.paginationControls}>
                        {/* Prev */}
                        <TouchableOpacity
                            style={[
                                styles.pageBtn,
                                { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9", opacity: page === 1 ? 0.4 : 1 },
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
                                            !isActive && { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" },
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
                                { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9", opacity: page === totalPages ? 0.4 : 1 },
                            ]}
                            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-forward" size={16} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

// ─── Status helpers (kept for backward compat) ────────────────────────────────
function getStatusColor(status: AppItem["status"]) {
    return getStatusConfig(status).color;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16, gap: 14, paddingBottom: 100 },

    // Loading
    loadingWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 14 },
    loadingText: { fontSize: 15, fontWeight: "500" },

    // Search row
    searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
    searchBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    searchInput: { flex: 1, fontSize: 14, fontWeight: "500" },
    filterBtn: {
        width: 48,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    filterDot: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: "#fff",
        borderWidth: 1.5,
        borderColor: "#6366F1",
    },

    // Active filter
    activeFilterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    activeFilterPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    activeFilterText: { fontSize: 12, fontWeight: "700", color: "#6366F1" },
    resultsCount: { fontSize: 12, fontWeight: "500" },
    pageInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    pageInfoText: { fontSize: 12, fontWeight: "500" },

    // Filter modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    filterModal: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: "center",
        marginTop: 12,
        marginBottom: 4,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    modalTitle: { fontSize: 18, fontWeight: "700" },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    filterList: { paddingHorizontal: 16, maxHeight: 380 },
    filterOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 14,
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: 1.5,
    },
    filterOptionIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    filterOptionText: { flex: 1, fontSize: 15, fontWeight: "600" },

    // Card list
    cardList: { gap: 12 },

    // ── Application Card ──
    card: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: "hidden",
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    priorityAccent: {
        height: 3,
        backgroundColor: "#EF4444",
    },

    // Card top row
    cardTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 16,
        paddingBottom: 14,
        gap: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    userBlock: { flex: 1, gap: 3 },
    userName: { fontSize: 15, fontWeight: "700", letterSpacing: -0.3 },
    emailRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    userEmail: { fontSize: 12, fontWeight: "500", flex: 1 },
    idRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    userId: { fontSize: 11, fontWeight: "600" },
    idSeparator: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.5 },

    // Bookmark
    bookmarkWrap: { paddingTop: 2 },
    bookmarkActive: {
        // golden glow effect
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
    },

    // Divider
    divider: { height: 1, marginHorizontal: 16 },

    // Application text section
    textSection: { paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
    textLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    textLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
    appText: { fontSize: 14, lineHeight: 21, fontWeight: "500" },
    noTextRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
    },
    noText: { fontSize: 13, fontStyle: "italic" },

    // Meta chips
    metaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 7,
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    metaChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    metaChipText: { fontSize: 11, fontWeight: "600" },

    // Attachments
    attachmentsList: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderRadius: 12,
        overflow: "hidden",
        gap: 1,
    },
    attachmentItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    attachmentName: { flex: 1, fontSize: 12, fontWeight: "500" },
    attachmentSize: { fontSize: 11, fontWeight: "500" },
    moreAttachments: {
        fontSize: 12,
        fontWeight: "700",
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: "#6366F1",
    },

    // Card footer
    cardFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
    },
    statusText: { fontSize: 12, fontWeight: "700" },
    reviewBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#6366F1",
        paddingVertical: 9,
        paddingHorizontal: 18,
        borderRadius: 20,
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    reviewBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

    // Empty state
    emptyState: {
        alignItems: "center",
        padding: 48,
        borderRadius: 20,
        borderWidth: 1,
        gap: 10,
    },
    emptyIconRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    emptyTitle: { fontSize: 17, fontWeight: "700" },
    emptyText: { fontSize: 13, textAlign: "center" },

    // Pagination footer (fixed at bottom)
    paginationFooter: {
        borderTopWidth: 1,
        paddingTop: 10,
        paddingHorizontal: 16,
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
    },
    paginationControls: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    pageBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    pageNumbers: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
    pageNumBtn: {
        minWidth: 38,
        height: 38,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 6,
    },
    pageNumBtnActive: {
        backgroundColor: "#6366F1",
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 4,
    },
    pageNumText: { fontSize: 14, fontWeight: "700" },
    pageNumTextActive: { color: "#fff" },
    pageCaption: {
        textAlign: "center",
        fontSize: 12,
        fontWeight: "500",
        marginTop: -6,
    },
});
