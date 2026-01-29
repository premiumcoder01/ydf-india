import { AppHeader, Button } from "@/components";
import { API_CONFIG } from "@/utils/apiConfig";

import { useTheme } from "@/context/ThemeContext";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";

type DocumentStatus = "pending" | "uploaded" | "approved" | "rejected";

type Document = {
  id: number;
  name: string; // The "Save as" name provided by user
  fileType: string;
  uri: string;
  size: string;
  uploadDate: string;
};

type DigiLockerFileItem = {
  type: "file";
  name: string;
  mime: string;
  uri: string;
};

type DigiLockerIssuedOption = {
  label: string;
  issuerid: string;
  doctype: string;
};

const DOCUMENTS_STORAGE_KEY = "student_uploaded_documents";

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
  const inset = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [digilockerFiles, setDigilockerFiles] = useState<DigiLockerFileItem[]>([]);
  const [digilockerModalVisible, setDigilockerModalVisible] = useState(false);
  const [digilockerLoading, setDigilockerLoading] = useState(false);
  const [digilockerAccessToken, setDigilockerAccessToken] = useState<string | null>(null);
  const [downloadingUri, setDownloadingUri] = useState<string | null>(null);
  const [issuedConsentVisible, setIssuedConsentVisible] = useState(false);
  const [issuedConsentUrl, setIssuedConsentUrl] = useState<string | null>(null);
  const [issuedRequestLoading, setIssuedRequestLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    uri: string;
    mime: string;
    name: string;
  } | null>(null);
  const [savingPreview, setSavingPreview] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [digilockerFileCache, setDigilockerFileCache] = useState<Record<string, string>>({});

  const issuedOptions: DigiLockerIssuedOption[] = [
    { label: "PAN Card", issuerid: "in.gov.pan", doctype: "PANCR" },
    { label: "Driving Licence", issuerid: "in.gov.dl", doctype: "DRVLC" },
    { label: "Vehicle RC", issuerid: "in.gov.rc", doctype: "REGCERT" },
    { label: "Aadhaar (masked XML)", issuerid: "uidai.gov.in", doctype: "AADHARXML" },
    { label: "Class 10 Marksheet", issuerid: "in.gov.cbse", doctype: "XMARKS" },
    { label: "Class 12 Marksheet", issuerid: "in.gov.cbse", doctype: "XIIMARKS" },
  ];

  const { WebViewComponent, show: showWebView } = useDigiLockerWebView();

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

      const url = `${API_CONFIG.BASE_URL}webservice/rest/server.php?wsfunction=local_mobileapi_get_my_documents&moodlewsrestformat=json&wstoken=${token}&page=1&per_page=100`;

      console.log("Fetching documents from:", url);
      const response = await fetch(url);
      const result = await response.json();



      if (result.success && Array.isArray(result.data)) {
        const mappedDocs: Document[] = result.data.map((item: any) => ({
          id: item.id,
          name: item.filename,
          fileType: item.mimetype && item.mimetype.includes('image') ? 'Image' : 'PDF', // Simple inference
          uri: item.fileurl,
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
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });
      const result = await response.json();
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

  const fetchDigiLockerFiles = async (accessToken: string) => {
    const response = await fetch("https://api.digitallocker.gov.in/public/oauth2/1/files", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error_description || result?.error || "Failed to fetch DigiLocker files");
    }
    const items = Array.isArray(result?.items) ? result.items : [];
    setDigilockerFiles(items);
  };

  const requestIssuedConsent = async (option: DigiLockerIssuedOption) => {
    if (!digilockerAccessToken) {
      Alert.alert("Error", "DigiLocker access token missing. Please reconnect.");
      return;
    }
   

    try {
      setIssuedRequestLoading(true);
      const response = await fetch("https://api.digitallocker.gov.in/public/oauth2/1/request-uri", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${digilockerAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issuerid: option.issuerid,
          doctype: option.doctype,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result?.uri) {
        throw new Error(result?.error_description || result?.error || "Failed to create consent request");
      }
      setIssuedConsentUrl(result.uri);
      setIssuedConsentVisible(true);
    } catch (error) {
      console.error("Issued consent error:", error);
      Alert.alert("Error", "Unable to start consent. Please try again.");
    } finally {
      setIssuedRequestLoading(false);
    }
  };

  const downloadDigiLockerFile = async (file: DigiLockerFileItem) => {
    if (!digilockerAccessToken) {
      throw new Error("DigiLocker access token missing.");
    }

    if (digilockerFileCache[file.uri]) {
      return digilockerFileCache[file.uri];
    }

    const encodedUri = file.uri;
    const downloadUrl = `https://api.digitallocker.gov.in/public/oauth2/1/file/${encodedUri}`;
    const filename = file.name || "digilocker-file";
    const destinationBase =
      (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || "";
    const destination = `${destinationBase}${filename}`;

    const result = await FileSystem.downloadAsync(downloadUrl, destination, {
      headers: {
        Authorization: `Bearer ${digilockerAccessToken}`,
      },
    });

    setDigilockerFileCache((prev) => ({ ...prev, [file.uri]: result.uri }));
    return result.uri;
  };

  const viewDigiLockerFile = async (file: DigiLockerFileItem) => {
    if (!digilockerAccessToken) {
      Alert.alert("Error", "DigiLocker access token missing. Please reconnect.");
      return;
    }

    try {
      setDownloadingUri(file.uri);
      const localUri = await downloadDigiLockerFile(file);
      setPreviewFile({ uri: localUri, mime: file.mime, name: file.name });
      setDigilockerModalVisible(false);
      setPreviewVisible(true);
    } catch (error) {
      console.error("Failed to open DigiLocker file:", error);
      Alert.alert("Error", "Unable to open this file. Please try again.");
    } finally {
      setDownloadingUri(null);
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

  const handleConsentDone = async () => {
    setIssuedConsentVisible(false);
    if (digilockerAccessToken) {
      setDigilockerLoading(true);
      try {
        await fetchDigiLockerFiles(digilockerAccessToken);
      } finally {
        setDigilockerLoading(false);
      }
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>DigiLocker Files</Text>
            <TouchableOpacity onPress={() => setDigilockerModalVisible(false)} style={styles.modalCloseAbsolute}>
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
              <View style={[styles.issuedSection, { borderColor: colors.border, backgroundColor: isDark ? "#141c2c" : "#f6f8ff" }]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Fetch Issued Documents</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Consent required per document</Text>
                </View>
                <View style={styles.issuedGrid}>
                  {issuedOptions.map((option) => (
                    <TouchableOpacity
                      key={`${option.issuerid}-${option.doctype}`}
                      style={[
                        styles.issuedCard,
                        { borderColor: colors.border, backgroundColor: colors.card },
                      ]}
                      onPress={() => requestIssuedConsent(option)}
                      disabled={issuedRequestLoading}
                    >
                      <View style={[styles.issuedIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#eef2ff" }]}>
                        <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                      </View>
                      <Text style={[styles.issuedLabel, { color: colors.text }]} numberOfLines={2}>
                        {option.label}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
                {issuedRequestLoading && (
                  <View style={styles.issuedLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.issuedLoadingText, { color: colors.textSecondary }]}>
                      Opening consent...
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.uploadedSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Uploaded Documents</Text>
                  <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                    {digilockerFiles.length}
                  </Text>
                </View>
                {digilockerFiles.length === 0 ? (
                  <Text style={[styles.modalEmptyText, { color: colors.textSecondary }]}>
                    No DigiLocker files found.
                  </Text>
                ) : (
                  <View style={styles.uploadedList}>
                    {digilockerFiles.map((file) => (
                      <TouchableOpacity
                        key={file.uri}
                        style={[
                          styles.uploadedCard,
                          { backgroundColor: colors.card, borderColor: colors.border },
                        ]}
                        onPress={() => viewDigiLockerFile(file)}
                      >
                        <View style={styles.fileItemRow}>
                          <View style={[styles.fileIconWrapper, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }]}>
                            <Ionicons name="document-text-outline" size={24} color={isDark ? colors.primary : "#2196F3"} />
                          </View>
                          <View style={styles.fileItemInfo}>
                            <Text style={[styles.fileItemName, { color: colors.text }]} numberOfLines={1}>
                              {file.name}
                            </Text>
                            <Text style={[styles.fileItemMeta, { color: colors.textSecondary }]}>
                              {file.mime}
                            </Text>
                          </View>
                          <View style={styles.actionButtons}>
                            {downloadingUri === file.uri ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <Ionicons name="eye-outline" size={20} color={isDark ? colors.primary : "#2196F3"} />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
      <Modal
        visible={issuedConsentVisible}
        animationType="slide"
        onRequestClose={handleConsentDone}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.card, paddingTop: inset.top }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
              DigiLocker Consent
            </Text>
            <TouchableOpacity onPress={handleConsentDone} style={styles.modalCloseAbsolute}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          {issuedConsentUrl ? (
            <WebView source={{ uri: issuedConsentUrl }} style={styles.previewModalWebView} />
          ) : (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.modalLoadingText, { color: colors.textSecondary }]}>Loading consent...</Text>
            </View>
          )}
          <View style={[styles.previewFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
            <Button title="Done (Refresh Files)" onPress={handleConsentDone} variant="primary" />
          </View>
        </View>
      </Modal>
      <Modal
        visible={previewVisible}
        animationType="slide"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.card, paddingTop: inset.top }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
              {previewFile?.name || "DigiLocker File"}
            </Text>
            <View style={styles.modalActions}>
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
              <View style={styles.previewBody}>
                <Image source={{ uri: previewFile.uri }} style={styles.previewModalImage} resizeMode="contain" />
              </View>
            ) : (
              <WebView source={{ uri: previewFile.uri }} style={styles.previewModalWebView} />
            )
          ) : (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.modalLoadingText, { color: colors.textSecondary }]}>Preparing preview...</Text>
            </View>
          )}
          <View style={[styles.previewFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
            <Button
              title={uploadingPreview || isUploading ? "Uploading..." : "Upload to My Files"}
              onPress={handleUploadPreviewFile}
              disabled={uploadingPreview || isUploading}
              variant="primary"
            />
          </View>
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
                value="Student Ydf"
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
                  <View key={doc.id} style={[styles.fileItemCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
                    {/* Image Preview for images */}
                    {doc.fileType === "Image" && (
                      <View style={[styles.filePreview, { backgroundColor: isDark ? "#222" : "#eee" }]}>
                        <Image source={{ uri: doc.uri }} style={styles.previewImage} resizeMode="cover" />
                      </View>
                    )}

                    <View style={styles.fileItemRow}>
                      <View style={[styles.fileIconWrapper, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }]}>
                        <Ionicons
                          name={doc.fileType === "PDF" ? "document-text" : "image"}
                          size={24}
                          color={doc.fileType === "PDF" ? "#F44336" : (isDark ? colors.primary : "#2196F3")}
                        />
                      </View>
                      <View style={styles.fileItemInfo}>
                        <Text style={[styles.fileItemName, { color: colors.text }]} numberOfLines={1}>{doc.name}</Text>
                        <Text style={[styles.fileItemMeta, { color: colors.textSecondary }]}>{doc.size} • {doc.uploadDate}</Text>
                      </View>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          onPress={() => Linking.openURL(doc.uri)}
                          style={[styles.actionBtn, { marginRight: 8 }]}
                        >
                          <Ionicons name="cloud-download-outline" size={20} color={isDark ? colors.primary : "#2196F3"} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteDocument(doc.id)}
                          style={styles.actionBtn}
                        >
                          <Ionicons name="trash-outline" size={20} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
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
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
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
  uploadedList: {
    gap: 12,
  },
  uploadedCard: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  modalEmptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
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
  previewModalImage: {
    width: "100%",
    height: "100%",
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