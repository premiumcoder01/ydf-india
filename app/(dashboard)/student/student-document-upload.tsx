import { AppHeader, Button } from "@/components";
import { API_CONFIG } from "@/utils/apiConfig";

import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

type DocumentStatus = "pending" | "uploaded" | "approved" | "rejected";

type Document = {
  id: number;
  name: string; // The "Save as" name provided by user
  fileType: string;
  uri: string;
  size: string;
  uploadDate: string;
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

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

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

      const url = `${API_CONFIG.BASE_URL}webservice/rest/server.php?wsfunction=local_mobileapi_get_my_documents&moodlewsrestformat=json&wstoken=${token}&page=1&per_page=10`;

      console.log("Fetching documents from:", url);
      const response = await fetch(url);
      const result = await response.json();

      console.log("Documents Result:", result);

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

  const handleUpload = async () => {
    if (!selectedFile || !saveAsName.trim()) {
      Alert.alert("Error", "Please select a file and provide a name.");
      return;
    }

    setIsUploading(true);

    try {
      const authDataStr = await AsyncStorage.getItem("authData");
      const authData = authDataStr ? JSON.parse(authDataStr) : null;
      const token = authData?.token;
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        setIsUploading(false);
        return;
      }
      const uploadUrl = `${API_CONFIG.BASE_URL}local/mobileapi/upload_document.php?wstoken=${token}`;
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType,
      } as any);
      formData.append('mode', 'private');
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
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

  const handleDigiLockerClick = () => {
    Alert.alert("Coming Soon", "DigiLocker integration is coming soon!");
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
          {/* DigiLocker Banner - Now Disabled */}
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
                <Text style={[styles.digilockerSubtitle, { color: colors.textSecondary }]}>Import documents (Coming Soon)</Text>
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
});