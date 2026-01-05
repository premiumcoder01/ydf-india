import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-gifted-charts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

interface AnalyticsData {
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  averageReviewTime: string;
  monthlyStats: {
    month: string;
    applications: number;
    approvals: number;
    rejections: number;
  }[];
}

const { width } = Dimensions.get('window');

export default function ReviewerReportsScreen() {
  const inset = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("month");
  const [animatedValues] = useState({
    cards: new Animated.Value(0),
    chart: new Animated.Value(0),
  });

  const analyticsData: AnalyticsData = {
    totalApplications: 247,
    approvedApplications: 189,
    rejectedApplications: 43,
    pendingApplications: 15,
    averageReviewTime: "2.3 days",
    monthlyStats: [
      { month: "Jan", applications: 45, approvals: 32, rejections: 8 },
      { month: "Feb", applications: 52, approvals: 38, rejections: 9 },
      { month: "Mar", applications: 48, approvals: 35, rejections: 7 },
      { month: "Apr", applications: 61, approvals: 44, rejections: 12 },
      { month: "May", applications: 55, approvals: 40, rejections: 10 },
      { month: "Jun", applications: 58, approvals: 42, rejections: 11 },
      { month: "Jul", applications: 62, approvals: 45, rejections: 13 },
      { month: "Aug", applications: 49, approvals: 36, rejections: 8 },
      { month: "Sep", applications: 54, approvals: 39, rejections: 10 },
      { month: "Oct", applications: 47, approvals: 34, rejections: 9 },
      { month: "Nov", applications: 43, approvals: 31, rejections: 7 },
      { month: "Dec", applications: 41, approvals: 29, rejections: 8 },
    ]
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(animatedValues.cards, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.spring(animatedValues.chart, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 8,
        delay: 200,
      }),
    ]).start();
  }, []);

  const getFilteredData = () => {
    const data = analyticsData.monthlyStats;
    switch (selectedPeriod) {
      case "week":
        return data.slice(-2);
      case "month":
        return data.slice(-6);
      case "year":
        return data;
      default:
        return data.slice(-6);
    }
  };

  const approvalRate = Math.round((analyticsData.approvedApplications / analyticsData.totalApplications) * 100);
  const rejectionRate = Math.round((analyticsData.rejectedApplications / analyticsData.totalApplications) * 100);

  const handleExport = () => {
    Alert.alert(
      "Export Reports",
      "Choose export format:",
      [
        {
          text: "PDF",
          onPress: () => {
            Alert.alert("Success", "Report exported as PDF successfully!");
            console.log("Exporting PDF...");
          }
        },
        {
          text: "Excel",
          onPress: () => {
            Alert.alert("Success", "Report exported as Excel successfully!");
            console.log("Exporting Excel...");
          }
        },
        {
          text: "CSV",
          onPress: () => {
            Alert.alert("Success", "Report exported as CSV successfully!");
            console.log("Exporting CSV...");
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const renderAnalyticsCard = (
    title: string,
    value: string | number,
    subtitle?: string,
    icon: string = "analytics-outline",
    gradientColors: [string, string, ...string[]] = ["#2196F3", "#1976D2"],
    trend?: { value: string; isPositive: boolean }
  ) => (
    <Animated.View
      style={[
        styles.analyticsCard,
        {
          opacity: animatedValues.cards,
          transform: [{
            translateY: animatedValues.cards.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
        }
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name={icon as any} size={24} color="#fff" />
            </View>
            {trend && (
              <View style={styles.trendBadge}>
                <Ionicons
                  name={trend.isPositive ? "trending-up" : "trending-down"}
                  size={14}
                  color="#fff"
                />
                <Text style={styles.trendText}>{trend.value}</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardValue}>{value}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderLineChart = () => {
    const filteredData = getFilteredData();

    const lineData = filteredData.map((stat, index) => ({
      value: stat.applications,
      label: stat.month,
      dataPointText: stat.applications.toString(),
    }));

    const lineData2 = filteredData.map((stat, index) => ({
      value: stat.approvals,
      dataPointText: stat.approvals.toString(),
    }));

    return (
      <Animated.View
        style={[
          styles.chartCard,
          {
            backgroundColor: colors.card,
            opacity: animatedValues.chart,
            transform: [{
              scale: animatedValues.chart,
            }],
          }
        ]}
      >
        <View style={styles.chartHeader}>
          <View>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Application Trends</Text>
            <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Performance over time</Text>
          </View>
          <View style={[styles.periodSelector, { backgroundColor: isDark ? colors.border : "#F5F5F5" }]}>
            {(["week", "month", "year"] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.periodBtn, selectedPeriod === period && styles.activePeriodBtn]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={[styles.periodText, selectedPeriod === period && styles.activePeriodText]}>
                  {period === "week" ? "W" : period === "month" ? "M" : "Y"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.chartWrapper}>
          <LineChart
            data={lineData}
            data2={lineData2}
            height={220}
            width={width - 100}
            spacing={selectedPeriod === "year" ? 20 : 45}
            initialSpacing={20}
            color1="#2196F3"
            color2="#4CAF50"
            thickness={3}
            startFillColor1="#2196F3"
            startFillColor2="#4CAF50"
            startOpacity={0.3}
            endOpacity={0.1}
            areaChart
            curved
            hideDataPoints={false}
            dataPointsColor1="#2196F3"
            dataPointsColor2="#4CAF50"
            dataPointsRadius={4}
            textColor1={colors.textSecondary}
            textFontSize={10}
            textShiftY={-8}
            textShiftX={-5}
            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 11 }}
            xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            rulesColor={isDark ? "rgba(255,255,255,0.1)" : "#F5F5F5"}
            rulesType="solid"
            showVerticalLines
            verticalLinesColor={isDark ? "rgba(255,255,255,0.1)" : "#F5F5F5"}
            animateOnDataChange
            animationDuration={1000}
          />
        </View>

        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#2196F3" }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Total Applications</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#4CAF50" }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Approved</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderBarChart = () => {
    const filteredData = getFilteredData();

    const barData = filteredData.map((stat, index) => ({
      value: stat.applications,
      label: stat.month,
      spacing: 2,
      labelWidth: 40,
      labelTextStyle: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
      frontColor: '#2196F3',
    }));

    const stackData = filteredData.map((stat, index) => ({
      stacks: [
        { value: stat.approvals, color: '#4CAF50' },
        { value: stat.rejections, color: '#FF5722' },
      ],
      label: stat.month,
      labelTextStyle: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' as const },
    }));

    return (
      <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Monthly Comparison</Text>
            <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Stacked breakdown</Text>
          </View>
        </View>

        <View style={styles.chartWrapper}>
          <BarChart
            data={stackData}
            height={220}
            width={width - 100}
            barWidth={selectedPeriod === "year" ? 16 : 28}
            spacing={selectedPeriod === "year" ? 12 : 24}
            initialSpacing={20}
            isThreeD
            roundedTop
            roundedBottom
            xAxisThickness={1}
            yAxisThickness={1}
            xAxisColor={colors.border}
            yAxisColor={colors.border}
            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 11 }}
            noOfSections={5}
            maxValue={70}
            rulesColor={isDark ? "rgba(255,255,255,0.1)" : "#F5F5F5"}
            rulesType="solid"
            showVerticalLines
            verticalLinesColor={isDark ? "rgba(255,255,255,0.1)" : "#F5F5F5"}
            isAnimated
            animationDuration={800}
          />
        </View>

        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#4CAF50" }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Approved</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#FF5722" }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Rejected</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPieChart = () => {
    const pieData = [
      {
        value: analyticsData.approvedApplications,
        color: '#4CAF50',
        text: `${approvalRate}%`,
        label: 'Approved'
      },
      {
        value: analyticsData.rejectedApplications,
        color: '#FF5722',
        text: `${rejectionRate}%`,
        label: 'Rejected'
      },
      {
        value: analyticsData.pendingApplications,
        color: '#FF9800',
        text: `${Math.round((analyticsData.pendingApplications / analyticsData.totalApplications) * 100)}%`,
        label: 'Pending'
      },
    ];

    return (
      <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Status Distribution</Text>
            <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Current breakdown</Text>
          </View>
        </View>

        <View style={styles.pieContainer}>
          <PieChart
            data={pieData}
            donut
            radius={90}
            innerRadius={55}
            innerCircleColor={colors.card}
            centerLabelComponent={() => (
              <View style={styles.pieCenter}>
                <Text style={[styles.pieCenterValue, { color: colors.text }]}>{analyticsData.totalApplications}</Text>
                <Text style={[styles.pieCenterLabel, { color: colors.textSecondary }]}>Total</Text>
              </View>
            )}
            showText
            textColor="#fff"
            textSize={12}
            fontWeight="bold"
            focusOnPress
            showValuesAsLabels
            labelsPosition="outward"
          />

          <View style={styles.pieLegendContainer}>
            {pieData.map((item, index) => (
              <View key={index} style={[styles.pieLegendItem, { borderBottomColor: colors.border }]}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={[styles.pieLegendText, { color: colors.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.pieLegendValue, { color: colors.text }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Reports & Analytics"
        subtitle="Comprehensive performance insights"
        rightElement={
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: isDark ? colors.card : "#f5f5f5" }]} onPress={handleExport}>
            <Ionicons name="download-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Analytics Cards */}
        <View style={styles.analyticsGrid}>
          {renderAnalyticsCard(
            "Total Applications",
            analyticsData.totalApplications,
            "Reviewed this month",
            "document-text-outline",
            ["#2196F3", "#1976D2"],
            { value: "+12%", isPositive: true }
          )}
          {renderAnalyticsCard(
            "Approval Rate",
            `${approvalRate}%`,
            `${analyticsData.approvedApplications} approved`,
            "checkmark-circle-outline",
            ["#4CAF50", "#388E3C"],
            { value: "+5%", isPositive: true }
          )}
          {renderAnalyticsCard(
            "Avg Review Time",
            analyticsData.averageReviewTime,
            "Per application",
            "time-outline",
            ["#FF9800", "#F57C00"],
            { value: "-0.5d", isPositive: true }
          )}
          {renderAnalyticsCard(
            "Pending Reviews",
            analyticsData.pendingApplications,
            "Awaiting action",
            "hourglass-outline",
            ["#9C27B0", "#7B1FA2"]
          )}
        </View>

        {/* Line Chart */}
        {renderLineChart()}

        {/* Bar Chart */}
        {renderBarChart()}

        {/* Pie Chart */}
        {renderPieChart()}

        {/* Export Section */}
        <View style={styles.exportCard}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.exportGradient}
          >
            <View style={styles.exportContent}>
              <View style={styles.exportIconContainer}>
                <Ionicons name="cloud-download-outline" size={28} color="#fff" />
              </View>
              <View style={styles.exportInfo}>
                <Text style={styles.exportTitle}>Export Detailed Reports</Text>
                <Text style={styles.exportSubtitle}>Download analytics in PDF, Excel, or CSV format</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
              <Text style={styles.exportBtnText}>Export Now</Text>
              <Ionicons name="arrow-forward" size={18} color="#667eea" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA"
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
    gap: 16,
  },

  // Analytics Cards
  analyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    minWidth: "47%",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardGradient: {
    padding: 18,
  },
  cardContent: {
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  trendText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },
  cardValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
  },
  cardSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },

  // Charts
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  chartSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
    fontWeight: "500",
  },
  chartWrapper: {
    alignItems: "center",
    marginVertical: 10,
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 3,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activePeriodBtn: {
    backgroundColor: "#2196F3",
  },
  periodText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#999",
  },
  activePeriodText: {
    color: "#fff",
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },

  // Pie Chart
  pieContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  pieCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  pieCenterValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1a1a1a",
  },
  pieCenterLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    marginTop: 2,
  },
  pieLegendContainer: {
    marginTop: 24,
    gap: 12,
    width: '100%',
  },
  pieLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  pieLegendText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  pieLegendValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
  },

  // Export Section
  exportCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  exportGradient: {
    padding: 24,
  },
  exportContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  exportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  exportSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    lineHeight: 18,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
  },
  exportBtnText: {
    color: "#667eea",
    fontSize: 15,
    fontWeight: "800",
  },
});