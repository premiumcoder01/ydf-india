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

  const renderItem: ListRenderItem<Applicant> = ({ item }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          router.push({
            pathname: "/(dashboard)/provider/applicant-details",
            params: { applicant: JSON.stringify(item) }
          });
        }}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {/* Header Section */}
        <View style={styles.cardHeader}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {item.avatarUrl ? (
              <Image
                source={{ uri: item.avatarUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={isDark ? ["#4f46e5", "#6366f1"] : ["#6366f1", "#8b5cf6"]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            {/* Status Indicator */}
            <View style={[styles.statusIndicator, { backgroundColor: statusConfig.color }]} />
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgLight }]}>
                <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>

            {/* Email */}
            {item.email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
            )}

            {/* Student ID */}
            {item.student_id && (
              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  ID: {item.student_id}
                </Text>
              </View>
            )}
          </View>
        </View>


        {/* Details Grid - 2x2 Layout */}
        {(item.major || item.institution || item.gpa || item.submittedAt) && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.compactGrid}>
              {/* Row 1: Major & Institution */}
              <View style={styles.gridRow}>
                {item.major && (
                  <View style={styles.gridItem}>
                    <View style={[styles.gridIcon, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "#eef2ff" }]}>
                      <Ionicons name="book-outline" size={14} color="#6366f1" />
                    </View>
                    <View style={styles.gridContent}>
                      <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>MAJOR</Text>
                      <Text style={[styles.gridValue, { color: colors.text }]} numberOfLines={1}>
                        {item.major}
                      </Text>
                    </View>
                  </View>
                )}
                {item.institution && (
                  <View style={styles.gridItem}>
                    <View style={[styles.gridIcon, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#d1fae5" }]}>
                      <Ionicons name="school-outline" size={14} color="#10b981" />
                    </View>
                    <View style={styles.gridContent}>
                      <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>INSTITUTION</Text>
                      <Text style={[styles.gridValue, { color: colors.text }]} numberOfLines={1}>
                        {item.institution}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Row 2: GPA & Applied */}
              <View style={styles.gridRow}>
                {item.gpa && (
                  <View style={styles.gridItem}>
                    <View style={[styles.gridIcon, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "#fef3c7" }]}>
                      <Ionicons name="trophy-outline" size={14} color="#f59e0b" />
                    </View>
                    <View style={styles.gridContent}>
                      <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>GPA</Text>
                      <Text style={[styles.gridValue, { color: colors.text }]}>
                        {item.gpa}
                      </Text>
                    </View>
                  </View>
                )}
                {item.submittedAt && (
                  <View style={styles.gridItem}>
                    <View style={[styles.gridIcon, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.15)" : "#f3e8ff" }]}>
                      <Ionicons name="calendar-outline" size={14} color="#8b5cf6" />
                    </View>
                    <View style={styles.gridContent}>
                      <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>APPLIED</Text>
                      <Text style={[styles.gridValue, { color: colors.text }]} numberOfLines={1}>
                        {item.submittedAt}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        {/* Footer */}
        <View style={[styles.cardFooter, { backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)" }]}>
          {item.current_year && (
            <View style={styles.footerItem}>
              <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>YEAR</Text>
              <Text style={[styles.footerValue, { color: colors.text }]}>{item.current_year}</Text>
            </View>
          )}
          {item.graduation_date && (
            <View style={styles.footerItem}>
              <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>GRADUATION</Text>
              <Text style={[styles.footerValue, { color: colors.text }]}>{item.graduation_date}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              router.push({
                pathname: "/(dashboard)/provider/applicant-details",
                params: { applicant: JSON.stringify(item) }
              });
            }}
          >
            <Text style={styles.viewButtonText}>View Details</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
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

      {/* Tab Navigation */}
      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          data={TABS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsList}
          renderItem={({ item }) => {
            const count = tabCounts[item.key];
            const isActive = activeTab === item.key;
            return (
              <TouchableOpacity
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive ? colors.primary : "transparent",
                    borderColor: isActive ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => {
                  setActiveTab(item.key);
                  setPage(1);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon as any}
                  size={16}
                  color={isActive ? "#fff" : colors.textSecondary}
                />
                <Text style={[styles.tabText, { color: isActive ? "#fff" : colors.textSecondary }]}>
                  {item.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: isActive ? "rgba(255,255,255,0.25)" : colors.surface }]}>
                    <Text style={[styles.countText, { color: isActive ? "#fff" : colors.textSecondary }]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Results Summary */}
      <View style={styles.summaryContainer}>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          Showing {paginated.length} of {filtered.length} applicant{filtered.length !== 1 ? 's' : ''}
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
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  statusIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "#fff",
  },
  userInfo: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },

  // Divider
  divider: {
    height: 1,
    marginHorizontal: 16,
  },

  // Compact Grid (2x2 Layout)
  compactGrid: {
    padding: 16,
    gap: 12,
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
  },
  gridItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gridIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  gridContent: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: "700",
  },

  // Footer
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  footerItem: {
    gap: 2,
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  footerValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  viewButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },

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
