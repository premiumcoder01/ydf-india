import { AppHeader, SearchBar } from "@/components";
import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import { bookmarkScholarship, getAllScholarships } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

// ─── Helpers ────────────────────────────────────────────────────────────────

const stripHtml = (html: string): string => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
};

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const getScholarshipSearchText = (scholarship: any): string => {
  const descriptionText = stripHtml(scholarship?.description || "");
  const tagsText = Array.isArray(scholarship?.tags)
    ? scholarship.tags.join(" ")
    : scholarship?.tags || "";
  const keywordsText = Array.isArray(scholarship?.keywords)
    ? scholarship.keywords.join(" ")
    : scholarship?.keywords || "";

  return normalizeText(
    [
      scholarship?.title,
      scholarship?.name,
      scholarship?.shortname,
      scholarship?.category,
      scholarship?.state,
      scholarship?.location,
      scholarship?.provider_name,
      scholarship?.provider,
      scholarship?.organization,
      scholarship?.department,
      scholarship?.eligibility,
      scholarship?.type,
      tagsText,
      keywordsText,
      descriptionText,
    ]
      .filter(Boolean)
      .join(" ")
  );
};

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    "All India": "#F59E0B",
    Bihar: "#3B82F6",
    Delhi: "#6366F1",
    Gujarat: "#10B981",
    Maharashtra: "#06B6D4",
    Punjab: "#8B5CF6",
    Rajasthan: "#F43F5E",
    Sikar: "#64748B",
    General: "#6B7280",
  };
  return colors[category] || colors["General"];
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface FilterState {
  statusOpen: boolean;
  statusExpired: boolean;
  statusApplied: boolean;
  statusNotApplied: boolean;
  statusBookmarked: boolean;
  categories: string[];
  dateFrom: string;
  dateTo: string;
  progressRange: "all" | "zero" | "low" | "high";
}

const DEFAULT_FILTERS: FilterState = {
  statusOpen: false,
  statusExpired: false,
  statusApplied: false,
  statusNotApplied: false,
  statusBookmarked: false,
  categories: [],
  dateFrom: "",
  dateTo: "",
  progressRange: "all",
};

const countActiveFilters = (f: FilterState): number => {
  let n = 0;
  if (f.statusOpen) n++;
  if (f.statusExpired) n++;
  if (f.statusApplied) n++;
  if (f.statusNotApplied) n++;
  if (f.statusBookmarked) n++;
  if (f.categories.length > 0) n++;
  if (f.dateFrom) n++;
  if (f.dateTo) n++;
  if (f.progressRange !== "all") n++;
  return n;
};

// ─── Filter Modal ─────────────────────────────────────────────────────────────

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (f: FilterState) => void;
  availableCategories: string[];
  isDark: boolean;
  colors: any;
}

