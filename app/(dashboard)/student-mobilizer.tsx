import { useTheme } from "@/context/ThemeContext";
import { getAllScholarships, getBookmarkedScholarships, getMyApplications, getNotifications, getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { MotiView } from "moti";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function StudentMobilizerDashboard() {
  const { isDark, colors } = useTheme();
  const inset = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

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
        setUser(profileRes.data.user);
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
          .slice(0, 5);
        setUpcomingDeadlines(upcoming);
      }

      // 3. My Applications (For stats) - Need to handle if API fails or returns differently
      // Mocking stats for demo if API doesn't return list immediately, but trying API first
      try {
        const appsRes = await getMyApplications(token);
        if (appsRes.success) {
          const apps = appsRes.data?.data || [];
          // Basic counters
          let applied = apps.length;
          let approved = apps.filter((a: any) => a.status === 'approved').length;
          let pending = apps.filter((a: any) => a.status === 'pending' || a.status === 'submitted').length;
          let rejected = apps.filter((a: any) => a.status === 'rejected').length;
          setStats(prev => ({ ...prev, applied, approved, pending, rejected }));
        }
      } catch (e) {
        // Fallback to 0 or mock
      }

      // 4. Notifications
      const notifRes = await getNotifications(token, { per_page: 3 });
      if (notifRes.success) {
        setNotifications(notifRes.data?.notifications || []);
      }

      // 5. Bookmarked Scholarships (Using API)
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

  const StatCard = ({ label, value, icon, color, delay }: any) => (
    <MotiView
      style={[styles.statCard, { backgroundColor: isDark ? colors.card : "#fff" }]}
    >
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </MotiView>
  );

  const QuickAction = ({ label, icon, color, route }: any) => (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: isDark ? colors.card : "#fff" }]}
      onPress={() => router.push(route)}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing && !user) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#f2c44d", justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={isDark ? colors.primary : "#333"} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#f2c44d" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#121212" : "#fff"} />
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      <View style={[styles.header, { paddingTop: inset.top + 20 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.welcomeText, { color: isDark ? colors.textSecondary : "#666" }]}>Welcome back,</Text>
          <Text style={[styles.userName, { color: isDark ? colors.text : "#333" }]}>
            {user ? (user.firstname || "Teacher") : "Teacher"}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#fff", alignItems: 'center', justifyContent: 'center' }}
            onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-notifications")}
          >
            <Ionicons name="notifications-outline" size={24} color={isDark ? colors.text : "#333"} />
            {notifications.length > 0 && (
              <View style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F44336' }} />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-profile")}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                {user?.firstname?.charAt(0) || "T"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Statistics Grid */}
        <View style={styles.statsGrid}>
          <StatCard label="Total Students" value="12" icon="people" color="#2196F3" delay={0} />
          <StatCard label="Applied" value={stats.applied} icon="paper-plane" color="#4CAF50" delay={100} />
          <StatCard label="Pending" value={stats.pending} icon="time" color="#FF9800" delay={200} />
          <StatCard label="Approved" value={stats.approved} icon="checkmark-circle" color="#00BCD4" delay={300} />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.text : "#333" }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <QuickAction label="Scholarships" icon="school" color="#4CAF50" route="/(dashboard)/mobilizer/mobilizer-scholarship-listing" />
            <QuickAction label="Students" icon="people" color="#2196F3" route="/(dashboard)/mobilizer/mobilizer-students" />
            <QuickAction label="Applications" icon="documents" color="#FF9800" route="/(dashboard)/mobilizer/mobilizer-applications" />
            <QuickAction label="Bookmarked" icon="bookmark" color="#E91E63" route={{ pathname: "/(dashboard)/mobilizer/mobilizer-scholarship-listing", params: { bookmarkedOnly: "true" } }} />
          </View>
        </View>

        {/* Upcoming Deadlines */}
        {upcomingDeadlines.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { color: isDark ? colors.text : "#333", marginBottom: 0 }]}>Upcoming Deadlines</Text>
              <TouchableOpacity onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-scholarship-listing")}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={upcomingDeadlines}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/(dashboard)/mobilizer/mobilizer-scholarship-details", params: { scholarshipId: item.id } })}
                  style={[styles.deadlineCard, { backgroundColor: isDark ? colors.card : "#fff" }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={[styles.deadlineTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>End: {new Date(item.application_deadline || item.end_date).toLocaleDateString()}</Text>
                  </View>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F44336', marginTop: 6 }} />
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Bookmarked Applications (New Section) */}
        {/* NOTE: Requirement says "Displaying all bookmarked applications". Assuming this means bookmarked scholarships. */}
        {bookmarkedApps.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.text : "#333" }]}>Bookmarked Scholarships</Text>
            <View style={{ gap: 10 }}>
              {bookmarkedApps.slice(0, 3).map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.bookmarkItem, { backgroundColor: isDark ? colors.card : "#fff" }]}
                  onPress={() => router.push({ pathname: "/(dashboard)/mobilizer/mobilizer-scholarship-details", params: { scholarshipId: item.id } })}
                >
                  <Ionicons name="bookmark" size={20} color="#FFB400" />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{item.title}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.category || "General"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
              {bookmarkedApps.length > 3 && (
                <TouchableOpacity onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-scholarship-listing")} style={{ alignSelf: 'center', marginTop: 4 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>+ {bookmarkedApps.length - 3} more</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Notifications Preview */}
        {notifications.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.text : "#333" }]}>Notifications</Text>
            <View style={{ gap: 8 }}>
              {notifications.map((n, i) => (
                <View key={i} style={[styles.notifItem, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.7)" }]}>
                  <View style={[styles.notifIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#eee" }]}>
                    <Ionicons name="notifications-outline" size={16} color={colors.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontWeight: '600', color: colors.text, fontSize: 14 }}>{n.subject}</Text>
                    <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 12 }}>{n.smallmessage || "New notification"}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { position: "absolute", top: 0, left: 0, bottom: 0, right: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  welcomeText: { fontSize: 14, fontWeight: '600' },
  userName: { fontSize: 24, fontWeight: '800' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionBtn: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  deadlineCard: {
    width: 200,
    height: 80,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  deadlineTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  notifIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
