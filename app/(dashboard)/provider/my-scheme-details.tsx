import { useTheme } from "@/context/ThemeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import React, { useMemo, useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReviewerHeader from "../../../components/ReviewerHeader";

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    active: {
        gradient: ["#00C6A2", "#009E7F"] as [string, string],
        glow: "#00C6A220",
        bg: "#E6FAF7", darkBg: "rgba(0,198,162,0.18)",
        text: "#009E7F", darkText: "#00DFB5",
        border: "#8EEEDD", darkBorder: "rgba(0,198,162,0.4)",
        icon: "checkmark-circle" as const,
    },
    closed: {
        gradient: ["#FF6B6B", "#E53935"] as [string, string],
        glow: "#FF6B6B20",
        bg: "#FFF0F0", darkBg: "rgba(255,107,107,0.18)",
        text: "#E53935", darkText: "#FF8080",
        border: "#FFBCBC", darkBorder: "rgba(255,107,107,0.4)",
        icon: "close-circle" as const,
    },
    pending: {
        gradient: ["#FFB347", "#FF8C00"] as [string, string],
        glow: "#FFB34720",
        bg: "#FFF8EE", darkBg: "rgba(255,179,71,0.18)",
        text: "#FF8C00", darkText: "#FFB347",
        border: "#FFD9A0", darkBorder: "rgba(255,179,71,0.4)",
        icon: "time" as const,
    },
    draft: {
        gradient: ["#7C83FC", "#5A60F0"] as [string, string],
        glow: "#7C83FC20",
        bg: "#F0F1FF", darkBg: "rgba(124,131,252,0.18)",
        text: "#5A60F0", darkText: "#9EA5FF",
        border: "#C5C9FD", darkBorder: "rgba(124,131,252,0.4)",
        icon: "create" as const,
    },
};

// Vibrant accent colors for stat cards
const STAT_PALETTES = [
    { bg: ["#667EEA", "#764BA2"] as [string, string], icon: "#EDE9FF", label: "#C4B5FD" },
    { bg: ["#11998E", "#38EF7D"] as [string, string], icon: "#D4FAE9", label: "#6EF0B0" },
    { bg: ["#F7971E", "#FFD200"] as [string, string], icon: "#FFF5CC", label: "#FBDB7A" },
];

