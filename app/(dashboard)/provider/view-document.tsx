import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function ViewDocumentScreen() {
    const { isDark, colors } = useTheme();
    const { title, type } = useLocalSearchParams<{ title: string; type: string }>();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ReviewerHeader title="View Document" subtitle={title || "Document Details"} />

            <View style={styles.content}>
                <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.1)" : "#eef2ff" }]}>
                        <Ionicons
                            name={type === "image" ? "image" : type === "pdf" ? "document-text" : "document"}
                            size={64}
                            color={colors.primary}
                        />
                    </View>
                    <Text style={[styles.docTitle, { color: colors.text }]}>{title || "Document"}</Text>
                    <Text style={[styles.docType, { color: colors.textSecondary }]}>
                        {type ? type.toUpperCase() : "FILE"}
                    </Text>
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.infoRow}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>This is a preview of the uploaded document.</Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        paddingTop: 40,
    },
    previewCard: {
        width: '100%',
        aspectRatio: 0.8,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    docTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    docType: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 1,
    },
    infoCard: {
        width: '100%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    infoText: {
        fontSize: 14,
        flex: 1,
        lineHeight: 20,
    }
});
