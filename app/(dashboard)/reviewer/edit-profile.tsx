import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { DropdownData, getDropdownDefinitions, getUserProfile, updateUserProfile, uploadProfileImage } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";

import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ValidationErrors {
  [key: string]: string;
}





export default function ReviewerProfilePersonalScreen() {
  const { isDark, colors } = useTheme();
  const [dropdownData, setDropdownData] = useState<DropdownData | null>(null);

  const getOptionsByShortname = useCallback((shortname: string) => {
    if (!dropdownData) return [];

    // Search in course_fields
    const courseField = dropdownData.course_fields?.find(
      (field: any) => field.shortname === shortname || field.shortname.trim() === shortname.trim()
    );
    if (courseField) return courseField.options;

    // Search in user_fields
    const userField = dropdownData.user_fields?.find(
      (field: any) => field.shortname === shortname || field.shortname.trim() === shortname.trim()
    );
    if (userField) return userField.options;

    return [];
  }, [dropdownData]);
  const insets = useSafeAreaInsets();

  const RELIGION_OPTIONS = getOptionsByShortname('Religion').map(o => o.label);
  const CASTE_OPTIONS = getOptionsByShortname('Caste').map(o => o.label);
  const GENDER_OPTIONS = getOptionsByShortname('Gender').map(o => o.label);
  const SPECIAL_CATEGORY_OPTIONS = getOptionsByShortname('category').map(o => o.label);
  const DISTRICT_OPTIONS = getOptionsByShortname('district').map(o => o.label);
  const DOMICILE_STATE_OPTIONS = getOptionsByShortname('State').map(o => o.label);
  const ANNUAL_INCOME_OPTIONS = getOptionsByShortname('Family_income').map(o => o.label);
  const SCHEME_OPTIONS = getOptionsByShortname('schemename').map(o => o.label);
  const REGISTERING_AS_OPTIONS = getOptionsByShortname('Registering_as').map(o => o.label);
  const YEAR_OF_COURSE_OPTIONS = getOptionsByShortname('year_of_course').map(o => o.label);
  const BOARD_12TH_OPTIONS = getOptionsByShortname('12th_board').map(o => o.label);
  const STREAM_12TH_OPTIONS = getOptionsByShortname('stream_in_12th').map(o => o.label);
  const PASSING_YEAR_12TH_OPTIONS = getOptionsByShortname('12th_passing_year').map(o => o.label);
  const APPLICATION_YEAR_OPTIONS = getOptionsByShortname('applicationyear').map(o => o.label);
  const SESSION_OPTIONS = getOptionsByShortname('session').map(o => o.label);
  const PASSING_10TH_OPTIONS = getOptionsByShortname('passing_10th').map(o => o.label);
  const APPLICATION_TYPE_OPTIONS = getOptionsByShortname('application_type').map(o => o.label);
  const COMPETITIVE_EXAM_OPTIONS = getOptionsByShortname('competitive_exam').map(o => o.label);
  const COMPETITIVE_EXAM_NAME_OPTIONS = getOptionsByShortname('competitive_exam_name').map(o => o.label);

  const [personalInfo, setPersonalInfo] = useState({
    // General / Personal
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    religion: "",
    caste: "",
    city: "",
    profileImageUrl: "",
    // Family
    fatherName: "",
    motherName: "",
    annualIncome: "",
    // New Fields
    session: "",
    yearOfCourse: "",
    passing10th: "",
    board12th: "",
    stream12th: "",
    applicationYear: "",
    registeringAs: "",
    schemeName: "",
    passingYear12th: "",
    address: "",
    domicileState: "",
    specialCategory: "",
    domicileDistrict: "",
    percentage12: "",
    collegeName: "",
    collegeLocation: "",
    university: "",
    currentCourse: "",
    percentage10: "",
    marks12: "",
    application_type: "",
    competitive_exam: "",
    competitive_exam_name: "",
    village: "",
    whatsapp_number: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<any>(null); // Track the selected image file
  const [originalProfileImageUrl, setOriginalProfileImageUrl] = useState(""); // Track original image URL
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("error");

  const [showReligionPicker, setShowReligionPicker] = useState(false);
  const [showCastePicker, setShowCastePicker] = useState(false);

  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showIncomePicker, setShowIncomePicker] = useState(false);
  const [showSchemePicker, setShowSchemePicker] = useState(false);
  const [showRegisteringAsPicker, setShowRegisteringAsPicker] = useState(false);
  const [showYearOfCoursePicker, setShowYearOfCoursePicker] = useState(false);
  const [showBoard12thPicker, setShowBoard12thPicker] = useState(false);
  const [showStream12thPicker, setShowStream12thPicker] = useState(false);
  const [showPassingYear12thPicker, setShowPassingYear12thPicker] = useState(false);
  const [showApplicationYearPicker, setShowApplicationYearPicker] = useState(false);
  const [showDomicileStatePicker, setShowDomicileStatePicker] = useState(false);
  const [showSpecialCategoryPicker, setShowSpecialCategoryPicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [showPassing10thPicker, setShowPassing10thPicker] = useState(false);
  const [showApplicationTypePicker, setShowApplicationTypePicker] = useState(false);
  const [showCompetitiveExamPicker, setShowCompetitiveExamPicker] = useState(false);
  const [showCompetitiveExamNamePicker, setShowCompetitiveExamNamePicker] = useState(false);




  // Validation Functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateName = (name: string): boolean => {
    const nameRegex = /^[A-Za-z\s.-]+$/;
    return nameRegex.test(name.trim());
  };


  const fetchUserProfile = useCallback(async () => {
    setIsProfileLoading(true);
    try {
      const authDataStr = await AsyncStorage.getItem("authData");
      if (authDataStr) {
        const authData = JSON.parse(authDataStr);
        if (authData.token) {
          const response = await getUserProfile(authData.token);
          if (response.success && response.data && response.data.user) {
            const user = response.data.user;
            setPersonalInfo((prev) => ({
              ...prev,
              username: user.username || prev.username,
              firstName: user.firstname || prev.firstName,
              lastName: user.lastname || prev.lastName,
              email: user.email || prev.email,
              phone: (() => {
                let p = user.phone1 || user.phone || user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'phone_number')?.value || "";
                if (p === "N/A") return "";
                if (p && p.startsWith('+91')) return p.substring(3);
                if (p && p.startsWith('91') && p.length === 12) return p.substring(2);
                return p || prev.phone;
              })(),

              address: user.address || prev.address,
              city: user.city || prev.city,
              dob: user.dob
                ? (user.dob.includes('-') && user.dob.split('-')[0].length === 4
                  ? user.dob.split('-').reverse().join('/')
                  : user.dob)
                : (user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'dob')?.value
                  ? new Date(parseInt(user.customfields.find((f: any) => f.shortname.toLowerCase() === 'dob').value) * 1000).toLocaleDateString('en-GB')
                  : prev.dob),
              gender: user.gender || user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'gender')?.value || prev.gender,
              religion: user.religion || user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'religion')?.value || prev.religion,
              caste: user.caste || user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'caste')?.value || prev.caste,

              fatherName: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'father')?.value || prev.fatherName,
              motherName: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'mother')?.value || prev.motherName,
              annualIncome: user.annualincome || user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'family_income' || f.shortname.toLowerCase() === 'annualincome')?.value || prev.annualIncome,

              // New Fields Mapping
              session: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'session')?.value || prev.session,
              yearOfCourse: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'year_of_course')?.value || prev.yearOfCourse,
              passing10th: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'passing_10th')?.value || prev.passing10th,
              board12th: user.customfields?.find((f: any) => f.shortname.toLowerCase() === '12th_board')?.value || prev.board12th,
              stream12th: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'stream_in_12th')?.value || prev.stream12th,
              applicationYear: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'applicationyear')?.value || prev.applicationYear,
              registeringAs: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'registering_as')?.value || prev.registeringAs,
              schemeName: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'schemename')?.value || prev.schemeName,
              passingYear12th: user.customfields?.find((f: any) => f.shortname.toLowerCase() === '12th_passing_year')?.value || prev.passingYear12th,
              domicileState: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'state')?.value || prev.domicileState,
              specialCategory: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'category')?.value || prev.specialCategory,
              domicileDistrict: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'domicile_district')?.value || prev.domicileDistrict,
              percentage12: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'percentage_12')?.value || prev.percentage12,
              collegeName: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'college_name')?.value || prev.collegeName,
              collegeLocation: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'college_district')?.value || prev.collegeLocation,
              university: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'university')?.value || prev.university,
              currentCourse: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'course')?.value || prev.currentCourse,
              percentage10: user.customfields?.find((f: any) => f.shortname.toLowerCase() === '10th')?.value || prev.percentage10,
              marks12: (() => {
                const val = user.customfields?.find((f: any) => f.shortname.toLowerCase() === '12th_marks')?.value || "";
                return val.replace(/<[^>]*>/g, '').trim();
              })() || prev.marks12,
              application_type: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'application_type')?.value || prev.application_type,
              competitive_exam: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'competitive_exam')?.value || prev.competitive_exam,
              competitive_exam_name: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'competitive_exam_name')?.value || prev.competitive_exam_name,
              village: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'village')?.value || prev.village,
              whatsapp_number: (() => {
                const val = user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'whatsapp_number')?.value || "";
                return val.replace(/<[^>]*>/g, '').trim();
              })() || prev.whatsapp_number,

              profileImageUrl: user?.profileimageurl || "",
            }));
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  const fetchDropdowns = useCallback(async () => {
    try {
      const authDataStr = await AsyncStorage.getItem("authData");
      if (authDataStr) {
        const authData = JSON.parse(authDataStr);
        if (authData.token) {
          const response = await getDropdownDefinitions(authData.token);
          if (response.success && response.data) {
            setDropdownData(response.data);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch dropdowns:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
      fetchDropdowns();
    }, [fetchUserProfile, fetchDropdowns])
  );

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

    if (!personalInfo.firstName.trim()) {
      errors.firstName = "First name is required";
    } else if (!validateName(personalInfo.firstName)) {
      errors.firstName = "First name can only contain letters";
    }

    if (!personalInfo.lastName.trim()) {
      errors.lastName = "Last name is required";
    } else if (!validateName(personalInfo.lastName)) {
      errors.lastName = "Last name can only contain letters";
    }

    if (personalInfo.fatherName && !validateName(personalInfo.fatherName)) {
      errors.fatherName = "Father's name can only contain letters";
    }

    if (personalInfo.motherName && !validateName(personalInfo.motherName)) {
      errors.motherName = "Mother's name can only contain letters";
    }

    if (!validateEmail(personalInfo.email)) {
      errors.email = "Please enter a valid email address";
    }
    if (personalInfo.phone) {
      const cleanPhone = personalInfo.phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        errors.phone = "Enter a valid 10-digit number";
      }
    }

    if (!personalInfo.annualIncome.trim()) errors.annualIncome = "Annual income is required";

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

    if (personalInfo.percentage10) {
      const num = parseFloat(personalInfo.percentage10);
      if (isNaN(num) || num < 10 || num > 100) {
        errors.percentage10 = "Percentage must be between 10 and 100";
      }
    }

    if (personalInfo.percentage12) {
      const num = parseFloat(personalInfo.percentage12);
      if (isNaN(num) || num < 10 || num > 100) {
        errors.percentage12 = "Percentage must be between 10 and 100";
      }
    }

    if (personalInfo.marks12) {
      const num = parseFloat(personalInfo.marks12);
      if (isNaN(num) || num < 0 || num > 2000) {
        errors.marks12 = "Marks must be between 0 and 2000";
      }
    }

    // Address Validation (Optional)
    if (personalInfo.address.trim()) {
      if (personalInfo.address.trim().length < 5) {
        errors.address = "Address must be at least 5 characters";
      } else if (/^\d+$/.test(personalInfo.address.trim())) {
        errors.address = "Address cannot be only numbers";
      }
    }

    // City validation commented out as city is commented out in UI
    /*
    if (!personalInfo.city.trim()) {
      errors.city = "City is required";
    } else if (personalInfo.city.trim().length < 3) {
      errors.city = "City name must be at least 3 characters";
    } else if (/\d/.test(personalInfo.city)) {
      errors.city = "City name cannot contain numbers";
    }
    */
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);

  const handleImageOptions = () => {
    setShowImageOptions(true);
  };

  const handleTakePhoto = async () => {
    setShowImageOptions(false);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setToastMessage("Camera permission is required to take photos");
      setToastType("error");
      setShowToast(true);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setPreviewImageUri(asset.uri);
      setSelectedImageFile({
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
        mimeType: asset.type || 'image/jpeg',
      });
      setShowImagePreview(true);
    }
  };

  const handlePickFromGallery = async () => {
    setShowImageOptions(false);

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
      const asset = result.assets[0];
      setPreviewImageUri(asset.uri);
      setSelectedImageFile({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
        mimeType: asset.type || 'image/jpeg',
      });
      setShowImagePreview(true);
    }
  };

  const handleUpdateProfileImage = async () => {
    if (!selectedImageFile) return;

    setIsUploadingImage(true);
    try {
      const authDataStr = await AsyncStorage.getItem("authData");
      if (!authDataStr) throw new Error("Authentication session expired");

      const authData = JSON.parse(authDataStr);
      if (!authData.token) throw new Error("Invalid session token");

      console.log("Uploading profile image...");
      const uploadResponse = await uploadProfileImage(authData.token, selectedImageFile);

      if (uploadResponse.success && uploadResponse.data?.id) {
        const profileImageFileId = uploadResponse.data.id;
        console.log("Profile image uploaded successfully. File ID:", profileImageFileId);

        // Update profile with the new image file ID
        const payload = {
          profileImageFileId: profileImageFileId
        };

        const response = await updateUserProfile(authData.token, payload);

        if (response.success) {
          // Update UI with new image
          setPersonalInfo(prev => ({ ...prev, profileImageUrl: previewImageUri }));
          setSelectedImageFile(null);
          setShowImagePreview(false);
          setToastMessage("Profile image updated successfully");
          setToastType("success");
          setShowToast(true);
        } else {
          throw new Error(response.error || "Failed to update profile");
        }
      } else {
        throw new Error(uploadResponse.error || uploadResponse.message || "Failed to upload profile image");
      }
    } catch (error: any) {
      console.error("Image upload error:", error);
      setToastMessage(error.message || "Failed to update profile image");
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveProfileImage = async () => {
    if (!personalInfo.profileImageUrl || isRemovingImage) return;

    setIsRemovingImage(true);
    setShowImageOptions(false);
    try {
      const authDataStr = await AsyncStorage.getItem("authData");
      if (!authDataStr) throw new Error("Authentication session expired");

      const authData = JSON.parse(authDataStr);
      if (!authData.token) throw new Error("Invalid session token");

      const response = await updateUserProfile(authData.token, { profileImageFileId: 0 });
      if (response.success) {
        setPersonalInfo(prev => ({ ...prev, profileImageUrl: "" }));
        setToastMessage("Profile image removed successfully");
        setToastType("success");
        setShowToast(true);
      } else {
        throw new Error(response.error || "Failed to remove profile image");
      }
    } catch (error: any) {
      console.error("Remove image error:", error);
      setToastMessage(error.message || "Failed to remove profile image");
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsRemovingImage(false);
    }
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

      // Update profile with personal information
      const { ...rest } = personalInfo;

      // Add 91 to phone if it's just the 10-digit number
      let finalPhone = personalInfo.phone;
      if (finalPhone && finalPhone.replace(/\D/g, '').length === 10 && !finalPhone.startsWith('+')) {
        finalPhone = `91${finalPhone.replace(/\D/g, '')}`;
      } else if (finalPhone && finalPhone.startsWith('+91')) {
        finalPhone = finalPhone.replace('+91', '91');
      }

      const payload = {
        ...rest,
        phone: finalPhone,
        whatsapp_number: personalInfo.whatsapp_number ? `<p>${personalInfo.whatsapp_number}</p>` : "",
      };

      const response = await updateUserProfile(authData.token, payload);

      if (response.success) {
        setHasUnsavedChanges(false);
        setToastMessage("Personal information updated successfully");
        setToastType("success");
        setShowToast(true);
        router.back();
      } else {
        setToastMessage(response.error || "Failed to update profile");
        setToastType("error");
        setShowToast(true);
      }
    } catch (error: any) {
      console.error("Save error:", error);
      setToastMessage(error.message || "Something went wrong");
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler for iOS Modal Picker
  const onConfirmDate = (date: Date) => {
    const formattedDate = date.toLocaleDateString('en-GB'); // DD/MM/YYYY
    handlePersonalInfoChange("dob", formattedDate);
    setShowDatePicker(false);
  };

  const onCancelDate = () => {
    setShowDatePicker(false);
  };

  // Handler for Android Picker
  const onAndroidDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toLocaleDateString('en-GB'); // DD/MM/YYYY
      handlePersonalInfoChange("dob", formattedDate);
    }
  };

  const PickerRow = ({ label, value, placeholder, icon, iconColor, onPress, error }: any) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.selector,
          { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border },
          error && styles.selectorError,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.pickerIconWrap, { backgroundColor: value ? iconColor + "22" : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)") }]}>
          <Ionicons name={icon} size={16} color={value ? iconColor : colors.textSecondary} />
        </View>
        <Text
          style={[styles.selectorText, { color: colors.text, flex: 1, marginLeft: 10, marginRight: 24 }, !value && styles.placeholderText]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {value || placeholder || "Choose..."}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  const SelectionModal = ({ visible, onClose, title, options, selected, onSelect }: any) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, backgroundColor: colors.surface }]}>
          <View style={styles.imageOptionsHandle}>
            <View style={[styles.handleBar, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" }]} />
          </View>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.modalCloseBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }]}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
            {options.map((opt: string) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.optionRow,
                  selected === opt && { backgroundColor: isDark ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.06)" },
                  { borderBottomColor: colors.border },
                ]}
                onPress={() => { onSelect(opt); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, { color: colors.text, flex: 1, marginRight: 12 }, selected === opt && { color: "#7C3AED", fontWeight: "600" }]}>
                  {opt}
                </Text>
                {selected === opt ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                ) : (
                  <View style={[styles.emptyCircle, { borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" }]} />
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
              onPress={handleImageOptions}
              activeOpacity={0.85}
            >
              <View style={styles.imageContainer}>
                <LinearGradient
                  colors={["#7C3AED", "#3B82F6", "#06B6D4"]}
                  style={styles.avatarGradientRing}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={[styles.avatarInner, { backgroundColor: isDark ? colors.surface : "#fff" }]}>
                    {isProfileLoading ? (
                      <View style={[styles.placeholderInner, { backgroundColor: isDark ? colors.surface : "#F0F0F0" }]}>
                        <ActivityIndicator size="small" color="#7C3AED" />
                      </View>
                    ) : personalInfo?.profileImageUrl !== "" ? (
                      <Image
                        source={{
                          uri: personalInfo.profileImageUrl.includes('?')
                            ? `${personalInfo.profileImageUrl}&t=${Date.now()}`
                            : `${personalInfo.profileImageUrl}?t=${Date.now()}`
                        }}
                        style={styles.profileImage}
                        onError={(e) => console.log(e)}
                      />
                    ) : (
                      <View style={[styles.placeholderInner, { backgroundColor: isDark ? "rgba(124,58,237,0.15)" : "#EEF2FF" }]}>
                        <Ionicons name="person" size={52} color="#7C3AED" />
                      </View>
                    )}
                  </View>
                </LinearGradient>
                <View style={[styles.editBadge, { borderColor: isDark ? colors.background : "#fff" }]}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
            {(personalInfo.firstName || personalInfo.lastName) ? (
              <Text style={[styles.profileDisplayName, { color: colors.text }]}>
                {`${personalInfo.firstName} ${personalInfo.lastName}`.trim()}
              </Text>
            ) : null}
            <Text style={[styles.profileEditHint, { color: colors.textSecondary }]}>Tap to change photo</Text>
          </View>

          {/* Section 1: Personal Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconBadge, { backgroundColor: "#7C3AED" }]}>
                  <Ionicons name="person" size={15} color="#fff" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Details</Text>
              </View>
              {hasUnsavedChanges && (
                <View style={styles.unsavedBadge}>
                  <Text style={styles.unsavedText}>Unsaved</Text>
                </View>
              )}
            </View>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: "#7C3AED", borderLeftWidth: 4 }]}>
              <CustomTextInput
                label="Username"
                value={personalInfo.username}
                onChangeText={(val) => handlePersonalInfoChange("username", val)}
                style={styles.input}
                autoCapitalize="none"
                icon="at-outline"
                iconColor="#7C3AED" mainStyle={{ marginBottom: 0 }}
                editable={false}
              />


              <CustomTextInput
                label="First Name"
                value={personalInfo.firstName}
                onChangeText={(val) => handlePersonalInfoChange("firstName", val)}
                style={styles.input}
                error={validationErrors.firstName}
                icon="person-outline"
                iconColor="#7C3AED" mainStyle={{ marginBottom: 0 }}
              />
              <CustomTextInput
                label="Last Name"
                value={personalInfo.lastName}
                onChangeText={(val) => handlePersonalInfoChange("lastName", val)}
                style={styles.input}
                error={validationErrors.lastName}
                icon="person-outline"
                iconColor="#7C3AED" mainStyle={{ marginBottom: 0 }}
              />

              <CustomTextInput
                label="Email Address *"
                value={personalInfo.email}
                onChangeText={(val) => handlePersonalInfoChange("email", val)}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                error={validationErrors.email}
                editable={false}
                icon="mail-outline"
                iconColor="#7C3AED" mainStyle={{ marginBottom: 0 }}
              />

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
                <View
                  style={[
                    styles.phoneContainer,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9",
                      borderColor: colors.border
                    },
                    validationErrors.phone && styles.phoneError,
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", height: 48 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginRight: 10,
                        paddingRight: 10,
                        borderRightWidth: 1,
                        borderRightColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(51, 51, 51, 0.1)",
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>🇮🇳</Text>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, marginLeft: 8 }}>+91</Text>
                    </View>
                    <TextInput
                      style={[styles.phoneTextInput, { flex: 1, color: colors.text }]}
                      value={personalInfo.phone}
                      onChangeText={(text) => {
                        const numeric = text.replace(/[^0-9]/g, "");
                        if (numeric.length <= 10) {
                          handlePersonalInfoChange("phone", numeric);
                        }
                      }}
                      placeholder="Mobile Number"
                      placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : "rgba(51, 51, 51, 0.4)"}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                  </View>
                </View>
                {validationErrors.phone && (
                  <Text style={styles.errorText}>{validationErrors.phone}</Text>
                )}
              </View>

            </View>
          </View>

          {/* Section 2: Basic Details */}
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { marginBottom: 10 }]}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconBadge, { backgroundColor: "#059669" }]}>
                  <Ionicons name="home" size={15} color="#fff" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Details</Text>
              </View>
            </View>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: "#059669", borderLeftWidth: 4 }]}>
              <View style={[styles.inputGroup, { marginBottom: 10 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>WhatsApp Number</Text>
                <View
                  style={[
                    styles.phoneContainer,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9",
                      borderColor: colors.border
                    }
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", height: 48 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginRight: 10,
                        paddingRight: 10,
                        borderRightWidth: 1,
                        borderRightColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(51, 51, 51, 0.1)",
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>🇮🇳</Text>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, marginLeft: 8 }}>+91</Text>
                    </View>
                    <TextInput
                      style={[styles.phoneTextInput, { flex: 1, color: colors.text }]}
                      value={personalInfo.whatsapp_number}
                      onChangeText={(text) => {
                        const numeric = text.replace(/[^0-9]/g, "");
                        if (numeric.length <= 10) {
                          handlePersonalInfoChange("whatsapp_number", numeric);
                        }
                      }}
                      placeholder="e.g. 9876543210"
                      placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : "rgba(51, 51, 51, 0.4)"}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                  </View>
                </View>
              </View>
              {/* <CustomTextInput
                label="Village / City"
                value={personalInfo.village}
                onChangeText={(val) => handlePersonalInfoChange("village", val)}
                style={styles.input}
                placeholder="Enter Village Name"
                icon="location-outline"
                iconColor="#059669" mainStyle={{ marginBottom: 0 }}
              /> */}


              {/* <PickerRow
                label="Domicile State"
                value={personalInfo.domicileState}
                icon="flag-outline"
                iconColor="#059669"
                onPress={() => setShowDomicileStatePicker(true)}
              />

              <PickerRow
                label="Domicile District"
                value={personalInfo.domicileDistrict}
                icon="map-outline"
                iconColor="#059669"
                onPress={() => setShowDistrictPicker(true)}
              /> */}




              <PickerRow
                label="Gender *"
                value={personalInfo.gender}
                icon="body-outline"
                iconColor="#059669"
                onPress={() => setShowGenderPicker(true)}
                error={validationErrors.gender}
              />

              <PickerRow
                label="Date of Birth *"
                value={personalInfo.dob}
                placeholder="DD/MM/YYYY"
                icon="calendar-outline"
                iconColor="#059669"
                onPress={() => setShowDatePicker(true)}
                error={validationErrors.dob}
              />



              {Platform.OS === 'ios' ? (
                <DateTimePickerModal
                  isVisible={showDatePicker}
                  mode="date"
                  display="spinner"
                  locale="en-GB"
                  onConfirm={onConfirmDate}
                  onCancel={onCancelDate}
                  date={personalInfo.dob ? new Date(personalInfo.dob.split('/').reverse().join('-')) : new Date()}
                  maximumDate={new Date()}
                  fullscreen={true}

                />
              ) : (
                showDatePicker && (
                  <DateTimePicker
                    value={personalInfo.dob ? new Date(personalInfo.dob.split('/').reverse().join('-')) : new Date()}
                    mode="date"
                    display="default"
                    themeVariant={isDark ? "dark" : "light"}
                    onChange={onAndroidDateChange}
                    maximumDate={new Date()}
                  />
                )
              )}

              {/* <PickerRow
                label="Religion *"
                value={personalInfo.religion}
                icon="heart-circle-outline"
                iconColor="#059669"
                onPress={() => setShowReligionPicker(true)}
                error={validationErrors.religion}
              />

              <PickerRow
                label="Caste *"
                value={personalInfo.caste}
                icon="layers-outline"
                iconColor="#059669"
                onPress={() => setShowCastePicker(true)}
                error={validationErrors.caste}
              /> */}




              <CustomTextInput
                label="Address"
                value={personalInfo.address}
                onChangeText={(val) => handlePersonalInfoChange("address", val)}
                style={styles.input}
                placeholder="Enter Address"
                error={validationErrors.address}
                icon="location-outline"
                iconColor="#059669" mainStyle={{ marginBottom: 0 }}
              />

              {/* <CustomTextInput
                label="City"
                value={personalInfo.city}
                onChangeText={(val) => handlePersonalInfoChange("city", val)}
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Enter City"
                error={validationErrors.city}
                icon="business-outline"
                iconColor="#059669" mainStyle={{ marginBottom: 0 }}
              /> */}
              {/* Village removed as requested */}
            </View>
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

          {/* <View style={{ height: 40 }} /> */}
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
        visible={showSessionPicker}
        onClose={() => setShowSessionPicker(false)}
        title="Select Session"
        options={SESSION_OPTIONS}
        selected={personalInfo.session}
        onSelect={(val: string) => {
          handlePersonalInfoChange("session", val);
          setShowSessionPicker(false);
        }}
      />

      <SelectionModal
        visible={showPassing10thPicker}
        onClose={() => setShowPassing10thPicker(false)}
        title="Select 10th Passing Year"
        options={PASSING_10TH_OPTIONS}
        selected={personalInfo.passing10th}
        onSelect={(val: string) => {
          handlePersonalInfoChange("passing10th", val);
          setShowPassing10thPicker(false);
        }}
      />

      <SelectionModal
        visible={showIncomePicker}
        onClose={() => setShowIncomePicker(false)}
        title="Select Annual Income"
        options={ANNUAL_INCOME_OPTIONS}
        selected={personalInfo.annualIncome}
        onSelect={(val: string) => {
          handlePersonalInfoChange("annualIncome", val);
          setShowIncomePicker(false);
        }}
      />

      <SelectionModal
        visible={showSchemePicker}
        onClose={() => setShowSchemePicker(false)}
        title="Select Scheme"
        options={SCHEME_OPTIONS}
        selected={personalInfo.schemeName}
        onSelect={(val: string) => {
          handlePersonalInfoChange("schemeName", val);
          setShowSchemePicker(false);
        }}
      />

      <SelectionModal
        visible={showRegisteringAsPicker}
        onClose={() => setShowRegisteringAsPicker(false)}
        title="Registering As"
        options={REGISTERING_AS_OPTIONS}
        selected={personalInfo.registeringAs}
        onSelect={(val: string) => {
          handlePersonalInfoChange("registeringAs", val);
          setShowRegisteringAsPicker(false);
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
        visible={showSpecialCategoryPicker}
        onClose={() => setShowSpecialCategoryPicker(false)}
        title="Select Special Category"
        options={SPECIAL_CATEGORY_OPTIONS}
        selected={personalInfo.specialCategory}
        onSelect={(val: string) => {
          handlePersonalInfoChange("specialCategory", val);
          setShowSpecialCategoryPicker(false);
        }}
      />

      <SelectionModal
        visible={showDistrictPicker}
        onClose={() => setShowDistrictPicker(false)}
        title="Select Domicile District"
        options={DISTRICT_OPTIONS}
        selected={personalInfo.domicileDistrict}
        onSelect={(val: string) => {
          handlePersonalInfoChange("domicileDistrict", val);
          setShowDistrictPicker(false);
        }}
      />

      <SelectionModal
        visible={showYearOfCoursePicker}
        onClose={() => setShowYearOfCoursePicker(false)}
        title="Select Year of Course"
        options={YEAR_OF_COURSE_OPTIONS}
        selected={personalInfo.yearOfCourse}
        onSelect={(val: string) => {
          handlePersonalInfoChange("yearOfCourse", val);
          setShowYearOfCoursePicker(false);
        }}
      />

      <SelectionModal
        visible={showBoard12thPicker}
        onClose={() => setShowBoard12thPicker(false)}
        title="Select 12th Board"
        options={BOARD_12TH_OPTIONS}
        selected={personalInfo.board12th}
        onSelect={(val: string) => {
          handlePersonalInfoChange("board12th", val);
          setShowBoard12thPicker(false);
        }}
      />

      <SelectionModal
        visible={showStream12thPicker}
        onClose={() => setShowStream12thPicker(false)}
        title="Select Stream in 12th"
        options={STREAM_12TH_OPTIONS}
        selected={personalInfo.stream12th}
        onSelect={(val: string) => {
          handlePersonalInfoChange("stream12th", val);
          setShowStream12thPicker(false);
        }}
      />

      <SelectionModal
        visible={showPassingYear12thPicker}
        onClose={() => setShowPassingYear12thPicker(false)}
        title="Select 12th Passing Year"
        options={PASSING_YEAR_12TH_OPTIONS}
        selected={personalInfo.passingYear12th}
        onSelect={(val: string) => {
          handlePersonalInfoChange("passingYear12th", val);
          setShowPassingYear12thPicker(false);
        }}
      />

      <SelectionModal
        visible={showApplicationYearPicker}
        onClose={() => setShowApplicationYearPicker(false)}
        title="Select Application Year"
        options={APPLICATION_YEAR_OPTIONS}
        selected={personalInfo.applicationYear}
        onSelect={(val: string) => {
          handlePersonalInfoChange("applicationYear", val);
          setShowApplicationYearPicker(false);
        }}
      />

      <SelectionModal
        visible={showApplicationTypePicker}
        onClose={() => setShowApplicationTypePicker(false)}
        title="Select Application Type"
        options={APPLICATION_TYPE_OPTIONS}
        selected={personalInfo.application_type}
        onSelect={(val: string) => {
          handlePersonalInfoChange("application_type", val);
          setShowApplicationTypePicker(false);
        }}
      />

      <SelectionModal
        visible={showCompetitiveExamPicker}
        onClose={() => setShowCompetitiveExamPicker(false)}
        title="Preparing For Competitive Exam"
        options={COMPETITIVE_EXAM_OPTIONS}
        selected={personalInfo.competitive_exam}
        onSelect={(val: string) => {
          handlePersonalInfoChange("competitive_exam", val);
          setShowCompetitiveExamPicker(false);
        }}
      />

      <SelectionModal
        visible={showCompetitiveExamNamePicker}
        onClose={() => setShowCompetitiveExamNamePicker(false)}
        title="Select Competitive Exam Name"
        options={COMPETITIVE_EXAM_NAME_OPTIONS}
        selected={personalInfo.competitive_exam_name}
        onSelect={(val: string) => {
          handlePersonalInfoChange("competitive_exam_name", val);
          setShowCompetitiveExamNamePicker(false);
        }}
      />

      {/* Image Options Modal */}
      <Modal
        visible={showImageOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowImageOptions(false)}
            activeOpacity={1}
          />
          <View style={{ paddingHorizontal: 16, paddingBottom: (insets.bottom || 20) + 10, width: "100%", position: "absolute", bottom: 0 }}>
            <View style={{ backgroundColor: colors.card, borderRadius: 20, overflow: "hidden", marginBottom: 12 }}>
              <View style={{ alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textSecondary }}>Change Profile Picture</Text>
              </View>

              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
                onPress={handleTakePhoto}
                activeOpacity={0.7}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0, 86, 210, 0.08)", justifyContent: "center", alignItems: "center", marginRight: 16 }}>
                  <Ionicons name="camera" size={22} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 17, fontWeight: "500", color: colors.text }}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
                onPress={handlePickFromGallery}
                activeOpacity={0.7}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0, 86, 210, 0.08)", justifyContent: "center", alignItems: "center", marginRight: 16 }}>
                  <Ionicons name="images" size={22} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 17, fontWeight: "500", color: colors.text }}>Choose from Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", padding: 16, opacity: !personalInfo.profileImageUrl || isRemovingImage ? 0.5 : 1 }}
                onPress={handleRemoveProfileImage}
                activeOpacity={0.7}
                disabled={!personalInfo.profileImageUrl || isRemovingImage}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(239, 68, 68, 0.08)", justifyContent: "center", alignItems: "center", marginRight: 16 }}>
                  <Ionicons name="trash" size={22} color="#ef4444" />
                </View>
                <Text style={{ fontSize: 17, fontWeight: "500", color: "#ef4444" }}>
                  {isRemovingImage ? "Removing..." : "Remove Photo"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, alignItems: "center" }}
              onPress={() => setShowImageOptions(false)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: colors.primary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={showImagePreview}
        transparent
        animationType="slide"
        onRequestClose={() => !isUploadingImage && setShowImagePreview(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => !isUploadingImage && setShowImagePreview(false)}
            activeOpacity={1}
            disabled={isUploadingImage}
          />
          <View style={[styles.imagePreviewContent, { backgroundColor: colors.surface, paddingBottom: insets.bottom || 20 }]}>
            <View style={styles.imageOptionsHandle}>
              <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
            </View>

            <View style={[styles.imagePreviewHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.imagePreviewTitle, { color: colors.text }]}>Preview</Text>
              {!isUploadingImage && (
                <TouchableOpacity onPress={() => setShowImagePreview(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.imagePreviewBody}>
              {previewImageUri ? (
                <Image
                  source={{ uri: previewImageUri }}
                  style={styles.previewImage}
                />
              ) : null}
            </View>

            <View style={styles.imagePreviewFooter}>
              <Button
                title={isUploadingImage ? "Uploading..." : "Update Profile Image"}
                onPress={handleUpdateProfileImage}
                disabled={isUploadingImage}
                loading={isUploadingImage}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
    </View >
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
    color: "#333",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
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
  avatarGradientRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: "center",
    alignItems: "center",
  },
  profileDisplayName: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 14,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  profileEditHint: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500",
  },
  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  placeholderContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#7C3AED",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
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
  phoneContainer: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  phoneError: {
    borderColor: "#EF4444",
  },
  phoneInputContainer: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    margin: 0,
    height: 48,
    width: '100%',
  },
  phoneTextContainer: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    margin: 0,
    height: 48,
  },
  phoneTextInput: {
    fontSize: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
    height: 48,
  },
  phoneCodeText: {
    fontSize: 16,
    backgroundColor: "transparent",
  },
  phoneFlagButton: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    margin: 0,
  },
  countryPickerButton: {
    backgroundColor: "transparent",
    width: 70,
  },
  // Image Options Modal Styles
  imageOptionsContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
    position: "absolute",
    bottom: 0,
  },
  imageOptionsHandle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
  },
  imageOptionsTitle: {
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingBottom: 16,
    textAlign: "center",
  },
  imageOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
  },
  imageOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  // Image Preview Modal Styles
  imagePreviewContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
    position: "absolute",
    bottom: 0,
    maxHeight: "90%",
  },
  imagePreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  imagePreviewTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  imagePreviewBody: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: "#f2c44d",
  },
  imagePreviewFooter: {
    padding: 20,
    paddingTop: 10,
  },
});
