import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getDonorAnalytics, getMyScholarships } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-gifted-charts";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 16;
const CHART_WIDTH = SCREEN_WIDTH - (CARD_PADDING * 4);

export default function ProviderReportsScreen() {
  const { isDark, colors } = useTheme();
  const params = useLocalSearchParams();
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const [activeScheme, setActiveScheme] = useState("All Schemes");
  const [activeSchemeId, setActiveSchemeId] = useState<number>(0);
  const [schemeModalVisible, setSchemeModalVisible] = useState(false);
  const [schemesList, setSchemesList] = useState<{ name: string, id: number }[]>([{ name: "All Schemes", id: 0 }]);

  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Initialize from params
  useEffect(() => {
    if (params.scheme_id && params.scheme_name) {
      const id = Number(params.scheme_id);
      const name = params.scheme_name as string;
      setActiveSchemeId(id);
      setActiveScheme(name);
      setSchemesList([{ name: "All Schemes", id: 0 }, { name, id }]);
    }
  }, [params.scheme_id, params.scheme_name]);

  const fetchSchemes = async () => {
    // If scheme_id was passed via params, skip fetching list to save bandwidth/time as requested
    if (params.scheme_id) return;

    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;
      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) return;

      const response = await getMyScholarships(token, { per_page: 100 });
      if (response.success && response.data?.data) {
        const fetchedSchemes = response.data.data.map((s: any) => ({
          name: s.fullname || s.title || "Untitled",
          id: s.id
        }));
        setSchemesList([{ name: "All Schemes", id: 0 }, ...fetchedSchemes]);
      }
    } catch (e) {
      console.error("Error fetching schemes for reports:", e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;
      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) return;

      // Calculate dates based on filter
      let startDate, endDate;
      const now = new Date();
      if (activeFilter === "This Month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;
        endDate = now.getTime() / 1000;
      } else if (activeFilter === "Last 3 Months") {
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime() / 1000;
        endDate = now.getTime() / 1000;
      } else if (activeFilter === "YTD") {
        startDate = new Date(now.getFullYear(), 0, 1).getTime() / 1000;
        endDate = now.getTime() / 1000;
      }

      const response = await getDonorAnalytics(token, {
        scholarship_id: activeSchemeId,
        start_date: startDate ? Math.floor(startDate) : undefined,
        end_date: endDate ? Math.floor(endDate) : undefined
      });

      if (response.success && response.data?.analytics) {
        setAnalyticsData(response.data.analytics);
      } else {
        // Set default valid structure if API fails or returns null
        setAnalyticsData({
          total_applications: 0,
          approved_applications: 0,
          rejected_applications: 0,
          funds_distributed: 0,
          success_rate: 0,
          application_trend: [],
          fund_split: []
        });
      }
    } catch (e) {
      console.error("Error fetching analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSchemes();
    }, [params.scheme_id])
  );

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [activeSchemeId, activeFilter])
  );

  const handleSchemeSelect = (scheme: { name: string, id: number }) => {
    setActiveScheme(scheme.name);
    setActiveSchemeId(scheme.id);
    setSchemeModalVisible(false);
  };

  const filterOptions = ["All", "This Month", "Last 3 Months", "YTD"];

  const handleFilterSelect = (filter: string) => {
    setActiveFilter(filter);
    setFilterModalVisible(false);
  };

  const stats = useMemo(
    () => {
      const funds = analyticsData?.funds_distributed || 0;
      const approved = analyticsData?.approved_applications || 0;

      // Formatting funds
      const formattedFunds = funds > 100000
        ? `₹${(funds / 100000).toFixed(1)}L`
        : `₹${funds.toLocaleString()}`;

      return [
        {
          label: "Funds Distributed",
          value: formattedFunds,
          icon: "cash" as keyof typeof Ionicons.glyphMap,
          gradient: ['#f093fb', '#f5576c'] as const,
          change: "N/A", // API doesn't return change % yet
          isPositive: true
        },
        {
          label: "Approved Apps",
          value: String(approved),
          icon: "checkmark-circle" as keyof typeof Ionicons.glyphMap,
          gradient: ['#4facfe', '#00f2fe'] as const,
          change: "N/A",
          isPositive: true
        },
      ]
    },
    [analyticsData]
  );


  const barData = useMemo(() => {
    if (!analyticsData?.application_trend || !Array.isArray(analyticsData.application_trend)) {
      return [{ value: 0, label: 'No Data' }];
    }
    // Map trend data
    return analyticsData.application_trend.map((item: any) => ({
      value: item.count,
      label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      frontColor: '#667eea',
      gradientColor: '#764ba2',
    }));
  }, [analyticsData]);

  const pieData = useMemo(() => {
    const approved = analyticsData?.approved_applications || 0;
    const rejected = analyticsData?.rejected_applications || 0;
    const pending = analyticsData?.pending_applications || 0;
    const total = Math.max(approved + rejected + pending, 1);

    return [
      {
        value: Math.round((approved / total) * 100),
        color: '#667eea',
        gradientCenterColor: '#764ba2',
        text: `${Math.round((approved / total) * 100)}%`,
      },
      {
        value: Math.round((pending / total) * 100),
        color: '#4facfe',
        gradientCenterColor: '#00f2fe',
        text: `${Math.round((pending / total) * 100)}%`,
      },
      {
        value: Math.round((rejected / total) * 100),
        color: '#f093fb',
        gradientCenterColor: '#f5576c',
        text: `${Math.round((rejected / total) * 100)}%`,
      },
    ];
  }, [analyticsData]);

  const lineData = useMemo(() => {
    // API example doesn't have explicit line chart data for success rate over time. 
    // We can just mirror barData or use dummy if unavailable. 
    // For now, let's use application trend as user interest line.
    if (!analyticsData?.application_trend || !Array.isArray(analyticsData.application_trend)) {
      return [{ value: 0, label: '', dataPointText: '' }];
    }
    return analyticsData.application_trend.map((item: any) => ({
      value: item.count,
      label: new Date(item.date).toLocaleDateString('en-US', { month: 'short' }),
      dataPointText: String(item.count)
    }));
  }, [analyticsData]);

  const handleExport = (format: string) => {
    Alert.alert("Export", `Exporting ${format} report...`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader title="Reports & Analytics" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Performance Dashboard</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Track your impact and growth</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
            <TouchableOpacity
              style={[styles.filterBtn, { borderColor: colors.border, backgroundColor: colors.card, marginRight: 10 }]}
              onPress={() => setSchemeModalVisible(true)}
            >
              <Ionicons name="grid-outline" size={16} color={colors.primary} />
              <Text style={[styles.filterText, { color: colors.text }]}>{activeScheme.length > 20 ? activeScheme.substring(0, 18) + '...' : activeScheme}</Text>
              <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={[styles.filterText, { color: colors.text }]}>{activeFilter}</Text>
              <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Scheme Modal */}
        <Modal
          visible={schemeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSchemeModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSchemeModalVisible(false)}
          >
            <View style={[styles.filterModal, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Scheme</Text>

              <ScrollView style={{ maxHeight: 300 }}>
                <View style={styles.filterOptionsContainer}>
                  {schemesList.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.filterOption,
                        { backgroundColor: activeScheme === option.name ? colors.primary : colors.surface },
                      ]}
                      onPress={() => handleSchemeSelect(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        { color: activeScheme === option.name ? '#fff' : colors.text }
                      ]}>{option.name}</Text>
                      {activeScheme === option.name && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surface, marginTop: 10 }]}
                onPress={() => setSchemeModalVisible(false)}
              >
                <Text style={[styles.closeBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Filter Modal */}
        <Modal
          visible={filterModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
          >
            <View style={[styles.filterModal, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filter View</Text>

              <View style={styles.filterOptionsContainer}>
                {filterOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOption,
                      { backgroundColor: activeFilter === option ? colors.primary : colors.surface },
                    ]}
                    onPress={() => handleFilterSelect(option)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      { color: activeFilter === option ? '#fff' : colors.text }
                    ]}>{option}</Text>
                    {activeFilter === option && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surface }]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={[styles.closeBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={stat.label} style={styles.statCard}>
              <LinearGradient
                colors={stat.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              >
                <View style={styles.statHeader}>
                  <View style={styles.statIconBg}>
                    <Ionicons name={stat.icon} size={20} color="#fff" />
                  </View>
                  <View style={styles.changeBadge}>
                    <Ionicons
                      name={stat.isPositive ? "trending-up" : "trending-down"}
                      size={10}
                      color="#fff"
                    />
                    <Text style={styles.changeText}>{stat.change}</Text>
                  </View>
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </LinearGradient>
            </View>
          ))}
        </View>

        {/* Applications Trend */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <View style={[styles.chartIconBadge, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.15)" : "#F0F1FF" }]}>
                <Ionicons name="trending-up" size={18} color="#667eea" />
              </View>
              <View>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Applications Trend</Text>
                <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Monthly breakdown</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.moreBtn, { backgroundColor: colors.surface }]}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.chartWrapper}>
            <BarChart
              data={barData}
              width={CHART_WIDTH}
              height={160}
              barWidth={CHART_WIDTH / 12}
              spacing={CHART_WIDTH / 20}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }}
              noOfSections={4}
              maxValue={160}
              isAnimated
              animationDuration={1000}
              gradientColor="#764ba2"
              frontColor="#667eea"
            />
          </View>
        </View>

        {/* Fund Allocation Pie */}
        <View style={[styles.fullCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <View style={[styles.chartIconBadge, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.15)" : "#F0F1FF" }]}>
                <Ionicons name="pie-chart" size={18} color="#667eea" />
              </View>
              <View>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Fund Split</Text>
                <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Distribution overview</Text>
              </View>
            </View>
          </View>

          <View style={styles.pieWrapper}>
            <PieChart
              data={pieData}
              donut
              radius={80}
              innerRadius={52}
              innerCircleColor={colors.card}
              centerLabelComponent={() => (
                <View style={styles.pieCenter}>
                  <Text style={[styles.pieCenterValue, { color: colors.text }]}>100%</Text>
                  <Text style={[styles.pieCenterLabel, { color: colors.textSecondary }]}>Total</Text>
                </View>
              )}
              isAnimated
              animationDuration={1200}
              focusOnPress
              toggleFocusOnPress
            />
          </View>

          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#667eea' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Scholarships (60%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4facfe' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Operations (30%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#f093fb' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Other (10%)</Text>
            </View>
          </View>
        </View>

        {/* Success Rate */}
        <View style={[styles.fullCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <View style={[styles.chartIconBadge, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.15)" : "#F0F1FF" }]}>
                <Ionicons name="stats-chart" size={18} color="#667eea" />
              </View>
              <View>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Success Rate</Text>
                <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Approval trends</Text>
              </View>
            </View>
          </View>

          <View style={styles.lineWrapper}>
            <LineChart
              data={lineData}
              width={CHART_WIDTH}
              height={140}
              spacing={CHART_WIDTH / 8}
              color="#667eea"
              thickness={3}
              startFillColor="rgba(102, 126, 234, 0.3)"
              endFillColor="rgba(102, 126, 234, 0.01)"
              startOpacity={0.9}
              endOpacity={0.2}
              initialSpacing={10}
              noOfSections={3}
              yAxisColor="transparent"
              xAxisColor="transparent"
              hideRules
              hideDataPoints={false}
              dataPointsColor="#667eea"
              dataPointsRadius={4}
              textShiftY={-8}
              textShiftX={-4}
              textFontSize={9}
              yAxisTextStyle={{ display: 'none' }}
              xAxisLabelTextStyle={{
                color: colors.textSecondary,
                fontSize: 10,
                fontWeight: '600',
                marginTop: 4
              }}
              curved
              areaChart
              isAnimated
              animationDuration={1500}
              onDataChangeAnimationDuration={1000}
            />
          </View>

          <View style={[styles.rateCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.rateValue}>73.5%</Text>
            <Text style={[styles.rateLabel, { color: colors.textSecondary }]}>Average Approval Rate</Text>
          </View>
        </View>

        {/* Quick Insights */}
        <View style={[styles.insightsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <View style={[styles.chartIconBadge, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.15)" : "#F0F1FF" }]}>
                <Ionicons name="bulb" size={18} color="#667eea" />
              </View>
              <View>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Quick Insights</Text>
                <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Key highlights</Text>
              </View>
            </View>
          </View>

          <View style={styles.insightsList}>
            <View style={[styles.insightItem, { backgroundColor: colors.surface }]}>
              <View style={[styles.insightIcon, { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.15)' : '#E8F5E9' }]}>
                <Ionicons name="arrow-up" size={16} color="#4CAF50" />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, { color: colors.text }]}>Applications up 24%</Text>
                <Text style={[styles.insightText, { color: colors.textSecondary }]}>Highest growth this quarter</Text>
              </View>
            </View>

            <View style={[styles.insightItem, { backgroundColor: colors.surface }]}>
              <View style={[styles.insightIcon, { backgroundColor: isDark ? 'rgba(255, 152, 0, 0.15)' : '#FFF3E0' }]}>
                <Ionicons name="time" size={16} color="#FF9800" />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, { color: colors.text }]}>36 pending reviews</Text>
                <Text style={[styles.insightText, { color: colors.textSecondary }]}>Review applications to improve rate</Text>
              </View>
            </View>

            <View style={[styles.insightItem, { backgroundColor: colors.surface }]}>
              <View style={[styles.insightIcon, { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.15)' : '#E3F2FD' }]}>
                <Ionicons name="trophy" size={16} color="#2196F3" />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, { color: colors.text }]}>Top performing month</Text>
                <Text style={[styles.insightText, { color: colors.textSecondary }]}>June saw 155 applications</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Export Section */}
        <View style={[styles.exportCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.exportHeader}>
            <View>
              <Text style={[styles.exportTitle, { color: colors.text }]}>Export Reports</Text>
              <Text style={[styles.exportSubtitle, { color: colors.textSecondary }]}>Download detailed analytics</Text>
            </View>
            <Ionicons name="download" size={22} color="#667eea" />
          </View>

          <View style={styles.exportButtons}>
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => handleExport('PDF')}
            >
              <Ionicons name="document-text" size={20} color="#667eea" />
              <Text style={[styles.exportBtnText, { color: colors.text }]}>PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => handleExport('Excel')}
            >
              <Ionicons name="grid" size={20} color="#10B981" />
              <Text style={[styles.exportBtnText, { color: colors.text }]}>Excel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => handleExport('CSV')}
            >
              <Ionicons name="list" size={20} color="#F59E0B" />
              <Text style={[styles.exportBtnText, { color: colors.text }]}>CSV</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'column',
    marginBottom: 20,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500",
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667eea',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  statGradient: {
    padding: 12,
    gap: 6,
    minHeight: 120,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.5,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.95)",
    marginTop: 2,
  },
  chartCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  fullCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  chartIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  chartSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  pieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  pieCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  pieCenterLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  legendContainer: {
    gap: 10,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    fontWeight: "600",
  },
  lineWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  rateCard: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  rateValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#667eea',
  },
  rateLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  insightsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  insightsList: {
    gap: 10,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  insightText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  exportCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  exportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  exportSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  filterModal: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center'
  },
  filterOptionsContainer: {
    gap: 12,
    marginBottom: 20
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontWeight: '700',
  }
});