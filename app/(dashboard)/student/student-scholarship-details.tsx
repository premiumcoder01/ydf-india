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
import { ActivityIndicator, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, UIManager, View } from "react-native";

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
    if (diffDays < 0) {
      // If API says not expired, but date passed, don't show "Expired" text based on date logic
      // User requested to rely strictly on API key for expiry
      return { text: "", color: "transparent" };
    }
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

  // Simplify application closed logic: rely on API 'expired' flag primarily
  const isApplicationClosed = scholarship?.expired === true;

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

  /* Removed old logic to avoid overwriting API status */
  const daysInfo = getDaysRemaining(deadline, scholarship.expired);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0f0f0f" : "#F8F9FA" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#0f0f0f" : "#F8F9FA"} />

      <AppHeader title="Scholarship Details" onBack={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        {/* HERO CARD (Replaces Image) */}
        <View style={styles.heroContainer}>
          <LinearGradient
            colors={['#2563EB', '#1D4ED8', '#1E40AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Decorative Elements */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />

            <View style={styles.heroHeaderRow}>
              <View style={styles.categoryPill}>
                <Ionicons name="location" size={12} color="#FFF" />
                <Text style={styles.categoryPillText}>{scholarship.category || "General"}</Text>
              </View>

              <View style={[
                styles.statusPill,
                scholarship.has_applied ? { backgroundColor: '#4CAF50' } :
                  scholarship.expired ? { backgroundColor: '#EF4444' } :
                    { backgroundColor: '#F59E0B' }
              ]}>
                <Text style={styles.statusPillText}>
                  {scholarship.has_applied ? "Applied" : scholarship.expired ? "Expired" : "Open"}
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>
              {scholarship.title}
            </Text>

            {scholarship.shortname && (
              <Text style={styles.heroSubtitle}>{scholarship.shortname}</Text>
            )}

            <View style={styles.heroDivider} />

            <View style={styles.heroFooterRow}>
              <View style={styles.deadlineInfo}>
                <Text style={styles.deadlineLabel}>Deadline</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.deadlineValue}>
                    {deadline ? new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No Deadline"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleBookmark}
                style={styles.heroBookmarkBtn}
                activeOpacity={0.8}
                disabled={bookmarking}
              >
                <Ionicons
                  name={saved || scholarship?.bookmarked ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={saved || scholarship?.bookmarked ? "#FFC107" : "#FFF"}
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* APPLICATION STATUS / PROGRESS */}
        {(scholarship.progress_percent !== undefined) && (
          <View style={styles.sectionContainer}>
            <View style={[styles.progressCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
              <View style={styles.progressHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.progressIconBox, { backgroundColor: isDark ? "#333" : "#eff6ff" }]}>
                    <Ionicons name="pie-chart" size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Application Progress</Text>
                </View>
                <Text style={[styles.progressPercent, { color: colors.primary }]}>
                  {scholarship.progress_percent}%
                </Text>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${scholarship.progress_percent}%`,
                      backgroundColor: scholarship.progress_percent === 100 ? '#10B981' : colors.primary
                    }
                  ]}
                />
              </View>
              <Text style={[styles.progressMessage, { color: colors.textSecondary }]}>
                {scholarship.progress_percent === 100
                  ? "Everything looks good! You have completed the application."
                  : "Complete all required steps to submit your application securely."}
              </Text>
            </View>
          </View>
        )}

        {/* SCHOLARSHIP TIMELINE / DATES */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Timeline</Text>
          <View style={[styles.datesCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
            {scholarship.start_date && (
              <View style={styles.dateRow}>
                <View style={[styles.dateIconBox, { backgroundColor: "#DBEAFE" }]}>
                  <Ionicons name="play" size={18} color="#2563EB" />
                </View>
                <View style={styles.dateInfo}>
                  <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Application Opens</Text>
                  <Text style={[styles.dateValue, { color: colors.text }]}>
                    {new Date(scholarship.start_date).toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            )}

            {scholarship.start_date && (scholarship.end_date || scholarship.application_deadline) && (
              <View style={[styles.horizontalLine, { backgroundColor: isDark ? "#333" : "#F3F4F6" }]} />
            )}

            {(scholarship.end_date || scholarship.application_deadline) && (
              <View style={styles.dateRow}>
                <View style={[styles.dateIconBox, { backgroundColor: "#FEE2E2" }]}>
                  <Ionicons name="stop" size={18} color="#DC2626" />
                </View>
                <View style={styles.dateInfo}>
                  <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Application Closes</Text>
                  <Text style={[styles.dateValue, { color: colors.text }]}>
                    {new Date(scholarship.end_date || scholarship.application_deadline).toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* DESCRIPTION */}
        {description && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>About Scholarship</Text>
            <View style={[styles.contentCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{description}</Text>
            </View>
          </View>
        )}

        {/* ELIGIBILITY */}
        {scholarship.eligibility_criteria && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Eligibility</Text>
            <View style={[styles.contentCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Ionicons name="school" size={24} color={colors.primary} style={{ marginTop: 2 }} />
                <Text style={[styles.bodyText, { color: colors.textSecondary, flex: 1 }]}>{scholarship.eligibility_criteria}</Text>
              </View>
            </View>
          </View>
        )}

        {/* DOCUMENTS LIST */}
        {scholarship.documents && scholarship.documents.length > 0 && !scholarship.expired && (
          <View style={styles.sectionContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionHeaderTitle, { color: colors.text, marginBottom: 0 }]}>Required Documents</Text>
              <View style={[styles.countBadge, { backgroundColor: isDark ? "#333" : "#F3F4F6" }]}>
                <Text style={[styles.countText, { color: isDark ? "#fff" : "#374151" }]}>{scholarship.documents.length} Items</Text>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              {scholarship.documents.map((doc: any, index: number) => {
                const isCompleted = doc.uploaded || doc.status !== 'todo';
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={isCompleted ? 1 : 0.7}
                    onPress={() => {
                      if (!isCompleted) {
                        router.push({
                          pathname: "/(dashboard)/student/student-upload-document",
                          params: { cmid: doc.cmid, label: doc.label, mode: doc.mode || "scheme" }
                        });
                      } else {
                        showToast("Document already uploaded", "info");
                      }
                    }}
                    style={[styles.docRow, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}
                  >
                    <View style={[styles.docIcon, { backgroundColor: isCompleted ? "#DCFCE7" : "#EFF6FF" }]}>
                      <Ionicons name={isCompleted ? "checkmark" : "document-text"} size={20} color={isCompleted ? "#166534" : "#3B82F6"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docLabel, { color: colors.text }]}>{doc.label}</Text>
                      <Text style={[styles.docSub, { color: isCompleted ? "#166534" : "#6B7280" }]}>
                        {isCompleted ? "Verified & Attached" : "Tap to upload document"}
                      </Text>
                    </View>
                    {!isCompleted && (
                      <View style={[styles.uploadActionBtn, { backgroundColor: colors.primary }]}>
                        <Ionicons name="arrow-up" size={14} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* PROCESS STEPS (VERTICAL TIMELINE) */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Application Process</Text>
          <View style={{ paddingLeft: 10 }}>
            {[
              { icon: "document-text", title: "Apply Online", desc: "Fill out the application form with accurate details." },
              { icon: "search", title: "Application Review", desc: "Our team validates your details and documents." },
              { icon: "people", title: "Interview Round", desc: "Shortlisted candidates will be invited for a personal interview." },
              { icon: "home", title: "Home Verification", desc: "A field officer may visit your residence for verification." },
              { icon: "gift", title: "Scholarship Awarded", desc: "Successful applicants receive the scholarship funds." },
            ].map((step, idx, arr) => (
              <View key={idx} style={styles.timelineItem}>
                {/* Timeline Connector */}
                {idx !== arr.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: isDark ? "#333" : "#E5E7EB" }]} />
                )}

                <View style={[styles.timelineIconBox, { backgroundColor: isDark ? "#333" : "#FFF", borderColor: isDark ? "#444" : "#E5E7EB" }]}>
                  <Text style={[styles.timelineStepNum, { color: colors.primary }]}>{idx + 1}</Text>
                </View>

                <View style={[styles.timelineContent, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
                  <Text style={[styles.timelineTitle, { color: colors.text }]}>{step.title}</Text>
                  <Text style={styles.timelineDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* NOTES */}
        <View style={[styles.sectionContainer, { marginBottom: 40 }]}>
          <View style={[styles.noteBox, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }]}>
            <Ionicons name="bulb" size={20} color="#D97706" />
            <Text style={[styles.noteText, { color: "#92400E" }]}>Make sure to double check all your documents before submission to avoid rejection.</Text>
          </View>
        </View>

      </ScrollView>

      {/* FIXED ACTION BAR */}
      <View style={[styles.floatFooter, {
        paddingBottom: insets.bottom + 12,
        backgroundColor: isDark ? "#0f0f0f" : "#FFF",
        borderTopWidth: 1,
        borderTopColor: isDark ? "#333" : "#E5E7EB"
      }]}>
        <TouchableOpacity
          style={[styles.fullWidthButton, { backgroundColor: colors.primary }, (isApplicationClosed || scholarship.has_applied) && styles.disabledBtn]}
          disabled={isApplicationClosed || scholarship.has_applied}
          onPress={() => router.push({
            pathname: "/(dashboard)/student/student-apply-form",
            params: { scholarshipId: scholarship.id },
          })}
        >
          <Text style={styles.fullWidthButtonText}>
            {scholarship.has_applied ? "Application Submitted" : scholarship.expired ? "Scholarship Expired" : "Apply Now"}
          </Text>
          {!scholarship.has_applied && !scholarship.expired && <Ionicons name="arrow-forward" size={20} color="#FFF" />}
        </TouchableOpacity>
      </View>

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
  scrollView: {
    flex: 1,
  },
  // HERO CARD
  heroContainer: {
    padding: 20,
    marginBottom: 10,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    minHeight: 220,
    justifyContent: 'space-between'
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -60,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  categoryPillText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    lineHeight: 34,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
    fontWeight: '500',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 16,
  },
  heroFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deadlineInfo: {
    gap: 4,
  },
  deadlineLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deadlineValue: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '700',
  },
  heroBookmarkBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // SECTIONS & GRIDS
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  gridItem: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 8,
  },
  gridLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // PROGRESS CARD
  progressCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressPercent: {
    fontSize: 20,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressMessage: {
    fontSize: 13,
    lineHeight: 18,
  },

  // COMMON CONTENT CARD
  contentCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
  },

  // DOCS
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  docSub: {
    fontSize: 12,
  },

  // STEPS
  stepCard: {
    width: 140,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  stepNum: {
    fontSize: 40,
    fontWeight: '900',
    color: 'rgba(0,0,0,0.05)',
    position: 'absolute',
    top: -5,
    right: 10,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 14,
  },

  // NOTE
  noteBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },

  // FOOTER
  floatFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  fullWidthButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  fullWidthButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.7,
    backgroundColor: '#9CA3AF'
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
  datesCard: {
    flexDirection: 'column',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  horizontalLine: {
    width: '100%',
    height: 1,
  },

  // UPLOAD BTN
  uploadActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // TIMELINE
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 17, // center of the 36px icon box
    top: 36,
    bottom: -24,
    width: 2,
  },
  timelineIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    zIndex: 2,
    marginRight: 16,
  },
  timelineStepNum: {
    fontSize: 14,
    fontWeight: '800',
  },
  timelineContent: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  timelineDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});

