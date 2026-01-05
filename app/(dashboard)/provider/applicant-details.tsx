import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ReviewerHeader from "../../../components/ReviewerHeader";

export default function ProviderApplicantDetailsScreen() {
  const { isDark, colors } = useTheme();
  const applicant = {
    id: "app-1",
    name: "Ravi Patel",
    age: 20,
    course: "BSc Computer Science",
    college: "ABC Institute of Technology",
    income: 24000,
    category: "OBC",
    essay:
      "I aspire to build scalable solutions that positively impact education accessibility across rural areas.",
    motivation:
      "This scholarship will reduce financial burden and allow me to focus on research and community projects.",
    progress: 72,
    appliedDate: "Mar 15, 2025",
    gpa: "3.8/4.0",
  };

  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "documents" | "notes"
  >("overview");

  const formattedIncome = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
      }).format(applicant.income),
    [applicant.income]
  );

  const getProgressColor = (progress: number): readonly [string, string] => {
    if (progress >= 70) return ["#10b981", "#059669"] as const;
    if (progress >= 40) return ["#f59e0b", "#d97706"] as const;
    return ["#ef4444", "#dc2626"] as const;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader title="Applicant Details" />

      {/* Hero Section */}
      <LinearGradient
        colors={isDark ? ["#4f46e5", "#7c3aed"] : ["#6366f1", "#8b5cf6"]}
        style={styles.heroSection}
      >
        <View style={styles.heroContent}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={["#fbbf24", "#f59e0b"]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {applicant.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </Text>
            </LinearGradient>
            <View style={[styles.statusBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Under Review</Text>
            </View>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{applicant.name}</Text>
            <Text style={styles.heroSubtitle}>{applicant.course}</Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.heroMetaText}>{applicant.age} years</Text>
              </View>
              <View style={styles.heroMetaDivider} />
              <View style={styles.heroMetaItem}>
                <Ionicons
                  name="school-outline"
                  size={14}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.heroMetaText}>GPA {applicant.gpa}</Text>
              </View>
            </View>
            <View style={styles.heroMetaItem}>
              <Ionicons
                name="time-outline"
                size={14}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.heroMetaText}>{applicant.appliedDate}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "overview" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("overview")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="person-outline"
            size={18}
            color={activeTab === "overview" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "overview" ? colors.primary : colors.textSecondary },
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "documents" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("documents")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="document-text-outline"
            size={18}
            color={activeTab === "documents" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "documents" ? colors.primary : colors.textSecondary },
            ]}
          >
            Documents
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "notes" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("notes")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={activeTab === "notes" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "notes" ? colors.primary : colors.textSecondary },
            ]}
          >
            Notes
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "overview" && (
          <>
            {/* Quick Stats */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: isDark ? "rgba(37, 99, 235, 0.15)" : "#dbeafe" },
                  ]}
                >
                  <Ionicons name="business-outline" size={20} color={isDark ? "#60a5fa" : "#2563eb"} />
                </View>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Institution</Text>
                <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={2}>
                  {applicant.college}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: isDark ? "rgba(22, 163, 74, 0.15)" : "#dcfce7" },
                  ]}
                >
                  <Ionicons name="cash-outline" size={20} color={isDark ? "#4ade80" : "#16a34a"} />
                </View>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Annual Income</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{formattedIncome}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: isDark ? "rgba(202, 138, 4, 0.15)" : "#fef3c7" },
                  ]}
                >
                  <Ionicons
                    name="pricetags-outline"
                    size={20}
                    color={isDark ? "#fbbf24" : "#ca8a04"}
                  />
                </View>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Category</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{applicant.category}</Text>
              </View>
            </View>

            {/* Progress Card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Application Progress</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Review completion status
                  </Text>
                </View>
                <View style={[styles.progressPercentBadge, { backgroundColor: isDark ? "rgba(22, 163, 74, 0.2)" : "#f0fdf4" }]}>
                  <Text style={[styles.progressPercentText, { color: isDark ? "#4ade80" : "#16a34a" }]}>
                    {applicant.progress}%
                  </Text>
                </View>
              </View>
              <View style={[styles.progressBarContainer, { backgroundColor: colors.surface }]}>
                <LinearGradient
                  colors={getProgressColor(applicant.progress)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressFill,
                    { width: `${applicant.progress}%` },
                  ]}
                />
              </View>
              <View style={styles.progressMilestones}>
                <ProgressMilestone
                  completed={applicant.progress >= 25}
                  label="Started"
                />
                <ProgressMilestone
                  completed={applicant.progress >= 50}
                  label="In Review"
                />
                <ProgressMilestone
                  completed={applicant.progress >= 75}
                  label="Verification"
                />
                <ProgressMilestone
                  completed={applicant.progress >= 100}
                  label="Completed"
                />
              </View>
            </View>

            {/* Application Details */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Application Statement</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Candidate's submission
                  </Text>
                </View>
              </View>

              <View style={styles.essaySection}>
                <View style={styles.essayHeader}>
                  <Ionicons name="bulb-outline" size={18} color={isDark ? colors.primary : "#6366f1"} />
                  <Text style={[styles.essayLabel, { color: colors.text }]}>Career Goals & Vision</Text>
                </View>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{applicant.essay}</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.essaySection}>
                <View style={styles.essayHeader}>
                  <Ionicons name="heart-outline" size={18} color="#ec4899" />
                  <Text style={[styles.essayLabel, { color: colors.text }]}>Motivation & Impact</Text>
                </View>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{applicant.motivation}</Text>
              </View>
            </View>
          </>
        )}

        {activeTab === "documents" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Uploaded Documents</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>3 files attached</Text>
              </View>
              {/* <TouchableOpacity
                style={[styles.downloadAllBtn, { backgroundColor: isDark ? colors.surface : "#eef2ff" }]}
                activeOpacity={0.7}
              >
                <Ionicons name="download-outline" size={16} color={colors.primary} />
                <Text style={[styles.downloadAllText, { color: colors.primary }]}>Download All</Text>
              </TouchableOpacity> */}
            </View>
            <View style={styles.docsList}>
              <DocCard
                title="ID Proof.pdf"
                size="2.4 MB"
                date="Mar 15, 2025"
                type="pdf"
              />
              <DocCard
                title="Income Certificate.jpg"
                size="1.8 MB"
                date="Mar 15, 2025"
                type="image"
              />
              <DocCard
                title="Marksheets.zip"
                size="5.2 MB"
                date="Mar 15, 2025"
                type="zip"
              />
            </View>
          </View>
        )}

        {activeTab === "notes" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Internal Notes</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Private reviewer comments
                </Text>
              </View>
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add your review notes, observations, or recommendations here..."
              placeholderTextColor={colors.textSecondary}
              multiline
              style={[styles.notesInput, {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text
              }]}
            />
            <TouchableOpacity style={[styles.saveNotesBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveNotesText}>Save Notes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.actionsTitle, { color: colors.text }]}>Review Decision</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.approveBtn}
              activeOpacity={0.85}
              onPress={() => console.log("Approve", applicant.id)}
            >
              <LinearGradient
                colors={["#10b981", "#059669"]}
                style={styles.actionBtnGradient}
              >
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.actionBtnText}>Approve</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectBtn}
              activeOpacity={0.85}
              onPress={() => console.log("Reject", applicant.id)}
            >
              <LinearGradient
                colors={["#ef4444", "#dc2626"]}
                style={styles.actionBtnGradient}
              >
                <Ionicons name="close-circle" size={22} color="#fff" />
                <Text style={styles.actionBtnText}>Reject</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: isDark ? colors.surface : "#f8fafc", borderColor: colors.border }]}
            activeOpacity={0.85}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text style={[styles.backBtnText, { color: colors.primary }]}>Back to Applications</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function ProgressMilestone({
  completed,
  label,
}: {
  completed: boolean;
  label: string;
}) {
  const { isDark, colors } = useTheme();
  return (
    <View style={styles.milestone}>
      <View
        style={[
          styles.milestoneCircle,
          { backgroundColor: isDark ? colors.surface : "#e5e7eb" },
          completed && styles.milestoneCircleComplete,
        ]}
      >
        {completed && <Ionicons name="checkmark" size={10} color="#fff" />}
      </View>
      <Text
        style={[
          styles.milestoneLabel,
          { color: colors.textSecondary },
          completed && styles.milestoneLabelComplete,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function DocCard({
  title,
  size,
  date,
  type,
}: {
  title: string;
  size: string;
  date: string;
  type: "pdf" | "image" | "zip";
}) {
  const { isDark, colors } = useTheme();
  const iconMap = {
    pdf: { name: "document-text", color: "#ef4444", bg: isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2" },
    image: { name: "image", color: "#8b5cf6", bg: isDark ? "rgba(139, 92, 246, 0.2)" : "#f3e8ff" },
    zip: { name: "archive", color: "#f59e0b", bg: isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7" },
  };
  const config = iconMap[type];

  return (
    <TouchableOpacity style={[styles.docCard, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
      <View style={[styles.docIcon, { backgroundColor: config.bg }]}>
        <Ionicons name={config.name as any} size={24} color={config.color} />
      </View>
      <View style={styles.docInfo}>
        <Text style={[styles.docTitle, { color: colors.text }]}>{title}</Text>
        <View style={styles.docMeta}>
          <Text style={[styles.docMetaText, { color: colors.textSecondary }]}>{size}</Text>
          <View style={[styles.docMetaDot, { backgroundColor: colors.textSecondary }]} />
          <Text style={[styles.docMetaText, { color: colors.textSecondary }]}>{date}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity
          style={[styles.docActionBtn, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.2)" : "#eef2ff", marginRight: 8 }]}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: "/(dashboard)/provider/view-document", params: { title, type } })}
        >
          <Ionicons name="eye-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        {/* <TouchableOpacity style={[styles.docActionBtn, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.2)" : "#eef2ff" }]} activeOpacity={0.7}>
          <Ionicons name="download-outline" size={20} color={colors.primary} />
        </TouchableOpacity> */}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { flex: 1 },
  content: { paddingBottom: 32 },

  // Hero Section
  heroSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  heroContent: { flexDirection: "row", gap: 16 },
  avatarContainer: { alignItems: "center", gap: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: { fontSize: 24, fontWeight: "800", color: "#fff" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
  },
  statusText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  heroInfo: { flex: 1, justifyContent: "center", gap: 4 },
  heroName: { fontSize: 24, fontWeight: "800", color: "#fff" },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  heroMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroMetaText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  heroMetaDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 14, fontWeight: "600" },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },

  // Cards
  card: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },

  // Progress
  progressPercentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressPercentText: { fontSize: 16, fontWeight: "800" },
  progressBarContainer: {
    width: "100%",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 6 },
  progressMilestones: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  milestone: { alignItems: "center", gap: 6 },
  milestoneCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneCircleComplete: { backgroundColor: "#10b981" },
  milestoneLabel: { fontSize: 11, fontWeight: "600" },
  milestoneLabelComplete: { color: "#10b981" },

  // Essay
  essaySection: { gap: 10 },
  essayHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  essayLabel: { fontSize: 14, fontWeight: "700" },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  divider: { height: 1, marginVertical: 20 },

  // Documents
  downloadAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  downloadAllText: { fontSize: 13, fontWeight: "700" },
  docsList: { gap: 12 },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  docInfo: { flex: 1, gap: 4 },
  docTitle: { fontSize: 14, fontWeight: "700" },
  docMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  docMetaText: { fontSize: 12, fontWeight: "500" },
  docMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  docActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Notes
  notesInput: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    textAlignVertical: "top",
    lineHeight: 24,
  },
  saveNotesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366f1",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  saveNotesText: { fontSize: 15, fontWeight: "800", color: "#fff" },

  // Actions
  actionsCard: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
  },
  actionsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  approveBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  rejectBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  actionBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  backBtnText: { fontSize: 15, fontWeight: "700" },
});
