import { AppHeader, SearchBar } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getMyApplications } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const statusColors = {
  submitted: "#2196F3",
  review: "#FF9800",
  approved: "#4CAF50",
  rejected: "#F44336",
  new: "#2196F3",
  under_review: "#FF9800"
};

export default function ApplicationStatusScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const initialTab = (params.tab as "active" | "past") || "active";
  const [activeTab, setActiveTab] = useState<"active" | "past">(initialTab);
  const [searchQuery, setSearchQuery] = useState((params.status as string) || "");
  const [isFilteredView, setIsFilteredView] = useState(!!params.status);
  const [activeApplications, setActiveApplications] = useState<any[]>([]);
  const [pastApplications, setPastApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isDataLoaded = useRef(false);

  // Sync tab if param changes
  useEffect(() => {
    if (params.tab && (params.tab === "active" || params.tab === "past")) {
      setActiveTab(params.tab as "active" | "past");
    }
    if (params.status) {
      setSearchQuery(params.status as string);
      setIsFilteredView(true);
    }
  }, [params.tab, params.status]);

  const clearFilter = () => {
    setSearchQuery("");
    setIsFilteredView(false);
  };

  // Update data loaded ref
  useEffect(() => {
    if (activeApplications.length > 0 || pastApplications.length > 0) {
      isDataLoaded.current = true;
    }
  }, [activeApplications, pastApplications]);

  const fetchApplications = useCallback(async () => {
    try {
      if (!isDataLoaded.current) {
        setLoading(true);
      }
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) {
        setLoading(false);
        return;
      }

      const authData = JSON.parse(authDataString);
      const token = authData?.token;

      if (!token) {
        setLoading(false);
        return;
      }

      const response = await getMyApplications(token);

      if (response.success) {
        const responseData = response.data || response;
        const mappedActive = (responseData.active || []).map((app: any) => mapApplication(app));
        const mappedPast = (responseData.past || []).map((app: any) => mapApplication(app));

        setActiveApplications(mappedActive);
        setPastApplications(mappedPast);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const mapApplication = (app: any) => {
    let status = app.status || "new";
    let color = statusColors[status as keyof typeof statusColors] || "#666";

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "N/A";
      try {
        const date = new Date(dateStr);
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
      } catch (e) {
        return dateStr.split(' ')[0];
      }
    };

    return {
      id: app.id,
      scholarshipId: app.scholarship_id,
      title: app.scholarship_title || "Scholarship Application",
      shortname: app.scholarship_shortname || "General",
      status: status,
      statusText: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      submittedDate: formatDate(app.submitted_at),
      updatedDate: formatDate(app.updated_at),
      color: color
    };
  };

  useFocusEffect(
    useCallback(() => {
      fetchApplications();
    }, [fetchApplications])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApplications();
  }, [fetchApplications]);

  const totalCounts = useMemo(() => {
    const all = [...activeApplications, ...pastApplications];
    return {
      total: all.length,
      approved: all.filter((a) => a.status === "approved").length,
      pending: activeApplications.length,
      rejected: all.filter((a) => a.status === "rejected").length,
    };
  }, [activeApplications, pastApplications]);

  const currentApplications = activeTab === "active" ? activeApplications : pastApplications;

  const filteredApplications = useMemo(() => {
    const rawList = isFilteredView ? [...activeApplications, ...pastApplications] : currentApplications;
    if (!searchQuery.trim()) return rawList;
    const query = searchQuery.toLowerCase();
    return rawList.filter(app =>
      app.title.toLowerCase().includes(query) ||
      app.shortname.toLowerCase().includes(query) ||
      app.statusText.toLowerCase().includes(query)
    );
  }, [activeApplications, pastApplications, currentApplications, searchQuery, isFilteredView]);

  const renderApplicationCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.applicationCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.7}
      onPress={() => {
        if (item.scholarshipId) {
          router.push({
            pathname: "/(dashboard)/student/student-scholarship-details",
            params: { scholarshipId: item.scholarshipId }
          });
        }
      }}
    >
      <View style={[styles.statusStripe, { backgroundColor: item.color }]} />

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.shortname, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.shortname.toUpperCase()}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: item.color + '15' }]}>
            <Text style={[styles.statusText, { color: item.color }]}>{item.statusText.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            Applied: {item.submittedDate}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.viewDetails, { color: colors.textSecondary }]}>View Details</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#fff" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={isDark ? ["#121212", "#1a1a1a"] : ["#fff", "#f8f8f8"]}
        style={styles.background}
      />

      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
        <AppHeader
          title={isFilteredView ? `${searchQuery} Applications` : "My Applications"}
          onBack={() => {
            if (isFilteredView) {
              clearFilter();
            } else {
              router.back();
            }
          }}
        />

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={(t) => {
              setSearchQuery(t);
              if (!t) setIsFilteredView(false);
            }}
            onClear={clearFilter}
            placeholder="Search applications..."
          />
        </View>

        {/* Tabs - Hidden in Filter View */}
        {!isFilteredView ? (
          <View style={[styles.tabsContainer, { backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5" }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "active" && styles.activeTab,
                activeTab === "active" && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveTab("active")}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === "active" ? "#fff" : colors.textSecondary }
              ]}>
                Active ({activeApplications.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "past" && styles.activeTab,
                activeTab === "past" && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveTab("past")}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === "past" ? "#fff" : colors.textSecondary }
              ]}>
                Past ({pastApplications.length})
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.filterModeIndicator}>
            <View style={[styles.filterLabel, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="filter" size={14} color={colors.primary} />
              <Text style={[styles.filterText, { color: colors.primary }]}>Showing results for "{searchQuery}"</Text>
            </View>
            <TouchableOpacity onPress={clearFilter} style={styles.clearFilterButton}>
              <Text style={[styles.clearFilterText, { color: colors.textSecondary }]}>Show All</Text>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Application List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading applications...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredApplications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderApplicationCard}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? "No applications found" : `No ${activeTab} applications`}
              </Text>
              {searchQuery && (
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Try adjusting your search
                </Text>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  fixedHeader: {
    backgroundColor: "transparent",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    padding: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  applicationCard: {
    flexDirection: "row",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statusStripe: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  shortname: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 20,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  viewDetails: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  filterModeIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  filterLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flex: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
  },
  clearFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