function FilterModal({ visible, onClose, filters, onApply, availableCategories, isDark, colors }: FilterModalProps) {
  const [local, setLocal] = useState<FilterState>(filters);
  const [datePickerTarget, setDatePickerTarget] = useState<"from" | "to" | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setLocal(filters);
      setDatePickerTarget(null);
    }
  }, [visible, filters]);

  const handleDateConfirm = (date: Date) => {
    const iso = date.toISOString().split("T")[0]; // "YYYY-MM-DD"
    if (datePickerTarget === "from") {
      setLocal((p) => ({ ...p, dateFrom: iso }));
    } else if (datePickerTarget === "to") {
      setLocal((p) => ({ ...p, dateTo: iso }));
    }
    setDatePickerTarget(null);
  };

  const formatDisplay = (iso: string) => {
    if (!iso) return "Select date";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  };

  const datePickerMinDate = datePickerTarget === "to" && local.dateFrom
    ? new Date(local.dateFrom)
    : undefined;
  const datePickerMaxDate = datePickerTarget === "from" && local.dateTo
    ? new Date(local.dateTo)
    : undefined;

  const bg = isDark ? "#0F0F14" : "#F8F9FF";
  const card = isDark ? "#1A1A2E" : "#FFFFFF";
  const border = isDark ? "rgba(255,255,255,0.08)" : "#E8ECF4";
  const accent = "#6C63FF";
  const textPrimary = isDark ? "#F0F0FF" : "#1A1A2E";
  const textSecondary = isDark ? "rgba(240,240,255,0.5)" : "#8B92A5";

  const toggle = (key: keyof FilterState) =>
    setLocal((p) => ({ ...p, [key]: !p[key] }));

  const toggleCategory = (cat: string) =>
    setLocal((p) => ({
      ...p,
      categories: p.categories.includes(cat)
        ? p.categories.filter((c) => c !== cat)
        : [...p.categories, cat],
    }));

  const filteredCategories = availableCategories;

  const progressOptions: { label: string; value: FilterState["progressRange"]; icon: string; desc: string }[] = [
    { label: "All", value: "all", icon: "layers-outline", desc: "Show all scholarships" },
    { label: "0%", value: "zero", icon: "radio-button-off-outline", desc: "Not yet started" },
    { label: "1–50%", value: "low", icon: "trending-up-outline", desc: "Partially completed" },
    { label: "51–100%", value: "high", icon: "checkmark-circle-outline", desc: "Nearly complete" },
  ];

  const statusItems = [
    { key: "statusOpen" as keyof FilterState, label: "Open", icon: "lock-open-outline", color: "#10B981", desc: "Active scholarships" },
    { key: "statusExpired" as keyof FilterState, label: "Expired", icon: "time-outline", color: "#EF4444", desc: "Past deadline" },
    { key: "statusApplied" as keyof FilterState, label: "Applied", icon: "checkmark-done-circle-outline", color: "#3B82F6", desc: "You have applied" },
    { key: "statusNotApplied" as keyof FilterState, label: "Not Applied", icon: "close-circle-outline", color: "#F59E0B", desc: "Haven't applied yet" },
    { key: "statusBookmarked" as keyof FilterState, label: "Bookmarked", icon: "bookmark-outline", color: "#8B5CF6", desc: "Your saved scholarships" },
  ];

  const activeCount = countActiveFilters(local);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: bg }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={bg} />

        {/* ── Header ── */}
        <View style={[fStyles.header, { borderBottomColor: border, backgroundColor: isDark ? "#0F0F1A" : "#FFF" }]}>
          <TouchableOpacity onPress={onClose} style={fStyles.closeBtn} activeOpacity={0.7}>
            <View style={[fStyles.iconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#F0F2FF" }]}>
              <Ionicons name="close" size={20} color={textPrimary} />
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1, marginHorizontal: 16 }}>
            <Text style={[fStyles.headerTitle, { color: textPrimary }]}>Filters</Text>
            <Text style={[fStyles.headerSubtitle, { color: textSecondary }]}>
              {activeCount > 0 ? `${activeCount} filter${activeCount > 1 ? "s" : ""} active` : "Refine your results"}
            </Text>
          </View>

          {activeCount > 0 && (
            <TouchableOpacity
              onPress={() => setLocal(DEFAULT_FILTERS)}
              style={[fStyles.resetBtn, { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.2)" }]}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={14} color="#EF4444" />
              <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "700", marginLeft: 4 }}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Scrollable Content ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
        >

          {/* Status Filters */}
          {(
            <View style={fStyles.section}>
              <View style={fStyles.sectionHeader}>
                <View style={[fStyles.sectionIconBg, { backgroundColor: "rgba(108,99,255,0.12)" }]}>
                  <Ionicons name="toggle-outline" size={16} color={accent} />
                </View>
                <Text style={[fStyles.sectionTitle, { color: textPrimary }]}>Status</Text>
              </View>

              <View style={[fStyles.card, { backgroundColor: card, borderColor: border }]}>
                {statusItems.map((item, idx) => {
                  const isOn = local[item.key] as boolean;
                  return (
                    <View key={item.key}>
                      {idx > 0 && <View style={[fStyles.divider, { backgroundColor: border }]} />}
                      <TouchableOpacity
                        style={fStyles.switchRow}
                        onPress={() => toggle(item.key)}
                        activeOpacity={0.7}
                      >
                        <View style={[fStyles.statusIcon, { backgroundColor: `${item.color}18` }]}>
                          <Ionicons name={item.icon as any} size={18} color={item.color} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <Text style={[fStyles.switchLabel, { color: textPrimary }]}>{item.label}</Text>
                          <Text style={[fStyles.switchDesc, { color: textSecondary }]}>{item.desc}</Text>
                        </View>
                        <Switch
                          value={isOn}
                          onValueChange={() => toggle(item.key)}
                          trackColor={{ false: isDark ? "#2A2A40" : "#E5E7EB", true: `${item.color}60` }}
                          thumbColor={isOn ? item.color : isDark ? "#555570" : "#CACBCE"}
                          ios_backgroundColor={isDark ? "#2A2A40" : "#E5E7EB"}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Category Filter */}
          {(
            <View style={fStyles.section}>
              <View style={fStyles.sectionHeader}>
                <View style={[fStyles.sectionIconBg, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
                  <Ionicons name="location-outline" size={16} color="#F59E0B" />
                </View>
                <Text style={[fStyles.sectionTitle, { color: textPrimary }]}>Category / Region</Text>
                {local.categories.length > 0 && (
                  <View style={[fStyles.countBadge, { backgroundColor: accent }]}>
                    <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "700" }}>{local.categories.length}</Text>
                  </View>
                )}
              </View>

              <View style={[fStyles.card, { backgroundColor: card, borderColor: border }]}>
                {filteredCategories.length === 0 ? (
                  <Text style={{ color: textSecondary, textAlign: "center", paddingVertical: 16 }}>No categories found</Text>
                ) : (
                  <View style={fStyles.chipGrid}>
                    {filteredCategories.map((cat) => {
                      const catColor = getCategoryColor(cat);
                      const isActive = local.categories.includes(cat);
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => toggleCategory(cat)}
                          style={[
                            fStyles.categoryChip,
                            {
                              backgroundColor: isActive ? `${catColor}18` : isDark ? "rgba(255,255,255,0.05)" : "#F4F6FF",
                              borderColor: isActive ? catColor : border,
                              borderWidth: isActive ? 1.5 : 1,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <View style={[fStyles.catDot, { backgroundColor: catColor }]} />
                          <Text style={{ fontSize: 13, fontWeight: isActive ? "700" : "500", color: isActive ? catColor : textSecondary }}>
                            {cat}
                          </Text>
                          {isActive && <Ionicons name="checkmark" size={13} color={catColor} style={{ marginLeft: 4 }} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Date Range Filter */}
          <View style={fStyles.section}>
            <View style={fStyles.sectionHeader}>
              <View style={[fStyles.sectionIconBg, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
                <Ionicons name="calendar-outline" size={16} color="#10B981" />
              </View>
              <Text style={[fStyles.sectionTitle, { color: textPrimary }]}>Date Range</Text>
              {(local.dateFrom || local.dateTo) && (
                <TouchableOpacity
                  onPress={() => setLocal((p) => ({ ...p, dateFrom: "", dateTo: "" }))}
                  style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: "rgba(239,68,68,0.1)" }}
                >
                  <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "700" }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[fStyles.card, { backgroundColor: card, borderColor: border }]}>
              {/* From Date */}
              <TouchableOpacity
                style={fStyles.datePickerRow}
                onPress={() => setDatePickerTarget("from")}
                activeOpacity={0.7}
              >
                <View style={[fStyles.datePickerIconBg, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
                  <Ionicons name="calendar-clear-outline" size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[fStyles.switchDesc, { color: textSecondary, marginBottom: 2 }]}>From Date</Text>
                  <Text style={[
                    fStyles.switchLabel,
                    { color: local.dateFrom ? textPrimary : textSecondary, fontWeight: local.dateFrom ? "700" : "400" }
                  ]}>
                    {formatDisplay(local.dateFrom)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {local.dateFrom !== "" && (
                    <TouchableOpacity
                      onPress={() => setLocal((p) => ({ ...p, dateFrom: "" }))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={textSecondary} />
                </View>
              </TouchableOpacity>

              <View style={[fStyles.divider, { backgroundColor: border }]} />

              {/* To Date */}
              <TouchableOpacity
                style={fStyles.datePickerRow}
                onPress={() => setDatePickerTarget("to")}
                activeOpacity={0.7}
              >
                <View style={[fStyles.datePickerIconBg, { backgroundColor: "rgba(59,130,246,0.12)" }]}>
                  <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[fStyles.switchDesc, { color: textSecondary, marginBottom: 2 }]}>To Date</Text>
                  <Text style={[
                    fStyles.switchLabel,
                    { color: local.dateTo ? textPrimary : textSecondary, fontWeight: local.dateTo ? "700" : "400" }
                  ]}>
                    {formatDisplay(local.dateTo)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {local.dateTo !== "" && (
                    <TouchableOpacity
                      onPress={() => setLocal((p) => ({ ...p, dateTo: "" }))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={textSecondary} />
                </View>
              </TouchableOpacity>

              <View style={{ paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 }}>
                <Text style={[fStyles.dateHint, { color: textSecondary, paddingHorizontal: 0, paddingBottom: 0 }]}>
                  📅 Filters scholarships by their closing deadline
                </Text>
              </View>
            </View>
          </View>

          {/* Native Date Picker — renders inside this Modal context */}
          <DateTimePickerModal
            isVisible={datePickerTarget !== null}
            display="spinner"
            mode="date"
            textColor={isDark ? "#FFFFFF" : "#000000"}
            onConfirm={handleDateConfirm}
            onCancel={() => setDatePickerTarget(null)}
            minimumDate={datePickerMinDate}
            maximumDate={datePickerMaxDate}
            date={
              datePickerTarget === "from" && local.dateFrom
                ? new Date(local.dateFrom)
                : datePickerTarget === "to" && local.dateTo
                  ? new Date(local.dateTo)
                  : new Date()
            }
            isDarkModeEnabled={isDark}
          />

          {/* Progress Filter */}

          <View style={fStyles.section}>
            <View style={fStyles.sectionHeader}>
              <View style={[fStyles.sectionIconBg, { backgroundColor: "rgba(139,92,246,0.12)" }]}>
                <Ionicons name="stats-chart-outline" size={16} color="#8B5CF6" />
              </View>
              <Text style={[fStyles.sectionTitle, { color: textPrimary }]}>Application Progress</Text>
            </View>

            <View style={[fStyles.card, { backgroundColor: card, borderColor: border }]}>
              <View style={fStyles.progressGrid}>
                {/* Row 1 */}
                <View style={fStyles.progressRow}>
                  {progressOptions.slice(0, 2).map((opt) => {
                    const isActive = local.progressRange === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setLocal((p) => ({ ...p, progressRange: opt.value }))}
                        style={[
                          fStyles.progressChip,
                          {
                            backgroundColor: isActive ? accent : isDark ? "rgba(255,255,255,0.05)" : "#F4F6FF",
                            borderColor: isActive ? accent : border,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={opt.icon as any} size={20} color={isActive ? "#FFF" : textSecondary} />
                        <Text style={{ fontSize: 14, fontWeight: "700", color: isActive ? "#FFF" : textPrimary, marginTop: 7 }}>
                          {opt.label}
                        </Text>
                        <Text style={{ fontSize: 11, color: isActive ? "rgba(255,255,255,0.7)" : textSecondary, textAlign: "center", marginTop: 3, lineHeight: 15 }}>
                          {opt.desc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {/* Row 2 */}
                <View style={fStyles.progressRow}>
                  {progressOptions.slice(2, 4).map((opt) => {
                    const isActive = local.progressRange === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setLocal((p) => ({ ...p, progressRange: opt.value }))}
                        style={[
                          fStyles.progressChip,
                          {
                            backgroundColor: isActive ? accent : isDark ? "rgba(255,255,255,0.05)" : "#F4F6FF",
                            borderColor: isActive ? accent : border,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={opt.icon as any} size={20} color={isActive ? "#FFF" : textSecondary} />
                        <Text style={{ fontSize: 14, fontWeight: "700", color: isActive ? "#FFF" : textPrimary, marginTop: 7 }}>
                          {opt.label}
                        </Text>
                        <Text style={{ fontSize: 11, color: isActive ? "rgba(255,255,255,0.7)" : textSecondary, textAlign: "center", marginTop: 3, lineHeight: 15 }}>
                          {opt.desc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>


        </ScrollView>

        {/* ── Footer ── */}
        <View style={[fStyles.footer, { backgroundColor: isDark ? "#0F0F1A" : "#FFF", borderTopColor: border }]}>
          <TouchableOpacity
            style={[fStyles.clearAllBtn, { borderColor: border, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F4F6FF" }]}
            onPress={() => setLocal(DEFAULT_FILTERS)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={textSecondary} />
            <Text style={{ color: textSecondary, fontWeight: "700", fontSize: 15, marginLeft: 6 }}>Clear All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[fStyles.applyBtn, { backgroundColor: accent }]}
            onPress={() => { onApply(local); onClose(); }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#7C74FF", "#6C63FF", "#5A52EE"]}
              style={fStyles.applyBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 16, marginLeft: 8 }}>
                Apply Filters{activeCount > 0 ? ` (${activeCount})` : ""}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ScholarshipListingScreen() {
  const { isDark, colors } = useTheme();
  const [query, setQuery] = useState("");
  const [bookmarks, setBookmarks] = useState<Record<number, boolean>>({});
  const [apiScholarships, setApiScholarships] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarking, setBookmarking] = useState<Record<number, boolean>>({});
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch scholarships
  const fetchScholarships = useCallback(async () => {
    try {
      setLoading(true);
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) { setLoading(false); return; }

      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) { setLoading(false); return; }

      const response = await getAllScholarships(token, {
        search: searchQuery || undefined,
        per_page: 100,
      });

      if (response.success && response.data) {
        const apiData = response.data.data || response.data;
        const scholarshipsList = Array.isArray(apiData)
          ? apiData
          : apiData?.data || apiData?.scholarships || [];

        setApiScholarships(scholarshipsList);

        const bookmarksMap: Record<number, boolean> = {};
        scholarshipsList.forEach((scholarship: any) => {
          if (scholarship.bookmarked !== undefined) {
            bookmarksMap[scholarship.id] = scholarship.bookmarked;
          }
        });
        setBookmarks(bookmarksMap);
      } else {
        setApiScholarships([]);
      }
    } catch (error) {
      setApiScholarships([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useFocusEffect(useCallback(() => { fetchScholarships(); }, [fetchScholarships]));
  useEffect(() => { fetchScholarships(); }, [searchQuery]);

  const searchIndex = useMemo(() => {
    const index = new Map<number, string>();
    apiScholarships.forEach((scholarship) => {
      if (scholarship?.id != null) {
        index.set(scholarship.id, getScholarshipSearchText(scholarship));
      }
    });
    return index;
  }, [apiScholarships]);

  // Dynamic categories from API data
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    apiScholarships.forEach((s) => { if (s.category) cats.add(s.category); });
    return Array.from(cats).sort();
  }, [apiScholarships]);

  // Filter + search combined
  const data = useMemo(() => {
    if (apiScholarships.length === 0) return [];
    let list = [...apiScholarships];

    // Search
    if (searchQuery.trim()) {
      const tokens = normalizeText(searchQuery).split(" ").filter(Boolean);
      list = list.filter((s) => {
        const text = searchIndex.get(s.id) || "";
        return tokens.every((t) => text.includes(t));
      });
    }

    const f = activeFilters;

    // Status filters (OR within status group)
    const anyStatus = f.statusOpen || f.statusExpired || f.statusApplied || f.statusNotApplied || f.statusBookmarked;
    if (anyStatus) {
      list = list.filter((s) => {
        const isBookmarked = s.bookmarked || bookmarks[s.id];
        if (f.statusOpen && !s.expired && !s.has_applied && s.can_apply !== false) return true;
        if (f.statusExpired && s.expired) return true;
        if (f.statusApplied && s.has_applied) return true;
        if (f.statusNotApplied && !s.has_applied) return true;
        if (f.statusBookmarked && isBookmarked) return true;
        return false;
      });
    }

    // Category
    if (f.categories.length > 0) {
      list = list.filter((s) => f.categories.includes(s.category));
    }

    // Date range — uses "Closes" date (end_date ?? start_date), same as card display
    if (f.dateFrom) {
      const fromTs = new Date(f.dateFrom).getTime();
      list = list.filter((s) => {
        const closes = s.end_date || s.start_date;
        if (!closes) return true; // no date → don't hide it
        return new Date(closes).getTime() >= fromTs;
      });
    }
    if (f.dateTo) {
      const toTs = new Date(f.dateTo).getTime();
      list = list.filter((s) => {
        const closes = s.end_date || s.start_date;
        if (!closes) return true; // no date → don't hide it
        return new Date(closes).getTime() <= toTs;
      });
    }

    // Progress
    if (f.progressRange !== "all") {
      list = list.filter((s) => {
        const pct = s.progress_percent ?? 0;
        if (f.progressRange === "zero") return pct === 0;
        if (f.progressRange === "low") return pct >= 1 && pct <= 50;
        if (f.progressRange === "high") return pct >= 51 && pct <= 100;
        return true;
      });
    }

    return list;
  }, [apiScholarships, searchQuery, searchIndex, activeFilters, bookmarks]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  }, []);

  const toggleBookmark = useCallback(async (id: number, currentBookmarkState: boolean) => {
    if (bookmarking[id]) return;
    const newBookmarkState = !currentBookmarkState;
    setBookmarks((b) => ({ ...b, [id]: newBookmarkState }));
    setApiScholarships((prev) => prev.map((item) => item.id === id ? { ...item, bookmarked: newBookmarkState } : item));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      setBookmarking((prev) => ({ ...prev, [id]: true }));
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) {
        setBookmarks((b) => ({ ...b, [id]: !newBookmarkState }));
        setApiScholarships((prev) => prev.map((item) => item.id === id ? { ...item, bookmarked: !newBookmarkState } : item));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast("Authentication failed. Please login again.", "error");
        return;
      }
      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) {
        setBookmarks((b) => ({ ...b, [id]: !newBookmarkState }));
        setApiScholarships((prev) => prev.map((item) => item.id === id ? { ...item, bookmarked: !newBookmarkState } : item));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast("Authentication failed. Please login again.", "error");
        return;
      }
      const action = newBookmarkState ? "bookmark" : "unbookmark";
      const response = await bookmarkScholarship(token, id, action);
      if (response.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(newBookmarkState ? "Scholarship bookmarked!" : "Bookmark removed!", "success");
      } else {
        setBookmarks((b) => ({ ...b, [id]: !newBookmarkState }));
        setApiScholarships((prev) => prev.map((item) => item.id === id ? { ...item, bookmarked: !newBookmarkState } : item));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(response.error || response.message || "Failed to update bookmark", "error");
      }
    } catch (err: any) {
      setBookmarks((b) => ({ ...b, [id]: !newBookmarkState }));
      setApiScholarships((prev) => prev.map((item) => item.id === id ? { ...item, bookmarked: !newBookmarkState } : item));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("Network error. Please try again.", "error");
    } finally {
      setBookmarking((prev) => ({ ...prev, [id]: false }));
    }
  }, [bookmarking, showToast]);

  const filterCount = countActiveFilters(activeFilters);

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const categoryColor = getCategoryColor(item.category || "");
      const isBookmarked = item.bookmarked || bookmarks[item.id];
      const isExpired = item.expired;
      const hasApplied = item.has_applied;
      const deadline = item.end_date;

      let statusConfig = { text: "Open", color: "#10B981", bg: "rgba(16, 185, 129, 0.1)" };
      if (isExpired) statusConfig = { text: "Expired", color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" };
      else if (hasApplied) statusConfig = { text: "Applied", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" };
      else if (item.can_apply === false) statusConfig = { text: "Closed", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" };

      return (
        <View
          style={[
            styles.cardContainer,
            {
              backgroundColor: colors.card,
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
              {item.title}
            </Text>

          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 15, paddingHorizontal: 16, marginBottom: 16 }}>
            <View>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Opens</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {item.start_date ? new Date(item.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "TBA"}
              </Text>
            </View>
            <View style={[styles.verticalSep, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "#E5E7EB" }]} />
            <View>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Closes</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {deadline ? new Date(deadline).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "No Deadline"}
              </Text>
            </View>
          </View>

          {item.progress_percent > 0 && (
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase" }}>Application Progress</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: item.progress_percent === 100 ? "#10B981" : categoryColor }}>
                  {item.progress_percent}%
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                <View
                  style={{
                    height: "100%",
                    width: `${item.progress_percent}%`,
                    backgroundColor: item.progress_percent === 100 ? "#10B981" : categoryColor,
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          )}

          <View style={[styles.cardDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6", marginBottom: 12 }]} />

          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/(dashboard)/student/student-scholarship-details", params: { scholarshipId: item.id } })}
              style={[styles.viewBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB", borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB" }]}
            >
              <Ionicons name="eye-outline" size={16} color={colors.text} />
              <Text style={[styles.viewBtnText, { color: colors.text }]}>Details</Text>
            </TouchableOpacity>

            {!isExpired && !hasApplied && item.can_apply !== false ? (
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/(dashboard)/student/student-apply-form", params: { scholarshipId: item.id } })}
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
                  {hasApplied ? "Applied" : "Closed"}
                </Text>
                <Ionicons name={hasApplied ? "checkmark-circle" : "lock-closed"} size={16} color={hasApplied ? (isDark ? "#34D399" : "#166534") : colors.textSecondary} />
              </View>
            )}

            <TouchableOpacity activeOpacity={0.7} onPress={() => toggleBookmark(item.id, isBookmarked)} style={styles.bookmarkIconBtn}>
              <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={22} color={isBookmarked ? "#F59E0B" : colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [bookmarks, toggleBookmark, isDark, colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#f2c44d" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#121212" : "#fff"} />
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#FFF8E1"]}
        style={styles.background}
        locations={[0, 0.4, 1]}
      />

      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
        <AppHeader title="Scholarships" onBack={() => router.back()} />
        <View style={styles.searchRowWrapper}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              onClear={() => setQuery("")}
              placeholder="Search scholarships..."
            />
          </View>
          {/* Filter Icon Button */}
          <TouchableOpacity
            onPress={() => setFilterVisible(true)}
            style={[
              styles.filterIconBtn,
              {
                backgroundColor: filterCount > 0
                  ? (isDark ? "rgba(108,99,255,0.22)" : "rgba(108,99,255,0.1)")
                  : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"),
                borderColor: filterCount > 0
                  ? (isDark ? "rgba(108,99,255,0.55)" : "rgba(108,99,255,0.4)")
                  : (isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.09)"),
                shadowColor: filterCount > 0 ? "#6C63FF" : "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: filterCount > 0 ? 0.22 : 0.05,
                shadowRadius: 8,
                elevation: Platform.OS === "android" ? 0 : filterCount > 0 ? 4 : 1,
              },
            ]}
            activeOpacity={0.75}
          >
            <Ionicons
              name={filterCount > 0 ? "options" : "options-outline"}
              size={21}
              color={filterCount > 0 ? "#6C63FF" : (isDark ? "rgba(255,255,255,0.55)" : "#888")}
            />
            {filterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active filter chips */}
        {filterCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activePillsRow}
          >
            {activeFilters.statusOpen && <ActiveFilterPill label="Open" color="#10B981" onRemove={() => setActiveFilters((p) => ({ ...p, statusOpen: false }))} />}
            {activeFilters.statusExpired && <ActiveFilterPill label="Expired" color="#EF4444" onRemove={() => setActiveFilters((p) => ({ ...p, statusExpired: false }))} />}
            {activeFilters.statusApplied && <ActiveFilterPill label="Applied" color="#3B82F6" onRemove={() => setActiveFilters((p) => ({ ...p, statusApplied: false }))} />}
            {activeFilters.statusNotApplied && <ActiveFilterPill label="Not Applied" color="#F59E0B" onRemove={() => setActiveFilters((p) => ({ ...p, statusNotApplied: false }))} />}
            {activeFilters.statusBookmarked && <ActiveFilterPill label="Bookmarked" color="#8B5CF6" onRemove={() => setActiveFilters((p) => ({ ...p, statusBookmarked: false }))} />}
            {activeFilters.categories.map((cat) => (
              <ActiveFilterPill key={cat} label={cat} color={getCategoryColor(cat)} onRemove={() => setActiveFilters((p) => ({ ...p, categories: p.categories.filter((c) => c !== cat) }))} />
            ))}
            {activeFilters.dateFrom && <ActiveFilterPill label={`From: ${activeFilters.dateFrom}`} color="#10B981" onRemove={() => setActiveFilters((p) => ({ ...p, dateFrom: "" }))} />}
            {activeFilters.dateTo && <ActiveFilterPill label={`To: ${activeFilters.dateTo}`} color="#10B981" onRemove={() => setActiveFilters((p) => ({ ...p, dateTo: "" }))} />}
            {activeFilters.progressRange !== "all" && (
              <ActiveFilterPill
                label={`Progress: ${activeFilters.progressRange === "zero" ? "0%" : activeFilters.progressRange === "low" ? "1–50%" : "51–100%"}`}
                color="#8B5CF6"
                onRemove={() => setActiveFilters((p) => ({ ...p, progressRange: "all" }))}
              />
            )}
            <TouchableOpacity
              onPress={() => setActiveFilters(DEFAULT_FILTERS)}
              style={[styles.clearAllPill, { backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "#FEE2E2" }]}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#EF4444" }}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={fetchScholarships}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>{loading ? "Loading scholarships..." : "No scholarships found"}</Text>
            <Text style={styles.emptyStateSubtext}>{loading ? "Please wait..." : filterCount > 0 ? "Try adjusting your filters" : "Try adjusting your search"}</Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={activeFilters}
        onApply={setActiveFilters}
        availableCategories={availableCategories}
        isDark={isDark}
        colors={colors}
      />

      <Toast message={toastMessage} type={toastType} visible={toastVisible} onHide={() => setToastVisible(false)} duration={3000} />
    </View>
  );
}

// ─── Active Filter Pill ───────────────────────────────────────────────────────

function ActiveFilterPill({ label, color, onRemove }: { label: string; color: string; onRemove: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.activePill, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}
      onPress={onRemove}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: 12, fontWeight: "600", color }}>{label}</Text>
      <Ionicons name="close" size={12} color={color} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  fixedHeader: { backgroundColor: "transparent" },
  background: { position: "absolute", top: 0, left: 0, bottom: 0, right: 0 },
  listContent: { paddingTop: 16, paddingBottom: 40 },
  searchRowWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    paddingLeft: 0,
    gap: 8,
  },
  filterIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#6C63FF",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  filterBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  activePillsRow: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 10, gap: 8, alignItems: "center" },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  clearAllPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 20,
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
  cardSubtitle: { fontSize: 14, fontWeight: "500" },
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
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  emptyStateText: { fontSize: 18, fontWeight: "600", color: "#999", marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: "#bbb", marginTop: 4 },
});

const fStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 54 : (StatusBar.currentHeight ?? 0) + 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: { padding: 2 },
  headerTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "500" },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 10 },
  sectionIconBg: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3, flex: 1 },
  countBadge: { width: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  divider: { height: 1, marginHorizontal: 16 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  switchLabel: { fontSize: 15, fontWeight: "700" },
  switchDesc: { fontSize: 12, marginTop: 2 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, padding: 16 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    gap: 6,
  },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  dateRow: { flexDirection: "row", alignItems: "flex-end", padding: 16, gap: 8 },
  dateLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  dateInputText: { flex: 1, fontSize: 13, fontWeight: "600" },
  dateArrow: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 2 },
  dateHint: { fontSize: 12, paddingHorizontal: 16, paddingBottom: 14, fontStyle: "italic" },
  progressGrid: { flexDirection: "column", gap: 10, padding: 16 },
  progressRow: { flexDirection: "row", gap: 10 },
  progressChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    borderTopWidth: 1,
  },
  clearAllBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  applyBtn: {
    flex: 2,
    borderRadius: 16,
    overflow: "hidden",
  },
  applyBtnGrad: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  datePickerIconBg: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
});
