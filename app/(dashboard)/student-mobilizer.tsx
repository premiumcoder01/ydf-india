import { DashboardHeader, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getMobilizerDashboardStats, getMobilizerStudents, getMobilizerUpcomingDeadlines, getNotifications, getUserProfile, mobilizerRemoveStudent } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { MotiView } from 'moti';
import React, { useCallback, useMemo, useState } from "react";
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

const mobilizerFeatures = [

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
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [students, setStudents] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
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

            // Optional: If we need any initial selection logic, but for now we just show the student cards
            if (studentList.length > 0 && !selectedStudentId) {
              setSelectedStudentId(studentList[0].id);
            }
          }
        }
      } catch (e) {
        console.log("Error fetching students", e);
      }

      // 5. Notifications
      try {
        const notifRes = await getNotifications(token);
        if (notifRes.success && notifRes.data) {
          let raw: any[] = [];
          if (Array.isArray(notifRes.data)) raw = notifRes.data;
          else if (Array.isArray(notifRes.data.data)) raw = notifRes.data.data;
          else if (Array.isArray(notifRes.data.notifications)) raw = notifRes.data.notifications;

          setNotifications(raw);
          setUnreadCount(raw.filter((n: any) => !n.is_read).length);
        }
      } catch (e) {
        console.log("Error fetching notifications", e);
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

  const getInitials = (firstname?: string, lastname?: string) => {
    const first = (firstname || "S").charAt(0).toUpperCase();
    const last = (lastname || "").charAt(0).toUpperCase();
    return last ? `${first}${last}` : first;
  };

  const getAvatarColor = (id: number) => {
    const colorsList = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#6C5CE7", "#A29BFE", "#FD79A8", "#FDCB6E", "#00B894", "#0984E3", "#E17055"];
    return colorsList[id % colorsList.length];
  };

  const handleStudentPress = (student: any) => {
    const name = student.fullname || `${student.firstname || ""} ${student.lastname || ""}`.trim() || "Student";
    router.push({
      pathname: "/(dashboard)/mobilizer/student-scholarships",
      params: { studentId: student.id, studentName: name }
    });
  };

  const handleRemoveStudent = async (studentId: number, studentName: string) => {
    Alert.alert(
      "Remove Student",
      `Are you sure you want to remove ${studentName} from your panel?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const authDataStr = await AsyncStorage.getItem("authData");
              if (!authDataStr) return;
              const { token } = JSON.parse(authDataStr);
              const response = await mobilizerRemoveStudent(token, studentId);

              if (response.success) {
                setToast({ visible: true, message: response.message || "Student removed", type: "success" });
                fetchData();
              } else {
                setToast({ visible: true, message: response.error || "Failed to remove", type: "error" });
              }
            } catch (err) {
              setToast({ visible: true, message: "An error occurred", type: "error" });
            }
          }
        }
      ]
    );
  };


  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      {/* Header Section */}
      <DashboardHeader
        userName={studentName}
        profilePhotoUrl={profilePhotoUrl}
        unreadCount={unreadCount}
        onNotificationPress={() => router.push("/(dashboard)/mobilizer/mobilizer-notifications")}
        onProfilePress={() => router.push("/(dashboard)/mobilizer/mobilizer-profile")}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >

        {/* Mobilizer Statistics */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.statsContainer}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Mobilizer Overview</Text>
          <View style={{ gap: 10 }}>
            {/* Row 1 */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={{ flex: 1, borderRadius: 20, padding: 16, elevation: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="people" size={16} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{stats.total_students_added}</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Students Added</Text>
              </LinearGradient>

              <LinearGradient colors={['#8B5CF6', '#5B21B6']} style={{ flex: 1, borderRadius: 20, padding: 16, elevation: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="document-text" size={16} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{stats.total_applications_created}</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Applications</Text>
              </LinearGradient>
            </View>

            {/* Row 2 */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <LinearGradient colors={['#FF9800', '#F57C00']} style={{ flex: 1, borderRadius: 20, padding: 16, elevation: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="time" size={16} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{stats.applications_in_progress}</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.3 }}>In Progress</Text>
              </LinearGradient>

              <LinearGradient colors={['#10B981', '#059669']} style={{ flex: 1, borderRadius: 20, padding: 16, elevation: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{stats.applications_approved}</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Approved</Text>
              </LinearGradient>
            </View>

            {/* Row 3 */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <LinearGradient colors={['#EF4444', '#B91C1C']} style={{ flex: 1, borderRadius: 20, padding: 16, elevation: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="close-circle" size={16} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{stats.applications_rejected}</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Rejected</Text>
              </LinearGradient>

              <LinearGradient colors={['#F59E0B', '#D97706']} style={{ flex: 1, borderRadius: 20, padding: 16, elevation: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="bookmark" size={16} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{stats.scholarships_bookmarked}</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Bookmarked</Text>
              </LinearGradient>
            </View>
          </View>
        </MotiView>




        {/* Recommended Scholarship Eligibility Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.recommendedHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>Find Scholarships for Students</Text>
              <Text style={[styles.recommendedSubtitle, { color: colors.textSecondary }]}>
                Select a student to view personalized scholarship recommendations
              </Text>
            </View>
          </View>

          {students.length > 0 ? (
            <View style={styles.studentCardGrid}>
              {students.slice(0, 4).map((student) => {
                const avatarColor = getAvatarColor(student.id);
                const initials = getInitials(student.firstname, student.lastname);
                const displayName = student.fullname || `${student.firstname || ""} ${student.lastname || ""}`.trim() || "Student";

                let customFields: any = {};
                try {
                  if (typeof student.custom_fields === 'string') customFields = JSON.parse(student.custom_fields);
                  else if (typeof student.custom_fields === 'object') customFields = student.custom_fields;
                } catch (e) { }

                const isAcademicEmpty = !student.academic_level && (!customFields?.course || customFields?.course === 'Select');
                const academic = isAcademicEmpty ? "Academic Details Pending" : (student.academic_level || customFields?.course);

                return (
                  <View
                    key={student.id}
                    style={[
                      styles.studentHorizontalCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0',
                        shadowColor: isDark ? "#000" : colors.primary,
                        shadowOpacity: isDark ? 0.3 : 0.08,
                        shadowRadius: 12,
                        elevation: 4,
                        padding: 14,
                        marginBottom: 10,
                      }
                    ]}
                  >
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}
                      onPress={() => handleStudentPress(student)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.studentCardAvatar, { backgroundColor: avatarColor + "15", borderWidth: 2, borderColor: avatarColor + "40" }]}>
                        {student.picture && !student.picture.includes("gravatar.com/avatar/default") ? (
                          <Image source={{ uri: student.picture }} style={styles.studentAvatarImg} />
                        ) : (
                          <Text style={[styles.studentInitials, { color: avatarColor, fontWeight: '800' }]}>{initials}</Text>
                        )}
                      </View>

                      <View style={styles.studentCardInfo}>
                        <Text style={[styles.studentCardName, { color: colors.text, fontWeight: '800', fontSize: 16 }]} numberOfLines={1}>
                          {displayName}
                        </Text>
                        <View style={styles.studentCardDetailRow}>
                          <Ionicons name="school-outline" size={13} color={isAcademicEmpty ? "#FF9800" : colors.textSecondary} />
                          <Text style={[styles.studentCardDetail, { color: isAcademicEmpty ? "#FF9800" : colors.textSecondary }, isAcademicEmpty && { fontStyle: 'italic', fontSize: 11.5 }]} numberOfLines={1}>
                            {academic}
                          </Text>
                        </View>
                        <View style={styles.studentCardDetailRow}>
                          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                          <Text style={[styles.studentCardDetail, { color: colors.textSecondary }]} numberOfLines={1}>
                            {student.city && student.city !== 'IN' ? student.city : "India"}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.dashboardStudentActions}>
                      <TouchableOpacity 
                        onPress={() => router.push({ pathname: "/(dashboard)/mobilizer/mobilizer-student-profile", params: { studentId: student.id } })}
                        style={[styles.dashboardActionBtn, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9", paddingHorizontal: 10 }]}
                      >
                        <Ionicons name="person-outline" size={16} color={isDark ? "#94A3B8" : "#475569"} />
                        <Text style={[styles.dashboardActionText, { color: isDark ? "#94A3B8" : "#475569", marginLeft: 4 }]}>View</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={() => router.push({ pathname: "/(dashboard)/mobilizer/mobilizer-edit-student", params: { studentId: student.id } })}
                        style={[styles.dashboardActionBtn, { backgroundColor: isDark ? "#334155" : "#E2E8F0", paddingHorizontal: 12 }]}
                      >
                        <Ionicons name="pencil" size={16} color={isDark ? "#CBD5E1" : "#475569"} />
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => handleRemoveStudent(student.id, displayName)}
                        style={[styles.dashboardDeleteBtn, { backgroundColor: isDark ? "#450A0A" : "#FEF2F2" }]}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              <TouchableOpacity
                style={[styles.viewAllStudentsBtn, { borderColor: colors.primary }]}
                onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-students")}
              >
                <Text style={[styles.viewAllStudentsText, { color: colors.primary }]}>View All Students</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.recEmptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="people-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={[styles.recEmptyTitle, { color: colors.text }]}>Add students first</Text>
              <Text style={[styles.recEmptySub, { color: colors.textSecondary }]}>
                Add students from My Students to see personalized scholarship recommendations here.
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-add-student")}
              >
                <Text style={styles.emptyActionText}>Add Student</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Application Progress Tracker */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 300 }}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Application Progress</Text>
          <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(51,51,51,0.05)", height: 10, borderRadius: 5, overflow: 'hidden' }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress.ratio}%`,
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 5,
                  elevation: 2
                }
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 8 }]}>{progress.label}</Text>
        </MotiView>

        {/* Quick Actions Grid */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 450 }}
          style={styles.featuresContainer}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Operational Hub</Text>
          <View style={styles.featuresGrid}>
            {mobilizerFeatures.map((feature) => (
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
                  router.push(feature.route as any);
                }}
              >
                <View style={[styles.featureContent, { padding: 0, gap: 12 }]}>
                  <LinearGradient
                    colors={[feature.color, feature.color + 'aa']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.featureIcon,
                      { width: 42, height: 42, borderRadius: 12, marginRight: 0 },
                    ]}
                  >
                    <Ionicons
                      name={feature.icon as any}
                      size={20}
                      color="#fff"
                    />
                  </LinearGradient>
                  <View style={styles.featureInfo}>
                    <Text style={[styles.featureTitle, { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 2 }]}>{feature.title}</Text>
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
  studentCardGrid: {
    gap: 12,
  },
  studentHorizontalCard: {
    flexDirection: 'column',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  studentCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  studentAvatarImg: {
    width: '100%',
    height: '100%',
  },
  studentInitials: {
    fontSize: 18,
    fontWeight: '700',
  },
  studentCardInfo: {
    flex: 1,
  },
  studentCardName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  studentCardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  studentCardDetail: {
    fontSize: 12,
    fontWeight: '500',
  },
  studentCardAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  viewAllStudentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
    gap: 8,
  },
  viewAllStudentsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyActionBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  dashboardStudentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  dashboardActionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dashboardActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dashboardDeleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
