import { useTheme } from "@/context/ThemeContext";
import { donorReviewApplication, getReviewerApplicationDetails } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
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
  status: "new" | "approved" | "waitlisted" | "rejected" | null;
  priority: number;
  assigned_reviewer: AssignedReviewer;
  is_bookmarked: boolean;
  comments_count: number;
  documents: DocumentGroup[];
  timecreated: string;
  timemodified: string;
}

export default function ReviewerApplicationDetailsScreen() {
  const inset = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();

  // Data State
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchApplicationDetails();
    }, [])
  );

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const appId = params.id ? Number(params.id) : 12212;

      console.log("Fetching details for App ID:", appId);

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

  const handleApprove = () => {
    Alert.alert(
      "Approve Application",
      "Are you sure you want to approve this application?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: () => submitReview("approve")
        }
      ]
    );
  };

  const handleWaitlist = () => {
    Alert.alert(
      "Waitlist Application",
      "Are you sure you want to waitlist this application?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Waitlist",
          style: "default",
          onPress: () => submitReview("waitlist")
        }
      ]
    );
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const submitReject = () => {
    if (!rejectionReason.trim()) {
      Alert.alert("Required", "Please provide a reason for rejection");
      return;
    }
    setShowRejectModal(false);
    submitReview("reject", rejectionReason);
  };

  const submitReview = async (action: "approve" | "reject" | "waitlist", notes?: string) => {
    if (!application) return;

    try {
      setSubmitting(true);

      const authDataStr = await AsyncStorage.getItem("authData");
      const authData = authDataStr ? JSON.parse(authDataStr) : null;
      const token = authData?.token;

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await donorReviewApplication(
        token,
        application.id,
        action,
        notes
      );

      if (response.success) {
        Alert.alert(
          "Success",
          `Application ${action === "approve" ? "approved" : action === "waitlist" ? "waitlisted" : "rejected"} successfully`,
          [
            {
              text: "OK",
              onPress: () => {
                // Refresh the application details
                fetchApplicationDetails();
                // Optionally navigate back
                // router.back();
              }
            }
          ]
        );
        setRejectionReason("");
      } else {
        Alert.alert("Error", response.error || "Failed to submit review");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.includes('pdf')) return 'document-text';
    if (mimetype.includes('image')) return 'image';
    if (mimetype.includes('video')) return 'videocam';
    return 'document';
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingCard, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading Application Details...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error || !application) {
    const isPermissionError = error?.toLowerCase().includes("permission");
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconContainer, {
            backgroundColor: isPermissionError ? "#FFEBEE" : isDark ? "#333" : "#f5f5f5"
          }]}>
            <Ionicons
              name={isPermissionError ? "lock-closed" : "alert-circle"}
              size={48}
              color={isPermissionError ? "#F44336" : colors.textSecondary}
            />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            {isPermissionError ? "Access Denied" : "Something went wrong"}
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {error || "We couldn't load the application details."}
          </Text>

          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchApplicationDetails}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Separate documents into those with files and those without
  const documentsWithFiles = application.documents.filter(doc => doc.files.length > 0);
  const documentsWithoutFiles = application.documents.filter(doc => doc.files.length === 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Application Details"
        subtitle={`#${application.id}`}
        rightElement={
          <View style={[styles.statusBadge, getStatusBadgeStyle(application.status, isDark)]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(application.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(application.status) }]}>
              {application.status ? application.status.charAt(0).toUpperCase() + application.status.slice(1) : "New"}
            </Text>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: inset.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Applicant Information Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? colors.surface : "#E3F2FD" }]}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Applicant Information</Text>
          </View>

          <View style={styles.infoSection}>
            <InfoRow
              icon="person-outline"
              label="Full Name"
              value={application.user.fullname}
              colors={colors}
              isDark={isDark}
            />
            <InfoRow
              icon="mail-outline"
              label="Email"
              value={application.user.email}
              colors={colors}
              isDark={isDark}
            />
            <InfoRow
              icon="calendar-outline"
              label="Applied On"
              value={formatDate(application.timecreated)}
              colors={colors}
              isDark={isDark}
            />
            <InfoRow
              icon="time-outline"
              label="Last Modified"
              value={formatDate(application.timemodified)}
              colors={colors}
              isDark={isDark}
            />
            {application.assigned_reviewer?.name && (
              <InfoRow
                icon="person-circle-outline"
                label="Assigned Reviewer"
                value={application.assigned_reviewer.name}
                colors={colors}
                isDark={isDark}
              />
            )}
            <InfoRow
              icon="flag-outline"
              label="Priority"
              value={application.priority.toString()}
              colors={colors}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Submitted Documents Card */}
        {documentsWithFiles.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? colors.surface : "#E8F5E9" }]}>
                <Ionicons name="documents" size={24} color="#4CAF50" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Submitted Documents</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  {documentsWithFiles.reduce((acc, doc) => acc + doc.files.length, 0)} documents uploaded
                </Text>
              </View>
            </View>

            <View style={styles.documentsContainer}>
              {documentsWithFiles.map((docGroup) => (
                <View key={docGroup.id} style={styles.documentGroup}>
                  <Text style={[styles.documentGroupLabel, { color: colors.text }]}>
                    {docGroup.label}
                  </Text>
                  {docGroup.files.map((file, index) => (
                    <TouchableOpacity
                      key={file.id}
                      style={[
                        styles.documentItem,
                        {
                          backgroundColor: isDark ? colors.surface : "#F8F9FA",
                          borderColor: colors.border
                        }
                      ]}
                      onPress={() => router.push({
                        pathname: "/(dashboard)/reviewer/document-view",
                        params: {
                          id: file.id,
                          title: docGroup.label || file.filename,
                          fileName: file.filename,
                          filesize: file.filesize,
                          mimetype: file.mimetype,
                          url: file.fileurl,
                          verified: file.verified ? "true" : "false",
                          rejectionReason: file.rejection_reason || ""
                        }
                      })}
                    >
                      <View style={[styles.fileIconContainer, {
                        backgroundColor: isDark ? colors.border : "#E3F2FD"
                      }]}>
                        <Ionicons
                          name={getFileIcon(file.mimetype)}
                          size={20}
                          color={colors.primary}
                        />
                      </View>

                      <View style={styles.documentInfo}>
                        <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                          {file.filename}
                        </Text>
                        <View style={styles.fileMetaRow}>
                          <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>
                            {file.mimetype.split('/')[1]?.toUpperCase() || 'FILE'}
                          </Text>
                          <View style={[styles.metaDot, { backgroundColor: colors.textSecondary }]} />
                          <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>
                            {formatFileSize(file.filesize)}
                          </Text>
                          {file.verified && (
                            <>
                              <View style={[styles.metaDot, { backgroundColor: colors.textSecondary }]} />
                              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                              <Text style={[styles.fileMeta, { color: "#4CAF50" }]}>Verified</Text>
                            </>
                          )}
                          {file.rejection_reason && file.rejection_reason.trim() !== "" && (
                            <>
                              <View style={[styles.metaDot, { backgroundColor: colors.textSecondary }]} />
                              <Ionicons name="close-circle" size={14} color="#F44336" />
                              <Text style={[styles.fileMeta, { color: "#F44336" }]}>Rejected</Text>
                            </>
                          )}
                        </View>
                      </View>

                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pending Documents Card */}
        {documentsWithoutFiles.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? colors.surface : "#FFF3E0" }]}>
                <Ionicons name="alert-circle" size={24} color="#FF9800" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Pending Documents</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  {documentsWithoutFiles.length} documents not yet uploaded
                </Text>
              </View>
            </View>

            <View style={styles.pendingDocumentsContainer}>
              {documentsWithoutFiles.map((docGroup) => (
                <View
                  key={docGroup.id}
                  style={[styles.pendingDocItem, {
                    backgroundColor: isDark ? colors.surface : "#FFF8E1",
                    borderColor: isDark ? colors.border : "#FFE082"
                  }]}
                >
                  <Ionicons name="document-outline" size={18} color="#FF9800" />
                  <Text style={[styles.pendingDocText, { color: colors.text }]} numberOfLines={2}>
                    {docGroup.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Application Statement Card */}
        {application.application_text && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? colors.surface : "#F3E5F5" }]}>
                <Ionicons name="document-text" size={24} color="#9C27B0" />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Application Statement</Text>
            </View>

            <Text style={[styles.statementText, { color: colors.text }]}>
              {application.application_text}
            </Text>
          </View>
        )}

      </ScrollView>

      {/* Action Buttons - Sticky Footer */}
      {/* Only show action buttons if status is not already approved, rejected, or waitlisted */}
      {application && application.status !== "approved" && application.status !== "rejected" && application.status !== "waitlisted" && (
        <View style={[styles.actionFooter, {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: inset.bottom + 16
        }]}>
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton, submitting && styles.disabledButton]}
              onPress={handleApprove}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.waitlistButton, submitting && styles.disabledButton]}
              onPress={handleWaitlist}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Ionicons name="time" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Waitlist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton, submitting && styles.disabledButton]}
              onPress={handleReject}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Rejection Reason Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowRejectModal(false)}
          />
          <View style={[styles.modalContent, {
            backgroundColor: colors.card,
            paddingBottom: inset.bottom + 20
          }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalTitleContainer}>
                <Ionicons name="close-circle" size={24} color="#F44336" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Application</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Reason for Rejection *
              </Text>
              <TextInput
                style={[styles.modalTextInput, {
                  backgroundColor: isDark ? colors.surface : "#F5F5F5",
                  color: colors.text,
                  borderColor: colors.border
                }]}
                placeholder="Please provide a detailed reason for rejection..."
                placeholderTextColor={colors.textSecondary}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowRejectModal(false);
                    setRejectionReason("");
                  }}
                >
                  <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSubmitButton, !rejectionReason.trim() && styles.disabledButton]}
                  onPress={submitReject}
                  disabled={!rejectionReason.trim()}
                >
                  <Text style={styles.modalSubmitText}>Submit Rejection</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
  isDark
}: {
  icon: string;
  label: string;
  value: string;
  colors: any;
  isDark: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon as any} size={18} color={colors.textSecondary} />
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function getStatusColor(status: string | null) {
  if (!status) return "#2196F3";
  const s = status.toLowerCase();
  switch (s) {
    case "approved":
      return "#4CAF50";
    case "rejected":
      return "#F44336";
    case "waitlisted":
      return "#FF9800";
    default:
      return "#2196F3";
  }
}

