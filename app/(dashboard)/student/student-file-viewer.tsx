import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import RNBlobUtil from "react-native-blob-util";
import Pdf from "react-native-pdf";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type ViewerState = "idle" | "downloading" | "ready" | "error";

// ─────────────────────────────────────────────────────────────────────────────
// Custom Header — matches the screenshot exactly:
//  Row 1: [ ← back ]  [ filename (truncated) ]  [ share | placeholder ]
//  Row 2: [ type-icon   Type · filename ]
// ─────────────────────────────────────────────────────────────────────────────
function CustomHeader({
    filename,
    isDark,
    colors,
    isImage,
    isPDF,
    state,
    onBack,
    onShare,
}: {
    filename: string;
    isDark: boolean;
    colors: any;
    isImage: boolean;
    isPDF: boolean;
    state: ViewerState;
    onBack: () => void;
    onShare: () => void;
}) {
    const insets = useSafeAreaInsets();
    const isReady = state === "ready";

    const typeLabel = isImage ? "Image" : isPDF ? "PDF Document" : "Document";
    const typeIcon: any = isImage
        ? "image-outline"
        : isPDF
            ? "document-text-outline"
            : "document-outline";

    return (
        <View
            style={[
                styles.customHeader,
                {
                    paddingTop: insets.top,
                    backgroundColor: isDark ? "#0f0f0f" : "#FFFFFF",
                    borderBottomColor: isDark ? "#222" : "#EDEDED",
                },
            ]}
        >
            {/* ── Title row — back + share only, no filename text ── */}
            <View style={styles.headerTitleRow}>
                {/* Back */}
                <TouchableOpacity
                    onPress={onBack}
                    style={styles.headerIconBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={isDark ? "#FFFFFF" : "#111111"}
                    />
                </TouchableOpacity>

                {/* Spacer — pushes share icon to the right */}
                <View style={{ flex: 1 }} />

                {/* Share — shown once file is ready, otherwise invisible placeholder */}
                {isReady ? (
                    <TouchableOpacity
                        onPress={onShare}
                        style={styles.headerIconBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name="share-outline"
                            size={22}
                            color={isDark ? "#FFFFFF" : "#111111"}
                        />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerIconPlaceholder} />
                )}
            </View>

            {/* ── Info strip — type + filename ── */}
            <View
                style={[
                    styles.headerInfoStrip,
                    { borderTopColor: isDark ? "#1e1e1e" : "#F0F0F0" },
                ]}
            >
                <Ionicons name={typeIcon} size={14} color={colors.primary} />
                <Text
                    style={[styles.headerInfoText, { color: isDark ? "#888" : "#888" }]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                >
                    {typeLabel} · {filename}
                </Text>
            </View>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentFileViewer() {
    const { isDark, colors } = useTheme();
    const params = useLocalSearchParams();

    const fileurl = params.fileurl as string;
    const filename = params.filename as string;
    const mimetype = params.mimetype as string;

    const [state, setState] = useState<ViewerState>("idle");
    const [progress, setProgress] = useState(0);
    const [localPath, setLocalPath] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [imageZoomed, setImageZoomed] = useState(false);

    const taskRef = useRef<any>(null);

    const isImage = mimetype?.startsWith("image/");
    const isPDF = mimetype === "application/pdf";

    // Helper: deterministic temp path based on filename
    const getTempPath = () => {
        const safeName =
            filename?.replace(/[^a-zA-Z0-9._-]/g, "_") ||
            `document_${Date.now()}`;
        return `${RNBlobUtil.fs.dirs.CacheDir}/${safeName}`;
    };

    useEffect(() => {
        if (!fileurl) {
            setError("No file URL provided.");
            setState("error");
            return;
        }
        const sanitizedUrl = fileurl.replace(/&amp;/g, "&");
        downloadFile(sanitizedUrl);

        return () => {
            if (taskRef.current) taskRef.current.cancel();
        };
    }, [fileurl]);

    const downloadFile = async (currentUrl: string) => {
        setState("downloading");
        setProgress(0);
        setError(null);

        const destPath = getTempPath();

        try {
            // Serve from cache if already downloaded
            const exists = await RNBlobUtil.fs.exists(destPath);
            if (exists) {
                setLocalPath(destPath);
                setState("ready");
                return;
            }

            if (Platform.OS === "android") {
                // ─── Android: use JS fetch to avoid the
                //     "Use of own trust manager but none defined" SSL bug
                //     in react-native-blob-util on Android.
                const response = await fetch(currentUrl);
                if (!response.ok) {
                    throw new Error(`Server responded with status ${response.status}`);
                }

                // Stream via blob → base64 → write with RNBlobUtil
                const blob = await response.blob();
                const reader = new FileReader();
                const base64Data: string = await new Promise((resolve, reject) => {
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        // strip the "data:...;base64," prefix
                        resolve(result.split(",")[1]);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });

                await RNBlobUtil.fs.writeFile(destPath, base64Data, "base64");
                setLocalPath(destPath);
                setState("ready");
            } else {
                // ─── iOS: use RNBlobUtil native fetch (supports progress + trusty)
                taskRef.current = RNBlobUtil.config({
                    path: destPath,
                    trusty: true, // handles self-signed certs on iOS
                })
                    .fetch("GET", currentUrl)
                    .progress({ count: 10 }, (received, total) => {
                        if (total > 0) setProgress(Math.round((received / total) * 100));
                    });

                const res = await taskRef.current;
                const status = res.info().status;

                if (status === 200) {
                    setLocalPath(destPath);
                    setState("ready");
                } else {
                    throw new Error(`Server responded with status ${status}`);
                }
            }
        } catch (err: any) {
            if (err?.message?.includes("cancel")) return; // navigated away
            console.error("File download error:", err);
            setError(err?.message || "Failed to download the file.");
            setState("error");
            try {
                const exists = await RNBlobUtil.fs.exists(destPath);
                if (exists) await RNBlobUtil.fs.unlink(destPath);
            } catch (_) { }
        }
    };

    const handleShare = async () => {
        if (!localPath) return;
        try {
            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
                Alert.alert("Sharing not available", "Sharing is not supported on this device.");
                return;
            }
            await Sharing.shareAsync(`file://${localPath}`, {
                mimeType: mimetype,
                dialogTitle: filename,
                UTI: isPDF ? "com.adobe.pdf" : "public.image",
            });
        } catch {
            Alert.alert("Error", "Failed to share the file.");
        }
    };

    const handleRetry = () => {
        const destPath = getTempPath();
        RNBlobUtil.fs
            .exists(destPath)
            .then((exists) => { if (exists) RNBlobUtil.fs.unlink(destPath).catch(() => { }); });
        
        const sanitizedUrl = fileurl.replace(/&amp;/g, "&");
        downloadFile(sanitizedUrl);
    };

    // ─── Render: Downloading ────────────────────────────────────────────────────
    const renderDownloading = () => (
        <View style={styles.centerContainer}>
            <View style={[styles.stateCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF" }]}>
                <View style={[styles.stateIconRing, { borderColor: colors.primary + "30" }]}>
                    <View style={[styles.stateIconInner, { backgroundColor: colors.primary + "15" }]}>
                        <Ionicons name="cloud-download-outline" size={36} color={colors.primary} />
                    </View>
                </View>

                <Text style={[styles.stateTitle, { color: colors.text }]}>Downloading File</Text>
                <Text style={[styles.stateSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                    {filename}
                </Text>

                <View style={[styles.progressBg, { backgroundColor: isDark ? "#333" : "#F3F4F6" }]}>
                    <View
                        style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]}
                    />
                </View>

                <Text style={[styles.progressLabel, { color: colors.primary }]}>
                    {progress > 0 ? `${progress}%` : "Connecting…"}
                </Text>
            </View>
        </View>
    );

    // ─── Render: Error ──────────────────────────────────────────────────────────
    const renderError = () => (
        <View style={styles.centerContainer}>
            <View style={[styles.stateCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF" }]}>
                <View style={[styles.stateIconRing, { borderColor: "#FCA5A530" }]}>
                    <View style={[styles.stateIconInner, { backgroundColor: "#FEE2E2" }]}>
                        <Ionicons name="cloud-offline-outline" size={36} color="#EF4444" />
                    </View>
                </View>
                <Text style={[styles.stateTitle, { color: colors.text }]}>Download Failed</Text>
                <Text style={[styles.errorMsg, { color: colors.textSecondary }]}>{error}</Text>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={handleRetry}
                    activeOpacity={0.8}
                >
                    <Ionicons name="refresh" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // ─── Render: Image ──────────────────────────────────────────────────────────
    const renderImage = () => (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.imageScrollContent}
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsVerticalScrollIndicator={false}
            pinchGestureEnabled
        >
            <TouchableOpacity activeOpacity={1} onPress={() => setImageZoomed(!imageZoomed)}>
                <Image
                    source={{ uri: `file://${localPath}` }}
                    style={[
                        styles.fullImage,
                        imageZoomed && { width: SCREEN_WIDTH * 2, height: SCREEN_HEIGHT * 1.5 },
                    ]}
                    contentFit="contain"
                    transition={300}
                />
            </TouchableOpacity>
            <Text style={[styles.imageHint, { color: colors.textSecondary }]}>
                Pinch to zoom · Tap to {imageZoomed ? "fit" : "expand"}
            </Text>
        </ScrollView>
    );

    // ─── Render: PDF ────────────────────────────────────────────────────────────
    const renderPDF = () => (
        <View style={{ flex: 1 }}>
            <Pdf
                source={{ uri: `file://${localPath}`, cache: true }}
                style={[styles.pdf, { backgroundColor: isDark ? "#0f0f0f" : "#F1F3F5" }]}
                trustAllCerts={true}
                onError={(err) => {
                    console.error("PDF error:", err);
                    setError("Could not render PDF. Try opening with another app.");
                    setState("error");
                }}
                onLoadComplete={(pages) => console.log(`PDF: ${pages} pages`)}
                enablePaging
                horizontal={false}
                fitPolicy={0}
                spacing={8}
                renderActivityIndicator={() => (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.pdfLoadingText, { color: colors.textSecondary }]}>
                            Rendering PDF…
                        </Text>
                    </View>
                )}
            />
        </View>
    );

    // ─── Render: Generic / Unsupported ─────────────────────────────────────────
    const renderGeneric = () => (
        <View style={styles.centerContainer}>
            <View style={[styles.stateCard, { backgroundColor: isDark ? "#1e1e1e" : "#FFF" }]}>
                <View style={[styles.stateIconRing, { borderColor: colors.primary + "30" }]}>
                    <View style={[styles.stateIconInner, { backgroundColor: colors.primary + "15" }]}>
                        <Ionicons name="document-outline" size={36} color={colors.primary} />
                    </View>
                </View>
                <Text style={[styles.stateTitle, { color: colors.text }]}>File Ready</Text>
                <Text style={[styles.stateSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                    {filename}
                </Text>
                <Text style={[styles.genericNote, { color: colors.textSecondary }]}>
                    This file type cannot be previewed in-app. Use the button below to open it with another app.
                </Text>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={handleShare}
                    activeOpacity={0.8}
                >
                    <Ionicons name="share-outline" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Open With…</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderContent = () => {
        if (state === "downloading" || state === "idle") return renderDownloading();
        if (state === "error") return renderError();
        if (state === "ready") {
            if (isImage) return renderImage();
            if (isPDF) return renderPDF();
            return renderGeneric();
        }
        return null;
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#0f0f0f" : "#FAFAFA" }]}>
            <StatusBar
                barStyle={isDark ? "light-content" : "dark-content"}
                backgroundColor={isDark ? "#0f0f0f" : "#FFFFFF"}
            />

            <CustomHeader
                filename={filename}
                isDark={isDark}
                colors={colors}
                isImage={isImage}
                isPDF={isPDF}
                state={state}
                onBack={() => router.back()}
                onShare={handleShare}
            />

            {renderContent()}
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    // ── Custom header ────────────────────────────────────────────────────────────
    customHeader: {
        borderBottomWidth: 1,
    },
    headerTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 6,
        paddingVertical: 6,
        gap: 2,
    },
    headerIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    headerIconPlaceholder: {
        width: 44,
        flexShrink: 0,
    },
    headerFilename: {
        flex: 1,
        fontSize: 17,
        fontWeight: "700",
        letterSpacing: -0.3,
    },
    headerInfoStrip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 20,
        paddingVertical: 9,
        borderTopWidth: 1,
    },
    headerInfoText: {
        fontSize: 13,
        fontWeight: "400",
        flex: 1,
    },

    // ── State cards (download / error / generic) ─────────────────────────────────
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    stateCard: {
        width: "100%",
        maxWidth: 340,
        borderRadius: 24,
        padding: 32,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    stateIconRing: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 2,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    stateIconInner: {
        width: 68,
        height: 68,
        borderRadius: 34,
        justifyContent: "center",
        alignItems: "center",
    },
    stateTitle: {
        fontSize: 20,
        fontWeight: "800",
        marginBottom: 8,
        textAlign: "center",
        letterSpacing: -0.3,
    },
    stateSubtitle: {
        fontSize: 13,
        fontWeight: "500",
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 20,
    },
    errorMsg: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 24,
    },
    genericNote: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 24,
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
    },
    actionBtnText: {
        color: "#FFF",
        fontSize: 15,
        fontWeight: "700",
    },

    // ── Progress bar ─────────────────────────────────────────────────────────────
    progressBg: {
        width: "100%",
        height: 8,
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 12,
    },
    progressFill: {
        height: "100%",
        borderRadius: 4,
    },
    progressLabel: {
        fontSize: 16,
        fontWeight: "800",
    },

    // ── Image viewer ─────────────────────────────────────────────────────────────
    imageScrollContent: {
        minHeight: SCREEN_HEIGHT - 130,
        justifyContent: "center",
        alignItems: "center",
        padding: 12,
    },
    fullImage: {
        width: SCREEN_WIDTH - 24,
        height: SCREEN_HEIGHT - 230,
        borderRadius: 12,
    },
    imageHint: {
        fontSize: 12,
        marginTop: 16,
        textAlign: "center",
        fontWeight: "500",
    },

    // ── PDF viewer ───────────────────────────────────────────────────────────────
    pdf: {
        flex: 1,
        width: SCREEN_WIDTH,
    },
    pdfLoadingText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: "500",
    },
});
