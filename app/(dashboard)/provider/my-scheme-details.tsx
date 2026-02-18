import { useTheme } from "@/context/ThemeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import React, { useMemo } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReviewerHeader from "../../../components/ReviewerHeader";

const STATUS_CONFIG = {
    active: { gradient: ["#10B981", "#059669"] as [string, string], bg: "#ECFDF5", darkBg: "rgba(16,185,129,0.15)", text: "#059669", darkText: "#34D399", border: "#A7F3D0", darkBorder: "rgba(16,185,129,0.35)" },
    closed: { gradient: ["#EF4444", "#DC2626"] as [string, string], bg: "#FEF2F2", darkBg: "rgba(239,68,68,0.15)", text: "#DC2626", darkText: "#F87171", border: "#FECACA", darkBorder: "rgba(239,68,68,0.35)" },
    pending: { gradient: ["#F59E0B", "#D97706"] as [string, string], bg: "#FFFBEB", darkBg: "rgba(245,158,11,0.15)", text: "#D97706", darkText: "#FBBF24", border: "#FDE68A", darkBorder: "rgba(245,158,11,0.35)" },
    draft: { gradient: ["#6366F1", "#4F46E5"] as [string, string], bg: "#EEF2FF", darkBg: "rgba(99,102,241,0.15)", text: "#4F46E5", darkText: "#818CF8", border: "#C7D2FE", darkBorder: "rgba(99,102,241,0.35)" },
};

