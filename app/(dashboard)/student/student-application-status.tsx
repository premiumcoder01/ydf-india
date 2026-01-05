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
  new: "#2196F3"
};

export default function ApplicationStatusScreen() {
  const { isDark, colors } = useTheme();
  const [selectedYear, setSelectedYear] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [applications, setApplications] = useState<any[]>([]);
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
      console.log("My Applications Response:", JSON.stringify(response));

      if (response.success && response.data?.data) {
        // Map API data to UI structur
        const mappedApps = response.data.data.map((app: any) => {
          let status = app.status || "submitted";
          if (status === "new") status = "submitted";

          let color = statusColors[status as keyof typeof statusColors] || "#666";
          if (app.status === "under_review") {
            color = statusColors.review;
            status = "under_review";
          }

          // Format date helper
          const formatDate = (dateStr: string) => {
            if (!dateStr) return "N/A";
            try {
              return dateStr.split(' ')[0];
            } catch (e) {
              return dateStr;
            }
          };

          const submittedDate = formatDate(app.submitted_at);

          // Construct a default timeline if missing (or use API provided one)
          const timeline = app.timeline || [
            {
              date: submittedDate !== "N/A" ? submittedDate : "Recently",
              status: "submitted",
              title: "Application Submitted",
              description: "Your application has been successfully submitted"
            }
          ];

          return {
            id: app.id,
            title: app.scholarship_title || "Scholarship Application",
            amount: app.amount || "N/A",
            status: status,
            statusText: app.status ? (app.status.charAt(0).toUpperCase() + app.status.slice(1)).replace('_', ' ') : "Submitted",
            submittedDate: submittedDate,
            deadline: app.deadline ? formatDate(app.deadline) : "N/A",
            type: app.scholarship_shortname || "General",
            color: color,
            timeline: timeline
          };
        });
        setApplications(mappedApps);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      Alert.alert("Error", "Failed to load applications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchApplications();
  }, []);

  const years = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => {
      if (a.submittedDate && a.submittedDate !== "N/A") {
        set.add(String(new Date(a.submittedDate).getFullYear()));
      }
    });
    return ["All", ...Array.from(set).sort((a, b) => Number(b) - Number(a))];
  }, [applications]);

  const types = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => set.add(a.type));
    return ["All", ...Array.from(set)];
  }, [applications]);

  const filtered = useMemo(() => {
    return applications.filter((a) => {
      let yearOk = true;
      if (selectedYear !== "All") {
        yearOk = a.submittedDate && a.submittedDate !== "N/A" && String(new Date(a.submittedDate).getFullYear()) === selectedYear;
      }
      const typeOk = selectedType === "All" || a.type === selectedType;
      return yearOk && typeOk;
    });
  }, [selectedYear, selectedType, applications]);

  const activeApps = useMemo(() => filtered.filter((a) => a.status === "under_review" || a.status === "submitted" || a.status === "new"), [filtered]);
  const pastApps = useMemo(() => filtered.filter((a) => a.status === "approved" || a.status === "rejected"), [filtered]);

  const totalCounts = useMemo(() => {
    return {
      total: filtered.length,
      approved: filtered.filter((a) => a.status === "approved").length,
      underReview: filtered.filter((a) => a.status === "under_review" || a.status === "submitted" || a.status === "new").length,
      rejected: filtered.filter((a) => a.status === "rejected").length,
    };
  }, [filtered]);



  const buildDecisionHtml = (a: any) => `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: -apple-system, Roboto, Arial, sans-serif; padding: 24px; color: #333; }
          .card { border: 1px solid #eee; border-radius: 12px; padding: 20px; }
          h1 { margin: 0 0 8px; font-size: 22px; }
          p { line-height: 1.5; }
          .status { margin-top: 12px; font-weight: 800; color: ${a.color}; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Decision Letter</h1>
          <p>Scholarship: <strong>${a.title}</strong></p>
          <p>Amount: ${a.amount}</p>
          <p class="status">Status: ${a.statusText}</p>
          <p>
            ${a.status === "approved"
      ? "Congratulations! Your application has been approved. Please review the next steps in your dashboard."
      : a.status === "rejected"
        ? "We appreciate your interest. Unfortunately, your application was not selected at this time."
        : "Your application is currently under review."
    }
          </p>
        </div>
      </body>
    </html>
  `;



  const handleViewDecision = async (a: any) => {
    try {
      const Print = await import("expo-print");
      await Print.printAsync({ html: buildDecisionHtml(a) });
    } catch (e) {
      Alert.alert("Unavailable", "PDF viewer is not available on this build.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#f2c44d" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#121212" : "#fff"} />
      {/* Gradient Background */}
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      {/* App Header outside scroll */}
      <AppHeader title="Application Status" onBack={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Filters */}
            <View style={styles.filtersContainer}>
              <View style={styles.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {years.map((y) => (
                    <TouchableOpacity
                      key={`year-${y}`}
                      onPress={() => setSelectedYear(y)}
                      style={[styles.chip, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f8f8", borderColor: colors.border }, selectedYear === y && [styles.chipActive, { backgroundColor: colors.primary, borderColor: colors.primary }]]}
                    >
                      <Ionicons name="calendar-outline" size={14} color={selectedYear === y ? "#fff" : colors.textSecondary} />
                      <Text style={[styles.chipText, { color: colors.textSecondary }, selectedYear === y && styles.chipTextActive]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {types.map((t) => (
                    <TouchableOpacity
                      key={`type-${t}`}
                      onPress={() => setSelectedType(t)}
                      style={[styles.chip, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f8f8", borderColor: colors.border }, selectedType === t && [styles.chipActive, { backgroundColor: colors.primary, borderColor: colors.primary }]]}
                    >
                      <Ionicons name="pricetag-outline" size={14} color={selectedType === t ? "#fff" : colors.textSecondary} />
                      <Text style={[styles.chipText, { color: colors.textSecondary }, selectedType === t && styles.chipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {(selectedYear !== "All" || selectedType !== "All") && (
                <TouchableOpacity onPress={() => { setSelectedYear("All"); setSelectedType("All"); }} style={[styles.clearFiltersBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.clearFiltersText, { color: colors.textSecondary }]}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Summary Stats */}
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{totalCounts.total}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Applications</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{totalCounts.approved}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{totalCounts.underReview}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Under Review</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{totalCounts.rejected}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rejected</Text>
              </View>
            </View>
            {/* Active Applications */}
            <View style={styles.applicationsContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Applications</Text>
              {activeApps.length === 0 && (
                <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active applications</Text>
                </View>
              )}
              {activeApps.map((application) => (
                <View key={application.id} style={[styles.applicationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.applicationHeader}>
                    <View style={styles.applicationInfo}>
                      <Text style={[styles.applicationTitle, { color: colors.text }]}>{application.title}</Text>
                      <Text style={styles.applicationAmount}>{application.amount}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: application.color + '20' }]}>
                      <Text style={[styles.statusText, { color: application.color }]}>
                        {application.statusText}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.applicationDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>Submitted: {application.submittedDate}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>Deadline: {application.deadline}</Text>
                    </View>
                  </View>

                  {/* Timeline */}
                  <View style={styles.timelineContainer}>
                    <Text style={[styles.timelineTitle, { color: colors.text }]}>Application Timeline</Text>
                    {application.timeline.map((event: any, index: number) => (
                      <View key={index} style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0" }]}>
                          <View style={[
                            styles.timelineDotInner,
                            { backgroundColor: statusColors[event.status as keyof typeof statusColors] || '#ccc' }
                          ]} />
                        </View>
                        <View style={styles.timelineContent}>
                          <Text style={[styles.timelineEventTitle, { color: colors.text }]}>{event.title}</Text>
                          <Text style={[styles.timelineEventDescription, { color: colors.textSecondary }]}>{event.description}</Text>
                          <Text style={styles.timelineEventDate}>{event.date}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* <View style={styles.applicationActions}>

                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f9fa" }]} onPress={() => router.push({ pathname: "/(dashboard)/student/student-scholarship-details", params: { scholarshipId: application.id } })}>
                      <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.actionText, { color: colors.textSecondary }]}>View Details</Text>
                    </TouchableOpacity>
                  </View> */}
                </View>
              ))}
            </View>

            {/* Past Applications */}
            <View style={styles.applicationsContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Past Applications</Text>
              {pastApps.length === 0 && (
                <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No past applications</Text>
                </View>
              )}
              {pastApps.map((application) => (
                <View key={application.id} style={[styles.applicationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.applicationHeader}>
                    <View style={styles.applicationInfo}>
                      <Text style={[styles.applicationTitle, { color: colors.text }]}>{application.title}</Text>
                      <Text style={styles.applicationAmount}>{application.amount}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: application.color + '20' }]}>
                      <Text style={[styles.statusText, { color: application.color }]}>
                        {application.statusText}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.applicationDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>Submitted: {application.submittedDate}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>Deadline: {application.deadline}</Text>
                    </View>
                  </View>

                  {/* Timeline */}
                  <View style={styles.timelineContainer}>
                    <Text style={[styles.timelineTitle, { color: colors.text }]}>Application Timeline</Text>
                    {application.timeline.map((event: any, index: number) => (
                      <View key={index} style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0" }]}>
                          <View style={[
                            styles.timelineDotInner,
                            { backgroundColor: statusColors[event.status as keyof typeof statusColors] || "#ccc" }
                          ]} />
                        </View>
                        <View style={styles.timelineContent}>
                          <Text style={[styles.timelineEventTitle, { color: colors.text }]}>{event.title}</Text>
                          <Text style={[styles.timelineEventDescription, { color: colors.textSecondary }]}>{event.description}</Text>
                          <Text style={styles.timelineEventDate}>{event.date}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  <View style={styles.applicationActions}>
                    {application.status === 'approved' && (
                      <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f9fa" }]} onPress={() => handleViewDecision(application)}>
                        <Ionicons name="document-text-outline" size={16} color="#4CAF50" />
                        <Text style={[styles.actionText, { color: "#4CAF50" }]}>View Decision Letter</Text>
                      </TouchableOpacity>
                    )}
                    {application.status === 'rejected' && (
                      <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f9fa" }]} onPress={() => handleViewDecision(application)}>
                        <Ionicons name="document-text-outline" size={16} color="#F44336" />
                        <Text style={[styles.actionText, { color: "#F44336" }]}>View Decision Letter</Text>
                      </TouchableOpacity>
                    )}

                  </View>
                </View>
              ))}
            </View>
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
  filtersContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8f8f8",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: "#333",
    borderColor: "#333",
  },
  chipText: {
    fontSize: 12,
    color: "#666",
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clearFiltersText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#333",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    lineHeight: 12,
  },
  applicationsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
    color: "#666",
  },
  applicationCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  applicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  applicationInfo: {
    flex: 1,
    marginRight: 12,
  },
  applicationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  applicationAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4CAF50",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  applicationDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  timelineContainer: {
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 12,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineEventTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  timelineEventDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  timelineEventDate: {
    fontSize: 11,
    color: "#999",
  },
  applicationActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  actionText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
});


