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
      if (a.submittedDate && a.submittedDate !== "N/A") {
        try {
          set.add(String(new Date(a.submittedDate).getFullYear()));
        } catch (e) { }
      }
    });
    return ["All", ...Array.from(set).sort((a, b) => Number(b) - Number(a))];
  }, [allApplications]);

  const types = useMemo(() => {
    const set = new Set<string>();
    allApplications.forEach((a) => set.add(a.shortname));
    return ["All", ...Array.from(set)];
  }, [allApplications]);

  const filteredActive = useMemo(() => {
    return activeApplications.filter((a) => {
      let yearOk = true;
      if (selectedYear !== "All") {
        try {
          yearOk = a.submittedDate && a.submittedDate !== "N/A" && String(new Date(a.submittedDate).getFullYear()) === selectedYear;
        } catch (e) {
          yearOk = false;
        }
      }
      const typeOk = selectedType === "All" || a.shortname === selectedType;
      return yearOk && typeOk;
    });
  }, [selectedYear, selectedType, activeApplications]);

  const filteredPast = useMemo(() => {
    return pastApplications.filter((a) => {
      let yearOk = true;
      if (selectedYear !== "All") {
        try {
          yearOk = a.submittedDate && a.submittedDate !== "N/A" && String(new Date(a.submittedDate).getFullYear()) === selectedYear;
        } catch (e) {
          yearOk = false;
        }
      }
      const typeOk = selectedType === "All" || a.shortname === selectedType;
      return yearOk && typeOk;
    });
  }, [selectedYear, selectedType, pastApplications]);

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
      activeOpacity={0.7}
      onPress={() => {
        if (application.scholarshipId) {
          router.push({
            pathname: "/(dashboard)/student/student-scholarship-details",
            params: { scholarshipId: application.scholarshipId }
          });
        }
      }}
    >
      {/* Status Indicator Bar */}
      <View style={[styles.statusBar, { backgroundColor: application.color }]} />

      {/* Card Content */}
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: application.color + '15' }]}>
            <Ionicons name={application.icon as any} size={24} color={application.color} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.applicationTitle, { color: colors.text }]} numberOfLines={2}>
              {application.title}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="pricetag-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {application.shortname}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: application.color + '20', borderColor: application.color + '40' }]}>
            <Text style={[styles.statusText, { color: application.color }]}>
              {application.statusText}
            </Text>
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <View style={[styles.detailIconCircle, { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.15)' : '#E3F2FD' }]}>
              <Ionicons name="calendar-outline" size={14} color="#2196F3" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Submitted</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{application.submittedDate}</Text>
            </View>
          </View>

          {application.updatedDate && application.updatedDate !== application.submittedDate && (
            <View style={styles.detailItem}>
              <View style={[styles.detailIconCircle, { backgroundColor: isDark ? 'rgba(156, 39, 176, 0.15)' : '#F3E5F5' }]}>
                <Ionicons name="sync-outline" size={14} color="#9C27B0" />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Updated</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{application.updatedDate}</Text>
              </View>
            </View>
          )}

          {application.deadline && (
            <View style={styles.detailItem}>
              <View style={[styles.detailIconCircle, { backgroundColor: isDark ? 'rgba(255, 152, 0, 0.15)' : '#FFF3E0' }]}>
                <Ionicons name="time-outline" size={14} color="#FF9800" />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Deadline</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{application.deadline}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Footer */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5' }]}
            onPress={() => {
              if (application.scholarshipId) {
                router.push({
                  pathname: "/(dashboard)/student/student-scholarship-details",
                  params: { scholarshipId: application.scholarshipId }
                });
              }
            }}
          >
            <Ionicons name="eye-outline" size={16} color={colors.text} />
            <Text style={[styles.viewButtonText, { color: colors.text }]}>View Details</Text>
          </TouchableOpacity>

          {isPast && (
            <View style={[styles.completedBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5' }]}>
              <Ionicons name="checkmark-done" size={14} color={colors.textSecondary} />
              <Text style={[styles.completedText, { color: colors.textSecondary }]}>Completed</Text>
            </View>
          )}
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
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.15)' : '#E3F2FD' }]}>
                  <Ionicons name="documents-outline" size={20} color="#2196F3" />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{totalCounts.total}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.15)' : '#E8F5E9' }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{totalCounts.approved}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: isDark ? 'rgba(255, 152, 0, 0.15)' : '#FFF3E0' }]}>
                  <Ionicons name="time-outline" size={20} color="#FF9800" />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{totalCounts.pending}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: isDark ? 'rgba(244, 67, 54, 0.15)' : '#FFEBEE' }]}>
                  <Ionicons name="close-circle-outline" size={20} color="#F44336" />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{totalCounts.rejected}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rejected</Text>
              </View>
            </View>

            {/* Filters */}
            {(years.length > 1 || types.length > 1) && (
              <View style={styles.filtersContainer}>
                {years.length > 1 && (
                  <View style={styles.filterRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                      {years.map((y) => (
                        <TouchableOpacity
                          key={`year-${y}`}
                          onPress={() => setSelectedYear(y)}
                          style={[
                            styles.chip,
                            { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff", borderColor: colors.border },
                            selectedYear === y && [styles.chipActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                          ]}
                        >
                          <Ionicons name="calendar-outline" size={14} color={selectedYear === y ? "#fff" : colors.textSecondary} />
                          <Text style={[styles.chipText, { color: colors.textSecondary }, selectedYear === y && styles.chipTextActive]}>{y}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {types.length > 1 && (
                  <View style={styles.filterRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                      {types.map((t) => (
                        <TouchableOpacity
                          key={`type-${t}`}
                          onPress={() => setSelectedType(t)}
                          style={[
                            styles.chip,
                            { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff", borderColor: colors.border },
                            selectedType === t && [styles.chipActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                          ]}
                        >
                          <Ionicons name="pricetag-outline" size={14} color={selectedType === t ? "#fff" : colors.textSecondary} />
                          <Text style={[styles.chipText, { color: colors.textSecondary }, selectedType === t && styles.chipTextActive]}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {(selectedYear !== "All" || selectedType !== "All") && (
                  <TouchableOpacity
                    onPress={() => { setSelectedYear("All"); setSelectedType("All"); }}
                    style={[styles.clearFiltersBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.clearFiltersText, { color: colors.textSecondary }]}>Clear filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Active Applications */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconCircle, { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.15)' : '#E3F2FD' }]}>
                  <Ionicons name="rocket-outline" size={18} color="#2196F3" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Applications</Text>
                <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.15)' : '#E3F2FD' }]}>
                  <Text style={[styles.countText, { color: "#2196F3" }]}>{filteredActive.length}</Text>
                </View>
              </View>

              {filteredActive.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active applications</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Your pending applications will appear here</Text>
                </View>
              ) : (
                filteredActive.map((app) => renderApplicationCard(app, false))
              )}
            </View>

            {/* Past Applications */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconCircle, { backgroundColor: isDark ? 'rgba(156, 39, 176, 0.15)' : '#F3E5F5' }]}>
                  <Ionicons name="archive-outline" size={18} color="#9C27B0" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Past Applications</Text>
                <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(156, 39, 176, 0.15)' : '#F3E5F5' }]}>
                  <Text style={[styles.countText, { color: "#9C27B0" }]}>{filteredPast.length}</Text>
                </View>
              </View>

              {filteredPast.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="folder-open-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No past applications</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Completed applications will appear here</Text>
                </View>
              ) : (
                filteredPast.map((app) => renderApplicationCard(app, true))
              )}
            </View>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
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
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 8,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    gap: 6,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterRow: {
    marginBottom: 8,
  },
  chipsRow: {
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipActive: {},
  chipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fff",
  },
  clearFiltersBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearFiltersText: {
    fontWeight: "700",
    fontSize: 13,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  countText: {
    fontSize: 14,
    fontWeight: "800",
  },
  emptyState: {
    borderRadius: 16,
    padding: 40,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.7,
  },
  applicationCard: {
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statusBar: {
    height: 4,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  applicationTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
