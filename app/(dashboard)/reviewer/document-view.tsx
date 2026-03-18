import { useTheme } from "@/context/ThemeContext";
import { verifyDocument } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import Pdf from 'react-native-pdf';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

const { width } = Dimensions.get("window");

export default function DocumentViewScreen() {
    const params = useLocalSearchParams();
    const { id, title, fileName, filesize, mimetype, url, verified, rejectionReason } = params;

    const { colors, isDark } = useTheme();
    const inset = useSafeAreaInsets();

    const isVerified = verified === "true";
    const isRejected = rejectionReason && rejectionReason.toString().trim() !== "";
    const isProcessed = isVerified || isRejected;

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [newRejectionReason, setNewRejectionReason] = useState("");
    const [customReason, setCustomReason] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const rejectionOptions = ["Wrong Document", "Document Not Visible", "Not Verified", "Partially Verified", "Other"];
    const [submitting, setSubmitting] = useState(false);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isImage = mimetype?.toString().includes("image") || fileName?.toString().match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = mimetype?.toString().includes("pdf") || fileName?.toString().match(/\.pdf$/i);

    const formatFileSize = (bytes: number) => {
        if (!bytes || isNaN(bytes)) return "Unknown size";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const handleApprove = async () => {
        if (!id) {
            Alert.alert("Error", "Document ID not found. Please try again.");
            return;
        }

        const documentId = Number(id);
        if (isNaN(documentId) || documentId <= 0) {
            Alert.alert("Error", "Invalid document ID");
            return;
        }

        Alert.alert(
            "Approve Document",
            "Are you sure you want to approve this document?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Approve",
                    style: "default",
                    onPress: async () => {
                        try {
                            setSubmitting(true);
                            const authDataStr = await AsyncStorage.getItem("authData");
                            const authData = authDataStr ? JSON.parse(authDataStr) : null;
                            const token = authData?.token;

                            if (!token) {
                                Alert.alert("Error", "Authentication token not found.");
                                setSubmitting(false);
                                return;
                            }

                            const response = await verifyDocument(token, documentId, "verify", "Verified", 1, "Verified");
                            setSubmitting(false);

                            if (response.success) {
                                Alert.alert("Success", response.message || "Document verified successfully", [
                                    { text: "OK", onPress: () => router.back() }
                                ]);
                            } else {
                                Alert.alert("Error", response.error || "Failed to verify document");
                            }
                        } catch (error: any) {
                            setSubmitting(false);
                            Alert.alert("Error", error.message || "Something went wrong");
                        }
                    }
                }
            ]
        );
    };

    const handleReject = async () => {
        const reasonToSend = newRejectionReason === "Other" ? customReason : newRejectionReason;
        if (!reasonToSend.trim()) {
            Alert.alert("Error", "Please provide a reason for rejection");
            return;
        }

        if (!id) {
            Alert.alert("Error", "Document ID not found. Please try again.");
            setShowRejectModal(false);
            return;
        }

        const documentId = Number(id);
        if (isNaN(documentId) || documentId <= 0) {
            Alert.alert("Error", "Invalid document ID");
            setShowRejectModal(false);
            return;
        }

        try {
            setSubmitting(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            const authData = authDataStr ? JSON.parse(authDataStr) : null;
            const token = authData?.token;

            if (!token) {
                Alert.alert("Error", "Authentication token not found.");
                setSubmitting(false);
                return;
            }

            const response = await verifyDocument(token, documentId, "reject", reasonToSend, undefined, reasonToSend);
            setSubmitting(false);
            setShowRejectModal(false);

            if (response.success) {
                setNewRejectionReason("");
                setCustomReason("");
                setIsDropdownOpen(false);
                Alert.alert("Success", response.message || "Document rejected successfully", [
                    { text: "OK", onPress: () => router.back() }
                ]);
            } else {
                Alert.alert("Error", response.error || "Failed to reject document");
            }
        } catch (error: any) {
            setSubmitting(false);
            setShowRejectModal(false);
            Alert.alert("Error", error.message || "Something went wrong");
        }
    };

    const handleDownload = () => {
        if (url) {
            Linking.openURL(url.toString());
        } else {
            Alert.alert("Error", "Document URL not available");
        }
    };

    React.useEffect(() => {
        if (!url) {
            setLoading(false);
            return;
        }

        const checkDocument = async () => {
            try {
                setLoading(true);
                const response = await fetch(url.toString());
                if (!response.ok) {
                    const status = response.status;
                    let msg = "The document could not be loaded.";
                    try {
                        const json = await response.json();
                        if (json.code) setErrorCode(json.code);
                        if (json.error) {
                            setErrorMessage(json.error);
                            msg = json.error;
                        }
                    } catch (e) {
                        if (status === 404) {
                            setErrorCode("file_not_found");
                            setErrorMessage("Document not found.");
                            msg = "Document not found.";
                        }
                    }
                    setLoadError(true);
                } else {
                    setLoadError(false);
                    setErrorCode(null);
                    setErrorMessage(null);
                }
            } catch (err) {
                console.log("Document check error:", err);
                // If fetch fails (CORS/Network), we let the components try anyway
            } finally {
                setLoading(false);
            }
        };

        checkDocument();
    }, [url]);

    const rawTitle = title?.toString() || "";
    const headerTitle = rawTitle.includes("/") ? rawTitle.split("/")[0].trim() : (rawTitle || 'Review Details');

    const renderPreviewContent = () => {
        if (!url) {
            return (
                <View style={[styles.stateContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <Ionicons name="link-outline" size={54} color={colors.textSecondary} />
                    <Text style={[styles.stateTitle, { color: colors.text }]}>No Document Link</Text>
                    <Text style={[styles.stateSub, { color: colors.textSecondary }]}>The URL for this document could not be found.</Text>
                </View>
            );
        }

        if (loadError) {
            const isNotFound = errorCode === "file_not_found" || errorMessage?.includes("not found");
            return (
                <View style={[styles.stateContainer, { borderColor: colors.border, backgroundColor: colors.card, borderStyle: isNotFound ? 'solid' : 'dashed' }]}>
                    <View style={[styles.errorIconBox, isNotFound && { backgroundColor: isDark ? "rgba(251, 191, 36, 0.1)" : "#FFF9E6" }]}>
                        <Ionicons
                            name={isNotFound ? "alert-circle-outline" : "cloud-offline-outline"}
                            size={48}
                            color={isNotFound ? "#FBBF24" : "#F44336"}
                        />
                    </View>
                    <Text style={[styles.stateTitle, { color: colors.text }]}>
                        {isNotFound ? "Document Missing" : "Load Failed"}
                    </Text>
                    <Text style={[styles.stateSub, { color: colors.textSecondary }]}>
                        {errorMessage || "The document could not be found."}
                    </Text>

                    {!isNotFound && (
                        <TouchableOpacity
                            style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                            onPress={handleDownload}
                        >
                            <Ionicons name="open-outline" size={20} color="#fff" />
                            <Text style={styles.primaryActionText}>Open in Browser</Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        }

        if (isImage) {
            return (
                <View style={[styles.documentCard, { borderColor: colors.border, backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}>
                    <Image
                        source={{ uri: url.toString() }}
                        style={styles.imageViewer}
                        contentFit="contain"
                        onLoadStart={() => setLoading(true)}
                        onLoadEnd={() => setLoading(false)}
                        onError={() => {
                            setLoading(false);
                            setLoadError(true);
                        }}
                    />
                    {loading && (
                        <View style={styles.loaderOverlay}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    )}
                </View>
            );
        }

        if (isPdf) {
            return (
                <View style={[styles.documentCard, { borderColor: colors.border, backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}>
                    <Pdf
                        source={{ uri: url.toString(), cache: true }}
                        style={styles.pdfViewer}
                        trustAllCerts={false}
                        onLoadComplete={() => setLoading(false)}
                        onError={(error) => {
                            console.log("PDF error: ", error);
                            setLoading(false);
                            setLoadError(true);
                        }}
                    />
                    {loading && (
                        <View style={styles.loaderOverlay}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    )}
                </View>
            );
        }

        // Generic File Type Fallback
        return (
            <View style={[styles.stateContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={[styles.genericIconBox, { backgroundColor: isDark ? "#1F2937" : "#E0F2FE" }]}>
                    <Ionicons name="document-attach-outline" size={54} color={colors.primary} />
                </View>
                <Text style={[styles.stateTitle, { color: colors.text }]}>Document Format</Text>
                <Text style={[styles.stateSub, { color: colors.textSecondary }]}>
                    App natively previewing {mimetype?.toString().split('/')[1]?.toUpperCase() || 'this file format'} is not supported.
                </Text>
                <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                    onPress={handleDownload}
                >
                    <Ionicons name="download-outline" size={20} color="#fff" />
                    <Text style={styles.primaryActionText}>Download to View</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#F4F6F8" }]}>
            <ReviewerHeader
                title="Document View"
                subtitle={headerTitle}
                showBackButton={true}
                rightElement={
                    <TouchableOpacity style={[styles.downloadIconBtn, { backgroundColor: isDark ? "#1F2937" : "#E0F2FE" }]} onPress={handleDownload}>
                        <Ionicons name="open-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                }
            />

            {/* Premium Document Details Card */}
            <View style={[styles.docHeaderPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.docHeaderRow}>
                    <View style={[styles.iconCircle, { backgroundColor: isDark ? "#2D3748" : "#EEF2F6" }]}>
                        <Ionicons
                            name={isPdf ? "document-text" : isImage ? "image" : "document"}
                            size={26}
                            color={colors.primary}
                        />
                    </View>
                    <View style={styles.docHeaderInfo}>
                        <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                            {fileName?.toString() || "Unknown File"}
                        </Text>
                        <View style={styles.badgesRow}>
                            <View style={[styles.badge, { backgroundColor: isDark ? "#2D3748" : "#F1F5F9" }]}>
                                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                                    {formatFileSize(Number(filesize))}
                                </Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: isDark ? `${colors.primary}20` : `${colors.primary}15` }]}>
                                <Text style={[styles.badgeText, { color: colors.primary, fontWeight: '700' }]}>
                                    {mimetype?.toString().split('/')[1]?.toUpperCase() || 'FILE'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {(isVerified || isRejected) && (
                    <View style={styles.statusBannerWrapper}>
                        <View style={[styles.statusBanner, {
                            backgroundColor: isVerified ? (isDark ? "rgba(76, 175, 80, 0.15)" : "#E8F5E9") : (isDark ? "rgba(244, 67, 54, 0.15)" : "#FFEBEE"),
                            borderColor: isVerified ? (isDark ? "rgba(76, 175, 80, 0.3)" : "#A5D6A7") : (isDark ? "rgba(244, 67, 54, 0.3)" : "#EF9A9A")
                        }]}>
                            <Ionicons name={isVerified ? "checkmark-circle" : "close-circle"} size={20} color={isVerified ? "#4CAF50" : "#F44336"} />
                            <Text style={[styles.statusText, { color: isVerified ? (isDark ? "#81C784" : "#2E7D32") : (isDark ? "#E57373" : "#C62828") }]} numberOfLines={1}>
                                {isVerified ? "Document is verified" : `Rejected: ${rejectionReason}`}
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Preview Area */}
            <View style={styles.previewSection}>
                {renderPreviewContent()}
            </View>

            {/* Modern Bottom Actions - Sticky */}
            {!isProcessed && errorCode !== "file_not_found" && (
                <View style={[styles.footer, { paddingBottom: inset.bottom || 24, backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn, submitting && { opacity: 0.7 }]}
                        disabled={submitting}
                        onPress={() => setShowRejectModal(true)}
                    >
                        <Ionicons name="close" size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn, submitting && { opacity: 0.7 }]}
                        disabled={submitting}
                        onPress={handleApprove}
                    >
                        <Ionicons name="checkmark" size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>
                            {submitting ? "Processing..." : "Approve"}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Reject Modal */}
            <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}>
                    <TouchableOpacity style={styles.modalBackdropTouchable} activeOpacity={1} onPress={() => { setShowRejectModal(false); setNewRejectionReason(""); setCustomReason(""); setIsDropdownOpen(false); }} />
                    <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <View style={[styles.modalIconContainer, { backgroundColor: "#FFEBEE" }]}>
                                <Ionicons name="close-circle" size={32} color="#F44336" />
                            </View>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Document</Text>
                            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                                Please provide a reason for rejecting this document
                            </Text>
                        </View>
                        
                        {/* Dropdown Trigger */}
                        <TouchableOpacity 
                            style={[
                                styles.dropdownTrigger, 
                                { 
                                    borderColor: colors.border, 
                                    backgroundColor: isDark ? colors.surface : "#F8F9FA" 
                                }
                            ]}
                            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <Text style={[styles.dropdownTriggerText, { color: newRejectionReason ? colors.text : colors.textSecondary }]}>
                                {newRejectionReason || "Select Rejection Reason"}
                            </Text>
                            <Ionicons name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
                        </TouchableOpacity>

                        {/* Dropdown Options */}
                        {isDropdownOpen && (
                            <View style={[styles.dropdownOptionsContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                                {rejectionOptions.map((option, index) => (
                                    <TouchableOpacity 
                                        key={index}
                                        style={[
                                            styles.dropdownOption,
                                            newRejectionReason === option && { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6" },
                                            index === rejectionOptions.length - 1 && { borderBottomWidth: 0 }
                                        ]}
                                        onPress={() => {
                                            setNewRejectionReason(option);
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        <Text style={[styles.dropdownOptionText, { color: colors.text }]}>{option}</Text>
                                        {newRejectionReason === option && (
                                            <Ionicons name="checkmark" size={18} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Custom Reason Input if 'Other' is selected */}
                        {newRejectionReason === "Other" && (
                            <TextInput
                                style={[styles.modalInput, { marginTop: 4, color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.surface : "#F8F9FA" }]}
                                multiline
                                numberOfLines={3}
                                placeholder="Enter custom rejection reason..."
                                placeholderTextColor={colors.textSecondary}
                                value={customReason}
                                onChangeText={setCustomReason}
                            />
                        )}

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel, { backgroundColor: isDark ? colors.border : "#F3F4F6" }]} onPress={() => { setShowRejectModal(false); setNewRejectionReason(""); setCustomReason(""); setIsDropdownOpen(false); }}>
                                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalReject, submitting && { opacity: 0.7 }]} disabled={submitting} onPress={handleReject}>
                                <Text style={styles.modalRejectText}>{submitting ? "Submitting..." : "Reject Document"}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    downloadIconBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
    },
    docHeaderPanel: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        zIndex: 10,
    },
    docHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    docHeaderInfo: {
        flex: 1,
        justifyContent: "center",
        gap: 6,
    },
    fileName: {
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: -0.2,
    },
    badgesRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 0.3,
    },
    statusBannerWrapper: {
        marginTop: 16,
    },
    statusBanner: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    statusText: {
        fontSize: 14,
        fontWeight: "600",
        flex: 1,
    },
    previewSection: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    documentCard: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    stateContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 30,
        gap: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: "dashed",
    },
    errorIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#FFEBEE",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    genericIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    stateTitle: {
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
    },
    stateSub: {
        fontSize: 15,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 10,
    },
    primaryActionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 14,
        marginTop: 8,
        gap: 8,
    },
    primaryActionText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    imageViewer: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    pdfViewer: {
        flex: 1,
        width: "100%",
        backgroundColor: "transparent",
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    footer: {
        flexDirection: "row",
        padding: 20,
        paddingTop: 16,
        gap: 12,
        borderTopWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 10,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    approveBtn: { backgroundColor: "#10B981" },
    rejectBtn: { backgroundColor: "#EF4444" },
    actionBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    modalBackdropTouchable: { ...StyleSheet.absoluteFillObject },
    modalCard: {
        width: "100%",
        maxWidth: 400,
        borderRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: { alignItems: "center", marginBottom: 20 },
    modalIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
    modalSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
    modalInput: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        minHeight: 120,
        textAlignVertical: "top",
        fontSize: 15,
        marginBottom: 20,
    },
    modalActions: { flexDirection: "row", gap: 12 },
    modalBtn: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    modalCancel: { backgroundColor: "#F3F4F6" },
    modalReject: { backgroundColor: "#EF4444" },
    modalCancelText: { fontSize: 15, fontWeight: "700" },
    modalRejectText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    dropdownTrigger: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        marginBottom: 12,
    },
    dropdownTriggerText: {
        fontSize: 15,
        fontWeight: "500",
    },
    dropdownOptionsContainer: {
        borderWidth: 1,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 16,
    },
    dropdownOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(0,0,0,0.08)",
    },
    dropdownOptionText: {
        fontSize: 15,
        fontWeight: "500",
    },
});
