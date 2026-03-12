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
    label: "Pending",
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

  const approvedPct = total > 0 ? (approved / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const rejectedPct = total > 0 ? (rejected / total) * 100 : 0;

  const status = getStatusInfo(s);
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const subText = isDark ? "#94A3B8" : "#64748B";


  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={isDark ? ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"] : ["#FFFFFF", "#F9FAFB"]}
        style={[styles.card, { borderColor: border }]}
      >
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={status.gradient as [string, string]}
            style={styles.schemeIconBox}
          >
            <Ionicons name="school" size={18} color="#fff" />
          </LinearGradient>

          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={[styles.schemeName, { color: colors.text, flex: 1 }]} numberOfLines={2}>
                {s.title}
              </Text>

            </View>

            <View style={styles.catRow}>
              <Ionicons name="location-sharp" size={9} color="#6366F1" />
              <Text style={[styles.categoryText, { color: "#6366F1" }]}>{s.category || "All India"}</Text>
              <View style={[styles.dot, { backgroundColor: subText }]} />
              <Text style={[styles.dateRangeText, { color: subText }]}>
                {formatDate(s.start_date)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <StatBox icon="people" label="Total" value={total} color="#6366F1" isDark={isDark} />
          <StatBox icon="time" label="Pending" value={pending} color="#F59E0B" isDark={isDark} />
          <StatBox icon="checkmark-circle" label="Approved" value={approved} color="#10B981" isDark={isDark} />
          <StatBox icon="close-circle" label="Rejected" value={rejected} color="#EF4444" isDark={isDark} />
        </View>

        {/* Progress Section */}
        {total > 0 && (
          <View style={styles.progressArea}>
            <View style={styles.progressTextRow}>
              <Text style={[styles.progressLabel, { color: subText }]}>Fulfillment</Text>
              <Text style={[styles.progressValue, { color: colors.text }]}>{approvedPct.toFixed(0)}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0" }]}>
              {approvedPct > 0 && <View style={[styles.pFill, { width: `${approvedPct}%` as any, backgroundColor: "#10B981" }]} />}
              {pendingPct > 0 && <View style={[styles.pFill, { width: `${pendingPct}%` as any, backgroundColor: "#F59E0B" }]} />}
              {rejectedPct > 0 && <View style={[styles.pFill, { width: `${rejectedPct}%` as any, backgroundColor: "#EF4444" }]} />}
            </View>
          </View>
        )}

        {/* Card Footer */}
        <View style={[styles.cardFooter, { borderTopColor: border }]}>
          <View style={styles.footerLeftSide}>
            <View style={[styles.statusTag, { backgroundColor: isDark ? "rgba(99,102,241,0.12)" : "#EEF2FF", marginRight: 8 }]}>
              <Text style={[styles.statusTagText, { color: "#6366F1" }]}>{status.label}</Text>
            </View>
            {assignedToMe > 0 ? (
              <View style={styles.assignmentPill}>
                <Ionicons name="person" size={8} color="#6366F1" />
                <Text style={styles.assignmentText}>{assignedToMe} Assigned</Text>
              </View>
            ) : (
              <Text style={[styles.updatedText, { color: subText }]}>
                Upd. {s.updated_at?.split(" ")[0]}
              </Text>
            )}
          </View>

          <View style={styles.actionButtonGroup}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.detailsBtn]}
              onPress={() => router.push({
                pathname: "/(dashboard)/reviewer/scholarship-details",
                params: { scholarshipId: s.id }
              })}
            >
              <Text style={styles.detailsBtnText}>Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.applicationsBtn]}
              onPress={onPress}
            >
              <Text style={styles.applicationsBtnText}>Applicants</Text>
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
    <View style={styles.statBox}>
      <View style={[styles.statIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC" }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={[styles.statNum, { color: isDark ? "#fff" : "#1E293B" }]}>{value}</Text>
      <Text style={[styles.statSubText, { color: isDark ? "#94A3B8" : "#64748B" }]}>{label}</Text>
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
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },

  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  schemeIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  schemeName: { fontSize: 13, fontWeight: "700", letterSpacing: -0.2, lineHeight: 18 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 1 },
  categoryText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.2 },
  dot: { width: 2, height: 2, borderRadius: 1, marginHorizontal: 2, opacity: 0.5 },
  dateRangeText: { fontSize: 10, fontWeight: "500" },

  statusTag: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  statusTagText: { fontSize: 8, fontWeight: "800", textTransform: "uppercase" },

  statsRow: { flexDirection: "row", gap: 6 },
  statBox: { flex: 1, alignItems: "center", gap: 2 },
  statIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statNum: { fontSize: 12, fontWeight: "800" },
  statSubText: { fontSize: 8, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.1 },

  progressArea: { gap: 4 },
  progressTextRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  progressLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  progressValue: { fontSize: 11, fontWeight: "800" },
  progressTrack: { height: 4, borderRadius: 2, flexDirection: "row", overflow: "hidden" },
  pFill: { height: "100%" },

  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 10 },
  footerLeftSide: { flex: 1, flexDirection: "row", alignItems: "center" },
  assignmentPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(99,102,241,0.1)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  assignmentText: { color: "#6366F1", fontSize: 9, fontWeight: "700" },
  updatedText: { fontSize: 9, fontWeight: "500" },

  viewAction: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(99,102,241,0.08)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  viewActionText: { color: "#6366F1", fontSize: 11, fontWeight: "700" },

  actionButtonGroup: { flexDirection: "row", gap: 5 },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    justifyContent: "center"
  },
  detailsBtn: { backgroundColor: "rgba(99,102,241,0.1)" },
  detailsBtnText: { color: "#6366F1", fontSize: 12, fontWeight: "700" },
  applicationsBtn: { backgroundColor: "#6366F1", minWidth: 100 },
  applicationsBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  emptyState: { alignItems: "center", padding: 40, borderRadius: 24, gap: 10 },
  emptyIconRing: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyText: { fontSize: 13, textAlign: "center", opacity: 0.8 },
});
