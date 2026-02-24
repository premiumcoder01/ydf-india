import { AppHeader, Button } from "@/components";
import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import { API_CONFIG } from "@/utils/apiConfig";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function StudentUploadDocumentScreen() {
    const { isDark, colors } = useTheme();
    const params = useLocalSearchParams();
    const { cmid, label, mode } = params;
    const [file, setFile] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

    const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["application/pdf", "image/*"],
                multiple: false,
            });

            if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                // Check file size (10MB limit)
                const fileSizeInBytes = asset.size;
                const maxSizeInBytes = 10 * 1024 * 1024; // 10MB

                if (fileSizeInBytes && fileSizeInBytes > maxSizeInBytes) {
                    showToast("File size exceeds 10MB limit. Please choose a smaller file.", "error");
                    return;
                }
                setFile({
                    uri: asset.uri,
                    name: asset.name,
                    mimeType: asset.mimeType || "application/unknown",
                    size: asset.size || 0,
                });

            }
        } catch (err) {
            console.error("Error picking document:", err);
            showToast("Failed to pick document", "error");
        }
    };

    const handleUploadPress = () => {
        if (!file) {
            showToast("Please select a document first", "error");
            return;
        }

        Alert.alert(
            "Confirm Upload",
            `Are you sure you want to upload "${file.name}"?`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Confirm",
                    onPress: performUpload,
                },
            ]
        );
    };

    const performUpload = async () => {
        if (!file) {
            showToast("Please select a document first", "error");
            return;
        }
        setUploading(true);
        try {
            const authDataStr = await AsyncStorage.getItem("authData");
            const authData = authDataStr ? JSON.parse(authDataStr) : null;
            const token = authData?.token;
            if (!token) {
                Alert.alert("Error", "Authentication token not found. Please login again.");
                setUploading(false);
                return;
            }
            const uploadUrl = `${API_CONFIG.BASE_URL}local/mobileapi/upload_document.php?wstoken=${token}`;
            const formData = new FormData();
            formData.append('file', {
                uri: file.uri,
                name: file.name,
                type: file.mimeType,
            } as any);
            formData.append('mode', 'scheme');
            formData.append('cmid', cmid as any);

            console.log('Upload URL:', uploadUrl);
            console.log('Form Data:', JSON.stringify(formData));
            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });


            const result = await response.json();
            if (response.ok && (result.success || result.status === true || result[0]?.status === true)) {
                setFile(null);
                Alert.alert(
                    "Upload Successful",
                    "Your document has been uploaded successfully!",
                    [
                        {
                            text: "OK",
                            onPress: () => router.back(),
                        },
                    ]
                );

            } else {
                Alert.alert("Upload Failed", result.message || "Something went wrong during upload.");
            }
        } catch (error) {
            console.error("Upload Error:", error);
            showToast("Failed to upload file. Please try again.", "error");
        } finally {
            setUploading(false);
        }
    };


    const removeFile = () => {
        setFile(null);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? colors.background : "#fff"} />
            <AppHeader title="Upload Document" onBack={() => router.back()} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerContainer}>
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(76, 175, 80, 0.2)" : "rgba(76, 175, 80, 0.1)" }]}>
                        <Ionicons name="cloud-upload" size={40} color="#4CAF50" />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Upload Required Document</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Please upload the document for:
                    </Text>
                    <Text style={styles.docLabel}>{label || "Unknown Document"}</Text>
                </View>

                <View style={[styles.uploadCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
                    {!file ? (
                        <TouchableOpacity
                            style={[styles.uploadPlaceholder, { borderColor: isDark ? colors.border : "#eee" }]}
                            onPress={pickDocument}
                            activeOpacity={0.7}
                        >
                            <View style={styles.placeholderContent}>
                                <Ionicons name="document-text-outline" size={48} color={isDark ? colors.textSecondary : "#ccc"} />
                                <Text style={[styles.placeholderText, { color: colors.text }]}>Tap to select a file</Text>
                                <Text style={[styles.placeholderSubtext, { color: colors.textSecondary }]}>
                                    Supports PDF, JPG, PNG (Max 10MB)
                                </Text>
                            </View>
                            <View style={[styles.selectButton, { backgroundColor: isDark ? colors.surface : "#f0f0f0" }]}>
                                <Text style={[styles.selectButtonText, { color: colors.text }]}>Select File</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.filePreview}>
                            <View style={[styles.fileInfoRow, { backgroundColor: isDark ? colors.surface : "#f8f9fa" }]}>
                                <View style={[styles.fileIcon, { backgroundColor: isDark ? "rgba(76, 175, 80, 0.2)" : "rgba(76, 175, 80, 0.1)" }]}>
                                    <Ionicons name="document" size={24} color="#4CAF50" />
                                </View>
                                <View style={styles.fileDetails}>
                                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                                        {file.name}
                                    </Text>
                                    <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={removeFile}
                                    style={styles.removeButton}
                                    disabled={uploading}
                                >
                                    <Ionicons name="close-circle" size={24} color="#F44336" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.successMessage}>
                                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                <Text style={styles.successText}>File selected and ready to upload</Text>
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.actionContainer}>
                    <Button
                        title={uploading ? "Uploading..." : "Submit"}
                        onPress={handleUploadPress}
                        variant="primary"
                        disabled={!file || uploading}
                        style={[
                            styles.uploadButton,
                            !file && styles.disabledButton
                        ]}
                    />
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => router.back()}
                        disabled={uploading}
                    >
                        <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {uploading && (
                <View style={styles.loadingOverlay}>
                    <View style={[styles.loadingBox, { backgroundColor: colors.card }]}>
                        <ActivityIndicator size="large" color="#4CAF50" />
                        <Text style={[styles.loadingText, { color: colors.text }]}>Uploading document...</Text>
                    </View>
                </View>
            )}

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
    content: {
        padding: 24,
        flexGrow: 1,
    },
    headerContainer: {
        alignItems: "center",
        marginBottom: 32,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 8,
    },
    docLabel: {
        fontSize: 18,
        fontWeight: "600",
        color: "#4CAF50",
        textAlign: "center",
        paddingHorizontal: 20,
    },
    uploadCard: {
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 32,
        overflow: "hidden",
    },
    uploadPlaceholder: {
        padding: 40,
        alignItems: "center",
        borderWidth: 2,
        borderStyle: "dashed",
        borderRadius: 20,
        margin: 4,
    },
    placeholderContent: {
        alignItems: "center",
        marginBottom: 24,
    },
    placeholderText: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 12,
    },
    placeholderSubtext: {
        fontSize: 13,
        marginTop: 4,
    },
    selectButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    selectButtonText: {
        fontSize: 14,
        fontWeight: "700",
    },
    filePreview: {
        padding: 24,
    },
    fileInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    fileIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    fileDetails: {
        flex: 1,
    },
    fileName: {
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 4,
    },
    fileSize: {
        fontSize: 12,
    },
    removeButton: {
        padding: 8,
    },
    successMessage: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    successText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#4CAF50",
    },
    actionContainer: {
        gap: 16,
    },
    uploadButton: {
        backgroundColor: "#4CAF50",
        borderRadius: 14,
        paddingVertical: 16,
    },
    disabledButton: {
        opacity: 0.6,
    },
    cancelButton: {
        paddingVertical: 16,
        alignItems: "center",
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
    },
    loadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    loadingBox: {
        padding: 30,
        borderRadius: 16,
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: "600",
    },
});
