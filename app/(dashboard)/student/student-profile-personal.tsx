import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getUserProfile, updateUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ValidationErrors {
  [key: string]: string;
}

type LanguageCode = "en" | "fr" | "ar";

const RELIGION_OPTIONS = [
  "Hinduism",
  "Muslim",
  "Christianity",
  "Sikhism",
  "Buddhism",
  "Jainism",
  "Zoroastrianism",
  "Prefer not to say"
];

const CASTE_OPTIONS = [
  "Scheduled Tribe (ST)",
  "Scheduled Caste (SC)",
  "OBC",
  "General",
  "Minority",
  "Prefer not to say"
];

const GENDER_OPTIONS = ["Male", "Female", "Other"];

const DOMICILE_STATE_OPTIONS = [
  "Bihar",
  "Punjab",
  "Rajasthan",
  "Maharashtra",
  "Delhi",
  "Gujarat",
  "Haryana",
  "Other"
];

const DISTRICT_OPTIONS = [
  "East Champaran",
  "Gaya",
  "Gopalganj",
  "Jamui",
  "Jehanabad",
  "Kaimur",
  "Katihar",
  "Khagaria",
  "Kishanganj",
  "Lakhisarai",
  "Madhepura",
  "Madhubani",
  "Munger",
  "Muzaffarpur",
  "Nalanda",
  "Nawada",
  "Patna",
  "Purnia",
  "Rohtas",
  "Saharsa",
  "Samastipur",
  "Sheikhpura",
  "Sheohar",
  "Sitamarhi",
  "Siwan",
  "Supaul",
  "Vaishali",
  "West Champaran",
  "Nashik",
  "Raigad",
  "Kotputli-behror",
  "Alwar",
  "Sikar",
  "Sasnagar-Mohali",
  "Banaskantha(deesa)",
  "Other"
];

