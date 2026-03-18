import { AppHeader, Button } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { API_CONFIG } from "@/utils/apiConfig";
import { getUserProfile } from "@/utils/api";
import { exchangeAuthorizationCodeForToken, loginWithDigiLocker, useDigiLockerWebView } from "@/utils/digilockerAuth";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
import Pdf from "react-native-pdf";
import { useSafeAreaInsets } from "react-native-safe-area-context";




type Document = {
  id: number;
  name: string; // The "Save as" name provided by user
  fileType: string;
  mimeType: string;
  uri: string;
  size: string;
  uploadDate: string;
};

type DigiLockerFileItem = {
  type: "file" | "dir";
  name: string;
  mime: string;
  uri: string;
  date?: string;
  size?: string | number;
  itemsCount?: string | number;
  issuer?: string;
  description?: string;
  id?: string;
  parent?: string;
};


export default function DocumentUploadScreen() {
  const { isDark, colors } = useTheme();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    mimeType: string;
    size: number;
  } | null>(null);
  const [saveAsName, setSaveAsName] = useState("");
  const [authorName, setAuthorName] = useState("Student Ydf");
  const inset = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [digilockerFiles, setDigilockerFiles] = useState<DigiLockerFileItem[]>([]);
  const [digilockerModalVisible, setDigilockerModalVisible] = useState(false);
  const [digilockerLoading, setDigilockerLoading] = useState(false);
  const [digilockerAccessToken, setDigilockerAccessToken] = useState<string | null>(null);
  const [digilockerHistory, setDigilockerHistory] = useState<{ id: string; name: string }[]>([]);
  const [downloadingUri, setDownloadingUri] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    uri: string;
    mime: string;
    name: string;
    isUploaded?: boolean;
  } | null>(null);
  const [savingPreview, setSavingPreview] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const { WebViewComponent, show: showWebView } = useDigiLockerWebView();

  const formatFileSize = (value?: string | number) => {
    if (value === undefined || value === null) return "—";
    const bytes = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(bytes)) return "—";
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  };

  const formatFileDate = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString();
  };

  const getMimeIcon = (mime?: string) => {
    if (mime?.startsWith("image/")) return "image-outline";
    if (mime === "application/pdf") return "document-text-outline";
    return "document-outline";
  };

  const getMimeColor = (mime?: string) => {
    if (mime?.startsWith("image/")) return "#7C4DFF";
    if (mime === "application/pdf") return "#E53935";
    return "#2196F3";
  };

  // Load Documents on focus
  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [])
  );

  // Removed local storage effect as we now sync with server

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const authDataStr = await AsyncStorage.getItem("authData");
      const authData = authDataStr ? JSON.parse(authDataStr) : null;
      const token = authData?.token;
      if (!token) {
        console.error("No token found");
        return;
      }

      // Load user profile for Author name
      getUserProfile(token).then((res) => {
        if (res.success && res.data) {
          const u = res.data.student || res.data.user || res.data;
          if (u.firstname && u.lastname) {
            setAuthorName(`${u.firstname} ${u.lastname}`);
          } else if (u.fullname) {
            setAuthorName(u.fullname);
          }
        }
      }).catch(err => console.error(err));
      const url = `${API_CONFIG.BASE_URL}webservice/rest/server.php?wsfunction=local_mobileapi_get_my_documents&moodlewsrestformat=json&wstoken=${token}&page=1&per_page=100`;
      console.log("Fetching documents from:", url);
      const response = await fetch(url);
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const mappedDocs: Document[] = result.data.map((item: any) => ({
          id: item.id,
          name: item.filename,
          fileType: item.mimetype && item.mimetype.includes('image') ? 'Image' : 'PDF', // Simple inference
          mimeType: item.mimetype || (item.mimetype && item.mimetype.includes('image') ? 'image/jpeg' : 'application/pdf'),
          uri: item.fileurl ? item.fileurl.replace(/&amp;/g, "&") : "",
          size: (item.filesize / 1024).toFixed(2) + ' KB', // Assuming bytes
          uploadDate: item.uploaded_at,
        }));
        setDocuments(mappedDocs);
      } else {
        console.warn("Failed to fetch documents or empty format", result);
      }

    } catch (error) {
      console.error("Failed to load documents", error);
    } finally {
      setIsLoading(false);
    }
  };



  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || "application/unknown",
          size: asset.size || 0,
        });
        // Auto-fill "Save as" name if empty
        if (!saveAsName.trim()) {
          setSaveAsName(asset.name.split('.')[0]);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const uploadFile = async (file: { uri: string; name: string; mimeType: string }) => {
    setIsUploading(true);

    try {
      const authDataStr = await AsyncStorage.getItem("authData");
      const authData = authDataStr ? JSON.parse(authDataStr) : null;
      const token = authData?.token;
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        return;
      }
      const uploadUrl = `${API_CONFIG.BASE_URL}local/mobileapi/upload_document.php?wstoken=${token}`;
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as any);
      formData.append("mode", "private");

      console.log("Starting upload to:", uploadUrl);
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      console.log("Upload result:", result);
      if (response.ok && (result.success || result.status === true || result[0]?.status === true)) {
        setSelectedFile(null);
        setSaveAsName("");
        Alert.alert("Success", "File uploaded successfully!");
        loadDocuments();
      } else {
        Alert.alert("Upload Failed", result.message || "Something went wrong during upload.");
      }
    } catch (error) {
      console.error("Upload Error:", error);
      Alert.alert("Error", "Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !saveAsName.trim()) {
      Alert.alert("Error", "Please select a file and provide a name.");
      return;
    }

    await uploadFile(selectedFile);
  };

  const fetchDigiLockerFiles = async (accessToken: string, folderId: string = "") => {
    setDigilockerLoading(true);
    try {
      const url = folderId 
        ? `https://digilocker.meripehchaan.gov.in/public/oauth2/1/files/${folderId}`
        : "https://digilocker.meripehchaan.gov.in/public/oauth2/1/files";

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      console.log(result, "digicloker ka response");
      if (!response.ok) {
        throw new Error(result?.error_description || result?.error || "Failed to fetch DigiLocker files");
      }
      const items = Array.isArray(result?.items) ? result.items : [];
      setDigilockerFiles(items);
    } finally {
      setDigilockerLoading(false);
    }
  };



  const downloadDigiLockerFile = async (file: DigiLockerFileItem) => {
    if (!digilockerAccessToken) {
      throw new Error("DigiLocker access token missing.");
    }
    const downloadUrl = `https://digilocker.meripehchaan.gov.in/public/oauth2/1/file/${file.uri}`;
    const filePath = FileSystem.documentDirectory + file.name;
    const result = await FileSystem.downloadAsync(downloadUrl, filePath, {
      headers: {
        Authorization: `Bearer ${digilockerAccessToken}`,
      },
    });
    return result.uri;
  };

  const viewDigiLockerFile = async (file: DigiLockerFileItem) => {
    if (!digilockerAccessToken) {
      Alert.alert("Error", "DigiLocker access token missing. Please reconnect.");
      return;
    }

    if (file.type === "dir") {
      try {
        setDigilockerHistory(prev => [...prev, { id: file.id || "", name: file.name }]);
        await fetchDigiLockerFiles(digilockerAccessToken, file.id);
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to opening folder");
      }
      return;
    }

    try {
      setDownloadingUri(file.uri);
      const localUri = await downloadDigiLockerFile(file);
      let displayName = file.name;
      if (file.mime === "application/pdf" && !displayName.toLowerCase().endsWith(".pdf")) {
        displayName += ".pdf";
      }
      const nextPreview = { uri: localUri, mime: file.mime, name: displayName };
      setPreviewFile(nextPreview);
      setPreviewVisible(true);
      console.log("Preview file set:", nextPreview);
      return;
    } catch (error) {
      console.error("Failed to open DigiLocker file:", error);
      Alert.alert("Error", "Unable to open this file. Please try again.");
    } finally {
      setDownloadingUri(null);
    }
  };

  const viewUploadedFile = async (doc: Document) => {
    try {
      setDownloadingUri(doc.uri);
      const filePath = FileSystem.documentDirectory + doc.name;
      const result = await FileSystem.downloadAsync(doc.uri, filePath);
      const nextPreview = { 
        uri: result.uri, 
        mime: doc.mimeType, 
        name: doc.name,
        isUploaded: true 
      };
      setPreviewFile(nextPreview);
      setPreviewVisible(true);
    } catch (error) {
      console.error("Failed to open uploaded file:", error);
      Alert.alert("Error", "Unable to open this file. Please try again.");
    } finally {
      setDownloadingUri(null);
    }
  };

  const handleDigiLockerBack = async () => {
    if (!digilockerAccessToken || digilockerHistory.length === 0) return;

    const newHistory = [...digilockerHistory];
    newHistory.pop();
    setDigilockerHistory(newHistory);

    const parentFolderId = newHistory.length > 0 ? newHistory[newHistory.length - 1].id : "";
    try {
      await fetchDigiLockerFiles(digilockerAccessToken, parentFolderId);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to navigate back");
    }
  };

  const savePreviewFile = async () => {
    if (!previewFile) return;
    try {
      setSavingPreview(true);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Not Available", "File sharing is not available on this device.");
        return;
      }

      await Sharing.shareAsync(previewFile.uri, {
        mimeType: previewFile.mime,
        dialogTitle: "Save DigiLocker file",
        UTI: previewFile.mime,
      });
      Alert.alert("Saved", "Use Files app to choose where to save.");
    } catch (error) {
      console.error("Save file error:", error);
      Alert.alert("Error", "Unable to save this file. Please try again.");
    } finally {
      setSavingPreview(false);
    }
  };

  const handleUploadPreviewFile = async () => {
    if (!previewFile) return;
    try {
      setUploadingPreview(true);
      const info = await FileSystem.getInfoAsync(previewFile.uri);
      const file = {
        uri: previewFile.uri,
        name: previewFile.name,
        mimeType: previewFile.mime,
        size: info?.exists && !info.isDirectory ? (info as any).size || 0 : 0,
      };
      setSelectedFile(file);
      if (!saveAsName.trim()) {
        const baseName = previewFile.name.split(".").slice(0, -1).join(".") || previewFile.name;
        setSaveAsName(baseName);
      }
      await uploadFile(file);
      setPreviewVisible(false);
    } catch (error) {
      console.error("Upload DigiLocker file error:", error);
      Alert.alert("Error", "Unable to upload this file. Please try again.");
    } finally {
      setUploadingPreview(false);
    }
  };



  const handleDigiLockerClick = async () => {
    try {
      console.log("🔐 Opening DigiLocker WebView...");
      const digiLockerResult = await loginWithDigiLocker(showWebView);
      if (!digiLockerResult) {
        console.log("ℹ️ DigiLocker login cancelled by user");
        return;
      }

      console.log("✅ DigiLocker authorization code received");
      console.log("📋 DigiLocker Auth Result:", digiLockerResult);

      const data = await exchangeAuthorizationCodeForToken(
        digiLockerResult.authorizationCode,
        digiLockerResult.codeVerifier
      );
      console.log("✅ DigiLocker Data:", data);

      setDigilockerLoading(true);
      setDigilockerAccessToken(data.access_token);
      setDigilockerHistory([]); // Reset history on new login
      await fetchDigiLockerFiles(data.access_token);
      setDigilockerModalVisible(true);
    } catch (error) {
      console.error("❌ DigiLocker Login Error:", error);
      Alert.alert("Error", "DigiLocker login failed. Please try again.");
    } finally {
      setDigilockerLoading(false);
    }
  };

  const handleDeleteDocument = (docId: number) => {
    Alert.alert(
      "Delete File",
      "Are you sure you want to delete this file?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const authDataStr = await AsyncStorage.getItem("authData");
              const authData = authDataStr ? JSON.parse(authDataStr) : null;
              const token = authData?.token;
              if (!token) {
                Alert.alert("Error", "Authentication token not found.");
                return;
              }
              const url = `${API_CONFIG.BASE_URL}webservice/rest/server.php?wsfunction=local_mobileapi_delete_document&moodlewsrestformat=json&wstoken=${token}&document_id=${docId}`;
              const response = await fetch(url, { method: 'POST' });
              const result = await response.json();
              if (result.success === true || result.status === true) {
                Alert.alert("Success", "Document deleted successfully");
                loadDocuments();
              } else {
                Alert.alert("Error", result.message || "Failed to delete document");
              }

            } catch (error) {
              console.error("Delete Error:", error);
              Alert.alert("Error", "An error occurred while deleting.");
            }
          },
        },
      ]
    );
  };


  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <AppHeader
        title="Private Files"
        onBack={() => router.back()}
        rightIcon={<View />}
      />

      {WebViewComponent}
      <Modal
        visible={digilockerModalVisible}
        animationType="slide"
        onRequestClose={() => setDigilockerModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.card, paddingTop: inset.top }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {digilockerHistory.length > 0 && (
                <TouchableOpacity onPress={handleDigiLockerBack} style={styles.modalBackBtn}>
                  <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
              )}
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {digilockerHistory.length > 0 ? digilockerHistory[digilockerHistory.length - 1].name : "DigiLocker Files"}
                </Text>
                {digilockerHistory.length > 0 && (
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>DigiLocker Drive</Text>
                )}
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => {
                if (digilockerHistory.length > 0) {
                  // If in a subfolder, X returns to the root list instead of closing everything
                  setDigilockerHistory([]);
                  if (digilockerAccessToken) fetchDigiLockerFiles(digilockerAccessToken, "");
                } else {
                  setDigilockerModalVisible(false);
                }
              }} 
              style={styles.modalCloseAbsolute}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          {digilockerLoading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.modalLoadingText, { color: colors.textSecondary }]}>Loading files...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.digiHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.digiHeroRow}>
                  <View style={[styles.digiHeroIcon, { backgroundColor: isDark ? "rgba(33,150,243,0.2)" : "#E8F1FF" }]}>
                    <Ionicons name="cloud-outline" size={22} color={isDark ? colors.primary : "#2B5CAD"} />
                  </View>
                  <View style={styles.digiHeroText}>
                    <Text style={[styles.digiHeroTitle, { color: colors.text }]}>DigiLocker Library</Text>
                    <Text style={[styles.digiHeroSubtitle, { color: colors.textSecondary }]}>
                      Browse your verified files and import them.
                    </Text>
                  </View>
                  <View style={[styles.countPill, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F3F7" }]}>
                    <Text style={[styles.countPillText, { color: colors.text }]}>{digilockerFiles.length} files</Text>
                  </View>
                </View>
              </View>

              <View style={styles.uploadedSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Available Documents</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Tap to preview</Text>
                </View>
                {digilockerFiles.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={[styles.emptyIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F4F6FA" }]}>
                      <Ionicons name="folder-open-outline" size={26} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.modalEmptyText, { color: colors.textSecondary }]}>
                      No DigiLocker files found.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.digilockerList}>
                    {digilockerFiles.map((file) => {
                      const mimeColor = getMimeColor(file.mime);
                      return (
                        <TouchableOpacity
                          key={file.id || file.uri}
                          style={[styles.digiFileCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                          onPress={() => viewDigiLockerFile(file)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.digiFileRow}>
                            <View style={[styles.digiFileIcon, { backgroundColor: file.type === "dir" ? "rgba(33,150,243,0.1)" : `${mimeColor}1A` }]}>
                              <Ionicons 
                                name={file.type === "dir" ? "folder" : getMimeIcon(file.mime) as any} 
                                size={22} 
                                color={file.type === "dir" ? "#2196F3" : mimeColor} 
                              />
                            </View>
                            <View style={styles.digiFileInfo}>
                              <Text style={[styles.fileItemName, { color: colors.text }]} numberOfLines={1}>
                                {file.name}
                              </Text>
                              <View style={styles.digiMetaRow}>
                                <Text style={[styles.fileItemMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                                  {file.type === "dir" ? "Folder" : file.mime}
                                </Text>
                                <View style={styles.metaDot} />
                                <Text style={[styles.fileItemMeta, { color: colors.textSecondary }]}>
                                  {file.type === "dir" ? `${file.itemsCount || "—"} items` : formatFileSize(file.size)}
                                </Text>
                                <View style={styles.metaDot} />
                                <Text style={[styles.fileItemMeta, { color: colors.textSecondary }]}>
                                  {formatFileDate(file.date)}
                                </Text>
                              </View>
                              {file.issuer ? (
                                <Text style={[styles.fileIssuer, { color: colors.textSecondary }]} numberOfLines={1}>
                                  Issuer: {file.issuer}
                                </Text>
                              ) : null}
                            </View>
                            <View style={styles.fileAction}>
                              {downloadingUri === file.uri ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                              ) : (
                                <Ionicons 
                                  name={file.type === "dir" ? "chevron-forward" : "eye-outline"} 
                                  size={20} 
                                  color={isDark ? colors.primary : "#2B5CAD"} 
                                />
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      <Modal
        visible={previewVisible}
        animationType="slide"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.card, paddingTop: inset.top }]}>
          <View style={[styles.previewHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <View style={styles.previewHeaderText}>
              <Text style={[styles.previewHeaderTitle, { color: colors.text }]} numberOfLines={1}>
                {previewFile?.name || "DigiLocker File"}
              </Text>
              <Text style={[styles.previewHeaderSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {previewFile?.mime || "Preview"}
              </Text>
            </View>
            <View style={styles.previewHeaderActions}>
              <TouchableOpacity onPress={savePreviewFile} style={styles.modalActionBtn} disabled={savingPreview}>
                {savingPreview ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="download-outline" size={22} color={colors.text} />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPreviewVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          {previewFile ? (
            previewFile.mime.startsWith("image/") ? (
              <View style={[styles.previewBody, { backgroundColor: isDark ? "#101114" : "#F5F6FA" }]}>
                <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Image source={{ uri: previewFile.uri }} style={styles.previewMedia} resizeMode="contain" />
                </View>
              </View>
            ) : (
              <View style={[styles.previewBody, { backgroundColor: isDark ? "#101114" : "#F5F6FA" }]}>
                <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Pdf source={{ uri: previewFile.uri }} style={styles.previewPdf} />
                </View>
              </View>
            )
          ) : (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.modalLoadingText, { color: colors.textSecondary }]}>Preparing preview...</Text>
            </View>
          )}
          {!previewFile?.isUploaded && (
            <View style={[styles.previewFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
              <Button
                title={uploadingPreview || isUploading ? "Uploading..." : "Upload to My Files"}
                onPress={handleUploadPreviewFile}
                disabled={uploadingPreview || isUploading}
                variant="primary"
              />
            </View>
          )}
        </View>
      </Modal>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* DigiLocker Banner */}
          <TouchableOpacity
            style={[styles.digilockerBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleDigiLockerClick}
          >
            <View style={styles.digilockerContent}>
              <Image
                source={require("@/assets/appImages/digi.png")}
                style={styles.digilockerIcon}
              />
              <View style={styles.digilockerTextContainer}>
                <Text style={[styles.digilockerTitle, { color: isDark ? colors.primary : "#052c65" }]}>Connect DigiLocker</Text>
                <Text style={[styles.digilockerSubtitle, { color: colors.textSecondary }]}>Import documents from DigiLocker</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={isDark ? colors.textSecondary : "#052c65"} />
            </View>
          </TouchableOpacity>

          {/* Upload Form Section */}
          <View style={[styles.uploadForm, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
            <Text style={[styles.uploadFormTitle, { color: colors.text }]}>Upload New File</Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Attachment</Text>
              <TouchableOpacity style={[styles.fileInput, { borderColor: colors.border, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "transparent" }]} onPress={pickDocument}>
                <Text style={[styles.fileInputText, { color: colors.text }, !selectedFile && { color: "#999" }]}>
                  {selectedFile ? selectedFile.name : "Choose file..."}
                </Text>
                <View style={[styles.browseButton, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#f2f2f2" }]}>
                  <Text style={[styles.browseButtonText, { color: colors.text }]}>Browse</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Save as</Text>
              <TextInput
                style={[styles.textInput, { borderColor: colors.border, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "transparent", color: colors.text }]}
                placeholder="Enter file name"
                value={saveAsName}
                onChangeText={setSaveAsName}
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Author</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#f5f5f5", color: colors.textSecondary, borderColor: colors.border }]}
                value={authorName}
                editable={false}
              />
            </View>

            <Button
              title={isUploading ? "Uploading..." : "Upload this file"}
              onPress={handleUpload}
              disabled={!selectedFile || !saveAsName.trim() || isUploading}
              variant="primary"
            />
          </View>

          {/* File List Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Files ({documents.length})</Text>
            {documents.length === 0 ? (
              <View style={[styles.emptyFilesState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="folder-open-outline" size={48} color={isDark ? colors.textSecondary : "#ccc"} />
                <Text style={[styles.emptyFilesText, { color: colors.textSecondary }]}>No files uploaded yet</Text>
              </View>
            ) : (
              <View style={styles.filesList}>
                {documents.map((doc) => (
                  <TouchableOpacity 
                    key={doc.id} 
                    style={[styles.fileItemCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
                    onPress={() => viewUploadedFile(doc)}
                    activeOpacity={0.9}
                  >
                    {/* Image/File Preview at the top */}
                    {doc.fileType === "Image" ? (
                      <View style={[styles.filePreview, { backgroundColor: isDark ? "#222" : "#eee" }]}>
                        <Image source={{ uri: doc.uri }} style={styles.previewImage} resizeMode="cover" />
                      </View>
                    ) : (
                      <View style={[styles.filePreview, { backgroundColor: isDark ? "#222" : "#eee", justifyContent: "center", alignItems: "center" }]}>
                        <Ionicons name="document-text" size={48} color="#F44336" />
                      </View>
                    )}

                    <View style={{ padding: 16 }}>
                      <Text style={[styles.fileItemName, { color: colors.text, fontSize: 16 }]} numberOfLines={1}>
                        {doc.name}
                      </Text>
                      <Text style={[styles.fileItemMeta, { color: colors.textSecondary, marginBottom: 12 }]}>
                        {doc.size} • {doc.uploadDate}
                      </Text>

                      {/* Action Buttons at the bottom row */}
                      <View style={{ 
                        flexDirection: "row", 
                        borderTopWidth: 1, 
                        borderTopColor: colors.border, 
                        paddingTop: 12, 
                        marginTop: 4,
                        justifyContent: "space-between" 
                      }}>
                        {downloadingUri === doc.uri ? (
                          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                            <ActivityIndicator size="small" color={colors.primary} />
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => viewUploadedFile(doc)}
                            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
                          >
                            <Ionicons name="eye-outline" size={20} color={isDark ? colors.primary : "#2B5CAD"} />
                            <Text style={{ color: colors.text, fontSize: 13 }}>View</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() => Linking.openURL(doc.uri)}
                          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }}
                        >
                          <Ionicons name="cloud-download-outline" size={20} color={isDark ? colors.primary : "#2196F3"} />
                          <Text style={{ color: colors.text, fontSize: 13 }}>Download</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeleteDocument(doc.id)}
                          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
                        >
                          <Ionicons name="trash-outline" size={20} color="#F44336" />
                          <Text style={{ color: "#F44336", fontSize: 13 }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>


        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    paddingVertical: 20,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  digilockerBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#052c65",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  digilockerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  digilockerIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  digilockerTextContainer: {
    flex: 1,
  },
  digilockerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#052c65",
    marginBottom: 2,
  },
  digilockerSubtitle: {
    fontSize: 13,
    color: "#666",
  },
  filesList: {
    gap: 16,
    marginHorizontal: 20,
  },
  emptyFilesState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderStyle: "dashed",
    marginHorizontal: 20
  },
  emptyFilesText: {
    marginTop: 12,
    color: "#999",
    fontSize: 15
  },
  fileItemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden"
  },
  filePreview: {
    height: 140,
    backgroundColor: "#eee"
  },
  previewImage: {
    width: "100%",
    height: "100%"
  },
  fileItemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  fileIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  fileItemInfo: {
    flex: 1,
  },
  fileItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  fileItemMeta: {
    fontSize: 12,
    color: "#888",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionBtn: {
    padding: 8,
  },
  uploadForm: {
    margin: 20,
    marginTop: 0,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  uploadFormTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
  },
  fileInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 4,
    paddingLeft: 12,
  },
  fileInputText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  browseButton: {
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginLeft: 8,
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalBackBtn: {
    marginRight: 4,
    padding: 4,
  },
  previewHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewHeaderText: {
    flex: 1,
  },
  previewHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  previewHeaderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  previewHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalActions: {
    position: "absolute",
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalActionBtn: {
    padding: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalClose: {
    padding: 6,
  },
  modalCloseAbsolute: {
    position: "absolute",
    right: 16,
    padding: 6,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  digiHero: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  digiHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  digiHeroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  digiHeroText: {
    flex: 1,
  },
  digiHeroTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  digiHeroSubtitle: {
    fontSize: 12,
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  issuedSection: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  issuedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  issuedCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    minWidth: "48%",
    flexGrow: 1,
    flexBasis: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  issuedIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  issuedLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  issuedLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  issuedLoadingText: {
    fontSize: 12,
  },
  uploadedSection: {
    marginTop: 6,
  },
  digilockerList: {
    gap: 12,
  },
  digiFileCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  digiFileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  digiFileIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  digiFileInfo: {
    flex: 1,
  },
  digiMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#999",
  },
  fileIssuer: {
    fontSize: 11,
    marginTop: 4,
  },
  fileAction: {
    paddingLeft: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  modalEmptyText: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  modalLoadingText: {
    fontSize: 13,
  },
  previewBody: {
    flex: 1,
    padding: 16,
  },
  previewCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  previewMedia: {
    width: "100%",
    height: "100%",
  },
  previewPdf: {
    flex: 1,
  },
  previewModalWebView: {
    flex: 1,
  },
  previewFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
});