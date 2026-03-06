import { useTheme } from "@/context/ThemeContext";
import { donorReviewApplication, getReviewerApplicationDetails } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
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

interface ApplicationDetails {
  id: number;
  user: User;
  application_text: string | null;
  status: "new" | "approved" | "rejected" | "not_applied" | null;
  priority: number;
  assigned_reviewer: AssignedReviewer;
  is_bookmarked: boolean;
  comments_count: number;
  attachments: any[];
  documents: DocumentGroup[];
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
      return { color: "#10B981", bg: "rgba(16,185,129,0.12)", bg2: "#D1FAE5", label: "Approved", icon: "checkmark-circle" as const };
    case "rejected":
      return { color: "#EF4444", bg: "rgba(239,68,68,0.12)", bg2: "#FEE2E2", label: "Rejected", icon: "close-circle" as const };
    case "not_applied":
      return { color: "#94A3B8", bg: "rgba(148,163,184,0.12)", bg2: "#F1F5F9", label: "Not Applied", icon: "document-outline" as const };
    default:
      return { color: "#6366F1", bg: "rgba(99,102,241,0.12)", bg2: "#EEF2FF", label: "New", icon: "sparkles" as const };
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

  useFocusEffect(
    useCallback(() => { fetchDetails(); }, [])
  );