function getStatusBadgeStyle(status: string | null, isDark: boolean = false) {
  const s = status ? status.toLowerCase() : "";

  if (!s) return { backgroundColor: isDark ? "rgba(33, 150, 243, 0.15)" : "#E3F2FD" };

  switch (s) {
    case "approved":
      return { backgroundColor: isDark ? "rgba(76, 175, 80, 0.15)" : "#E8F5E9" };
    case "rejected":
      return { backgroundColor: isDark ? "rgba(244, 67, 54, 0.15)" : "#FFEBEE" };
    case "waitlisted":
      return { backgroundColor: isDark ? "rgba(255, 152, 0, 0.15)" : "#FFF3E0" };
    default:
      return { backgroundColor: isDark ? "rgba(33, 150, 243, 0.15)" : "#E3F2FD" };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingCard: {
    padding: 40,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginBottom: 16,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  infoSection: {
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  documentsContainer: {
    gap: 20,
  },
  documentGroup: {
    gap: 12,
  },
  documentGroupLabel: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  documentInfo: {
    flex: 1,
    gap: 4,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
  },
  fileMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fileMeta: {
    fontSize: 12,
    fontWeight: "500",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  pendingDocumentsContainer: {
    gap: 10,
  },
  pendingDocItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  pendingDocText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  statementText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "400",
  },
  metadataGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metadataItem: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  metadataValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  // Action Footer Styles
  actionFooter: {
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  approveButton: {
    backgroundColor: "#4CAF50",
  },
  waitlistButton: {
    backgroundColor: "#FF9800",
  },
  rejectButton: {
    backgroundColor: "#F44336",
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  modalTextInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 120,
    fontWeight: "400",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalSubmitButton: {
    backgroundColor: "#F44336",
  },
  modalSubmitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
