import { useTheme } from "@/context/ThemeContext";
import { donorReviewApplication, getReviewerApplicationDetails } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  fullname: string;
}

interface AssignedReviewer {
  id: number | null;
  name: string | null;
}

interface DocumentFile {
  id: number;
  filename: string;
  filesize: number;
  mimetype: string;
  fileurl: string;
  verified: boolean;
  verified_by: number | null;
  verified_at: string | null;
  rejection_reason: string | null;
}

interface DocumentGroup {
  id: number;
  cmid: number;
  label: string;
  files: DocumentFile[];
}

interface QuizQuestion {
  slot: number;
  question: string;
  answer: string;
  right_answer: string;
  state: string;
}

interface QuizAttempt {
  attempt_id: number;
  attempt: number;
  state: string;
  timestart: number;
  timefinish: number;
  sumgrades?: number;
  questions: QuizQuestion[];
}

interface Quiz {
  cmid: number;
  quizid: number;
  name: string;
  attempts: QuizAttempt[];
}

interface InterviewBooking {
  slotid: number;
  appointment_id: number;
  starttime: number;
  starttime_iso: string;
  endtime: number;
  duration_minutes: number;
  teacher_name: string;
  location: string;
  attended: boolean;
}

interface InterviewSlot {
  cmid: number;
  scheduler_id: number;
  name: string;
  bookings: InterviewBooking[];
}

interface ReviewerComment {
  id: number;
  comment: string;
  reviewer: {
    id: number;
    name: string;
  };
  created_at: string;
}

interface ApplicationDetails {
  id: number;
  user: User;
  application_text: string | null;
  status: "approved" | "rejected" | "not_applied" | null;
  priority: number;
  assigned_reviewer: AssignedReviewer;
  is_bookmarked: boolean;
  comments_count: number;
  comments?: ReviewerComment[];
  attachments: any[];
  documents: DocumentGroup[];
  quiz_attempts?: Quiz[];
  interview_slots?: InterviewSlot[];
  timecreated: string;
  timemodified: string;
}

