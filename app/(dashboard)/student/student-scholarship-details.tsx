import { AppHeader, Button, ExternalLink } from "@/components";
import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import { bookmarkScholarship, getScholarshipDetails } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import RenderHTML from "react-native-render-html";

const stripHtml = (html: string): string => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
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
  const { width } = Dimensions.get("window");
  const scholarshipId = params.scholarshipId ? Number(params.scholarshipId) : null;
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scholarship, setScholarship] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookmarking, setBookmarking] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  // Fetch scholarship details — runs every time screen gains focus
  // (e.g. when navigating back from the upload-document screen)
  useFocusEffect(
    useCallback(() => {
      const fetchScholarshipDetails = async () => {
        if (!scholarshipId) {
          setError("Scholarship ID is missing");
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setError(null);

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

          const response = await getScholarshipDetails(token, scholarshipId);
          if (response.success && response.data) {
            // Updated mapping based on new response structure
            const apiData = response.data.data || response.data;

            // Flatten application fields for easier access in UI
            if (apiData.application) {
              apiData.application_status = apiData.application.status;
              apiData.application_step = apiData.application.application_step;
              apiData.progress_percent = apiData.application.progress_percent;
              apiData.has_applied = true;
            }

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
    }, [scholarshipId])
  );

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

  const deadline = scholarship ? (scholarship.application_deadline || scholarship.end_date || scholarship.start_date) : null;
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


  // Custom styles for HTML rendering
  const tagsStyles: any = {
    body: {
      color: colors.textSecondary,
      fontSize: 15,
      lineHeight: 24,
      textAlign: 'left',
    },
    p: {
      marginBottom: 16,
      marginTop: 0,
    },
    div: {
      marginBottom: 12,
      marginTop: 0,
    },
    strong: {
      fontWeight: '700',
      color: colors.text,
    },
    ul: {
      marginBottom: 16,
      marginTop: 8,
      paddingLeft: 10,
    },
    ol: {
      marginBottom: 16,
      marginTop: 8,
      paddingLeft: 10,
    },
    li: {
      marginBottom: 12,
      fontSize: 15,
      lineHeight: 24,
    },
    h1: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 16,
      marginTop: 20,
      letterSpacing: -0.5,
    },
    h2: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 14,
      marginTop: 18,
      letterSpacing: -0.4,
    },
    h3: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 12,
      marginTop: 16,
      letterSpacing: -0.3,
    },
  };


  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'approved' || s === 'applied' || s === 'success') return "#10B981";
    if (s === 'rejected' || s === 'expired') return "#EF4444";
    if (s === 'pending' || s === 'processing') return "#F59E0B";
    return "#6366F1";
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0f0f0f" : "#F8F9FA" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#0f0f0f" : "#F8F9FA"} />

      <AppHeader title="Scholarship Details" onBack={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        {/* HERO IMAGE SECTION */}
        {scholarship.image ? (
          <View style={styles.imageHeaderContainer}>
            <Image
              source={{ uri: scholarship.image }}
              style={styles.heroBannerImage}
              contentFit="cover"
              transition={1000}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={styles.imageGradient}
            />
            <View style={styles.imageOverlayContent}>
              <View style={styles.categoryRow}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(scholarship.category || "General") }]}>
                  <Text style={styles.categoryBadgeText}>{scholarship.category || "General"}</Text>
                </View>
                <TouchableOpacity
                  onPress={handleBookmark}
                  style={styles.iconButton}
                  activeOpacity={0.7}
                  disabled={bookmarking}
                >
                  <Ionicons
                    name={saved || scholarship?.bookmarked ? "bookmark" : "bookmark-outline"}
                    size={22}
                    color="#FFF"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.bannerTitle} numberOfLines={2}>{scholarship.title}</Text>
              {scholarship.scholarship_tags && scholarship.scholarship_tags.length > 0 && (
                <View style={styles.tagList}>
                  {scholarship.scholarship_tags.map((tag: any) => (
                    <View key={tag.id} style={styles.tagItem}>
                      <Text style={styles.tagText}>#{tag.tag_name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : (
          /* FALLBACK HERO CARD */
          <View style={styles.heroContainer}>
            <LinearGradient
              colors={[
                getCategoryColor(scholarship.category || "General"),
                getCategoryColor(scholarship.category || "General") + "DD",
                getCategoryColor(scholarship.category || "General") + "BB"
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={[styles.decorativeCircle1, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
              <View style={[styles.decorativeCircle2, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />

              <View style={styles.heroHeaderRow}>
                <View style={[styles.categoryPill, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                  <Ionicons name="location" size={14} color="#FFF" />
                  <Text style={styles.categoryPillText}>{scholarship.category || "General"}</Text>
                </View>

                <View style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
                  <Text style={[styles.statusPillText, { color: getStatusColor(scholarship.application_status || (scholarship.has_applied ? "applied" : "open")) }]}>
                    {scholarship.application_status ? scholarship.application_status.replace(/_/g, ' ').toUpperCase() : (scholarship.has_applied ? "APPLIED" : scholarship.expired ? "EXPIRED" : "OPEN")}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>{scholarship.title}</Text>
              {scholarship.shortname && <Text style={styles.heroSubtitle}>{scholarship.shortname}</Text>}

              {scholarship.scholarship_tags && scholarship.scholarship_tags.length > 0 && (
                <View style={[styles.tagList, { marginTop: 0, marginBottom: 12 }]}>
                  {scholarship.scholarship_tags.map((tag: any) => (
                    <View key={tag.id} style={[styles.tagItem, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                      <Text style={styles.tagText}>#{tag.tag_name}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.heroDivider} />

              <View style={styles.heroFooterRow}>
                <View style={styles.deadlineInfo}>
                  <Text style={styles.deadlineLabel}>DEADLINE</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.deadlineValue}>
                      {deadline ? new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No Deadline"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleBookmark}
                  style={[styles.heroBookmarkBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                  activeOpacity={0.8}
                  disabled={bookmarking}
                >
                  <Ionicons
                    name={saved || scholarship?.bookmarked ? "bookmark" : "bookmark-outline"}
                    size={24}
                    color="#FFF"
                  />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* APPLICATION STATUS CARD (New Layout) */}
        {(scholarship.application_status || scholarship.application_step) && (
          <View style={styles.sectionContainer}>
            <View style={[styles.premiumCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: getStatusColor(scholarship.application_status) + "20" }]}>
                  <Ionicons name="shield-checkmark" size={20} color={getStatusColor(scholarship.application_status)} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.cardTag, { color: colors.textSecondary }]}>APPLICATION STATUS</Text>
                  <Text style={[styles.cardValue, { color: colors.text, textTransform: 'uppercase' }]}>
                    {scholarship.application_status?.replace(/_/g, ' ') || 'NOT APPLIED'}
                  </Text>
                </View>
                {scholarship.application_progress !== undefined && (
                  <View style={styles.circularProgress}>
                    <Text style={[styles.progressText, { color: colors.primary }]}>{scholarship.application_progress}%</Text>
                  </View>
                )}
              </View>

              {scholarship.application_step && (
                <View style={styles.stepInfoContainer}>
                  <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>CURRENT STEP</Text>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{scholarship.application_step.replace(/_/g, ' ')}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* PROGRESS BAR */}
        {scholarship.progress_percent !== undefined && scholarship.progress_percent > 0 && (
          <View style={styles.sectionContainer}>
            <View style={[styles.progressCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Overall Progress</Text>
                <Text style={[styles.progressPercent, { color: colors.primary }]}>{scholarship.progress_percent}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${scholarship.progress_percent}%`, backgroundColor: colors.primary }]} />
              </View>
            </View>
          </View>
        )}

        {/* QUICK DETAILS GRID */}
        <View style={styles.gridContainer}>
          <View style={[styles.gridItem, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={styles.gridLabel}>Start Date</Text>
            <Text style={[styles.gridValue, { color: colors.text }]}>
              {scholarship.start_date ? new Date(scholarship.start_date).toLocaleDateString() : "N/A"}
            </Text>
          </View>
          <View style={[styles.gridItem, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
            <Ionicons name="hourglass" size={20} color="#F59E0B" />
            <Text style={styles.gridLabel}>End Date</Text>
            <Text style={[styles.gridValue, { color: colors.text }]}>
              {scholarship.end_date ? new Date(scholarship.end_date).toLocaleDateString() : (scholarship.application_deadline ? new Date(scholarship.application_deadline).toLocaleDateString() : "No Deadline")}
            </Text>
          </View>
        </View>

        {/* DESCRIPTION SECTION */}
        {scholarship.description && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Description</Text>
            <View style={[styles.contentCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
              <RenderHTML
                contentWidth={width - 72}
                source={{ html: scholarship.description }}
                tagsStyles={tagsStyles}
              />
            </View>
          </View>
        )}

        {/* ELIGIBILITY CRITERIA */}
        {scholarship.eligibility_criteria && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Eligibility Criteria</Text>
            <View style={[styles.contentCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
              <RenderHTML
                contentWidth={width - 72}
                source={{ html: scholarship.eligibility_criteria }}
                tagsStyles={tagsStyles}
              />
            </View>
          </View>
        )}

        {/* SECTIONS & ACTIVITIES (New) */}
        {scholarship.sections && scholarship.sections.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Scholarship Modules</Text>
            {scholarship.sections.map((section: any, idx: number) => (
              <View key={section.id} style={[styles.moduleCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
                <View style={styles.moduleHeader}>
                  <View style={[styles.moduleIndexBadge, { backgroundColor: colors.primary + "15" }]}>
                    <Text style={[styles.moduleIndexText, { color: colors.primary }]}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.moduleTitle, { color: colors.text }]}>{section.name}</Text>
                    {section.summary ? (
                      <Text style={[styles.moduleSummary, { color: colors.textSecondary }]} numberOfLines={3}>
                        {stripHtml(section.summary)}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {section.activities && section.activities.length > 0 && (
                  <View style={styles.activitiesList}>
                    {section.activities.map((activity: any) => {
                      const isCompleted = activity.completion_state === 1;
                      const hasDoc = activity.document;
                      const docStatus = activity.document?.status;

                      return (
                        <ExternalLink
                          key={activity.id}
                          href={activity.url as any}
                          style={[styles.activityItem, { borderBottomColor: isDark ? "#333" : "#F3F4F6" }]}
                        >
                          <View style={styles.activityInner}>
                            {activity.modicon ? (
                              <Image source={{ uri: activity.modicon }} style={styles.activityIcon} />
                            ) : (
                              <View style={[styles.activityIcon, { backgroundColor: colors.primary + "10", borderRadius: 6, justifyContent: 'center', alignItems: 'center' }]}>
                                <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                              </View>
                            )}

                            <View style={{ flex: 1, marginRight: 10 }}>
                              <Text style={[styles.activityName, { color: colors.text }]} numberOfLines={1}>{activity.name}</Text>
                              {hasDoc && (
                                <View style={styles.docStatusRow}>
                                  <View style={[styles.statusMiniBadge, { backgroundColor: docStatus === 'done' ? '#DCFCE7' : '#FEF3C7' }]}>
                                    <View style={[styles.statusDot, { backgroundColor: docStatus === 'done' ? '#166534' : '#F59E0B' }]} />
                                    <Text style={[styles.statusMiniText, { color: docStatus === 'done' ? '#166534' : '#92400E' }]}>
                                      {docStatus === 'done' ? 'Done' : 'ToDo'}
                                    </Text>
                                  </View>
                                  {activity.document.due_date && (
                                    <Text style={[styles.activitySubtext, { color: colors.textSecondary }]}>
                                      Due: {new Date(activity.document.due_date).toLocaleDateString()}
                                    </Text>
                                  )}
                                </View>
                              )}
                            </View>

                            {isCompleted ? (
                              <View style={styles.completionBadge}>
                                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                              </View>
                            ) : (
                              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary + "80"} />
                            )}
                          </View>
                        </ExternalLink>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* DOCUMENTS LIST */}
        {scholarship.documents && scholarship.documents.length > 0 && (
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
                      {doc.due_date && <Text style={[styles.docDate, { color: colors.textSecondary }]}>Due: {new Date(doc.due_date).toLocaleDateString()}</Text>}
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

      </ScrollView>

      {/* FIXED ACTION BAR */}
      <View style={[styles.floatFooter, {
        paddingBottom: insets.bottom + 12,
        backgroundColor: isDark ? "rgba(15,15,15,0.95)" : "rgba(255,255,255,0.95)",
        borderTopWidth: 1,
        borderTopColor: isDark ? "#333" : "#E5E7EB"
      }]}>
        <TouchableOpacity
          style={[styles.fullWidthButton, { backgroundColor: getCategoryColor(scholarship.category || "General") }, (isApplicationClosed || scholarship.has_applied) && styles.disabledBtn]}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
    textAlign: "center",
  },
  errorButton: {
    minWidth: 120,
  },
  // IMAGE HEADER
  imageHeaderContainer: {
    height: 300,
    width: "100%",
    position: "relative",
    marginBottom: 20,
  },
  heroBannerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  imageOverlayContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
    lineHeight: 34,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tagItem: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // FALLBACK HERO CARD
  heroContainer: {
    padding: 20,
    marginBottom: 10,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    position: "relative",
    overflow: "hidden",
    minHeight: 220,
    justifyContent: "space-between",
  },
  decorativeCircle1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: -60,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  categoryPillText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFF",
    lineHeight: 34,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 16,
    fontWeight: "500",
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 16,
  },
  heroFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deadlineInfo: {
    gap: 4,
  },
  deadlineLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  deadlineValue: {
    fontSize: 14,
    color: "#FFF",
    fontWeight: "700",
  },
  heroBookmarkBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },

  // COMMON SECTIONS
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    marginTop: 8,
  },
  contentCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },

  // PREMIUM CARD Layout
  premiumCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTag: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  circularProgress: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "800",
  },
  stepInfoContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  stepBadge: {
    backgroundColor: "#F3F4F6",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    textTransform: "capitalize",
  },

  // PROGRESS CARD
  progressCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  progressPercent: {
    fontSize: 20,
    fontWeight: "800",
  },
  progressBarBg: {
    height: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
  },

  // GRID
  gridContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  gridItem: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "flex-start",
    gap: 8,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  gridValue: {
    fontSize: 14,
    fontWeight: "700",
  },

  // MODULES
  moduleCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
    padding: 16,
  },
  moduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  moduleIndexBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  moduleIndexText: {
    fontSize: 14,
    fontWeight: "800",
  },
  moduleTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  moduleSummary: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  activitiesList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
  },
  activityItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  activityInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  activityName: {
    fontSize: 14,
    fontWeight: "600",
  },
  docStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  statusMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusMiniText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: 'uppercase',
  },
  activitySubtext: {
    fontSize: 11,
    fontWeight: "500",
  },
  completionBadge: {
    marginLeft: 8,
  },

  // DOCS
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  docLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  docDate: {
    fontSize: 12,
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },
  uploadActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  // FOOTER
  floatFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  fullWidthButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  fullWidthButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  disabledBtn: {
    opacity: 0.7,
  },
});

