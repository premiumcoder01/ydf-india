import { useTheme } from "@/context/ThemeContext";
import { getReviewerSchemes } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ReviewerHeader } from "../../../components";

type Scholarship = {
  id: number;
  title: string;
  name?: string;
  shortname?: string;
  category: string;
  description?: string;
  start_date: string;
  end_date: string;
  applications_total?: number;
  applications_pending?: number;
  applications_approved?: number;
  applications_rejected?: number;
  participants_total?: number;
  participants_not_applied?: number;
  assigned_to_me?: number;
  updated_at?: string;
};

// ─── Helper ────────────────────────────────────────────────────────────────────
function formatDate(dateStr?: string) {
  if (!dateStr) return "–";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getStatusInfo(s: Scholarship) {
  const total = s.applications_total ?? 0;
  const approved = s.applications_approved ?? 0;
  const pending = s.applications_pending ?? 0;
  const rejected = s.applications_rejected ?? 0;

  if (total === 0) return { label: "No Applications", color: "#94A3B8", bg: "rgba(148,163,184,0.12)" };
  if (pending === total) return { label: "All Pending", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" };
  if (approved > 0 && pending === 0) return { label: "Completed", color: "#10B981", bg: "rgba(16,185,129,0.12)" };
  return { label: "In Progress", color: "#6366F1", bg: "rgba(99,102,241,0.12)" };
}

// ─── Scheme Card ──────────────────────────────────────────────────────────────
function SchemeCard({ s, isDark, colors, onPress }: {
  s: Scholarship;
  isDark: boolean;
  colors: any;
  onPress: () => void;
}) {
  const total = s.applications_total ?? 0;
  const approved = s.applications_approved ?? 0;
  const pending = s.applications_pending ?? 0;
  const rejected = s.applications_rejected ?? 0;
  const notApplied = s.participants_not_applied ?? 0;
  const assignedToMe = s.assigned_to_me ?? 0;

  const approvedPct = total > 0 ? (approved / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const rejectedPct = total > 0 ? (rejected / total) * 100 : 0;

  const status = getStatusInfo(s);

  const cardBg = isDark ? "#000" : "#FFFFFF";
  const borderColor = isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)";
  const dividerColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const statBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(99,102,241,0.04)";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: cardBg, borderColor }]}
    >
      {/* ── Top accent line ── */}
      <View style={styles.cardTopAccent} />

      {/* ── Header row ── */}
      <View style={styles.cardHeader}>
        {/* Icon badge */}
        <View style={[styles.iconBadge, { backgroundColor: isDark ? "rgba(99,102,241,0.18)" : "#EEF2FF" }]}>
          <Ionicons name="school" size={22} color="#6366F1" />
        </View>

        {/* Title block */}
        <View style={styles.titleBlock}>
          <Text style={[styles.schemeTitle, { color: colors.text }]} numberOfLines={2}>
            {s.title}
          </Text>
          {s.shortname ? (
            <Text style={[styles.shortName, { color: colors.textSecondary }]} numberOfLines={1}>
              {s.shortname}
            </Text>
          ) : null}
        </View>

        {/* Status pill */}
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* ── Category + Date row ── */}
      <View style={styles.metaRow}>
        <View style={[styles.metaChip, { backgroundColor: isDark ? "rgba(99,102,241,0.1)" : "#EEF2FF" }]}>
          <Ionicons name="location-outline" size={12} color="#6366F1" />
          <Text style={[styles.metaChipText, { color: "#6366F1" }]}>{s.category || "General"}</Text>
        </View>
        <View style={[styles.metaChip, { backgroundColor: isDark ? "rgba(100,116,139,0.12)" : "#F1F5F9" }]}>
          <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
          <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>
            {formatDate(s.start_date)} – {formatDate(s.end_date)}
          </Text>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={[styles.divider, { backgroundColor: dividerColor }]} />

      {/* ── Stats grid ── */}
      <View style={styles.statsGrid}>
        <StatBox
          label="Total"
          value={total}
          icon="people-outline"
          iconColor="#6366F1"
          bg={statBg}
          textColor={colors.text}
          subColor={colors.textSecondary}
        />
        <StatBox
          label="Pending"
          value={pending}
          icon="time-outline"
          iconColor="#F59E0B"
          bg={isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.06)"}
          textColor={colors.text}
          subColor={colors.textSecondary}
        />
        <StatBox
          label="Approved"
          value={approved}
          icon="checkmark-circle-outline"
          iconColor="#10B981"
          bg={isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.06)"}
          textColor={colors.text}
          subColor={colors.textSecondary}
        />
        <StatBox
          label="Rejected"
          value={rejected}
          icon="close-circle-outline"
          iconColor="#EF4444"
          bg={isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)"}
          textColor={colors.text}
          subColor={colors.textSecondary}
        />
      </View>

      {/* ── Progress bar ── */}
      {total > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressLegendRow}>
            <Text style={[styles.progressTitle, { color: colors.textSecondary }]}>Application Progress</Text>
            <Text style={[styles.progressPct, { color: colors.text }]}>
              {approvedPct.toFixed(0)}% approved
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }]}>
            <View style={[styles.progressFillApproved, { width: `${approvedPct}%` as any }]} />
            <View style={[styles.progressFillPending, { width: `${pendingPct}%` as any }]} />
            <View style={[styles.progressFillRejected, { width: `${rejectedPct}%` as any }]} />
          </View>
          <View style={styles.progressLegendItems}>
            <LegendDot color="#10B981" label={`${approved} Approved`} labelColor={colors.textSecondary} />
            <LegendDot color="#F59E0B" label={`${pending} Pending`} labelColor={colors.textSecondary} />
            {rejected > 0 && <LegendDot color="#EF4444" label={`${rejected} Rejected`} labelColor={colors.textSecondary} />}
          </View>
        </View>
      )}

      {/* ── Bottom row ── */}
      <View style={[styles.cardFooter, { borderTopColor: dividerColor }]}>
        <View style={styles.footerLeft}>
          {notApplied > 0 && (
            <View style={[styles.footerChip, { backgroundColor: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)" }]}>
              <Ionicons name="alert-circle-outline" size={12} color="#EF4444" />
              <Text style={[styles.footerChipText, { color: "#EF4444" }]}>{notApplied} not applied</Text>
            </View>
          )}
          {assignedToMe > 0 && (
            <View style={[styles.footerChip, { backgroundColor: isDark ? "rgba(99,102,241,0.1)" : "#EEF2FF" }]}>
              <Ionicons name="person-outline" size={12} color="#6366F1" />
              <Text style={[styles.footerChipText, { color: "#6366F1" }]}>{assignedToMe} assigned to me</Text>
            </View>
          )}
        </View>
        <View style={styles.reviewBtn}>
          <Text style={styles.reviewBtnText}>Review</Text>
          <Ionicons name="arrow-forward" size={14} color="#6366F1" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StatBox({ label, value, icon, iconColor, bg, textColor, subColor }: {
  label: string; value: number; icon: any; iconColor: string;
  bg: string; textColor: string; subColor: string;
}) {
  return (
    <View style={[styles.statBox, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={16} color={iconColor} />
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: subColor }]}>{label}</Text>
    </View>
  );
}

function LegendDot({ color, label, labelColor }: { color: string; label: string; labelColor: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReviewerApplicationsScreen() {
  const { colors, isDark } = useTheme();
  const [query, setQuery] = useState("");
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScholarships = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const authDataStr = await AsyncStorage.getItem("authData");
      const authData = authDataStr ? JSON.parse(authDataStr) : null;
      const token = authData?.token;
      if (!token) throw new Error("No authentication token found. Please login again.");

      const response = await getReviewerSchemes(token, { page: 1, per_page: 200 });

      if (response.success && response.data) {
        const list = Array.isArray(response.data.schemes)
          ? response.data.schemes
          : response.data.data || [];
        const mappedList = list.map((scheme: any) => ({
          ...scheme,
          title: scheme.name || scheme.title,
        }));
        setScholarships(mappedList);
      } else {
        throw new Error(response.error || "Failed to fetch schemes");
      }
    } catch (err: any) {
      console.error("Error fetching schemes:", err);
      setError(err.message || "Failed to load schemes");
      Alert.alert("Error", err.message || "Failed to load schemes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchScholarships(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scholarships.filter(
      (s) => !q || s.title.toLowerCase().includes(q) || (s.category && s.category.toLowerCase().includes(q))
    );
  }, [scholarships, query]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Schemes"
        subtitle="Select a scheme to review applications"
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Search bar ── */}
        {!loading && (
          <View style={[styles.searchRow, {
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB",
          }]}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              placeholder="Search schemes or category…"
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
        )}

        {/* ── Loading ── */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading schemes…</Text>
          </View>
        )}

        {/* ── Cards ── */}
        {!loading && filtered.map((s) => (
          <SchemeCard
            key={s.id}
            s={s}
            isDark={isDark}
            colors={colors}
            onPress={() =>
              router.push({
                pathname: "/(dashboard)/reviewer/scheme-applications",
                params: { id: s.id, title: s.title },
              })
            }
          />
        ))}

        {/* ── Empty state ── */}
        {!loading && filtered.length === 0 && (
          <View style={[styles.emptyState, {
            backgroundColor: isDark ? "#000" : "#FFFFFF",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB",
          }]}>
            <View style={[styles.emptyIconRing, { backgroundColor: isDark ? "rgba(99,102,241,0.1)" : "#EEF2FF" }]}>
              <Ionicons name="document-text-outline" size={36} color="#6366F1" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No schemes found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Try adjusting your search query
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },

  // Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "500" },

  // Loading
  loadingContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 15, fontWeight: "500" },

  // Card shell
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTopAccent: {
    height: 3,
    backgroundColor: "#6366F1",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  // Header
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 10,
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  titleBlock: { flex: 1, gap: 3 },
  schemeTitle: { fontSize: 15, fontWeight: "700", letterSpacing: -0.3, lineHeight: 21 },
  shortName: { fontSize: 12, fontWeight: "500", opacity: 0.75 },

  // Status pill
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, fontWeight: "700" },

  // Meta chips (category, date)
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  metaChipText: { fontSize: 11, fontWeight: "600" },

  divider: { height: 1, marginHorizontal: 16 },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    padding: 14,
    paddingBottom: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },

  // Progress
  progressSection: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  progressLegendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  progressPct: { fontSize: 12, fontWeight: "700" },
  progressTrack: {
    height: 7,
    borderRadius: 6,
    flexDirection: "row",
    overflow: "hidden",
  },
  progressFillApproved: { height: "100%", backgroundColor: "#10B981" },
  progressFillPending: { height: "100%", backgroundColor: "#F59E0B" },
  progressFillRejected: { height: "100%", backgroundColor: "#EF4444" },
  progressLegendItems: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: "500" },

  // Footer
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerLeft: { flexDirection: "row", gap: 8, flexWrap: "wrap", flex: 1 },
  footerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  footerChipText: { fontSize: 11, fontWeight: "600" },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(99,102,241,0.1)",
  },
  reviewBtnText: { fontSize: 13, fontWeight: "700", color: "#6366F1" },

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
});