export default function StudentProfilePersonalScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [personalInfo, setPersonalInfo] = useState({
    // General / Personal
    username: "",
    fullName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    religion: "",
    caste: "",
    domicileState: "",
    district: "",
    address: "",
    city: "",
    village: "",
    profileImageUrl: "",
    aadharFront: null as { name: string, uri: string } | null,
    aadharBack: null as { name: string, uri: string } | null,
    // Family
    fatherName: "",
    motherName: "",
    annualIncome: "",
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [settings, setSettings] = useState({
    language: "en" as LanguageCode,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("error");

  const [showReligionPicker, setShowReligionPicker] = useState(false);
  const [showCastePicker, setShowCastePicker] = useState(false);
  const [showDomicileStatePicker, setShowDomicileStatePicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Validation Functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const authDataStr = await AsyncStorage.getItem("authData");
        if (authDataStr) {
          const authData = JSON.parse(authDataStr);
          if (authData.token) {
            const response = await getUserProfile(authData.token);
            if (response.success && response.data && response.data.user) {
              const user = response.data.user;
              console.log("User Data:", response.data);

              // Map API fields to state
              // Note: Many of these might be in customfields depending on the API structure
              setPersonalInfo((prev) => ({
                ...prev,
                username: user.username || prev.username,
                fullName: user.fullname || `${user.firstname} ${user.lastname}` || prev.fullName,
                firstName: user.firstname || prev.firstName,
                lastName: user.lastname || prev.lastName,
                email: user.email || prev.email,
                phone: user.phone1 || user.phone || prev.phone,
                address: user.address || prev.address,
                city: user.city || prev.city,
                dob: user.dob ? (user.dob.includes('-') && user.dob.split('-')[0].length === 4 ? user.dob.split('-').reverse().join('/') : user.dob) : prev.dob,

                // Fields from user object or customfields
                gender: user.gender || user.customfields?.find((f: any) => f.shortname === 'gender')?.value || prev.gender,
                religion: user.religion || user.customfields?.find((f: any) => f.shortname === 'religion')?.value || prev.religion,
                caste: user.caste || user.customfields?.find((f: any) => f.shortname === 'caste')?.value || prev.caste,
                domicileState: user.domicilestate || user.customfields?.find((f: any) => f.shortname === 'domicilestate')?.value || prev.domicileState,
                district: user.district || user.customfields?.find((f: any) => f.shortname === 'district' || f.shortname === 'domiciledistrict')?.value || prev.district,
                village: user.village || user.customfields?.find((f: any) => f.shortname === 'village')?.value || prev.village,
                fatherName: user.fathername || user.customfields?.find((f: any) => f.shortname === 'fathername')?.value || prev.fatherName,
                motherName: user.mothername || user.customfields?.find((f: any) => f.shortname === 'mothername')?.value || prev.motherName,
                annualIncome: user.annualincome || user.customfields?.find((f: any) => f.shortname === 'annualincome')?.value || prev.annualIncome,
              }));
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Handlers
  const handlePersonalInfoChange = useCallback(
    (field: keyof typeof personalInfo, value: string) => {
      setPersonalInfo((prev) => ({ ...prev, [field]: value }));
      setHasUnsavedChanges(true);

      if (validationErrors[field]) {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [validationErrors]
  );

  const validatePersonalInfo = (): boolean => {
    const errors: ValidationErrors = {};

    if (!personalInfo.fullName.trim()) {
      errors.fullName = "Full name is required";
    }
    if (!validateEmail(personalInfo.email)) {
      errors.email = "Please enter a valid email address";
    }
    if (!personalInfo.fatherName.trim()) errors.fatherName = "Father's name is required";
    if (!personalInfo.motherName.trim()) errors.motherName = "Mother's name is required";
    if (!personalInfo.annualIncome.trim()) errors.annualIncome = "Annual income is required";
    if (!validatePhone(personalInfo.phone)) {
      errors.phone = "Please enter a valid phone number";
    }
    if (!personalInfo.gender) {
      errors.gender = "Gender is required";
    }
    if (!personalInfo.dob) {
      errors.dob = "Date of birth is required";
    }
    if (!personalInfo.religion) {
      errors.religion = "Religion is required";
    }
    if (!personalInfo.caste) {
      errors.caste = "Caste is required";
    }
    if (!personalInfo.domicileState) {
      errors.domicileState = "Domicile state is required";
    }
    if (!personalInfo.aadharFront) {
      errors.aadharFront = "Front side of Aadhar is required";
    }
    if (!personalInfo.aadharBack) {
      errors.aadharBack = "Back side of Aadhar is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      setToastMessage("Permission to access gallery is required");
      setToastType("error");
      setShowToast(true);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPersonalInfo(prev => ({ ...prev, profileImageUrl: result.assets[0].uri }));
      setHasUnsavedChanges(true);
    }
  };

  const handleAadharUpload = async (side: 'front' | 'back') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = {
          name: result.assets[0].name,
          uri: result.assets[0].uri,
        };

        setPersonalInfo(prev => ({
          ...prev,
          [side === 'front' ? 'aadharFront' : 'aadharBack']: file
        }));
        setHasUnsavedChanges(true);
      }
    } catch (err) {
      setToastMessage("Failed to pick document");
      setToastType("error");
      setShowToast(true);
    }
  };

  const removeAadharFile = (side: 'front' | 'back') => {
    setPersonalInfo(prev => ({
      ...prev,
      [side === 'front' ? 'aadharFront' : 'aadharBack']: null,
    }));
    setHasUnsavedChanges(true);
  };

  const handleSavePersonal = async () => {
    if (!validatePersonalInfo()) {
      setToastMessage("Please fix the errors before saving");
      setToastType("error");
      setShowToast(true);
      return;
    }
    setIsSaving(true);
    try {
      const authDataStr = await AsyncStorage.getItem("authData");
      if (!authDataStr) throw new Error("Authentication session expired");

      const authData = JSON.parse(authDataStr);
      if (!authData.token) throw new Error("Invalid session token");

      const payload = { ...personalInfo, phone: personalInfo.phone.replace(/\D/g, "") };
      const response = await updateUserProfile(authData.token, payload);

      if (response.success) {
        setHasUnsavedChanges(false);
        setToastMessage("Personal information updated successfully");
        setToastType("success");
        setShowToast(true);

        // Navigate back to dashboard after a delay
        setTimeout(() => {
          router.replace("/student-dashboard");
        }, 1500);
      } else {
        setToastMessage(response.error || "Failed to update profile");
        setToastType("error");
        setShowToast(true);
      }
    } catch (error: any) {
      setToastMessage(error.message || "Something went wrong");
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const formattedDate = selectedDate.toLocaleDateString('en-GB'); // DD/MM/YYYY
      handlePersonalInfoChange("dob", formattedDate);
    }
  };

  const SelectionModal = ({ visible, onClose, title, options, selected, onSelect }: any) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 350 }}>
            {options.map((opt: string) => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionRow, selected === opt && styles.optionSelected, { borderBottomColor: colors.border }]}
                onPress={() => onSelect(opt)}
              >
                <Text
                  style={[styles.optionText, { color: colors.text }, selected === opt && styles.optionTextSelected]}
                >
                  {opt}
                </Text>
                {selected === opt && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );


  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      <AppHeader title="Personal Information" onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Picture Section */}
          <View style={styles.profileSection}>
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={handleImagePick}
              activeOpacity={0.8}
            >
              {personalInfo.profileImageUrl ? (
                <Image
                  source={{ uri: personalInfo.profileImageUrl }}
                  style={[styles.profileImage, { borderColor: isDark ? colors.card : "#fff" }]}
                />
              ) : (
                <View style={[styles.placeholderContainer, { backgroundColor: isDark ? colors.surface : "#F0F0F0", borderColor: isDark ? colors.card : "#fff" }]}>
                  <Ionicons name="person" size={50} color={isDark ? "#666" : "#999"} />
                </View>
              )}
              <View style={[styles.editBadge, { borderColor: isDark ? colors.card : "#fff" }]}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>

          </View>

          {/* Section 1: Personal Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Details</Text>
              {hasUnsavedChanges && (
                <View style={styles.unsavedBadge}>
                  <Text style={styles.unsavedText}>Unsaved</Text>
                </View>
              )}
            </View>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CustomTextInput
                label="Username"
                value={personalInfo.username}
                onChangeText={(val) => handlePersonalInfoChange("username", val)}
                style={styles.input}
                editable={false} // Usually usernames are not editable after creation
              />
              <CustomTextInput
                label="Full Name *"
                value={personalInfo.fullName}
                onChangeText={(val) => handlePersonalInfoChange("fullName", val)}
                style={styles.input}
                error={validationErrors.fullName}
              />

              <CustomTextInput
                label="First Name"
                value={personalInfo.firstName}
                onChangeText={(val) => handlePersonalInfoChange("firstName", val)}
                style={[styles.input, { flex: 1, marginRight: 8 }]}
              />
              <CustomTextInput
                label="Last Name"
                value={personalInfo.lastName}
                onChangeText={(val) => handlePersonalInfoChange("lastName", val)}
                style={[styles.input, { flex: 1 }]}
              />

              <CustomTextInput
                label="Email Address *"
                value={personalInfo.email}
                onChangeText={(val) => handlePersonalInfoChange("email", val)}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                error={validationErrors.email}
              />
              <CustomTextInput
                label="Phone Number *"
                value={personalInfo.phone}
                onChangeText={(val) => handlePersonalInfoChange("phone", val)}
                keyboardType="phone-pad"
                style={styles.input}
                error={validationErrors.phone}
              />
            </View>
          </View>

          {/* Section: Family Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Family Details</Text>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CustomTextInput
                label="Father's Name *"
                value={personalInfo.fatherName}
                onChangeText={(val: string) => handlePersonalInfoChange("fatherName", val)}
                style={styles.input}
                error={validationErrors.fatherName}
              />
              <CustomTextInput
                label="Mother's Name *"
                value={personalInfo.motherName}
                onChangeText={(val: string) => handlePersonalInfoChange("motherName", val)}
                style={styles.input}
                error={validationErrors.motherName}
              />
              <CustomTextInput
                label="Annual Income *"
                value={personalInfo.annualIncome}
                onChangeText={(val: string) => handlePersonalInfoChange("annualIncome", val)}
                keyboardType="numeric"
                style={styles.input}
                error={validationErrors.annualIncome}
              />
            </View>
          </View>

          {/* Section 2: Basic Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Basic Details</Text>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Gender *</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }, validationErrors.gender && styles.selectorError]}
                  onPress={() => setShowGenderPicker(true)}
                >
                  <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.gender && styles.placeholderText]}>
                    {personalInfo.gender || "Choose..."}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {validationErrors.gender && (
                  <Text style={styles.errorText}>{validationErrors.gender}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Date of Birth *</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }, validationErrors.dob && styles.selectorError]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.dob && styles.placeholderText]}>
                    {personalInfo.dob || "DD/MM/YYYY"}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {validationErrors.dob && (
                  <Text style={styles.errorText}>{validationErrors.dob}</Text>
                )}
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={personalInfo.dob ? new Date(personalInfo.dob.split('/').reverse().join('-')) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant={isDark ? "dark" : "light"}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Religion *</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }, validationErrors.religion && styles.selectorError]}
                  onPress={() => setShowReligionPicker(true)}
                >
                  <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.religion && styles.placeholderText]}>
                    {personalInfo.religion || "Choose..."}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {validationErrors.religion && (
                  <Text style={styles.errorText}>{validationErrors.religion}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Caste *</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }, validationErrors.caste && styles.selectorError]}
                  onPress={() => setShowCastePicker(true)}
                >
                  <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.caste && styles.placeholderText]}>
                    {personalInfo.caste || "Choose..."}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {validationErrors.caste && (
                  <Text style={styles.errorText}>{validationErrors.caste}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Domicile State *</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }, validationErrors.domicileState && styles.selectorError]}
                  onPress={() => setShowDomicileStatePicker(true)}
                >
                  <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.domicileState && styles.placeholderText]}>
                    {personalInfo.domicileState || "Choose..."}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {validationErrors.domicileState && (
                  <Text style={styles.errorText}>{validationErrors.domicileState}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>District</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }]}
                  onPress={() => setShowDistrictPicker(true)}
                >
                  <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.district && styles.placeholderText]}>
                    {personalInfo.district || "Choose..."}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <CustomTextInput
                label="Address"
                value={personalInfo.address}
                onChangeText={(val) => handlePersonalInfoChange("address", val)}
                style={styles.input}
              />

              <CustomTextInput
                label="City"
                value={personalInfo.city}
                onChangeText={(val) => handlePersonalInfoChange("city", val)}
                style={[styles.input, { flex: 1, marginRight: 8 }]}
              />
              <CustomTextInput
                label="Village"
                value={personalInfo.village}
                onChangeText={(val) => handlePersonalInfoChange("village", val)}
                style={[styles.input, { flex: 1 }]}
              />

            </View>
          </View>



          {/* Section 3: Documents Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Aadhar Card Verification</Text>
            </View>
            <View style={styles.row}>
              {/* Front Side */}
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadLabel}>Front Side *</Text>
                <View style={[styles.uploadCard, { backgroundColor: colors.card, borderColor: colors.border }, validationErrors.aadharFront && styles.selectorError]}>
                  {personalInfo.aadharFront ? (
                    <View style={[styles.fileItemCompact, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f0f7ff" }]}>
                      <Ionicons name="document-text" size={20} color={colors.primary} />
                      <Text style={[styles.fileNameSmall, { color: colors.text }]} numberOfLines={1}>{personalInfo.aadharFront.name}</Text>
                      <TouchableOpacity onPress={() => removeAadharFile('front')}>
                        <Ionicons name="close-circle" size={18} color="#FF5252" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.uploadZoneSmall}
                      onPress={() => handleAadharUpload('front')}
                    >
                      <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                      <Text style={[styles.uploadZoneTextSmall, { color: colors.primary }]}>Upload Front</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {validationErrors.aadharFront && (
                  <Text style={styles.errorText}>{validationErrors.aadharFront}</Text>
                )}
              </View>

              {/* Back Side */}
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadLabel}>Back Side *</Text>
                <View style={[styles.uploadCard, { backgroundColor: colors.card, borderColor: colors.border }, validationErrors.aadharBack && styles.selectorError]}>
                  {personalInfo.aadharBack ? (
                    <View style={[styles.fileItemCompact, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f0f7ff" }]}>
                      <Ionicons name="document-text" size={20} color={colors.primary} />
                      <Text style={[styles.fileNameSmall, { color: colors.text }]} numberOfLines={1}>{personalInfo.aadharBack.name}</Text>
                      <TouchableOpacity onPress={() => removeAadharFile('back')}>
                        <Ionicons name="close-circle" size={18} color="#FF5252" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.uploadZoneSmall}
                      onPress={() => handleAadharUpload('back')}
                    >
                      <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                      <Text style={[styles.uploadZoneTextSmall, { color: colors.primary }]}>Upload Back</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {validationErrors.aadharBack && (
                  <Text style={styles.errorText}>{validationErrors.aadharBack}</Text>
                )}
              </View>
            </View>
            <Text style={[styles.helperTextUnder, { color: colors.textSecondary }]}>Supported: PDF, JPG, PNG (Max 5MB)</Text>
          </View>

          {/* Save Button */}
          <View style={[styles.section, { marginTop: 0 }]}>
            <Button
              title={isSaving ? "Saving..." : "Save All Changes"}
              onPress={handleSavePersonal}
              variant="primary"
              style={styles.saveButton}
              disabled={isSaving || !hasUnsavedChanges}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        message={toastMessage}
        type={toastType}
        visible={showToast}
        onHide={() => setShowToast(false)}
        duration={3000}
      />

      <SelectionModal
        visible={showReligionPicker}
        onClose={() => setShowReligionPicker(false)}
        title="Select Religion"
        options={RELIGION_OPTIONS}
        selected={personalInfo.religion}
        onSelect={(val: string) => {
          handlePersonalInfoChange("religion", val);
          setShowReligionPicker(false);
        }}
      />
      <SelectionModal
        visible={showCastePicker}
        onClose={() => setShowCastePicker(false)}
        title="Select Caste"
        options={CASTE_OPTIONS}
        selected={personalInfo.caste}
        onSelect={(val: string) => {
          handlePersonalInfoChange("caste", val);
          setShowCastePicker(false);
        }}
      />
      <SelectionModal
        visible={showDomicileStatePicker}
        onClose={() => setShowDomicileStatePicker(false)}
        title="Select Domicile State"
        options={DOMICILE_STATE_OPTIONS}
        selected={personalInfo.domicileState}
        onSelect={(val: string) => {
          handlePersonalInfoChange("domicileState", val);
          setShowDomicileStatePicker(false);
        }}
      />
      <SelectionModal
        visible={showDistrictPicker}
        onClose={() => setShowDistrictPicker(false)}
        title="Select District"
        options={DISTRICT_OPTIONS}
        selected={personalInfo.district}
        onSelect={(val: string) => {
          handlePersonalInfoChange("district", val);
          setShowDistrictPicker(false);
        }}
      />
      <SelectionModal
        visible={showGenderPicker}
        onClose={() => setShowGenderPicker(false)}
        title="Select Gender"
        options={GENDER_OPTIONS}
        selected={personalInfo.gender}
        onSelect={(val: string) => {
          handlePersonalInfoChange("gender", val);
          setShowGenderPicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: "#333", // Will be overridden by inline style
  },
  unsavedBadge: {
    backgroundColor: "#FFE0B2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unsavedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E65100",
  },
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.98)", // Will be overridden by inline style
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.08)", // Will be overridden by inline style
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
    height: 56,
    borderRadius: 16,
  },
  languageCard: {
    backgroundColor: "rgba(255, 255, 255, 0.98)", // Will be overridden by inline style
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.08)", // Will be overridden by inline style
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  languageRow: {
    gap: 10,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f8f8f8", // Will be overridden by inline style
    borderWidth: 2,
    borderColor: "transparent", // Will be overridden by inline style
    gap: 8,
  },
  langPillActive: {
    backgroundColor: "#333", // Will be overridden by inline style
    borderColor: "#333", // Will be overridden by inline style
  },
  langFlag: {
    fontSize: 20,
  },
  langPillText: {
    color: "#333", // Will be overridden by inline style
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
  },
  langPillTextActive: {
    color: "#fff", // Will be overridden by inline style
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 32,
  },
  imageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#fff", // Will be overridden by inline style
  },
  placeholderContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F0F0F0", // Will be overridden by inline style
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff", // Will be overridden by inline style
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#4CAF50", // Will be overridden by inline style
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff", // Will be overridden by inline style
  },
  profileInfo: {
    alignItems: "center",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333", // Will be overridden by inline style
    marginBottom: 4,
  },
  uploadText: {
    fontSize: 14,
    color: "#333", // Will be overridden by inline style
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  // Selection Styles
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333", // Will be overridden by inline style
    marginBottom: 8,
    marginLeft: 4,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.98)", // Will be overridden by inline style
    borderWidth: 1.5,
    borderColor: "rgba(51, 51, 51, 0.15)", // Will be overridden by inline style
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    height: 56,
  },
  selectorError: {
    borderColor: "#EF4444",
  },
  selectorText: {
    fontSize: 16,
    color: "#333", // Will be overridden by inline style
    fontWeight: "500",
  },
  placeholderText: {
    color: "#999",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: "500",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    backgroundColor: "#fff", // Will be overridden by inline style
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: "60%",
    paddingTop: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0", // Will be overridden by inline style
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0", // Will be overridden by inline style
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a", // Will be overridden by inline style
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f9f9f9", // Will be overridden by inline style
  },
  optionSelected: {
    backgroundColor: "rgba(0, 86, 210, 0.05)",
  },
  optionText: {
    fontSize: 15,
    color: "#222", // Will be overridden by inline style
  },
  optionTextSelected: {
    color: "#0056D2", // Will be overridden by inline style
    fontWeight: "600",
  },
  // Document Upload Styles
  uploadCard: {
    backgroundColor: "rgba(255, 255, 255, 0.98)", // Will be overridden by inline style
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.08)", // Will be overridden by inline style
  },
  uploadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  uploadStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  folderText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#0056D2", // Will be overridden by inline style
  },
  uploadActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  uploadZone: {
    borderWidth: 1.5,
    borderColor: "rgba(0, 86, 210, 0.2)", // Will be overridden by inline style
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "rgba(0, 86, 210, 0.02)", // Will be overridden by inline style
    paddingVertical: 32,
    alignItems: "center",
  },
  uploadZoneContent: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff", // Will be overridden by inline style
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadZoneText: {
    fontSize: 15,
    color: "#333", // Will be overridden by inline style
    fontWeight: "600",
    textAlign: "center",
  },
  uploadZoneSubtext: {
    fontSize: 12,
    color: "#666", // Will be overridden by inline style
    marginTop: 6,
    textAlign: "center",
  },
  fileList: {
    marginTop: 16,
    gap: 8,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FB", // Will be overridden by inline style
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEF0F4", // Will be overridden by inline style
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  fileName: {
    fontSize: 13,
    color: "#333", // Will be overridden by inline style
    marginLeft: 10,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 12,
    color: "#666", // Will be overridden by inline style
    fontWeight: "500",
  },
  uploadLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555", // Will be overridden by inline style
    marginBottom: 8,
    textAlign: 'center'
  },
  uploadZoneSmall: {
    width: '100%',
    height: 80,
    borderWidth: 1.5,
    borderColor: "rgba(0, 86, 210, 0.15)", // Will be overridden by inline style
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "rgba(0, 86, 210, 0.02)", // Will be overridden by inline style
    justifyContent: "center",
    alignItems: "center",
  },
  uploadZoneTextSmall: {
    fontSize: 12,
    color: "#0056D2", // Will be overridden by inline style
    fontWeight: "600",
    marginTop: 4,
  },
  fileItemCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FB", // Will be overridden by inline style
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEF0F4", // Will be overridden by inline style
    height: 80,
  },
  fileNameSmall: {
    fontSize: 11,
    color: "#333", // Will be overridden by inline style
    flex: 1,
    marginHorizontal: 8,
    fontWeight: "500",
  },
  helperTextUnder: {
    fontSize: 11,
    color: "#999", // Will be overridden by inline style
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic'
  },
});






