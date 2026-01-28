import { HelloWave } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getDonorDashboardStats, getDonorRecentScholarships, getDonorScholarshipProgress, getUserProfile } from "@/utils/api";
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
  const [unreadCount] = useState<number>(2);
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

  // Initial data fetch on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([
        fetchUserProfile(),
        fetchStats(),
        fetchRecentScholarships()
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
      fetchRecentScholarships()
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? [colors.background, colors.background, colors.surface] : [colors.background, colors.background, colors.accent]}
        style={styles.background}
        locations={[0, 0.4, 1]}
      />

      {/* Welcome Header - Sticky */}
      <View style={[styles.header, { paddingTop: inset.top + 20 }]}>
        <View style={styles.headerContent}>
          <View style={styles.welcomeSection}>
            <Text style={[styles.welcomeText, { color: isDark ? colors.textSecondary : "#666" }]}>Hi,</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.userName, { color: colors.text }]}>{providerName}</Text>
              <HelloWave />
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push("/(dashboard)/provider/notifications")}
              style={styles.bellWrapper}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={26} color={colors.text} />
              {/* {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )} */}
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(dashboard)/provider/profile")} activeOpacity={0.8}>
              {profilePhotoUrl ? (
                <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? colors.card : "#fff", borderColor: colors.border }]}>
                  <Ionicons name="person-circle-outline" size={36} color={colors.text} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

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

          {/* Primary Metrics - Unified Group */}
          <View style={[styles.primaryMetricsGroup, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
            {/* Total Scholarships */}
            <View style={styles.metricItem}>
              <View style={[styles.metricIconBox, { backgroundColor: "#4CAF5015" }]}>
                <Ionicons name="school-outline" size={24} color="#4CAF50" />
              </View>
              <View style={styles.metricContent}>
                <Text style={[styles.metricNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                  {stats.totalScholarshipsCreated.toLocaleString()}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Scholarships</Text>
                <View style={styles.metricBadgeRow}>
                  <View style={[styles.metricBadge, { backgroundColor: "#4CAF5020" }]}>
                    <Text style={[styles.metricBadgeText, { color: "#4CAF50" }]} numberOfLines={1}>
                      {stats.activeScholarships.toLocaleString()} Active
                    </Text>
                  </View>
                  {stats.expiredScholarships > 0 && (
                    <View style={[styles.metricBadge, { backgroundColor: "#FF980020" }]}>
                      <Text style={[styles.metricBadgeText, { color: "#FF9800" }]} numberOfLines={1}>
                        {stats.expiredScholarships.toLocaleString()} Expired
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

            {/* Total Applications */}
            <View style={styles.metricItem}>
              <View style={[styles.metricIconBox, { backgroundColor: "#2196F315" }]}>
                <Ionicons name="people-outline" size={24} color="#2196F3" />
              </View>
              <View style={styles.metricContent}>
                <Text style={[styles.metricNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                  {stats.totalApplicants.toLocaleString()}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Applications</Text>
                <View style={styles.metricBadgeRow}>
                  <View style={[styles.metricBadge, { backgroundColor: "#2196F320" }]}>
                    <Text style={[styles.metricBadgeText, { color: "#2196F3" }]} numberOfLines={1}>
                      {stats.approvedStudents.toLocaleString()} Selected
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Application Status Breakdown */}
          <View style={[styles.applicationStatusCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBox, { backgroundColor: "#673AB715" }]}>
                <Ionicons name="analytics-outline" size={20} color="#673AB7" />
              </View>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Application Status</Text>
            </View>


            <View style={styles.statusGrid}>
              {/* First Row */}
              <View style={styles.statusRow}>
                {/* Pending */}
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#FF980015" }]}>
                    <Ionicons name="time-outline" size={20} color="#FF9800" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.pendingApplications.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Pending</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#FF980030" : "#FF980020" }]}>
                    <View style={[styles.statusBarFill, {
                      width: `${stats.totalApplicants > 0 ? (stats.pendingApplications / stats.totalApplicants * 100) : 0}%`,
                      backgroundColor: "#FF9800"
                    }]} />
                  </View>
                </View>

                {/* Approved */}
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#4CAF5015" }]}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.approvedApplications.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Approved</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#4CAF5030" : "#4CAF5020" }]}>
                    <View style={[styles.statusBarFill, {
                      width: `${stats.totalApplicants > 0 ? (stats.approvedApplications / stats.totalApplicants * 100) : 0}%`,
                      backgroundColor: "#4CAF50"
                    }]} />
                  </View>
                </View>
              </View>


              {/* Second Row */}
              <View style={[styles.statusRow, { justifyContent: "center" }]}>
                {/* Rejected */}
                <View style={styles.statusItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#F4433615" }]}>
                    <Ionicons name="close-circle-outline" size={20} color="#F44336" />
                  </View>
                  <Text style={[styles.statusNumber, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.rejectedApplications.toLocaleString()}
                  </Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Rejected</Text>
                  <View style={[styles.statusBar, { backgroundColor: isDark ? "#F4433630" : "#F4433620" }]}>
                    <View style={[styles.statusBarFill, {
                      width: `${stats.totalApplicants > 0 ? (stats.rejectedApplications / stats.totalApplicants * 100) : 0}%`,
                      backgroundColor: "#F44336"
                    }]} />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Financial Overview */}
          <View style={[styles.financialCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBox, { backgroundColor: "#10B98115" }]}>
                <Ionicons name="wallet-outline" size={20} color="#10B981" />
              </View>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Financial Overview</Text>
            </View>

            <View style={styles.financialRow}>
              <View style={styles.financialItem}>
                <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Total Allocated</Text>
                <Text style={[styles.financialAmount, { color: colors.text }]}>{formatCurrency(stats.totalFundAllocated)}</Text>
              </View>
              <View style={[styles.financialDivider, { backgroundColor: colors.border }]} />
              <View style={styles.financialItem}>
                <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Disbursed</Text>
                <Text style={[styles.financialAmount, { color: "#10B981" }]}>{formatCurrency(stats.fundsUtilized)}</Text>
              </View>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Utilization</Text>
                <Text style={[styles.progressPercentage, { color: colors.text }]}>
                  {stats.totalFundAllocated > 0
                    ? `${Math.round((stats.fundsUtilized / stats.totalFundAllocated) * 100)}%`
                    : '0%'}
                </Text>
              </View>
              <View style={[styles.progressBarLarge, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5" }]}>
                <View style={[styles.progressBarLargeFill, {
                  width: `${stats.totalFundAllocated > 0 ? (stats.fundsUtilized / stats.totalFundAllocated * 100) : 0}%`,
                  backgroundColor: "#10B981"
                }]} />
              </View>
              <Text style={[styles.remainingText, { color: colors.textSecondary }]}>
                Remaining: {formatCurrency(stats.totalFundAllocated - stats.fundsUtilized)}
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
            <TouchableOpacity onPress={() => router.push("/(dashboard)/provider/my-schemes")} accessibilityRole="button">
              <Text style={[styles.viewAllText, { color: colors.text }]}>View All</Text>
            </TouchableOpacity>
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
  // Unified Primary Metrics Group
  primaryMetricsGroup: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    minWidth: 0, // Allow flex items to shrink below content size
  },
  metricIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0, // Prevent icon from shrinking
  },
  metricContent: {
    flex: 1,
    gap: 3,
    minWidth: 0, // Allow content to shrink
  },
  metricNumber: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  metricBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  metricBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 1, // Allow badges to shrink if needed
  },
  metricBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  metricDivider: {
    width: 1,
    height: 70,
    marginHorizontal: 12,
    flexShrink: 0, // Keep divider size consistent
  },
  // New Primary Stats Styles (kept for compatibility)
  primaryStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  primaryStatCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statContent: {
    gap: 4,
  },
  primaryStatNumber: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 2,
  },
  primaryStatLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
  },
  statBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  miniStatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniStatText: {
    fontSize: 11,
    fontWeight: "600",
  },
  // Application Status Card
  applicationStatusCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
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
    minWidth: 0, // Allow items to shrink
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
  // Financial Card
  financialCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  financialRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  financialItem: {
    flex: 1,
    alignItems: "center",
  },
  financialLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
  },
  financialAmount: {
    fontSize: 18,
    fontWeight: "800",
  },
  financialDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 12,
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "700",
  },
  progressBarLarge: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarLargeFill: {
    height: "100%",
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
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


