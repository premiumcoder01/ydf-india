import { AppHeader, Button, SearchBar } from "@/components";
import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import { bookmarkScholarship, getMobilizerStudents, getScholarshipDetails } from "@/utils/api";
import { API_CONFIG } from "@/utils/apiConfig";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

export default function MobilizerScholarshipDetailsScreen() {
    const { isDark, colors } = useTheme();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const scholarshipId = params.scholarshipId ? Number(params.scholarshipId) : null;

    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [scholarship, setScholarship] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [bookmarking, setBookmarking] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

    // Document upload modal (mobilizer has no separate upload screen)
    const [docModalVisible, setDocModalVisible] = useState(false);
    const [docModalDoc, setDocModalDoc] = useState<{ cmid: string; label: string; mode: string } | null>(null);
    const [docModalFile, setDocModalFile] = useState<any>(null);
    const [docModalUploading, setDocModalUploading] = useState(false);

    // Student Selection Modal State
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [students, setStudents] = useState<any[]>([]);
    const [studentSearchQuery, setStudentSearchQuery] = useState("");
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<number | null>(null);

    const refetchScholarshipDetails = useCallback(async () => {
        if (!scholarshipId) return;
        try {
            const authDataString = await AsyncStorage.getItem("authData");
            if (!authDataString) return;
            const authData = JSON.parse(authDataString);
            const token = authData?.token;
            if (!token) return;
            const response = await getScholarshipDetails(token, scholarshipId);
            if (response.success && response.data) {
                const raw = response.data;
                const apiData = raw?.data?.data || raw?.data || raw;
                setScholarship(apiData);
            }
        } catch (e) {
            console.error("Refetch scholarship details:", e);
        }
    }, [scholarshipId]);

    // Fetch scholarship details from API
    useEffect(() => {
        const run = async () => {
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
                    const raw = response.data;
                    const apiData = raw?.data?.data || raw?.data || raw;
                    setScholarship(apiData);
                } else {
                    setError(response.error || response.message || "Failed to load scholarship details");
                }
            } catch (err: any) {
                setError(err.message || "Failed to load scholarship details");
            } finally {
                setLoading(false);
            }
        };
        run();
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

    // Fetch Students for Selection Modal
    const fetchStudents = async () => {
        try {
            setLoadingStudents(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) return;
            const { token } = JSON.parse(authDataStr);

            const response = await getMobilizerStudents(token, 1, 100, studentSearchQuery);
            if (response.success && response.data?.students) {
                setStudents(response.data.students);
            } else {
                setStudents([]);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoadingStudents(false);
        }
    };

    // Effect to fetch students when modal opens or search changes
    useEffect(() => {
        if (showStudentModal) {
            fetchStudents();
        }
    }, [showStudentModal, studentSearchQuery]);

    const openDocModal = (doc: { cmid: string | number; label: string; mode?: string }) => {
        setDocModalDoc({
            cmid: String(doc.cmid),
            label: doc.label || "Document",
            mode: doc.mode || "scheme",
        });
        setDocModalFile(null);
        setDocModalVisible(true);
    };

    const closeDocModal = () => {
        setDocModalVisible(false);
        setDocModalDoc(null);
        setDocModalFile(null);
        refetchScholarshipDetails();
    };

    const pickDocModalFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["application/pdf", "image/*"],
                multiple: false,
            });
            if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const fileSizeInBytes = asset.size;
                const maxSizeInBytes = 10 * 1024 * 1024;
                if (fileSizeInBytes && fileSizeInBytes > maxSizeInBytes) {
                    showToast("File size exceeds 10MB limit.", "error");
                    return;
                }
                setDocModalFile({
                    uri: asset.uri,
                    name: asset.name,
                    mimeType: asset.mimeType || "application/unknown",
                    size: asset.size || 0,
                });
            }
        } catch (err) {
            showToast("Failed to pick document", "error");
        }
    };

    const performDocModalUpload = async () => {
        if (!docModalFile || !docModalDoc) return;
        setDocModalUploading(true);
        try {
            const authDataStr = await AsyncStorage.getItem("authData");
            const authData = authDataStr ? JSON.parse(authDataStr) : null;
            const token = authData?.token;
            if (!token) {
                showToast("Please login again.", "error");
                setDocModalUploading(false);
                return;
            }
            const uploadUrl = `${API_CONFIG.BASE_URL}local/mobileapi/upload_document.php?wstoken=${token}`;
            const formData = new FormData();
            formData.append("file", { uri: docModalFile.uri, name: docModalFile.name, type: docModalFile.mimeType } as any);
            formData.append("mode", docModalDoc.mode || "scheme");
            formData.append("cmid", docModalDoc.cmid);

            const response = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": "multipart/form-data" },
                body: formData,
            });
            const result = await response.json();
            if (response.ok && (result.success || result.status === true || result[0]?.status === true)) {
                showToast("Document uploaded successfully!", "success");
                closeDocModal();
            } else {
                closeDocModal();
                showToast(result.message || "Upload failed.", "error");

            }
        } catch (e) {
            showToast("Failed to upload. Try again.", "error");
            closeDocModal();
        } finally {
            setDocModalUploading(false);
        }
    };

    const handleDocModalUploadPress = () => {
        if (!docModalFile) {
            showToast("Please select a document first", "error");
            return;
        }
        Alert.alert(
            "Confirm Upload",
            `Upload "${docModalFile.name}" for ${docModalDoc?.label || "this document"}?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Upload", onPress: performDocModalUpload },
            ]
        );
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

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#0f0f0f" : "#F8F9FA" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#0f0f0f" : "#F8F9FA"} />
            <AppHeader title="Scholarship Details" onBack={() => router.back()} />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 150 }}
            >
                {/* HERO CARD - same as student */}
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
                            <View style={[
                                styles.statusPill,
                                { backgroundColor: 'rgba(255,255,255,0.95)' }
                            ]}>
                                <Text style={[
                                    styles.statusPillText,
                                    {
                                        color: scholarship.has_applied ? "#4CAF50" : scholarship.expired ? "#EF4444" : getCategoryColor(scholarship.category || "General")
                                    }
                                ]}>
                                    {scholarship.has_applied ? "APPLIED" : scholarship.expired ? "EXPIRED" : "OPEN"}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.heroTitle}>{scholarship.title}</Text>
                        {scholarship.shortname && <Text style={styles.heroSubtitle}>{scholarship.shortname}</Text>}
                        <View style={styles.heroDivider} />
                        <View style={styles.heroFooterRow}>
                            <View style={styles.deadlineInfo}>
                                <Text style={styles.deadlineLabel}>DEADLINE</Text>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                    <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.9)" />
                                    <Text style={styles.deadlineValue}>
                                        {deadline ? new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No Deadline"}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={handleBookmark} style={[styles.heroBookmarkBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]} activeOpacity={0.8} disabled={bookmarking}>
                                <Ionicons name={saved || scholarship?.bookmarked ? "bookmark" : "bookmark-outline"} size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>

                {/* Application Progress - same as student */}
                {scholarship.progress_percent !== undefined && (
                    <View style={styles.sectionContainer}>
                        <View style={[styles.progressCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
                            <View style={styles.progressHeader}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                    <View style={[styles.progressIconBox, { backgroundColor: getCategoryColor(scholarship.category || "General") + "20" }]}>
                                        <Ionicons name="pie-chart" size={20} color={getCategoryColor(scholarship.category || "General")} />
                                    </View>
                                    <Text style={[styles.cardTitle, { color: colors.text }]}>Application Progress</Text>
                                </View>
                                <Text style={[styles.progressPercent, { color: getCategoryColor(scholarship.category || "General") }]}>{scholarship.progress_percent}%</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${scholarship.progress_percent}%`, backgroundColor: scholarship.progress_percent === 100 ? "#10B981" : getCategoryColor(scholarship.category || "General") }]} />
                            </View>
                            <Text style={[styles.progressMessage, { color: colors.textSecondary }]}>
                                {scholarship.progress_percent === 100 ? "Everything looks good! You have completed the application." : "Complete all required steps to submit your application securely."}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Timeline - same as student */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Timeline</Text>
                    <View style={[styles.datesCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
                        {scholarship.start_date && (
                            <View style={styles.dateRow}>
                                <View style={[styles.dateIconBox, { backgroundColor: getCategoryColor(scholarship.category || "General") + "20" }]}>
                                    <Ionicons name="play" size={18} color={getCategoryColor(scholarship.category || "General")} />
                                </View>
                                <View style={styles.dateInfo}>
                                    <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>APPLICATION OPENS</Text>
                                    <Text style={[styles.dateValue, { color: colors.text }]}>
                                        {new Date(scholarship.start_date).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                                    </Text>
                                </View>
                            </View>
                        )}
                        {scholarship.start_date && (scholarship.end_date || scholarship.application_deadline) && (
                            <View style={[styles.horizontalLine, { backgroundColor: isDark ? "#333" : "#F3F4F6" }]} />
                        )}
                        {(scholarship.end_date || scholarship.application_deadline) && (
                            <View style={styles.dateRow}>
                                <View style={[styles.dateIconBox, { backgroundColor: getCategoryColor(scholarship.category || "General") + "20" }]}>
                                    <Ionicons name="stop" size={18} color={getCategoryColor(scholarship.category || "General")} />
                                </View>
                                <View style={styles.dateInfo}>
                                    <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>APPLICATION CLOSES</Text>
                                    <Text style={[styles.dateValue, { color: colors.text }]}>
                                        {new Date(scholarship.end_date || scholarship.application_deadline).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* About Scholarship */}
                {description ? (
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>About Scholarship</Text>
                        <View style={[styles.contentCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
                            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{description}</Text>
                        </View>
                    </View>
                ) : null}

                {/* Eligibility */}
                {scholarship.eligibility_criteria ? (
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Eligibility</Text>
                        <View style={[styles.contentCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
                            <View style={{ flexDirection: "row", gap: 12 }}>
                                <Ionicons name="school" size={24} color={colors.primary} style={{ marginTop: 2 }} />
                                <Text style={[styles.bodyText, { color: colors.textSecondary, flex: 1 }]}>{scholarship.eligibility_criteria}</Text>
                            </View>
                        </View>
                    </View>
                ) : null}

                {/* Required Documents - same as student */}
                {scholarship.documents && scholarship.documents.length > 0 && !scholarship.expired && (
                    <View style={styles.sectionContainer}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <Text style={[styles.sectionHeaderTitle, { color: colors.text, marginBottom: 0 }]}>Required Documents</Text>
                            <View style={[styles.countBadge, { backgroundColor: isDark ? "#333" : "#F3F4F6" }]}>
                                <Text style={[styles.countText, { color: isDark ? "#fff" : "#374151" }]}>{scholarship.documents.length} Items</Text>
                            </View>
                        </View>
                        <View style={{ gap: 12 }}>
                            {scholarship.documents.map((doc: any, index: number) => {
                                const isCompleted = doc.uploaded || doc.status !== "todo";
                                return (
                                    <TouchableOpacity
                                        key={doc.id ?? index}
                                        activeOpacity={isCompleted ? 1 : 0.7}
                                        onPress={() => {
                                            if (!isCompleted) {
                                                openDocModal({
                                                    cmid: doc.cmid,
                                                    label: doc.label,
                                                    mode: doc.mode || "scheme",
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

                {/* Application Process - same as student */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>📝 Application Process</Text>
                    <View style={{ paddingLeft: 10 }}>
                        {[
                            { emoji: "📄", title: "Application", desc: "Please complete and submit all required steps of the application form along with necessary documents for the scholarship process." },
                            { emoji: "📁", title: "Document Collection", desc: "Upload the required documents including previous year's mark sheets, fee structure for the current year (if applicable), and any other supporting documents." },
                            { emoji: "📆", title: "Interview", desc: "To assess your eligibility, schedule an interview. The interview will help finalize your selection in the scholarship process." },
                            { emoji: "✅", title: "Selection", desc: "The scholarship committee will evaluate applications, documents, and interview responses to shortlist deserving candidates." },
                            { emoji: "💰", title: "Disbursement", desc: "If selected, the scholarship amount will be transferred directly to the recipient's bank account." },
                        ].map((step, idx, arr) => (
                            <View key={idx} style={styles.timelineItem}>
                                {idx !== arr.length - 1 && <View style={[styles.timelineLine, { backgroundColor: isDark ? "#333" : "#E5E7EB" }]} />}
                                <View style={[styles.timelineIconBox, { backgroundColor: isDark ? "#333" : "#FFF", borderColor: isDark ? "#444" : "#E5E7EB" }]}>
                                    <Text style={[styles.timelineStepNum, { color: getCategoryColor(scholarship.category || "General"), fontSize: 16 }]}>{step.emoji}</Text>
                                </View>
                                <View style={[styles.timelineContent, { backgroundColor: isDark ? "#1e1e1e" : "#FFF", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
                                    <Text style={[styles.timelineTitle, { color: colors.text }]}>{step.title}</Text>
                                    <Text style={styles.timelineDesc}>{step.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Notes - same as student */}
                <View style={[styles.sectionContainer, { marginBottom: 40 }]}>
                    <View style={[styles.noteBox, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }]}>
                        <Ionicons name="bulb" size={20} color="#D97706" />
                        <Text style={[styles.noteText, { color: "#92400E" }]}>
                            Make sure to double check all your documents before submission to avoid rejection.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Fixed footer - same as student */}
            <View style={[styles.floatFooter, { paddingBottom: insets.bottom + 12, backgroundColor: isDark ? "#0f0f0f" : "#FFF", borderTopWidth: 1, borderTopColor: isDark ? "#333" : "#E5E7EB" }]}>
                <TouchableOpacity
                    style={[
                        styles.fullWidthButton,
                        { backgroundColor: getCategoryColor(scholarship.category || "General") },
                        (isApplicationClosed || scholarship.has_applied) && styles.disabledBtn
                    ]}
                    disabled={isApplicationClosed || scholarship.has_applied}
                    onPress={() => setShowStudentModal(true)}
                >
                    <Text style={styles.fullWidthButtonText}>
                        {scholarship.has_applied ? "Application Submitted" : scholarship.expired ? "Scholarship Expired" : "Apply for"}
                    </Text>
                    {!scholarship.has_applied && !scholarship.expired && <Ionicons name="arrow-forward" size={20} color="#FFF" />}
                </TouchableOpacity>
            </View>

            {/* Full-page document upload modal (mobilizer has no separate upload screen) */}
            <Modal
                visible={docModalVisible}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={closeDocModal}
            >
                <View style={[styles.docModalContainer, { backgroundColor: isDark ? "#121212" : "#f8f9fa", paddingTop: insets.top + 8 }]}>
                    <View style={[styles.docModalHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.docModalTitle, { color: colors.text }]}>Upload Document</Text>
                        <TouchableOpacity onPress={closeDocModal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.docModalContent}>
                        <View style={styles.docModalIconWrap}>
                            <View style={[styles.docModalIconBox, { backgroundColor: isDark ? "rgba(76, 175, 80, 0.2)" : "rgba(76, 175, 80, 0.1)" }]}>
                                <Ionicons name="cloud-upload" size={40} color="#4CAF50" />
                            </View>
                            <Text style={[styles.docModalHeading, { color: colors.text }]}>Upload Required Document</Text>
                            <Text style={[styles.docModalSub, { color: colors.textSecondary }]}>Document:</Text>
                            <Text style={styles.docModalLabel}>{docModalDoc?.label || "—"}</Text>
                        </View>

                        <View style={[styles.docModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            {!docModalFile ? (
                                <TouchableOpacity
                                    style={[styles.docModalPlaceholder, { borderColor: colors.border }]}
                                    onPress={pickDocModalFile}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
                                    <Text style={[styles.docModalPlaceholderText, { color: colors.text }]}>Tap to select a file</Text>
                                    <Text style={[styles.docModalPlaceholderSub, { color: colors.textSecondary }]}>PDF, JPG, PNG (Max 10MB)</Text>
                                    <View style={[styles.docModalSelectBtn, { backgroundColor: colors.primary }]}>
                                        <Text style={styles.docModalSelectBtnText}>Select File</Text>
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.docModalFileWrap}>
                                    <View style={[styles.docModalFileRow, { backgroundColor: isDark ? colors.background : "#f8f9fa" }]}>
                                        <View style={[styles.docModalFileIcon, { backgroundColor: "rgba(76, 175, 80, 0.2)" }]}>
                                            <Ionicons name="document" size={24} color="#4CAF50" />
                                        </View>
                                        <View style={styles.docModalFileDetails}>
                                            <Text style={[styles.docModalFileName, { color: colors.text }]} numberOfLines={1}>{docModalFile.name}</Text>
                                            <Text style={[styles.docModalFileSize, { color: colors.textSecondary }]}>
                                                {(docModalFile.size / 1024 / 1024).toFixed(2)} MB
                                            </Text>
                                        </View>
                                        <TouchableOpacity onPress={() => setDocModalFile(null)} disabled={docModalUploading}>
                                            <Ionicons name="close-circle" size={24} color="#F44336" />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.docModalSuccessRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                        <Text style={styles.docModalSuccessText}>File selected — tap Upload below</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        <View style={styles.docModalActions}>
                            <Button
                                title={docModalUploading ? "Uploading..." : "Upload"}
                                onPress={handleDocModalUploadPress}
                                variant="primary"
                                disabled={!docModalFile || docModalUploading}
                                style={[styles.docModalUploadBtn, (!docModalFile || docModalUploading) && { opacity: 0.6 }]}
                            />
                            <TouchableOpacity style={styles.docModalCancelBtn} onPress={closeDocModal} disabled={docModalUploading}>
                                <Text style={[styles.docModalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

                    {docModalUploading && (
                        <View style={styles.docModalLoading}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={[styles.docModalLoadingText, { color: colors.text }]}>Uploading...</Text>
                        </View>
                    )}
                </View>
            </Modal>

            {/* Student Selection Modal */}
            <Modal
                visible={showStudentModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowStudentModal(false)}
            >
                <View style={[styles.fullScreenModal, { backgroundColor: isDark ? "#121212" : "#f5f5f5" }]}>
                    <View style={[styles.modalHeader, { paddingTop: 20, backgroundColor: isDark ? "#1E1E1E" : "#fff", borderBottomColor: colors.border }]}>
                        <View style={styles.modalHeaderTop}>
                            <TouchableOpacity onPress={() => setShowStudentModal(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Student</Text>
                            <View style={{ width: 24 }} />
                        </View>
                        <SearchBar
                            value={studentSearchQuery}
                            onChangeText={setStudentSearchQuery}
                            placeholder="Search student..."
                            onClear={() => setStudentSearchQuery("")}
                            style={{ paddingHorizontal: 0, marginTop: 10, paddingVertical: 0, borderRadius: 12 }} />
                    </View>

                    {loadingStudents ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={students}
                            keyExtractor={(item) => String(item.id)}
                            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                            renderItem={({ item }) => {
                                const isSelected = selectedStudent === item.id;
                                const avatarColor = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"][item.id % 5];
                                const initials = ((item.firstname || "S").charAt(0) + (item.lastname || "").charAt(0)).toUpperCase();

                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.studentCard,
                                            {
                                                backgroundColor: isDark ? colors.card : "#fff",
                                                borderColor: isSelected ? getCategoryColor(scholarship.category || "General") : isDark ? colors.border : 'transparent',
                                                borderWidth: isSelected ? 2 : 1
                                            }
                                        ]}
                                        onPress={() => setSelectedStudent(item.id)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            {item.picture && !item.picture.includes("gravatar.com/avatar/default") ? (
                                                <Image
                                                    source={{ uri: item.picture }}
                                                    style={styles.studentAvatar}
                                                    contentFit="cover"
                                                />
                                            ) : (
                                                <View style={[styles.studentAvatarPlaceholder, { backgroundColor: avatarColor }]}>
                                                    <Text style={styles.studentInitials}>{initials}</Text>
                                                </View>
                                            )}
                                            <View style={{ marginLeft: 12, flex: 1 }}>
                                                <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>
                                                    {item.fullname || `${item.firstname} ${item.lastname}`}
                                                </Text>
                                                <Text style={[styles.studentDetail, { color: colors.textSecondary }]} numberOfLines={1}>
                                                    {item.email}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{
                                            width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                                            borderColor: isSelected ? getCategoryColor(scholarship.category || "General") : colors.textSecondary,
                                            justifyContent: 'center', alignItems: 'center'
                                        }}>
                                            {isSelected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: getCategoryColor(scholarship.category || "General") }} />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={{ alignItems: 'center', marginTop: 50 }}>
                                    <Text style={{ color: colors.textSecondary }}>No students found</Text>
                                </View>
                            }
                        />
                    )}

                    <View style={[styles.modalFooter, { backgroundColor: isDark ? "#1E1E1E" : "#fff", borderTopColor: colors.border, paddingBottom: insets.bottom + 20 }]}>
                        <TouchableOpacity
                            style={[
                                styles.applyFilterBtn,
                                { backgroundColor: selectedStudent ? getCategoryColor(scholarship.category || "General") : (isDark ? "#333" : "#ccc"), opacity: selectedStudent ? 1 : 0.7 }
                            ]}
                            disabled={!selectedStudent}
                            onPress={() => {
                                if (selectedStudent && scholarship?.id) {
                                    setShowStudentModal(false);
                                    router.push({
                                        pathname: "/(dashboard)/mobilizer/mobilizer-apply-form",
                                        params: {
                                            scholarshipId: scholarship.id,
                                            studentId: selectedStudent
                                        },
                                    });
                                    // Reset selection slightly after navigation
                                    setTimeout(() => setSelectedStudent(null), 500);
                                }
                            }}
                        >
                            <Text style={styles.applyFilterText}>Proceed to Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Toast message={toastMessage} type={toastType} visible={toastVisible} onHide={() => setToastVisible(false)} duration={3000} />
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
    heroContainer: {
        padding: 20,
        marginBottom: 10,
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        position: "relative",
        overflow: "hidden",
        shadowColor: "#2563EB",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
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
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    decorativeCircle2: {
        position: "absolute",
        bottom: -60,
        left: -20,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: "rgba(255,255,255,0.05)",
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
        backgroundColor: "rgba(255,255,255,0.2)",
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
        color: "#FFF",
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
        textShadowColor: "rgba(0,0,0,0.1)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
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
        backgroundColor: "rgba(255,255,255,0.15)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.3)",
    },
    sectionContainer: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionHeaderTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 12,
    },
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
    progressIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
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
        marginBottom: 12,
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 5,
    },
    progressMessage: {
        fontSize: 13,
        lineHeight: 18,
    },
    datesCard: {
        flexDirection: "column",
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 16,
    },
    dateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    dateIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    dateInfo: {
        flex: 1,
    },
    dateLabel: {
        fontSize: 11,
        fontWeight: "600",
        textTransform: "uppercase",
        marginBottom: 2,
    },
    dateValue: {
        fontSize: 13,
        fontWeight: "700",
    },
    horizontalLine: {
        width: "100%",
        height: 1,
    },
    contentCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    bodyText: {
        fontSize: 15,
        lineHeight: 24,
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
    docSub: {
        fontSize: 12,
    },
    uploadActionBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    timelineItem: {
        flexDirection: "row",
        marginBottom: 24,
        position: "relative",
    },
    timelineLine: {
        position: "absolute",
        left: 17,
        top: 36,
        bottom: -24,
        width: 2,
    },
    timelineIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        zIndex: 2,
        marginRight: 16,
    },
    timelineStepNum: {
        fontSize: 14,
        fontWeight: "800",
    },
    timelineContent: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    timelineTitle: {
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 4,
    },
    timelineDesc: {
        fontSize: 13,
        color: "#6B7280",
        lineHeight: 18,
    },
    noteBox: {
        flexDirection: "row",
        gap: 12,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: "flex-start",
    },
    floatFooter: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 12,
        paddingHorizontal: 20,
        backgroundColor: "transparent",
    },
    fullWidthButton: {
        width: "100%",
        paddingVertical: 16,
        borderRadius: 16,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
    },
    fullWidthButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "700",
    },
    disabledBtn: {
        opacity: 0.7,
        backgroundColor: "#9CA3AF",
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
        fontSize: 26,
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
    descriptionText: {
        fontSize: 15,
        color: "#333",
        lineHeight: 24,
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
        flexWrap: "wrap",
    },
    saveButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: "#f8f8f8",
        borderWidth: 2,
        borderColor: "#e0e0e0",
        minWidth: 110,
    },
    saveButtonActive: {
        backgroundColor: "#FFF9E6",
        borderColor: "#FFB400",
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#666",
        textAlign: "center",
    },
    saveButtonTextActive: {
        color: "#FFB400",
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    applyButton: {
        flex: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
        minWidth: 180,
    },
    applyButtonDisabled: {
        opacity: 0.6,
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
        textAlign: "center",
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
    docModalContainer: {
        flex: 1,
    },
    docModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    docModalTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    docModalContent: {
        padding: 24,
        paddingBottom: 48,
    },
    docModalIconWrap: {
        alignItems: "center",
        marginBottom: 28,
    },
    docModalIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    docModalHeading: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 8,
        textAlign: "center",
    },
    docModalSub: {
        fontSize: 14,
        marginBottom: 4,
    },
    docModalLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#4CAF50",
        textAlign: "center",
    },
    docModalCard: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: "hidden",
        marginBottom: 24,
    },
    docModalPlaceholder: {
        padding: 32,
        alignItems: "center",
        borderWidth: 2,
        borderStyle: "dashed",
        margin: 12,
        borderRadius: 16,
    },
    docModalPlaceholderText: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 12,
    },
    docModalPlaceholderSub: {
        fontSize: 13,
        marginTop: 4,
    },
    docModalSelectBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 20,
    },
    docModalSelectBtnText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
    docModalFileWrap: {
        padding: 20,
    },
    docModalFileRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    docModalFileIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    docModalFileDetails: {
        flex: 1,
    },
    docModalFileName: {
        fontSize: 15,
        fontWeight: "600",
    },
    docModalFileSize: {
        fontSize: 12,
        marginTop: 2,
    },
    docModalSuccessRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    docModalSuccessText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#4CAF50",
    },
    docModalActions: {
        gap: 16,
    },
    docModalUploadBtn: {
        borderRadius: 14,
        paddingVertical: 16,
    },
    docModalCancelBtn: {
        paddingVertical: 16,
        alignItems: "center",
    },
    docModalCancelText: {
        fontSize: 16,
        fontWeight: "600",
    },
    docModalLoading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    docModalLoadingText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: "600",
    },
    // Student Selection Modal Styles
    fullScreenModal: {
        flex: 1,
    },
    modalHeader: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    modalHeaderTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    closeBtn: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        flex: 1,
        textAlign: "center",
    },
    studentCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    studentAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    studentAvatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    studentInitials: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
    },
    studentName: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 2,
    },
    studentDetail: {
        fontSize: 13,
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
    },
    applyFilterBtn: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    applyFilterText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
});
