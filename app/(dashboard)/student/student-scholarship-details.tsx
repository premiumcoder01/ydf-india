import { AppHeader, Button } from "@/components";
import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import { bookmarkScholarship, getScholarshipDetails } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, UIManager, View } from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Helper function to strip HTML tags
const stripHtml = (html: string): string => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
};

// Helper function to get category color
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    Gujarat: "#4CAF50",
    Bihar: "#2196F3",
    "All India": "#FF9800",
    Punjab: "#9C27B0",
    Rajasthan: "#E91E63",
    Maharashtra: "#00BCD4",
    Delhi: "#795548",
    Sikar: "#607D8B",
  };
  return colors[category] || "#666";
};

import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ScholarshipDetailsScreen() {
  const { isDark, colors } = useTheme();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const scholarshipId = params.scholarshipId ? Number(params.scholarshipId) : null;

  const [saved, setSaved] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [scholarship, setScholarship] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookmarking, setBookmarking] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  // Fetch scholarship details from API
  useEffect(() => {
    const fetchScholarshipDetails = async () => {
      if (!scholarshipId) {
        setError("Scholarship ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get token from AsyncStorage
        const authDataString = await AsyncStorage.getItem("authData");
        if (!authDataString) {
          setError("Authentication token not found. Please login again.");
          setLoading(false);
          return;
        }

        const authData = JSON.parse(authDataString);
        const token = authData?.token;

        if (!token) {
          setError("Authentication token not found. Please login again.");
          setLoading(false);
          return;
        }

        // Call getScholarshipDetails API
        const response = await getScholarshipDetails(token, scholarshipId);
        console.log("Response:", JSON.stringify(response));

        if (response.success && response.data) {
          const apiData = response.data?.data?.data || response.data?.data || response.data;
          setScholarship(apiData);
        } else {
          setError(response.error || response.message || "Failed to load scholarship details");
        }
      } catch (err: any) {
        console.error("Error fetching scholarship details:", err);
        setError(err.message || "Failed to load scholarship details");
      } finally {
        setLoading(false);
      }
    };

    fetchScholarshipDetails();
  }, [scholarshipId]);

  // Update saved state when scholarship data changes
  useEffect(() => {
    if (scholarship?.bookmarked !== undefined) {
      setSaved(scholarship.bookmarked);
    }
  }, [scholarship?.bookmarked]);

  // Show toast helper
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // Handle bookmark/unbookmark with API
  const handleBookmark = async () => {
    if (!scholarshipId || bookmarking) return;

    const isCurrentlyBookmarked = saved || scholarship?.bookmarked;
    const newBookmarkState = !isCurrentlyBookmarked;

    // Optimistic UI update - update immediately
    setSaved(newBookmarkState);
    setScholarship((prev: any) => ({
      ...prev,
      bookmarked: newBookmarkState,
    }));

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      setBookmarking(true);

      // Get token from AsyncStorage
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) {
        // Revert on error
        setSaved(!newBookmarkState);
        setScholarship((prev: any) => ({
          ...prev,
          bookmarked: !newBookmarkState,
        }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast("Authentication failed. Please login again.", "error");
        return;
      }

      const authData = JSON.parse(authDataString);
      const token = authData?.token;

      if (!token) {
        // Revert on error
        setSaved(!newBookmarkState);
        setScholarship((prev: any) => ({
          ...prev,
          bookmarked: !newBookmarkState,
        }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast("Authentication failed. Please login again.", "error");
        return;
      }

      // Call bookmark API
      const action = newBookmarkState ? "bookmark" : "unbookmark";
      const response = await bookmarkScholarship(token, scholarshipId, action);

      if (response.success) {
        // Success haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Show success toast
        showToast(
          newBookmarkState
            ? "Scholarship bookmarked successfully!"
            : "Scholarship unbookmarked successfully!",
          "success"
        );
      } else {
        // Revert on error
        setSaved(!newBookmarkState);
        setScholarship((prev: any) => ({
          ...prev,
          bookmarked: !newBookmarkState,
        }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(
          response.error || response.message || "Failed to update bookmark",
          "error"
        );
        console.error("Bookmark error:", response.error);
      }
    } catch (err: any) {
      // Revert on error
      setSaved(!newBookmarkState);
      setScholarship((prev: any) => ({
        ...prev,
        bookmarked: !newBookmarkState,
      }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("Network error. Please try again.", "error");
      console.error("Bookmark error:", err);
    } finally {
      setBookmarking(false);
    }
  };



  const getDaysRemaining = (deadline: string | null, isExpired: boolean = false) => {
    if (isExpired) return { text: "Expired", color: "#F44336" };
    if (!deadline) return { text: "Open", color: "#4CAF50" };
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: "Expired", color: "#F44336" };
    if (diffDays === 0) return { text: "Today", color: "#FF9800" };
    if (diffDays === 1) return { text: "1 day left", color: "#FF9800" };
    if (diffDays <= 7) return { text: `${diffDays} days left`, color: "#FF9800" };
    return { text: `${diffDays} days left`, color: "#666" };
  };

  const deadline = scholarship ? (scholarship.application_deadline || scholarship.end_date || scholarship.start_date) : null;

  // Calculate expiry based on date
  const isDeadlinePassed = React.useMemo(() => {
    if (!deadline) return false;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    // If deadline is passed (yesterday or before)
    return deadlineDate.getTime() < today.setHours(0, 0, 0, 0);
  }, [deadline]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#FFF9EC" }]}>
        <AppHeader title="Scholarship Details" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading scholarship details...</Text>
        </View>
      </View>
    );
  }

  if (error || !scholarship) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#FFF9EC" }]}>
        <AppHeader title="Scholarship Details" onBack={() => router.back()} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={[styles.errorText, { color: colors.text }]}>{error || "Scholarship not found"}</Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="primary"
            style={styles.errorButton}
          />
        </View>
      </View>
    );
  }

  const categoryColor = getCategoryColor(scholarship.category || "");
  const description = stripHtml(scholarship.description || "");

  const daysInfo = getDaysRemaining(deadline, scholarship.expired);
  const isApplicationClosed = scholarship.expired || isDeadlinePassed || description.toLowerCase().includes("closed") || description.toLowerCase().includes("applications closed");

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#FFF9EC" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#121212" : "#fff"} />
      {/* Gradient Background */}
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#FFFFFF", "#F8F9FA", "#F0F4F8"]}
        style={styles.background}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      {/* App Header Replacement */}
      <AppHeader title="Scholarship Details" onBack={() => router.back()} />
      {/* Title and Category Section */}
      <View style={styles.titleSection}>
        <View style={styles.titleHeader}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>{scholarship.title}</Text>
          <TouchableOpacity
            onPress={handleBookmark}
            disabled={bookmarking}
            activeOpacity={0.7}
            style={[styles.bookmarkButton, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5", borderRadius: 12 }]}
          >
            <Ionicons
              name={scholarship?.bookmarked || saved ? "bookmark" : "bookmark-outline"}
              size={24}
              color={scholarship?.bookmarked || saved ? "#FFB400" : (isDark ? colors.textSecondary : "#999")}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.categoryRow}>
          <View style={[styles.categoryBadgeLarge, { backgroundColor: `${categoryColor}15` }]}>
            <Ionicons name="location" size={16} color={categoryColor} />
            <Text style={[styles.categoryTextLarge, { color: categoryColor }]}>
              {scholarship.category || "General"}
            </Text>
          </View>
          {scholarship.shortname && (
            <View style={[styles.shortnameBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0" }]}>
              <Text style={[styles.shortnameText, { color: colors.textSecondary }]}>{scholarship.shortname}</Text>
            </View>
          )}
        </View>
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* Hero Image Section */}
        {scholarship.image && (
          <View style={styles.heroImageContainer}>
            <Image source={{ uri: scholarship.image }} style={styles.heroImage} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.3)"]}
              style={styles.heroGradient}
            />
            <View style={styles.heroOverlay}>
              <View style={styles.statusBadgesRow}>
                {scholarship.has_applied && (
                  <View style={[styles.statusBadge, styles.appliedBadge, { backgroundColor: isDark ? "rgba(76, 175, 80, 0.2)" : "rgba(76, 175, 80, 0.15)" }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={[styles.statusBadgeText, { color: isDark ? "#81c784" : "#333" }]}>Applied</Text>
                  </View>
                )}
                {scholarship.expired && (
                  <View style={[styles.statusBadge, styles.closedBadge, { backgroundColor: isDark ? "rgba(244, 67, 54, 0.2)" : "rgba(244, 67, 54, 0.15)" }]}>
                    <Ionicons name="hourglass-outline" size={16} color="#F44336" />
                    <Text style={[styles.statusBadgeText, { color: isDark ? "#ff6b6b" : "#333" }]}>Expired</Text>
                  </View>
                )}
                {!scholarship.expired && isApplicationClosed && (
                  <View style={[styles.statusBadge, styles.closedBadge, { backgroundColor: isDark ? "rgba(244, 67, 54, 0.2)" : "rgba(244, 67, 54, 0.15)" }]}>
                    <Ionicons name="close-circle" size={16} color="#F44336" />
                    <Text style={[styles.statusBadgeText, { color: isDark ? "#ff6b6b" : "#333" }]}>Closed</Text>
                  </View>
                )}
                {!isApplicationClosed && !scholarship.has_applied && (
                  <View style={[styles.statusBadge, styles.openBadge, { backgroundColor: isDark ? "rgba(255, 152, 0, 0.2)" : "rgba(255, 152, 0, 0.15)" }]}>
                    <Ionicons name="time" size={16} color="#FF9800" />
                    <Text style={[styles.statusBadgeText, { color: isDark ? "#ffb74d" : "#333" }]}>Open</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}



        {/* Key Information Cards */}
        <View style={styles.infoCardsContainer}>
          {/* Deadline Card */}
          <View style={[styles.infoCard, { borderTopColor: categoryColor, backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
            <View style={[styles.infoIconContainer, { backgroundColor: `${categoryColor}15` }]}>
              <Ionicons name="calendar" size={24} color={categoryColor} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Application Deadline</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {deadline
                  ? new Date(deadline).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                  : "No deadline"}
              </Text>
              {deadline && (
                <Text style={[styles.infoSubtext, { color: daysInfo.color }]}>
                  {daysInfo.text}
                </Text>
              )}
            </View>
          </View>

          {/* Start Date Card */}
          {scholarship.start_date && (
            <View style={[styles.infoCard, { borderTopColor: "#2196F3", backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <View style={[styles.infoIconContainer, { backgroundColor: "#2196F315" }]}>
                <Ionicons name="play-circle" size={24} color="#2196F3" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Application Starts</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {new Date(scholarship.start_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
          )}

          {/* End Date Card */}
          {scholarship.end_date && (
            <View style={[styles.infoCard, { borderTopColor: "#FF9800", backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <View style={[styles.infoIconContainer, { backgroundColor: "#FF980015" }]}>
                <Ionicons name="stop-circle" size={24} color="#FF9800" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Application Ends</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {new Date(scholarship.end_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Description Section */}
        {description && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color={categoryColor} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About This Scholarship</Text>
            </View>
            <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{description}</Text>
            </View>
          </View>
        )}

        {/* Eligibility Criteria */}
        {scholarship.eligibility_criteria && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={20} color={categoryColor} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Eligibility Criteria</Text>
            </View>
            <View style={[styles.eligibilityCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <Text style={[styles.eligibilityText, { color: colors.textSecondary }]}>{scholarship.eligibility_criteria}</Text>
            </View>
          </View>
        )}

        {/* Required Documents Checklist - Todo Style */}
        {scholarship.documents && scholarship.documents.length > 0 && !scholarship.expired && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkbox" size={20} color={categoryColor} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Documents To-Do List</Text>
            </View>
            <View style={[styles.documentsCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <View style={styles.documentsHeader}>
                <View style={styles.docsHeaderRow}>
                  <Text style={[styles.documentsSubtitle, { color: colors.textSecondary }]}>
                    {scholarship.documents.filter((d: any) => d.uploaded || d.status !== 'todo').length} of {scholarship.documents.length} Completed
                  </Text>
                  <Text style={[styles.documentsPercent, { color: colors.text }]}>
                    {Math.round((scholarship.documents.filter((d: any) => d.uploaded || d.status !== 'todo').length / scholarship.documents.length) * 100)}%
                  </Text>
                </View>
                <View style={styles.docsProgressBarBg}>
                  <View
                    style={[
                      styles.docsProgressBarFill,
                      {
                        width: `${(scholarship.documents.filter((d: any) => d.uploaded || d.status !== 'todo').length / scholarship.documents.length) * 100}%`,
                        backgroundColor: categoryColor
                      }
                    ]}
                  />
                </View>
              </View>

              {/* Sort: Pending/Todo first, then Completed */}
              {[...scholarship.documents]
                .sort((a, b) => {
                  const aDone = a.uploaded || a.status !== 'todo';
                  const bDone = b.uploaded || b.status !== 'todo';
                  return aDone === bDone ? 0 : aDone ? 1 : -1;
                })
                .map((doc: any, index: number) => {
                  const isCompleted = doc.uploaded || doc.status !== 'todo';
                  const isOptional = doc.label.toLowerCase().includes("optional");

                  return (
                    <TouchableOpacity
                      key={doc.id || index}
                      style={[
                        styles.documentItem,
                        { borderBottomColor: colors.border },
                        index === scholarship.documents.length - 1 && styles.lastDocumentItem,
                        isCompleted && [styles.documentItemCompleted, { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }]
                      ]}
                      onPress={() => {
                        if (isCompleted) {
                          showToast("This document is already uploaded", "info");
                        } else {
                          router.push({
                            pathname: "/(dashboard)/student/student-upload-document",
                            params: {
                              cmid: doc.cmid,
                              label: doc.label,
                              mode: doc.mode || "scheme"
                            }
                          });
                        }
                      }}
                      activeOpacity={isCompleted ? 1 : 0.7}
                    >
                      <View style={[
                        styles.checkboxContainer,
                        isCompleted ? { backgroundColor: categoryColor, borderColor: categoryColor } : { borderColor: colors.border, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : '#fff' }
                      ]}>
                        {isCompleted && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>

                      <View style={styles.documentContent}>
                        <Text style={[
                          styles.documentText,
                          { color: colors.text },
                          isCompleted && [styles.documentTextCompleted, { color: colors.textSecondary }]
                        ]}>
                          {doc.label}
                        </Text>

                        <View style={styles.documentMetaRow}>
                          <View style={[
                            styles.docStatusBadge,
                            isCompleted ? styles.docStatusCompleted : styles.docStatusTodo
                          ]}>
                            <Text style={[
                              styles.docStatusText,
                              isCompleted ? { color: '#4CAF50' } : { color: '#FF9800' }
                            ]}>
                              {isCompleted ? "Completed" : "To Do"}
                            </Text>
                          </View>

                          {isOptional && (
                            <Text style={styles.docModeText}>Optional</Text>
                          )}
                        </View>
                      </View>

                      {/* Action Icon for Todo items */}
                      {!isCompleted && (
                        <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ alignSelf: 'center' }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </View>
          </View>
        )}

        {/* Application Process */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={20} color={categoryColor} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Application Process</Text>
          </View>
          <View style={[styles.processCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
            {[
              { icon: "document-text", text: "Submit Application" },
              { icon: "analytics", text: "Need Assessment" },
              { icon: "people", text: "Interview Round" },
              { icon: "home", text: "Home Verification" },
              { icon: "trophy", text: "Scholarship Awarded" },
            ].map((step, idx) => (
              <View key={idx} style={styles.processItem}>
                <View style={[styles.processIconContainer, { backgroundColor: `${categoryColor}15` }]}>
                  <Ionicons name={step.icon as any} size={20} color={categoryColor} />
                </View>
                <View style={styles.processContent}>
                  <Text style={[styles.processStepNumber, { color: categoryColor }]}>Stage {idx + 1}</Text>
                  <Text style={[styles.processText, { color: colors.textSecondary }]}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Important Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={20} color="#FF9800" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Important Information</Text>
          </View>
          <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
            <View style={styles.noteItem}>
              <View style={[styles.noteIconContainer, { backgroundColor: "#FF980015" }]}>
                <Ionicons name="time" size={18} color="#FF9800" />
              </View>
              <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                Applications must be submitted before the deadline. Late submissions will not be considered.
              </Text>
            </View>
            <View style={styles.noteItem}>
              <View style={[styles.noteIconContainer, { backgroundColor: "#2196F315" }]}>
                <Ionicons name="hourglass" size={18} color="#2196F3" />
              </View>
              <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                Processing time is typically 4-6 weeks after the deadline.
              </Text>
            </View>
            <View style={styles.noteItem}>
              <View style={[styles.noteIconContainer, { backgroundColor: "#4CAF5015" }]}>
                <Ionicons name="mail" size={18} color="#4CAF50" />
              </View>
              <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                You will receive email notifications about your application status.
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.applyContainer, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={handleBookmark}
              disabled={bookmarking}
              activeOpacity={0.7}
              style={[
                styles.saveButton,
                { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff", borderColor: colors.border },
                (saved || scholarship?.bookmarked) && [styles.saveButtonActive, { backgroundColor: isDark ? "rgba(255, 180, 0, 0.1)" : "#fff" }],
                bookmarking && styles.saveButtonDisabled,
              ]}
            >
              <Ionicons
                name={saved || scholarship?.bookmarked ? "bookmark" : "bookmark-outline"}
                size={20}
                color={saved || scholarship?.bookmarked ? "#FFB400" : (isDark ? colors.textSecondary : "#666")}
              />
              <Text
                style={[
                  styles.saveButtonText,
                  { color: isDark ? colors.textSecondary : "#666" },
                  (saved || scholarship?.bookmarked) && [styles.saveButtonTextActive, { color: "#FFB400" }],
                ]}
              >
                {bookmarking
                  ? "Saving..."
                  : saved || scholarship?.bookmarked
                    ? "Saved"
                    : "Save"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(dashboard)/student/student-apply-form",
                  params: { scholarshipId: scholarship.id },
                })
              }
              disabled={isApplicationClosed || scholarship.has_applied}
              style={[
                styles.applyButton,
                { backgroundColor: categoryColor },
                (isApplicationClosed || scholarship.has_applied) && styles.applyButtonDisabled,
              ]}
            >
              <Ionicons
                name={scholarship.has_applied ? "checkmark-circle" : "paper-plane"}
                size={20}
                color="#fff"
              />
              <Text style={styles.applyButtonText}>
                {scholarship.has_applied
                  ? "Already Applied"
                  : scholarship.expired
                    ? "Scholarship Expired"
                    : isApplicationClosed
                      ? "Applications Closed"
                      : "Apply Now"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
        duration={3000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  heroImageContainer: {
    width: "100%",
    height: 280,
    marginBottom: 20,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: "flex-end",
  },
  statusBadgesRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  appliedBadge: {
    backgroundColor: "rgba(76, 175, 80, 0.15)",
  },
  closedBadge: {
    backgroundColor: "rgba(244, 67, 54, 0.15)",
  },
  openBadge: {
    backgroundColor: "rgba(255, 152, 0, 0.15)",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },
  titleSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
    marginVertical: 15
  },
  titleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  mainTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a1a",
    lineHeight: 34,
    marginRight: 12,
  },
  bookmarkButton: {
    padding: 8,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  categoryBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryTextLarge: {
    fontSize: 13,
    fontWeight: "700",
  },
  shortnameBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  shortnameText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  infoCardsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  infoSubtext: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  scholarshipCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: "rgba(51, 51, 51, 0.1)",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  scholarshipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  scholarshipInfo: {
    flex: 1,
    marginRight: 12,
  },
  scholarshipTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  scholarshipDescription: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  scholarshipAmount: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4CAF50",
  },
  // INSERT: listing-like amount row styles for related cards
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f5f5f5",
    marginBottom: 16,
  },
  amountContainer: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scholarshipDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  // INSERT: icon container for detail rows
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailContent: {
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  // INSERT: listing-like text + deadline styles
  detailText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  daysRemaining: {
    fontSize: 13,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  criteriaCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
  },
  criteriaItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  criteriaText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  eligibilityFooter: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    borderRadius: 6,
  },
  descriptionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  documentsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
  },
  eligibilityCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eligibilityText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 24,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  documentText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  processCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  processItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  processIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  processContent: {
    flex: 1,
  },
  processStepNumber: {
    fontSize: 11,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  processText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
    lineHeight: 22,
  },
  notesCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.1)",
  },
  noteItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  noteIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  noteText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
    lineHeight: 22,
    fontWeight: "500",
  },
  applyContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#f8f8f8",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    minWidth: 100,
  },
  saveButtonActive: {
    backgroundColor: "#FFF9E6",
    borderColor: "#FFB400",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#666",
  },
  saveButtonTextActive: {
    color: "#FFB400",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  applyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  // INSERT: actions row styles matching listing for related cards
  cardActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  viewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  viewBtnText: {
    color: "#333",
    fontWeight: "700",
    fontSize: 15,
  },
  applyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  applyBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  faqCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  faqItem: {
    borderBottomWidth: 1,
    borderColor: "#f5f5f5",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  faqAnswer: {
    marginTop: 8,
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  relatedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  relatedList: {
    gap: 16,
  },
  relatedCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: "#eee",
    width: "48%",
  },
  relatedCardFull: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  relatedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 8,
  },
  relatedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  relatedDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  relatedAmount: {
    fontSize: 13,
    fontWeight: "800",
  },
  relatedDetails: {
    gap: 12,
    marginBottom: 16,
  },
  // INSERT: category badge used in related header
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  errorButton: {
    minWidth: 120,
  },
  descriptionText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 24,
  },
  // Documents Section Styles
  documentsHeader: {
    marginBottom: 20,
  },
  docsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  documentsSubtitle: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  documentsPercent: {
    fontSize: 13,
    color: "#333",
    fontWeight: "700",
  },
  docsProgressBarBg: {
    height: 6,
    backgroundColor: "#f5f5f5",
    borderRadius: 3,
    overflow: "hidden",
  },
  docsProgressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 0,
  },
  documentContent: {
    flex: 1,
    paddingRight: 4,
  },
  documentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  documentTextCompleted: {
    color: "#aaa",
    textDecorationLine: "line-through",
  },
  docStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#f5f5f5",
  },
  docStatusCompleted: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  docStatusTodo: {
    backgroundColor: "rgba(255, 152, 0, 0.1)",
  },
  docStatusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  docModeText: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  documentItemCompleted: {
    opacity: 0.7,
  },
  lastDocumentItem: {
    marginBottom: 0,
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
});

