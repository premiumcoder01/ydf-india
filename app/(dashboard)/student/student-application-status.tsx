import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getMyApplications } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const statusColors = {
  submitted: "#2196F3",
  review: "#FF9800",
  approved: "#4CAF50",
  rejected: "#F44336",
  new: "#2196F3",
  under_review: "#FF9800"
};

const statusIcons = {
  submitted: "paper-plane",
  review: "time",
  approved: "checkmark-circle",
  rejected: "close-circle",
  new: "paper-plane",
  under_review: "time"
};

export default function ApplicationStatusScreen() {
  const { isDark, colors } = useTheme();
  const [selectedYear, setSelectedYear] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [activeApplications, setActiveApplications] = useState<any[]>([]);
  const [pastApplications, setPastApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchApplications = async () => {
    try {
      setLoading(true);
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
      console.log("My Applications Response:", JSON.stringify(response, null, 2));

      if (response.success) {
        // Handle nested data structure: response.data.active and response.data.past
        const responseData = response.data || response;

        // Map active applications
        const mappedActive = (responseData.active || []).map((app: any) => mapApplication(app));
        // Map past applications
        const mappedPast = (responseData.past || []).map((app: any) => mapApplication(app));

        console.log("Mapped Active:", mappedActive.length);
        console.log("Mapped Past:", mappedPast.length);

        setActiveApplications(mappedActive);
        setPastApplications(mappedPast);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      Alert.alert("Error", "Failed to load applications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const mapApplication = (app: any) => {
    let status = app.status || "new";
    let color = statusColors[status as keyof typeof statusColors] || "#666";

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "N/A";
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      } catch (e) {
        return dateStr.split(' ')[0];
      }
    };

    const submittedDate = formatDate(app.submitted_at);
    const updatedDate = formatDate(app.updated_at);

    return {
      id: app.id,
      scholarshipId: app.scholarship_id,
      title: app.scholarship_title || "Scholarship Application",
      shortname: app.scholarship_shortname || "General",
      status: status,
      statusText: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      submittedDate: submittedDate,
      rawDate: app.submitted_at, // Keep raw date for filtering
      updatedDate: updatedDate,
      deadline: app.deadline ? formatDate(app.deadline) : null,
      color: color,
      icon: statusIcons[status as keyof typeof statusIcons] || "document"
    };
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchApplications();
  }, []);

  const allApplications = useMemo(() => [...activeApplications, ...pastApplications], [activeApplications, pastApplications]);

  const years = useMemo(() => {
    const set = new Set<string>();
    allApplications.forEach((a) => {
      // Use rawDate for reliable year extraction
      if (a.rawDate) {
        try {
          const year = new Date(a.rawDate).getFullYear();
          if (!isNaN(year)) {
            set.add(String(year));
          }
        } catch (e) { }
      }
    });
    return ["All", ...Array.from(set).sort((a, b) => Number(b) - Number(a))];
  }, [allApplications]);

  const types = useMemo(() => {
    const set = new Set<string>();
    allApplications.forEach((a) => {
      if (a.shortname) set.add(a.shortname);
    });
    return ["All", ...Array.from(set)];
  }, [allApplications]);

  // Filter Logic
  const filterApplication = (a: any) => {
    let yearOk = true;
    if (selectedYear !== "All") {
      try {
        const year = new Date(a.rawDate).getFullYear();
        yearOk = !isNaN(year) && String(year) === selectedYear;
      } catch (e) {
        yearOk = false;
      }
    }
    const typeOk = selectedType === "All" || a.shortname === selectedType;
    return yearOk && typeOk;
  };

  const filteredActive = useMemo(() => activeApplications.filter(filterApplication), [selectedYear, selectedType, activeApplications]);
  const filteredPast = useMemo(() => pastApplications.filter(filterApplication), [selectedYear, selectedType, pastApplications]);


  const totalCounts = useMemo(() => {
    const all = [...activeApplications, ...pastApplications];
    return {
      total: all.length,
      approved: all.filter((a) => a.status === "approved").length,
      pending: activeApplications.length,
      rejected: all.filter((a) => a.status === "rejected").length,
    };
  }, [activeApplications, pastApplications]);

  const renderApplicationCard = (application: any, isPast: boolean = false) => (
    <TouchableOpacity
      key={application.id}
      style={[styles.applicationCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.8}
      onPress={() => {
        if (application.scholarshipId) {
          router.push({
            pathname: "/(dashboard)/student/student-scholarship-details",
            params: { scholarshipId: application.scholarshipId }
          });
        }
      }}
    >
      <View style={styles.cardInternal}>
        {/* Left Status Stripe */}
        <View style={[styles.statusStripe, { backgroundColor: application.color }]} />

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={[styles.typeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0', flex: 1, marginRight: 8 }]}>
              <Text style={[styles.typeBadgeText, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                {application.shortname}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: application.color + '15', borderColor: application.color + '30' }]}>
              <Text style={[styles.statusPillText, { color: application.color }]}>{application.statusText}</Text>
            </View>
          </View>

          <Text style={[styles.applicationTitle, { color: colors.text }]} numberOfLines={2}>
            {application.title}
          </Text>

          <View style={styles.cardMetaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>Applied: {application.submittedDate}</Text>
            </View>
          </View>

          <View style={[styles.cardActionRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0' }]}>
            <Text style={[styles.viewDetailsText, { color: colors.textSecondary }]}>View Details</Text>
            <TouchableOpacity
              style={[styles.chevronBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }]}
              onPress={() => {
                if (application.scholarshipId) {
                  router.push({
                    pathname: "/(dashboard)/student/student-scholarship-details",
                    params: { scholarshipId: application.scholarshipId }
                  });
                }
              }}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#f2c44d" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#121212" : "#fff"} />
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      <AppHeader title="My Applications" onBack={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading applications...</Text>
          </View>
        ) : (
          <>
            {/* Clean Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{totalCounts.total}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Applications</Text>
                <View style={[styles.statIconAbs, { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.1)' : '#E3F2FD' }]}>
                  <Ionicons name="documents" size={16} color="#2196F3" />
                </View>
              </View>
              <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{totalCounts.approved}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
                <View style={[styles.statIconAbs, { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.1)' : '#E8F5E9' }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                </View>
              </View>
              <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{totalCounts.pending}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
                <View style={[styles.statIconAbs, { backgroundColor: isDark ? 'rgba(255, 152, 0, 0.1)' : '#FFF3E0' }]}>
                  <Ionicons name="time" size={16} color="#FF9800" />
                </View>
              </View>
              <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{totalCounts.rejected}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rejected</Text>
                <View style={[styles.statIconAbs, { backgroundColor: isDark ? 'rgba(244, 67, 54, 0.1)' : '#FFEBEE' }]}>
                  <Ionicons name="close-circle" size={16} color="#F44336" />
                </View>
              </View>
            </View>

            {/* Filter Toggle Chip Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, marginBottom: 20, gap: 10 }}>

              {/* Year Filter Chip */}
              <TouchableOpacity
                onPress={() => setShowFilters(true)}
                style={[styles.filterChip, { backgroundColor: selectedYear !== 'All' ? colors.primary : (isDark ? 'rgba(255,255,255,0.05)' : '#fff'), borderColor: selectedYear !== 'All' ? colors.primary : colors.border }]}
              >
                <Ionicons name="calendar" size={16} color={selectedYear !== 'All' ? '#fff' : colors.textSecondary} />
                <Text style={[styles.filterChipText, { color: selectedYear !== 'All' ? '#fff' : colors.text }]}>
                  {selectedYear === 'All' ? 'Year' : selectedYear}
                </Text>
                <Ionicons name="chevron-down" size={12} color={selectedYear !== 'All' ? '#fff' : colors.textSecondary} />
              </TouchableOpacity>

              {/* Type Filter Chip */}
              <TouchableOpacity
                onPress={() => setShowFilters(true)}
                style={[styles.filterChip, { backgroundColor: selectedType !== 'All' ? colors.primary : (isDark ? 'rgba(255,255,255,0.05)' : '#fff'), borderColor: selectedType !== 'All' ? colors.primary : colors.border }]}
              >
                <Ionicons name="pricetag" size={16} color={selectedType !== 'All' ? '#fff' : colors.textSecondary} />
                <Text style={[styles.filterChipText, { color: selectedType !== 'All' ? '#fff' : colors.text }]} numberOfLines={1}>
                  {selectedType === 'All' ? 'Scholarship Type' : (selectedType.length > 15 ? selectedType.substring(0, 12) + '...' : selectedType)}
                </Text>
                <Ionicons name="chevron-down" size={12} color={selectedType !== 'All' ? '#fff' : colors.textSecondary} />
              </TouchableOpacity>

              {(selectedYear !== 'All' || selectedType !== 'All') && (
                <TouchableOpacity onPress={() => { setSelectedYear('All'); setSelectedType('All'); }} style={styles.clearChip}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>Clear</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Active Applications */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Active ({filteredActive.length})</Text>
              </View>

              {filteredActive.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active applications</Text>
                </View>
              ) : (
                filteredActive.map((app) => renderApplicationCard(app, false))
              )}
            </View>

            {/* Past Applications */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Past ({filteredPast.length})</Text>
              </View>

              {filteredPast.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No past applications</Text>
                </View>
              ) : (
                filteredPast.map((app) => renderApplicationCard(app, true))
              )}
            </View>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      {/* Filter Modal */}
      {
        showFilters && (
          <View style={styles.modalBackdrop}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowFilters(false)} />
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Applications</Text>
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 400 }}>
                {/* Year Filter */}
                <Text style={[styles.filterGroupTitle, { color: colors.textSecondary }]}>Year</Text>
                <View style={styles.chipsContainer}>
                  {years.map(y => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => setSelectedYear(y)}
                      style={[styles.modalChip, selectedYear === y && { backgroundColor: colors.primary }, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.modalChipText, selectedYear === y && { color: '#fff' }, { color: colors.text }]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Type Filter */}
                <Text style={[styles.filterGroupTitle, { color: colors.textSecondary, marginTop: 20 }]}>Scholarship Type</Text>
                <View style={styles.chipsContainer}>
                  {types.map(t => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setSelectedType(t)}
                      style={[styles.modalChip, selectedType === t && { backgroundColor: colors.primary }, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.modalChipText, selectedType === t && { color: '#fff' }, { color: colors.text }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                <TouchableOpacity
                  onPress={() => setShowFilters(false)}
                  style={[styles.applyFilterBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )
      }
    </View >
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  statItem: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statIconAbs: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Filters
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },

  // Sections
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyState: {
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 10,
  },

  // Cards
  applicationCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardInternal: {
    flexDirection: 'row',
  },
  statusStripe: {
    width: 6,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  applicationTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 22,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },

  // Modal
  modalBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  filterGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  modalChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyFilterBtn: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cardActionRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chevronBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
