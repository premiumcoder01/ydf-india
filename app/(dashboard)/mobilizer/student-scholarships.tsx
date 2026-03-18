import { Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { bookmarkScholarship, getMobilizerStudentScholarships } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Category color palette ──────────────────────────────────────────────────
const CATEGORY_PALETTE: Record<string, { bg: string; text: string; dot: string }> = {
  "All India": { bg: "#EDE9FE", text: "#6D28D9", dot: "#7C3AED" },
  Bihar: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  Rajasthan: { bg: "#FCE7F3", text: "#9D174D", dot: "#EC4899" },
  Punjab: { bg: "#DCFCE7", text: "#166534", dot: "#22C55E" },
  Delhi: { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
  Sikar: { bg: "#FFE4E6", text: "#9F1239", dot: "#F43F5E" },
};

const DEFAULT_CATEGORY = { bg: "#E0F2FE", text: "#0369A1", dot: "#0EA5E9" };

function getCategoryStyle(cat?: string | null) {
  if (!cat) return DEFAULT_CATEGORY;
  return CATEGORY_PALETTE[cat] ?? DEFAULT_CATEGORY;
}

// ─── Strip HTML tags ──────────────────────────────────────────────────────────
function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function StudentRecommendedScholarshipsScreen() {
  const { isDark, colors } = useTheme();
  const { studentId, studentName } = useLocalSearchParams();
  const inset = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error" | "info",
  });

  // ── fetch ────────────────────────────────────────────────────────────────────
  const fetchScholarships = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const authDataStr = await AsyncStorage.getItem("authData");
      if (!authDataStr) return;
      const { token } = JSON.parse(authDataStr);
      const response = await getMobilizerStudentScholarships(token, Number(studentId));
      if (response.success) {
        setScholarships(response.data?.data || response.data?.scholarships || []);
      }
    } catch (err) {
      console.error("Error fetching student scholarships:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchScholarships(); }, [studentId]);

  const onRefresh = () => { setRefreshing(true); fetchScholarships(); };

  // ── categories from data ─────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = new Set<string>();
    scholarships.forEach((s) => { if (s.category) cats.add(s.category); });
    return ["All", ...Array.from(cats)];
  }, [scholarships]);

  // ── filtered list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return scholarships.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (s.name || "").toLowerCase().includes(q) ||
        (s.provider || "").toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q);
      const matchCat = activeCategory === "All" || s.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [scholarships, search, activeCategory]);

  // ── stats ────────────────────────────────────────────────────────────────────
  // ── bookmark ─────────────────────────────────────────────────────────────────
  const handleBookmark = async (scholarshipId: number, currentStatus: boolean) => {
    setScholarships((prev) =>
      prev.map((s) =>
        s.id === scholarshipId || s.scholarship_id === scholarshipId
          ? { ...s, bookmarked: !currentStatus }
          : s
      )
    );
    try {
      const authDataStr = await AsyncStorage.getItem("authData");
      if (!authDataStr) return;
      const { token } = JSON.parse(authDataStr);
      const action = !currentStatus ? "bookmark" : "unbookmark";
      const res = await bookmarkScholarship(token, scholarshipId, action, studentId ? String(studentId) : undefined);
      if (!res.success) throw new Error(res.message || "Failed");
      setToast({ visible: true, message: res.message || (action === "bookmark" ? "Bookmarked!" : "Removed bookmark"), type: "success" });
    } catch (err: any) {
      setScholarships((prev) =>
        prev.map((s) =>
          s.id === scholarshipId || s.scholarship_id === scholarshipId
            ? { ...s, bookmarked: currentStatus }
            : s
        )
      );
      setToast({ visible: true, message: err.message || "Failed to update bookmark", type: "error" });
    }
  };

  // ── BG colors ────────────────────────────────────────────────────────────────
  const bg = isDark ? "#0A0A0F" : "#F4F6FF";
  const cardBg = isDark ? "#13131A" : "#FFFFFF";
  const inputBg = isDark ? "#1C1C28" : "#FFFFFF";
  const headerGrad: [string, string] = isDark ? ["#1A1A2E", "#16213E"] : ["#4F46E5", "#6366F1"];

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <LinearGradient colors={headerGrad} style={[styles.header, { paddingTop: inset.top + 8 }]}>
        {/* Back + title row */}
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerLabel}>Scholarships for</Text>
            <Text style={styles.headerStudentName} numberOfLines={1}>
              {studentName || "Student"}
            </Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: inputBg }]}>
          <Ionicons name="search-outline" size={18} color={isDark ? "#6B7280" : "#9CA3AF"} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name, provider or region…"
            placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={isDark ? "#6B7280" : "#9CA3AF"} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── Category filter chips ───────────────────────────────────────────── */}
      {!loading && categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={[styles.filterScroll, { backgroundColor: bg }]}
        >
          {categories.map((cat) => {
            const active = cat === activeCategory;
            const catStyle = cat === "All" ? { bg: "#6366F1", text: "#fff", dot: "#fff" } : getCategoryStyle(cat);
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.75}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? "#6366F1" : (isDark ? "#1C1C28" : "#fff"),
                    borderColor: active ? "#6366F1" : (isDark ? "#2D2D44" : "#E5E7EB"),
                  },
                ]}
              >
                {cat !== "All" && (
                  <View style={[styles.filterDot, { backgroundColor: active ? "#fff" : catStyle.dot }]} />
                )}
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? "#fff" : (isDark ? "#94A3B8" : "#374151") },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Results count ───────────────────────────────────────────────────── */}
      {!loading && (
        <View style={[styles.resultsRow, { backgroundColor: bg }]}>
          <Text style={[styles.resultsText, { color: isDark ? "#64748B" : "#9CA3AF" }]}>
            {filtered.length === scholarships.length
              ? `${filtered.length} scholarships found`
              : `${filtered.length} of ${scholarships.length} matching`}
          </Text>
        </View>
      )}

      {/* ── List ────────────────────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: inset.bottom + 24, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
        showsVerticalScrollIndicator={false}
      >
        {loading && !refreshing ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={[styles.loaderText, { color: isDark ? "#64748B" : "#9CA3AF" }]}>
              Finding best scholarships…
            </Text>
          </View>
        ) : filtered.length > 0 ? (
          filtered.map((item, index) => (
            <ScholarshipCard
              key={item.id || item.scholarship_id || index}
              item={item}
              isDark={isDark}
              cardBg={cardBg}
              onPress={() =>
                router.push({
                  pathname: "/(dashboard)/mobilizer/mobilizer-scholarship-details",
                  params: { scholarshipId: item.id || item.scholarship_id, studentId, studentName },
                })
              }
              onBookmark={() => handleBookmark(item.id || item.scholarship_id, item.bookmarked)}
            />
          ))
        ) : (
          <EmptyState isDark={isDark} hasSearch={!!search} onClear={() => { setSearch(""); setActiveCategory("All"); }} />
        )}
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((p) => ({ ...p, visible: false }))}
      />
    </View>
  );
}

// ─── Scholarship Card ─────────────────────────────────────────────────────────
function ScholarshipCard({ item, isDark, cardBg, onPress, onBookmark }: any) {
  const summaryText = item.summary ? stripHtml(item.summary) : "";
  const catStyle = getCategoryStyle(item.category);
  const accentColor = item.has_applied ? "#10B981" : catStyle.dot;

  const deadlineFormatted = item.deadline
    ? new Date(item.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: isDark ? "#1E1E2E" : "#F1F5F9",
          shadowColor: isDark ? "#000" : "#6366F1",
        },
      ]}
    >
      {/* Top accent strip */}
      <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />

      <View style={styles.cardBody}>
        {/* Row: category + bookmark */}
        <View style={styles.cardTopRow}>
          {item.category ? (
            <View style={[styles.catPill, { backgroundColor: catStyle.bg }]}>
              <View style={[styles.catDot, { backgroundColor: catStyle.dot }]} />
              <Text style={[styles.catText, { color: catStyle.text }]} numberOfLines={1}>
                {item.category}
              </Text>
            </View>
          ) : (
            <View />
          )}

          <TouchableOpacity
            onPress={(e) => { e?.stopPropagation?.(); onBookmark(); }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[styles.bookmarkBtn, { backgroundColor: item.bookmarked ? "#6366F115" : "transparent" }]}
          >
            <Ionicons
              name={item.bookmarked ? "bookmark" : "bookmark-outline"}
              size={20}
              color={item.bookmarked ? "#6366F1" : (isDark ? "#475569" : "#CBD5E1")}
            />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={[styles.cardTitle, { color: isDark ? "#F1F5F9" : "#0F172A" }]} numberOfLines={2}>
          {item.name || item.scholarship_name}
        </Text>

        {/* Provider */}
        {item.provider ? (
          <View style={styles.providerRow}>
            <Ionicons name="business-outline" size={13} color={isDark ? "#475569" : "#94A3B8"} />
            <Text style={[styles.providerText, { color: isDark ? "#64748B" : "#94A3B8" }]} numberOfLines={1}>
              {item.provider}
            </Text>
          </View>
        ) : null}

        {/* Summary */}
        {summaryText ? (
          <Text style={[styles.cardSummary, { color: isDark ? "#64748B" : "#64748B" }]} numberOfLines={3}>
            {summaryText}
          </Text>
        ) : null}

        {/* Progress bar (if > 0) */}
        {item.progress_percentage > 0 && (
          <View style={styles.progressWrap}>
            <View style={[styles.progressTrack, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(item.progress_percentage, 100)}%`, backgroundColor: accentColor },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: isDark ? "#475569" : "#94A3B8" }]}>
              {item.progress_percentage}% complete
            </Text>
          </View>
        )}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: isDark ? "#1E1E2E" : "#F1F5F9" }]} />

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            {item.has_applied ? (
              <View style={styles.statusPill}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={[styles.statusText, { color: "#10B981" }]}>Applied</Text>
              </View>
            ) : item.expired ? (
              <View style={[styles.statusPill, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="time-outline" size={14} color="#EF4444" />
                <Text style={[styles.statusText, { color: "#EF4444" }]}>Expired</Text>
              </View>
            ) : deadlineFormatted ? (
              <View style={styles.deadlinePill}>
                <Ionicons name="calendar-outline" size={13} color={isDark ? "#475569" : "#94A3B8"} />
                <Text style={[styles.deadlineText, { color: isDark ? "#64748B" : "#94A3B8" }]}>
                  Due {deadlineFormatted}
                </Text>
              </View>
            ) : (
              <View style={styles.deadlinePill}>
                <Ionicons name="infinite-outline" size={14} color={isDark ? "#475569" : "#94A3B8"} />
                <Text style={[styles.deadlineText, { color: isDark ? "#64748B" : "#94A3B8" }]}>Always open</Text>
              </View>
            )}
          </View>

          <View style={styles.detailsBtn}>
            <Text style={styles.detailsBtnText}>View</Text>
            <Ionicons name="arrow-forward" size={13} color="#6366F1" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ isDark, hasSearch, onClear }: any) {
  return (
    <View style={[styles.empty, { backgroundColor: isDark ? "#13131A" : "#fff", borderColor: isDark ? "#1E1E2E" : "#E2E8F0" }]}>
      <View style={[styles.emptyIconWrap, { backgroundColor: "#6366F115" }]}>
        <Ionicons name="school-outline" size={48} color="#6366F1" style={{ opacity: 0.6 }} />
      </View>
      <Text style={[styles.emptyTitle, { color: isDark ? "#F1F5F9" : "#0F172A" }]}>
        {hasSearch ? "No results found" : "No scholarships found"}
      </Text>
      <Text style={[styles.emptySub, { color: isDark ? "#475569" : "#94A3B8" }]}>
        {hasSearch
          ? "Try a different search term or clear filters."
          : "No scholarships match this student's profile yet."}
      </Text>
      {hasSearch && (
        <TouchableOpacity style={styles.clearBtn} onPress={onClear} activeOpacity={0.8}>
          <Text style={styles.clearBtnText}>Clear filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 20 },
  headerNav: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  headerLabel: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "500", marginBottom: 2 },
  headerStudentName: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },

  // Search
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "500", padding: 0 },

  // Filter chips
  filterScroll: { flexGrow: 0 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: "row" },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterChipText: { fontSize: 13, fontWeight: "600" },

  // Results
  resultsRow: { paddingHorizontal: 20, paddingVertical: 10 },
  resultsText: { fontSize: 12, fontWeight: "500" },

  // Loader
  loaderWrap: { paddingTop: 100, alignItems: "center", gap: 12 },
  loaderText: { fontSize: 14, fontWeight: "500" },

  // Card
  card: {
    borderRadius: 20, marginBottom: 14,
    borderWidth: 1, overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 4,
  },
  cardAccent: { height: 4 },
  cardBody: { padding: 16 },
  cardTopRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 10,
  },
  catPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100,
    maxWidth: 160,
  },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  bookmarkBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 17, fontWeight: "800", lineHeight: 23, marginBottom: 5, letterSpacing: -0.2 },
  providerRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
  providerText: { fontSize: 12, fontWeight: "500", flex: 1 },
  cardSummary: { fontSize: 13, lineHeight: 19, marginBottom: 12, fontWeight: "400" },
  progressWrap: { marginBottom: 12, gap: 5 },
  progressTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 3 },
  progressText: { fontSize: 11, fontWeight: "500", textAlign: "right" },
  divider: { height: 1, marginBottom: 12 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerLeft: { flex: 1 },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#D1FAE515", paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, alignSelf: "flex-start",
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  deadlinePill: { flexDirection: "row", alignItems: "center", gap: 5 },
  deadlineText: { fontSize: 12, fontWeight: "500" },
  detailsBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: "#6366F112", borderRadius: 10,
  },
  detailsBtnText: { color: "#6366F1", fontSize: 13, fontWeight: "700" },

  // Empty
  empty: {
    marginTop: 40, padding: 40, borderRadius: 24,
    alignItems: "center", borderWidth: 1, borderStyle: "dashed",
  },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 24,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 20 },
  clearBtn: {
    backgroundColor: "#6366F1", paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12,
  },
  clearBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
