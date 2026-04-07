import { useTheme } from "@/context/ThemeContext";
import { getReviewerSchemes } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
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
  View
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

  if (total === 0) return {
    label: "Empty",
    color: "#94A3B8",
    gradient: ["#94A3B8", "#64748B"]
  };
  if (pending === total) return {
    label: "Applied",
    color: "#F59E0B",
    gradient: ["#FBBF24", "#F59E0B"]
  };
  if (approved > 0 && pending === 0) return {
    label: "Completed",
    color: "#10B981",
    gradient: ["#34D399", "#10B981"]
  };
  return {
    label: "Active",
    color: "#6366F1",
    gradient: ["#818CF8", "#6366F1"]
  };
}

// ─── Scheme Card ──────────────────────────────────────────────────────────────
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
  const assignedToMe = s.assigned_to_me ?? 0;

  // Fulfillment represents the Review Progress (Approved + Rejected) / Total
  const reviewedCount = approved + rejected;
  const reviewProgress = total > 0 ? (reviewedCount / total) * 100 : 0;

  const approvedPct = total > 0 ? (approved / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const rejectedPct = total > 0 ? (rejected / total) * 100 : 0;

  const status = getStatusInfo(s);
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const subText = isDark ? "#94A3B8" : "#64748B";

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={isDark ? ["rgba(30,30,35,0.95)", "rgba(15,15,20,0.98)"] : ["#FFFFFF", "#F8FAFC"]}
        style={[styles.card, { borderColor: border }]}
      >
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={status.gradient as [string, string]}
            style={styles.schemeIconBox}
          >
            <Ionicons name="school-outline" size={20} color="#fff" />
          </LinearGradient>

          <View style={{ flex: 1 }}>
            <Text style={[styles.schemeName, { color: colors.text }]} numberOfLines={2}>
              {s.title}
            </Text>
            <View style={styles.catRow}>
              <View style={[styles.statusTag, { backgroundColor: status.color + "20" }]}>
                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                <Text style={[styles.statusTagText, { color: status.color }]}>{status.label}</Text>
              </View>
              <Text style={[styles.categoryText, { color: colors.textSecondary }]}>{s.category || "General"}</Text>
            </View>
          </View>
        </View>

        {/* Info Row: Duration & Assignment */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={12} color={subText} />
            <Text style={[styles.infoText, { color: subText }]}>
              {formatDate(s.start_date)} - {formatDate(s.end_date) || 'Open'}
            </Text>
          </View>
          {assignedToMe > 0 && (
            <View style={styles.assignmentPill}>
              <Ionicons name="person-circle" size={14} color="#6366F1" />
              <Text style={styles.assignmentText}>{assignedToMe} Assigned to me</Text>
            </View>
          )}
        </View>

        {/* Stats Section - 2x2 Grid for clarity */}
        <View style={styles.statsGrid}>
          <View style={styles.statRowItem}>
            <StatBox icon="people" label="Total Applied" value={total} color="#6366F1" isDark={isDark} />
            <StatBox icon="time" label="Applied" value={pending} color="#F59E0B" isDark={isDark} />
          </View>
          <View style={styles.statRowItem}>
            <StatBox icon="checkmark-circle" label="Approved" value={approved} color="#10B981" isDark={isDark} />
            <StatBox icon="close-circle" label="Rejected" value={rejected} color="#EF4444" isDark={isDark} />
          </View>
        </View>

        {/* Progress Section */}
        {total > 0 && (
          <View style={styles.progressArea}>
            <View style={styles.progressTextRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.progressLabel, { color: colors.text }]}>Review Progress</Text>
                <TouchableOpacity onPress={() => Alert.alert("Fulfillment Info", "This tracks the percentage of total applications that have been processed (Approved or Rejected).")}>
                  <Ionicons name="information-circle-outline" size={12} color={subText} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.progressValue, { color: "#10B981" }]}>{reviewProgress.toFixed(0)}% Complete</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0" }]}>
              {approvedPct > 0 && <View style={[styles.pFill, { width: `${approvedPct}%` as any, backgroundColor: "#10B981" }]} />}
              {rejectedPct > 0 && <View style={[styles.pFill, { width: `${rejectedPct}%` as any, backgroundColor: "#EF4444" }]} />}
              {pendingPct > 0 && <View style={[styles.pFill, { width: `${pendingPct}%` as any, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#CBD5E1" }]} />}
            </View>
            <Text style={[styles.progressSubText, { color: subText }]}>
              {reviewedCount} / {total} applications processed
            </Text>
          </View>
        )}

        {/* Card Footer */}
        <View style={[styles.cardFooter, { borderTopColor: border }]}>


          <View style={styles.actionButtonGroup}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.detailsBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9" }]}
              onPress={() => router.push({
                pathname: "/(dashboard)/reviewer/scholarship-details",
                params: { scholarshipId: s.id }
              })}
            >
              <Text style={[styles.detailsBtnText, { color: isDark ? "#fff" : colors.text }]}>View Details</Text>
              <Ionicons name="chevron-forward" size={14} color={isDark ? "#fff" : colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.applicationsBtn]}
              onPress={onPress}
            >
              <Text style={styles.applicationsBtnText}>View Applicants</Text>
              <Ionicons name="chevron-forward" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function StatBox({ icon, label, value, color, isDark }: {
  icon: any; label: string; value: number; color: string; isDark: boolean;
}) {
  return (
    <View style={[styles.statBox, { borderLeftColor: color + "40" }]}>
      <View style={styles.statContent}>
        <Text style={[styles.statNum, { color: isDark ? "#fff" : "#1E293B" }]}>{value}</Text>
        <Text style={[styles.statSubText, { color: isDark ? "#94A3B8" : "#64748B" }]}>{label}</Text>
      </View>
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
      <LinearGradient
        colors={isDark ? ["#0f0f0f", "#1e1e1e", "#000"] : ["#F9FAFB", "#F3F4F6", "#E5E7EB"]}
        style={StyleSheet.absoluteFill}
      />

      <ReviewerHeader
        title="Scholarship Schemes"
        subtitle="Review and manage scholarship cycles"
        showBackButton={true}
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Search Bar ── */}
        {!loading && (
          <View style={styles.searchContainer}>
            <View style={[styles.searchRow, {
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"
            }]}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                placeholder="Search schemes, states, categories…"
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
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  // Search
  searchContainer: { marginBottom: 4 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: "600" },

  loadingContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 100, gap: 16 },
  loadingText: { fontSize: 15, fontWeight: "700" },

  // Updated Card Design
  cardContainer: {
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 8,
  },
  card: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
  },

  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  schemeIconBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  schemeName: { fontSize: 16, fontWeight: "800", letterSpacing: -0.4, lineHeight: 22 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  categoryText: { fontSize: 11, fontWeight: "600", opacity: 0.8 },

  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTagText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },

  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoText: { fontSize: 11, fontWeight: "500" },

  assignmentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(99,102,241,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  assignmentText: { color: "#6366F1", fontSize: 10, fontWeight: "700" },

  statsGrid: { gap: 10 },
  statRowItem: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    paddingLeft: 10,
    borderLeftWidth: 3,
    paddingVertical: 4,
  },
  statContent: { gap: 1 },
  statNum: { fontSize: 16, fontWeight: "800" },
  statSubText: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.2 },

  progressArea: { gap: 8, marginTop: 4 },
  progressTextRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { fontSize: 12, fontWeight: "700" },
  progressValue: { fontSize: 12, fontWeight: "800" },
  progressTrack: { height: 6, borderRadius: 3, flexDirection: "row", overflow: "hidden" },
  pFill: { height: "100%" },
  progressSubText: { fontSize: 10, fontWeight: "500", textAlign: "right", marginTop: 2 },

  cardFooter: {
    alignItems: "flex-end",
    borderTopWidth: 1,
    paddingTop: 16
  },
  updatedText: { fontSize: 11, fontWeight: "500", fontStyle: 'italic' },

  actionButtonGroup: { flexDirection: "row", gap: 8, paddingRight: 2 },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "center"
  },
  detailsBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  detailsBtnText: { fontSize: 12, fontWeight: "700" },
  applicationsBtn: { backgroundColor: "#6366F1", shadowColor: "#6366F1", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  applicationsBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  emptyState: { alignItems: "center", padding: 40, borderRadius: 24, gap: 10 },
  emptyIconRing: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyText: { fontSize: 13, textAlign: "center", opacity: 0.8 },
});
