import { DashboardHeader, HelloWave } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getDonorDashboardStats, getDonorRecentScholarships, getDonorScholarshipProgress, getNotifications, getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
        colors={isDark ? [colors.shadow, colors.shadow, colors.shadow] : [colors.background, colors.background, colors.accent]}
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
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
      >

        {/* Dashboard Overview */}
        <View style={styles.statsContainer}>

          {/* Top Metric Cards Row */}
          <View style={styles.topMetricsRow}>
            {/* Total Scholarships */}
            <LinearGradient
              colors={['#34d399', '#059669']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.metricGradientCard}
            >
              <View style={styles.metricGradientTop}>
                <View style={styles.metricGradientIcon}>
                  <Ionicons name="school-outline" size={22} color="rgba(255,255,255,0.9)" />
                </View>
                <Text style={styles.metricGradientNumber}>{stats.totalScholarshipsCreated}</Text>
              </View>
              <Text style={styles.metricGradientLabel}>Total Scholarships</Text>
              <View style={styles.metricGradientBadge}>
                <Text style={styles.metricGradientBadgeText}>{stats.activeScholarships} Active</Text>
              </View>
            </LinearGradient>

            {/* Total Applications */}
            <LinearGradient
              colors={['#60a5fa', '#2563eb']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.metricGradientCard}
            >
              <View style={styles.metricGradientTop}>
                <View style={styles.metricGradientIcon}>
                  <Ionicons name="people-outline" size={22} color="rgba(255,255,255,0.9)" />
                </View>
                <Text style={styles.metricGradientNumber}>{stats.totalApplicants}</Text>
              </View>
              <Text style={styles.metricGradientLabel}>Total Applications</Text>
              <View style={styles.metricGradientBadge}>
                <Text style={styles.metricGradientBadgeText}>{stats.approvedStudents} Selected</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Application Status — Vertical List */}
          <View style={[styles.applicationStatusCard, { backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? colors.border : '#eee' }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBox, { backgroundColor: '#673AB715' }]}>
                <Ionicons name="analytics-outline" size={20} color="#673AB7" />
              </View>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Application Status</Text>
              <Text style={[styles.statusTotalText, { color: colors.textSecondary }]}>{stats.totalApplicants} Total</Text>
            </View>

            {/* Pending Row */}
            <View style={[styles.statusListRow, { borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#f3f4f6' }]}>
              <View style={[styles.statusListIcon, { backgroundColor: '#FF980018' }]}>
                <Ionicons name="time-outline" size={18} color="#FF9800" />
              </View>
              <View style={styles.statusListBody}>
                <View style={styles.statusListTop}>
                  <Text style={[styles.statusListLabel, { color: colors.text }]}>Pending</Text>
                  <Text style={[styles.statusListCount, { color: '#FF9800' }]}>{stats.pendingApplications}</Text>
                </View>
                <View style={[styles.statusListTrack, { backgroundColor: isDark ? '#FF980020' : '#FFE0B2' }]}>
                  <View style={[styles.statusListFill, {
                    width: `${stats.totalApplicants > 0 ? Math.min((stats.pendingApplications / stats.totalApplicants) * 100, 100) : 0}%`,
                    backgroundColor: '#FF9800',
                  }]} />
                </View>
              </View>
              <Text style={[styles.statusListPct, { color: colors.textSecondary }]}>
                {stats.totalApplicants > 0 ? `${Math.round((stats.pendingApplications / stats.totalApplicants) * 100)}%` : '0%'}
              </Text>
            </View>

            {/* Approved Row */}
            <View style={[styles.statusListRow, { borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#f3f4f6' }]}>
              <View style={[styles.statusListIcon, { backgroundColor: '#4CAF5018' }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
              </View>
              <View style={styles.statusListBody}>
                <View style={styles.statusListTop}>
                  <Text style={[styles.statusListLabel, { color: colors.text }]}>Approved</Text>
                  <Text style={[styles.statusListCount, { color: '#4CAF50' }]}>{stats.approvedApplications}</Text>
                </View>
                <View style={[styles.statusListTrack, { backgroundColor: isDark ? '#4CAF5020' : '#C8E6C9' }]}>
                  <View style={[styles.statusListFill, {
                    width: `${stats.totalApplicants > 0 ? Math.min((stats.approvedApplications / stats.totalApplicants) * 100, 100) : 0}%`,
                    backgroundColor: '#4CAF50',
                  }]} />
                </View>
              </View>
              <Text style={[styles.statusListPct, { color: colors.textSecondary }]}>
                {stats.totalApplicants > 0 ? `${Math.round((stats.approvedApplications / stats.totalApplicants) * 100)}%` : '0%'}
              </Text>
            </View>

            {/* Rejected Row */}
            <View style={styles.statusListRow}>
              <View style={[styles.statusListIcon, { backgroundColor: '#F4433618' }]}>
                <Ionicons name="close-circle-outline" size={18} color="#F44336" />
              </View>
              <View style={styles.statusListBody}>
                <View style={styles.statusListTop}>
                  <Text style={[styles.statusListLabel, { color: colors.text }]}>Rejected</Text>
                  <Text style={[styles.statusListCount, { color: '#F44336' }]}>{stats.rejectedApplications}</Text>
                </View>
                <View style={[styles.statusListTrack, { backgroundColor: isDark ? '#F4433620' : '#FFCDD2' }]}>
                  <View style={[styles.statusListFill, {
                    width: `${stats.totalApplicants > 0 ? Math.min((stats.rejectedApplications / stats.totalApplicants) * 100, 100) : 0}%`,
                    backgroundColor: '#F44336',
                  }]} />
                </View>
              </View>
              <Text style={[styles.statusListPct, { color: colors.textSecondary }]}>
                {stats.totalApplicants > 0 ? `${Math.round((stats.rejectedApplications / stats.totalApplicants) * 100)}%` : '0%'}
              </Text>
            </View>
          </View>

          {/* Financial Overview */}
          <View style={[styles.financialCard, { backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? colors.border : '#eee' }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBox, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="wallet-outline" size={20} color="#10B981" />
              </View>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Financial Overview</Text>
            </View>

            {/* Amount row */}
            <View style={styles.financialAmountRow}>
              <View style={styles.financialAmountBlock}>
                <Text style={[styles.financialAmountLabel, { color: colors.textSecondary }]}>Total Allocated</Text>
                <Text style={[styles.financialAmountValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(stats.totalFundAllocated)}
                </Text>
              </View>
              <LinearGradient
                colors={['#10B981', '#047857']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.financialDisbursedBadge}
              >
                <Text style={styles.financialDisbursedLabel}>Disbursed</Text>
                <Text style={styles.financialDisbursedValue} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(stats.fundsUtilized)}
                </Text>
              </LinearGradient>
            </View>

            {/* Progress */}
            <View style={styles.financialProgressWrap}>
              <View style={styles.financialProgressHeader}>
                <Text style={[styles.financialProgressLabel, { color: colors.textSecondary }]}>Fund Utilization</Text>
                <Text style={[styles.financialProgressPct, { color: '#10B981' }]}>
                  {stats.totalFundAllocated > 0
                    ? `${Math.round((stats.fundsUtilized / stats.totalFundAllocated) * 100)}%`
                    : '0%'}
                </Text>
              </View>
              <View style={[styles.financialProgressTrack, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5' }]}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.financialProgressFill, {
                    width: `${stats.totalFundAllocated > 0 ? Math.min((stats.fundsUtilized / stats.totalFundAllocated) * 100, 100) : 0}%`
                  }]}
                />
              </View>
              <Text style={[styles.financialRemainingText, { color: colors.textSecondary }]}>
                Remaining: {formatCurrency(Math.max(stats.totalFundAllocated - stats.fundsUtilized, 0))}
              </Text>
            </View>
          </View>
        </View>

        {/* Scholarship Progress */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Scholarship Management</Text>
          <View style={[styles.progressBar, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(51, 51, 51, 0.08)" }]}>
            <View style={[styles.progressFill, { width: `${scholarshipProgress.ratio}%` }]} />
          </View>
          <Text style={[styles.progressLabel, { color: colors.text }]}>{scholarshipProgress.label}</Text>
        </View>

        {/* Recent Scholarships */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Scholarships</Text>

          </View>
          <View style={[styles.cardList, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
            {recentScholarships.slice(0, 5).map((scholarship) => (
              <TouchableOpacity key={scholarship.id} style={[styles.listItem, { borderBottomColor: isDark ? colors.border : "rgba(51, 51, 51, 0.06)" }]} activeOpacity={0.8} onPress={() => router.push({ pathname: "/(dashboard)/provider/my-scheme-details", params: { id: scholarship.id } })}>
                <View style={[styles.listItemIcon, { backgroundColor: isDark ? colors.surface : "#f5f5f5" }]}>
                  <Ionicons name="school-outline" size={18} color="#4CAF50" />
                </View>
                <View style={styles.listItemBody}>
                  <Text style={[styles.listItemTitle, { color: colors.text }]}>{scholarship.title}</Text>
                  <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{scholarship.applicants} applicants</Text>
                </View>
                <View style={[styles.statusBadge, getStatusBadgeStyle(scholarship.status, isDark)]}>
                  <Text style={[styles.statusBadgeText, { color: isDark ? colors.text : "#333" }]}>{scholarship.status}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
            {recentScholarships.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No recent scholarships</Text>
              </View>
            )}
          </View>
        </View>



        {/* Quick Actions */}
        <View style={styles.featuresContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.featuresGrid}>
            <TouchableOpacity style={[styles.featureCard, { borderLeftColor: "#4CAF50", backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]} activeOpacity={0.8} onPress={() => router.push("/(dashboard)/provider/add-scholarship")}>
              <View style={styles.featureContent}>
                <View style={[styles.featureIcon, { backgroundColor: "#4CAF5020" }]}>
                  <Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={[styles.featureTitle, { color: colors.text }]}>Add New Scholarship</Text>
                  <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>Create a new scholarship program</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.featureCard, { borderLeftColor: "#673AB7", backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]} activeOpacity={0.8} onPress={() => router.push("/(dashboard)/provider/my-schemes")}>
              <View style={styles.featureContent}>
                <View style={[styles.featureIcon, { backgroundColor: "#673AB720" }]}>
                  <Ionicons name="documents-outline" size={24} color="#673AB7" />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={[styles.featureTitle, { color: colors.text }]}>My Schemes</Text>
                  <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>View and manage created schemes</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* <TouchableOpacity style={[styles.featureCard, { borderLeftColor: "#2196F3", backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]} activeOpacity={0.8} onPress={() => router.push("/(dashboard)/provider/applicants")}>
              <View style={styles.featureContent}>
                <View style={[styles.featureIcon, { backgroundColor: "#2196F320" }]}>
                  <Ionicons name="people-outline" size={24} color="#2196F3" />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={[styles.featureTitle, { color: colors.text }]}>View Applicants</Text>
                  <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>Review and manage applications</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity> */}

            <TouchableOpacity style={[styles.featureCard, { borderLeftColor: "#FF9800", backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]} activeOpacity={0.8} onPress={() => router.push("/(dashboard)/provider/kyc")}>
              <View style={styles.featureContent}>
                <View style={[styles.featureIcon, { backgroundColor: "#FF980020" }]}>
                  <Ionicons name="shield-checkmark-outline" size={24} color="#FF9800" />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={[styles.featureTitle, { color: colors.text }]}>Manage KYC</Text>
                  <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>Complete verification process</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>


          </View>
        </View>
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
    marginBottom: 14,
  },
  metricGradientCard: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  metricGradientTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 12
  },
  metricGradientIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricGradientNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  metricGradientLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 18,
    marginBottom: 14,
    textAlign: "center",
  },
  metricGradientBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  metricGradientBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
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


