import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getDonorKycStatus, submitDonorKyc, uploadDocument } from "@/utils/api";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Button from "../../../components/Button";
import TextInput from "../../../components/TextInput";

type DocumentType = {
  uri: string;
  name: string;
  type: string;
  size?: number;
};

type KycStatusType = "New" | "pending" | "approved" | "rejected";

export default function ProviderKycScreen() {
  const { isDark, colors } = useTheme();
  const [kycStatus, setKycStatus] = useState<KycStatusType>("New");

  // Form fields
  const [pan, setPan] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [signatoryName, setSignatoryName] = useState("");

  // Documents
  const [docPanCard, setDocPanCard] = useState<DocumentType | null>(null);
  const [docBankStatement, setDocBankStatement] = useState<DocumentType | null>(null);
  const [docRegistrationCert, setDocRegistrationCert] = useState<DocumentType | null>(null);

  // UI states
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) return;
      const authData = JSON.parse(authDataString);
      const token = authData?.token;
      if (!token) return;

      const response = await getDonorKycStatus(token);
      if (response.success && response.data) {
        // Handle nested data structure: { success: true, data: { status: "...", ... } }
        const kycData = response.data.data ? response.data.data : response.data;

        const rawStatus = kycData.status || "New";
        const status = rawStatus.toLowerCase() as KycStatusType;
        setKycStatus(status);

        if (kycData.org_name) setOrgName(kycData.org_name);
        if (kycData.org_email) setOrgEmail(kycData.org_email);
        if (kycData.org_phone) setOrgPhone(kycData.org_phone);
        if (kycData.pan) setPan(kycData.pan);
        if (kycData.bank_account) setBankAccount(kycData.bank_account); // Note: might be masked if server masks it
        if (kycData.ifsc) setIfsc(kycData.ifsc);
        if (kycData.signatory_name) setSignatoryName(kycData.signatory_name);

        // Parse documents if available
        if (kycData.documents) {
          try {
            const docsData = typeof kycData.documents === 'string'
              ? JSON.parse(kycData.documents)
              : kycData.documents;

            if (Array.isArray(docsData)) {
              docsData.forEach((item: any) => {
                if (item.data && item.doc_type) {
                  const docObj: DocumentType = {
                    uri: item.data.fileurl,
                    name: item.data.filename,
                    type: item.data.mimetype,
                    size: item.data.filesize
                  };
                  if (item.doc_type === "PAN") setDocPanCard(docObj);
                  if (item.doc_type === "BANK") setDocBankStatement(docObj);
                  if (item.doc_type === "REG") setDocRegistrationCert(docObj);
                }
              });
            }
          } catch (e) {
            console.error("Error parsing documents JSON", e);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch KYC status", e);
    } finally {
      setLoading(false);
    }
  };

  // Validation
  const validatePAN = (val: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(val.toUpperCase());
  };

  const validateIFSC = (code: string): boolean => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(code.toUpperCase());
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    return /^\d{10}$/.test(phone);
  };

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'pan':
        if (value.length === 10 && !validatePAN(value)) {
          newErrors.pan = "Invalid PAN format (e.g., ABCDE1234F)";
        } else if (value.length > 0 && value.length !== 10) {
          newErrors.pan = "PAN must be 10 characters";
        } else {
          delete newErrors.pan;
        }
        break;
      case 'ifsc':
        if (value.length > 0 && value.length < 11) {
          newErrors.ifsc = "IFSC must be 11 characters";
        } else if (value.length >= 11 && !validateIFSC(value)) {
          newErrors.ifsc = "Invalid IFSC format (e.g., SBIN0001234)";
        } else {
          delete newErrors.ifsc;
        }
        break;
      case 'bankAccount':
        if (value.length > 0 && (value.length < 9 || value.length > 18)) {
          newErrors.bankAccount = "Account number should be 9-18 digits";
        } else {
          delete newErrors.bankAccount;
        }
        break;
      case 'signatoryName':
        if (value.length > 0 && value.trim().length < 3) {
          newErrors.signatoryName = "Name too short";
        } else {
          delete newErrors.signatoryName;
        }
        break;
      case 'orgName':
        if (value.length > 0 && value.length < 3) {
          newErrors.orgName = "Organization name too short";
        } else {
          delete newErrors.orgName;
        }
        break;
      case 'orgEmail':
        if (value.length > 0 && !validateEmail(value)) {
          newErrors.orgEmail = "Invalid email address";
        } else {
          delete newErrors.orgEmail;
        }
        break;
      case 'orgPhone':
        if (value.length > 0 && !validatePhone(value)) {
          newErrors.orgPhone = "Invalid phone number (10 digits)";
        } else {
          delete newErrors.orgPhone;
        }
        break;
    }

    setErrors(newErrors);
  };

  const validateAllFields = () => {
    const newErrors: Record<string, string> = {};

    if (pan.length !== 10 || !validatePAN(pan)) {
      newErrors.pan = "Enter valid PAN (10 chars)";
    }
    if (orgName.trim().length < 3) {
      newErrors.orgName = "Organization name too short";
    }
    if (!validateEmail(orgEmail)) {
      newErrors.orgEmail = "Invalid email";
    }
    if (!validatePhone(orgPhone)) {
      newErrors.orgPhone = "Invalid phone (10 digits)";
    }
    if (signatoryName.trim().length < 3) {
      newErrors.signatoryName = "Signatory name too short";
    }

    const accountDigits = bankAccount.trim();
    if (accountDigits.length < 9 || accountDigits.length > 18) {
      newErrors.bankAccount = "Account number should be 9-18 digits";
    }

    if (!validateIFSC(ifsc)) {
      newErrors.ifsc = "Invalid IFSC format (e.g., SBIN0001234)";
    }

    setErrors(newErrors);

    const areDocsAttached = !!docPanCard && !!docBankStatement && !!docRegistrationCert;
    return Object.keys(newErrors).length === 0 && areDocsAttached;
  };

  const isFormValid = useMemo(() => {
    const isIdentityValid = pan.length === 10 && validatePAN(pan);
    const isOrgValid = orgName.trim().length >= 3;
    const isEmailValid = validateEmail(orgEmail);
    const isPhoneValid = validatePhone(orgPhone);
    const isAccountValid = bankAccount.trim().length >= 9 && bankAccount.trim().length <= 18;
    const isHolderValid = signatoryName.trim().length >= 3;
    const isIfscValid = validateIFSC(ifsc);
    const areDocsAttached = !!docPanCard && !!docBankStatement && !!docRegistrationCert;

    return (
      isIdentityValid &&
      isOrgValid &&
      isEmailValid &&
      isPhoneValid &&
      isAccountValid &&
      isHolderValid &&
      isIfscValid &&
      areDocsAttached
    );
  }, [pan, orgName, orgEmail, orgPhone, bankAccount, signatoryName, ifsc, docPanCard, docBankStatement, docRegistrationCert]);

  // Request permissions
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and media library permissions are needed to upload documents.'
        );
        return false;
      }
    }
    return true;
  };

  // Document picker with options
  const pickDocument = async (docType: "PAN" | "BANK" | "REG") => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert(
      "Upload Document",
      "Choose upload method",
      [
        {
          text: "Take Photo",
          onPress: () => captureImage(docType),
        },
        {
          text: "Choose from Gallery",
          onPress: () => pickImage(docType),
        },
        {
          text: "Pick PDF/Document",
          onPress: () => pickFile(docType),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const captureImage = async (docType: "PAN" | "BANK" | "REG") => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const doc: DocumentType = {
          uri: asset.uri,
          name: `${docType.toLowerCase()}_${Date.now()}.jpg`,
          type: 'image/jpeg',
          size: asset.fileSize,
        };
        setDocumentByType(docType, doc);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to capture image");
    }
  };

  const pickImage = async (docType: "PAN" | "BANK" | "REG") => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const doc: DocumentType = {
          uri: asset.uri,
          name: asset.fileName || `${docType.toLowerCase()}_${Date.now()}.jpg`,
          type: 'image/jpeg',
          size: asset.fileSize,
        };
        setDocumentByType(docType, doc);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const pickFile = async (docType: "PAN" | "BANK" | "REG") => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets[0]) {
        const asset = result.assets[0];

        // Check file size (max 5MB)
        if (asset.size && asset.size > 5 * 1024 * 1024) {
          Alert.alert("File Too Large", "Please select a file smaller than 5MB");
          return;
        }

        const doc: DocumentType = {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/pdf',
          size: asset.size,
        };
        setDocumentByType(docType, doc);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const setDocumentByType = (type: "PAN" | "BANK" | "REG", doc: DocumentType) => {
    if (type === "PAN") setDocPanCard(doc);
    else if (type === "BANK") setDocBankStatement(doc);
    else if (type === "REG") setDocRegistrationCert(doc);
  };

  const removeDocument = (type: "PAN" | "BANK" | "REG") => {
    Alert.alert(
      "Remove Document",
      "Are you sure you want to remove this document?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            if (type === "PAN") setDocPanCard(null);
            else if (type === "BANK") setDocBankStatement(null);
            else if (type === "REG") setDocRegistrationCert(null);
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const uploadFile = async (doc: DocumentType, token: string, type: "PAN" | "BANK" | "REG") => {
    // using mode 'kyc' to allow backend to categorize uploads
    const response = await uploadDocument(token, doc, 0, "kyc");
    if (response.success && response.data) {
      return {
        ...response.data,
        doc_type: type
      };
    }
    throw new Error(response.error || "Upload failed");
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    const ok = validateAllFields();
    if (!ok) {
      Alert.alert("Fix issues", "Please fix highlighted fields and attach required documents.");
      return;
    }

    setSubmitting(true);

    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) throw new Error("No auth token");
      const authData = JSON.parse(authDataString);
      const token = authData?.token;

      const uploadedDocs = [];

      // Upload docs 
      if (docPanCard && !docPanCard.uri.startsWith('http')) {
        const res = await uploadFile(docPanCard, token, "PAN");
        uploadedDocs.push(res);
      }
      if (docBankStatement && !docBankStatement.uri.startsWith('http')) {
        const res = await uploadFile(docBankStatement, token, "BANK");
        uploadedDocs.push(res);
      }
      if (docRegistrationCert && !docRegistrationCert.uri.startsWith('http')) {
        const res = await uploadFile(docRegistrationCert, token, "REG");
        uploadedDocs.push(res);
      }

      const payload = {
        org_name: orgName,
        org_email: orgEmail,
        org_phone: orgPhone,
        pan: pan,
        bank_account: bankAccount,
        ifsc: ifsc,
        signatory_name: signatoryName,
        documents_json: JSON.stringify(uploadedDocs)
      };

      const response = await submitDonorKyc(token, payload);

      if (response.success) {
        setKycStatus("pending");
        Alert.alert(
          "Success",
          "Your KYC has been submitted successfully and is now under review.",
          [{
            text: "Go to Dashboard",
            onPress: () => router.replace("/scholarship-provider")
          }]
        );
      } else {
        Alert.alert("Error", response.message || "Failed to submit KYC");
      }

    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit KYC. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderDocumentCard = (
    title: string,
    doc: DocumentType | null,
    type: "PAN" | "BANK" | "REG",
    description: string
  ) => (
    <View style={[styles.docCard, { borderColor: colors.border }]}>
      <View style={styles.docHeader}>
        <Text style={[styles.docTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.docDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>

      {doc ? (
        <View style={[styles.docAttached, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#F0FDF4" }]}>
          <View style={styles.docInfo}>
            <Ionicons
              name={doc.type.includes('pdf') ? "document-text" : "image"}
              size={24}
              color={isDark ? "#34D399" : "#10B981"}
            />
            <View style={styles.docDetails}>
              <Text style={[styles.docName, { color: isDark ? "#34D399" : "#065F46" }]} numberOfLines={1}>{doc.name}</Text>
              <Text style={[styles.docSize, { color: isDark ? "#6EE7B7" : "#059669" }]}>{formatFileSize(doc.size)}</Text>
            </View>
          </View>
          {kycStatus !== "pending" && kycStatus !== "approved" && (
            <View style={styles.docActions}>
              <TouchableOpacity
                onPress={() => pickDocument(type)}
                style={styles.docActionButton}
              >
                <Ionicons name="refresh" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeDocument(type)}
                style={styles.docActionButton}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => pickDocument(type)}
        >
          <Ionicons name="cloud-upload-outline" size={32} color={colors.textSecondary} />
          <Text style={[styles.uploadButtonText, { color: colors.text }]}>Tap to Upload</Text>
          <Text style={[styles.uploadButtonSubtext, { color: colors.textSecondary }]}>PDF, JPG, PNG (Max 5MB)</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const getStatusConfig = (status: KycStatusType) => {
    switch (status) {
      case "approved":
        return { color: "#10B981", bg: isDark ? "rgba(16, 185, 129, 0.15)" : "#D1FAE5", icon: "checkmark-circle" as const };
      case "pending":
        return { color: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(59, 130, 246, 0.15)" : "#DBEAFE", icon: "time-outline" as const };
      case "rejected":
        return { color: "#EF4444", bg: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2", icon: "close-circle" as const };
      default: // "New"
        return { color: "#F59E0B", bg: isDark ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7", icon: "alert-circle" as const };
    }
  };

  const statusConfig = getStatusConfig(kycStatus);
  const isEditable = kycStatus === "New" || kycStatus === "rejected"; // Only editable if new or rejected

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader title="KYC Verification" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusConfig.bg }]}>
          <Ionicons name={statusConfig.icon} size={28} color={statusConfig.color} />
          <View style={styles.statusContent}>
            <Text style={[styles.statusTitle, { color: statusConfig.color }]}>
              KYC Status: {kycStatus}
            </Text>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {kycStatus === "New" && "Complete the form below to verify your account"}
              {kycStatus === "pending" && "Your documents are being reviewed"}
              {kycStatus === "approved" && "Your account is fully verified"}
              {kycStatus === "rejected" && "Please resubmit with correct documents"}
            </Text>
          </View>
        </View>

        {isEditable ? (
          <>
            {/* Organization Details */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Organization Details</Text>

              <TextInput
                label="PAN Number *"
                placeholder="ABCDE1234F"
                value={pan}
                onChangeText={(text) => {
                  setPan(text);
                  validateField('pan', text);
                }}
                onBlur={() => validateField('pan', pan)}
                autoCapitalize="characters"
                maxLength={10}
                error={errors.pan}
              />

              <TextInput
                label="Organization Name *"
                placeholder="Enter registered organization name"
                value={orgName}
                onChangeText={(text) => {
                  setOrgName(text);
                  validateField('orgName', text);
                }}
                autoCapitalize="words"
                error={errors.orgName}
              />

              <TextInput
                label="Organization Email *"
                placeholder="email@example.com"
                value={orgEmail}
                onChangeText={(text) => {
                  setOrgEmail(text);
                  validateField('orgEmail', text);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.orgEmail}
              />

              <TextInput
                label="Organization Phone *"
                placeholder="10 digit mobile number"
                value={orgPhone}
                onChangeText={(text) => {
                  const numeric = text.replace(/\D/g, '');
                  setOrgPhone(numeric);
                  validateField('orgPhone', numeric);
                }}
                keyboardType="phone-pad"
                maxLength={10}
                error={errors.orgPhone}
              />
            </View>

            {/* Bank Details */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Bank Account Details</Text>

              <TextInput
                label="Signatory Name *"
                placeholder="Authorized signatory name"
                value={signatoryName}
                onChangeText={(text) => {
                  setSignatoryName(text);
                  validateField('signatoryName', text);
                }}
                autoCapitalize="words"
                onBlur={() => validateField('signatoryName', signatoryName)}
                error={errors.signatoryName}
              />

              <TextInput
                label="Bank Account Number *"
                placeholder="Enter account number"
                value={bankAccount}
                onChangeText={(text) => {
                  const numeric = text.replace(/\D/g, '');
                  setBankAccount(numeric);
                  validateField('bankAccount', numeric);
                }}
                keyboardType="numeric"
                maxLength={18}
                error={errors.bankAccount}
              />

              <TextInput
                label="IFSC Code *"
                placeholder="e.g., SBIN0001234"
                value={ifsc}
                onChangeText={(text) => {
                  setIfsc(text.toUpperCase());
                  validateField('ifsc', text);
                }}
                onBlur={() => validateField('ifsc', ifsc)}
                autoCapitalize="characters"
                maxLength={11}
                error={errors.ifsc}
              />
            </View>

            {/* Documents */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Upload Documents *</Text>
              {submitAttempted && (!docPanCard || !docBankStatement || !docRegistrationCert) && (
                <Text style={styles.errorText}>Please attach PAN card, bank statement, and registration certificate.</Text>
              )}

              {renderDocumentCard(
                "PAN Card",
                docPanCard,
                "PAN",
                "Upload your organization's PAN card"
              )}

              {renderDocumentCard(
                "Bank Statement",
                docBankStatement,
                "BANK",
                "Upload recent bank statement (last 3 months)"
              )}

              {renderDocumentCard(
                "Registration Certificate",
                docRegistrationCert,
                "REG",
                "Upload company/organization registration certificate"
              )}
            </View>

            {/* Submit Button */}
            <View style={styles.footer}>
              <Button
                title={submitting ? "Submitting..." : "Submit for Verification"}
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting || !isFormValid}
              />
            </View>
          </>
        ) : (
          <View style={[styles.section, { backgroundColor: colors.surface, marginTop: 20, alignItems: 'center', paddingVertical: 40 }]}>
            <Ionicons name="hourglass-outline" size={64} color={statusConfig.color} style={{ marginBottom: 20 }} />
            <Text style={[styles.statusTitle, { fontSize: 18, textAlign: 'center', color: colors.text }]}>
              Application Submitted
            </Text>
            <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 10, maxWidth: '80%', lineHeight: 22 }}>
              Your KYC application is currently {kycStatus.toLowerCase()}. You will be able to manage your account once verification is complete.
            </Text>
            <TouchableOpacity
              style={{ marginTop: 30, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 }}
              onPress={() => router.replace("/scholarship-provider")}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Help Text */}
        <View style={[styles.helpBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.helpTitle, { color: colors.text }]}>Need Help?</Text>
          <Text style={[styles.helpText, { color: colors.textSecondary }]}>
            • Ensure all documents are clear and readable{'\n'}
            • Documents should be in PDF, JPG, or PNG format{'\n'}
            • Maximum file size is 5MB per document{'\n'}
            • Verification typically takes 2-3 business days
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  docCard: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  docHeader: {
    marginBottom: 12,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  docDescription: {
    fontSize: 13,
  },
  uploadButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  uploadButtonSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  docAttached: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
  },
  docInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  docDetails: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  docSize: {
    fontSize: 12,
  },
  docActions: {
    flexDirection: "row",
    gap: 8,
  },
  docActionButton: {
    padding: 8,
  },
  footer: {
    marginTop: 8,
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  helpBox: {
    borderRadius: 12,
    padding: 16,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 20,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "600",
  },
});