export default function MySchemeDetailsScreen() {
    const { isDark, colors } = useTheme();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const [imgError, setImgError] = useState(false);

    const stripHtml = (html: string) =>
        html
            .replace(/<[^>]*>/g, " ")
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&nbsp;/g, " ").replace(/\s{2,}/g, " ").trim();

    // ─── Parse params ─────────────────────────────────────────────────────────
    const raw = useMemo(() => {
        if (params.scheme) {
            try { return JSON.parse(params.scheme as string); } catch { }
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
            image: params.image,
        };
    }, [params]);

    const s = useMemo(() => {
        const statusKey = ((raw.status as string) || "draft").toLowerCase() as keyof typeof STATUS_CONFIG;
        const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.draft;

        const totalSeatsRaw = raw.total_seats ? parseInt(raw.total_seats as string) : null;
        const applicants = parseInt((raw.applications_count as string) || "0");
        const fundAmountRaw = raw.fund_amount ? parseFloat(raw.fund_amount as string) : null;
        const fillPct = totalSeatsRaw && applicants ? Math.min((applicants / totalSeatsRaw) * 100, 100) : null;
        const isVisible = raw.visible === true || raw.visible === "true" || raw.visible === 1;
        const providerName = (raw.provider_name as string)?.trim() || "Independent";

        return {
            id: (raw.id as string) || "—",
            title: (raw.title as string) || "Untitled Scheme",
            shortname: (raw.shortname as string) || "",
            statusKey,
            statusLabel: statusKey.charAt(0).toUpperCase() + statusKey.slice(1),
            cfg,
            description: stripHtml((raw.description as string) || "No description available."),
            fundAmount: fundAmountRaw,
            startDate: (raw.start_date as string) || "",
            endDate: (raw.end_date as string) || "",
            category: (raw.category as string) || "General",
            providerName,
            totalSeats: totalSeatsRaw,
            applicants,
            fillPct,
            isVisible,
            createdAt: (raw.created_at as string) || "",
            image: (raw.image as string) || "",
        };
    }, [raw]);

    // ─── Formatters ───────────────────────────────────────────────────────────
    const formatCurrency = (amount: number | null) => {
        if (amount === null || isNaN(amount)) return "Not Disclosed";
        if (amount === 0) return "Not Disclosed";
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
        return `₹${amount.toLocaleString("en-IN")}`;
    };

    const formatDate = (d: string) => {
        if (!d) return "Not Set";
        return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    };

    const formatShortDate = (d: string) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    };

    const getYear = (d: string) => {
        if (!d) return "";
        return new Date(d).getFullYear().toString();
    };

    const getDaysLeft = (endDate: string) => {
        if (!endDate) return null;
        return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    };

    const getInitials = (title: string) =>
        title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

    const formatCreatedAt = (d: string) => {
        if (!d) return "Unknown";
        return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    };

    const daysLeft = getDaysLeft(s.endDate);
    const isExpired = daysLeft !== null && daysLeft < 0;
    const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

    // ─── Theme vars ───────────────────────────────────────────────────────────
    const bg = isDark ? "#0A0F1E" : "#F2F5FF";
    const cardBg = isDark ? "#111827" : "#FFFFFF";
    const cardBorder = isDark ? "#1E2A45" : "#E4E9F8";
    const textPrimary = isDark ? "#F0F4FF" : "#0D1340";
    const textSecondary = isDark ? "#8494B7" : "#6172A0";
    const divider = isDark ? "#1A2340" : "#EEF1FA";

    const timelinePalette = isExpired
        ? { grad: ["#EF4444", "#DC2626"] as [string, string], label: "Expired" }
        : isUrgent
            ? { grad: ["#F97316", "#EA580C"] as [string, string], label: "Closing Soon" }
            : { grad: ["#10B981", "#059669"] as [string, string], label: "Active" };

    return (
        <View style={[styles.root, { backgroundColor: bg }]}>
            <ReviewerHeader title="Scheme Details" />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ══════════ HERO CARD ══════════ */}
                <MotiView
                    from={{ opacity: 0, translateY: -20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: "timing", duration: 450 }}
                >
                    <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>

                        {/* Cover image OR gradient banner */}
                        {s.image && !imgError ? (
                            <View style={styles.coverWrap}>
                                <Image
                                    source={{ uri: s.image }}
                                    style={styles.coverImage}
                                    onError={() => setImgError(true)}
                                />
                                <LinearGradient
                                    colors={["transparent", isDark ? "#111827" : "#ffffff"]}
                                    style={styles.coverFade}
                                />
                            </View>
                        ) : (
                            <LinearGradient
                                colors={s.cfg.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.heroBanner}
                            >
                                {/* Decorative circles */}
                                <View style={styles.bannerCircle1} />
                                <View style={styles.bannerCircle2} />
                                <Text style={styles.bannerInitials}>{getInitials(s.title)}</Text>
                            </LinearGradient>
                        )}

                        <View style={styles.heroBody}>
                            {/* Visibility pill floating top-right */}
                            <View style={styles.visibilityRow}>
                                <View style={[
                                    styles.visibilityPill,
                                    {
                                        backgroundColor: s.isVisible
                                            ? (isDark ? "rgba(0,198,162,0.18)" : "#E6FAF7")
                                            : (isDark ? "rgba(100,116,139,0.18)" : "#F1F5F9"),
                                        borderColor: s.isVisible
                                            ? (isDark ? "rgba(0,198,162,0.4)" : "#8EEEDD")
                                            : (isDark ? "#334155" : "#CBD5E1"),
                                    },
                                ]}>
                                    <View style={[styles.visibilityDot, {
                                        backgroundColor: s.isVisible ? "#00C6A2" : "#94A3B8"
                                    }]} />
                                    <Text style={[styles.visibilityText, {
                                        color: s.isVisible
                                            ? (isDark ? "#00DFB5" : "#009E7F")
                                            : textSecondary
                                    }]}>
                                        {s.isVisible ? "Publicly Visible" : "Hidden"}
                                    </Text>
                                </View>
                            </View>

                            {/* Title */}
                            <Text style={[styles.heroTitle, { color: textPrimary }]}>{s.title}</Text>

                            {/* Shortname */}
                            {s.shortname ? (
                                <View style={styles.shortnameRow}>
                                    <MaterialCommunityIcons name="file-document-outline" size={13} color={textSecondary} />
                                    <Text style={[styles.shortnameText, { color: textSecondary }]}>{s.shortname}</Text>
                                </View>
                            ) : null}

                            {/* Badge strip */}
                            <View style={styles.badgeStrip}>
                                {/* Status */}
                                <LinearGradient
                                    colors={s.cfg.gradient}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={styles.statusGradBadge}
                                >
                                    <Ionicons name={s.cfg.icon} size={12} color="#fff" />
                                    <Text style={styles.statusGradText}>{s.statusLabel}</Text>
                                </LinearGradient>

                                {/* Category */}
                                <View style={[styles.chip, {
                                    backgroundColor: isDark ? "rgba(124,131,252,0.18)" : "#EDEDFF",
                                    borderColor: isDark ? "rgba(124,131,252,0.35)" : "#C5C9FD",
                                }]}>
                                    <Ionicons name="location" size={11} color={isDark ? "#9EA5FF" : "#5A60F0"} />
                                    <Text style={[styles.chipText, { color: isDark ? "#9EA5FF" : "#4338CA" }]}>{s.category}</Text>
                                </View>

                                {/* Provider */}
                                <View style={[styles.chip, {
                                    backgroundColor: isDark ? "rgba(148,163,184,0.12)" : "#F8FAFC",
                                    borderColor: cardBorder,
                                }]}>
                                    <Ionicons name="business" size={11} color={textSecondary} />
                                    <Text style={[styles.chipText, { color: textSecondary }]} numberOfLines={1}>{s.providerName}</Text>
                                </View>
                            </View>

                            {/* Meta footer */}
                            <View style={[styles.heroFooter, { borderTopColor: divider }]}>
                                <View style={styles.heroMetaItem}>
                                    <Text style={[styles.heroMetaLabel, { color: textSecondary }]}>Scheme ID</Text>
                                    <Text style={[styles.heroMetaValue, { color: textPrimary }]}>#{s.id}</Text>
                                </View>
                                <View style={[styles.heroMetaDivider, { backgroundColor: divider }]} />
                                <View style={styles.heroMetaItem}>
                                    <Text style={[styles.heroMetaLabel, { color: textSecondary }]}>Created</Text>
                                    <Text style={[styles.heroMetaValue, { color: textPrimary }]}>{formatCreatedAt(s.createdAt)}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </MotiView>

                {/* ══════════ STATS GRID ══════════ */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: "timing", duration: 420, delay: 80 }}
                >
                    <View style={styles.statsGrid}>
                        {/* Fund Size (Full Width Header Card) */}
                        <LinearGradient
                            colors={STAT_PALETTES[0].bg}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.statCardFull}
                        >
                            <View style={styles.statCardFullLeft}>
                                <View style={[styles.statIconCircle, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                                    <Ionicons name="cash" size={22} color="#fff" />
                                </View>
                                <Text style={[styles.statLabelWhite, { color: STAT_PALETTES[0].label, fontSize: 13 }]}>Fund Size</Text>
                            </View>
                            <View style={styles.statCardFullRight}>
                                <Text style={[styles.statValueWhite, { fontSize: 22 }]} adjustsFontSizeToFit numberOfLines={1}>
                                    {formatCurrency(s.fundAmount)}
                                </Text>
                            </View>
                        </LinearGradient>

                        <View style={styles.statsRow}>
                            {/* Applicants */}
                            <LinearGradient
                                colors={STAT_PALETTES[1].bg}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={styles.statCard}
                            >
                                <View style={[styles.statIconCircle, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                                    <Ionicons name="people" size={20} color="#fff" />
                                </View>
                                <Text style={styles.statValueWhite}>{s.applicants}</Text>
                                <Text style={[styles.statLabelWhite, { color: STAT_PALETTES[1].label }]}>Applicants</Text>
                            </LinearGradient>

                            {/* Seats */}
                            <LinearGradient
                                colors={STAT_PALETTES[2].bg}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={styles.statCard}
                            >
                                <View style={[styles.statIconCircle, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                                    <MaterialCommunityIcons name="seat" size={20} color="#fff" />
                                </View>
                                <Text style={styles.statValueWhite} numberOfLines={1} adjustsFontSizeToFit>
                                    {s.totalSeats !== null ? s.totalSeats.toString() : "Open"}
                                </Text>
                                <Text style={[styles.statLabelWhite, { color: STAT_PALETTES[2].label }]}>
                                    {s.totalSeats !== null ? "Total Seats" : "Seats"}
                                </Text>
                            </LinearGradient>
                        </View>
                    </View>
                </MotiView>

                {/* ══════════ SEAT FILL RATE ══════════ */}
                {s.fillPct !== null && (
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: "timing", duration: 420, delay: 140 }}
                    >
                        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <SectionHeading
                                icon="bar-chart" label="Seat Fill Rate"
                                iconBg={isDark ? "rgba(124,131,252,0.2)" : "#EDEDFF"}
                                iconColor={isDark ? "#9EA5FF" : "#5A60F0"}
                                textColor={textPrimary}
                            />

                            <View style={styles.fillMeta}>
                                <Text style={[styles.fillMetaText, { color: textSecondary }]}>
                                    {s.applicants} of {s.totalSeats} seats filled
                                </Text>
                                <View style={[styles.pctBubble, {
                                    backgroundColor: s.fillPct >= 80
                                        ? (isDark ? "rgba(239,68,68,0.18)" : "#FEF2F2")
                                        : s.fillPct >= 50
                                            ? (isDark ? "rgba(255,179,71,0.18)" : "#FFF8EE")
                                            : (isDark ? "rgba(0,198,162,0.18)" : "#E6FAF7"),
                                }]}>
                                    <Text style={[styles.pctBubbleText, {
                                        color: s.fillPct >= 80
                                            ? (isDark ? "#FF8080" : "#E53935")
                                            : s.fillPct >= 50
                                                ? (isDark ? "#FFB347" : "#FF8C00")
                                                : (isDark ? "#00DFB5" : "#009E7F"),
                                    }]}>{s.fillPct.toFixed(0)}%</Text>
                                </View>
                            </View>

                            <View style={[styles.progressTrack, { backgroundColor: isDark ? "#1E2A45" : "#EEF1FA" }]}>
                                <LinearGradient
                                    colors={
                                        s.fillPct >= 80
                                            ? ["#FF6B6B", "#E53935"]
                                            : s.fillPct >= 50
                                                ? ["#FFB347", "#FF8C00"]
                                                : ["#00C6A2", "#009E7F"]
                                    }
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={[styles.progressFill, { width: `${s.fillPct}%` as any }]}
                                />
                            </View>

                            <Text style={[styles.remainingText, { color: textSecondary }]}>
                                {s.totalSeats! - s.applicants} seats still available
                            </Text>
                        </View>
                    </MotiView>
                )}

                {/* ══════════ TIMELINE ══════════ */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: "timing", duration: 420, delay: 180 }}
                >
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <SectionHeading
                            icon="calendar" label="Timeline"
                            iconBg={isDark ? "rgba(0,198,162,0.2)" : "#E6FAF7"}
                            iconColor={isDark ? "#00DFB5" : "#009E7F"}
                            textColor={textPrimary}
                        />

                        <View style={styles.dateRow}>
                            {/* Start */}
                            <DateBlock
                                label="START DATE"
                                date={formatShortDate(s.startDate)}
                                year={getYear(s.startDate)}
                                gradient={["#00C6A2", "#009E7F"]}
                                iconName="play-circle"
                                isDark={isDark}
                                empty={!s.startDate}
                            />

                            <View style={styles.dateConnector}>
                                <View style={[styles.connectorLine, { backgroundColor: divider }]} />
                                <View style={[styles.connectorDot, {
                                    backgroundColor: timelinePalette.grad[0],
                                }]} />
                                <View style={[styles.connectorLine, { backgroundColor: divider }]} />
                            </View>

                            {/* End */}
                            <DateBlock
                                label="END DATE"
                                date={formatShortDate(s.endDate)}
                                year={getYear(s.endDate) || "Open"}
                                gradient={
                                    isExpired
                                        ? ["#FF6B6B", "#E53935"]
                                        : isUrgent
                                            ? ["#FFB347", "#FF8C00"]
                                            : ["#7C83FC", "#5A60F0"]
                                }
                                iconName={isExpired ? "close-circle" : isUrgent ? "warning" : "flag"}
                                isDark={isDark}
                                empty={!s.endDate}
                            />
                        </View>

                        {/* Days left banner */}
                        {daysLeft !== null && (
                            <LinearGradient
                                colors={timelinePalette.grad}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.daysBanner}
                            >
                                {/* Decorative blob */}
                                <View style={styles.daysBannerBlob} />
                                <View style={styles.daysBannerLeft}>
                                    <View style={styles.daysBannerIconBox}>
                                        <Ionicons name="time" size={22} color="#fff" />
                                    </View>
                                    <View>
                                        <Text style={styles.daysBannerTitle}>
                                            {isExpired ? "Scheme Expired" : isUrgent ? "Closing Very Soon!" : "Running Smoothly"}
                                        </Text>
                                        <Text style={styles.daysBannerSub}>
                                            {isExpired
                                                ? `Ended on ${formatDate(s.endDate)}`
                                                : `Deadline: ${formatDate(s.endDate)}`}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.daysBannerRight}>
                                    <Text style={styles.daysBannerNum}>{isExpired ? "0" : daysLeft}</Text>
                                    <Text style={styles.daysBannerUnit}>days left</Text>
                                </View>
                            </LinearGradient>
                        )}
                    </View>
                </MotiView>

                {/* ══════════ DESCRIPTION ══════════ */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: "timing", duration: 420, delay: 240 }}
                >
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <SectionHeading
                            icon="document-text" label="About This Scheme"
                            iconBg={isDark ? "rgba(124,131,252,0.2)" : "#EDEDFF"}
                            iconColor={isDark ? "#9EA5FF" : "#5A60F0"}
                            textColor={textPrimary}
                        />
                        <Text style={[styles.descText, { color: textSecondary }]}>
                            {s.description || "No description provided for this scheme."}
                        </Text>
                    </View>
                </MotiView>

                {/* ══════════ QUICK INFO ══════════ */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: "timing", duration: 420, delay: 300 }}
                >
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <SectionHeading
                            icon="information-circle" label="Quick Info"
                            iconBg={isDark ? "rgba(255,179,71,0.2)" : "#FFF8EE"}
                            iconColor={isDark ? "#FFB347" : "#FF8C00"}
                            textColor={textPrimary}
                        />

                        <InfoRow icon="business" label="Provider" value={s.providerName}
                            isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} divider={divider} />
                        <InfoRow icon="location" label="Category / Region" value={s.category}
                            isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} divider={divider} />
                        <InfoRow icon="cash" label="Fund Amount" value={formatCurrency(s.fundAmount)}
                            isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} divider={divider} />
                        <InfoRow icon="eye" label="Visibility"
                            value={s.isVisible ? "Publicly Listed" : "Hidden from public"}
                            isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} divider={divider} />
                        <InfoRow icon="calendar-outline" label="Created On" value={formatCreatedAt(s.createdAt)}
                            isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} divider={divider} />
                        {s.shortname ? (
                            <InfoRow icon="link" label="Shortname" value={s.shortname}
                                isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} divider={divider} isLast />
                        ) : (
                            <InfoRow icon="pricetag" label="Scheme ID" value={`#${s.id}`}
                                isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} divider={divider} isLast />
                        )}
                    </View>
                </MotiView>

                {/* ══════════ ACTIONS ══════════ */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: "timing", duration: 420, delay: 360 }}
                >
                    <View style={styles.actionsWrap}>
                        {/* View Applicants – primary */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => router.push({
                                pathname: "/(dashboard)/provider/applicants",
                                params: { scholarship_id: s.id, scheme_title: s.title },
                            })}
                        >
                            <LinearGradient
                                colors={s.cfg.gradient}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.primaryBtn}
                            >
                                <View style={styles.btnBlob} />
                                <View style={styles.btnInner}>
                                    <View style={styles.btnIconBox}>
                                        <Ionicons name="people" size={22} color="#fff" />
                                    </View>
                                    <View style={styles.btnTexts}>
                                        <Text style={styles.btnTitle}>View Applicants</Text>
                                        <Text style={styles.btnSub}>
                                            {s.applicants > 0
                                                ? `${s.applicants} application${s.applicants !== 1 ? "s" : ""} received`
                                                : "No applications yet"}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Analytics – secondary */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={[styles.secondaryBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
                            onPress={() => router.push({
                                pathname: "/(dashboard)/provider/reports",
                                params: { scheme_id: s.id, scheme_name: s.title },
                            })}
                        >
                            <View style={styles.btnInner}>
                                <View style={[styles.btnIconBox, { backgroundColor: isDark ? "rgba(124,131,252,0.2)" : "#EDEDFF" }]}>
                                    <Ionicons name="stats-chart" size={22} color={isDark ? "#9EA5FF" : "#5A60F0"} />
                                </View>
                                <View style={styles.btnTexts}>
                                    <Text style={[styles.btnTitle, { color: textPrimary }]}>View Analytics</Text>
                                    <Text style={[styles.btnSub, { color: textSecondary }]}>Performance & insights</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                        </TouchableOpacity>
                    </View>
                </MotiView>
            </ScrollView>
        </View>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({
    icon, label, iconBg, iconColor, textColor,
}: { icon: any; label: string; iconBg: string; iconColor: string; textColor: string }) {
    return (
        <View style={sh.row}>
            <View style={[sh.iconBox, { backgroundColor: iconBg }]}>
                <Ionicons name={icon} size={18} color={iconColor} />
            </View>
            <Text style={[sh.label, { color: textColor }]}>{label}</Text>
        </View>
    );
}
const sh = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 10 },
    iconBox: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    label: { fontSize: 16, fontWeight: "700" },
});

