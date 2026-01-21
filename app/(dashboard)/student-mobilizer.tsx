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
    route: "/(dashboard)/mobilizer/mobilizer-scholarship-listing",
    params: { bookmarkedOnly: "true" }
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
                  // Note: The structure might be different based on the API response provided by user
                  // User provided example shows { success: true, students: [...] } for get_my_students
                  // But for recommended scholarships, we expect a list of scholarships.
                  // Let's assume standard response structure for now.
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
      // Note: The bookmark API might need student_id if it's bookmarking FOR a student, 
      // but based on standard API it seems to be for the logged-in user.
      // If the requirement is to bookmark for the student, the API would need student_id.
      // Assuming it uses the context of the logged-in mobilizer for now, or the API handles it.
      // Re-reading user request: "in recommeded scholarship please apply bookmar feature"
      // The provided API signature only takes scholarship_id and action.
      // It likely bookmarks for the user (mobilizer)?? Or maybe there's a different API for students.
      // Let's use the existing API for now.

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
                  source={{ uri: profilePhotoUrl }}
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

        {/* Mobilizer Statistics Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.total_students_added}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Students Added</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.total_applications_created}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Applications Created</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.applications_in_progress}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.applications_approved}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.applications_rejected}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rejected</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.scholarships_bookmarked}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bookmarked</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Deadlines */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Deadlines</Text>
            <TouchableOpacity
              onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-scholarship-listing")}
              accessibilityRole="button"
            >
              <Text style={[styles.viewAllText, { color: colors.text }]}>View All</Text>
            </TouchableOpacity>
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommended Scholarships</Text>

          {students.length > 0 ? (
            <View>
              {/* Student Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.studentTabsContainer}
                style={{ marginBottom: 16 }}
              >
                {students.map((student) => {
                  const isSelected = selectedStudentId === student.id;
                  return (
                    <TouchableOpacity
                      key={student.id}
                      style={[
                        styles.studentTab,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary + "15" : colors.card
                        }
                      ]}
                      onPress={() => handleStudentSelect(student.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.studentTabAvatar, { backgroundColor: isSelected ? colors.primary : "#ccc" }]}>
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                          {(student.firstname || "S").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[
                        styles.studentTabText,
                        { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? "700" : "400" }
                      ]}>
                        {student.firstname}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Scholarship List */}
              {loadingRecommendations ? (
                <View style={[styles.loadingContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: 12 }}>Loading recommendations...</Text>
                </View>
              ) : (
                <View style={styles.cardGrid}>
                  {recommendedScholarships.map((item, index) => {
                    const isClosed = item.status === 'closed';
                    const isActive = item.status === 'active';
                    // Simple HTML strip for summary preview if needed
                    const summaryText = item.summary ? item.summary.replace(/<[^>]+>/g, '') : '';

                    return (
                      <View
                        key={item.id || item.scholarship_id || index}
                        style={[
                          styles.scholarshipCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            borderLeftWidth: 4,
                            borderLeftColor: isActive ? colors.primary : colors.border
                          }
                        ]}
                      >
                        <View style={styles.cardHeader}>
                          <View style={{ flex: 1, marginRight: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                              {item.category && (
                                <View style={[styles.categoryBadge, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                                  <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                                    {item.category}
                                  </Text>
                                </View>
                              )}
                              <View style={[
                                styles.statusDot,
                                { backgroundColor: isActive ? '#4CAF50' : '#9E9E9E' }
                              ]} />
                            </View>

                            <Text style={[styles.scholarshipDetailTitle, { color: colors.text }]} numberOfLines={2}>
                              {item.name || item.scholarship_name}
                            </Text>

                            {item.provider && (
                              <Text style={[styles.providerName, { color: colors.textSecondary }]} numberOfLines={1}>
                                by {item.provider}
                              </Text>
                            )}
                          </View>

                          <TouchableOpacity
                            onPress={() => handleBookmark(item.id || item.scholarship_id, item.bookmarked, selectedStudentId || 0)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{ padding: 4 }}
                          >
                            <Ionicons
                              name={item.bookmarked ? "bookmark" : "bookmark-outline"}
                              size={24}
                              color={item.bookmarked ? colors.primary : colors.textSecondary}
                            />
                          </TouchableOpacity>
                        </View>

                        {/* Summary Preview */}
                        {summaryText ? (
                          <Text style={[styles.summaryText, { color: colors.textSecondary }]} numberOfLines={2}>
                            {summaryText}
                          </Text>
                        ) : null}

                        <View style={styles.cardDivider} />

                        <View style={styles.cardFooter}>
                          <View style={styles.deadlineInfo}>
                            {item.deadline ? (
                              <>
                                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                                <Text style={[styles.deadlineText, { color: colors.textSecondary }]}>
                                  Due {new Date(item.deadline).toLocaleDateString()}
                                </Text>
                              </>
                            ) : (
                              <>
                                <Ionicons name="infinite-outline" size={18} color={colors.textSecondary} />
                                <Text style={[styles.deadlineText, { color: colors.textSecondary }]}>
                                  Always Open
                                </Text>
                              </>
                            )}
                          </View>

                          <TouchableOpacity
                            style={[styles.viewDetailsBtn, { backgroundColor: colors.primary }]}
                            onPress={() => router.push({ pathname: "/(dashboard)/mobilizer/mobilizer-scholarship-details", params: { scholarshipId: item.id || item.scholarship_id } })}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.viewDetailsText}>View Details</Text>
                            <Ionicons name="arrow-forward" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>

                        {(item.has_applied) && (
                          <View style={styles.appliedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#fff" />
                            <Text style={styles.appliedText}>Applied</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                  {recommendedScholarships.length === 0 && (
                    <View style={[styles.emptyState, { backgroundColor: colors.card, borderRadius: 16, borderColor: colors.border, borderWidth: 1 }]}>
                      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recommendations for this student</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Add students to see recommendations</Text>
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
                  if (feature.params) {
                    router.push({ pathname: feature.route as any, params: feature.params });
                  } else {
                    router.push(feature.route as any);
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
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
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
  studentTabsContainer: {
    paddingRight: 20,
    gap: 12,
  },
  studentTab: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    paddingRight: 16,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
  },
  studentTabAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  studentTabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
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
