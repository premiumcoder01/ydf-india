import { HelloWave } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getAllScholarships, getBookmarkedScholarships, getMyApplications, getNotifications, getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
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
];

export default function StudentMobilizerDashboard() {
  const { isDark, colors } = useTheme();
  const inset = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [studentName, setStudentName] = useState("Teacher");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    scholarships: 0,
    applied: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });

  const [notifications, setNotifications] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [bookmarkedApps, setBookmarkedApps] = useState<any[]>([]);

  // Reuse student dashboard progress logic
  const progress = useMemo(() => {
    const approved = stats.approved;
    const total = stats.applied + stats.pending + stats.rejected + stats.approved;
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

      // 2. Scholarships (For count and deadlines)
      const scholarRes = await getAllScholarships(token, { per_page: 50 });
      if (scholarRes.success) {
        const list = scholarRes.data?.data?.data || scholarRes.data?.data || [];
        setStats(prev => ({ ...prev, scholarships: list.length }));

        // Filter for upcoming deadlines
        const today = new Date();
        const upcoming = list
          .filter((s: any) => {
            const date = s.application_deadline || s.end_date;
            if (!date) return false;
            const d = new Date(date);
            return d >= today;
          })
          .sort((a: any, b: any) => new Date(a.end_date || 0).getTime() - new Date(b.end_date || 0).getTime())
          .slice(0, 3); // Slice to 3 similar to student dashboard
        setUpcomingDeadlines(upcoming);
      }

      // 3. My Applications (For stats)
      try {
        const appsRes = await getMyApplications(token);
        if (appsRes.success) {
          const apps = appsRes.data?.data || [];
          let applied = apps.length;
          let approved = apps.filter((a: any) => a.status === 'approved').length;
          let pending = apps.filter((a: any) => a.status === 'pending' || a.status === 'submitted').length;
          let rejected = apps.filter((a: any) => a.status === 'rejected').length;
          setStats(prev => ({ ...prev, applied, approved, pending, rejected }));
        }
      } catch (e) {
        console.log("Error fetching applications", e);
      }

      // 4. Notifications
      const notifRes = await getNotifications(token, { per_page: 3 });
      if (notifRes.success) {
        setNotifications(notifRes.data?.notifications || []);
      }

      // 5. Bookmarked Scholarships
      const bookmarkRes = await getBookmarkedScholarships(token);
      if (bookmarkRes.success) {
        setBookmarkedApps(bookmarkRes.data?.data || []);
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
            <Text style={[styles.userName, { color: colors.text }]}>{studentName}</Text>
            <HelloWave />
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

        {/* Scholarship Overview Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.applied}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Applied</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.approved}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.pending}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.rejected}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rejected</Text>
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
            {upcomingDeadlines.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.listItem,
                  { borderBottomColor: colors.border },
                  index === upcomingDeadlines.length - 1 && { borderBottomWidth: 0 }
                ]}
                onPress={() => router.push({ pathname: "/(dashboard)/mobilizer/mobilizer-scholarship-details", params: { scholarshipId: item.id } })}
                activeOpacity={0.8}
              >
                <View style={[styles.listItemIcon, { backgroundColor: "#FFF3E0" }]}>
                  <Ionicons name="time-outline" size={18} color="#FF9800" />
                </View>
                <View style={styles.listItemBody}>
                  <Text style={[styles.listItemTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>End: {new Date(item.application_deadline || item.end_date).toLocaleDateString()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
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
            {notifications.slice(0, 3).map((n, i) => (
              <TouchableOpacity
                key={i}
                style={styles.listItem}
                onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-notifications")}
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
                  <Text numberOfLines={1} style={styles.listItemTitle}>{n.subject}</Text>
                  <Text numberOfLines={1} style={styles.listItemSub}>{n.smallmessage}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </TouchableOpacity>
            ))}
            {notifications.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notifications</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recommended Scholarships - Empty for now but keeping UI structure */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommended Scholarships</Text>
          <View style={styles.cardGrid}>
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recommendations yet</Text>
            </View>
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
});
