import { useTheme } from "@/context/ThemeContext";
import { getMyScholarships, getScholarshipApplicants } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  ListRenderItem,
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
  course: string;
  income: number;
  status: ApplicantStatus;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isMultiSelect = selectedIds.length > 0;

  const [scholarshipId, setScholarshipId] = useState<string | null>((params.scholarship_id as string) || null);
  const [allApplicants, setAllApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Fetch scholarships if no ID provided
  const fetchScholarshipsAndSelectOne = async () => {
    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;
      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) return;

      const response = await getMyScholarships(token, { per_page: 10, status: 'active' }); // Default to active?
      if (response.success && response.data?.data && response.data.data.length > 0) {
        setScholarshipId(String(response.data.data[0].id));
      } else {
        // Try fetching any status if no active ones
        const responseAll = await getMyScholarships(token, { per_page: 10 });
        if (responseAll.success && responseAll.data?.data && responseAll.data.data.length > 0) {
          setScholarshipId(String(responseAll.data.data[0].id));
        }
      }
    } catch (error) {
      console.error("Error fetching scholarships:", error);
    }
  };

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
        const newApplicants = response.data.applicants.map((app: any) => ({
          id: String(app.id),
          name: app.user?.fullname || `${app.user?.firstname} ${app.user?.lastname}`,
          course: app.application_text || "N/A", // Using application_text as placeholder for course/details
          income: 0, // API doesn't seem to return income in list, maybe in details
          status: app.status ? (app.status.charAt(0).toUpperCase() + app.status.slice(1)) : "Pending"
        }));

        if (reset) {
          setAllApplicants(newApplicants);
        } else {
          setAllApplicants(prev => [...prev, ...newApplicants]);
        }

        // Check pagination
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
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!scholarshipId && !params.scholarship_id) {
        fetchScholarshipsAndSelectOne();
      } else if (params.scholarship_id && scholarshipId !== params.scholarship_id) {
        setScholarshipId(params.scholarship_id as string);
      }
    }, [params.scholarship_id])
  );

  useFocusEffect(
    useCallback(() => {
      if (scholarshipId) {
        fetchApplicants(true);
      }
    }, [scholarshipId, activeTab]) // Refetch when tab changes too? Or handle client side filtering? 
    // API supports status filtering. Using API filtering might be better for pagination.
    // The current UI kept "All" and filtered client side. But if we paginating, client side filtering on partial data is wrong.
    // Let's rely on API filtering if activeTab changes.
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = (action: "Approved" | "Rejected") => {
    // In a real app, you would make an API call here
    console.log(`Bulk ${action} for:`, selectedIds);
    // Optimistically update local state for demo purposes
    // setAllApplicants(prev => prev.map(a => selectedIds.includes(a.id) ? {...a, status: action} : a));
    setSelectedIds([]);
  };

  // We are now fetching filtered data from API, so 'filtered' is just allApplicants locally, 
  // optionally filtered by query
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

  // Calculate counts for tabs
  const tabCounts = useMemo(() => {
    return {
      All: allApplicants.length,
      Pending: allApplicants.filter((a) => a.status === "Pending").length,
      Approved: allApplicants.filter((a) => a.status === "Approved").length,
      Rejected: allApplicants.filter((a) => a.status === "Rejected").length,
    };
  }, [allApplicants]);

  const renderItem: ListRenderItem<Applicant> = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => toggleSelection(item.id)}
        onPress={() => {
          if (isMultiSelect) {
            toggleSelection(item.id);
          } else {
            // router.push("/(dashboard)/provider/applicant-details"); // Optionally navigate here if not clicking the button
          }
        }}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : colors.border },
          isSelected && { borderWidth: 2, borderColor: colors.primary, backgroundColor: isDark ? "rgba(99, 102, 241, 0.1)" : "#eff6ff" }
        ]}
      >
        <TouchableOpacity
          onPress={() => toggleSelection(item.id)}
          style={{ paddingRight: 12, justifyContent: 'center' }}
        >
          <View style={[
            styles.checkbox,
            {
              backgroundColor: isSelected ? colors.primary : "transparent",
              borderColor: isSelected ? colors.primary : colors.textSecondary
            }
          ]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>

        <View style={styles.cardLeft}>
          <View style={styles.avatarContainer}>
            {isSelected ? (
              <View style={[styles.avatar, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                <Ionicons name="checkmark" size={24} color="#fff" />
              </View>
            ) : (
              <View style={[styles.avatar, getAvatarStyle(item.status, isDark)]}>
                <Text style={[styles.avatarText, { color: isDark ? colors.text : "#1a1a1a" }]}>{item.name.charAt(0)}</Text>
              </View>
            )}
            {!isSelected && (
              <View
                style={[
                  styles.statusIndicator,
                  getStatusIndicatorStyle(item.status),
                  { borderColor: colors.card }
                ]}
              />
            )}
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.nameSection}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.idText, { color: colors.textSecondary }]}>ID: {item.id}</Text>
            </View>
            <View style={[styles.statusBadge, getStatusStyle(item.status, isDark)]}>
              <View style={[styles.statusDot, getStatusDotStyle(item.status)]} />
              <Text style={[styles.statusText, getStatusTextStyle(item.status, isDark)]}>
                {item.status}
              </Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.infoIconContainer, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.2)" : "#eef2ff" }]}>
                <Ionicons name="school" size={18} color={isDark ? "#818cf8" : "#6366f1"} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Course</Text>
                <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                  {item.course}
                </Text>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <View
                style={[styles.infoIconContainer, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#ecfdf5" }]}
              >
                <Ionicons name="wallet" size={18} color={isDark ? "#34d399" : "#10b981"} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Income</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatCurrency(item.income)}
                </Text>
              </View>
            </View>
          </View>

          {!isMultiSelect && (
            <TouchableOpacity
              style={[styles.viewDetailsBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.7}
              onPress={() => router.push("/(dashboard)/provider/applicant-details")}
            >
              <Text style={styles.viewDetailsText}>View Full Application</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader title="Applicants" />

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder="Search applicants by name..."
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

      {/* Select All Row */}
      <View style={styles.selectionRow}>
        <TouchableOpacity
          style={styles.selectAllBtn}
          onPress={() => {
            if (selectedIds.length === filtered.length && filtered.length > 0) {
              setSelectedIds([]);
            } else {
              setSelectedIds(filtered.map(a => a.id));
            }
          }}
        >
          <View style={[
            styles.checkbox,
            {
              backgroundColor: selectedIds.length === filtered.length && filtered.length > 0 ? colors.primary : "transparent",
              borderColor: selectedIds.length === filtered.length && filtered.length > 0 ? colors.primary : colors.textSecondary
            }
          ]}>
            {selectedIds.length === filtered.length && filtered.length > 0 && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={[styles.selectAllText, { color: colors.text }]}>
            Select All ({filtered.length})
          </Text>
        </TouchableOpacity>

        {selectedIds.length > 0 && (
          <Text style={{ color: colors.primary, fontWeight: '600' }}>
            {selectedIds.length} Selected
          </Text>
        )}
      </View>

      {/* Filter Tabs */}
      <FlatList
        horizontal
        data={TABS}
        contentContainerStyle={styles.tabsScrollContent}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const count = tabCounts[item.key as keyof typeof tabCounts];

          return (
            <TouchableOpacity
              style={[
                styles.tabChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                activeTab === item.key && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => {
                setActiveTab(item.key);
                setPage(1);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: colors.textSecondary },
                  activeTab === item.key && { color: "#fff" }
                ]}
              >
                {item.label}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: colors.surface },
                  activeTab === item.key && { backgroundColor: "rgba(255,255,255,0.2)" }
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    { color: colors.textSecondary },
                    activeTab === item.key && { color: "#fff" }
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Results Count */}
      <View style={styles.resultsRow}>
        <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
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
        }}
        ListFooterComponent={
          paginated.length < filtered.length ? (
            <View style={styles.footerLoader}>
              <View style={styles.loaderDot} />
              <Text style={styles.footerText}>Loading more applicants...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="folder-open-outline" size={64} color={isDark ? colors.border : "#d1d5db"} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No applicants found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Try adjusting your search or filter criteria
            </Text>
          </View>
        }
      />


      {isMultiSelect && (
        <View style={[styles.bulkActionBar, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: 20 }]}>
          <View style={styles.bulkActionHeader}>
            <Text style={[styles.bulkActionTitle, { color: colors.text }]}>{selectedIds.length} Selected</Text>
            <TouchableOpacity onPress={() => setSelectedIds([])}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bulkActionButtons}>
            <TouchableOpacity
              style={[styles.bulkBtn, { backgroundColor: "#10b981" }]}
              onPress={() => handleBulkAction("Approved")}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.bulkBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkBtn, { backgroundColor: "#ef4444" }]}
              onPress={() => handleBulkAction("Rejected")}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.bulkBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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

function getStatusDotStyle(status: ApplicantStatus) {
  switch (status) {
    case "Approved":
      return { backgroundColor: "#10b981" };
    case "Rejected":
      return { backgroundColor: "#ef4444" };
    default:
      return { backgroundColor: "#f59e0b" };
  }
}

function getStatusIndicatorStyle(status: ApplicantStatus) {
  switch (status) {
    case "Approved":
      return { backgroundColor: "#10b981" };
    case "Rejected":
      return { backgroundColor: "#ef4444" };
    default:
      return { backgroundColor: "#f59e0b" };
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 2,
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
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    marginRight: 10,
    height: 40,
  },
  tabText: {
    fontWeight: "700",
    fontSize: 13,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 22,
    alignItems: "center",
  },
  countText: {
    fontSize: 11,
    fontWeight: "800",
  },
  resultsRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardLeft: {
    marginRight: 14,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
  },
  statusIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  nameSection: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 2,
  },
  idText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  infoCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 9,
    borderRadius: 12,
    gap: 9,
  },
  infoIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "800",
  },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  viewDetailsText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
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
  bulkActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 100,
  },
  bulkActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulkActionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  bulkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  bulkBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  selectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectAllText: {
    fontWeight: '600',
    fontSize: 14,
  }
});
