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

type ApplicantStatus = "Pending" | "Approved" | "Rejected";

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
  documents: any[];
  activities: string;
  assessment_q1: string;
  assessment_q2: string;
  graduation_date: string;
  student_id: string;
  current_year: string;
  financial_info: string;
  interview_mode: string;
  verification_time: string;
};

const TABS: Array<{ key: "All" | ApplicantStatus; label: string }> = [
  { key: "All", label: "All" },
  { key: "Pending", label: "Pending" },
  { key: "Approved", label: "Approved" },
  { key: "Rejected", label: "Rejected" },
];

const PAGE_SIZE = 10;

export default function ProviderApplicantsScreen() {
  const params = useLocalSearchParams();
  const { isDark, colors } = useTheme();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] =
    useState<(typeof TABS)[number]["key"]>("All");
  const [page, setPage] = useState(1);

  // Now strictly dependent on params
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
        status: activeTab !== "All" ? activeTab.toLowerCase() : undefined
      });

      if (response.success && response.data?.applicants) {
        const newApplicants = response.data.applicants.map((app: any) => {
          let parsedDetails: any = {};
          try {
            if (typeof app.application_text === 'string') {
              parsedDetails = JSON.parse(app.application_text);
            } else if (typeof app.application_text === 'object') {
              parsedDetails = app.application_text;
            }
          } catch (e) {
            console.log("Error parsing application_text", e);
            parsedDetails = { major: "N/A" };
          }

          let status: ApplicantStatus = "Pending";
          if (app.status) {
            const s = app.status.toLowerCase();
            if (s === 'approved') status = "Approved";
            else if (s === 'rejected') status = "Rejected";
            else status = "Pending";
          }

          return {
            id: String(app.id),
            name: app.user?.fullname || `${app.user?.firstname} ${app.user?.lastname}`,
            major: parsedDetails.major || "N/A",
            institution: parsedDetails.institution || "N/A",
            status: status,
            avatarUrl: app.user?.picture || null,
            email: parsedDetails.email || app.user?.email || "N/A",
            phone: parsedDetails.phone || "N/A",
            gpa: parsedDetails.gpa || "N/A",
            submittedAt: app.timecreated ? new Date(app.timecreated).toLocaleDateString() : "N/A",
            documents: parsedDetails.documents || [],
            activities: parsedDetails.activities || "N/A",
            assessment_q1: parsedDetails.assessment_q1 || "N/A",
            assessment_q2: parsedDetails.assessment_q2 || "N/A",
            graduation_date: parsedDetails.graduation_date || "N/A",
            student_id: parsedDetails.student_id || "N/A",
            current_year: parsedDetails.current_year || "N/A",
            financial_info: parsedDetails.financial_info || "N/A",
            interview_mode: parsedDetails.interview_mode || "N/A",
            verification_time: parsedDetails.verification_time || "N/A"
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
    return allApplicants
      .filter((a) =>
        q.length === 0 ? true : a.name.toLowerCase().includes(q)
      );
  }, [allApplicants, query]);

  const paginated = useMemo(
    () => filtered.slice(0, page * PAGE_SIZE),
    [filtered, page]
  );

  const tabCounts = useMemo(() => {
    return {
      All: allApplicants.length,
      Pending: allApplicants.filter((a) => a.status === "Pending").length,
      Approved: allApplicants.filter((a) => a.status === "Approved").length,
      Rejected: allApplicants.filter((a) => a.status === "Rejected").length,
    };
  }, [allApplicants]);

  const renderItem: ListRenderItem<Applicant> = ({ item }) => {
    return (
      <View style={{ marginBottom: 16 }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            router.push({
              pathname: "/(dashboard)/provider/applicant-details",
              params: { applicant: JSON.stringify(item) }
            });
          }}
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
        >
          {/* Header Row: Avatar, Name & Status */}
          <View style={styles.cardHeaderRow}>
            {/* Avatar */}
            <View style={{ marginRight: 12 }}>
              {item.avatarUrl ? (
                <Image
                  source={{ uri: item.avatarUrl }}
                  style={[styles.avatar, { borderColor: colors.border }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatar, getAvatarStyle(item.status, isDark)]}>
                  <Text style={[styles.avatarText, { color: isDark ? colors.text : "#1a1a1a" }]}>
                    {item.name.charAt(0)}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.idText, { color: colors.textSecondary }]} numberOfLines={1}>
                    <Ionicons name="mail-outline" size={10} color={colors.textSecondary} style={{ marginRight: 4 }} /> {item.email}
                  </Text>
                </View>
                <View style={[styles.statusBadge, getStatusStyle(item.status, isDark)]}>
                  <Text style={[styles.statusText, getStatusTextStyle(item.status, isDark)]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              {/* Major & Uni */}
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <Ionicons name="book-outline" size={12} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>{item.major}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="school-outline" size={12} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{item.institution}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Stats Row */}
          <View style={styles.cardFooter}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>GPA</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{item.gpa}</Text>
            </View>
            <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>APPLIED</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{item.submittedAt}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => router.push({
                pathname: "/(dashboard)/provider/applicant-details",
                params: { applicant: JSON.stringify(item) }
              })}
            >
              <LinearGradient
                colors={isDark ? ["#4f46e5", "#4338ca"] : ["#6366f1", "#4f46e5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.reviewBtn}
              >
                <Text style={styles.reviewBtnText}>Review</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (!scholarshipId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="people-circle-outline" size={80} color={colors.textSecondary} />
        <Text style={{ marginTop: 20, fontSize: 18, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' }}>
          No Scheme Selected
        </Text>
        <Text style={{ marginTop: 10, fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
          Please select a scheme from your dashboard to view its applicants.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 30, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Review Applicants"
        subtitle={schemeTitle ? `For: ${schemeTitle}` : "Reviewing applicants"}
      />

      {/* Header Controls */}
      <View style={styles.controlsContainer}>
        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            placeholder="Search applicants..."
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Action Row - Just Filters now */}
        <View style={styles.filterRow}>
          <FlatList
            horizontal
            data={TABS}
            contentContainerStyle={styles.tabsScrollContent}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => {
              const count = tabCounts[item.key as keyof typeof tabCounts];
              const isActive = activeTab === item.key;
              return (
                <TouchableOpacity
                  style={[
                    styles.tabChip,
                    { borderColor: isActive ? colors.primary : colors.border, backgroundColor: isActive ? colors.primary : "transparent" }
                  ]}
                  onPress={() => {
                    setActiveTab(item.key);
                    setPage(1);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, { color: isActive ? "#fff" : colors.textSecondary }]}>
                    {item.label}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.countBadge, { backgroundColor: isActive ? "rgba(255,255,255,0.2)" : colors.surface }]}>
                      <Text style={[styles.countText, { color: isActive ? "#fff" : colors.textSecondary }]}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>

      {/* Summary Text */}
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          Showing {paginated.length} of {filtered.length} applicants
        </Text>
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
              <View style={styles.loaderDot} />
              <Text style={styles.footerText}>Loading applicants...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.surface : "#f3f4f6" }]}>
                <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Applicants Yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Candidates who apply to your scheme will appear here.
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

function getStatusStyle(status: ApplicantStatus, isDark: boolean) {
  switch (status) {
    case "Approved":
      return { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5", borderColor: isDark ? "#059669" : "#6ee7b7" };
    case "Rejected":
      return { backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#fef2f2", borderColor: isDark ? "#dc2626" : "#fca5a5" };
    default:
      return { backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "#fef3c7", borderColor: isDark ? "#d97706" : "#fcd34d" };
  }
}

function getStatusTextStyle(status: ApplicantStatus, isDark: boolean) {
  switch (status) {
    case "Approved":
      return { color: isDark ? "#34d399" : "#059669" };
    case "Rejected":
      return { color: isDark ? "#f87171" : "#dc2626" };
    default:
      return { color: isDark ? "#fbbf24" : "#d97706" };
  }
}

function getAvatarStyle(status: ApplicantStatus, isDark: boolean) {
  switch (status) {
    case "Approved":
      return { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#d1fae5", borderColor: isDark ? "#059669" : "#6ee7b7" };
    case "Rejected":
      return { backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2", borderColor: isDark ? "#dc2626" : "#fca5a5" };
    default:
      return { backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7", borderColor: isDark ? "#d97706" : "#fcd34d" };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controlsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 16, // Added spacing as requested
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "500",
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabsScrollContent: {
    gap: 8,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    height: 38,
  },
  tabText: {
    fontWeight: "600",
    fontSize: 13,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: "center",
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 20,
    padding: 0,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  idText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    width: '100%',
    opacity: 0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.02)'
  },
  statItem: {
    marginRight: 16,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    marginRight: 16,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  reviewBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
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
    backgroundColor: "#3b82f6",
  },
  footerText: {
    fontWeight: "600",
    fontSize: 14,
  },
  empty: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyIcon: {
    marginBottom: 16,
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
});
