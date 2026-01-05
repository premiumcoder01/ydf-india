import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from "react";
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

type KycStatusType = "Pending" | "Under Review" | "Verified" | "Rejected";

export default function ProviderKycScreen() {
  const { isDark, colors } = useTheme();
  const [kycStatus, setKycStatus] = useState<KycStatusType>("Pending");

  // Form fields
  const [panOrAadhaar, setPanOrAadhaar] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");

  // Documents
  const [docPanCard, setDocPanCard] = useState<DocumentType | null>(null);
  const [docBankStatement, setDocBankStatement] = useState<DocumentType | null>(null);
  const [docRegistrationCert, setDocRegistrationCert] = useState<DocumentType | null>(null);

  // UI states
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Validation
  const validatePAN = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  };

  const validateAadhaar = (aadhaar: string): boolean => {
    const aadhaarRegex = /^[0-9]{12}$/;
    return aadhaarRegex.test(aadhaar.replace(/\s/g, ''));
  };

  const validateIFSC = (code: string): boolean => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(code.toUpperCase());
  };

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'panOrAadhaar':
        const cleanValue = value.replace(/\s/g, '');
        if (cleanValue.length === 10 && !validatePAN(cleanValue)) {
          newErrors.panOrAadhaar = "Invalid PAN format (e.g., ABCDE1234F)";
        } else if (cleanValue.length === 12 && !validateAadhaar(cleanValue)) {
          newErrors.panOrAadhaar = "Invalid Aadhaar format (12 digits)";
        } else if (cleanValue.length > 0 && cleanValue.length !== 10 && cleanValue.length !== 12) {
          newErrors.panOrAadhaar = "Enter valid PAN (10 chars) or Aadhaar (12 digits)";
        } else {
          delete newErrors.panOrAadhaar;
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
      case 'accountNumber':
        if (value.length > 0 && (value.length < 9 || value.length > 18)) {
          newErrors.accountNumber = "Account number should be 9-18 digits";
        } else {
          delete newErrors.accountNumber;
        }
        break;
      case 'accountHolderName':
        if (value.length > 0 && value.trim().length < 3) {
          newErrors.accountHolderName = "Account holder name too short";
        } else {
          delete newErrors.accountHolderName;
        }
        break;
      case 'organizationName':
        if (value.length > 0 && value.length < 3) {
          newErrors.organizationName = "Organization name too short";
        } else {
          delete newErrors.organizationName;
        }
        break;
    }

    setErrors(newErrors);
  };

  const validateAllFields = () => {
    const cleanPanAadhaar = panOrAadhaar.replace(/\s/g, '');
    const newErrors: Record<string, string> = {};

    if (!(cleanPanAadhaar.length === 10 && validatePAN(cleanPanAadhaar)) &&
      !(cleanPanAadhaar.length === 12 && validateAadhaar(cleanPanAadhaar))) {
      newErrors.panOrAadhaar = "Enter valid PAN (10 chars) or Aadhaar (12 digits)";
    }

    if (organizationName.trim().length < 3) {
      newErrors.organizationName = "Organization name too short";
    }

    if (accountHolderName.trim().length < 3) {
      newErrors.accountHolderName = "Account holder name too short";
    }

    const accountDigits = accountNumber.trim();
    if (accountDigits.length < 9 || accountDigits.length > 18) {
      newErrors.accountNumber = "Account number should be 9-18 digits";
    }

    if (!validateIFSC(ifsc)) {
      newErrors.ifsc = "Invalid IFSC format (e.g., SBIN0001234)";
    }

    setErrors(newErrors);

    const areDocsAttached = !!docPanCard && !!docBankStatement && !!docRegistrationCert;
    return Object.keys(newErrors).length === 0 && areDocsAttached;
  };

  const isFormValid = useMemo(() => {
    const cleanPanAadhaar = panOrAadhaar.replace(/\s/g, '');
    const isPanValid = cleanPanAadhaar.length === 10 && validatePAN(cleanPanAadhaar);
    const isAadhaarValid = cleanPanAadhaar.length === 12 && validateAadhaar(cleanPanAadhaar);

    const isIdentityValid = isPanValid || isAadhaarValid;
    const isOrgValid = organizationName.trim().length >= 3;
    const isAccountValid = accountNumber.trim().length >= 9 && accountNumber.trim().length <= 18;
    const isHolderValid = accountHolderName.trim().length >= 3;
    const isIfscValid = validateIFSC(ifsc);
    const areDocsAttached = !!docPanCard && !!docBankStatement && !!docRegistrationCert;

    return (
      isIdentityValid &&
      isOrgValid &&
      isAccountValid &&
      isHolderValid &&
      isIfscValid &&
      areDocsAttached
    );
  }, [panOrAadhaar, organizationName, accountNumber, accountHolderName, ifsc, docPanCard, docBankStatement, docRegistrationCert]);

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

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    const ok = validateAllFields();
    if (!ok) {
      Alert.alert("Fix issues", "Please fix highlighted fields and attach required documents.");
      return;
    }

    setSubmitting(true);

    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate successful submission
      setSubmitted(true);
      setKycStatus("Under Review");

      Alert.alert(
        "Success",
        "Your KYC has been submitted successfully and is now under review. You will be notified once verified.",
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to submit KYC. Please try again.");
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
      case "Verified":
        return { color: "#10B981", bg: isDark ? "rgba(16, 185, 129, 0.15)" : "#D1FAE5", icon: "checkmark-circle" as const };
      case "Under Review":
        return { color: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(59, 130, 246, 0.15)" : "#DBEAFE", icon: "time-outline" as const };
      case "Rejected":
        return { color: "#EF4444", bg: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2", icon: "close-circle" as const };
      default:
        return { color: "#F59E0B", bg: isDark ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7", icon: "alert-circle" as const };
    }
  };

  const statusConfig = getStatusConfig(kycStatus);

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
              {kycStatus === "Pending" && "Complete the form below to verify your account"}
              {kycStatus === "Under Review" && "Your documents are being reviewed"}
              {kycStatus === "Verified" && "Your account is fully verified"}
              {kycStatus === "Rejected" && "Please resubmit with correct documents"}
            </Text>
          </View>
        </View>

        {/* Organization Details */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Organization Details</Text>

          <TextInput
            label="PAN / Aadhaar Number *"
            placeholder="PAN or Aadhaar"
            value={panOrAadhaar}
            onChangeText={(text) => {
              setPanOrAadhaar(text);
              validateField('panOrAadhaar', text);
            }}
            onBlur={() => validateField('panOrAadhaar', panOrAadhaar)}
            autoCapitalize="characters"
            maxLength={14}
            error={errors.panOrAadhaar}
          />

          <TextInput
            label="Organization Name *"
            placeholder="Enter registered organization name"
            value={organizationName}
            onChangeText={(text) => {
              setOrganizationName(text);
              validateField('organizationName', text);
            }}
            autoCapitalize="words"
            error={errors.organizationName}
          />
        </View>

        {/* Bank Details */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Bank Account Details</Text>

          <TextInput
            label="Account Holder Name *"
            placeholder="Enter account holder name"
            value={accountHolderName}
            onChangeText={(text) => {
              setAccountHolderName(text);
              validateField('accountHolderName', text);
            }}
            autoCapitalize="words"
            onBlur={() => validateField('accountHolderName', accountHolderName)}
            error={errors.accountHolderName}
          />

          <TextInput
            label="Bank Account Number *"
            placeholder="Enter account number"
            value={accountNumber}
            onChangeText={(text) => {
              const numeric = text.replace(/\D/g, '');
              setAccountNumber(numeric);
              validateField('accountNumber', numeric);
            }}
            keyboardType="numeric"
            maxLength={18}
            error={errors.accountNumber}
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
          {kycStatus === "Pending" || kycStatus === "Rejected" ? (
            <Button
              title={submitting ? "Submitting..." : "Submit for Verification"}
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting || !isFormValid}
            />
          ) : (
            <View style={[styles.infoBox, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.1)" : "#EFF6FF", borderColor: isDark ? "rgba(59, 130, 246, 0.3)" : "#3B82F6" }]}>
              <Ionicons name="information-circle" size={24} color={isDark ? "#60A5FA" : "#3B82F6"} />
              <Text style={[styles.infoText, { color: isDark ? "#93C5FD" : "#1E40AF" }]}>
                Your KYC is {kycStatus.toLowerCase()}. No action needed at this time.
              </Text>
            </View>
          )}
        </View>

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