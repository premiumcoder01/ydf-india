import { DashboardHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getDonorDashboardStats, getDonorRecentScholarships, getDonorScholarshipProgress, getNotifications, getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { MotiView } from "moti";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ScholarshipItem = {
  id: string;
  title: string;
  applicants: number;
  status: "Active" | "Draft" | "Closed";
};

export default function ScholarshipProviderDashboard() {
  const { isDark, colors } = useTheme();
  const inset = useSafeAreaInsets();

  // Provider state
  const [providerName, setProviderName] = useState("Provider");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    activeScholarships: 0,
    totalApplicants: 0,
    approvedStudents: 0,
    fundsUtilized: 0,
    totalScholarshipsCreated: 0,
    expiredScholarships: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    totalFundAllocated: 0,
  });

  const [recentScholarships, setRecentScholarships] = useState<ScholarshipItem[]>([]);

  const [notifications] = useState<Array<{ id: string; title: string; timeAgo: string }>>([
    { id: "n1", title: "KYC Verification Required", timeAgo: "1h ago" },
    { id: "n2", title: "Monthly Report Available", timeAgo: "3h ago" },
    { id: "n3", title: "New Application Alert: STEM Innovation Grant", timeAgo: "6h ago" },
  ]);

  const [scholarshipProgressData, setScholarshipProgressData] = useState<{ ratio: number, label: string, name?: string } | null>(null);

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

  // Fetch functions
  const fetchUserProfile = async () => {
    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) {
        return;
      }

      const authData = JSON.parse(authDataString);
      const token = authData?.token;

      if (!token) {
        return;
      }

      const response = await getUserProfile(token);

      if (response.success && response.data?.user) {
        const user = response.data.user;
        const name = user.fullname ||
          `${user.firstname || ""} ${user.lastname || ""}`.trim() ||
          "Provider";
        setProviderName(name);

        if (user.profileimageurl) {
          setProfilePhotoUrl(user.profileimageurl);
        }
      } else {
        if (authData?.user) {
          const user = authData.user;
          const name = user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Provider";
          setProviderName(name);
          if (user.profileimageurl) {
            setProfilePhotoUrl(user.profileimageurl);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;

      const authData = JSON.parse(authDataString);
      const token = authData?.token;

      if (!token) return;

      const response = await getDonorDashboardStats(token);

      if (response.success && response.data?.stats) {
        const apiStats = response.data.stats;
        setStats({
          activeScholarships: apiStats.total_active_scholarships || 0,
          totalApplicants: apiStats.total_applications_received || 0,
          approvedStudents: apiStats.total_students_selected || 0,
          fundsUtilized: apiStats.total_fund_disbursed || 0,
          totalScholarshipsCreated: apiStats.total_scholarships_created || 0,
          expiredScholarships: apiStats.total_expired_scholarships || 0,
          pendingApplications: apiStats.applications_by_status?.pending || 0,
          approvedApplications: apiStats.applications_by_status?.approved || 0,
          rejectedApplications: apiStats.applications_by_status?.rejected || 0,
          totalFundAllocated: apiStats.total_fund_allocated || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  const fetchRecentScholarships = async () => {
    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;

      const authData = JSON.parse(authDataString);
      const token = authData?.token;

      if (!token) return;

      const response = await getDonorRecentScholarships(token, 5);

      if (response.success && response.data?.scholarships) {
        const mappedScholarships: ScholarshipItem[] = response.data.scholarships.map((s: any) => ({
          id: String(s.id),
          title: s.name || "Untitled Scholarship",
          applicants: s.applications_count || 0,
          status: s.status === 1 ? "Active" : s.status === 0 ? "Draft" : "Closed",
        }));
        setRecentScholarships(mappedScholarships);
      }
    } catch (error) {
      console.error("Error fetching recent scholarships:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;

      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) return;

      const response = await getNotifications(token);
      if (response.success && response.data) {
        let raw: any[] = [];
        if (Array.isArray(response.data)) raw = response.data;
        else if (Array.isArray(response.data.data)) raw = response.data.data;
        else if (Array.isArray(response.data.notifications)) raw = response.data.notifications;

        const count = raw.filter((n: any) => !n.is_read).length;
        setUnreadCount(count);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Initial data fetch on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([
        fetchUserProfile(),
        fetchStats(),
        fetchRecentScholarships(),
        fetchNotifications()
      ]);
      setLoading(false);
    };

    loadInitialData();
  }, []);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUserProfile(),
      fetchStats(),
      fetchRecentScholarships(),
      fetchNotifications()
    ]);
    setRefreshing(false);
  }, []);

  const fetchScholarshipProgress = async (scholarshipId: string) => {
    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;

      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) return;

      const response = await getDonorScholarshipProgress(token, Number(scholarshipId));
      if (response.success && response.data) {
        // Assuming response.data has a progress field or we calculate it
        // Since we don't have the exact response structure, we'll look for common fields
        let progressValue = 0;
        let progressLabel = "Setup in progress";

        if (typeof response.data.progress === 'number') {
          progressValue = response.data.progress;
          progressLabel = `${progressValue}% setup complete`;
        } else if (response.data.stages) {
          // Calculate from stages if available
          const stages = Object.values(response.data.stages);
          const completed = stages.filter((s: any) => s.completed).length;
          progressValue = Math.round((completed / stages.length) * 100) || 0;
          progressLabel = `${progressValue}% setup complete`;
        }

        setScholarshipProgressData({ ratio: progressValue, label: progressLabel, name: response.data.name });
      }
    } catch (error) {
      console.error("Error fetching scholarship progress:", error);
    }
  };

  // Trigger progress fetch when recent scholarships are loaded
  useEffect(() => {
    if (recentScholarships.length > 0) {
      // Find the most recent draft
      const draft = recentScholarships.find(s => s.status === 'Draft');
      if (draft) {
        fetchScholarshipProgress(draft.id);
      } else {
        // If no draft, maybe show progress of the most recent one?
        // Or keep the default 'Active' ratio logic?
        // For now, let's fall back to the default logic if NO draft exists
        // But if we want to show 'Scholarship Management', maybe showing the active ratio is fine.
        // However, if we fetched a draft, we overwrite the default derived value.
      }
    }
  }, [recentScholarships]);



  const scholarshipProgress = useMemo(() => {
    if (scholarshipProgressData) {
      return {
        ratio: scholarshipProgressData.ratio,
        label: scholarshipProgressData.name ? `${scholarshipProgressData.name}: ${scholarshipProgressData.label}` : scholarshipProgressData.label
      };
    }
    const active = stats.activeScholarships;
    const total = stats.totalScholarshipsCreated;
    if (!total) return { ratio: 0, label: "0% active" };
    const ratio = Math.round((active / total) * 100);
    return { ratio, label: `${ratio}% active scholarships` };
  }, [stats, scholarshipProgressData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? [colors.background, colors.background, colors.background] : [colors.background, colors.background, colors.accent]}
        style={styles.background}
        locations={[0, 0.4, 1]}
      />

      {/* Welcome Header - Sticky */}
      <DashboardHeader
        userName={providerName}
        profilePhotoUrl={profilePhotoUrl}
        unreadCount={unreadCount}
        onNotificationPress={() => router.push("/(dashboard)/provider/notifications")}
        onProfilePress={() => router.push("/(dashboard)/provider/profile")}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: inset.bottom + 30 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? colors.accent : colors.primary}
            colors={[isDark ? colors.accent : colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
      >

        {/* Dashboard Overview */}
        <View style={styles.statsContainer}>

          {/* Top Metric Cards Row */}
          <View style={styles.topMetricsRow}>
            {/* Total Scholarships */}
            {/* Total Scholarships */}
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.metricGradientCard}
            >
              <View style={styles.metricDecorator1} />
              <View style={styles.metricDecorator2} />
              <MotiView 
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 500 }}
              >
                <View style={styles.metricIconWrapper}>
                  <Ionicons name="school" size={18} color="#fff" />
                </View>
                <Text style={styles.metricValueText}>{stats.totalScholarshipsCreated}</Text>
                <Text style={styles.metricLabelText}>Total Scholarships</Text>
              </MotiView>
            </LinearGradient>

            {/* Total Applications */}
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.metricGradientCard}
            >
              <View style={styles.metricDecorator1} />
              <View style={styles.metricDecorator2} />
              <MotiView 
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 500, delay: 100 }}
              >
                <View style={styles.metricIconWrapper}>
                  <Ionicons name="people" size={18} color="#fff" />
                </View>
                <Text style={styles.metricValueText}>{stats.totalApplicants}</Text>
                <Text style={styles.metricLabelText}>Total Applications</Text>
              </MotiView>
            </LinearGradient>
          </View>

          {/* Application Status — Vertical List */}
          <MotiView
            from={{ opacity: 0, translateY: 15 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 450, delay: 100 }}
            style={[styles.applicationStatusCard, { backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? "rgba(255,255,255,0.05)" : '#eee' }]}
          >
            <View style={styles.cardHeaderRow}>
              <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={[styles.cardIconBox, { marginRight: 12 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="analytics" size={18} color="#fff" />
              </LinearGradient>
              <Text style={[styles.cardHeaderTitle, { color: colors.text, fontSize: 17 }]}>Application Analytics</Text>
              <Text style={[styles.statusTotalText, { color: colors.textSecondary }]}>{stats.totalApplicants} Total</Text>
            </View>

            {/* Pending Row */}
            <View style={[styles.statusListRow, { borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.04)" : '#f3f4f6' }]}>
              <View style={[styles.statusListIcon, { backgroundColor: '#FF8A0015' }]}>
                <Ionicons name="time" size={18} color="#FF8A00" />
              </View>
              <View style={styles.statusListBody}>
                <View style={styles.statusListTop}>
                  <Text style={[styles.statusListLabel, { color: colors.text }]}>Pending Review</Text>
                  <Text style={[styles.statusListCount, { color: '#FF8A00', fontWeight: '800' }]}>{stats.pendingApplications}</Text>
                </View>
                <View style={[styles.statusListTrack, { backgroundColor: isDark ? '#FF8A0010' : '#FFF3E0' }]}>
                  <LinearGradient
                    colors={['#FFA000', '#FF8F00']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[styles.statusListFill, {
                      width: `${stats.totalApplicants > 0 ? Math.min((stats.pendingApplications / stats.totalApplicants) * 100, 100) : 0}%`
                    }]}
                  />
                </View>
              </View>
              <Text style={[styles.statusListPct, { color: colors.textSecondary }]}>
                {stats.totalApplicants > 0 ? `${Math.round((stats.pendingApplications / stats.totalApplicants) * 100)}%` : '0%'}
              </Text>
            </View>

            {/* Approved Row */}
            <View style={[styles.statusListRow, { borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.04)" : '#f3f4f6' }]}>
              <View style={[styles.statusListIcon, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              </View>
              <View style={styles.statusListBody}>
                <View style={styles.statusListTop}>
                  <Text style={[styles.statusListLabel, { color: colors.text }]}>Approved Applications</Text>
                  <Text style={[styles.statusListCount, { color: '#10B981', fontWeight: '800' }]}>{stats.approvedApplications}</Text>
                </View>
                <View style={[styles.statusListTrack, { backgroundColor: isDark ? '#10B98110' : '#E1FCEF' }]}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[styles.statusListFill, {
                      width: `${stats.totalApplicants > 0 ? Math.min((stats.approvedApplications / stats.totalApplicants) * 100, 100) : 0}%`
                    }]}
                  />
                </View>
              </View>
              <Text style={[styles.statusListPct, { color: colors.textSecondary }]}>
                {stats.totalApplicants > 0 ? `${Math.round((stats.approvedApplications / stats.totalApplicants) * 100)}%` : '0%'}
              </Text>
            </View>

            {/* Rejected Row */}
            <View style={styles.statusListRow}>
              <View style={[styles.statusListIcon, { backgroundColor: '#EF444415' }]}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
              </View>
              <View style={styles.statusListBody}>
                <View style={styles.statusListTop}>
                  <Text style={[styles.statusListLabel, { color: colors.text }]}>Rejected Applications</Text>
                  <Text style={[styles.statusListCount, { color: '#EF4444', fontWeight: '800' }]}>{stats.rejectedApplications}</Text>
                </View>
                <View style={[styles.statusListTrack, { backgroundColor: isDark ? '#EF444410' : '#FEE2E2' }]}>
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[styles.statusListFill, {
                      width: `${stats.totalApplicants > 0 ? Math.min((stats.rejectedApplications / stats.totalApplicants) * 100, 100) : 0}%`
                    }]}
                  />
                </View>
              </View>
              <Text style={[styles.statusListPct, { color: colors.textSecondary }]}>
                {stats.totalApplicants > 0 ? `${Math.round((stats.rejectedApplications / stats.totalApplicants) * 100)}%` : '0%'}
              </Text>
            </View>
          </MotiView>

          {/* Financial Overview */}
          {/* <MotiView
            from={{ opacity: 0, translateY: 15 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 450, delay: 200 }}
            style={[styles.financialCard, { backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? "rgba(255,255,255,0.05)" : '#eee' }]}
          >
            <View style={styles.cardHeaderRow}>
              <LinearGradient colors={['#10B981', '#059669']} style={[styles.cardIconBox, { marginRight: 12 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="wallet" size={18} color="#fff" />
              </LinearGradient>
              <Text style={[styles.cardHeaderTitle, { color: colors.text, fontSize: 17 }]}>Financial Reporting</Text>
            </View>

            <View style={styles.financialAmountRow}>
              <View style={styles.financialAmountBlock}>
                <Text style={[styles.financialAmountLabel, { color: colors.textSecondary }]}>Total Allocation</Text>
                <Text style={[styles.financialAmountValue, { color: colors.text, fontSize: 24, fontWeight: '800' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(stats.totalFundAllocated)}
                </Text>
              </View>
              <LinearGradient
                colors={['#10B981', '#047857']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[styles.financialDisbursedBadge, { shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }]}
              >
                <Text style={styles.financialDisbursedLabel}>Disbursed Funds</Text>
                <Text style={[styles.financialDisbursedValue, { fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(stats.fundsUtilized)}
                </Text>
              </LinearGradient>
            </View>

            <View style={styles.financialProgressWrap}>
              <View style={styles.financialProgressHeader}>
                <Text style={[styles.financialProgressLabel, { color: colors.textSecondary, fontSize: 12 }]}>Fund Utilization Ratio</Text>
                <Text style={[styles.financialProgressPct, { color: '#10B981', fontWeight: '800' }]}>
                  {stats.totalFundAllocated > 0
                    ? `${Math.round((stats.fundsUtilized / stats.totalFundAllocated) * 100)}%`
                    : '0%'}
                </Text>
              </View>
              <View style={[styles.financialProgressTrack, { backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : '#ECFDF5', height: 8 }]}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.financialProgressFill, {
                    width: `${stats.totalFundAllocated > 0 ? Math.min((stats.fundsUtilized / stats.totalFundAllocated) * 100, 100) : 0}%`
                  }]}
                />
              </View>
              <Text style={[styles.financialRemainingText, { color: colors.textSecondary, marginTop: 4, letterSpacing: 0.2, fontSize: 12 }]}>
                Glow Balance: <Text style={{ color: colors.text, fontWeight: '700' }}>{formatCurrency(Math.max(stats.totalFundAllocated - stats.fundsUtilized, 0))}</Text>
              </Text>
            </View>
          </MotiView> */}
        </View>

        {/* Scholarship Progress */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 450, delay: 300 }}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Scholarship Progress</Text>
          <View style={[styles.financialCard, { backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? "rgba(255,255,255,0.05)" : '#eee', padding: 18 }]}>
            <View style={styles.financialProgressWrap}>
              <View style={styles.financialProgressHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="compass" size={16} color={colors.primary} />
                  <Text style={[styles.financialProgressLabel, { color: colors.text, fontSize: 13 }]}>{scholarshipProgress.label}</Text>
                </View>
                <Text style={[styles.financialProgressPct, { color: colors.primary, fontWeight: '800' }]}>{scholarshipProgress.ratio}%</Text>
              </View>
              <View style={[styles.financialProgressTrack, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)", height: 8 }]}>
                <LinearGradient
                  colors={[colors.primary, colors.primary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.financialProgressFill, { width: `${scholarshipProgress.ratio}%` }]}
                />
              </View>
            </View>
          </View>
        </MotiView>

        {/* Recent Scholarships */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 450, delay: 400 }}
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Programs</Text>
          </View>
          <View style={[styles.cardList, { backgroundColor: isDark ? colors.card : "#fff", borderColor: isDark ? "rgba(255,255,255,0.05)" : '#eee', padding: 8 }]}>
            {recentScholarships.slice(0, 5).map((scholarship) => (
              <TouchableOpacity
                key={scholarship.id}
                style={[styles.listItem, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
                  borderRadius: 16, marginBottom: 8, padding: 14,
                  borderBottomWidth: 0,
                }]}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: "/(dashboard)/provider/my-scheme-details", params: { id: scholarship.id } })}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6D28D9']}
                  style={[styles.listItemIcon, { borderRadius: 12, width: 36, height: 36 }]}
                >
                  <Ionicons name="school" size={16} color="#fff" />
                </LinearGradient>
                <View style={styles.listItemBody}>
                  <Text style={[styles.listItemTitle, { color: colors.text, fontWeight: '700' }]}>{scholarship.title}</Text>
                  <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{scholarship.applicants} applicants</Text>
                </View>
                <View style={[styles.statusBadge, getStatusBadgeStyle(scholarship.status, isDark), { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusBadgeStyle(scholarship.status, isDark).borderColor, fontSize: 11, fontWeight: '800' }]}>{scholarship.status}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
            {recentScholarships.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No recent programs found</Text>
              </View>
            )}
          </View>
        </MotiView>



        {/* Quick Actions */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 450, delay: 500 }}
          style={styles.featuresContainer}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Operational Controls</Text>
          <View style={styles.featuresGrid}>
            <TouchableOpacity style={[styles.featureCard, { borderLeftWidth: 0, backgroundColor: isDark ? colors.card : "#fff", borderColor: isDark ? "rgba(255,255,255,0.05)" : '#eee' }]} activeOpacity={0.8} onPress={() => router.push("/(dashboard)/provider/add-scholarship")}>
              <View style={styles.featureContent}>
                <LinearGradient colors={['#10B981', '#059669']} style={[styles.featureIcon, { borderRadius: 12 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                </LinearGradient>
                <View style={styles.featureInfo}>
                  <Text style={[styles.featureTitle, { color: colors.text, fontWeight: '700' }]}>Add New Scheme</Text>
                  <Text style={[styles.featureDescription, { color: colors.textSecondary, fontSize: 12 }]}>Publish a new scholarship scheme</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.featureCard, { borderLeftWidth: 0, backgroundColor: isDark ? colors.card : "#fff", borderColor: isDark ? "rgba(255,255,255,0.05)" : '#eee' }]} activeOpacity={0.8} onPress={() => router.push("/(dashboard)/provider/my-schemes")}>
              <View style={styles.featureContent}>
                <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={[styles.featureIcon, { borderRadius: 12 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="folder-open" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.featureInfo}>
                  <Text style={[styles.featureTitle, { color: colors.text, fontWeight: '700' }]}>My Schemes</Text>
                  <Text style={[styles.featureDescription, { color: colors.textSecondary, fontSize: 12 }]}>Track and oversee your active grants</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.featureCard, { borderLeftWidth: 0, backgroundColor: isDark ? colors.card : "#fff", borderColor: isDark ? "rgba(255,255,255,0.05)" : '#eee' }]} activeOpacity={0.8} onPress={() => router.push("/(dashboard)/provider/kyc")}>
              <View style={styles.featureContent}>
                <LinearGradient colors={['#FF8A00', '#E0A800']} style={[styles.featureIcon, { borderRadius: 12 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="shield-checkmark" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.featureInfo}>
                  <Text style={[styles.featureTitle, { color: colors.text, fontWeight: '700' }]}>KYC Verification</Text>
                  <Text style={[styles.featureDescription, { color: colors.textSecondary, fontSize: 12 }]}>Keep authorization documentation in check</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>
        </MotiView>
      </ScrollView>
    </View>
  );
}

function getStatusBadgeStyle(status: ScholarshipItem["status"], isDark: boolean) {
  switch (status) {
    case "Active":
      return { backgroundColor: isDark ? "#1B5E2030" : "#E8F5E9", borderColor: "#4CAF50" };
    case "Closed":
      return { backgroundColor: isDark ? "#B71C1C30" : "#FBE9E7", borderColor: "#F44336" };
    default:
      return { backgroundColor: isDark ? "#0D47A130" : "#E3F2FD", borderColor: "#2196F3" };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2c44d",
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
    color: "#666",
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
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
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  // ── Top Metric Gradient Cards ──
  topMetricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricGradientCard: {
    flex: 1,
    borderRadius: 24,
    padding: 18,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  metricDecorator1: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -30,
    right: -20,
  },
  metricDecorator2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -15,
    left: -10,
  },
  metricIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  metricValueText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  metricLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.2,
  },

  // ── Application Status Card ──
  applicationStatusCard: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  // ── Application Status Vertical List ──
  statusTotalText: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '600',
  },
  statusListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  statusListIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusListBody: {
    flex: 1,
    gap: 6,
  },
  statusListTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusListLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusListCount: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusListTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  statusListFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 6,
  },
  statusListPct: {
    fontSize: 12,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
    flexShrink: 0,
  },

  // ── Financial Card ──
  financialCard: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  financialAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  financialAmountBlock: {
    flex: 1,
  },
  financialAmountLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  financialAmountValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  financialDisbursedBadge: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 110,
  },
  financialDisbursedLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 3,
  },
  financialDisbursedValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  financialProgressWrap: {
    gap: 8,
  },
  financialProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financialProgressLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  financialProgressPct: {
    fontSize: 15,
    fontWeight: '800',
  },
  financialProgressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  financialProgressFill: {
    height: '100%',
    borderRadius: 5,
    minWidth: 8,
  },
  financialRemainingText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Old stat card styles (kept for compatibility)
  statCard: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#333",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  viewAllText: {
    color: "#333",
    fontWeight: "600",
  },
  cardList: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
    shadowColor: "#333",
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
    borderBottomColor: "rgba(51, 51, 51, 0.06)",
  },
  listItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f5f5f5",
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
    color: "#333",
    marginBottom: 2,
  },
  listItemSub: {
    fontSize: 12,
    color: "#666",
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },
  emptyState: {
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
    color: "#666",
  },
  progressBar: {
    width: "100%",
    height: 10,
    borderRadius: 6,
    backgroundColor: "rgba(51, 51, 51, 0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
  },
  progressLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: "rgba(51, 51, 51, 0.1)",
    shadowColor: "#333",
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
    color: "#333",
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
  },
});


