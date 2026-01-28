import { HelloWave } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getReviewerDashboardStats, getReviewerProgress, getReviewerRecentApplications, getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ApplicationItem = {
  id: string;
  scholarshipTitle: string;
  studentName: string;
  status: string;
};

type DashboardStats = {
  total_applications_assigned: number;
  pending_review: number;
  approved: number;
  rejected: number;
  bookmarked: number;
  verified_today: number;
  verified_this_week: number;
};

type ReviewerProgress = {
  total_assigned: number;
  reviewed: number;
  pending: number;
  progress_percentage: number;
  current_stage: string;
};

export default function ApplicationReviewerDashboard() {
  const { isDark, colors } = useTheme();
  const inset = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert("Exit App", "Are you sure you want to exit?", [
          {
            text: "Cancel",
            onPress: () => null,
            style: "cancel"
          },
          { text: "YES", onPress: () => BackHandler.exitApp() }
        ]);
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);

      return () => subscription.remove();
    }, [])
  );

  // Reviewer state
  const [reviewerName, setReviewerName] = useState("Reviewer");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    total_applications_assigned: 0,
    pending_review: 0,
    approved: 0,
    rejected: 0,
    bookmarked: 0,
    verified_today: 0,
    verified_this_week: 0,
  });

  const [progress, setProgress] = useState<ReviewerProgress>({
    total_assigned: 0,
    reviewed: 0,
    pending: 0,
    progress_percentage: 0,
    current_stage: "Loading...",
  });

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;

      const authData = JSON.parse(authDataString);
      const token = authData?.token;

      if (!token) return;

      // Fetch Profile, Stats, Recent Apps, and Progress in parallel
      const [profileRes, statsRes, recentAppsRes, progressRes] = await Promise.all([
        getUserProfile(token),
        getReviewerDashboardStats(token),
        getReviewerRecentApplications(token, 5),
        getReviewerProgress(token)
      ]);

      // Update Profile
      if (profileRes.success && profileRes.data?.user) {
        const user = profileRes.data.user;
        const name = user.fullname ||
          `${user.firstname || ""} ${user.lastname || ""}`.trim() ||
          "Reviewer";
        setReviewerName(name);

        if (user.profileimageurl) {
          setProfilePhotoUrl(user.profileimageurl);
        }
      } else {
        // Fallback to cached profile if available
        if (authData?.user) {
          const user = authData.user;
          const name = user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Reviewer";
          setReviewerName(name);
          if (user.profileimageurl) {
            setProfilePhotoUrl(user.profileimageurl);
          }
        }
      }

      // Update Stats
      if (statsRes.success && statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }

      // Update Recent Applications
      if (recentAppsRes.success && recentAppsRes.data && Array.isArray(recentAppsRes.data.applications)) {
        const mappedApps = recentAppsRes.data.applications.map((app: any) => ({
          id: String(app.id),
          scholarshipTitle: app.scholarship?.name || "Unknown Scholarship",
          studentName: app.user?.fullname || "Unknown Student",
          status: app.status ? app.status.charAt(0).toUpperCase() + app.status.slice(1) : "Unknown"
        }));
        setRecentApplications(mappedApps);
      }

      // Update Progress
      if (progressRes.success && progressRes.data?.progress) {
        setProgress(progressRes.data.progress);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    fetchData(true);
  }, []);

  const [recentApplications, setRecentApplications] = useState<ApplicationItem[]>([]);




  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? [colors.background, colors.background, colors.surface] : [colors.background, colors.background, colors.accent]}
        style={styles.background}
        locations={[0, 0.4, 1]}
      />

      {/* Welcome Header - Sticky */}
      <View style={[styles.header, { paddingTop: inset.top + 20 }]}>
        <View style={styles.headerContent}>
          <View style={styles.welcomeSection}>
            <Text style={[styles.welcomeText, { color: isDark ? colors.textSecondary : "#666" }]}>Hi,</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.userName, { color: colors.text }]}>{reviewerName}</Text>
              <HelloWave />
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push("/(dashboard)/reviewer/notifications")}
              style={styles.bellWrapper}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={26} color={colors.text} />
              {/* {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )} */}
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(dashboard)/reviewer/profile")} activeOpacity={0.8}>
              {profilePhotoUrl ? (
                <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person-circle-outline" size={36} color={colors.text} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: inset.bottom + 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Dashboard Stats */}
        <View style={styles.statsContainer}>
          {/* Application Status Card */}
          <View style={[styles.applicationStatusCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBox, { backgroundColor: "#673AB715" }]}>
                <Ionicons name="analytics-outline" size={20} color="#673AB7" />
              </View>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Application Status</Text>
            </View>

            <View style={styles.statusGrid}>
              {/* First Row */}
              <View style={styles.statusRow}>
                {/* Total Applications */}
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#2196F315" }]}>
                    <Ionicons name="albums-outline" size={20} color="#2196F3" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.total_applications_assigned.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Total Assigned</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#2196F330" : "#2196F320" }]}>
                    <View style={[styles.statusBarFill, {
                      width: stats.total_applications_assigned > 0 ? "100%" : "0%",
                      backgroundColor: "#2196F3"
                    }]} />
                  </View>
                </View>

                {/* Pending Review */}
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#FF980015" }]}>
                    <Ionicons name="time-outline" size={20} color="#FF9800" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.pending_review.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Pending</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#FF980030" : "#FF980020" }]}>
                    <View style={[styles.statusBarFill, {
                      width: stats.total_applications_assigned > 0 ? `${(stats.pending_review / stats.total_applications_assigned * 100)}%` : "0%",
                      backgroundColor: "#FF9800"
                    }]} />
                  </View>
                </View>
              </View>

              {/* Second Row */}
              <View style={styles.statusRow}>
                {/* Approved */}
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#4CAF5015" }]}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.approved.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Approved</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#4CAF5030" : "#4CAF5020" }]}>
                    <View style={[styles.statusBarFill, {
                      width: stats.total_applications_assigned > 0 ? `${(stats.approved / stats.total_applications_assigned * 100)}%` : "0%",
                      backgroundColor: "#4CAF50"
                    }]} />
                  </View>
                </View>

                {/* Rejected */}
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#F4433615" }]}>
                    <Ionicons name="close-circle-outline" size={20} color="#F44336" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.rejected.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Rejected</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#F4433630" : "#F4433620" }]}>
                    <View style={[styles.statusBarFill, {
                      width: stats.total_applications_assigned > 0 ? `${(stats.rejected / stats.total_applications_assigned * 100)}%` : "0%",
                      backgroundColor: "#F44336"
                    }]} />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Activity Tracking Card */}
          <View style={[styles.applicationStatusCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBox, { backgroundColor: "#00BCD415" }]}>
                <Ionicons name="trending-up-outline" size={20} color="#00BCD4" />
              </View>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Activity Tracking</Text>
            </View>

            <View style={styles.statusGrid}>
              <View style={styles.statusRow}>
                {/* Verified Today */}
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#00BCD415" }]}>
                    <Ionicons name="document-text-outline" size={20} color="#00BCD4" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.verified_today.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Verified Today</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#00BCD430" : "#00BCD420" }]}>
                    <View style={[styles.statusBarFill, {
                      width: stats.verified_this_week > 0 ? `${(stats.verified_today / stats.verified_this_week * 100)}%` : "0%",
                      backgroundColor: "#00BCD4"
                    }]} />
                  </View>
                </View>

                {/* Verified This Week */}
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#673AB715" }]}>
                    <Ionicons name="calendar-outline" size={20} color="#673AB7" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.verified_this_week.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>This Week</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#673AB730" : "#673AB720" }]}>
                    <View style={[styles.statusBarFill, {
                      width: "100%",
                      backgroundColor: "#673AB7"
                    }]} />
                  </View>
                </View>
              </View>

              {/* Second Row with Bookmarked centered */}
              <View style={[styles.statusRow, { justifyContent: "center" }]}>
                {/* Bookmarked */}
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#9C27B015" }]}>
                    <Ionicons name="bookmark-outline" size={20} color="#9C27B0" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.bookmarked.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Bookmarked</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#9C27B030" : "#9C27B020" }]}>
                    <View style={[styles.statusBarFill, {
                      width: stats.total_applications_assigned > 0 ? `${(stats.bookmarked / stats.total_applications_assigned * 100)}%` : "0%",
                      backgroundColor: "#9C27B0"
                    }]} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Review Progress */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Review Progress</Text>
          <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(51, 51, 51, 0.08)" }]}>
            <View style={[styles.progressFill, { width: `${progress.progress_percentage}%` }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={[styles.progressLabel, { color: colors.text, marginTop: 0 }]}>
              {progress.progress_percentage}% reviewed
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>
              {progress.current_stage || "Status Unknown"}
            </Text>
          </View>
        </View>

        {/* Recent Applications */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Applications</Text>
            <TouchableOpacity onPress={() => router.push("/(dashboard)/reviewer/applications")} accessibilityRole="button">
              <Text style={[styles.viewAllText, { color: colors.text }]}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.cardList, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
            {recentApplications.slice(0, 5).map((app) => (
              <TouchableOpacity key={app.id} style={[styles.listItem, { borderBottomColor: isDark ? colors.border : "rgba(51, 51, 51, 0.06)" }]} activeOpacity={0.8} onPress={() => router.push({ pathname: "/(dashboard)/reviewer/application-details", params: { id: app.id } })}>
                <View style={[styles.listItemIcon, { backgroundColor: isDark ? colors.surface : "#f5f5f5" }]}>
                  <Ionicons name="document-text-outline" size={18} color="#2196F3" />
                </View>
                <View style={styles.listItemBody}>
                  <Text style={[styles.listItemTitle, { color: colors.text }]}>{app.scholarshipTitle}</Text>
                  <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{app.studentName}</Text>
                </View>
                <View style={[styles.statusBadge, getStatusBadgeStyle(app.status, isDark)]}>
                  <Text style={[styles.statusBadgeText, { color: isDark ? colors.text : "#333" }]}>{app.status}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
            {recentApplications.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No recent applications</Text>
              </View>
            )}
          </View>
        </View>



        {/* Quick Actions */}
        <View style={styles.featuresContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.featuresGrid}>
            <TouchableOpacity style={[styles.featureCard, { borderLeftColor: "#2196F3", backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]} activeOpacity={0.8} onPress={() => router.push("/(dashboard)/reviewer/applications")}>
              <View style={styles.featureContent}>
                <View style={[styles.featureIcon, { backgroundColor: "#2196F320" }]}>
                  <Ionicons name="albums-outline" size={24} color="#2196F3" />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={[styles.featureTitle, { color: colors.text }]}>View All Applications</Text>
                  <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>Browse and filter all submissions</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* <TouchableOpacity style={[styles.featureCard, { borderLeftColor: "#FF9800", backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]} activeOpacity={0.8} onPress={() => router.push("/(dashboard)/reviewer/documents")}>
              <View style={styles.featureContent}>
                <View style={[styles.featureIcon, { backgroundColor: "#FF980020" }]}>
                  <Ionicons name="document-attach-outline" size={24} color="#FF9800" />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={[styles.featureTitle, { color: colors.text }]}>Check Documents</Text>
                  <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>Verify uploaded applicant documents</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity> */}


          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function getStatusBadgeStyle(status: string, isDark: boolean) {
  switch (status?.toLowerCase()) {
    case "approved":
      return { backgroundColor: isDark ? "#1B5E2030" : "#E8F5E9", borderColor: "#4CAF50" };
    case "rejected":
      return { backgroundColor: isDark ? "#B71C1C30" : "#FBE9E7", borderColor: "#F44336" };
    case "pending":
    case "new":
    case "waitlisted":
      return { backgroundColor: isDark ? "#FFF3E030" : "#FFF8E1", borderColor: "#FFC107" }; // Yellow/Amber for pending/new
    default:
      return { backgroundColor: isDark ? "#0D47A130" : "#E3F2FD", borderColor: "#2196F3" };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2c44d",
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
  header: {
    padding: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  bellWrapper: {
    marginRight: 8,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F44336",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "700",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 16,
  },
  // Application Status Card
  applicationStatusCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  statusGrid: {
    flexDirection: "column",
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    gap: 10,
  },
  statusItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    minWidth: 0, // Allow items to shrink
  },
  statusIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statusNumber: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  statusBar: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  statusBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  // Old stat card styles (kept for compatibility)
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardPrimary: {
    // Not needed anymore - all cards same size
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#333",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    lineHeight: 14,
    fontWeight: "500",
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  viewAllText: {
    color: "#333",
    fontWeight: "600",
  },
  cardList: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(51, 51, 51, 0.06)",
  },
  listItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  listItemBody: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  listItemSub: {
    fontSize: 12,
    color: "#666",
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },
  emptyState: {
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
    color: "#666",
  },
  progressBar: {
    width: "100%",
    height: 10,
    borderRadius: 6,
    backgroundColor: "rgba(51, 51, 51, 0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
  },
  progressLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: "rgba(51, 51, 51, 0.1)",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  featureContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
  },
});