function DateBlock({
    label, date, year, gradient, iconName, isDark, empty,
}: {
    label: string; date: string; year: string;
    gradient: [string, string]; iconName: any;
    isDark: boolean; empty: boolean;
}) {
    return (
        <View style={[db.card, {
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FAFBFF",
            borderColor: isDark ? "#1E2A45" : "#E4E9F8",
        }]}>
            <LinearGradient colors={gradient} style={db.iconBox}>
                <Ionicons name={iconName} size={16} color="#fff" />
            </LinearGradient>
            <Text style={[db.labelText, { color: gradient[0] }]}>{label}</Text>
            <Text style={[db.dateText, { color: isDark ? "#F0F4FF" : "#0D1340" }]}>
                {empty ? "—" : date}
            </Text>
            <Text style={[db.yearText, { color: isDark ? "#8494B7" : "#6172A0" }]}>
                {empty ? "Not Set" : year}
            </Text>
        </View>
    );
}
const db = StyleSheet.create({
    card: {
        flex: 1, borderRadius: 16, borderWidth: 1,
        padding: 14, gap: 5, alignItems: "flex-start",
    },
    iconBox: {
        width: 38, height: 38, borderRadius: 11,
        alignItems: "center", justifyContent: "center",
        marginBottom: 4,
    },
    labelText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
    dateText: { fontSize: 22, fontWeight: "800", lineHeight: 28 },
    yearText: { fontSize: 12, fontWeight: "500" },
});

