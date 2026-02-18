import { useTheme } from "@/context/ThemeContext";
import { getScholarshipApplicants } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ReviewerHeader from "../../../components/ReviewerHeader";

type ApplicantStatus = "new" | "approved" | "rejected";

type Applicant = {
  id: string;
  name: string;
  major: string;
  institution: string;
  status: ApplicantStatus;
  avatarUrl?: string | null;
  email: string;
  phone: string;
  gpa: string;
  submittedAt: string;
  student_id: string;
  current_year: string;
  graduation_date: string;
  _raw: any; // full raw API object passed to applicant-details screen
};

const TABS: Array<{ key: "all" | ApplicantStatus; label: string; icon: string }> = [
  { key: "all", label: "All", icon: "apps-outline" },
  { key: "new", label: "New", icon: "time-outline" },
  { key: "approved", label: "Approved", icon: "checkmark-circle-outline" },
  { key: "rejected", label: "Rejected", icon: "close-circle-outline" },
];

const PAGE_SIZE = 100;

export default function ProviderApplicantsScreen() {
  const params = useLocalSearchParams();
  const { isDark, colors } = useTheme();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [page, setPage] = useState(1);

  const scholarshipId = (params.scholarship_id as string) || null;
  const schemeTitle = (params.scheme_title as string) || undefined;

  const [allApplicants, setAllApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const fetchApplicants = async (reset = false) => {
    if (!scholarshipId) return;

    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;
      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) return;

      const response = await getScholarshipApplicants(token, Number(scholarshipId), {
        page: reset ? 1 : page,
        per_page: PAGE_SIZE,
        status: activeTab !== "all" ? activeTab : undefined
      });

      if (response.success && response.data?.applicants) {
        const newApplicants = response.data.applicants.map((app: any) => {
          let parsedDetails: any = {};
          try {
            if (typeof app.application_text === 'string' && app.application_text) {
              parsedDetails = JSON.parse(app.application_text);
            } else if (typeof app.application_text === 'object') {
              parsedDetails = app.application_text;
            }
          } catch (e) {
            console.log("Error parsing application_text", e);
          }

          return {
            // ── display fields (used by the list card) ──
            id: String(app.id),
            name: app.user?.fullname || `${app.user?.firstname} ${app.user?.lastname}`,
            major: parsedDetails.major || "",
            institution: parsedDetails.institution || "",
            status: app.status || "new",
            avatarUrl: app.user?.picture || null,
            email: parsedDetails.email || app.user?.email || "",
            phone: parsedDetails.phone || "",
            gpa: parsedDetails.gpa || "",
            submittedAt: app.timecreated ? new Date(app.timecreated).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }) : "",
            student_id: parsedDetails.student_id || "",
            current_year: parsedDetails.current_year || "",
            graduation_date: parsedDetails.graduation_date || "",
            // ── full raw API object (used by applicant-details screen) ──
            _raw: app,
          };
        });

        if (reset) {
          setAllApplicants(newApplicants);
        } else {
          setAllApplicants(prev => [...prev, ...newApplicants]);
        }
        if (response.data.pagination) {
          const { page: currentPage, total_pages } = response.data.pagination;
          setHasMore(currentPage < total_pages);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error("Error fetching applicants:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApplicants(true);
  }, [scholarshipId, activeTab]);

  useFocusEffect(
    useCallback(() => {
      if (scholarshipId) {
        fetchApplicants(true);
      }
    }, [scholarshipId, activeTab])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allApplicants.filter((a) =>
      q.length === 0 ? true : a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
    );
  }, [allApplicants, query]);

  const paginated = useMemo(
    () => filtered.slice(0, page * PAGE_SIZE),
    [filtered, page]
  );

  const tabCounts = useMemo(() => {
    return {
      all: allApplicants.length,
      new: allApplicants.filter((a) => a.status === "new").length,
      approved: allApplicants.filter((a) => a.status === "approved").length,
      rejected: allApplicants.filter((a) => a.status === "rejected").length,
    };
  }, [allApplicants]);

  const getStatusConfig = (status: ApplicantStatus) => {
    switch (status) {
      case "approved":
        return {
          color: "#10b981",
          bgLight: isDark ? "rgba(16, 185, 129, 0.15)" : "#d1fae5",
          label: "Approved",
          icon: "checkmark-circle"
        };
      case "rejected":
        return {
          color: "#ef4444",
          bgLight: isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2",
          label: "Rejected",
          icon: "close-circle"
        };
      default:
        return {
          color: "#f59e0b",
          bgLight: isDark ? "rgba(245, 158, 11, 0.15)" : "#fef3c7",
          label: "New",
          icon: "time"
        };
    }
  };

  const renderItem: ListRenderItem<Applicant> = ({ item, index }) => {
    const statusConfig = getStatusConfig(item.status);
    const initials = item.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
    const gradientColors: [string, string] =
      item.status === "approved" ? ["#10B981", "#059669"] :
        item.status === "rejected" ? ["#EF4444", "#DC2626"] :
          ["#6366F1", "#4F46E5"];

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => router.push({
          pathname: "/(dashboard)/provider/applicant-details",
          params: { applicant: JSON.stringify(item._raw) }
        })}
        style={[styles.card, {
          backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
          borderColor: isDark ? "#334155" : "#E8EDF5",
          shadowColor: isDark ? "#000" : "#94A3B8",
        }]}
      >
        {/* ── STATUS ACCENT BAR ── */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.accentBar}
        />

        {/* ── HEADER ── */}
        <View style={styles.cardHeader}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <LinearGradient colors={gradientColors} style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
            )}
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color, borderColor: isDark ? "#1E293B" : "#fff" }]} />
          </View>

          {/* Name + meta */}
          <View style={styles.headerInfo}>
            <Text style={[styles.applicantName, { color: isDark ? "#F1F5F9" : "#0F172A" }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.headerMetaRow}>
              <Ionicons name="mail-outline" size={11} color={isDark ? "#64748B" : "#94A3B8"} />
              <Text style={[styles.headerMeta, { color: isDark ? "#64748B" : "#94A3B8" }]} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
            {item.phone ? (
              <View style={styles.headerMetaRow}>
                <Ionicons name="call-outline" size={11} color={isDark ? "#64748B" : "#94A3B8"} />
                <Text style={[styles.headerMeta, { color: isDark ? "#64748B" : "#94A3B8" }]}>
                  {item.phone}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Status badge + App ID */}
          <View style={styles.headerRight}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgLight }]}>
              <Ionicons name={statusConfig.icon as any} size={11} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
            <Text style={[styles.appId, { color: isDark ? "#475569" : "#94A3B8" }]}>#{item.id}</Text>
          </View>
        </View>

        {/* ── INFO TABLE ── */}
        <View style={[styles.infoTable, { borderTopColor: isDark ? "#334155" : "#F1F5F9" }]}>
          {/* Row 1: Major + GPA */}
          <View style={styles.infoTableRow}>
            <View style={styles.infoTableCell}>
              <Text style={[styles.infoTableLabel, { color: isDark ? "#64748B" : "#94A3B8" }]}>Major</Text>
              <Text style={[styles.infoTableValue, { color: isDark ? "#F1F5F9" : "#0F172A" }]} numberOfLines={1}>
                {item.major || "—"}
              </Text>
            </View>
            <View style={[styles.infoTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />
            <View style={styles.infoTableCell}>
              <Text style={[styles.infoTableLabel, { color: isDark ? "#64748B" : "#94A3B8" }]}>GPA / %</Text>
              <Text style={[styles.infoTableValue, { color: isDark ? "#FBBF24" : "#D97706", fontWeight: "800" }]}>
                {item.gpa || "—"}
              </Text>
            </View>
          </View>

          <View style={[styles.infoTableHRule, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

          {/* Row 2: Institution + Year */}
          <View style={styles.infoTableRow}>
            <View style={styles.infoTableCell}>
              <Text style={[styles.infoTableLabel, { color: isDark ? "#64748B" : "#94A3B8" }]}>Institution</Text>
              <Text style={[styles.infoTableValue, { color: isDark ? "#F1F5F9" : "#0F172A" }]} numberOfLines={1}>
                {item.institution || "—"}
              </Text>
            </View>
            <View style={[styles.infoTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />
            <View style={styles.infoTableCell}>
              <Text style={[styles.infoTableLabel, { color: isDark ? "#64748B" : "#94A3B8" }]}>Year</Text>
              <Text style={[styles.infoTableValue, { color: isDark ? "#A78BFA" : "#6D28D9" }]} numberOfLines={1}>
                {item.current_year || "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* ── CHIPS ROW (student ID only) ── */}
        {item.student_id ? (
          <View style={[styles.chipsRow, { borderTopColor: isDark ? "#334155" : "#F1F5F9" }]}>
            <View style={[styles.chip, { backgroundColor: isDark ? "rgba(99,102,241,0.1)" : "#EEF2FF", borderColor: isDark ? "rgba(99,102,241,0.25)" : "#C7D2FE" }]}>
              <Ionicons name="card-outline" size={11} color={isDark ? "#818CF8" : "#6366F1"} />
              <Text style={[styles.chipText, { color: isDark ? "#818CF8" : "#4F46E5" }]} numberOfLines={1}>
                {item.student_id.length > 20 ? item.student_id.substring(0, 20) + "..." : item.student_id}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── FOOTER ── */}
        <View style={[styles.cardFooter, { borderTopColor: isDark ? "#334155" : "#F1F5F9" }]}>
          <View style={styles.footerLeft}>
            <Ionicons name="time-outline" size={12} color={isDark ? "#475569" : "#94A3B8"} />
            <Text style={[styles.footerDate, { color: isDark ? "#475569" : "#94A3B8" }]}>
              Applied {item.submittedAt}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.viewBtn, { borderColor: isDark ? "#818CF8" : "#6366F1" }]}
            onPress={() => router.push({
              pathname: "/(dashboard)/provider/applicant-details",
              params: { applicant: JSON.stringify(item._raw) }
            })}
            activeOpacity={0.75}
          >
            <Text style={[styles.viewBtnText, { color: isDark ? "#818CF8" : "#4F46E5" }]}>View Details</Text>
            <Ionicons name="arrow-forward" size={13} color={isDark ? "#818CF8" : "#4F46E5"} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (!scholarshipId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ReviewerHeader title="Review Applicants" />
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.surface : "#f3f4f6" }]}>
            <Ionicons name="people-circle-outline" size={64} color={colors.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Scheme Selected
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Please select a scheme from your dashboard to view its applicants.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Review Applicants"
        subtitle={schemeTitle ? `${schemeTitle}` : "Reviewing applicants"}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder="Search by name or email..."
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>



      {/* List */}
      <FlatList
        data={paginated}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (paginated.length < filtered.length) setPage((p) => p + 1);
          else if (hasMore && !loadingMore) fetchApplicants(false);
        }}
        ListFooterComponent={
          (loading || loadingMore) ? (
            <View style={styles.footerLoader}>
              <View style={[styles.loaderDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Loading applicants...
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyList}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.surface : "#f3f4f6" }]}>
                <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Applicants Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {query ? "Try adjusting your search" : "Candidates who apply to your scheme will appear here."}
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "500",
  },

  // Tabs
  tabsContainer: {
    paddingBottom: 12,
  },
  tabsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 8,
  },
  tabText: {
    fontWeight: "700",
    fontSize: 14,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: "center",
  },
  countText: {
    fontSize: 12,
    fontWeight: "800",
  },

  // Summary
  summaryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // List
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // Card
  card: {
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
    overflow: "hidden",
  },
  accentBar: { height: 5, width: "100%" },

  // Header
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  avatarWrap: { position: "relative", flexShrink: 0 },
  avatar: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#fff" },
  statusDot: {
    position: "absolute", bottom: -2, right: -2,
    width: 14, height: 14, borderRadius: 7, borderWidth: 2,
  },
  headerInfo: { flex: 1, gap: 4 },
  applicantName: { fontSize: 16, fontWeight: "800", lineHeight: 22 },
  headerMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerMeta: { fontSize: 11, fontWeight: "500", flex: 1 },
  headerRight: { alignItems: "flex-end", gap: 6 },
  statusBadge: {
    flexDirection: "row", alignItems: "center",
    gap: 4, paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  appId: { fontSize: 11, fontWeight: "600" },

  // Stats Grid
  // Info Table (2-column grid)
  infoTable: {
    borderTopWidth: 1,
  },
  infoTableRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  infoTableCell: {
    flex: 1,
    gap: 3,
  },
  infoTableLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoTableValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  infoTableDivider: {
    width: 1,
    marginHorizontal: 12,
  },
  infoTableHRule: {
    height: 1,
    marginHorizontal: 14,
  },

  // Chips
  chipsRow: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 6, paddingHorizontal: 14, paddingBottom: 12,
    borderTopWidth: 1, paddingTop: 10,
  },
  chip: {
    flexDirection: "row", alignItems: "center",
    gap: 4, paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: "600" },

  // Footer
  cardFooter: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, gap: 8,
  },
  footerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  footerDate: { fontSize: 11, fontWeight: "500" },
  viewBtn: {
    flexDirection: "row", alignItems: "center",
    gap: 5, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  viewBtnText: { fontSize: 12, fontWeight: "700" },

  // Loading
  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 10,
  },
  loaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerText: {
    fontWeight: "600",
    fontSize: 14,
  },

  // Empty States
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyList: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
