import { HelloWave } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getReviewerDashboardStats, getReviewerProgress, getReviewerRecentApplications, getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { MotiView } from "moti";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

  // ─── Back Handler ─────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert("Exit App", "Are you sure you want to exit?", [
          { text: "Cancel", onPress: () => null, style: "cancel" },
          { text: "YES", onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      };
      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [])
  );

  // ─── State ───────────────────────────────────────────────────────────────────
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

  const [recentApplications, setRecentApplications] = useState<ApplicationItem[]>([]);

  // ─── Data Fetching ───────────────────────────────────────────────────────────
  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;
      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) return;

      const [profileRes, statsRes, recentAppsRes, progressRes] = await Promise.all([
        getUserProfile(token),
        getReviewerDashboardStats(token),
        getReviewerRecentApplications(token, 5),
        getReviewerProgress(token),
      ]);

      // Profile
      if (profileRes.success && profileRes.data?.user) {
        const user = profileRes.data.user;
        const name = user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Reviewer";
        setReviewerName(name);
        if (user.profileimageurl) setProfilePhotoUrl(user.profileimageurl);
      } else if (authData?.user) {
        const user = authData.user;
        const name = user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Reviewer";
        setReviewerName(name);
        if (user.profileimageurl) setProfilePhotoUrl(user.profileimageurl);
      }

      // Stats
      if (statsRes.success && statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }

      // Recent Apps
      if (recentAppsRes.success && recentAppsRes.data && Array.isArray(recentAppsRes.data.applications)) {
        const mappedApps = recentAppsRes.data.applications.map((app: any) => ({
          id: String(app.id),
          scholarshipTitle: app.scholarship?.name || "Unknown Scholarship",
          studentName: app.user?.fullname || "Unknown Student",
          status: app.status ? app.status.charAt(0).toUpperCase() + app.status.slice(1) : "Unknown",
        }));
        setRecentApplications(mappedApps);
      }

      // Progress
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

  // ─── Chart Data Preparation ──────────────────────────────────────────────────
  const pieData = [
    { value: stats.approved, color: '#4CAF50', text: 'Approved' },
    { value: stats.pending_review, color: '#FF9800', text: 'Pending' },
    { value: stats.rejected, color: '#F44336', text: 'Rejected' },
  ].filter(d => d.value > 0);

  // If no data, show a grey ring
  const isChartEmpty = pieData.length === 0;
  const chartData = isChartEmpty ? [{ value: 1, color: isDark ? '#475569' : '#E2E8F0' }] : pieData;

  const totalProcessed = stats.approved + stats.rejected;
  const totalAssigned = stats.total_applications_assigned;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? [colors.shadow, colors.shadow, colors.shadow] : [colors.background, colors.background, colors.accent]}
        style={styles.background}
        locations={[0, 0.4, 1]}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: inset.top + 20 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome back,</Text>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>{reviewerName.split(' ')[0]}</Text>
              <HelloWave />
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push("/(dashboard)/reviewer/notifications")} style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(dashboard)/reviewer/profile")}>
              {profilePhotoUrl ? (
                <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { borderColor: colors.border }]}>
                  <Ionicons name="person" size={20} color={colors.textSecondary} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: inset.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ─── Hero Chart Section ─── */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
          style={styles.heroSection}
        >
          <LinearGradient
            colors={isDark ? ["#1E293B", "#334155"] : ["#FFFFFF", "#F8FAFC"]}
            style={[styles.chartCard, { borderColor: isDark ? "#334155" : "#E2E8F0" }]}
          >
            <View style={styles.chartHeader}>
              <View>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Application Status</Text>
                <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Overview of your assigned tasks</Text>
              </View>
              <View style={[styles.totalBadge, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}>
                <Text style={[styles.totalBadgeText, { color: colors.text }]}>{stats.total_applications_assigned} Total</Text>
              </View>
            </View>

            <View style={styles.chartContent}>
              {/* Donut Chart */}
              <View style={styles.chartWrapper}>
                <PieChart
                  data={chartData}
                  donut
                  radius={60}
                  innerRadius={45}
                  innerCircleColor="transparent"
                  centerLabelComponent={() => {
                    return (
                      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 22, color: colors.text, fontWeight: 'bold' }}>
                          {isChartEmpty || totalAssigned === 0 ? '0%' : Math.round((totalProcessed / totalAssigned) * 100) + '%'}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>Done</Text>
                      </View>
                    );
                  }}
                />
              </View>

              {/* Legend */}
              <View style={styles.legendContainer}>
                <ChartLegend color="#FF9800" label="Pending" value={stats.pending_review} isDark={isDark} />
                <ChartLegend color="#4CAF50" label="Approved" value={stats.approved} isDark={isDark} />
                <ChartLegend color="#F44336" label="Rejected" value={stats.rejected} isDark={isDark} />
              </View>
            </View>
          </LinearGradient>
        </MotiView>

        {/* ─── Key Metrics Grid ─── */}
        <View style={styles.gridContainer}>
          <MetricCard
            title="Verified Today"
            value={stats.verified_today}
            icon="checkmark-done-circle"
            color="#10B981"
            delay={100}
            isDark={isDark}
            colors={colors}
          />
          <MetricCard
            title="Weekly Verified"
            value={stats.verified_this_week}
            icon="calendar"
            color="#6366F1"
            delay={200}
            isDark={isDark}
            colors={colors}
          />
          <MetricCard
            title="Bookmarked"
            value={stats.bookmarked}
            icon="bookmark"
            color="#F59E0B"
            delay={300}
            isDark={isDark}
            colors={colors}
          />
        </View>

        {/* ─── Recent Applications ─── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Applications</Text>
        </View>

        <View style={[styles.listContainer, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.border }]}>
          {recentApplications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 10 }} />
              <Text style={{ color: colors.textSecondary }}>No applications yet</Text>
            </View>
          ) : (
            recentApplications.map((app, index) => (
              <TouchableOpacity
                key={app.id}
                style={[
                  styles.listItem,
                  { borderBottomWidth: index === recentApplications.length - 1 ? 0 : 1, borderBottomColor: isDark ? "#334155" : "#F1F5F9" }
                ]}
                onPress={() => router.push({ pathname: "/(dashboard)/reviewer/application-details", params: { id: app.id } })}
              >
                <View style={[styles.listIcon, { backgroundColor: getStatusColor(app.status, true) }]}>
                  <Ionicons name="document-text" size={20} color={getStatusColor(app.status)} />
                </View>
                <View style={styles.listContent}>
                  <Text style={[styles.listTitle, { color: colors.text }]}>{app.scholarshipTitle}</Text>
                  <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>{app.studentName}</Text>
                </View>
                <StatusBadge status={app.status} isDark={isDark} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ─── Quick Actions ─── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(dashboard)/reviewer/applications")}
            style={[
              styles.featureActionCard,
              {
                backgroundColor: isDark ? colors.card : "#FFFFFF",
                borderColor: colors.border
              }
            ]}
          >
            <View style={[styles.featureIconBox, { backgroundColor: "#6366F120" }]}>
              <Ionicons name="layers" size={24} color="#6366F1" />
            </View>
            <View style={styles.featureContentBox}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>View All Scholarships</Text>

            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function ChartLegend({ color, label, value, isDark }: { color: string, label: string, value: number, isDark: boolean }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>{label}</Text>
      <Text style={[styles.legendValue, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>{value}</Text>
    </View>
  )
}

function MetricCard({ title, value, icon, color, delay, isDark, colors }: any) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 500, delay }}
      style={[styles.metricCard, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.border }]}
    >
      <View style={[styles.metricIcon, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>{title}</Text>
    </MotiView>
  );
}

function StatusBadge({ status, isDark }: { status: string, isDark: boolean }) {
  const color = getStatusColor(status);
  return (
    <View style={[styles.badge, { backgroundColor: color + "15", borderColor: color + "40" }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

function getStatusColor(status: string, bg = false) {
  const s = status?.toLowerCase();
  if (s === 'approved') return bg ? "#DCFCE7" : "#16A34A";
  if (s === 'rejected') return bg ? "#FEE2E2" : "#DC2626";
  if (s === 'pending' || s === 'new') return bg ? "#FEF3C7" : "#D97706";
  return bg ? "#E0F2FE" : "#0284C7";
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  header: { paddingHorizontal: 20, paddingBottom: 15 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontSize: 13, fontWeight: "500", marginBottom: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 24, fontWeight: "700" },
  headerActions: { flexDirection: "row", gap: 12 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "rgba(0,0,0,0.03)" },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  heroSection: { paddingHorizontal: 20, marginBottom: 24 },
  chartCard: {
    borderRadius: 24, padding: 20, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  chartTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  chartSubtitle: { fontSize: 13 },
  totalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  totalBadgeText: { fontSize: 12, fontWeight: "600" },
  chartContent: { flexDirection: "row", alignItems: "center" },
  chartWrapper: { flex: 1, alignItems: "center", justifyContent: "center" },
  legendContainer: { flex: 1, gap: 12, paddingLeft: 10 },
  legendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendLabel: { fontSize: 13, fontWeight: "500", flex: 1 },
  legendValue: { fontSize: 14, fontWeight: "700" },

  gridContainer: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 30 },
  metricCard: { flex: 1, borderRadius: 16, padding: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  metricIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  metricValue: { fontSize: 20, fontWeight: "800" },
  metricTitle: { fontSize: 11, fontWeight: "600", textAlign: "center" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  viewAll: { fontSize: 13, fontWeight: "600" },

  listContainer: { marginHorizontal: 20, borderRadius: 20, overflow: "hidden", borderWidth: 1, marginBottom: 30 },
  listItem: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  listIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  listContent: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  listSubtitle: { fontSize: 12 },
  emptyState: { padding: 40, alignItems: "center", justifyContent: "center" },

  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, gap: 6 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  // Quick Actions - Single Card
  featureActionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 16
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  featureContentBox: {
    flex: 1
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4
  },
  featureSubtitle: {
    fontSize: 13,
    lineHeight: 18
  }
});
