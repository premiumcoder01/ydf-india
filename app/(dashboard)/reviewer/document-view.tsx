import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Pdf from "react-native-pdf";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

export default function DocumentViewScreen() {
    const { id, title, fileName } = useLocalSearchParams();
    const { colors, isDark } = useTheme();
    const inset = useSafeAreaInsets();

    // In a real app, this would fetch the actual URL based on ID
    // For demo, we'll try to determine type from filename
    const isPdf = (fileName as string)?.toLowerCase().endsWith(".pdf");
    const isImage = (fileName as string)?.match(/\.(jpg|jpeg|png)$/i);

    const [loading, setLoading] = useState(true);

    // Fallback cleanup
    React.useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    // Mock source - in production this comes from backend
    // Use a reliable PDF sample that rarely fails
    const pdfSource = { uri: "https://pdfobject.com/pdf/sample.pdf", cache: true };
    // Use a reliable placeholder image service
    const imageSource = { uri: "https://picsum.photos/600/800" };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ReviewerHeader
                title={title as string || "Document View"}
                subtitle={fileName as string}
                showBackButton={true}
                rightElement={
                    <TouchableOpacity style={styles.downloadBtn}>
                        <Ionicons name="download-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                }
            />

            <View style={styles.content}>
                {isPdf ? (
                    <Pdf
                        trustAllCerts={false}
                        source={pdfSource}
                        onLoadComplete={(numberOfPages, filePath) => {
                            setLoading(false);
                        }}
                        onPageChanged={(page, numberOfPages) => {
                            console.log(`Current page: ${page}`);
                        }}
                        onError={(error) => {
                            console.log(error);
                            setLoading(false);
                        }}
                        onPressLink={(uri) => {
                            console.log(`Link pressed: ${uri}`);
                        }}
                        style={styles.pdf}
                    />
                ) : isImage ? (
                    <Image
                        source={imageSource}
                        style={styles.image}
                        resizeMode="contain"
                        onLoadEnd={() => setLoading(false)}
                    />
                ) : (
                    <View style={styles.placeholder}>
                        <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
                        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                            {fileName?.toString().split('.').pop()?.toUpperCase()} File
                        </Text>
                        <Text style={[styles.placeholderSub, { color: colors.textSecondary }]}>
                            Preview not available for this file type
                        </Text>
                    </View>
                )}

                {loading && (isPdf || isImage) && (
                    <View style={[styles.loader, { backgroundColor: colors.background }]}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Document...</Text>
                    </View>
                )}
            </View>

            {/* Bottom Actions */}
            <View style={[styles.footer, { paddingBottom: inset.bottom || 16, backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? colors.border : "#F3F4F6" }]}>
                    <Ionicons name="create-outline" size={20} color={colors.text} />
                    <Text style={[styles.actionBtnText, { color: colors.text }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={[styles.actionBtnText, { color: "#fff" }]}>Verify</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
    },
    downloadBtn: {
        padding: 8,
    },
    pdf: {
        flex: 1,
        width: Dimensions.get("window").width,
        height: Dimensions.get("window").height,
        backgroundColor: "#F3F4F6",
    },
    image: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    placeholder: {
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    placeholderText: {
        fontSize: 20,
        fontWeight: "700",
    },
    placeholderSub: {
        fontSize: 14,
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: "500",
    },
    footer: {
        flexDirection: "row",
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
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
    actionBtnText: {
        fontSize: 16,
        fontWeight: "600",
    }
});
