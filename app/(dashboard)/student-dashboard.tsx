import { Button } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  Image,
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
  // {
  //   id: 5,
  //   title: "Reminders",
  //   description: "Track deadlines and important dates",
  //   icon: "calendar-outline",
  //   color: "#9C27B0",
  // },
];

export default function StudentDashboardScreen() {
  const { isDark, colors } = useTheme();
  const [studentName, setStudentName] = useState("Student");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [unreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
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

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        // Get auth token from AsyncStorage
        const authDataString = await AsyncStorage.getItem("authData");
        if (!authDataString) {
          console.log("No auth data found");
          setLoading(false);
          return;
        }

        const authData = JSON.parse(authDataString);
        const token = authData?.token;

        if (!token) {
          console.log("No token found in auth data");
          setLoading(false);
          return;
        }

        // Call getUserProfile API
        const response = await getUserProfile(token);

        // Response structure: { success: true, data: { success: true, user: {...} } }
        if (response.success && response.data?.user) {
          const user = response.data.user;

          // Update student name (use fullname if available, otherwise firstname + lastname)
          const name = user.fullname ||
            `${user.firstname || ""} ${user.lastname || ""}`.trim() ||
            "Student";
          setStudentName(name);

          // Update profile photo URL if available
          if (user.profileimageurl) {
            setProfilePhotoUrl(user.profileimageurl);
          }
        } else {
          console.log("Failed to fetch user profile:", response.error || response.message);
          // Fallback to authData user info if API fails
          if (authData?.user) {
            const user = authData.user;
            const name = user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Student";
            setStudentName(name);
            if (user.profileimageurl) {
              setProfilePhotoUrl(user.profileimageurl);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Fallback to authData user info on error
        try {
          const authDataString = await AsyncStorage.getItem("authData");
          if (authDataString) {
            const authData = JSON.parse(authDataString);
            if (authData?.user) {
              const user = authData.user;
              const name = user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Student";
              setStudentName(name);
              if (user.profileimageurl) {
                setProfilePhotoUrl(user.profileimageurl);
              }
            }
          }
        } catch (fallbackError) {
          console.error("Error in fallback:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);



  const [statusCounts] = useState({
    applied: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });

  const [upcomingDeadlines] = useState<
    Array<{ id: string; title: string; deadline: string }>
  >([]);
  const [recentNotifications] = useState<
    Array<{ id: string; title: string; timeAgo: string }>
  >([]);

  const [recommendedScholarships] = useState<
    Array<{ id: string; title: string; amount: string }>
  >([]);

  const progress = useMemo(() => {
    const approved = statusCounts.approved;
    const total =
      statusCounts.applied +
      statusCounts.pending +
      statusCounts.rejected +
      statusCounts.approved;
    if (total === 0) return { ratio: 0, label: "0 of 0 approved (0%)" };
    const ratio = Math.round((approved / total) * 100);
    return {
      ratio,
      label: `${approved} of ${total} applications approved (${ratio}%)`,
    };
  }, [statusCounts]);

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

        {/* Notifications Preview */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
          <View style={[styles.cardList, { backgroundColor: colors.card, borderColor: colors.textSecondary }]}>
            {recentNotifications.slice(0, 3).map((n) => (
              <TouchableOpacity
                key={n.id}
                style={styles.listItem}
                onPress={() =>
                  router.push("/(dashboard)/student/student-notifications")
                }
                activeOpacity={0.8}
              >
                <View style={styles.listItemIcon}>
                  <Ionicons
                    name="notifications-outline"
                    size={18}
                    color="#2196F3"
                  />
                </View>
                <View style={styles.listItemBody}>
                  <Text style={styles.listItemTitle}>{n.title}</Text>
                  <Text style={styles.listItemSub}>{n.timeAgo}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </TouchableOpacity>
            ))}
            {recentNotifications.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notifications</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recommended Scholarships */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommended Scholarships</Text>
          <View style={styles.cardGrid}>
            {recommendedScholarships.slice(0, 5).map((s) => (
              <View key={s.id} style={styles.scholarshipCard}>
                <Text style={styles.scholarshipTitle}>{s.title}</Text>
                <Text style={styles.scholarshipAmount}>{s.amount}</Text>
                <View style={styles.scholarshipActions}>
                  <Button
                    title="View"
                    variant="secondary"
                    onPress={() =>
                      router.push(
                        "/(dashboard)/student/student-scholarship-details"
                      )
                    }
                  />
                  <Button
                    title="Apply"
                    variant="primary"
                    onPress={() =>
                      router.push("/(dashboard)/student/student-apply-form")
                    }
                  />
                </View>
              </View>
            ))}
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
});