export default function MySchemeDetailsScreen() {
    const { isDark, colors } = useTheme();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();

    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").trim();

    // Support both: JSON 'scheme' param OR flat individual params
    const raw = useMemo(() => {
        if (params.scheme) {
            try { return JSON.parse(params.scheme as string); } catch { /* fall through */ }
        }
        return {
            id: params.id,
            title: params.title,
            shortname: params.shortname,
            status: params.status,
            description: params.description,
            fund_amount: params.fund_amount,
            start_date: params.start_date,
            end_date: params.end_date,
            category: params.category,
            provider_name: params.provider_name,
            total_seats: params.total_seats,
            applications_count: params.applications_count,
            visible: params.visible,
            created_at: params.created_at,
        };
    }, [params]);

    const s = useMemo(() => {
        const statusKey = ((raw.status as string) || "draft").toLowerCase() as keyof typeof STATUS_CONFIG;
        const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.draft;
        const totalSeats = raw.total_seats ? parseInt(raw.total_seats as string) : null;
        const applicants = parseInt((raw.applications_count as string) || "0");
        const fundAmount = parseFloat((raw.fund_amount as string) || "0");
        const fillPct = totalSeats && applicants ? Math.min((applicants / totalSeats) * 100, 100) : null;

        return {
            id: (raw.id as string) || "",
            title: (raw.title as string) || "Untitled Scheme",
            shortname: (raw.shortname as string) || "",
            statusKey,
            statusLabel: statusKey.charAt(0).toUpperCase() + statusKey.slice(1),
            cfg,
            description: stripHtml((raw.description as string) || "No description available."),
            fundAmount,
            startDate: (raw.start_date as string) || "",
            endDate: (raw.end_date as string) || "",
            category: (raw.category as string) || "",
            providerName: (raw.provider_name as string) || "",
            totalSeats,
            applicants,
            fillPct,
        };
    }, [raw]);

    const formatCurrency = (amount: number) => {
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
        return `₹${amount}`;
    };

    const formatDate = (d: string) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    };

    const getDaysLeft = (endDate: string) => {
        if (!endDate) return null;
        return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    };

    const getInitials = (title: string) =>
        title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

    const daysLeft = getDaysLeft(s.endDate);
    const isExpired = daysLeft !== null && daysLeft < 0;
    const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
    const cardBg = isDark ? "#1E293B" : "#FFFFFF";
    const cardBorder = isDark ? "#334155" : "#E8EDF5";
    const textPrimary = isDark ? "#F1F5F9" : "#0F172A";
    const textSecondary = isDark ? "#94A3B8" : "#64748B";
    const dividerColor = isDark ? "#334155" : "#F1F5F9";

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" }]}>
            <ReviewerHeader title="Scheme Details" />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── HERO CARD ── */}
                <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 400 }}>
                    <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        {/* Accent bar */}
                        <LinearGradient colors={s.cfg.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.heroAccent} />

                        <View style={styles.heroBody}>
                            {/* Avatar + Title row */}
                            <View style={styles.heroTopRow}>
                                <LinearGradient colors={s.cfg.gradient} style={styles.heroAvatar}>
                                    <Text style={styles.heroAvatarText}>{getInitials(s.title)}</Text>
                                </LinearGradient>

                                <View style={styles.heroTitleBlock}>
                                    <Text style={[styles.heroTitle, { color: textPrimary }]} numberOfLines={2}>{s.title}</Text>
                                    {s.shortname ? (
                                        <View style={styles.heroShortRow}>
                                            <MaterialCommunityIcons name="file-document-outline" size={12} color={textSecondary} />
                                            <Text style={[styles.heroShortname, { color: textSecondary }]} numberOfLines={1}>{s.shortname}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>

                            {/* Badges row */}
                            <View style={styles.heroBadgeRow}>
                                {/* Status */}
                                <View style={[styles.statusBadge, {
                                    backgroundColor: isDark ? s.cfg.darkBg : s.cfg.bg,
                                    borderColor: isDark ? s.cfg.darkBorder : s.cfg.border,
                                }]}>
                                    <View style={[styles.statusDot, { backgroundColor: isDark ? s.cfg.darkText : s.cfg.text }]} />
                                    <Text style={[styles.statusText, { color: isDark ? s.cfg.darkText : s.cfg.text }]}>{s.statusLabel}</Text>
                                </View>

                                {/* Category */}
                                <View style={[styles.categoryBadge, { backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF" }]}>
                                    <Ionicons name="location-outline" size={11} color={isDark ? "#818CF8" : "#6366F1"} />
                                    <Text style={[styles.categoryText, { color: isDark ? "#818CF8" : "#4F46E5" }]}>{s.category}</Text>
                                </View>

                                {/* Provider */}
                                <View style={[styles.providerBadge, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: cardBorder }]}>
                                    <Ionicons name="business-outline" size={11} color={textSecondary} />
                                    <Text style={[styles.providerText, { color: textSecondary }]} numberOfLines={1}>{s.providerName}</Text>
                                </View>
                            </View>

                            {/* ID row */}
                            <View style={[styles.idRow, { borderTopColor: dividerColor }]}>
                                <Text style={[styles.idLabel, { color: textSecondary }]}>Scheme ID</Text>
                                <Text style={[styles.idValue, { color: textPrimary }]}>#{s.id}</Text>
                            </View>
                        </View>
                    </View>
                </MotiView>

                {/* ── STATS GRID ── */}
                <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 400, delay: 80 }}>
                    <View style={styles.statsRow}>
                        {/* Fund */}
                        <View style={[styles.statCard, { backgroundColor: isDark ? "rgba(99,102,241,0.12)" : "#F0EEFF", borderColor: isDark ? "rgba(99,102,241,0.25)" : "#DDD6FE" }]}>
                            <View style={[styles.statIcon, { backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)" }]}>
                                <Ionicons name="cash-outline" size={20} color={isDark ? "#818CF8" : "#6366F1"} />
                            </View>
                            <Text style={[styles.statValue, { color: isDark ? "#818CF8" : "#4F46E5" }]}>{formatCurrency(s.fundAmount)}</Text>
                            <Text style={[styles.statLabel, { color: textSecondary }]}>Fund Size</Text>
                        </View>

                        {/* Applicants */}
                        <View style={[styles.statCard, { backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "#EDFAF4", borderColor: isDark ? "rgba(16,185,129,0.25)" : "#A7F3D0" }]}>
                            <View style={[styles.statIcon, { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.12)" }]}>
                                <Ionicons name="people-outline" size={20} color={isDark ? "#34D399" : "#10B981"} />
                            </View>
                            <Text style={[styles.statValue, { color: isDark ? "#34D399" : "#059669" }]}>{s.applicants}</Text>
                            <Text style={[styles.statLabel, { color: textSecondary }]}>Applicants</Text>
                        </View>

                        {/* Seats */}
                        <View style={[styles.statCard, { backgroundColor: isDark ? "rgba(245,158,11,0.12)" : "#FFF8EC", borderColor: isDark ? "rgba(245,158,11,0.25)" : "#FDE68A" }]}>
                            <View style={[styles.statIcon, { backgroundColor: isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.12)" }]}>
                                <MaterialCommunityIcons name="seat-outline" size={20} color={isDark ? "#FBBF24" : "#F59E0B"} />
                            </View>
                            <Text style={[styles.statValue, { color: isDark ? "#FBBF24" : "#D97706" }]}>{s.totalSeats ?? "∞"}</Text>
                            <Text style={[styles.statLabel, { color: textSecondary }]}>Total Seats</Text>
                        </View>
                    </View>
                </MotiView>

                {/* ── SEAT FILL RATE ── */}
                {s.fillPct !== null && (
                    <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 400, delay: 140 }}>
                        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIconBox, { backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF" }]}>
                                    <Ionicons name="bar-chart-outline" size={18} color={isDark ? "#818CF8" : "#6366F1"} />
                                </View>
                                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Seat Fill Rate</Text>
                                <View style={{ flex: 1 }} />
                                <View style={[styles.fillPctBadge, {
                                    backgroundColor: s.fillPct >= 80
                                        ? (isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2")
                                        : s.fillPct >= 50
                                            ? (isDark ? "rgba(245,158,11,0.15)" : "#FFFBEB")
                                            : (isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5")
                                }]}>
                                    <Text style={[styles.fillPctText, {
                                        color: s.fillPct >= 80
                                            ? (isDark ? "#F87171" : "#DC2626")
                                            : s.fillPct >= 50
                                                ? (isDark ? "#FBBF24" : "#D97706")
                                                : (isDark ? "#34D399" : "#059669")
                                    }]}>{s.fillPct.toFixed(0)}%</Text>
                                </View>
                            </View>

                            <View style={styles.fillMeta}>
                                <Text style={[styles.fillMetaText, { color: textSecondary }]}>{s.applicants} of {s.totalSeats} seats filled</Text>
                                <Text style={[styles.fillMetaText, { color: textSecondary }]}>{s.totalSeats! - s.applicants} remaining</Text>
                            </View>

                            <View style={[styles.progressTrack, { backgroundColor: isDark ? "#334155" : "#E5E7EB" }]}>
                                <LinearGradient
                                    colors={s.fillPct >= 80 ? ["#EF4444", "#DC2626"] : s.fillPct >= 50 ? ["#F59E0B", "#D97706"] : ["#10B981", "#059669"]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={[styles.progressFill, { width: `${s.fillPct}%` }]}
                                />
                            </View>
                        </View>
                    </MotiView>
                )}

                {/* ── TIMELINE ── */}
                <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 400, delay: 180 }}>
                    <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIconBox, { backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5" }]}>
                                <Ionicons name="calendar-outline" size={18} color={isDark ? "#34D399" : "#10B981"} />
                            </View>
                            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Timeline</Text>
                        </View>

                        {/* Two date cards side by side */}
                        <View style={styles.dateCardsRow}>
                            {/* Start Date */}
                            <View style={[styles.dateCard, { backgroundColor: isDark ? "rgba(16,185,129,0.1)" : "#ECFDF5", borderColor: isDark ? "rgba(16,185,129,0.25)" : "#A7F3D0" }]}>
                                <View style={[styles.dateCardIcon, { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.15)" }]}>
                                    <Ionicons name="play-circle-outline" size={18} color={isDark ? "#34D399" : "#10B981"} />
                                </View>
                                <Text style={[styles.dateCardLabel, { color: isDark ? "#34D399" : "#059669" }]}>Start Date</Text>
                                <Text style={[styles.dateCardDay, { color: textPrimary }]}>
                                    {s.startDate ? new Date(s.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                                </Text>
                                <Text style={[styles.dateCardYear, { color: textSecondary }]}>
                                    {s.startDate ? new Date(s.startDate).getFullYear() : ""}
                                </Text>
                            </View>

                            {/* Arrow connector */}
                            <View style={styles.dateArrow}>
                                <View style={[styles.dateArrowLine, { backgroundColor: isDark ? "#334155" : "#E2E8F0" }]} />
                                <Ionicons name="arrow-forward" size={14} color={isDark ? "#475569" : "#CBD5E1"} />
                                <View style={[styles.dateArrowLine, { backgroundColor: isDark ? "#334155" : "#E2E8F0" }]} />
                            </View>

                            {/* End Date */}
                            <View style={[styles.dateCard, {
                                backgroundColor: isExpired
                                    ? (isDark ? "rgba(239,68,68,0.1)" : "#FEF2F2")
                                    : isUrgent
                                        ? (isDark ? "rgba(245,158,11,0.1)" : "#FFFBEB")
                                        : (isDark ? "rgba(99,102,241,0.1)" : "#EEF2FF"),
                                borderColor: isExpired
                                    ? (isDark ? "rgba(239,68,68,0.25)" : "#FECACA")
                                    : isUrgent
                                        ? (isDark ? "rgba(245,158,11,0.25)" : "#FDE68A")
                                        : (isDark ? "rgba(99,102,241,0.25)" : "#C7D2FE"),
                            }]}>
                                <View style={[styles.dateCardIcon, {
                                    backgroundColor: isExpired
                                        ? (isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.12)")
                                        : isUrgent
                                            ? (isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.12)")
                                            : (isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)")
                                }]}>
                                    <Ionicons name="flag-outline" size={18} color={
                                        isExpired ? (isDark ? "#F87171" : "#EF4444") :
                                            isUrgent ? (isDark ? "#FBBF24" : "#F59E0B") :
                                                (isDark ? "#818CF8" : "#6366F1")
                                    } />
                                </View>
                                <Text style={[styles.dateCardLabel, {
                                    color: isExpired ? (isDark ? "#F87171" : "#DC2626") :
                                        isUrgent ? (isDark ? "#FBBF24" : "#D97706") :
                                            (isDark ? "#818CF8" : "#4F46E5")
                                }]}>End Date</Text>
                                <Text style={[styles.dateCardDay, { color: textPrimary }]}>
                                    {s.endDate ? new Date(s.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                                </Text>
                                <Text style={[styles.dateCardYear, { color: textSecondary }]}>
                                    {s.endDate ? new Date(s.endDate).getFullYear() : "Open"}
                                </Text>
                            </View>
                        </View>

                        {/* Days Left Banner */}
                        {daysLeft !== null && (
                            <LinearGradient
                                colors={
                                    isExpired ? ["#EF4444", "#DC2626"] :
                                        isUrgent ? ["#F59E0B", "#D97706"] :
                                            ["#10B981", "#059669"]
                                }
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.daysLeftBanner}
                            >
                                <View style={styles.daysLeftBannerLeft}>
                                    <View style={styles.daysLeftBannerIcon}>
                                        <Ionicons name="time-outline" size={20} color="#fff" />
                                    </View>
                                    <View>
                                        <Text style={styles.daysLeftBannerTitle}>
                                            {isExpired ? "This scheme has expired" : isUrgent ? "Closing soon!" : "Active & Running"}
                                        </Text>
                                        <Text style={styles.daysLeftBannerSub}>
                                            {isExpired ? "Deadline has passed" : `Ends on ${formatDate(s.endDate)}`}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.daysLeftBannerRight}>
                                    <Text style={styles.daysLeftBannerNum}>{isExpired ? "0" : `${daysLeft}`}</Text>
                                    <Text style={styles.daysLeftBannerUnit}>days left</Text>
                                </View>
                            </LinearGradient>
                        )}
                    </View>
                </MotiView>

                {/* ── DESCRIPTION ── */}
                <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 400, delay: 240 }}>
                    <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIconBox, { backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF" }]}>
                                <Ionicons name="document-text-outline" size={18} color={isDark ? "#818CF8" : "#6366F1"} />
                            </View>
                            <Text style={[styles.sectionTitle, { color: textPrimary }]}>About This Scheme</Text>
                        </View>
                        <Text style={[styles.descText, { color: textSecondary }]}>{s.description}</Text>
                    </View>
                </MotiView>

                {/* ── QUICK INFO ── */}
                <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 400, delay: 300 }}>
                    <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIconBox, { backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "#FFF8EC" }]}>
                                <Ionicons name="information-circle-outline" size={18} color={isDark ? "#FBBF24" : "#F59E0B"} />
                            </View>
                            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Quick Info</Text>
                        </View>

                        <View style={styles.infoGrid}>
                            <InfoRow icon="business-outline" label="Provider" value={s.providerName} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} dividerColor={dividerColor} />
                            <InfoRow icon="location-outline" label="Category / Region" value={s.category} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} dividerColor={dividerColor} />
                            <InfoRow icon="pricetag-outline" label="Scheme ID" value={`#${s.id}`} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} dividerColor={dividerColor} />
                            {s.shortname ? <InfoRow icon="link-outline" label="Shortname" value={s.shortname} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} dividerColor={dividerColor} isLast /> : null}
                        </View>
                    </View>
                </MotiView>

                {/* ── ACTIONS ── */}
                <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 400, delay: 360 }}>
                    <View style={styles.actionsSection}>
                        {/* View Applicants */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => router.push({
                                pathname: "/(dashboard)/provider/applicants",
                                params: { scholarship_id: s.id, scheme_title: s.title }
                            })}
                        >
                            <LinearGradient colors={s.cfg.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryAction}>
                                <View style={styles.actionLeft}>
                                    <View style={styles.actionIconBox}>
                                        <Ionicons name="people" size={20} color="#fff" />
                                    </View>
                                    <View>
                                        <Text style={styles.actionTitle}>View Applicants</Text>
                                        <Text style={styles.actionSub}>{s.applicants} applications received</Text>
                                    </View>
                                </View>
                                <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.8)" />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Analytics */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={[styles.secondaryAction, { backgroundColor: cardBg, borderColor: cardBorder }]}
                            onPress={() => router.push({
                                pathname: "/(dashboard)/provider/reports",
                                params: { scheme_id: s.id, scheme_name: s.title }
                            })}
                        >
                            <View style={styles.actionLeft}>
                                <View style={[styles.actionIconBox, { backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF" }]}>
                                    <Ionicons name="stats-chart" size={20} color={isDark ? "#818CF8" : "#6366F1"} />
                                </View>
                                <View>
                                    <Text style={[styles.actionTitle, { color: textPrimary }]}>View Analytics</Text>
                                    <Text style={[styles.actionSub, { color: textSecondary }]}>Performance & insights</Text>
                                </View>
                            </View>
                            <Ionicons name="arrow-forward" size={18} color={textSecondary} />
                        </TouchableOpacity>
                    </View>
                </MotiView>
            </ScrollView>
        </View>
    );
}

// ── Reusable Info Row ──
function InfoRow({ icon, label, value, isDark, textPrimary, textSecondary, dividerColor, isLast }: {
    icon: any; label: string; value: string;
    isDark: boolean; textPrimary: string; textSecondary: string; dividerColor: string; isLast?: boolean;
}) {
    return (
        <>
            <View style={styles.infoRow}>
                <View style={[styles.infoIconBox, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC" }]}>
                    <Ionicons name={icon} size={15} color={textSecondary} />
                </View>
                <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: textSecondary }]}>{label}</Text>
                    <Text style={[styles.infoValue, { color: textPrimary }]} numberOfLines={2}>{value || "—"}</Text>
                </View>
            </View>
            {!isLast && <View style={[styles.infoSep, { backgroundColor: dividerColor }]} />}
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    content: { padding: 16, gap: 14 },

    // Hero
    heroCard: {
        borderRadius: 20, borderWidth: 1, overflow: "hidden",
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    },
    heroAccent: { height: 6, width: "100%" },
    heroBody: { padding: 16, gap: 14 },
    heroTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    heroAvatar: {
        width: 56, height: 56, borderRadius: 16,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    heroAvatarText: { fontSize: 20, fontWeight: "800", color: "#fff" },
    heroTitleBlock: { flex: 1, gap: 4 },
    heroTitle: { fontSize: 18, fontWeight: "800", lineHeight: 26 },
    heroShortRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    heroShortname: { fontSize: 11, fontWeight: "500", flex: 1 },
    heroBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    statusBadge: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, borderWidth: 1, gap: 5,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 12, fontWeight: "700" },
    categoryBadge: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, gap: 4,
    },
    categoryText: { fontSize: 12, fontWeight: "600" },
    providerBadge: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, borderWidth: 1, gap: 4,
    },
    providerText: { fontSize: 11, fontWeight: "500", maxWidth: 160 },
    idRow: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between",
        borderTopWidth: 1, paddingTop: 12,
    },
    idLabel: { fontSize: 12, fontWeight: "500" },
    idValue: { fontSize: 13, fontWeight: "700" },

    // Stats
    statsRow: { flexDirection: "row", gap: 10 },
    statCard: {
        flex: 1, borderRadius: 16, borderWidth: 1,
        paddingVertical: 14, paddingHorizontal: 10,
        alignItems: "flex-start", gap: 6,
    },
    statIcon: {
        width: 38, height: 38, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
        marginBottom: 4,
    },
    statValue: { fontSize: 20, fontWeight: "800" },
    statLabel: { fontSize: 11, fontWeight: "500" },

    // Section
    section: {
        borderRadius: 18, borderWidth: 1, padding: 16,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
        gap: 14,
    },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    sectionIconBox: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: "center", justifyContent: "center",
    },
    sectionTitle: { fontSize: 16, fontWeight: "700" },

    // Fill rate
    fillPctBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    fillPctText: { fontSize: 13, fontWeight: "800" },
    fillMeta: { flexDirection: "row", justifyContent: "space-between" },
    fillMetaText: { fontSize: 12, fontWeight: "500" },
    progressTrack: { height: 10, borderRadius: 5, overflow: "hidden" },
    progressFill: { height: 10, borderRadius: 5 },

    // Timeline
    // Date cards
    dateCardsRow: { flexDirection: "row", alignItems: "center", gap: 0 },
    dateCard: {
        flex: 1, borderRadius: 14, borderWidth: 1,
        padding: 14, gap: 4, alignItems: "flex-start",
    },
    dateCardIcon: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: "center", justifyContent: "center",
        marginBottom: 6,
    },
    dateCardLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
    dateCardDay: { fontSize: 20, fontWeight: "800", lineHeight: 26 },
    dateCardYear: { fontSize: 12, fontWeight: "500" },
    dateArrow: { flexDirection: "column", alignItems: "center", gap: 2, paddingHorizontal: 6 },
    dateArrowLine: { width: 1, height: 14 },

    // Days Left Banner
    daysLeftBanner: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 14, padding: 14, marginTop: 4,
    },
    daysLeftBannerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    daysLeftBannerIcon: {
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center", justifyContent: "center",
    },
    daysLeftBannerTitle: { fontSize: 14, fontWeight: "700", color: "#fff" },
    daysLeftBannerSub: { fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.75)", marginTop: 2 },
    daysLeftBannerRight: { alignItems: "center" },
    daysLeftBannerNum: { fontSize: 28, fontWeight: "900", color: "#fff", lineHeight: 32 },
    daysLeftBannerUnit: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.8)" },

    // Description
    descText: { fontSize: 14, lineHeight: 24, fontWeight: "400" },

    // Info grid
    infoGrid: { gap: 0 },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
    infoIconBox: {
        width: 32, height: 32, borderRadius: 8,
        alignItems: "center", justifyContent: "center",
    },
    infoContent: { flex: 1, gap: 2 },
    infoLabel: { fontSize: 11, fontWeight: "500" },
    infoValue: { fontSize: 13, fontWeight: "600" },
    infoSep: { height: 1, marginLeft: 44 },

    // Actions
    actionsSection: { gap: 10 },
    primaryAction: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between",
        padding: 16, borderRadius: 18,
    },
    secondaryAction: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between",
        padding: 16, borderRadius: 18, borderWidth: 1,
    },
    actionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    actionIconBox: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center", justifyContent: "center",
    },
    actionTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
    actionSub: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.7)", marginTop: 2 },
});
