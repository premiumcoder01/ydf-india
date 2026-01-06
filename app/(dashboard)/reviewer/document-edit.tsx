import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
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

export default function ReviewerDocumentEditScreen() {
    const { isDark, colors } = useTheme();
    const inset = useSafeAreaInsets();
    const params = useLocalSearchParams();

    // Static initial data simulating a document being edited
    const [docDetails, setDocDetails] = useState({
        title: (params.title as string) || "College ID",
        type: "Identification",
        status: (params.status as string) || "pending", // verified, rejected, pending
        comments: "Please ensure the ID number is clearly visible.",
    });

    const handleSave = () => {
        Alert.alert("Success", "Document details updated successfully", [
            { text: "OK", onPress: () => router.back() },
        ]);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ReviewerHeader
                title="Edit Document"
                subtitle="Update document details and status"
                showBackButton
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={[styles.content, { paddingBottom: 180 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Document Preview Snippet */}
                    <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.previewIcon, { backgroundColor: isDark ? colors.surface : "#E3F2FD" }]}>
                            <Ionicons name="document-text" size={32} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.previewTitle, { color: colors.text }]}>{docDetails.title}</Text>
                            <Text style={[styles.previewSub, { color: colors.textSecondary }]}>college_id.pdf • 2.4 MB</Text>
                        </View>
                    </View>

                    {/* Edit Form */}
                    <View style={[styles.formSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Document Details</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Document Name</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.surface : "#fff" }]}
                                value={docDetails.title}
                                onChangeText={(text) => setDocDetails({ ...docDetails, title: text })}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Category / Type</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.surface : "#fff" }]}
                                value={docDetails.type}
                                onChangeText={(text) => setDocDetails({ ...docDetails, type: text })}
                            />
                        </View>
                    </View>

                    {/* Status Section */}
                    <View style={[styles.formSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Verification Status</Text>

                        <View style={styles.statusRow}>
                            {(["verified", "pending", "rejected"] as const).map((status) => (
                                <TouchableOpacity
                                    key={status}
                                    style={[
                                        styles.statusBtn,
                                        {
                                            borderColor: docDetails.status === status ? getStatusColor(status) : colors.border,
                                            backgroundColor: docDetails.status === status ? getStatusBg(status, isDark) : (isDark ? colors.surface : "#fff")
                                        }
                                    ]}
                                    onPress={() => setDocDetails({ ...docDetails, status })}
                                >
                                    <Ionicons
                                        name={docDetails.status === status ? "radio-button-on" : "radio-button-off"}
                                        size={18}
                                        color={docDetails.status === status ? getStatusColor(status) : colors.textSecondary}
                                    />
                                    <Text style={[
                                        styles.statusText,
                                        {
                                            color: docDetails.status === status ? getStatusColor(status) : colors.textSecondary,
                                            fontWeight: docDetails.status === status ? "700" : "500"
                                        }
                                    ]}>
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Comments Section */}
                    <View style={[styles.formSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Reviewer Notes</Text>
                        <View style={[styles.textareaContainer, { borderColor: colors.border, backgroundColor: isDark ? colors.surface : "#fff" }]}>
                            <TextInput
                                style={[styles.textarea, { color: colors.text }]}
                                multiline
                                numberOfLines={4}
                                value={docDetails.comments}
                                onChangeText={(text) => setDocDetails({ ...docDetails, comments: text })}
                                placeholder="Add internal notes or feedback for the applicant..."
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer Actions */}
            <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: inset.bottom || 16 }]}>
                <TouchableOpacity
                    style={[styles.footerBtn, styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => router.back()}
                >
                    <Text style={[styles.footerBtnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.footerBtn, styles.saveBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSave}
                >
                    <Text style={[styles.footerBtnText, { color: "#fff" }]}>Save Changes</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function getStatusColor(status: string) {
    switch (status) {
        case "verified": return "#4CAF50";
        case "rejected": return "#F44336";
        default: return "#FF9800";
    }
}

function getStatusBg(status: string, isDark: boolean) {
    const opacity = isDark ? 0.2 : 0.1;
    switch (status) {
        case "verified": return `rgba(76, 175, 80, ${opacity})`;
        case "rejected": return `rgba(244, 67, 54, ${opacity})`;
        default: return `rgba(255, 152, 0, ${opacity})`;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        gap: 16,
    },
    previewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    previewIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 2,
    },
    previewSub: {
        fontSize: 13,
    },
    formSection: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 4,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        fontSize: 15,
    },
    statusRow: {
        flexDirection: 'row',
        gap: 10,
    },
    statusBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
    },
    statusText: {
        fontSize: 13,
    },
    textareaContainer: {
        borderWidth: 1,
        borderRadius: 12,
        minHeight: 120,
        padding: 12,
    },
    textarea: {
        fontSize: 15,
        height: '100%',
        textAlignVertical: 'top',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: 12,
    },
    footerBtn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: {
        borderWidth: 1,
    },
    saveBtn: {

    },
    footerBtnText: {
        fontSize: 15,
        fontWeight: "700",
    }
});
