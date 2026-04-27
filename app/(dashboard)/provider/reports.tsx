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
const CARD_MARGIN = 16;
const CARD_PADDING = 20;
const CONTAINER_WIDTH = SCREEN_WIDTH - (CARD_MARGIN * 2) - (CARD_PADDING * 2);
const CHART_WIDTH = CONTAINER_WIDTH;

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
      const total = analyticsData?.total_applications || 0;
      const pending = analyticsData?.pending_applications || 0;

      // Formatting funds
      const formattedFunds = funds > 100000
        ? `₹${(funds / 100000).toFixed(1)}L`
        : `₹${funds.toLocaleString()}`;

      return [
        {
          label: "Total Apps",
          value: String(total),
          icon: "people-outline" as keyof typeof Ionicons.glyphMap,
          gradient: ['#6366F1', '#818CF8'] as const,
          shadowColor: '#6366F1',
          change: "Total",
          isPositive: true
        },
        {
          label: "Pending",
          value: String(pending),
          icon: "time-outline" as keyof typeof Ionicons.glyphMap,
          gradient: ['#F59E0B', '#FBBF24'] as const,
          shadowColor: '#F59E0B',
          change: "Action Needed",
          isPositive: false
        },
        {
          label: "Approved",
          value: String(approved),
          icon: "checkmark-done-outline" as keyof typeof Ionicons.glyphMap,
          gradient: ['#10B981', '#34D399'] as const,
          shadowColor: '#10B981',
          change: "Completed",
          isPositive: true
        },
        {
          label: "Distributed",
          value: formattedFunds,
          icon: "wallet-outline" as keyof typeof Ionicons.glyphMap,
          gradient: ['#8B5CF6', '#A78BFA'] as const,
          shadowColor: '#8B5CF6',
          change: "Funds",
          isPositive: true
        },
      ];
    },
    [analyticsData]
  );


  const barData = useMemo(() => {
    if (!analyticsData?.application_trend || !Array.isArray(analyticsData.application_trend) || analyticsData.application_trend.length === 0) {
      return [{ value: 0, label: 'No Data' }];
    }
    // Map trend data
    return analyticsData.application_trend.map((item: any) => ({
      value: item.count,
      label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      frontColor: '#6366F1',
      gradientColor: '#818CF8',
      roundedTop: true,
      labelTextStyle: { color: colors.textSecondary, fontSize: 10 },
    }));
  }, [analyticsData, colors]);

  const pieData = useMemo(() => {
    const approved = analyticsData?.approved_applications || 0;
    const rejected = analyticsData?.rejected_applications || 0;
    const pending = analyticsData?.pending_applications || 0;
    const total = Math.max(approved + rejected + pending, 1); // Avoid div by 0

    return [
      {
        value: approved,
        percentage: Math.round((approved / total) * 100),
        color: '#10B981',
        gradientCenterColor: '#34D399',
        text: `${Math.round((approved / total) * 100)}%`,
        label: 'Approved',
        legendColor: '#10B981'
      },
      {
        value: pending,
        percentage: Math.round((pending / total) * 100),
        color: '#F59E0B',
        gradientCenterColor: '#FBBF24',
        text: `${Math.round((pending / total) * 100)}%`,
        label: 'Pending',
        legendColor: '#F59E0B'
      },
      {
        value: rejected,
        percentage: Math.round((rejected / total) * 100),
        color: '#EF4444',
        gradientCenterColor: '#F87171',
        text: `${Math.round((rejected / total) * 100)}%`,
        label: 'Rejected',
        legendColor: '#EF4444'
      },
    ].filter(item => item.value > 0 || (analyticsData?.total_applications === 0 && item.label === 'Pending')); // Show something if empty? or filter zeros
  }, [analyticsData]);

  const lineData = useMemo(() => {
    if (!analyticsData?.application_trend || !Array.isArray(analyticsData.application_trend) || analyticsData.application_trend.length === 0) {
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

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'applications': return { name: "people-outline", color: "#6366F1", bg: "rgba(99, 102, 241, 0.15)" };
      case 'pending': return { name: "time-outline", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)" };
      case 'funds': return { name: "wallet-outline", color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.15)" };
      case 'success_rate': return { name: "trending-up-outline", color: "#10B981", bg: "rgba(16, 185, 129, 0.15)" };
      default: return { name: "bulb-outline", color: "#6366F1", bg: "rgba(99, 102, 241, 0.15)" };
    }
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
            <Text style={[styles.title, { color: colors.text }]}>Analytics Insights</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Real-time performance overview</Text>
          </View>

          <View style={styles.chipFilterRow}>
            <TouchableOpacity
              style={[styles.chipBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.surface, borderColor: colors.border }]}
              onPress={() => setSchemeModalVisible(true)}
            >
              <Ionicons name="filter-outline" size={14} color={colors.primary} />
              <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
                {activeScheme.length > 15 ? activeScheme.substring(0, 13) + '...' : activeScheme}
              </Text>
              <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chipBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.surface, borderColor: colors.border }]}
              onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={[styles.chipText, { color: colors.text }]}>{activeFilter}</Text>
              <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scheme Modal & Filter Modal code remains same, skipping for brevity in this replacement block as they are unchanged logic essentially */}
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
            <View key={stat.label} style={[styles.statCard, { shadowColor: stat.shadowColor }]}>
              <LinearGradient
                colors={stat.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              >
                <View style={styles.statHeader}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name={stat.icon} size={18} color="#fff" />
                  </View>
                  <Text style={styles.statBadgeText}>{stat.change}</Text>
                </View>
                <View style={styles.statBody}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              </LinearGradient>
            </View>
          ))}
        </View>

        {/* Applications Trend */}
        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.08)" : colors.border }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <View style={[styles.chartIconBadge, { backgroundColor: "rgba(99, 102, 241, 0.1)" }]}>
                <Ionicons name="bar-chart-outline" size={18} color="#6366F1" />
              </View>
              <View>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Activity Trend</Text>
                <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Submission volume</Text>
              </View>
            </View>
          </View>

          <View style={[styles.chartWrapper, { width: CONTAINER_WIDTH, overflow: 'hidden' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={barData}
                width={Math.max(barData.length * 45, CHART_WIDTH)}
                height={180}
                barWidth={22}
                spacing={20}
                roundedTop
                roundedBottom
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: isDark ? "#94A3B8" : "#64748B", fontSize: 10 }}
                xAxisLabelTextStyle={{ color: isDark ? "#94A3B8" : "#64748B", fontSize: 10, fontWeight: '600' }}
                noOfSections={4}
                maxValue={Math.max(...barData.map((i: any) => i.value), 5)}
                isAnimated
                animationDuration={1000}
                gradientColor="#818CF8"
                frontColor="#6366F1"
                showGradient
                initialSpacing={10}
              />
            </ScrollView>
          </View>
        </View>

        {/* Application Status (Pie) */}
        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.08)" : colors.border }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <View style={[styles.chartIconBadge, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                <Ionicons name="pie-chart-outline" size={18} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Status Split</Text>
                <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Application lifecycle</Text>
              </View>
            </View>
          </View>

          <View style={styles.pieSection}>
            <View style={styles.pieWrapper}>
              <PieChart
                data={pieData.length > 0 ? pieData : [{ value: 1, color: colors.border, text: "" }]}
                donut
                radius={75}
                innerRadius={55}
                innerCircleColor={colors.card}
                centerLabelComponent={() => (
                  <View style={styles.pieCenter}>
                    <Text style={[styles.pieCenterValue, { color: colors.text }]}>{analyticsData?.total_applications || 0}</Text>
                    <Text style={[styles.pieCenterLabel, { color: colors.textSecondary }]}>Total</Text>
                  </View>
                )}
                isAnimated
                animationDuration={1200}
              />
            </View>

            <View style={styles.pieLegend}>
              {pieData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.legendColor }]} />
                  <View>
                    <Text style={[styles.legendLabel, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.legendValue, { color: colors.textSecondary }]}>{item.value} ({item.percentage}%)</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Success Rate */}
        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.08)" : colors.border }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <View style={[styles.chartIconBadge, { backgroundColor: "rgba(139, 92, 246, 0.1)" }]}>
                <Ionicons name="pulse-outline" size={18} color="#8B5CF6" />
              </View>
              <View>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Success Metrics</Text>
                <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Approval velocity</Text>
              </View>
            </View>
            <View style={[styles.rateBadge, { backgroundColor: "rgba(139, 92, 246, 0.1)" }]}>
              <Text style={[styles.rateBadgeText, { color: "#8B5CF6" }]}>{analyticsData?.success_rate ? analyticsData.success_rate.toFixed(1) : 0}% Rate</Text>
            </View>
          </View>

          <View style={[styles.lineWrapper, { width: CONTAINER_WIDTH, overflow: 'hidden' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={lineData}
                width={Math.max(lineData.length * 60, CHART_WIDTH)}
                height={160}
                spacing={50}
                color="#8B5CF6"
                thickness={3}
                startFillColor="#8B5CF6"
                endFillColor="transparent"
                startOpacity={0.2}
                endOpacity={0}
                initialSpacing={20}
                noOfSections={3}
                yAxisColor="transparent"
                xAxisColor="transparent"
                hideRules
                hideDataPoints={false}
                dataPointsColor="#8B5CF6"
                yAxisTextStyle={{ color: isDark ? "#94A3B8" : "#64748B", fontSize: 10 }}
                xAxisLabelTextStyle={{ color: isDark ? "#94A3B8" : "#64748B", fontSize: 10, fontWeight: '600', marginTop: 10 }}
                pointerConfig={{
                  pointerStripColor: '#8B5CF6',
                  pointerStripWidth: 2,
                  pointerColor: '#8B5CF6',
                  radius: 6,
                  pointerLabelWidth: 80,
                  pointerLabelHeight: 40,
                  activatePointersOnLongPress: true,
                  pointerVanishDelay: 2500,
                  pointerLabelComponent: (items: any) => (
                    <View style={{
                      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                      padding: 6,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                      width: 70,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      elevation: 5,
                      marginBottom: 10, // Move it up slightly from the dot
                    }}>
                      <Text style={{ color: isDark ? "#94A3B8" : "#64748B", fontSize: 8, fontWeight: '600' }}>Count</Text>
                      <Text style={{ color: isDark ? "#F1F5F9" : "#0F172A", fontWeight: '900', fontSize: 14, marginTop: 1 }}>{items[0].value}</Text>
                    </View>
                  ),
                }}
                curved
                areaChart
                isAnimated
                animationDuration={1500}
              />
            </ScrollView>
          </View>
        </View>

        {/* Quick Insights */}
        {analyticsData?.insights && analyticsData.insights.length > 0 && (
          <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.08)" : colors.border, marginBottom: 40 }]}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <View style={[styles.chartIconBadge, { backgroundColor: "rgba(99, 102, 241, 0.1)" }]}>
                  <Ionicons name="sparkles-outline" size={18} color="#6366F1" />
                </View>
                <View>
                  <Text style={[styles.chartTitle, { color: colors.text }]}>Smart Insights</Text>
                  <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Key performance highlights</Text>
                </View>
              </View>
            </View>

            <View style={styles.insightsList}>
              {analyticsData.insights.map((insight: any, idx: number) => {
                const iconInfo = getInsightIcon(insight.type);
                return (
                  <View key={idx} style={[styles.insightItem, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : colors.surface }]}>
                    <View style={[styles.insightIcon, { backgroundColor: iconInfo.bg }]}>
                      <Ionicons name={iconInfo.name as any} size={16} color={iconInfo.color} />
                    </View>
                    <View style={styles.insightContent}>
                      <Text style={[styles.insightTitle, { color: colors.text }]}>{insight.message}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  headerTextContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
    opacity: 0.7,
  },
  chipFilterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (SCREEN_WIDTH - 32 - 12) / 2,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  statGradient: {
    padding: 16,
    height: 130,
    justifyContent: 'space-between',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statBody: {
    marginTop: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  glassCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chartIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  chartSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
    opacity: 0.6,
  },
  chartWrapper: {
    alignItems: 'center',
    marginTop: 10,
  },
  pieSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 30, // Added gap between chart and legend
  },
  pieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieLegend: {
    gap: 12,
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
    opacity: 0.6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  legendValue: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  lineWrapper: {
    alignItems: 'center',
    marginTop: 10,
    marginLeft: -20, // To compensate for chart internal padding
  },
  rateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  rateBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
  },
  insightIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 24,
    textAlign: 'center'
  },
  filterOptionsContainer: {
    gap: 12,
    marginBottom: 24
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 16,
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '800',
  }
});