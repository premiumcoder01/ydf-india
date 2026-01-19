import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import { bookmarkScholarship, getApplicationProgress, getDashboardStats, getRecommendedScholarships, getUpcomingDeadlines, getUserProfile } from "@/utils/api";
import { getCategoryColor, getDaysRemaining } from "@/utils/dashboard-helpers";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const studentFeatures = [
  {
    id: 1,
    title: "View Scholarships",
    description: "Find and apply for available scholarships",
    icon: "search-outline",
    color: "#4CAF50",
  },
  {
    id: 2,
    title: "Bookmarked",
    description: "View your saved scholarships",
    icon: "bookmark",
    color: "#FFB400",
  },
  {
    id: 3,
    title: "My Applications",
    description: "Track your scholarship applications",
    icon: "document-text-outline",
    color: "#2196F3",
  },
  {
    id: 4,
    title: "Upload Docs",
    description: "Upload required documents",
    icon: "cloud-upload-outline",
    color: "#FF9800",
  },
];




export default function StudentDashboardScreen() {
  const { isDark, colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [statusCounts, setStatusCounts] = useState({
    applied: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });

  const [studentName, setStudentName] = useState("Student");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [unreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<Record<number, boolean>>({});
  const [bookmarking, setBookmarking] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "error" | "info" }>({
    visible: false,
    message: "",
    type: "success",
  });
  const inset = useSafeAreaInsets();

  const toggleBookmark = async (id: number, currentBookmarkState: boolean) => {
    if (bookmarking[id]) return;
    const newBookmarkState = !currentBookmarkState;
    console.log("Toggling bookmark for:", id, "New state:", newBookmarkState);

    // Optimistic update
    setBookmarks((prev) => ({ ...prev, [id]: newBookmarkState }));
    setRecommendedScholarships((prev) =>
      prev.map(s => s.id === String(id) ? { ...s, bookmarked: newBookmarkState } : s)
    );

    try {
      setBookmarking((prev) => ({ ...prev, [id]: true }));
      const authDataData = await AsyncStorage.getItem("authData");
      if (authDataData) {
        const authData = JSON.parse(authDataData);
        if (authData.token) {
          const action = newBookmarkState ? "bookmark" : "unbookmark";
          const response = await bookmarkScholarship(authData.token, id, action);
          if (!response.success) {
            // Revert
            setBookmarks((prev) => ({ ...prev, [id]: !newBookmarkState }));
            setRecommendedScholarships((prev) =>
              prev.map(s => s.id === String(id) ? { ...s, bookmarked: !newBookmarkState } : s)
            );
            setToast({
              visible: true,
              message: "Failed to update bookmark",
              type: "error",
            });
          } else {
            setToast({
              visible: true,
              message: newBookmarkState ? "Scholarship bookmarked" : "Scholarship removed from bookmarks",
              type: "success",
            });
          }
        }
      }
    } catch (e) {
      console.error("Bookmark error", e);
      // Revert
      setBookmarks((prev) => ({ ...prev, [id]: !newBookmarkState }));
      setRecommendedScholarships((prev) =>
        prev.map(s => s.id === String(id) ? { ...s, bookmarked: !newBookmarkState } : s)
      );
      setToast({
        visible: true,
        message: "An error occurred",
        type: "error",
      });
    } finally {
      setBookmarking((prev) => ({ ...prev, [id]: false }));
    }
  };

  const [upcomingDeadlines, setUpcomingDeadlines] = useState<
    Array<{ id: string; title: string; deadline: string }>
  >([]);

  const [recommendedScholarships, setRecommendedScholarships] = useState<
    Array<{
      id: string;
      title: string;
      category: string;
      deadline: string | null;
      start_date: string | null;
      image: string;
      amount: string;
      bookmarked: boolean;
      expired: boolean;
      has_applied: boolean;
      description: string;
    }>
  >([]);

  const [applicationProgress, setApplicationProgress] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  });




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

  const fetchUserProfile = useCallback(async () => {
    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;

      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) return;

      const response = await getUserProfile(token);
      if (response.success && response.data?.user) {
        const user = response.data.user;
        setStudentName(user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Student");
        if (user.profileimageurl) setProfilePhotoUrl(user.profileimageurl);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      try {
        const authDataString = await AsyncStorage.getItem("authData");
        if (authDataString) {
          const authData = JSON.parse(authDataString);
          if (authData?.user) {
            const user = authData.user;
            setStudentName(user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Student");
            if (user.profileimageurl) setProfilePhotoUrl(user.profileimageurl);
          }
        }
      } catch (e) { }
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const authDataData = await AsyncStorage.getItem("authData");
      if (!authDataData) return;
      const authData = JSON.parse(authDataData);
      if (!authData.token) return;

      const [statsRes, deadlinesRes, recRes, progRes] = await Promise.all([
        getDashboardStats(authData.token),
        getUpcomingDeadlines(authData.token),
        getRecommendedScholarships(authData.token, { page: 1, per_page: 5 }),
        getApplicationProgress(authData.token)
      ]);

      if (statsRes.success && statsRes.data?.stats) {
        const stats = statsRes.data.stats;
        setStatusCounts({
          applied: stats.total_applications || 0,
          approved: stats.approved_applications || 0,
          pending: stats.pending_applications || 0,
          rejected: stats.rejected_applications || 0
        });
      }

      if (deadlinesRes.success && Array.isArray(deadlinesRes.data)) {
        setUpcomingDeadlines(deadlinesRes.data.map((item: any) => ({
          id: String(item.scholarship_id),
          title: item.scholarship_title,
          deadline: `Due in ${item.days_remaining} days`
        })));
      }

      if (recRes.success && Array.isArray(recRes.data)) {
        const recs = recRes.data.map((item: any) => ({
          id: String(item.id),
          title: item.title || item.name || "Scholarship",
          category: item.category || "General",
          deadline: item.end_date || null,
          start_date: item.start_date || null,
          image: item.image || "",
          amount: item.amount || "",
          bookmarked: item.bookmarked || false,
          expired: item.expired || false,
          has_applied: item.has_applied || false,
          description: item.description || ""
        }));
        setRecommendedScholarships(recs);
        const bMap: Record<number, boolean> = {};
        recs.forEach((s: any) => { bMap[Number(s.id)] = s.bookmarked; });
        setBookmarks(prev => ({ ...prev, ...bMap }));
      }

      if (progRes.success && progRes.data) {
        setApplicationProgress({
          total: progRes.data.total_submitted || 0,
          approved: progRes.data.approved || 0,
          pending: progRes.data.pending || 0,
          rejected: progRes.data.rejected || 0
        });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchUserProfile(), fetchDashboardData()]);
      setLoading(false);
    };
    init();
  }, [fetchUserProfile, fetchDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchUserProfile(), fetchDashboardData()]);
    setRefreshing(false);
  }, [fetchUserProfile, fetchDashboardData]);

  const progress = useMemo(() => {
    const { approved, total } = applicationProgress;
    // Fallback if API hasn't loaded yet or returns 0
    if (total === 0 && statusCounts.applied > 0) {
      // Fallback to legacy statusCounts if new API empty but legacy has data
      const legacyTotal = statusCounts.applied + statusCounts.pending + statusCounts.rejected + statusCounts.approved;
      const legacyApproved = statusCounts.approved;
      if (legacyTotal > 0) {
        const ratio = Math.round((legacyApproved / legacyTotal) * 100);
        return { ratio, label: `${legacyApproved} of ${legacyTotal} applications approved (${ratio}%)` };
      }
    }

    if (total === 0) return { ratio: 0, label: "0 of 0 approved (0%)" };
    const ratio = Math.round((approved / total) * 100);
    return {
      ratio,
      label: `${approved} of ${total} applications approved (${ratio}%)`,
    };
  }, [applicationProgress, statusCounts]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      {/* Header Section */}
      <View style={[styles.header, { paddingTop: inset.top + 20 }]}>
        <View style={styles.headerContent}>
          <View style={styles.welcomeSection}>
            <Text style={[styles.welcomeText, { color: isDark ? colors.textSecondary : "#666" }]}>Hi,</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{studentName} 👋</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() =>
                router.push("/(dashboard)/student/student-notifications")
              }
              style={styles.bellWrapper}
              activeOpacity={0.8}
            >
              <Ionicons
                name="notifications-outline"
                size={26}
                color={isDark ? colors.text : "#333"}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() =>
                router.push("/(dashboard)/student/student-profile")
              }
              activeOpacity={0.8}
            >
              {profilePhotoUrl ? (
                <Image
                  source={{ uri: profilePhotoUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person-circle-outline"
                    size={36}
                    color={isDark ? colors.text : "#333"}
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDark ? "#fff" : "#000"]} // Android
            tintColor={isDark ? "#fff" : "#000"} // iOS
          />
        }
      >

        {/* Scholarship Overview Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}

          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{statusCounts.applied}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Applied</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}

          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{statusCounts.approved}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}

          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{statusCounts.pending}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}

          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{statusCounts.rejected}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rejected</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Deadlines */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Deadlines</Text>
            <TouchableOpacity
              onPress={() =>
                router.push("/(dashboard)/student/student-scholarship-listing")
              }
              accessibilityRole="button"
            >
              <Text style={[styles.viewAllText, { color: colors.text }]}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.cardList, { backgroundColor: colors.card, borderColor: colors.textSecondary }]}>
            {upcomingDeadlines.slice(0, 3).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.listItem}
                onPress={() =>
                  router.push(
                    "/(dashboard)/student/student-scholarship-details"
                  )
                }
                activeOpacity={0.8}
              >
                <View style={styles.listItemIcon}>
                  <Ionicons name="time-outline" size={18} color="#FF9800" />
                </View>
                <View style={styles.listItemBody}>
                  <Text style={styles.listItemTitle}>{item.title}</Text>
                  <Text style={styles.listItemSub}>{item.deadline}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </TouchableOpacity>
            ))}
            {upcomingDeadlines.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No upcoming deadlines</Text>
              </View>
            )}
          </View>
        </View>


        {/* Recommended Scholarships */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommended Scholarships</Text>
          <View style={styles.cardGrid}>
            {recommendedScholarships.slice(0, 5).map((s) => {
              const categoryColor = getCategoryColor(s.category);
              const daysInfo = getDaysRemaining(s.deadline, s.expired); // s.deadline in state is raw date string from API now, or null.
              // Wait, in previous step I updated state to have deadline: item.end_date || null.
              // So s.deadline is the raw date string (e.g. "2025-11-30") or null.
              // getDaysRemaining expects raw string. So this is correct.

              const isExpired = s.expired;

              return (
                <View key={s.id} style={[styles.scholarshipCard, { borderLeftColor: categoryColor, borderLeftWidth: 4, backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardInternalRow}>
                    {s.image ? (
                      <Image source={{ uri: s.image }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardIconPlaceholder, { backgroundColor: isDark ? "#333" : "#e0e0e0" }]}>
                        <Ionicons name="school-outline" size={24} color={colors.text} />
                      </View>
                    )}
                    <View style={styles.cardContent}>
                      <Text style={[styles.scholarshipTitle, { color: colors.text }]} numberOfLines={2}>{s.title}</Text>
                      <View style={styles.tagRow}>
                        {isExpired && (
                          <View style={[styles.tag, { backgroundColor: 'rgba(244, 67, 54, 0.1)', marginRight: 6 }]}>
                            <Text style={[styles.tagText, { color: '#F44336' }]}>Expired</Text>
                          </View>
                        )}
                        <View style={[styles.tag, { backgroundColor: `${categoryColor}15` }]}>
                          <Text style={[styles.tagText, { color: categoryColor }]}>{s.category}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="time-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.scholarshipDeadline, { color: colors.textSecondary }]}>
                          {s.deadline ? s.deadline : "No Deadline"}
                        </Text>
                        {!isExpired && s.deadline && daysInfo.text !== "Open" && daysInfo.text !== "Expired" && (
                          <Text style={[styles.scholarshipDeadline, { marginLeft: 6, color: daysInfo.color }]}>
                            • {daysInfo.text}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleBookmark(Number(s.id), s.bookmarked)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name={s.bookmarked ? "bookmark" : "bookmark-outline"}
                        size={22}
                        color={s.bookmarked ? "#FFB400" : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.scholarshipActions}>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/(dashboard)/student/student-scholarship-details",
                          params: { scholarshipId: s.id }
                        })
                      }
                      style={[styles.viewBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }]}
                    >
                      <Ionicons name="eye-outline" size={18} color={colors.text} />
                      <Text style={[styles.viewBtnText, { color: colors.text }]}>Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/(dashboard)/student/student-apply-form",
                          params: { scholarshipId: s.id }
                        })
                      }
                      disabled={isExpired || s.has_applied}
                      style={[
                        styles.applyBtn,
                        s.has_applied
                          ? {
                            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0",
                            borderWidth: 1,
                            borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e0e0e0"
                          }
                          : { backgroundColor: categoryColor },
                        isExpired && !s.has_applied && { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#eee", opacity: 0.8 }
                      ]}
                    >
                      <Ionicons
                        name={s.has_applied ? "checkmark-circle-outline" : (isExpired ? "close-circle-outline" : "paper-plane-outline")}
                        size={18}
                        color={s.has_applied ? "#4CAF50" : (isExpired ? (isDark ? colors.textSecondary : "#999") : "#fff")}
                      />
                      <Text style={[styles.applyBtnText, s.has_applied ? { color: "#4CAF50" } : (isExpired && { color: isDark ? colors.textSecondary : "#999" })]}>
                        {s.has_applied ? "Already Applied" : (isExpired ? "Expired" : "Apply Now")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
            {recommendedScholarships.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recommendations yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Application Progress Tracker */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Application Progress</Text>
          <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTotal, { color: colors.text }]}>
                {applicationProgress.total} <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: "normal" }}>Applications</Text>
              </Text>
            </View>

            <View style={styles.segmentedProgressBar}>
              {applicationProgress.approved > 0 && (
                <View style={[styles.progressSegment, { flex: applicationProgress.approved, backgroundColor: "#4CAF50", borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }]} />
              )}
              {applicationProgress.pending > 0 && (
                <View style={[styles.progressSegment, { flex: applicationProgress.pending, backgroundColor: "#FF9800" }]} />
              )}
              {applicationProgress.rejected > 0 && (
                <View style={[styles.progressSegment, { flex: applicationProgress.rejected, backgroundColor: "#F44336", borderTopRightRadius: 8, borderBottomRightRadius: 8 }]} />
              )}
              {applicationProgress.total === 0 && (
                <View style={[styles.progressSegment, { flex: 1, backgroundColor: isDark ? "#333" : "#eee", borderRadius: 8 }]} />
              )}
            </View>

            <View style={styles.progressLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#4CAF50" }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>{applicationProgress.approved} Approved</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#FF9800" }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>{applicationProgress.pending} Pending</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#F44336" }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>{applicationProgress.rejected} Rejected</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.featuresContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.featuresGrid}>
            {studentFeatures.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={[
                  styles.featureCard,
                  {
                    borderLeftColor: feature.color,
                    backgroundColor: colors.card,
                    borderColor: colors.border
                  }
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  if (feature.id === 1) {
                    router.push(
                      "/(dashboard)/student/student-scholarship-listing"
                    );
                  } else if (feature.id === 2) {
                    router.push(
                      "/(dashboard)/student/student-bookmarked-scholarships"
                    );
                  } else if (feature.id === 3) {
                    router.push(
                      "/(dashboard)/student/student-application-status"
                    );
                  } else if (feature.id === 4) {
                    router.push("/(dashboard)/student/student-document-upload");
                  } else if (feature.id === 5) {
                    router.push("/(dashboard)/student/student-calendar");
                  } else if (feature.id === 6) {
                    router.push("/(dashboard)/student/student-profile");
                  }
                }}
              >
                <View style={styles.featureContent}>
                  <View
                    style={[
                      styles.featureIcon,
                      { backgroundColor: feature.color + "20" },
                    ]}
                  >
                    <Ionicons
                      name={feature.icon as any}
                      size={24}
                      color={feature.color}
                    />
                  </View>
                  <View style={styles.featureInfo}>
                    <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                    <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                      {feature.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={isDark ? colors.textSecondary : "#666"} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
  header: {
    padding: 20,
    paddingBottom: 10,
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
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
  },
  bellWrapper: {
    marginRight: 8,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF5252",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 24,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  cardList: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  listItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#PPP", // Placeholder color logic handles this usually
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  listItemBody: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  listItemSub: {
    fontSize: 13,
    color: "#888",
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  cardGrid: {
    gap: 16,
  },
  scholarshipCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardInternalRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  cardIconPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  scholarshipTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  scholarshipDeadline: {
    fontSize: 12,
  },
  scholarshipActions: {
    flexDirection: "row",
    gap: 10,
  },
  viewBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  viewBtnText: {
    fontWeight: "600",
    fontSize: 14,
  },
  applyBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  applyBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  featureContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  featureInfo: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  featureDescription: {
    fontSize: 13,
    color: "#666",
  },
  progressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  progressHeader: {
    marginBottom: 16,
  },
  progressTotal: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  segmentedProgressBar: {
    height: 12,
    flexDirection: "row",
    gap: 4,
    marginBottom: 20,
  },
  progressSegment: {
    height: "100%",
    borderRadius: 4,
  },
  progressLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
