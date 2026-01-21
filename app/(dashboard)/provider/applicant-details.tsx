import { useTheme } from "@/context/ThemeContext";
import { donorReviewApplication, getDonorApplicantDetails } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import ReviewerHeader from "../../../components/ReviewerHeader";

export default function ProviderApplicantDetailsScreen() {
  const { isDark, colors } = useTheme();
  const params = useLocalSearchParams();

  const applicantData = useMemo(() => {
    if (params.applicant) {
      try {
        return JSON.parse(params.applicant as string);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [params.applicant]);

  // State for API data
  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "academic" | "financial"
  >("overview");

  // State for approve/reject
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Handlers for approve/reject
  const handleApprove = async () => {
    Alert.alert(
      "Approve Application",
      "Are you sure you want to approve this application?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: async () => {
            try {
              setSubmitting(true);
              const authDataString = await AsyncStorage.getItem("authData");
              if (!authDataString) {
                Alert.alert("Error", "Authentication required");
                return;
              }

              const authData = JSON.parse(authDataString);
              const token = authData?.token;
              if (!token) {
                Alert.alert("Error", "No authentication token found");
                return;
              }

              const response = await donorReviewApplication(
                token,
                Number(apiData?.id || applicantData?.id),
                "approve"
              );

              if (response.success) {
                Alert.alert(
                  "Success",
                  "Application approved successfully!",
                  [
                    {
                      text: "OK",
                      onPress: () => router.back()
                    }
                  ]
                );
              } else {
                Alert.alert("Error", response.error || "Failed to approve application");
              }
            } catch (err: any) {
              Alert.alert("Error", err.message || "An error occurred");
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const submitRejection = async () => {
    if (!rejectionNotes.trim()) {
      Alert.alert("Required", "Please provide a reason for rejection");
      return;
    }

    try {
      setSubmitting(true);
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) {
        Alert.alert("Error", "Authentication required");
        return;
      }

      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) {
        Alert.alert("Error", "No authentication token found");
        return;
      }

      const response = await donorReviewApplication(
        token,
        Number(apiData?.id || applicantData?.id),
        "reject",
        rejectionNotes
      );

      if (response.success) {
        setShowRejectModal(false);
        setRejectionNotes("");
        Alert.alert(
          "Success",
          "Application rejected successfully!",
          [
            {
              text: "OK",
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert("Error", response.error || "Failed to reject application");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch applicant details from API
  useEffect(() => {
    const fetchApplicantDetails = async () => {
      if (!applicantData?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const authDataString = await AsyncStorage.getItem("authData");
        if (!authDataString) {
          setError("Authentication required");
          setLoading(false);
          return;
        }

        const authData = JSON.parse(authDataString);
        const token = authData?.token;
        if (!token) {
          setError("No authentication token found");
          setLoading(false);
          return;
        }

        console.log("Fetching applicant details for ID:", applicantData.id);
        const response = await getDonorApplicantDetails(token, Number(applicantData.id));

        if (response.success && response.data) {
          setApiData(response.data.application || response.data);
          console.log("Applicant details fetched successfully:", response.data);
        } else {
          setError(response.error || "Failed to fetch applicant details");
          console.error("Failed to fetch applicant details:", response.error);
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
        console.error("Error fetching applicant details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplicantDetails();
  }, [applicantData?.id]);

  // Parse application text
  const parsedAppText = useMemo(() => {
    if (!apiData?.application_text) return {};
    try {
      return typeof apiData.application_text === 'string'
        ? JSON.parse(apiData.application_text)
        : apiData.application_text;
    } catch (e) {
      console.error("Error parsing application_text:", e);
      return {};
    }
  }, [apiData]);

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ReviewerHeader title="Applicant Details" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading applicant details...
          </Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ReviewerHeader title="Applicant Details" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Error Loading Details</Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const user = apiData?.user || {};
  const scholarship = apiData?.scholarship || {};
  const academicDetails = apiData?.academic_details || [];
  const financialInfo = apiData?.financial_info || {};


  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'approved') return { bg: '#10b981', light: 'rgba(16, 185, 129, 0.15)' };
    if (s === 'rejected') return { bg: '#ef4444', light: 'rgba(239, 68, 68, 0.15)' };
    return { bg: '#f59e0b', light: 'rgba(245, 158, 11, 0.15)' };
  };

  const statusColors = getStatusColor(apiData?.status || 'new');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader title="Applicant Details" />

      {/* Modern Hero Section */}
      <LinearGradient
        colors={isDark ? ["#1e293b", "#334155"] : ["#6366f1", "#8b5cf6"]}
        style={styles.heroSection}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroContent}>
          {/* Avatar and Status */}
          <View style={styles.avatarSection}>
            {user.picture ? (
              <Image
                source={{ uri: user.picture }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={["#fbbf24", "#f59e0b"]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {user.fullname?.charAt(0) || user.firstname?.charAt(0) || "U"}
                </Text>
              </LinearGradient>
            )}
            <View style={[styles.statusBadge, { backgroundColor: statusColors.light }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColors.bg }]} />
              <Text style={[styles.statusText, { color: statusColors.bg }]}>
                {apiData?.status === 'new' ? 'Pending' :
                  apiData?.status?.charAt(0).toUpperCase() + apiData?.status?.slice(1)}
              </Text>
            </View>
          </View>

          {/* User Info */}
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{user.fullname || `${user.firstname} ${user.lastname} `}</Text>
            <Text style={styles.heroSubtitle}>{parsedAppText.major || "N/A"}</Text>

            <View style={styles.infoChips}>
              <View style={styles.infoChip}>
                <Ionicons name="school-outline" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.infoChipText}>{parsedAppText.institution || "N/A"}</Text>
              </View>
              <View style={styles.infoChip}>
                <Ionicons name="trophy-outline" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.infoChipText}>GPA {parsedAppText.gpa || "N/A"}</Text>
              </View>
            </View>

            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.contactText}>{user.email || parsedAppText.email}</Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.contactText}>{parsedAppText.phone || "N/A"}</Text>
            </View>
          </View>
        </View>

        {/* Scholarship Info */}
        <View style={styles.scholarshipCard}>
          <View style={styles.scholarshipHeader}>
            <Ionicons name="ribbon-outline" size={20} color={isDark ? "#fbbf24" : "#fff"} />
            <Text style={styles.scholarshipTitle}>Applied For</Text>
          </View>
          <Text style={styles.scholarshipName}>{scholarship.name || "N/A"}</Text>
          <Text style={styles.scholarshipDate}>
            Applied on {apiData?.timecreated ? new Date(apiData.timecreated).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            }) : "N/A"}
          </Text>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {[
          { key: "overview", label: "Overview", icon: "person-outline" },
          { key: "academic", label: "Academic", icon: "school-outline" },
          { key: "financial", label: "Financial", icon: "card-outline" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab(tab.key as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? colors.primary : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Quick Stats Grid */}
            <View style={styles.statsGrid}>
              <StatCard
                icon="person-outline"
                label="Student ID"
                value={parsedAppText.student_id || "N/A"}
                color="#6366f1"
                isDark={isDark}
              />
              <StatCard
                icon="calendar-outline"
                label="Current Year"
                value={parsedAppText.current_year || "N/A"}
                color="#10b981"
                isDark={isDark}
              />
              <StatCard
                icon="school-outline"
                label="Graduation"
                value={parsedAppText.graduation_date || "N/A"}
                color="#f59e0b"
                isDark={isDark}
              />
            </View>

            {/* Application Details */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="document-text" size={24} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Application Information</Text>
                </View>
              </View>

              <InfoRow label="Full Name" value={parsedAppText.fullname || user.fullname} colors={colors} />
              <InfoRow label="Email" value={parsedAppText.email || user.email} colors={colors} />
              <InfoRow label="Phone" value={parsedAppText.phone} colors={colors} />
              <InfoRow label="Institution" value={parsedAppText.institution} colors={colors} />
              <InfoRow label="Major" value={parsedAppText.major} colors={colors} />
              <InfoRow label="GPA" value={parsedAppText.gpa} colors={colors} />
              <InfoRow label="Current Year" value={parsedAppText.current_year} colors={colors} />
              <InfoRow label="Graduation Date" value={parsedAppText.graduation_date} colors={colors} />
            </View>

            {/* Assessment Details */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="clipboard" size={24} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Assessment Responses</Text>
                </View>
              </View>

              <View style={styles.assessmentItem}>
                <Text style={[styles.assessmentLabel, { color: colors.textSecondary }]}>
                  Question 1 Response
                </Text>
                <Text style={[styles.assessmentValue, { color: colors.text }]}>
                  {parsedAppText.assessment_q1 || "No response"}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.assessmentItem}>
                <Text style={[styles.assessmentLabel, { color: colors.textSecondary }]}>
                  Housing Type
                </Text>
                <Text style={[styles.assessmentValue, { color: colors.text }]}>
                  {parsedAppText.assessment_q2 || "No response"}
                </Text>
              </View>

              {parsedAppText.activities && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.assessmentItem}>
                    <Text style={[styles.assessmentLabel, { color: colors.textSecondary }]}>
                      Activities
                    </Text>
                    <Text style={[styles.assessmentValue, { color: colors.text }]}>
                      {parsedAppText.activities}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Interview Details */}
            {parsedAppText.interview_mode && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Ionicons name="videocam" size={24} color={colors.primary} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Interview Details</Text>
                  </View>
                </View>

                <InfoRow label="Interview Mode" value={parsedAppText.interview_mode} colors={colors} />
                {parsedAppText.verification_time && (
                  <InfoRow
                    label="Verification Time"
                    value={new Date(parsedAppText.verification_time).toLocaleString()}
                    colors={colors}
                  />
                )}
              </View>
            )}
          </>
        )}

        {/* Academic Tab */}
        {activeTab === "academic" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="school" size={24} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Academic History</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.2)" : "#eef2ff" }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  {academicDetails.length} {academicDetails.length === 1 ? 'Record' : 'Records'}
                </Text>
              </View>
            </View>

            {academicDetails.length > 0 ? (
              academicDetails.map((academic: any, index: number) => (
                <View key={academic.id || index}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <View style={styles.academicCard}>
                    <View style={styles.academicHeader}>
                      <View style={[styles.academicBadge, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#d1fae5" }]}>
                        <Ionicons name="trophy" size={16} color="#10b981" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.academicCourse, { color: colors.text }]}>
                          {academic.course_name}
                        </Text>
                        <Text style={[styles.academicMajor, { color: colors.textSecondary }]}>
                          {academic.major}
                        </Text>
                      </View>
                      <View style={[styles.cgpaChip, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7" }]}>
                        <Text style={[styles.cgpaText, { color: "#f59e0b" }]}>
                          {academic.cgpa} CGPA
                        </Text>
                      </View>
                    </View>

                    <View style={styles.academicDetails}>
                      <View style={styles.academicRow}>
                        <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.academicText, { color: colors.textSecondary }]}>
                          {academic.institution}
                        </Text>
                      </View>
                      <View style={styles.academicRow}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.academicText, { color: colors.textSecondary }]}>
                          {academic.academic_year} • Graduated {academic.graduation_year}
                        </Text>
                      </View>
                      <View style={styles.academicRow}>
                        <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.academicText, { color: colors.textSecondary }]}>
                          {academic.category}
                        </Text>
                      </View>
                      <View style={styles.academicRow}>
                        <Ionicons name="stats-chart-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.academicText, { color: colors.textSecondary }]}>
                          {academic.percentage}% Percentage
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="school-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No academic records available
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Financial Tab */}
        {activeTab === "financial" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="card" size={24} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Financial Information</Text>
              </View>
              {financialInfo.id && (
                <View style={[styles.verifiedBadge, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#d1fae5" }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={[styles.verifiedText, { color: "#10b981" }]}>Verified</Text>
                </View>
              )}
            </View>

            {financialInfo.id ? (
              <>
                <View style={[styles.bankCard, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.1)" : "#f8f9ff" }]}>
                  <LinearGradient
                    colors={isDark ? ["#4f46e5", "#6366f1"] : ["#6366f1", "#8b5cf6"]}
                    style={styles.bankCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.bankCardHeader}>
                      <Ionicons name="card-outline" size={32} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.bankCardType}>Bank Account</Text>
                    </View>
                    <View style={styles.bankCardBody}>
                      <Text style={styles.bankCardNumber}>•••• •••• •••• {financialInfo.account_last4}</Text>
                      <Text style={styles.bankCardHolder}>
                        {financialInfo.account_holder_name || "Account Holder"}
                      </Text>
                    </View>
                    <View style={styles.bankCardFooter}>
                      <View>
                        <Text style={styles.bankCardLabel}>Bank</Text>
                        <Text style={styles.bankCardValue}>{financialInfo.bank_name || "N/A"}</Text>
                      </View>
                      {financialInfo.ifsc_code && (
                        <View>
                          <Text style={styles.bankCardLabel}>IFSC</Text>
                          <Text style={styles.bankCardValue}>{financialInfo.ifsc_code}</Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </View>

                <View style={styles.financialMeta}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.financialMetaText, { color: colors.textSecondary }]}>
                    Last updated: {new Date(financialInfo.updated_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </Text>
                </View>

                {parsedAppText.financial_info && (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.assessmentItem}>
                      <Text style={[styles.assessmentLabel, { color: colors.textSecondary }]}>
                        Additional Financial Information
                      </Text>
                      <Text style={[styles.assessmentValue, { color: colors.text }]}>
                        {parsedAppText.financial_info}
                      </Text>
                    </View>
                  </>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="card-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No financial information available
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons - Only show for pending applications */}
        {apiData?.status === "new" && (
          <View style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.actionsTitle, { color: colors.text }]}>Review Actions</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.approveBtn, submitting && styles.disabledBtn]}
                activeOpacity={0.85}
                onPress={handleApprove}
                disabled={submitting}
              >
                <LinearGradient
                  colors={submitting ? ["#9ca3af", "#6b7280"] : ["#10b981", "#059669"]}
                  style={styles.actionBtnGradient}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={22} color="#fff" />
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectBtn, submitting && styles.disabledBtn]}
                activeOpacity={0.85}
                onPress={handleReject}
                disabled={submitting}
              >
                <LinearGradient
                  colors={submitting ? ["#9ca3af", "#6b7280"] : ["#ef4444", "#dc2626"]}
                  style={styles.actionBtnGradient}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={22} color="#fff" />
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Rejection Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Application</Text>
              <TouchableOpacity
                onPress={() => setShowRejectModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
              Please provide a reason for rejecting this application:
            </Text>

            <TextInput
              style={[styles.modalInput, {
                backgroundColor: isDark ? colors.surface : "#f3f4f6",
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="Enter rejection reason..."
              placeholderTextColor={colors.textSecondary}
              value={rejectionNotes}
              onChangeText={setRejectionNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionNotes("");
                }}
                disabled={submitting}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, submitting && styles.disabledBtn]}
                onPress={submitRejection}
                disabled={submitting}
              >
                <LinearGradient
                  colors={submitting ? ["#9ca3af", "#6b7280"] : ["#ef4444", "#dc2626"]}
                  style={styles.modalButtonGradient}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Submit Rejection</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color, isDark }: any) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: isDark ? `${color} 20` : `${color} 15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// Info Row Component
function InfoRow({ label, value, colors }: any) {
  if (!value || value === "N/A") return null;
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 32 },

  // Loading and Error states
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  heroContent: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  avatarSection: {
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  heroName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  infoChips: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  infoChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  contactText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
  },

  // Scholarship Card
  scholarshipCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  scholarshipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  scholarshipTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
  },
  scholarshipName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  scholarshipDate: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
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
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },

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
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
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
    textTransform: "uppercase",
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
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Info Rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
    marginLeft: 16,
  },

  // Assessment
  assessmentItem: {
    marginBottom: 16,
  },
  assessmentLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  assessmentValue: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },

  // Academic Cards
  academicCard: {
    paddingVertical: 16,
  },
  academicHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  academicBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  academicCourse: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  academicMajor: {
    fontSize: 13,
    fontWeight: "500",
  },
  cgpaChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cgpaText: {
    fontSize: 13,
    fontWeight: "700",
  },
  academicDetails: {
    gap: 8,
    marginLeft: 52,
  },
  academicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  academicText: {
    fontSize: 13,
    fontWeight: "500",
  },

  // Bank Card
  bankCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  bankCardGradient: {
    padding: 20,
  },
  bankCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  bankCardType: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    textTransform: "uppercase",
  },
  bankCardBody: {
    marginBottom: 20,
  },
  bankCardNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 2,
    marginBottom: 8,
  },
  bankCardHolder: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
  },
  bankCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bankCardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  bankCardValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  financialMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  financialMetaText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },

  // Actions
  actionsCard: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
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
  actionBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
  disabledBtn: {
    opacity: 0.6,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  modalClose: {
    padding: 4,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  modalInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    fontWeight: "500",
    minHeight: 120,
    borderWidth: 1,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  modalCancelButton: {
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalSubmitButton: {
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});