function InfoRow({
    icon, label, value, isDark, textPrimary, textSecondary, divider, isLast,
}: {
    icon: any; label: string; value: string;
    isDark: boolean; textPrimary: string; textSecondary: string;
    divider: string; isLast?: boolean;
}) {
    return (
        <>
            <View style={ir.row}>
                <View style={[ir.iconBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F2F5FF" }]}>
                    <Ionicons name={icon} size={15} color={textSecondary} />
                </View>
                <View style={ir.texts}>
                    <Text style={[ir.label, { color: textSecondary }]}>{label}</Text>
                    <Text style={[ir.value, { color: textPrimary }]} numberOfLines={2}>
                        {value || "—"}
                    </Text>
                </View>
            </View>
            {!isLast && <View style={[ir.sep, { backgroundColor: divider }]} />}
        </>
    );
}
const ir = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
    iconBox: {
        width: 34, height: 34, borderRadius: 9,
        alignItems: "center", justifyContent: "center",
    },
    texts: { flex: 1, gap: 2 },
    label: { fontSize: 11, fontWeight: "500" },
    value: { fontSize: 13, fontWeight: "600" },
    sep: { height: 1, marginLeft: 46 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    content: { padding: 16, gap: 14 },

    // ── Hero
    heroCard: {
        borderRadius: 22, borderWidth: 1, overflow: "hidden",
        shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1, shadowRadius: 18, elevation: 6,
    },
    heroBanner: {
        height: 130, alignItems: "center", justifyContent: "center",
        overflow: "hidden",
    },
    bannerCircle1: {
        position: "absolute", width: 180, height: 180, borderRadius: 90,
        backgroundColor: "rgba(255,255,255,0.08)", top: -60, right: -40,
    },
    bannerCircle2: {
        position: "absolute", width: 100, height: 100, borderRadius: 50,
        backgroundColor: "rgba(255,255,255,0.08)", bottom: -20, left: -20,
    },
    bannerInitials: { fontSize: 48, fontWeight: "900", color: "rgba(255,255,255,0.85)" },

    coverWrap: { height: 160, width: "100%" },
    coverImage: { width: "100%", height: "100%" },
    coverFade: {
        position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
    },

    heroBody: { padding: 18, gap: 12 },

    visibilityRow: { flexDirection: "row" },
    visibilityPill: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, borderWidth: 1,
    },
    visibilityDot: { width: 7, height: 7, borderRadius: 4 },
    visibilityText: { fontSize: 11, fontWeight: "700" },

    heroTitle: { fontSize: 20, fontWeight: "900", lineHeight: 28 },

    shortnameRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: -4 },
    shortnameText: { fontSize: 12, fontWeight: "500" },

    badgeStrip: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    statusGradBadge: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    },
    statusGradText: { fontSize: 12, fontWeight: "800", color: "#fff" },
    chip: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
    },
    chipText: { fontSize: 11, fontWeight: "600", maxWidth: 130 },

    heroFooter: {
        flexDirection: "row", alignItems: "center", paddingTop: 12, borderTopWidth: 1,
    },
    heroMetaItem: { flex: 1, gap: 2 },
    heroMetaLabel: { fontSize: 11, fontWeight: "500" },
    heroMetaValue: { fontSize: 13, fontWeight: "700" },
    heroMetaDivider: { width: 1, height: 28, marginHorizontal: 16 },

    // ── Stats
    statsGrid: { gap: 10 },
    statsRow: { flexDirection: "row", gap: 10 },
    statCardFull: {
        width: "100%", borderRadius: 18, padding: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
    },
    statCardFullLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    statCardFullRight: { flex: 1.2, alignItems: "flex-end" },
    statCard: {
        flex: 1, borderRadius: 18, padding: 14, gap: 6,
        alignItems: "flex-start", overflow: "hidden",
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
    },
    statIconCircle: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
        marginBottom: 2,
    },
    statValueWhite: { fontSize: 19, fontWeight: "900", color: "#fff" },
    statLabelWhite: { fontSize: 10, fontWeight: "600" },

    // ── Card
    card: {
        borderRadius: 20, borderWidth: 1, padding: 18, gap: 14,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },

    // ── Fill rate
    fillMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    fillMetaText: { fontSize: 13, fontWeight: "500" },
    pctBubble: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    pctBubbleText: { fontSize: 14, fontWeight: "900" },
    progressTrack: { height: 12, borderRadius: 6, overflow: "hidden" },
    progressFill: { height: 12, borderRadius: 6 },
    remainingText: { fontSize: 12, fontWeight: "500", marginTop: -4 },

    // ── Timeline
    dateRow: { flexDirection: "row", alignItems: "stretch", gap: 0 },
    dateConnector: {
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 4, paddingHorizontal: 8,
    },
    connectorLine: { width: 1, flex: 1, maxHeight: 30 },
    connectorDot: { width: 10, height: 10, borderRadius: 5 },

    daysBanner: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 16, padding: 16,
        overflow: "hidden",
    },
    daysBannerBlob: {
        position: "absolute", width: 160, height: 160, borderRadius: 80,
        backgroundColor: "rgba(255,255,255,0.08)", right: -40, top: -60,
    },
    daysBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    daysBannerIconBox: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.22)",
        alignItems: "center", justifyContent: "center",
    },
    daysBannerTitle: { fontSize: 15, fontWeight: "800", color: "#fff" },
    daysBannerSub: { fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.75)", marginTop: 2 },
    daysBannerRight: { alignItems: "center" },
    daysBannerNum: { fontSize: 30, fontWeight: "900", color: "#fff", lineHeight: 34 },
    daysBannerUnit: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.8)" },

    // ── Description
    descText: { fontSize: 14, lineHeight: 24 },

    // ── Actions
    actionsWrap: { gap: 12 },
    primaryBtn: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between",
        padding: 18, borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2, shadowRadius: 14, elevation: 7,
    },
    secondaryBtn: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between",
        padding: 18, borderRadius: 20, borderWidth: 1,
    },
    btnBlob: {
        position: "absolute", width: 200, height: 200, borderRadius: 100,
        backgroundColor: "rgba(255,255,255,0.08)", right: -60, top: -80,
    },
    btnInner: { flexDirection: "row", alignItems: "center", gap: 14 },
    btnIconBox: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.22)",
        alignItems: "center", justifyContent: "center",
    },
    btnTexts: { gap: 2 },
    btnTitle: { fontSize: 15, fontWeight: "800", color: "#fff" },
    btnSub: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.7)" },
});