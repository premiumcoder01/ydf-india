import { DashboardHeader, AppUpdateModal } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { useAppUpdate } from "@/utils/useAppUpdate";
import { getNotifications, getReviewerDashboardStats, getReviewerProgress, getReviewerRecentApplications, getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { MotiView } from "moti";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { PieChart } from "react-native-gifted-charts";
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
  const appUpdate = useAppUpdate();

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

  const [reviewerName, setReviewerName] = useState("Reviewer");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

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

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;
      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) return;

      const [profileRes, statsRes, recentAppsRes, progressRes, notifRes] = await Promise.all([
        getUserProfile(token),
        getReviewerDashboardStats(token),
        getReviewerRecentApplications(token, 5),
        getReviewerProgress(token),
        getNotifications(token),
      ]);

      if (notifRes && notifRes.success && notifRes.data) {
        let raw: any[] = [];
        if (Array.isArray(notifRes.data)) raw = notifRes.data;
        else if (Array.isArray(notifRes.data.data)) raw = notifRes.data.data;
        else if (Array.isArray(notifRes.data.notifications)) raw = notifRes.data.notifications;

        const count = raw.filter((n: any) => !n.is_read).length;
        setUnreadCount(count);
      }

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
  const computedTotal = Math.max(stats.total_applications_assigned, stats.pending_review + stats.approved + stats.rejected);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? [colors.shadow, colors.shadow, colors.shadow] : [colors.background, colors.background, colors.accent]}
        style={styles.background}
        locations={[0, 0.4, 1]}
      />

      {/* Header */}
      <DashboardHeader
        userName={reviewerName}
        profilePhotoUrl={profilePhotoUrl}
        unreadCount={unreadCount}
        onNotificationPress={() => router.push("/(dashboard)/reviewer/notifications")}
        onProfilePress={() => router.push("/(dashboard)/reviewer/profile")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: inset.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ─── Hero Chart Section ─── */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 800 }}
          style={styles.heroSection}
        >
          <View style={[styles.premiumCardContainer, { shadowColor: isDark ? colors.primary : "#000" }]}>
            <LinearGradient
              colors={isDark ? ["#1E293B", "#0F172A"] : ["#FFFFFF", "#F8FAFC"]}
              style={[styles.chartCard, { borderColor: isDark ? "#334155" : "#E2E8F0" }]}
            >
              <View style={styles.chartHeader}>
                <View>
                  <Text style={[styles.chartTitle, { color: colors.text }]}>Application Status</Text>
                  <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Overall review progress</Text>
                </View>
                <View style={[styles.totalBadgePremium, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
                  <Text style={[styles.totalBadgeText, { color: colors.text }]}>{computedTotal}</Text>
                  <Text style={[styles.totalBadgeSubtext, { color: colors.textSecondary }]}>TOTAL</Text>
                </View>
              </View>

              <View style={styles.chartContent}>
                {/* Donut Chart */}
                <View style={styles.chartWrapperPremium}>
                  <PieChart
                    data={chartData}
                    donut
                    radius={65}
                    innerRadius={52}
                    innerCircleColor={isDark ? "#1E293B" : "#FFFFFF"}
                    centerLabelComponent={() => {
                      const percent = isChartEmpty || computedTotal === 0 ? 0 : Math.round((totalProcessed / computedTotal) * 100);
                      return (
                        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: 24, color: colors.text, fontWeight: '800' }}>
                            {percent}%
                          </Text>
                          <Text style={{ fontSize: 9, color: colors.textSecondary, fontWeight: '700' }}>REVIEWED</Text>
                        </View>
                      );
                    }}
                  />
                </View>

                {/* Legend Container */}
                <View style={styles.legendContainerPremium}>
                  <ChartLegend color="#F59E0B" label="Pending" value={stats.pending_review} isDark={isDark} />
                  <ChartLegend color="#10B981" label="Approved" value={stats.approved} isDark={isDark} />
                  <ChartLegend color="#EF4444" label="Rejected" value={stats.rejected} isDark={isDark} />
                </View>
              </View>
            </LinearGradient>
          </View>
        </MotiView>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Review Activity</Text>
        </View>

        {/* ─── Key Metrics List (Vertical) ─── */}
        <View style={styles.verticalMetricsContainer}>
          <MetricCard
            title="Verified Today"
            value={stats.verified_today}
            icon="flash"
            color="#10B981"
            delay={100}
            isDark={isDark}
          />
          <MetricCard
            title="Weekly Review"
            value={stats.verified_this_week}
            icon="trending-up"
            color="#6366F1"
            delay={200}
            isDark={isDark}
          />
          <MetricCard
            title="Bookmarked"
            value={stats.bookmarked}
            icon="star"
            color="#F59E0B"
            delay={300}
            isDark={isDark}
          />
        </View>

        {/* ─── Recent Applications ─── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Applications</Text>
        </View>

        <LinearGradient
          colors={isDark ? ["#1E293B", "#0F172A"] : ["#FFFFFF", "#F8FAFC"]}
          style={[styles.listContainerPremium, { borderColor: isDark ? "#334155" : "#E2E8F0" }]}
        >
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
        </LinearGradient>

        {/* ─── Quick Actions ─── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(dashboard)/reviewer/applications")}
          >
            <MotiView
              from={{ opacity: 0, translateY: 15 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 400 }}
              style={[
                styles.featureActionCardPremium,
                {
                  backgroundColor: isDark ? colors.card : '#fff',
                  borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#eee',
                  borderWidth: 1,
                  padding: 14
                }
              ]}
            >
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.featureIconBox,
                  { width: 44, height: 44, borderRadius: 12 }
                ]}
              >
                <Ionicons name="layers" size={20} color="#fff" />
              </LinearGradient>
              <View style={styles.featureContentBox}>
                <Text style={[styles.featureTitle, { color: colors.text, fontWeight: '700', fontSize: 15 }]}>View All Applications</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>Evaluate assigned submissions</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
            </MotiView>
          </TouchableOpacity>
        </View>

      </ScrollView>
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

// ─── Components ──────────────────────────────────────────────────────────────

function ChartLegend({ color, label, value, isDark }: { color: string, label: string, value: number, isDark: boolean }) {
  return (
    <View style={[styles.legendRowPremium, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }]}>
      <View style={styles.legendInfo}>
        <View style={[styles.dotPremium, { backgroundColor: color, shadowColor: color }]} />
        <Text style={[styles.legendLabelPremium, { color: isDark ? "#94A3B8" : "#64748B" }]}>{label}</Text>
      </View>
      <Text style={[styles.legendValuePremium, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>{value}</Text>
    </View>
  )
}

function MetricCard({ title, value, icon, color, delay, isDark }: any) {
  let bgColors: readonly [string, string] = ['#10B981', '#047857'];
  if (color === '#6366F1') bgColors = ['#6366F1', '#4338CA'];
  else if (color === '#F59E0B') bgColors = ['#F59E0B', '#B45309'];

  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 600, delay }}
      style={{ width: '100%', marginBottom: 12 }}
    >
      <LinearGradient
        colors={bgColors}
        style={[styles.metricCardPremium, { borderWidth: 0 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icon} size={22} color="#fff" />
          </View>
          <View style={styles.metricTextContent}>
            <Text style={[styles.metricTitlePremium, { color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 }]}>{title}</Text>
            <Text style={[styles.metricValuePremium, { color: '#fff', fontSize: 24, fontWeight: '800' }]}>{value}</Text>
          </View>
        </View>
      </LinearGradient>
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

  heroSection: { paddingHorizontal: 20, marginVertical: 20 },
  premiumCardContainer: {
    borderRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  chartCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  chartTitle: { fontSize: 20, fontWeight: "800", marginBottom: 2, letterSpacing: -0.5 },
  chartSubtitle: { fontSize: 13, fontWeight: "500" },
  totalBadgePremium: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  totalBadgeText: { fontSize: 18, fontWeight: "800", lineHeight: 20 },
  totalBadgeSubtext: { fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  chartContent: { flexDirection: "row", alignItems: "center", gap: 20 },
  chartWrapperPremium: { flex: 1.2, alignItems: "center", justifyContent: "center" },
  chartGlow: {
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  legendContainerPremium: { flex: 1, gap: 10 },
  legendRowPremium: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  legendInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  dotPremium: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  legendLabelPremium: { fontSize: 12, fontWeight: "600" },
  legendValuePremium: { fontSize: 13, fontWeight: "800" },

  verticalMetricsContainer: {
    flexDirection: "column",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
    width: '100%',
  },
  metricCardPremium: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  metricIconPremium: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  metricTextContent: { flex: 1, gap: 2 },
  metricValuePremium: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  metricTitlePremium: { fontSize: 11, fontWeight: "700", textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.7 },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  viewAll: { fontSize: 13, fontWeight: "600" },

  listContainerPremium: { marginHorizontal: 20, borderRadius: 20, overflow: "hidden", borderWidth: 1, marginBottom: 30 },
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
  featureActionCardPremium: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
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
  },
});
