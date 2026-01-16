import { useTheme } from "@/context/ThemeContext";
import { getReviewerApplicationDetails, reviewApplication } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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

// API Types
interface User {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  fullname: string;
}

interface AssignedReviewer {
  id: number;
  name: string;
}

interface Attachment {
  id: number;
  filename: string;
  filesize: number;
  mimetype: string;
  fileurl: string;
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
  status: "new" | "approved" | "waitlisted" | "rejected" | null;
  priority: number;
  assigned_reviewer: AssignedReviewer | null;
  is_bookmarked: boolean;
  comments_count: number;
  attachments: Attachment[];
  documents: DocumentGroup[];
  timecreated: string;
  timemodified: string;
}

export default function ReviewerApplicationDetailsScreen() {
  const inset = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Data State
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplicationDetails();
  }, []);

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get Application ID from params
      // TODO: Ensure we're passing the ID correctly from the list screen
      // If params.id is missing, we might use a fallback for testing or error out
      const appId = params.id ? Number(params.id) : 123;

      console.log("Fetching details for App ID:", appId);

      // Get token
      const authDataStr = await AsyncStorage.getItem("authData");
      const authData = authDataStr ? JSON.parse(authDataStr) : null;
      const token = authData?.token;

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await getReviewerApplicationDetails(token, appId);

      if (response.success && response.data && response.data.application) {
        console.log("Details fetched:", response.data.application);
        setApplication(response.data.application);
      } else {
        throw new Error(response.error || "Failed to load application details");
      }

    } catch (err: any) {
      console.error("Error details:", err);
      setError(err.message || "Failed to load details");
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleReview = async (action: "approve" | "reject", notes?: string) => {
    if (!application) return;

    // Confirm approval
    if (action === "approve") {
      // We can add an alert confirmation here if desired
      // For now, proceed.
    }

    try {
      setSubmitting(true);
      const authDataStr = await AsyncStorage.getItem("authData");
      const authData = authDataStr ? JSON.parse(authDataStr) : null;
      const token = authData?.token;

      if (!token) {
        Alert.alert("Error", "Authentication token missing");
        return;
      }

      console.log(`Submitting review: ${action} for App ID ${application.id}`);
      const response = await reviewApplication(token, application.id, action, notes);

      if (response.success) {
        Alert.alert("Success", response.message, [
          {
            text: "OK", onPress: () => {
              // Refresh details or Go Back?
              // Usually better to refresh to show new status
              fetchApplicationDetails();
            }
          }
        ]);
        if (action === "reject") {
          setShowRejectModal(false);
          setRejectReason("");
        }
      } else {
        Alert.alert("Error", response.message || "Action failed");
      }

    } catch (error: any) {
      console.error("Review error:", error);
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading details...</Text>
      </View>
    );
  }

  if (error || !application) {
    const isPermissionError = error?.toLowerCase().includes("permission");
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: 20 }]}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: isPermissionError ? "#FFEBEE" : isDark ? "#333" : "#f5f5f5",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20
        }}>
          <Ionicons
            name={isPermissionError ? "lock-closed" : "alert-circle"}
            size={40}
            color={isPermissionError ? "#F44336" : colors.textSecondary}
          />
        </View>
        <Text style={{
          color: colors.text,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: '700',
          marginBottom: 8
        }}>
          {isPermissionError ? "Access Denied" : "Something went wrong"}
        </Text>
        <Text style={{
          color: colors.textSecondary,
          textAlign: 'center',
          fontSize: 14,
          maxWidth: 300,
          lineHeight: 20
        }}>
          {error || "We couldn't load the application details."}
        </Text>

        <TouchableOpacity
          style={[styles.actionBtn, styles.updateBtn, { marginTop: 32, paddingHorizontal: 32 }]}
          onPress={fetchApplicationDetails}
        >
          <Text style={styles.actionText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ marginTop: 20, padding: 10 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ReviewerHeader
          title={application.user.fullname} // Using fullname as title based on design context
          subtitle={`Application #${application.id}`}
          rightElement={
            <View
              style={[styles.statusBadge, getStatusBadgeStyle(application.status, isDark)]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: getStatusColor(application.status) },
                ]}
              >
                {application.status ? application.status.charAt(0).toUpperCase() + application.status.slice(1) : "New"}
              </Text>
            </View>
          }
        />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Student Info */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Student Info</Text>
            <View style={styles.infoGrid}>
              <InfoRow label="Full Name" value={application.user.fullname} colors={colors} />
              <InfoRow label="Email" value={application.user.email} colors={colors} />
              <InfoRow label="Date Applied" value={new Date(application.timecreated).toLocaleDateString()} colors={colors} />
              {/* Add more fields if available in API response later */}
            </View>
          </View>

          {/* Documents */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Uploaded Documents</Text>
            <View style={styles.docList}>
              {/* Display Documents from 'documents' array (verification needed usually) */}
              {application.documents && application.documents.length > 0 ? (
                application.documents.map((docGroup) => (
                  docGroup.files.map((file) => (
                    <View key={file.id} style={styles.docItem}>
                      <View style={styles.docLeft}>
                        <View style={[styles.docIcon, { backgroundColor: isDark ? colors.border : "#E3F2FD" }]}>
                          <Ionicons
                            name="document-text-outline"
                            size={18}
                            color={isDark ? colors.primary : "#2196F3"}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.docName, { color: colors.text }]}>
                            {docGroup.label || file.filename}
                          </Text>
                          <Text style={[styles.docMeta, { color: colors.textSecondary }]}>
                            {file.mimetype.split('/')[1]?.toUpperCase() || 'FILE'} • {(file.filesize / 1024).toFixed(0)} KB
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => router.push({
                            pathname: "/(dashboard)/reviewer/document-view",
                            params: {
                              id: file.id,
                              title: docGroup.label || file.filename,
                              fileName: file.filename,
                              url: file.fileurl
                            }
                          })}
                          style={[styles.viewDocBtn, { backgroundColor: isDark ? colors.surface : "#E3F2FD" }]}
                        >
                          <Text style={[styles.viewDocText, { color: isDark ? colors.primary : "#2196F3" }]}>View</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ))
              ) : (
                <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>No documents found.</Text>
              )}
            </View>
          </View>

          {/* Application Details */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Application Statement</Text>
            <Text style={[styles.bodyText, { color: colors.text }]}>
              {application.application_text || "No application text provided."}
            </Text>
          </View>

          {/* Comments Section Placeholder - API response has comments_count but not list, assuming separate API for list or simpler implementation */}
          {/* keeping it simple for now or fetch if needed later */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Comments ({application.comments_count})
            </Text>
            <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>Comments feature coming soon.</Text>

            <View style={styles.commentInputRow}>
              <TextInput
                placeholder="Add a comment..."
                placeholderTextColor={colors.textSecondary}
                style={[styles.commentInput, { color: colors.text, borderColor: colors.border }]}
              />
              <TouchableOpacity style={[styles.commentSendBtn, { backgroundColor: isDark ? colors.primary : "#333" }]}>
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>

        {/* Sticky Footer Actions */}
        <View style={[styles.footer, { paddingBottom: inset.bottom + 8, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn, styles.footerBtn, submitting && { opacity: 0.7 }]}
              disabled={submitting}
              onPress={() => handleReview("approve")}
            >
              <Ionicons name="checkmark-outline" size={18} color="#fff" />
              <Text style={styles.actionText}>{submitting ? "Processing..." : "Approve"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn, styles.footerBtn]}
              onPress={() => setShowRejectModal(true)}
            >
              <Ionicons name="close-outline" size={18} color="#fff" />
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reject Modal */}
        <Modal
          visible={showRejectModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRejectModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Application</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Please provide a reason</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                multiline
                numberOfLines={4}
                placeholder="Reason for rejection..."
                placeholderTextColor={colors.textSecondary}
                value={rejectReason}
                onChangeText={setRejectReason}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancel, { backgroundColor: isDark ? colors.border : "#f5f5f5" }]}
                  onPress={() => setShowRejectModal(false)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalReject, submitting && { opacity: 0.7 }]}
                  disabled={submitting}
                  onPress={() => handleReview("reject", rejectReason)}
                >
                  <Text style={styles.modalRejectText}>{submitting ? "Submitting..." : "Submit"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function getStatusColor(status: string | null) {
  if (!status) return "#2196F3"; // Default blue
  const s = status.toLowerCase();
  switch (s) {
    case "approved":
      return "#4CAF50";
    case "rejected":
      return "#F44336";
    case "waitlisted":
      return "#FF9800";
    case "pending": // Handling legacy/mock value just in case
      return "#FF9800";
    default:
      return "#2196F3"; // New/Default
  }
}

function getStatusBadgeStyle(status: string | null, isDark: boolean = false) {
  const opacity = isDark ? 0.2 : 1;
  const s = status ? status.toLowerCase() : "";

  if (!s) return { backgroundColor: isDark ? `rgba(33, 150, 243, ${opacity})` : "#E3F2FD" };

  switch (s) {
    case "approved":
      return { backgroundColor: isDark ? `rgba(76, 175, 80, ${opacity})` : "#E8F5E9" };
    case "rejected":
      return { backgroundColor: isDark ? `rgba(244, 67, 54, ${opacity})` : "#FFEBEE" };
    case "waitlisted":
    case "pending":
      return { backgroundColor: isDark ? `rgba(255, 152, 0, ${opacity})` : "#FFF3E0" };
    default:
      return { backgroundColor: isDark ? `rgba(33, 150, 243, ${opacity})` : "#E3F2FD" };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF3E0",
  },
  statusBadgeText: { fontSize: 12, fontWeight: "800" },
  content: { padding: 20, gap: 16, paddingBottom: 360 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#333",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(51,51,51,0.1)",
    padding: 16,
  },
  infoGrid: { gap: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { fontSize: 13, color: "#666", fontWeight: "600" },
  infoValue: { fontSize: 13, color: "#1a1a1a", fontWeight: "700" },
  docList: { gap: 10 },
  docItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  docLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  docIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },
  docName: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  docMeta: { fontSize: 12, color: "#666" },
  viewDocBtn: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewDocText: { color: "#2196F3", fontWeight: "800", fontSize: 12 },
  viewAllBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: 8,
  },
  viewAllText: {
    color: "#2196F3",
    fontWeight: "700",
    fontSize: 14,
  },
  bodyText: { fontSize: 14, color: "#333", lineHeight: 20 },
  commentRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  commentMeta: { fontSize: 12, color: "#666", fontWeight: "700" },
  commentText: { fontSize: 14, color: "#333" },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#1a1a1a",
  },
  commentSendBtn: { backgroundColor: "#333", padding: 12, borderRadius: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  approveBtn: { backgroundColor: "#4CAF50" },
  updateBtn: { backgroundColor: "#2196F3" },
  rejectBtn: { backgroundColor: "#F44336" },
  actionText: { color: "#fff", fontWeight: "800" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
  },
  footerActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  footerBtn: {
    flex: 1,
    justifyContent: "center",
  },
  fullWidthBtn: {
    width: "100%",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1a1a1a" },
  modalSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    marginBottom: 12,
    fontWeight: "600",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
    color: "#1a1a1a",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  modalCancel: { backgroundColor: "#f5f5f5" },
  modalReject: { backgroundColor: "#F44336" },
  modalCancelText: { color: "#333", fontWeight: "800" },
  modalRejectText: { color: "#fff", fontWeight: "800" },
});
