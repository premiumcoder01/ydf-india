import { AppUpdateModal, DashboardHeader } from "@/components";
import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import { bookmarkScholarship, getApplicationProgress, getDashboardStats, getMyApplications, getNotifications, getRecommendedScholarships, getUpcomingDeadlines, getUserProfile } from "@/utils/api";
import { getCategoryColor, getDaysRemaining } from "@/utils/dashboard-helpers";
import { useAppUpdate } from "@/utils/useAppUpdate";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import { MotiView } from 'moti';
import React, { useCallback, useState } from "react";
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

const formatDateToIntuitive = (dateStr?: string | null) => {
  if (!dateStr || dateStr === "No Deadline") return "No Deadline";
  try {
    const parts = dateStr.split(' ')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthIdx = parseInt(month) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${parseInt(day)} ${months[monthIdx]} ${year}`;
      }
    }
    return dateStr;
  } catch { return dateStr; }
};




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
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<Record<number, boolean>>({});
  const [bookmarking, setBookmarking] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "error" | "info" }>({
    visible: false,
    message: "",
    type: "success",
  });
  const inset = useSafeAreaInsets();

  // ── App Update Hook (auto-checks on mount) ──────────────────────────────
  const appUpdate = useAppUpdate(true);

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
    Array<{
      id: string;
      title: string;
      category: string;
      deadline: string;
      daysRemaining: number;
      progress_percent: number;
      start_date: string;
      end_date: string;
      image: string;
      has_applied: boolean;
      expired: boolean;
    }>
  >([]);

  const [recommendedScholarships, setRecommendedScholarships] = useState<
    Array<{
      id: string;
      title: string;
      category: string;
      deadline: string | null;
      start_date: string | null;
      end_date: string | null;
      image: string;
      amount: string;
      bookmarked: boolean;
      expired: boolean;
      has_applied: boolean;
      description: string;
      progress_percent: number;
      external_scheme_link?: string;
    }>
  >([]);

  const [applicationProgress, setApplicationProgress] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  });

  const [activeApplications, setActiveApplications] = useState<Array<{
    id: number;
    scholarshipId: number;
    title: string;
    shortname: string;
    status: string;
    statusText: string;
    submittedDate: string;
    color: string;
  }>>([]);




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

      const [statsRes, deadlinesRes, recRes, progRes, appsRes, notifRes] = await Promise.all([
        getDashboardStats(authData.token),
        getUpcomingDeadlines(authData.token),
        getRecommendedScholarships(authData.token, { page: 1, per_page: 5 }),
        getApplicationProgress(authData.token),
        getMyApplications(authData.token),
        getNotifications(authData.token)
      ]);

      if (notifRes && notifRes.success && notifRes.data) {
        let raw: any[] = [];
        if (Array.isArray(notifRes.data)) raw = notifRes.data;
        else if (Array.isArray(notifRes.data.data)) raw = notifRes.data.data;
        else if (Array.isArray(notifRes.data.notifications)) raw = notifRes.data.notifications;

        const count = raw.filter((n: any) => !n.is_read).length;
        setUnreadCount(count);
      }

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
          category: item.category || "General",
          deadline: formatDateToIntuitive(item.deadline || item.end_date),
          daysRemaining: item.days_remaining,
          progress_percent: item.progress_percent || 0,
          start_date: item.start_date,
          end_date: item.end_date,
          image: item.image || "",
          has_applied: item.has_applied || false,
          expired: item.expired || false
        })));
      }

      if (recRes.success && Array.isArray(recRes.data)) {
        const recs = recRes.data
          .filter((item: any) => !item.expired)
          .map((item: any) => ({
            id: String(item.id),
            title: item.title || item.name || "Scholarship",
            category: item.category || "General",
            deadline: formatDateToIntuitive(item.end_date),
            start_date: item.start_date || null,
            image: item.image || "",
            amount: item.amount || "",
            bookmarked: item.bookmarked || false,
            expired: item.expired || false,
            has_applied: item.has_applied || false,
            description: item.description || "",
            progress_percent: item.progress_percent || 0,
            end_date: item.end_date || null,
            external_scheme_link: item.external_scheme_link || ""
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

      if (appsRes.success && appsRes.data) {
        const statusColors: Record<string, string> = {
          submitted: "#2196F3",
          review: "#FF9800",
          approved: "#4CAF50",
          rejected: "#F44336",
          new: "#2196F3",
          under_review: "#FF9800"
        };
        const formatDate = (dateStr: string) => {
          if (!dateStr) return "N/A";
          try {
            const date = new Date(dateStr);
            const day = date.getDate();
            const months = [
              "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"
            ];
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
          } catch { return dateStr.split(' ')[0]; }
        };
        const mapped = (appsRes.data.active || []).map((app: any) => {
          const status = app.status || "new";
          return {
            id: app.id,
            scholarshipId: app.scholarship_id,
            title: app.scholarship_title || "Scholarship Application",
            shortname: app.scholarship_shortname || "General",
            status,
            statusText: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
            submittedDate: formatDate(app.submitted_at),
            color: statusColors[status] || "#666"
          };
        });
        setActiveApplications(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    }
  }, []);


  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        setLoading(true);
        await Promise.all([fetchUserProfile(), fetchDashboardData()]);
        setLoading(false);
      };
      init();
    }, [fetchUserProfile, fetchDashboardData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchUserProfile(), fetchDashboardData()]);
    setRefreshing(false);
  }, [fetchUserProfile, fetchDashboardData]);



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
      <DashboardHeader
        userName={studentName}
        profilePhotoUrl={profilePhotoUrl}
        unreadCount={unreadCount}
        onNotificationPress={() => router.push("/(dashboard)/student/student-notifications")}
        onProfilePress={() => router.push("/(dashboard)/student/student-profile")}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDark ? "#000" : "#fff"]} // Android
            tintColor={isDark ? "#fff" : "#000"} // iOS
          />
        }
      >


        {/* Application Status Overview */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.statsContainer}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Application Analytics</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: "/(dashboard)/student/student-application-status", params: { tab: "active" } })}
            >
              <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={{ borderRadius: 24, padding: 18, elevation: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="document-text" size={18} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>{statusCounts.applied}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Applied</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: "/(dashboard)/student/student-application-status", params: { tab: "past", status: "Approved" } })}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={{ borderRadius: 24, padding: 18, elevation: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>{statusCounts.approved}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Approved</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: "/(dashboard)/student/student-application-status", params: { tab: "active", status: "New" } })}
            >
              <LinearGradient colors={['#FF9800', '#F57C00']} style={{ borderRadius: 24, padding: 18, elevation: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="time" size={18} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>{statusCounts.pending}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Pending</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: "/(dashboard)/student/student-application-status", params: { tab: "past", status: "Rejected" } })}
            >
              <LinearGradient colors={['#EF4444', '#B91C1C']} style={{ borderRadius: 24, padding: 18, elevation: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="close-circle" size={18} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>{statusCounts.rejected}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Rejected</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* Pending Applications Section */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 150 }}
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.pendingSectionIcon, { backgroundColor: '#673AB715' }]}>
                <Ionicons name="hourglass-outline" size={16} color="#673AB7" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Track Status</Text>
            </View>
            {activeApplications.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push("/(dashboard)/student/student-application-status")}
                activeOpacity={0.7}
                style={styles.pendingViewAllBtn}
              >
                <Text style={styles.pendingViewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ gap: 14, marginTop: 14 }}>
            {activeApplications.slice(0, 5).map((item, index) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/(dashboard)/student/student-scholarship-details",
                    params: { scholarshipId: item.scholarshipId }
                  })
                }
              >
                <View style={[
                  styles.pendingCard,
                  { backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#eee' }
                ]}>
                  {/* Top colored band */}
                  <View style={[styles.pendingCardBand, { backgroundColor: item.color + '12' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                      <Text style={[styles.pendingBandTitle, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                    {/* Status pill */}
                    <View style={[styles.pendingStatusPill, { backgroundColor: item.color, shadowColor: item.color }]}>
                      <View style={styles.pendingStatusDot} />
                      <Text style={styles.pendingStatusLabel}>{item.statusText}</Text>
                    </View>
                  </View>

                  {/* Bottom info row */}
                  <View style={styles.pendingCardFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <View style={[styles.pendingFooterIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8f8f8' }]}>
                        <Ionicons name="school" size={12} color={colors.primary} />
                      </View>
                      <Text style={[styles.pendingSchoolName, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.shortname}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="calendar" size={12} color={colors.textSecondary} />
                      <Text style={[styles.pendingDateChip, { color: colors.textSecondary }]}>
                        {item.submittedDate}
                      </Text>
                    </View>
                    <View style={[styles.pendingArrowBox, { backgroundColor: item.color + '15' }]}>
                      <Ionicons name="arrow-forward" size={14} color={item.color} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {activeApplications.length === 0 && (
              <View style={[styles.pendingEmptyBox, { backgroundColor: isDark ? colors.card : '#fafafa', borderColor: colors.border }]}>
                <View style={[styles.pendingEmptyIcon, { backgroundColor: '#673AB715' }]}>
                  <Ionicons name="document-text-outline" size={28} color="#673AB7" />
                </View>
                <Text style={[{ fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 12 }]}>No Applications Found</Text>
                <Text style={[{ fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>Apply for scholarships to track them here</Text>
              </View>
            )}

            {activeApplications.length > 5 && (
              <TouchableOpacity
                onPress={() => router.push("/(dashboard)/student/student-application-status")}
                activeOpacity={0.8}
                style={[styles.viewMoreBtn, { borderColor: '#673AB730', backgroundColor: isDark ? '#673AB715' : '#673AB708' }]}
              >
                <Ionicons name="apps-outline" size={16} color="#673AB7" />
                <Text style={[styles.viewMoreText, { color: '#673AB7' }]}>
                  View {activeApplications.length - 5} More Applications
                </Text>
                <Ionicons name="chevron-forward" size={15} color="#673AB7" />
              </TouchableOpacity>
            )}
          </View>
        </MotiView>

        {/* Upcoming Deadlines */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 300 }}
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Critical Deadlines</Text>
          </View>
          <View style={{ gap: 12 }}>
            {upcomingDeadlines.slice(0, 3).map((item) => {
              const categoryColor = getCategoryColor(item.category);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: "/(dashboard)/student/student-scholarship-details",
                      params: { scholarshipId: item.id }
                    })
                  }
                >
                  <LinearGradient
                    colors={isDark ? [colors.card, colors.card] : ['#ffffff', '#fff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.deadlineCard,
                      {
                        borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#eee',
                        borderLeftColor: categoryColor,
                        borderLeftWidth: 4,
                        paddingVertical: 18,
                        backgroundColor: isDark ? colors.card : '#fff',
                      }
                    ]}
                  >
                    <View style={{ flex: 1, gap: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <View style={[styles.tag, { backgroundColor: categoryColor + "15" }]}>
                            <Text style={[styles.tagText, { color: categoryColor }]}>{item.category}</Text>
                          </View>
                          {item.has_applied && (
                            <View style={[styles.tag, { backgroundColor: '#4CAF5015' }]}>
                              <Text style={[styles.tagText, { color: '#4CAF50' }]}>Applied</Text>
                            </View>
                          )}
                          {item.expired && (
                            <View style={[styles.tag, { backgroundColor: '#F4433615' }]}>
                              <Text style={[styles.tagText, { color: '#F44336' }]}>Expired</Text>
                            </View>
                          )}
                        </View>

                        {!item.expired && !item.has_applied && item.daysRemaining < 30 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF980015', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 }}>
                            <Ionicons name="hourglass-outline" size={12} color="#FF9800" />
                            <Text style={{ fontSize: 10, color: "#FF9800", fontWeight: '700' }}>EXPIRING SOON</Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.deadlineTitle, { color: colors.text, fontSize: 16, fontWeight: '700' }]} numberOfLines={2}>{item.title}</Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                          <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>
                            {item.deadline}
                          </Text>
                        </View>

                        {!item.expired && (
                          <>
                            <View style={{ width: 1, height: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#eee' }} />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="time-outline" size={14} color={item.daysRemaining < 30 ? '#FF9800' : colors.textSecondary} />
                              <Text style={{ fontSize: 12, color: item.daysRemaining < 30 ? '#FF9800' : colors.textSecondary, fontWeight: '700' }}>
                                {item.daysRemaining} days left
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>

                    <View style={{
                      width: 32, height: 32, borderRadius: 12,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8f8f8',
                      justifyContent: 'center', alignItems: 'center'
                    }}>
                      <Ionicons name="arrow-forward" size={16} color={colors.text} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )
            })}
            {upcomingDeadlines.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No upcoming deadlines</Text>
              </View>
            )}
          </View>
        </MotiView>


        {/* Recommended Scholarships */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 450 }}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Recommended Opportunities</Text>
          <View style={styles.cardGrid}>
            {recommendedScholarships.map((s) => {
              const categoryColor = getCategoryColor(s.category);
              const daysInfo = getDaysRemaining(s.end_date, s.expired);

              const isExpired = s.expired;

              return (
                <View key={s.id} style={[styles.scholarshipCard, { borderLeftColor: categoryColor, borderLeftWidth: 4, backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#eee' }]}>
                  <View style={styles.cardInternalRow}>
                    {s.image ? (
                      <Image source={{ uri: s.image }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardIconPlaceholder, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8f8f8" }]}>
                        <Ionicons name="school" size={22} color={categoryColor} />
                      </View>
                    )}
                    <View style={styles.cardContent}>
                      <Text style={[styles.scholarshipTitle, { color: colors.text, fontWeight: '700', fontSize: 14 }]} numberOfLines={1}>{s.title}</Text>
                      <View style={styles.tagRow}>
                        {isExpired && (
                          <View style={[styles.tag, { backgroundColor: 'rgba(244, 67, 54, 0.1)', marginRight: 6 }]}>
                            <Text style={[styles.tagText, { color: '#F44336' }]}>Expired</Text>
                          </View>
                        )}
                        <View style={[styles.tag, { backgroundColor: `${categoryColor}12` }]}>
                          <Text style={[styles.tagText, { color: categoryColor, fontSize: 10 }]}>{s.category}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                        <Ionicons name="time" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.scholarshipDeadline, { color: colors.textSecondary, fontSize: 11 }]}>
                          {s.deadline ? s.deadline : "No Deadline"}
                        </Text>
                        {!isExpired && s.deadline && daysInfo.text !== "Open" && daysInfo.text !== "Expired" && (
                          <Text style={[styles.scholarshipDeadline, { marginLeft: 6, color: daysInfo.color, fontSize: 11, fontWeight: '700' }]}>
                            • {daysInfo.text}
                          </Text>
                        )}
                      </View>

                      {/* Application Progress Bar */}
                      {s.progress_percent > 0 && (
                        <View style={{ marginTop: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 10, color: colors.textSecondary }}>Progress</Text>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{s.progress_percent}%</Text>
                          </View>
                          <View style={{ height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                            <View
                              style={{
                                height: '100%',
                                width: `${s.progress_percent}%`,
                                backgroundColor: s.progress_percent === 100 ? '#4CAF50' : categoryColor,
                                borderRadius: 2
                              }}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleBookmark(Number(s.id), s.bookmarked)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name={s.bookmarked ? "bookmark" : "bookmark-outline"}
                        size={20}
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
                      style={[styles.viewBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f8f8f8", borderRadius: 12 }]}
                    >
                      <Ionicons name="eye-outline" size={18} color={colors.text} />
                      <Text style={[styles.viewBtnText, { color: colors.text }]}>Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (s.external_scheme_link) {
                          openBrowserAsync(s.external_scheme_link, {
                            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
                          });
                        } else {
                          router.push({
                            pathname: "/(dashboard)/student/student-apply-form",
                            params: { scholarshipId: s.id }
                          });
                        }
                      }}
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
        </MotiView>

        {/* Application Progress Tracker */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 500 }}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Analytics Overview</Text>
          <View style={[styles.progressCard, { backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#eee' }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTotal, { color: colors.text, fontSize: 30, fontWeight: '800' }]}>
                {applicationProgress.total} <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "600", textTransform: 'uppercase', letterSpacing: 0.5 }}>Applications</Text>
              </Text>
            </View>

            <View style={[styles.segmentedProgressBar, { height: 10, gap: 3, borderRadius: 6, overflow: 'hidden' }]}>
              {applicationProgress.approved > 0 && (
                <View style={[styles.progressSegment, { flex: applicationProgress.approved, backgroundColor: "#10B981" }]} />
              )}
              {applicationProgress.pending > 0 && (
                <View style={[styles.progressSegment, { flex: applicationProgress.pending, backgroundColor: "#FF9800" }]} />
              )}
              {applicationProgress.rejected > 0 && (
                <View style={[styles.progressSegment, { flex: applicationProgress.rejected, backgroundColor: "#EF4444" }]} />
              )}
              {applicationProgress.total === 0 && (
                <View style={[styles.progressSegment, { flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#eee" }]} />
              )}
            </View>


          </View>
        </MotiView>



        {/* Quick Actions Grid */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 600 }}
          style={styles.featuresContainer}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Operational Hub</Text>
          <View style={styles.featuresGrid}>
            {studentFeatures.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={[
                  styles.featureCard,
                  {
                    borderLeftWidth: 0,
                    backgroundColor: isDark ? colors.card : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#eee',
                    padding: 14,
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
                <View style={[styles.featureContent, { gap: 12 }]}>
                  <LinearGradient
                    colors={[feature.color, feature.color + 'aa']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.featureIcon,
                      { width: 42, height: 42, borderRadius: 12 },
                    ]}
                  >
                    <Ionicons
                      name={feature.icon as any}
                      size={20}
                      color="#fff"
                    />
                  </LinearGradient>
                  <View style={styles.featureInfo}>
                    <Text style={[styles.featureTitle, { color: colors.text, fontWeight: '700', fontSize: 15 }]}>{feature.title}</Text>
                    <Text style={[styles.featureDescription, { color: colors.textSecondary, fontSize: 12 }]} numberOfLines={1}>
                      {feature.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </MotiView>
      </ScrollView>

      {/* App Update Modal (auto-popup) */}
      <AppUpdateModal
        visible={appUpdate.showModal}
        appVersion={appUpdate.appVersion}
        storeVersion={appUpdate.storeVersion}
        updateType={appUpdate.updateType}
        onUpdate={appUpdate.applyUpdate}
        onDismiss={appUpdate.dismissUpdate}
      />
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
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 24,
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
  deadlineCard: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deadlineIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deadlineTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  deadlineSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Pending Applications — redesigned styles
  pendingSectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingViewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#673AB712',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pendingViewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#673AB7',
  },
  pendingCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  pendingCardBand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  pendingIndexBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pendingIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  pendingBandTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  pendingStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
    flexShrink: 0,
  },
  pendingStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  pendingStatusLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
  },
  pendingCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  pendingFooterIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingSchoolName: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  pendingDateChip: {
    fontSize: 11,
    fontWeight: '500',
  },
  pendingArrowBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pendingEmptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  pendingEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 2,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