  const fetchDetails = async () => {
    try {
      setLoading(true);
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
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "600" }}>Go Back</Text>
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
      <ReviewerHeader
        title="Application Details"
        showBackButton
        onBackPress={() => router.back()}

      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + (canReview ? 100 : 32) }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero Card ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          {/* Avatar + name */}
          <View style={styles.heroRow}>
            <View style={[styles.avatar, { backgroundColor: isDark ? "rgba(99,102,241,0.18)" : avatarColor.bg }]}>
              <Text style={[styles.avatarText, { color: isDark ? "#A5B4FC" : avatarColor.text }]}>
                {initials.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.heroName, { color: colors.text }]}>{application.user.fullname}</Text>
              <View style={styles.heroMeta}>
                <Ionicons name="mail-outline" size={13} color={subText} />
                <Text style={[styles.heroMetaText, { color: subText }]} numberOfLines={1}>
                  {application.user.email}
                </Text>
              </View>
              <View style={styles.heroMeta}>
                <Ionicons name="person-circle-outline" size={13} color={subText} />
                <Text style={[styles.heroMetaText, { color: subText }]}>
                  User #{application.user.id}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick stats strip */}
          <View style={[styles.statsStrip, { borderColor: border }]}>
            <StatChip icon="documents-outline" value={String(totalFiles)} label="Uploaded" color="#6366F1" isDark={isDark} />
            <View style={[styles.stripDiv, { backgroundColor: border }]} />
            <StatChip icon="checkmark-circle-outline" value={String(verifiedFiles)} label="Verified" color="#10B981" isDark={isDark} />
            <View style={[styles.stripDiv, { backgroundColor: border }]} />
            <StatChip icon="alert-circle-outline" value={String(docsWithoutFiles.length)} label="Pending" color="#F59E0B" isDark={isDark} />
            <View style={[styles.stripDiv, { backgroundColor: border }]} />
            <StatChip icon="chatbubble-outline" value={String(application.comments_count)} label="Comments" color="#8B5CF6" isDark={isDark} />
          </View>
        </View>

        {/* ── Application Info Card ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <SectionHeader icon="information-circle-outline" iconBg={isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF"} iconColor="#6366F1" title="Application Info" textColor={colors.text} />
          <View style={styles.infoGrid}>
            <InfoRow label="Application ID" value={`#${application.id}`} subText={subText} colors={colors} />
            <InfoRow label="User ID" value={`#${application.user.id}`} subText={subText} colors={colors} />
            <InfoRow label="Priority" value={application.priority > 0 ? `${application.priority} / 10` : "Not set"} subText={subText} colors={colors} />
            <InfoRow label="Bookmarked" value={application.is_bookmarked ? "Yes ★" : "No"} subText={subText} colors={colors} />
            <InfoRow label="Applied On" value={formatDate(application.timecreated)} subText={subText} colors={colors} />
            <InfoRow label="Last Modified" value={formatDate(application.timemodified)} subText={subText} colors={colors} />
            <InfoRow
              label="Assigned Reviewer"
              value={application.assigned_reviewer?.name ?? "Unassigned"}
              subText={subText}
              colors={colors}
            />
          </View>
        </View>

        {/* ── Application Statement / Details ── */}
        {application.application_text && application.application_text.trim() ? (() => {
          const parsed = parseApplicationText(application.application_text);
          if (parsed) {
            return (
              <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
                <SectionHeader
                  icon="document-text-outline"
                  iconBg={isDark ? "rgba(139,92,246,0.15)" : "#F3E8FF"}
                  iconColor="#8B5CF6"
                  title="Application Details"
                  textColor={colors.text}
                />

                {parsed.application_text?.trim() ? (
                  <View style={[styles.parsedNoteBox, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC", borderColor: border }]}>
                    <Text style={[styles.statement, { color: colors.text }]}>{parsed.application_text}</Text>
                  </View>
                ) : null}

                <View style={styles.parsedDetailsGrid}>
                  {Object.entries(parsed).map(([key, value]) => {
                    if (key === "application_text" || !value || value === "[]") return null;
                    const config = FIELD_CONFIGS[key] || { icon: "information-circle-outline", color: "#64748B", bg: "#F8FAFC", darkBg: "rgba(100,116,139,0.1)" };
                    const label = key.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

                    return (
                      <View key={key} style={[styles.parsedDetailRow, { borderBottomColor: border }]}>
                        <View style={[styles.detailIconBox, { backgroundColor: isDark ? config.darkBg : config.bg }]}>
                          <Ionicons name={config.icon} size={16} color={config.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.parsedDetailLabel, { color: subText }]}>{label}</Text>
                          <Text style={[styles.parsedDetailValue, { color: colors.text }]}>{value}</Text>
                        </View>
                      </View>
                    );
                  })}
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
                title="Application Statement"
                textColor={colors.text}
              />
              <Text style={[styles.statement, { color: colors.text }]}>{application.application_text}</Text>
            </View>
          );
        })() : null}

        {/* ── Documents Progress ── */}
        {application.documents.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <SectionHeader
              icon="folder-open-outline"
              iconBg={isDark ? "rgba(16,185,129,0.15)" : "#D1FAE5"}
              iconColor="#10B981"
              title="Documents"
              badge={`${docsWithFiles.length} / ${application.documents.length}`}
              textColor={colors.text}
            />
            {/* Progress bar */}
            <View style={[styles.progressBg, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${application.documents.length > 0
                      ? (docsWithFiles.length / application.documents.length) * 100
                      : 0}%` as any,
                    backgroundColor: "#10B981",
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressLabel, { color: subText }]}>
              {docsWithFiles.length} of {application.documents.length} documents submitted
            </Text>

            {/* Submitted documents */}
            {docsWithFiles.map((docGroup) => (
              <View key={docGroup.id} style={[styles.docGroup, { borderColor: border }]}>
                <View style={styles.docGroupHeader}>
                  <Ionicons name="folder-outline" size={14} color="#10B981" />
                  <Text style={[styles.docGroupLabel, { color: colors.text }]}>{docGroup.label}</Text>
                  <View style={[styles.docCountPill, { backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "#D1FAE5" }]}>
                    <Text style={[styles.docCountText, { color: "#10B981" }]}>{docGroup.files.length} file{docGroup.files.length !== 1 ? "s" : ""}</Text>
                  </View>
                </View>

                {docGroup.files.map((file) => {
                  const isVerified = file.verified;
                  const isRejected = !!(file.rejection_reason?.trim());
                  return (
                    <TouchableOpacity
                      key={file.id}
                      style={[styles.fileRow, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC", borderColor: border }]}
                      activeOpacity={0.75}
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
                      {/* File type icon */}
                      <View style={[styles.fileIconBox, {
                        backgroundColor: isVerified
                          ? (isDark ? "rgba(16,185,129,0.15)" : "#D1FAE5")
                          : isRejected
                            ? (isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2")
                            : (isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF"),
                      }]}>
                        <Ionicons
                          name={getFileIcon(file.mimetype)}
                          size={18}
                          color={isVerified ? "#10B981" : isRejected ? "#EF4444" : "#6366F1"}
                        />
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[styles.fileNameText, { color: colors.text }]} numberOfLines={1}>
                          {file.filename}
                        </Text>
                        <View style={styles.fileMeta}>
                          <Text style={[styles.fileMetaText, { color: subText }]}>
                            {file.mimetype.split("/")[1]?.toUpperCase() || "FILE"}
                          </Text>
                          <View style={[styles.metaDot, { backgroundColor: subText }]} />
                          <Text style={[styles.fileMetaText, { color: subText }]}>{formatBytes(file.filesize)}</Text>
                          {isVerified && (
                            <>
                              <View style={[styles.metaDot, { backgroundColor: subText }]} />
                              <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                              <Text style={[styles.fileMetaText, { color: "#10B981" }]}>Verified</Text>
                            </>
                          )}
                          {isRejected && (
                            <>
                              <View style={[styles.metaDot, { backgroundColor: subText }]} />
                              <Ionicons name="close-circle" size={12} color="#EF4444" />
                              <Text style={[styles.fileMetaText, { color: "#EF4444" }]}>Rejected</Text>
                            </>
                          )}
                        </View>
                        {isRejected && file.rejection_reason && (
                          <Text style={[styles.rejectionReason, { color: "#EF4444" }]} numberOfLines={1}>
                            ↳ {file.rejection_reason}
                          </Text>
                        )}
                      </View>

                      <Ionicons name="chevron-forward" size={16} color={subText} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Pending / not uploaded documents */}
            {docsWithoutFiles.length > 0 && (
              <View style={styles.pendingSection}>
                <View style={styles.pendingHeader}>
                  <Ionicons name="hourglass-outline" size={14} color="#F59E0B" />
                  <Text style={[styles.pendingHeaderText, { color: subText }]}>Not yet uploaded</Text>
                </View>
                {docsWithoutFiles.map((docGroup) => (
                  <View
                    key={docGroup.id}
                    style={[styles.pendingPill, {
                      backgroundColor: isDark ? "rgba(245,158,11,0.08)" : "#FFFBEB",
                      borderColor: isDark ? "rgba(245,158,11,0.25)" : "#FDE68A",
                    }]}
                  >
                    <Ionicons name="document-outline" size={14} color="#F59E0B" />
                    <Text style={[styles.pendingPillText, { color: colors.text }]} numberOfLines={2}>
                      {docGroup.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Sticky Action Footer ── */}
      {canReview && (
        <View style={[styles.footer, {
          backgroundColor: cardBg,
          borderTopColor: border,
          paddingBottom: insets.bottom + 12,
        }]}>
          {submitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator size="small" color="#6366F1" />
              <Text style={[styles.submittingText, { color: subText }]}>Submitting…</Text>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={handleApprove} activeOpacity={0.84}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => setShowRejectModal(true)} activeOpacity={0.84}>
                <Ionicons name="close-circle" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
              <Text style={[styles.modalLabel, { color: colors.text }]}>Reason for Rejection *</Text>
              <TextInput
                style={[styles.modalInput, {
                  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC",
                  color: colors.text,
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0",
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
function SectionHeader({ icon, iconBg, iconColor, title, badge, textColor }: {
  icon: any; iconBg: string; iconColor: string; title: string; badge?: string; textColor: string;
}) {
  return (
    <View style={shStyles.row}>
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
  scroll: { padding: 16, gap: 14 },

  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  loadingText: { fontSize: 15, fontWeight: "500", marginTop: 8 },
  errorIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  errorTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  errorMsg: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#6366F1", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginTop: 8 },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Status pill in header
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusPillText: { fontSize: 12, fontWeight: "700" },

  // Card
  card: {
    borderRadius: 20, borderWidth: 1, padding: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },

  // Hero
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 20, fontWeight: "800", letterSpacing: 0.5 },
  heroName: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  heroMetaText: { fontSize: 12, fontWeight: "500", flex: 1 },

  // Stats strip
  statsStrip: { flexDirection: "row", borderTopWidth: 1, paddingTop: 14, gap: 0 },
  stripDiv: { width: 1, height: 36, alignSelf: "center" },

  // Info grid
  infoGrid: { gap: 0 },

  // Statement
  statement: { fontSize: 14, lineHeight: 22, fontWeight: "400" },
  parsedNoteBox: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  parsedDetailsGrid: { gap: 12, marginTop: 10 },
  parsedDetailRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderBottomWidth: 1 },
  detailIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  parsedDetailLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  parsedDetailValue: { fontSize: 14, fontWeight: "700" },

  // Progress bar
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 12, fontWeight: "500", marginBottom: 16 },

  // Doc group
  docGroup: { borderTopWidth: 1, paddingTop: 14, marginTop: 4, gap: 10 },
  docGroupHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 },
  docGroupLabel: { flex: 1, fontSize: 13, fontWeight: "700" },
  docCountPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  docCountText: { fontSize: 11, fontWeight: "700" },

  // File row
  fileRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  fileIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fileNameText: { fontSize: 13, fontWeight: "600" },
  fileMeta: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  fileMetaText: { fontSize: 11, fontWeight: "500" },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.5 },
  rejectionReason: { fontSize: 11, fontStyle: "italic" },

  // Pending
  pendingSection: { borderTopWidth: 1, borderTopColor: "rgba(245,158,11,0.2)", paddingTop: 14, marginTop: 8, gap: 8 },
  pendingHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  pendingHeaderText: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  pendingPill: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 11, borderRadius: 12, borderWidth: 1, borderStyle: "dashed" },
  pendingPillText: { flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 18 },

  // Footer
  footer: {
    borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 10,
  },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 14 },
  approveBtn: { backgroundColor: "#10B981", shadowColor: "#10B981", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  rejectBtn: { backgroundColor: "#EF4444", shadowColor: "#EF4444", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  submittingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14 },
  submittingText: { fontSize: 14, fontWeight: "600" },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  modalIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: "700" },
  modalCloseBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  modalBody: { paddingHorizontal: 20, gap: 14, paddingBottom: 4 },
  modalLabel: { fontSize: 14, fontWeight: "600" },
  modalInput: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 14, minHeight: 110, fontWeight: "400" },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontSize: 14, fontWeight: "700" },
});
