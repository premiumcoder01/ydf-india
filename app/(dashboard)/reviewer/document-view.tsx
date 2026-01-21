import { useTheme } from "@/context/ThemeContext";
import { verifyDocument } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import { ReviewerHeader } from "../../../components";

export default function DocumentViewScreen() {
    const params = useLocalSearchParams();
    const { id, title, fileName, filesize, mimetype, url, verified, rejectionReason } = params;
    const { colors, isDark } = useTheme();
    const inset = useSafeAreaInsets();

    // Check if document is already verified or rejected
    const isVerified = verified === "true";
    const isRejected = rejectionReason && rejectionReason.toString().trim() !== "";
    const isProcessed = isVerified || isRejected;

    const [loading, setLoading] = useState(true);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [newRejectionReason, setNewRejectionReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const formatFileSize = (bytes: number) => {
        if (!bytes) return "Unknown size";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const handleApprove = async () => {
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

                            // Get token from AsyncStorage
                            const authDataStr = await AsyncStorage.getItem("authData");
                            const authData = authDataStr ? JSON.parse(authDataStr) : null;
                            const token = authData?.token;

                            if (!token) {
                                Alert.alert("Error", "Authentication token not found");
                                setSubmitting(false);
                                return;
                            }

                            if (!id) {
                                Alert.alert("Error", "Document ID not found");
                                setSubmitting(false);
                                return;
                            }

                            // Call API to verify document
                            const response = await verifyDocument(token, Number(id), "verify");

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
        if (!newRejectionReason.trim()) {
            Alert.alert("Error", "Please provide a reason for rejection");
            return;
        }

        try {
            setSubmitting(true);

            // Get token from AsyncStorage
            const authDataStr = await AsyncStorage.getItem("authData");
            const authData = authDataStr ? JSON.parse(authDataStr) : null;
            const token = authData?.token;

            if (!token) {
                Alert.alert("Error", "Authentication token not found");
                setSubmitting(false);
                return;
            }

            if (!id) {
                Alert.alert("Error", "Document ID not found");
                setSubmitting(false);
                return;
            }

            // Call API to reject document with reason
            const response = await verifyDocument(token, Number(id), "reject", newRejectionReason);

            setSubmitting(false);
            setShowRejectModal(false);
            setNewRejectionReason("");

            if (response.success) {
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
            Alert.alert("Error", "Download URL not available");
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ReviewerHeader
                title="Document Review"
                subtitle={mimetype?.toString().split('/')[1]?.toUpperCase() || 'Document'}
                showBackButton={true}
                rightElement={
                    <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
                        <Ionicons name="download-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                }
            />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
                {/* Document Information Card */}
                <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {/* File Name and Type */}
                    <View style={styles.fileInfoSection}>
                        <View style={[styles.fileIconLarge, { backgroundColor: isDark ? colors.surface : "#E3F2FD" }]}>
                            <Ionicons
                                name={
                                    mimetype?.toString().includes("pdf") ? "document-text" :
                                        mimetype?.toString().includes("image") ? "image" :
                                            "document"
                                }
                                size={32}
                                color={colors.primary}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <Text style={[styles.fileName, { color: colors.text, flex: 1 }]} numberOfLines={2}>
                                    {fileName?.toString() || "Unknown File"}
                                </Text>
                                {isVerified && (
                                    <View style={styles.verifiedBadge}>
                                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                        <Text style={styles.verifiedText}>Verified</Text>
                                    </View>
                                )}
                                {isRejected && (
                                    <View style={styles.rejectedBadge}>
                                        <Ionicons name="close-circle" size={16} color="#F44336" />
                                        <Text style={styles.rejectedText}>Rejected</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.fileMetaRow}>
                                <View style={[styles.typeBadge, { backgroundColor: isDark ? colors.surface : "#E3F2FD" }]}>
                                    <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
                                        {mimetype?.toString().split('/')[1]?.toUpperCase() || 'FILE'}
                                    </Text>
                                </View>
                                <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>
                                    {formatFileSize(Number(filesize))}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Document Details */}
                    <View style={styles.detailsSection}>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Document Type</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>
                                {title?.toString() || "Unknown"}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Document ID</Text>
                            <View style={[styles.idBadge, { backgroundColor: isDark ? colors.surface : "#F3F4F6" }]}>
                                <Text style={[styles.idBadgeText, { color: colors.text }]}>
                                    #{id?.toString()}
                                </Text>
                            </View>
                        </View>

                        {/* Show rejection reason if document is rejected */}
                        {isRejected && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Rejection Reason</Text>
                                <View style={[styles.rejectionReasonBox, { backgroundColor: isDark ? "#3D1E1E" : "#FFEBEE", borderColor: "#F44336" }]}>
                                    <Ionicons name="alert-circle-outline" size={16} color="#F44336" />
                                    <Text style={[styles.rejectionReasonText, { color: isDark ? "#FF8A80" : "#C62828" }]}>
                                        {rejectionReason?.toString()}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Document Preview */}
                <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.previewHeader}>
                        <Ionicons name="eye-outline" size={20} color={colors.text} />
                        <Text style={[styles.previewTitle, { color: colors.text }]}>Document Preview</Text>
                    </View>


                    <View style={[styles.previewContainer, { backgroundColor: isDark ? "#1a1a1a" : "#F3F4F6" }]}>
                        {url ? (
                            <WebView
                                source={{ uri: url.toString() }}
                                style={styles.webview}
                                onLoadStart={() => setLoading(true)}
                                onLoadEnd={() => setLoading(false)}
                                onError={(syntheticEvent) => {
                                    const { nativeEvent } = syntheticEvent;
                                    console.log('WebView error: ', nativeEvent);
                                    setLoading(false);
                                }}
                                startInLoadingState={true}
                                scalesPageToFit={true}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                            />
                        ) : (
                            <View style={styles.placeholder}>
                                <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
                                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                                    {fileName?.toString().split('.').pop()?.toUpperCase()} File
                                </Text>
                                <Text style={[styles.placeholderSub, { color: colors.textSecondary }]}>
                                    Document URL not available
                                </Text>
                                <TouchableOpacity
                                    style={[styles.downloadPreviewBtn, { backgroundColor: colors.primary }]}
                                    onPress={handleDownload}
                                >
                                    <Ionicons name="download-outline" size={20} color="#fff" />
                                    <Text style={styles.downloadPreviewText}>Download to View</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {loading && url && (
                            <View style={[styles.loader, { backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.9)" }]}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={[styles.loadingText, { color: colors.text }]}>Loading Document...</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Actions - Only show if document is not verified or rejected */}
            {!isProcessed && (
                <View style={[styles.footer, { paddingBottom: inset.bottom + 8, backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn, submitting && { opacity: 0.7 }]}
                        disabled={submitting}
                        onPress={() => setShowRejectModal(true)}
                    >
                        <Ionicons name="close-circle-outline" size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn, submitting && { opacity: 0.7 }]}
                        disabled={submitting}
                        onPress={handleApprove}
                    >
                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>
                            {submitting ? "Processing..." : "Approve"}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Reject Modal */}
            <Modal
                visible={showRejectModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRejectModal(false)}
            >
                <View style={styles.modalBackdrop}>
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

                        <TextInput
                            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.surface : "#F8F9FA" }]}
                            multiline
                            numberOfLines={4}
                            placeholder="Enter rejection reason..."
                            placeholderTextColor={colors.textSecondary}
                            value={newRejectionReason}
                            onChangeText={setNewRejectionReason}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalCancel, { backgroundColor: isDark ? colors.border : "#F3F4F6" }]}
                                onPress={() => {
                                    setShowRejectModal(false);
                                    setNewRejectionReason("");
                                }}
                            >
                                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalReject, submitting && { opacity: 0.7 }]}
                                disabled={submitting}
                                onPress={handleReject}
                            >
                                <Text style={styles.modalRejectText}>
                                    {submitting ? "Submitting..." : "Reject Document"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    downloadBtn: {
        padding: 8,
    },
    infoCard: {
        margin: 16,
        marginBottom: 8,
        borderRadius: 16,
        borderWidth: 1,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    fileInfoSection: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    fileIconLarge: {
        width: 64,
        height: 64,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    fileName: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 8,
    },
    fileMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    fileMeta: {
        fontSize: 13,
        fontWeight: "500",
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    typeBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    verifiedBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#E8F5E9",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    verifiedText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#4CAF50",
        letterSpacing: 0.3,
    },
    rejectedBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#FFEBEE",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    rejectedText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#F44336",
        letterSpacing: 0.3,
    },
    rejectionReasonBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    rejectionReasonText: {
        fontSize: 13,
        fontWeight: "600",
        flex: 1,
        lineHeight: 18,
    },
    divider: {
        height: 1,
        marginVertical: 16,
    },
    detailsSection: {
        gap: 12,
    },
    detailRow: {
        gap: 6,
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: "600",
        lineHeight: 20,
    },
    idBadge: {
        alignSelf: "flex-start",
        paddingVertical: 6,
        borderRadius: 8,
    },
    idBadgeText: {
        fontSize: 13,
        fontWeight: "700",
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    previewCard: {
        margin: 16,
        marginTop: 8,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        flex: 1,
    },
    previewHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: "700",
    },
    previewContainer: {
        borderRadius: 12,
        overflow: "hidden",
        minHeight: 400,
        flex: 1,
    },
    pdf: {
        flex: 1,
        width: "100%",
        minHeight: 400,
    },
    image: {
        flex: 1,
        width: "100%",
        minHeight: 400,
    },
    placeholder: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 40,
    },
    placeholderText: {
        fontSize: 18,
        fontWeight: "700",
    },
    placeholderSub: {
        fontSize: 14,
        textAlign: "center",
    },
    downloadPreviewBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginTop: 8,
    },
    downloadPreviewText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    webview: {
        flex: 1,
        width: "100%",
        minHeight: 400,
        backgroundColor: "transparent",
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: "600",
    },
    footer: {
        flexDirection: "row",
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    approveBtn: {
        backgroundColor: "#4CAF50",
    },
    rejectBtn: {
        backgroundColor: "#F44336",
    },
    actionBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    modalCard: {
        width: "100%",
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    modalHeader: {
        alignItems: "center",
        marginBottom: 20,
    },
    modalIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        minHeight: 120,
        textAlignVertical: "top",
        fontSize: 15,
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    modalCancel: {
        backgroundColor: "#F3F4F6",
    },
    modalReject: {
        backgroundColor: "#F44336",
    },
    modalCancelText: {
        fontSize: 15,
        fontWeight: "700",
    },
    modalRejectText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
    },
});