interface ParsedApplicationData {
  application_text?: string;
  fullname?: string;
  email?: string;
  phone?: string;
  student_id?: string;
  institution?: string;
  major?: string;
  graduation_date?: string;
  current_year?: string;
  gpa?: string;
  activities?: string;
  financial_info?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStatusCfg(status: ApplicationDetails["status"]) {
  switch (status) {
    case "approved":
      return {
        color: "#059669",
        bg: "rgba(16,185,129,0.1)",
        bg2: "#D1FAE5",
        label: "Approved",
        icon: "checkmark-circle" as const,
        gradient: ["#10B981", "#059669"]
      };
    case "rejected":
      return {
        color: "#DC2626",
        bg: "rgba(239,68,68,0.1)",
        bg2: "#FEE2E2",
        label: "Rejected",
        icon: "close-circle" as const,
        gradient: ["#EF4444", "#DC2626"]
      };
    case "not_applied":
      return {
        color: "#475569",
        bg: "rgba(148,163,184,0.1)",
        bg2: "#F1F5F9",
        label: "Not Applied",
        icon: "document-outline" as const,
        gradient: ["#94A3B8", "#475569"]
      };
    default:
      return {
        color: "#4F46E5",
        bg: "rgba(99,102,241,0.1)",
        bg2: "#EEF2FF",
        label: "Pending",
        icon: "time-outline" as const,
        gradient: ["#6366F1", "#4F46E5"]
      };
  }
}

function getAvatarColor(name: string) {
  const colors = [
    { bg: "#EEF2FF", text: "#6366F1" },
    { bg: "#D1FAE5", text: "#059669" },
    { bg: "#FEF3C7", text: "#D97706" },
    { bg: "#FEE2E2", text: "#DC2626" },
    { bg: "#F3E8FF", text: "#9333EA" },
    { bg: "#FFEDD5", text: "#EA580C" },
    { bg: "#CFFAFE", text: "#0891B2" },
    { bg: "#FCE7F3", text: "#DB2777" },
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      "  " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch { return dateStr; }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function parseApplicationText(text: string | null): ParsedApplicationData | null {
  if (!text) return null;
  try {
    const trimmed = text.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed;
      }
    }
  } catch {
    // Not valid JSON
  }
  return null;
}

function getFileIcon(mimetype: string): "image-outline" | "document-text-outline" | "videocam-outline" | "document-outline" {
  if (mimetype.includes("image")) return "image-outline";
  if (mimetype.includes("pdf")) return "document-text-outline";
  if (mimetype.includes("video")) return "videocam-outline";
  return "document-outline";
}

const FIELD_CONFIGS: Record<string, { icon: any; color: string; bg: string; darkBg: string }> = {
  phone: { icon: "call-outline", color: "#3B82F6", bg: "#EFF6FF", darkBg: "rgba(59,130,246,0.15)" },
  institution: { icon: "business-outline", color: "#10B981", bg: "#ECFDF5", darkBg: "rgba(16,185,129,0.15)" },
  major: { icon: "school-outline", color: "#6366F1", bg: "#EEF2FF", darkBg: "rgba(99,102,241,0.15)" },
  gpa: { icon: "stats-chart-outline", color: "#F59E0B", bg: "#FFFBEB", darkBg: "rgba(245,158,11,0.15)" },
  financial_info: { icon: "wallet-outline", color: "#8B5CF6", bg: "#F5F3FF", darkBg: "rgba(139,92,246,0.15)" },
  fullname: { icon: "person-outline", color: "#EC4899", bg: "#FDF2F8", darkBg: "rgba(236,72,153,0.15)" },
  graduation_date: { icon: "time-outline", color: "#64748B", bg: "#F8FAFC", darkBg: "rgba(100,116,139,0.15)" },
  current_year: { icon: "calendar-outline", color: "#64748B", bg: "#F8FAFC", darkBg: "rgba(100,116,139,0.15)" },
  activities: { icon: "sparkles-outline", color: "#06B6D4", bg: "#ECFEFF", darkBg: "rgba(6,182,212,0.15)" },
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReviewerApplicationDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();

  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isFirstLoad = useRef(true);

  useFocusEffect(
    useCallback(() => { fetchDetails(); }, [])
  );

  const fetchDetails = async () => {
    try {
      if (isFirstLoad.current) setLoading(true);
      setError(null);
      const appId = Number(params.id);
      if (!params.id || isNaN(appId) || appId <= 0) throw new Error("Invalid application ID");
      const authDataStr = await AsyncStorage.getItem("authData");
      const token = authDataStr ? JSON.parse(authDataStr)?.token : null;
      if (!token) throw new Error("No authentication token found");
      const response = await getReviewerApplicationDetails(token, appId);
      if (response.success && response.data?.application) {
        setApplication(response.data.application);
      } else {
        throw new Error(response.error || "Failed to load application details");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load details");
      Alert.alert("Error", err.message);
    } finally {
      isFirstLoad.current = false;
      setLoading(false);
    }
  };

  const submitReview = async (action: "approve" | "reject", notes?: string) => {
    if (!application?.id) return;
    try {
      setSubmitting(true);
      const authDataStr = await AsyncStorage.getItem("authData");
      const token = authDataStr ? JSON.parse(authDataStr)?.token : null;
      if (!token) { Alert.alert("Error", "Session expired. Please login."); return; }
      const response = await donorReviewApplication(token, application.id, action, notes);
      if (response.success) {
        const label = action === "approve" ? "approved" : "rejected";
        Alert.alert("Success", `Application ${label} successfully`, [{ text: "OK", onPress: fetchDetails }]);
        setRejectionReason("");
      } else {
        Alert.alert("Error", response.error || "Failed to submit review");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = () =>
    Alert.alert("Approve Application", "Are you sure you want to approve this application?", [
      { text: "Cancel", style: "cancel" },
      { text: "Approve", onPress: () => submitReview("approve") },
    ]);

  const submitReject = () => {
    if (!rejectionReason.trim()) { Alert.alert("Required", "Please provide a rejection reason"); return; }
    setShowRejectModal(false);
    submitReview("reject", rejectionReason);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading details…</Text>
        </View>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !application) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={isDark ? ["#0f0f0f", "#1e1e1e"] : ["#F9FAFB", "#F3F4F6"]}
          style={StyleSheet.absoluteFill}
        />
        <ReviewerHeader title="Error" showBackButton />
        <View style={styles.centerWrap}>
          <View style={[styles.errorIcon, { backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2" }]}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Something went wrong</Text>
          <Text style={[styles.errorMsg, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchDetails}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "700" }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusCfg = getStatusCfg(application.status);
  const avatarColor = getAvatarColor(application.user.fullname);
  const initials = (application.user.firstname?.charAt(0) ?? "") + (application.user.lastname?.charAt(0) ?? "");
  const docsWithFiles = application.documents.filter((d) => d.files.length > 0);
  const docsWithoutFiles = application.documents.filter((d) => d.files.length === 0);
  const totalFiles = application.documents.reduce((s, d) => s + d.files.length, 0);
  const verifiedFiles = application.documents.flatMap((d) => d.files).filter((f) => f.verified).length;
  const canReview = !["approved", "rejected"].includes(application.status ?? "");

  const cardBg = isDark ? "#000" : "#FFFFFF";
  const border = isDark ? "rgba(255,255,255,0.07)" : "#E2E8F0";
  const subText = isDark ? "#94A3B8" : "#64748B";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ["#0f0f0f", "#1e1e1e", "#000"] : ["#F9FAFB", "#F3F4F6", "#E5E7EB"]}
        style={StyleSheet.absoluteFill}
      />
      <ReviewerHeader
        title="Application Details"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + (canReview ? 120 : 40) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status Header ── */}
        <View style={styles.statusHeaderRow}>
          <LinearGradient
            colors={statusCfg.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statusBadge}
          >
            <Ionicons name={statusCfg.icon} size={14} color="#fff" />
            <Text style={styles.statusBadgeText}>{statusCfg.label}</Text>
          </LinearGradient>
          <Text style={[styles.timeInfo, { color: subText }]}>
            Applied {formatDate(application.timecreated)}
          </Text>
        </View>

        {/* ── Hero Card ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.heroRow}>
            <LinearGradient
              colors={[avatarColor.bg, isDark ? "#334155" : avatarColor.bg]}
              style={styles.avatar}
            >
              <Text style={[styles.avatarText, { color: isDark ? "#fff" : avatarColor.text }]}>
                {initials.toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.heroName, { color: colors.text }]}>{application.user.fullname}</Text>
              <View style={styles.heroMeta}>
                <Ionicons name="mail" size={12} color={subText} />
                <Text style={[styles.heroMetaText, { color: subText }]}>{application.user.email}</Text>
              </View>
              {application.assigned_reviewer?.name && (
                <View style={[styles.reviewerTag, { backgroundColor: isDark ? "rgba(99,102,241,0.1)" : "#EEF2FF" }]}>
                  <Ionicons name="person" size={10} color="#6366F1" />
                  <Text style={[styles.reviewerTagText, { color: "#6366F1" }]}>
                    Reviewer: {application.assigned_reviewer.name}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Quick stats strip */}
          <View style={[styles.statsStrip, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC", borderColor: border }]}>
            <StatChip
              icon="documents"
              value={String(totalFiles)}
              label="Files"
              color="#6366F1"
              isDark={isDark}
            />
            <View style={[styles.stripDiv, { backgroundColor: border }]} />
            <StatChip
              icon="checkmark-done-circle"
              value={String(verifiedFiles)}
              label="Verified"
              color="#10B981"
              isDark={isDark}
            />
            <View style={[styles.stripDiv, { backgroundColor: border }]} />
            <StatChip
              icon="chatbubbles"
              value={String(application.comments_count)}
              label="Comments"
              color="#8B5CF6"
              isDark={isDark}
            />
          </View>
        </View>

        {/* ── Rejection Comments ── */}
        {application.status === "rejected" && application.comments && application.comments.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border, marginTop: 16 }]}>
            <SectionHeader
              icon="alert-circle-outline"
              iconBg={isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2"}
              iconColor="#EF4444"
              title="Rejection Reason"
              textColor={colors.text}
              noMargin
            />
            <View style={{ gap: 12, marginTop: 16 }}>
              {application.comments.map(comment => (
                <View key={comment.id} style={{ backgroundColor: isDark ? "rgba(239,68,68,0.05)" : "#FEF2F2", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? "rgba(239,68,68,0.1)" : "#FECACA" }}>
                  <Text style={{ fontSize: 14, color: isDark ? "#F87171" : "#B91C1C", lineHeight: 22, fontWeight: "500" }}>"{comment.comment}"</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: subText, fontWeight: "600" }}>- {comment.reviewer.name}</Text>
                    <Text style={{ fontSize: 11, color: subText }}>{formatDate(comment.created_at)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Application Data Sections ── */}
        {application.application_text && application.application_text.trim() ? (() => {
          const parsed = parseApplicationText(application.application_text);
          if (parsed) {
            return (
              <View style={styles.detailsContainer}>
                {/* Statement if exists */}
                {parsed.application_text?.trim() && (
                  <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
                    <SectionHeader
                      icon="chatbubble-ellipses-outline"
                      iconBg={isDark ? "rgba(139,92,246,0.12)" : "#F3E8FF"}
                      iconColor="#8B5CF6"
                      title="Student Statement"
                      textColor={colors.text}
                    />
                    <View style={[styles.statementBox, { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#F8FAFC" }]}>
                      <Text style={[styles.statement, { color: colors.text }]}>
                        "{parsed.application_text}"
                      </Text>
                    </View>
                  </View>
                )}

                {/* Structured Info Grid */}
                <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
                  <SectionHeader
                    icon="grid-outline"
                    iconBg={isDark ? "rgba(99,102,241,0.12)" : "#EEF2FF"}
                    iconColor="#6366F1"
                    title="Student Profile"
                    textColor={colors.text}
                  />
                  <View style={styles.gridContainer}>
                    {Object.entries(parsed).map(([key, value]) => {
                      if (key === "application_text" || !value || value === "[]") return null;

                      const config = FIELD_CONFIGS[key] || { icon: "information-circle-outline", color: "#64748B", bg: "#F8FAFC", darkBg: "rgba(100,116,139,0.1)" };
                      const label = key.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

                      // Handle object values (e.g. financial_info)
                      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                        return (
                          <View key={key} style={[styles.gridItem, { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={[styles.smallIconBox, { backgroundColor: isDark ? config.darkBg : config.bg }]}>
                                <Ionicons name={config.icon} size={14} color={config.color} />
                              </View>
                              <Text style={[styles.gridLabel, { color: subText, fontSize: 13, fontWeight: '700' }]}>{label}</Text>
                            </View>
                            <View style={{ width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 10, padding: 10, gap: 6, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }}>
                              {Object.entries(value as Record<string, string>).map(([subKey, subVal]) => (
                                <View key={subKey} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                                  <Text style={[styles.gridLabel, { color: subText, flex: 1 }]}>
                                    {subKey.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                                  </Text>
                                  <Text style={[styles.gridValue, { color: colors.text, flex: 1.2, textAlign: 'right' }]} numberOfLines={2}>
                                    {String(subVal ?? "")}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        );
                      }

                      // Handle array values
                      if (Array.isArray(value)) return null;

                      return (
                        <View key={key} style={styles.gridItem}>
                          <View style={[styles.smallIconBox, { backgroundColor: isDark ? config.darkBg : config.bg }]}>
                            <Ionicons name={config.icon} size={14} color={config.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.gridLabel, { color: subText }]}>{label}</Text>
                            <Text style={[styles.gridValue, { color: colors.text }]} numberOfLines={2}>
                              {String(value)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            );
          }
          return (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <SectionHeader
                icon="document-text-outline"
                iconBg={isDark ? "rgba(139,92,246,0.15)" : "#F3E8FF"}
                iconColor="#8B5CF6"
                title="Application Note"
                textColor={colors.text}
              />
              <Text style={[styles.statement, { color: colors.text }]}>{application.application_text}</Text>
            </View>
          );
        })() : null}

        {/* ── Quizzes / Assessments ── */}
        {application.quiz_attempts && application.quiz_attempts.length > 0 && (
          <View style={{ gap: 16, marginTop: 16 }}>
            <SectionHeader
              icon="help-circle-outline"
              iconBg={isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7"}
              iconColor="#F59E0B"
              title="Assessment Quizzes"
              textColor={colors.text}
              noMargin
            />
            {application.quiz_attempts.map(quiz => (
              <View key={quiz.cmid} style={[styles.card, { backgroundColor: cardBg, borderColor: border, padding: 20 }]}>
                <Text style={[styles.docGroupLabel, { color: colors.text, marginBottom: 12 }]}>{quiz.name}</Text>
                {quiz.attempts.map((attempt, index) => (
                  <View key={attempt.attempt_id} style={{ marginBottom: index === quiz.attempts.length - 1 ? 0 : 20, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#F8FAFC", padding: 16, borderRadius: 20, borderWidth: 1, borderColor: border }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textSecondary }}>Attempt {attempt.attempt}</Text>
                      <View style={[shStyles.badge, { backgroundColor: attempt.state === "finished" ? (isDark ? "rgba(16,185,129,0.15)" : "#D1FAE5") : (isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7") }]}>
                        <Text style={[shStyles.badgeText, { color: attempt.state === "finished" ? "#10B981" : "#F59E0B", fontSize: 10, textTransform: "uppercase" }]}>
                          {attempt.state}
                        </Text>
                      </View>
                    </View>
                    <View style={{ gap: 16 }}>
                      {attempt.questions && attempt.questions.length > 0 ? (
                        attempt.questions.map(q => (
                          <View key={q.slot} style={{ gap: 6 }}>
                            <Text style={{ fontSize: 14, color: colors.text, fontWeight: "600", lineHeight: 20 }}>{q.slot}. {q.question.replace(/\s+/g, ' ').trim()}</Text>
                            <View style={{ backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "#FFFFFF", padding: 12, borderRadius: 16, borderWidth: 1, borderColor: border }}>
                              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Answer: <Text style={{ fontWeight: "600", color: colors.text }}>{q.answer || "No answer"}</Text></Text>
                              {q.state === "Correct" && <Text style={{ fontSize: 12, color: "#10B981", marginTop: 4, fontWeight: "600" }}>Correct ✓</Text>}
                              {q.state === "Incorrect" && <Text style={{ fontSize: 12, color: "#EF4444", marginTop: 4, fontWeight: "600" }}>Incorrect ✗</Text>}
                              {q.state === "Requires grading" && <Text style={{ fontSize: 12, color: "#F59E0B", marginTop: 4, fontWeight: "600" }}>Needs grading ⏳</Text>}
                              {["Correct", "Incorrect", "Requires grading", "Not answered", "Not yet answered"].indexOf(q.state) === -1 && <Text style={{ fontSize: 12, color: subText, marginTop: 4, fontWeight: "600" }}>{q.state}</Text>}
                              {["Not answered", "Not yet answered"].indexOf(q.state) !== -1 && <Text style={{ fontSize: 12, color: subText, marginTop: 4, fontWeight: "600" }}>No Answer Given</Text>}
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={{ fontSize: 13, color: subText, fontStyle: "italic" }}>No questions data found.</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* ── Interview Sessions ── */}
        {application.interview_slots && application.interview_slots.length > 0 && (
          <View style={{ gap: 16, marginTop: 16 }}>
            <SectionHeader
              icon="calendar-outline"
              iconBg={isDark ? "rgba(236,72,153,0.15)" : "#FCE7F3"}
              iconColor="#DB2777"
              title="Interview Sessions"
              textColor={colors.text}
              noMargin
            />
            {application.interview_slots.map(slot => (
              <View key={slot.cmid} style={[styles.card, { backgroundColor: cardBg, borderColor: border, padding: 20 }]}>
                <Text style={[styles.docGroupLabel, { color: colors.text, marginBottom: 12 }]}>{slot.name}</Text>
                {slot.bookings.length > 0 ? slot.bookings.map((booking, index) => (
                  <View key={booking.slotid} style={{ marginBottom: index === slot.bookings.length - 1 ? 0 : 16, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#F9FAFB", padding: 16, borderRadius: 20, borderWidth: 1, borderColor: border }}>
                    <View style={{ flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 10 }}>
                      <View style={[styles.fileIconPlate, { backgroundColor: isDark ? "rgba(236,72,153,0.1)" : "#FCE7F3", width: 40, height: 40 }]}>
                        <Ionicons name="time-outline" size={20} color="#DB2777" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                          {new Date(booking.starttime * 1000).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </Text>
                        <Text style={{ fontSize: 12, color: subText, marginTop: 2 }}>Duration: {booking.duration_minutes} mins</Text>
                      </View>
                      <View style={[shStyles.badge, { backgroundColor: booking.attended ? (isDark ? "rgba(16,185,129,0.15)" : "#D1FAE5") : (isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0") }]}>
                        <Text style={[shStyles.badgeText, { color: booking.attended ? "#10B981" : subText, fontSize: 10, textTransform: "uppercase" }]}>
                          {booking.attended ? "ATTENDED" : "SCHEDULED"}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <Ionicons name="person-circle-outline" size={16} color={subText} />
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>Reviewer: <Text style={{ fontWeight: "700", color: colors.text }}>{booking.teacher_name}</Text></Text>
                    </View>
                    {booking.location && !booking.location.startsWith("http") && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                        <Ionicons name="location-outline" size={16} color={subText} />
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Location: {booking.location}</Text>
                      </View>
                    )}
                  </View>
                )) : (
                  <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#F9FAFB", padding: 16, borderRadius: 20, borderWidth: 1, borderColor: border, alignItems: "center" }}>
                    <Ionicons name="calendar-outline" size={24} color={subText} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <Text style={{ fontSize: 14, color: subText, fontStyle: "italic" }}>No bookings found.</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Documents Section ── */}
        <View style={[styles.sectionHeaderWrap, { marginTop: 24 }]}>
          <View style={{ flex: 1 }}>
            <SectionHeader
              icon="folder-open-outline"
              iconBg={isDark ? "rgba(16,185,129,0.15)" : "#D1FAE5"}
              iconColor="#10B981"
              title="Required Documents"
              textColor={colors.text}
              noMargin
            />
          </View>
          <View style={styles.docSummaryPill}>
            <Text style={styles.docSummaryText}>
              {docsWithFiles.length} / {application.documents.length}
            </Text>
          </View>
        </View>

        <View style={styles.docsList}>
          {application.documents.map((docGroup) => {
            const hasFiles = docGroup.files.length > 0;
            return (
              <View
                key={docGroup.id}
                style={[
                  styles.docGroupCard,
                  { backgroundColor: cardBg, borderColor: border, opacity: hasFiles ? 1 : 0.7 }
                ]}
              >
                <View style={styles.docGroupInfo}>
                  <Text style={[styles.docGroupLabel, { color: colors.text }]}>{docGroup.label}</Text>
                  {!hasFiles && (
                    <View style={styles.pendingBadge}>
                      <Ionicons name="time-outline" size={10} color="#F59E0B" />
                      <Text style={styles.pendingBadgeText}>Waiting for upload</Text>
                    </View>
                  )}
                </View>

                {docGroup.files.map((file) => {
                  const isVerified = file.verified;
                  const isRejected = !!(file.rejection_reason?.trim());
                  return (
                    <TouchableOpacity
                      key={file.id}
                      style={[styles.premiumFileRow, { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#F9FAFB", borderColor: border }]}
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push({
                          pathname: "/(dashboard)/reviewer/document-view",
                          params: {
                            id: file.id,
                            title: docGroup.label,
                            fileName: file.filename,
                            filesize: file.filesize,
                            mimetype: file.mimetype,
                            url: file.fileurl,
                            verified: file.verified ? "true" : "false",
                            rejectionReason: file.rejection_reason || "",
                          },
                        })
                      }
                    >
                      <View style={[styles.fileIconPlate, {
                        backgroundColor: isVerified ? "#10B98120" : isRejected ? "#EF444420" : "#6366F120"
                      }]}>
                        <Ionicons
                          name={getFileIcon(file.mimetype)}
                          size={20}
                          color={isVerified ? "#10B981" : isRejected ? "#EF4444" : "#6366F1"}
                        />
                      </View>

                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                          {file.filename}
                        </Text>
                        <View style={styles.fileMetadata}>
                          <Text style={[styles.fileSmallText, { color: subText }]}>
                            {formatBytes(file.filesize)}
                          </Text>
                          {isVerified && (
                            <View style={styles.statusMini}>
                              <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
                              <Text style={styles.statusVerifiedText}>Verified</Text>
                            </View>
                          )}
                          {isRejected && (
                            <View style={styles.statusMini}>
                              <View style={[styles.dot, { backgroundColor: "#EF4444" }]} />
                              <Text style={styles.statusRejectedText}>Rejected</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={[styles.actionIndicator, { borderColor: border }]}>
                        <Ionicons name="eye-outline" size={14} color={subText} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Sticky Action Footer ── */}
      {canReview && (
        <BlurView
          intensity={isDark ? 80 : 100}
          tint={isDark ? "dark" : "light"}
          style={[styles.footer, {
            borderTopColor: border,
            paddingBottom: insets.bottom + 16,
          }]}
        >
          {submitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator size="small" color="#6366F1" />
              <Text style={[styles.submittingText, { color: subText }]}>Finalizing review…</Text>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => setShowRejectModal(true)} activeOpacity={0.84}>
                <LinearGradient
                  colors={["#EF4444", "#DC2626"]}
                  style={styles.actionGradient}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Reject</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.approveBtn} onPress={handleApprove} activeOpacity={0.84}>
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.actionGradient}
                >
                  <Ionicons name="checkmark-sharp" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Approve</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </BlurView>
      )}

      {/* ── Reject Modal ── */}
      <Modal visible={showRejectModal} transparent animationType="slide" onRequestClose={() => setShowRejectModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowRejectModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: cardBg, paddingBottom: insets.bottom + 20 }]}>
            <View style={[styles.modalHandle, { backgroundColor: isDark ? "#475569" : "#CBD5E1" }]} />
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalIconBox, { backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2" }]}>
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Application</Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9" }]}>
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Reason for Rejection *</Text>
              <TextInput
                style={[styles.modalInput, {
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC",
                  color: colors.text,
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
                }]}
                placeholder="Provide a clear reason for the rejection…"
                placeholderTextColor={isDark ? "#475569" : "#94A3B8"}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { borderWidth: 1.5, borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0" }]}
                  onPress={() => { setShowRejectModal(false); setRejectionReason(""); }}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#EF4444", opacity: rejectionReason.trim() ? 1 : 0.5 }]}
                  onPress={submitReject}
                  disabled={!rejectionReason.trim()}
                >
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ icon, iconBg, iconColor, title, badge, textColor, noMargin }: {
  icon: any; iconBg: string; iconColor: string; title: string; badge?: string; textColor: string; noMargin?: boolean;
}) {
  return (
    <View style={[shStyles.row, noMargin && { marginBottom: 0 }]}>
      <View style={[shStyles.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[shStyles.title, { color: textColor }]}>{title}</Text>
      {badge && (
        <View style={[shStyles.badge, { backgroundColor: iconBg }]}>
          <Text style={[shStyles.badgeText, { color: iconColor }]}>{badge}</Text>
        </View>
      )}
    </View>
  );
}
const shStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 16, fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "700" },
});

function StatChip({ icon, value, label, color, isDark }: {
  icon: any; value: string; label: string; color: string; isDark: boolean;
}) {
  return (
    <View style={scStyles.chip}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[scStyles.value, { color }]}>{value}</Text>
      <Text style={[scStyles.label, { color: isDark ? "#64748B" : "#94A3B8" }]}>{label}</Text>
    </View>
  );
}
const scStyles = StyleSheet.create({
  chip: { flex: 1, alignItems: "center", gap: 3 },
  value: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  label: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
});

function InfoRow({ label, value, subText, colors }: {
  label: string; value: string; subText: string; colors: any;
}) {
  return (
    <View style={irStyles.row}>
      <Text style={[irStyles.label, { color: subText }]}>{label}</Text>
      <Text style={[irStyles.value, { color: colors.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}
const irStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 10, gap: 12 },
  label: { fontSize: 13, fontWeight: "500", flex: 1 },
  value: { fontSize: 13, fontWeight: "700", flex: 1.2, textAlign: "right" },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  loadingText: { fontSize: 16, fontWeight: "700", marginTop: 8 },
  errorIcon: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  errorTitle: { fontSize: 22, fontWeight: "800", textAlign: "center", letterSpacing: -0.5 },
  errorMsg: { fontSize: 15, textAlign: "center", lineHeight: 22, opacity: 0.8 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#6366F1", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16, marginTop: 12 },
  retryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  scroll: { padding: 16, gap: 16 },

  statusHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  statusBadgeText: { color: "#fff", fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  timeInfo: { fontSize: 11, fontWeight: "600" },

  card: { borderRadius: 28, borderWidth: 1, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22, fontWeight: "800" },
  heroName: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 6, opacity: 0.8 },
  heroMetaText: { fontSize: 13, fontWeight: "500" },
  reviewerTag: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start", marginTop: 4 },
  reviewerTagText: { fontSize: 11, fontWeight: "700" },

  statsStrip: { flexDirection: "row", borderRadius: 20, padding: 16, borderWidth: 1 },
  stripDiv: { width: 1, height: 32, alignSelf: "center" },

  detailsContainer: { gap: 16 },
  statementBox: { padding: 16, borderRadius: 20, marginTop: 4 },
  statement: { fontSize: 15, lineHeight: 24, fontWeight: "500", fontStyle: "italic", opacity: 0.9 },

  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridItem: { width: "48%", flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  smallIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  gridLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 },
  gridValue: { fontSize: 13, fontWeight: "700" },

  sectionHeaderWrap: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingHorizontal: 4, marginBottom: 12 },
  docSummaryPill: { backgroundColor: "rgba(16,185,129,0.1)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginLeft: 8 },
  docSummaryText: { color: "#10B981", fontSize: 11, fontWeight: "800" },

  docsList: { gap: 12 },
  docGroupCard: { borderRadius: 28, borderWidth: 1, padding: 16, gap: 12 },
  docGroupInfo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  docGroupLabel: { flex: 1, fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  pendingBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pendingBadgeText: { color: "#F59E0B", fontSize: 10, fontWeight: "700" },

  premiumFileRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 20, borderWidth: 1 },
  fileIconPlate: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  fileName: { fontSize: 14, fontWeight: "700" },
  fileMetadata: { flexDirection: "row", alignItems: "center", gap: 8 },
  fileSmallText: { fontSize: 11, fontWeight: "600" },
  statusMini: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  statusVerifiedText: { color: "#10B981", fontSize: 11, fontWeight: "700" },
  statusRejectedText: { color: "#EF4444", fontSize: 11, fontWeight: "700" },
  actionIndicator: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 16 },
  actionRow: { flexDirection: "row", gap: 12 },
  approveBtn: { flex: 1.4 },
  rejectBtn: { flex: 1 },
  actionGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  actionBtnText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.3 },
  submittingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 16 },
  submittingText: { fontSize: 15, fontWeight: "700" },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  modalSheet: { borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: "hidden" },
  modalHandle: { width: 48, height: 6, borderRadius: 3, alignSelf: "center", marginTop: 16 },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 24, paddingVertical: 20 },
  modalIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalTitle: { flex: 1, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  modalCloseBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  modalBody: { paddingHorizontal: 24, gap: 16 },
  modalLabel: { fontSize: 15, fontWeight: "700", opacity: 0.8 },
  modalInput: { borderWidth: 1, borderRadius: 24, padding: 20, fontSize: 15, minHeight: 140, lineHeight: 22, fontWeight: "500" },
  modalActions: { flexDirection: "row", gap: 12, marginBottom: 20 },
  modalBtn: { flex: 1, paddingVertical: 16, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontSize: 16, fontWeight: "800" },
});
