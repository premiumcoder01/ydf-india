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
              studentId={studentId}
              studentName={studentName}
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
function ScholarshipCard({ item, isDark, cardBg, onPress, onBookmark, studentId }: any) {
  const catStyle = getCategoryStyle(item.category);
  const categoryColor = catStyle.dot || "#1E40AF";

  const isBookmarked = item.bookmarked;
  const isExpired = item.expired;
  const hasApplied = item.has_applied;
  const deadline = item.end_date || item.deadline;

  let statusConfig = { text: "Open", color: "#10B981", bg: "rgba(16, 185, 129, 0.1)" };
  if (isExpired) statusConfig = { text: "Expired", color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" };
  else if (hasApplied) statusConfig = { text: "Applied", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" };
  else if (item.can_apply === false) statusConfig = { text: "Closed", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" };

  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: cardBg,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
          borderLeftWidth: 4,
          borderLeftColor: isExpired ? "#9CA3AF" : categoryColor,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cardPill, { backgroundColor: isExpired ? "#F3F4F6" : `${categoryColor}15` }]}>
          <Ionicons name="location-sharp" size={10} color={isExpired ? "#6B7280" : categoryColor} />
          <Text style={[styles.cardPillText, { color: isExpired ? "#6B7280" : categoryColor }]}>
            {item.category || "General"}
          </Text>
        </View>
        <View style={[styles.cardPill, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.cardPillText, { color: statusConfig.color, fontWeight: "700" }]}>{statusConfig.text}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: isExpired ? colors.textSecondary : colors.text }]} numberOfLines={2}>
          {item.name || item.scholarship_name || item.title}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 15, paddingHorizontal: 16, marginBottom: 16 }}>
        <View>
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Opens</Text>
          <Text style={[styles.dateValue, { color: colors.text }]}>
            {item.start_date ? new Date(item.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "TBA"}
          </Text>
        </View>
        <View style={[styles.verticalSep, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "#E5E7EB" }]} />
        <View>
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Closes</Text>
          <Text style={[styles.dateValue, { color: colors.text }]}>
            {deadline ? new Date(deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No Deadline"}
          </Text>
        </View>
      </View>

      {(item.progress_percent > 0 || item.progress_percentage > 0) && (
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase" }}>Application Progress</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: (item.progress_percent === 100 || item.progress_percentage === 100) ? "#10B981" : categoryColor }}>
              {item.progress_percent || item.progress_percentage}%
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
            <View
              style={{
                height: "100%",
                width: `${Math.min(item.progress_percent || item.progress_percentage, 100)}%`,
                backgroundColor: (item.progress_percent === 100 || item.progress_percentage === 100) ? "#10B981" : categoryColor,
                borderRadius: 3,
              }}
            />
          </View>
        </View>
      )}

      <View style={[styles.cardDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6", marginBottom: 12 }]} />

      <View style={styles.cardActionsRow}>
        <TouchableOpacity
          onPress={onPress}
          style={[styles.viewBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB", borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB" }]}
        >
          <Ionicons name="eye-outline" size={16} color={colors.text} />
          <Text style={[styles.viewBtnText, { color: colors.text }]}>Details</Text>
        </TouchableOpacity>

        {!isExpired && !hasApplied && item.can_apply !== false ? (
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/(dashboard)/mobilizer/mobilizer-apply-form", params: { scholarshipId: item.id || item.scholarship_id, studentId: studentId } })}
            style={[styles.applyBtn, { backgroundColor: categoryColor }]}
          >
            <Text style={[styles.applyBtnText, { color: "#FFF" }]}>Apply Now</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.applyBtn, hasApplied
            ? { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "#DCFCE7", borderWidth: 1, borderColor: isDark ? "#065F46" : "#86EFAC" }
            : { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", opacity: 0.8 }
          ]}>
            <Text style={[styles.applyBtnText, { color: hasApplied ? (isDark ? "#34D399" : "#166534") : colors.textSecondary }]}>
              {hasApplied ? "Applied" : (isExpired ? "Expired" : "Closed")}
            </Text>
            <Ionicons name={hasApplied ? "checkmark-circle" : (isExpired ? "calendar" : "lock-closed")} size={16} color={hasApplied ? (isDark ? "#34D399" : "#166534") : colors.textSecondary} />
          </View>
        )}

        <TouchableOpacity activeOpacity={0.7} onPress={(e) => { e?.stopPropagation?.(); onBookmark(); }} style={styles.bookmarkIconBtn}>
          <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={22} color={isBookmarked ? "#F59E0B" : colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
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
  cardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  cardPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  cardPillText: { fontSize: 12, fontWeight: "600" },
  cardContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: "800", lineHeight: 26 },
  cardDivider: { height: 1, width: "100%" },
  dateLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 2, opacity: 0.7 },
  dateValue: { fontSize: 13, fontWeight: "700" },
  verticalSep: { width: 1, height: 24 },
  bookmarkIconBtn: { width: 44, height: 48, justifyContent: "center", alignItems: "center" },
  cardActionsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  viewBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  viewBtnText: { fontWeight: "700", fontSize: 14 },
  applyBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 14 },
  applyBtnText: { fontWeight: "700", fontSize: 14 },

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
