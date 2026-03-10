import { HelloWave, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { bookmarkScholarship, getMobilizerDashboardStats, getMobilizerRecommendedScholarships, getMobilizerStudents, getMobilizerUpcomingDeadlines, getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

const mobilizerFeatures = [
  {
    id: 1,
    title: "View Scholarships",
    description: "Browse all available scholarships",
    icon: "search-outline",
    color: "#4CAF50",
    route: "/(dashboard)/mobilizer/mobilizer-scholarship-listing"
  },
  {
    id: 2,
    title: "My Students",
    description: "Manage your students",
    icon: "people-outline",
    color: "#2196F3",
    route: "/(dashboard)/mobilizer/mobilizer-students"
  },
  {
    id: 3,
    title: "Applications",
    description: "Track student applications",
    icon: "document-text-outline",
    color: "#FF9800",
    route: "/(dashboard)/mobilizer/mobilizer-applications"
  },
  {
    id: 4,
    title: "Bookmarked",
    description: "View saved scholarships",
    icon: "bookmark",
    color: "#FFB400",
    route: "/(dashboard)/mobilizer/mobilizer-bookmarked-scholarships"
  },
  {
    id: 5,
    title: "Add Student",
    description: "Create a new student account",
    icon: "person-add-outline",
    color: "#9C27B0",
    route: "/(dashboard)/mobilizer/mobilizer-add-student"
  },
];

export default function StudentMobilizerDashboard() {
  const { isDark, colors } = useTheme();
  const inset = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [studentName, setStudentName] = useState("Teacher");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  // Stats from API
  const [stats, setStats] = useState({
    total_students_added: 0,
    total_applications_created: 0,
    applications_in_progress: 0,
    applications_approved: 0,
    applications_rejected: 0,
    scholarships_bookmarked: 0,
  });

  const [notifications, setNotifications] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [recommendedScholarships, setRecommendedScholarships] = useState<any[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" | "info" });

  // Reuse student dashboard progress logic
  const progress = useMemo(() => {
    const approved = stats.applications_approved;
    const total = stats.total_applications_created;
    if (total === 0) return { ratio: 0, label: "0 of 0 applications approved (0%)" };
    const ratio = Math.round((approved / total) * 100);
    return {
      ratio,
      label: `${approved} of ${total} applications approved (${ratio}%)`,
    };
  }, [stats]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert("Exit App", "Are you sure you want to exit?", [
          { text: "Cancel", style: "cancel" },
          { text: "YES", onPress: () => BackHandler.exitApp() }
        ]);
        return true;
      };
      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [])
  );


  const fetchData = async () => {
    try {
      setLoading(true);
      const authDataStr = await AsyncStorage.getItem("authData");
      if (!authDataStr) return;
      const authData = JSON.parse(authDataStr);
      const token = authData.token;

      // 1. User Profile
      const profileRes = await getUserProfile(token);
      if (profileRes.success && profileRes.data?.user) {
        const u = profileRes.data.user;
        setUser(u);
        const name = u.fullname || `${u.firstname || ""} ${u.lastname || ""}`.trim() || "Teacher";
        setStudentName(name);
        if (u.profileimageurl) setProfilePhotoUrl(u.profileimageurl);
      }

      // 2. Mobilizer Dashboard Stats (NEW API)
      try {
        const statsRes = await getMobilizerDashboardStats(token);
        if (statsRes.success && statsRes.data?.stats) {
          setStats(statsRes.data.stats);
        }
      } catch (e) {
        console.log("Error fetching mobilizer dashboard stats", e);
      }

      // 3. Upcoming Deadlines (Mobilizer API)
      try {
        const upcomingRes = await getMobilizerUpcomingDeadlines(token, 3);
        if (upcomingRes.success) {
          // Handle different potential response structures
          const deadlines = upcomingRes.data?.data || upcomingRes.data?.scholarships || [];
          if (Array.isArray(deadlines)) {
            setUpcomingDeadlines(deadlines);
          }
        }
      } catch (e) {
        console.log("Error fetching upcoming deadlines", e);
      }

      // 4. Get Students & Recommended Scholarships
      try {
        const studRes = await getMobilizerStudents(token, 1, 10); // Fetch first 10 students for the tabs
        if (studRes.success) {
          const studentList = studRes.data?.students || [];
          if (Array.isArray(studentList)) {
            setStudents(studentList);

            // If we have students, fetch recommended scholarships for the first one (or currently selected)
            if (studentList.length > 0) {
              const targetId = selectedStudentId || studentList[0].id;
              if (!selectedStudentId) setSelectedStudentId(targetId);

              setLoadingRecommendations(true);
              try {
                const recRes = await getMobilizerRecommendedScholarships(token, targetId);
                if (recRes.success) {
                  const recs = recRes.data?.students || recRes.data?.data || recRes.data?.scholarships || [];
                  if (Array.isArray(recs)) {
                    setRecommendedScholarships(recs);
                  }
                }
              } catch (err) {
                console.log("Error fetching recommended scholarships", err);
              } finally {
                setLoadingRecommendations(false);
              }
            }
          }
        }
      } catch (e) {
        console.log("Error fetching students", e);
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleStudentSelect = async (studentId: number) => {
    if (studentId === selectedStudentId) return;

    setSelectedStudentId(studentId);
    setRecommendedScholarships([]); // Clear current list
    setLoadingRecommendations(true);

    try {
      const authDataStr = await AsyncStorage.getItem("authData");
      if (!authDataStr) return;
      const { token } = JSON.parse(authDataStr);

      const recRes = await getMobilizerRecommendedScholarships(token, studentId);
      if (recRes.success) {
        const recs = recRes.data?.data || recRes.data?.scholarships || [];
        if (Array.isArray(recs)) {
          setRecommendedScholarships(recs);
        }
      }
    } catch (err) {
      console.log("Error fetching recommended scholarships", err);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleBookmark = async (scholarshipId: number, currentStatus: boolean, studentId: number) => {
    // Optimistic update
    setRecommendedScholarships(prev => prev.map(s =>
      (s.scholarship_id === scholarshipId || s.id === scholarshipId)
        ? { ...s, bookmarked: !currentStatus }
        : s
    ));

    try {
      const authDataStr = await AsyncStorage.getItem("authData");
      if (!authDataStr) return;
      const { token } = JSON.parse(authDataStr);

      const action = !currentStatus ? "bookmark" : "unbookmark";
      const response = await bookmarkScholarship(token, scholarshipId, action);
      if (!response.success) {
        throw new Error(response.message || "Failed to update bookmark");
      }
      setToast({ visible: true, message: response.message || `Scholarship ${action === "bookmark" ? "bookmarked" : "removed from bookmarks"}`, type: "success" });
    } catch (error: any) {
      // Revert
      setRecommendedScholarships(prev => prev.map(s =>
        (s.scholarship_id === scholarshipId || s.id === scholarshipId)
          ? { ...s, bookmarked: currentStatus }
          : s
      ));
      setToast({ visible: true, message: error.message || "Failed to update bookmark", type: "error" });
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      {/* Header Section */}
      <View style={[styles.header, { paddingTop: inset.top + 20 }]}>
        <View style={styles.headerContent}>
          <View style={styles.welcomeSection}>
            <Text style={[styles.welcomeText, { color: isDark ? colors.textSecondary : "#666" }]}>Hi,</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.userName, { color: colors.text }]}>{studentName}</Text>
              <HelloWave />
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-notifications")}
              style={styles.bellWrapper}
              activeOpacity={0.8}
            >
              <Ionicons
                name="notifications-outline"
                size={26}
                color={isDark ? colors.text : "#333"}
              />
              {notifications.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-profile")}
              activeOpacity={0.8}
            >
              {profilePhotoUrl ? (
                <Image
                  source={{
                    uri: profilePhotoUrl.includes('?')
                      ? `${profilePhotoUrl}&t=${Date.now()}`
                      : `${profilePhotoUrl}?t=${Date.now()}`
                  }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                    {studentName.charAt(0)}
                  </Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >

        {/* Mobilizer Statistics - same design as student dashboard */}
        <View style={styles.statsContainer}>
          <View style={[styles.applicationStatusCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBox, { backgroundColor: "#673AB715" }]}>
                <Ionicons name="analytics-outline" size={20} color="#673AB7" />
              </View>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Mobilizer Overview</Text>
            </View>

            <View style={styles.statusGrid}>
              {/* Row 1: Students Added, Applications Created */}
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#2196F315" }]}>
                    <Ionicons name="people-outline" size={20} color="#2196F3" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.total_students_added.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Students Added</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#2196F330" : "#2196F320" }]}>
                    <View style={[styles.statusBarFill, { width: stats.total_students_added > 0 ? "100%" : "0%", backgroundColor: "#2196F3" }]} />
                  </View>
                </View>
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#673AB715" }]}>
                    <Ionicons name="document-text-outline" size={20} color="#673AB7" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.total_applications_created.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Applications</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#673AB730" : "#673AB720" }]}>
                    <View style={[styles.statusBarFill, { width: stats.total_applications_created > 0 ? "100%" : "0%", backgroundColor: "#673AB7" }]} />
                  </View>
                </View>
              </View>

              {/* Row 2: In Progress, Approved */}
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#FF980015" }]}>
                    <Ionicons name="time-outline" size={20} color="#FF9800" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.applications_in_progress.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>In Progress</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#FF980030" : "#FF980020" }]}>
                    <View style={[styles.statusBarFill, {
                      width: stats.total_applications_created > 0 ? `${(stats.applications_in_progress / stats.total_applications_created) * 100}%` : "0%",
                      backgroundColor: "#FF9800"
                    }]} />
                  </View>
                </View>
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#4CAF5015" }]}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.applications_approved.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Approved</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#4CAF5030" : "#4CAF5020" }]}>
                    <View style={[styles.statusBarFill, {
                      width: stats.total_applications_created > 0 ? `${(stats.applications_approved / stats.total_applications_created) * 100}%` : "0%",
                      backgroundColor: "#4CAF50"
                    }]} />
                  </View>
                </View>
              </View>

              {/* Row 3: Rejected, Bookmarked */}
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#F4433615" }]}>
                    <Ionicons name="close-circle-outline" size={20} color="#F44336" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.applications_rejected.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Rejected</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#F4433630" : "#F4433620" }]}>
                    <View style={[styles.statusBarFill, {
                      width: stats.total_applications_created > 0 ? `${(stats.applications_rejected / stats.total_applications_created) * 100}%` : "0%",
                      backgroundColor: "#F44336"
                    }]} />
                  </View>
                </View>
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#FFB40015" }]}>
                    <Ionicons name="bookmark" size={20} color="#FFB400" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.scholarships_bookmarked.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Bookmarked</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#FFB40030" : "#FFB40020" }]}>
                    <View style={[styles.statusBarFill, { width: stats.scholarships_bookmarked > 0 ? "100%" : "0%", backgroundColor: "#FFB400" }]} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Upcoming Deadlines */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Deadlines</Text>

          </View>
          <View style={[styles.cardList, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden' }]}>
            {upcomingDeadlines.map((item, index) => {
              const daysLeft = item.days_remaining;
              let badgeColor = "#4CAF50"; // Green
              let badgeText = "#E8F5E9"; // Light Green bg

              if (daysLeft <= 7) {
                badgeColor = "#F44336"; // Red
                badgeText = "#FFEBEE"; // Light Red bg
              } else if (daysLeft <= 30) {
                badgeColor = "#FF9800"; // Orange
                badgeText = "#FFF3E0"; // Light Orange bg
              }

              return (
                <TouchableOpacity
                  key={item.scholarship_id || index}
                  style={[
                    styles.listItem,
                    { borderBottomColor: colors.border },
                    index === upcomingDeadlines.length - 1 && { borderBottomWidth: 0 }
                  ]}
                  onPress={() => router.push({ pathname: "/(dashboard)/mobilizer/mobilizer-scholarship-details", params: { scholarshipId: item.scholarship_id } })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.listItemIcon, { backgroundColor: badgeText }]}>
                    <Ionicons name="time-outline" size={20} color={badgeColor} />
                  </View>
                  <View style={styles.listItemBody}>
                    <Text style={[styles.listItemTitle, { color: colors.text }]}>{item.scholarship_name}</Text>
                    <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>
                      Deadline: {new Date(item.deadline).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: badgeText,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    marginLeft: 8
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: badgeColor }}>
                      {daysLeft} days
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {upcomingDeadlines.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No upcoming deadlines</Text>
              </View>
            )}
          </View>
        </View>



        {/* Recommended Scholarships */}
        <View style={styles.sectionContainer}>
          <View style={styles.recommendedHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>Recommended Scholarships</Text>
              {students.length > 0 && selectedStudentId && (() => {
                const selected = students.find((s) => s.id === selectedStudentId);
                const name = selected?.fullname || (selected ? `${selected.firstname || ""} ${selected.lastname || ""}`.trim() : "");
                return name ? (
                  <Text style={[styles.recommendedSubtitle, { color: colors.textSecondary }]}>
                    Matching scholarships for {name}
                  </Text>
                ) : null;
              })()}
            </View>
          </View>

          {students.length > 0 ? (
            <View>
              {/* Student selector */}
              <Text style={[styles.studentSelectorLabel, { color: colors.textSecondary }]}>Select student</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.studentTabsContainer}
                style={styles.studentTabsScroll}
              >
                {students.map((student) => {
                  const isSelected = selectedStudentId === student.id;
                  const appCount = student.applications_count ?? 0;
                  const displayName = student.fullname || `${student.firstname || ""} ${student.lastname || ""}`.trim() || "Student";
                  return (
                    <TouchableOpacity
                      key={student.id}
                      style={[
                        styles.studentTab,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary + "18" : (isDark ? colors.card : "#f8f8f8"),
                          shadowColor: isSelected ? colors.primary : "#000",
                          shadowOpacity: isSelected ? 0.15 : 0.04,
                        }
                      ]}
                      onPress={() => handleStudentSelect(student.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.studentTabAvatar, { backgroundColor: isSelected ? colors.primary : (isDark ? "#555" : "#ccc") }]}>
                        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
                          {(student.firstname || displayName).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.studentTabTextWrap}>
                        <Text style={[styles.studentTabText, { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? "700" : "500" }]} numberOfLines={1}>
                          {displayName}
                        </Text>

                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Scholarship List */}
              {loadingRecommendations ? (
                <View style={[styles.loadingContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ marginTop: 10, color: colors.textSecondary, fontSize: 13 }}>Loading recommendations for this student...</Text>
                </View>
              ) : (
                <View style={styles.cardGrid}>
                  {recommendedScholarships.map((item, index) => {
                    const isActive = item.status === "active" && !item.expired;
                    const summaryText = item.summary ? item.summary.replace(/<[^>]+>/g, "").trim() : "";
                    const categoryColor = item.category ? (isDark ? "#5C6BC0" : "#5C6BC0") : colors.primary;

                    return (
                      <TouchableOpacity
                        key={item.id || item.scholarship_id || index}
                        activeOpacity={0.95}
                        onPress={() => router.push({ pathname: "/(dashboard)/mobilizer/mobilizer-scholarship-details", params: { scholarshipId: item.id || item.scholarship_id } })}
                        style={[
                          styles.scholarshipCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: item.expired ? (isDark ? "#444" : "#e0e0e0") : colors.border,
                            borderLeftWidth: 4,
                            borderLeftColor: item.has_applied ? "#4CAF50" : item.expired ? "#9E9E9E" : categoryColor,
                            opacity: item.expired ? 0.85 : 1,
                          }
                        ]}
                      >
                        <View style={styles.recCardTop}>
                          <View style={styles.recCardTitleRow}>
                            {item.category ? (
                              <View style={[styles.recCategoryPill, { backgroundColor: categoryColor + "22" }]}>
                                <View style={[styles.recCategoryDot, { backgroundColor: categoryColor }]} />
                                <Text style={[styles.recCategoryText, { color: categoryColor }]} numberOfLines={1}>
                                  {item.category}
                                </Text>
                              </View>
                            ) : null}
                            <View style={{ flex: 1 }} />
                            <TouchableOpacity
                              onPress={(e) => { e?.stopPropagation?.(); handleBookmark(item.id || item.scholarship_id, item.bookmarked, selectedStudentId || 0); }}
                              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                              style={styles.recBookmarkWrap}
                            >
                              <Ionicons name={item.bookmarked ? "bookmark" : "bookmark-outline"} size={22} color={item.bookmarked ? colors.primary : colors.textSecondary} />
                            </TouchableOpacity>
                          </View>
                          <Text style={[styles.recCardTitle, { color: colors.text }]} numberOfLines={2}>
                            {item.name || item.scholarship_name}
                          </Text>
                          {item.provider ? (
                            <Text style={[styles.recCardProvider, { color: colors.textSecondary }]} numberOfLines={1}>
                              by {item.provider}
                            </Text>
                          ) : null}
                        </View>

                        {summaryText ? (
                          <Text style={[styles.recCardSummary, { color: colors.textSecondary }]} numberOfLines={2}>
                            {summaryText}
                          </Text>
                        ) : null}

                        <View style={[styles.recCardDivider, { backgroundColor: colors.border }]} />

                        <View style={styles.recCardFooter}>
                          <View style={styles.recDeadlineWrap}>
                            {item.expired ? (
                              <>
                                <Ionicons name="close-circle-outline" size={16} color="#F44336" />
                                <Text style={[styles.recDeadlineText, { color: "#F44336" }]}>Expired</Text>
                              </>
                            ) : item.has_applied ? (
                              <>
                                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                <Text style={[styles.recDeadlineText, { color: "#4CAF50" }]}>Applied</Text>
                              </>
                            ) : item.deadline ? (
                              <>
                                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                                <Text style={[styles.recDeadlineText, { color: colors.textSecondary }]}>
                                  Due {new Date(item.deadline).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                                </Text>
                              </>
                            ) : (
                              <>
                                <Ionicons name="infinite-outline" size={16} color={colors.textSecondary} />
                                <Text style={[styles.recDeadlineText, { color: colors.textSecondary }]}>Always open</Text>
                              </>
                            )}
                          </View>
                          <View style={[styles.recViewBtn, { backgroundColor: colors.primary }]}>
                            <Text style={styles.recViewBtnText}>View Details</Text>
                            <Ionicons name="arrow-forward" size={14} color="#fff" />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {recommendedScholarships.length === 0 && (
                    <View style={[styles.recEmptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Ionicons name="school-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                      <Text style={[styles.recEmptyTitle, { color: colors.text }]}>No recommendations yet</Text>
                      <Text style={[styles.recEmptySub, { color: colors.textSecondary }]}>
                        Recommendations are based on this student&apos;s profile. Add more students or try another.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.recEmptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="people-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={[styles.recEmptyTitle, { color: colors.text }]}>Add students first</Text>
              <Text style={[styles.recEmptySub, { color: colors.textSecondary }]}>
                Add students from My Students to see personalized scholarship recommendations here.
              </Text>
            </View>
          )}
        </View>

        {/* Application Progress Tracker */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Application Progress</Text>
          <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(51,51,51,0.08)" }]}>
            <View
              style={[styles.progressFill, { width: `${progress.ratio}%` }]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: colors.text }]}>{progress.label}</Text>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.featuresContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.featuresGrid}>
            {mobilizerFeatures.map((feature) => (
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
                  router.push(feature.route as any);
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
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
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
    marginRight: 16,
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
    top: -4,
    right: -4,
    minWidth: 16,
    minHeight: 16,
    borderRadius: 8,
    backgroundColor: "#F44336",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 2,
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
    alignItems: "center",
    justifyContent: "center",
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 24,
  },
  applicationStatusCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
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
    minWidth: 0,
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
  featuresContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  viewAllText: {
    fontWeight: "600",
  },
  cardList: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
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
  },
  listItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    marginBottom: 2,
  },
  listItemSub: {
    fontSize: 12,
  },
  emptyState: {
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
  },
  cardGrid: {
    gap: 12,
  },
  scholarshipCard: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    padding: 16,
  },
  scholarshipTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  scholarshipAmount: {
    fontSize: 13,
    marginBottom: 12,
  },
  scholarshipActions: {
    flexDirection: "row",
    gap: 8,
  },
  progressBar: {
    width: "100%",
    height: 10,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
  },
  progressLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: "#000",
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
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  recommendedHeader: {
    marginBottom: 12,
  },
  recommendedSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  studentSelectorLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  studentTabsContainer: {
    paddingRight: 20,
    gap: 10,
  },
  studentTabsScroll: {
    marginBottom: 20,
  },
  studentTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  studentTabAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  studentTabTextWrap: {
    flex: 0,
    maxWidth: 140,
  },
  studentTabText: {
    fontSize: 14,
  },
  studentTabMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  loadingContainer: {
    padding: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
  },
  recCardTop: {
    marginBottom: 10,
  },
  recCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  recCategoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    alignSelf: "flex-start",
  },
  recCategoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recCategoryText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  recBookmarkWrap: {
    padding: 4,
  },
  recCardTitle: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  recCardProvider: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  recCardSummary: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  recCardDivider: {
    height: 1,
    marginBottom: 12,
  },
  recCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recDeadlineWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recDeadlineText: {
    fontSize: 12,
    fontWeight: "600",
  },
  recViewBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  recViewBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  recEmptyCard: {
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  recEmptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  recEmptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  scholarshipDetailTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 22,
  },
  providerName: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '500',
  },
  amountText: {
    fontWeight: '700',
    marginTop: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#eee', // Will be overridden or masked by theme context usually, but for now simple
    opacity: 0.1, // rely on background color contrast
    marginBottom: 12,
  },
  deadlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  appliedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appliedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
