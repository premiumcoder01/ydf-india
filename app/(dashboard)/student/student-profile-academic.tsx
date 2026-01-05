import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getUserProfile, updateUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
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

const COURSE_OPTIONS = [
  "B.Tech",
  "B.E.",
  "B.Sc",
  "B.Com",
  "B.A.",
  "BBA",
  "BCA",
  "MBBS",
  "BDS",
  "B.Pharm",
  "LLB",
  "M.Tech",
  "M.Sc",
  "MBA",
  "MCA",
  "M.A.",
  "M.Com",
  "Ph.D",
  "Diploma",
  "Other"
];

const COURSE_CATEGORY_OPTIONS = [
  "Engineering",
  "Medical",
  "Arts",
  "Science",
  "Commerce",
  "Law",
  "Management",
  "Pharmacy",
  "Education",
  "Vocational",
  "Other"
];

const MAJOR_OPTIONS = [
  "Computer Science",
  "Information Technology",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Electronics & Communication",
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "Economics",
  "English",
  "History",
  "Political Science",
  "Accounting",
  "Finance",
  "Marketing",
  "Human Resources",
  "General",
  "Other"
];

export default function StudentProfileAcademicScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [academicInfo, setAcademicInfo] = useState({
    institution: "",
    major: "",
    gpa: "",
    graduation: "",
    year: "",
    currentCourse: "",
    currentCourseCategory: "",
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Picker States
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showMajorPicker, setShowMajorPicker] = useState(false);
  const [showGradDatePicker, setShowGradDatePicker] = useState(false);
  const [showAcademicYearPicker, setShowAcademicYearPicker] = useState(false);

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("error");

  // Fetch User Profile
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

              setAcademicInfo((prev) => ({
                ...prev,
                institution: user.institution || user.customfields?.find((f: any) => f.shortname === 'institution')?.value || prev.institution,
                major: user.major || user.customfields?.find((f: any) => f.shortname === 'major')?.value || prev.major,
                gpa: user.gpa || user.customfields?.find((f: any) => f.shortname === 'gpa')?.value || prev.gpa,
                graduation: user.graduationdate || user.customfields?.find((f: any) => f.shortname === 'graduationdate')?.value || prev.graduation,
                year: user.academicyear || user.customfields?.find((f: any) => f.shortname === 'academicyear')?.value || prev.year,
                currentCourse: user.currentcourse || user.customfields?.find((f: any) => f.shortname === 'currentcourse')?.value || prev.currentCourse,
                currentCourseCategory: user.currentcoursecategory || user.customfields?.find((f: any) => f.shortname === 'currentcoursecategory')?.value || prev.currentCourseCategory,
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

  // Validation Functions
  const validateGPA = (gpa: string): boolean => {
    // allow empty if optional, but here let's valid if present
    if (!gpa) return true;
    const gpaNum = parseFloat(gpa);
    return !isNaN(gpaNum) && gpaNum >= 0 && gpaNum <= 10.0;
  };

  // Handlers
  const handleAcademicInfoChange = useCallback(
    (field: keyof typeof academicInfo, value: string) => {
      setAcademicInfo((prev) => ({ ...prev, [field]: value }));
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

  const onGradDateChange = (event: any, selectedDate?: Date) => {
    setShowGradDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Format: Month Year (e.g., May 2024) or DD/MM/YYYY. Standardizing to DD/MM/YYYY for consistency with backend expectation if needed, 
      // but user UI might prefer Month Year. Backend usually expects string. Custom fields might differ. 
      // Based on personal profile, DD/MM/YYYY is good.
      const formattedDate = selectedDate.toLocaleDateString('en-GB');
      handleAcademicInfoChange("graduation", formattedDate);
    }
  };

  const onAcademicYearChange = (event: any, selectedDate?: Date) => {
    setShowAcademicYearPicker(Platform.OS === 'ios');
    if (selectedDate) {
      // For academic year, usually just Year is nice, but user requested Date Picker.
      // We'll store formatted date.
      const formattedDate = selectedDate.toLocaleDateString('en-GB');
      handleAcademicInfoChange("year", formattedDate);
    }
  };

  const validateAcademicInfo = (): boolean => {
    const errors: ValidationErrors = {};

    if (!academicInfo.institution.trim()) {
      errors.institution = "Institution name is required";
    }

    if (!academicInfo.major.trim()) {
      errors.major = "Major/Field of study is required";
    }

    if (!validateGPA(academicInfo.gpa)) {
      errors.gpa = "GPA must be between 0.0 and 4.0";
    }

    if (!academicInfo.year.trim()) errors.year = "Academic year is required";
    if (!academicInfo.currentCourse.trim()) errors.currentCourse = "Current course is required";
    if (!academicInfo.currentCourseCategory.trim()) errors.currentCourseCategory = "Course category is required";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAcademic = async () => {
    if (!validateAcademicInfo()) {
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

      const response = await updateUserProfile(authData.token, academicInfo);

      if (response.success) {
        setHasUnsavedChanges(false);
        setToastMessage("Academic information updated successfully");
        setToastType("success");
        setShowToast(true);
        setTimeout(() => {
          router.back();
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      <AppHeader title="Academic Details" onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Academic Information</Text>
              {hasUnsavedChanges && (
                <View style={styles.unsavedBadge}>
                  <Text style={styles.unsavedText}>Unsaved</Text>
                </View>
              )}
            </View>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

              {/* Current Course Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Current Course *</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }, validationErrors.currentCourse && styles.selectorError]}
                  onPress={() => setShowCoursePicker(true)}
                >
                  <Text style={[styles.selectorText, { color: colors.text }, !academicInfo.currentCourse && styles.placeholderText]}>
                    {academicInfo.currentCourse || "Select Course"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {validationErrors.currentCourse && (
                  <Text style={styles.errorText}>{validationErrors.currentCourse}</Text>
                )}
              </View>

              {/* Course Category Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Course Category *</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }, validationErrors.currentCourseCategory && styles.selectorError]}
                  onPress={() => setShowCategoryPicker(true)}
                >
                  <Text style={[styles.selectorText, { color: colors.text }, !academicInfo.currentCourseCategory && styles.placeholderText]}>
                    {academicInfo.currentCourseCategory || "Select Category"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {validationErrors.currentCourseCategory && (
                  <Text style={styles.errorText}>{validationErrors.currentCourseCategory}</Text>
                )}
              </View>

              {/* Institution Input - Kept as text input */}
              <CustomTextInput
                label="Institution"
                value={academicInfo.institution}
                onChangeText={(val) =>
                  handleAcademicInfoChange("institution", val)
                }
                style={styles.input}
                error={validationErrors.institution}
              />

              {/* Major/Field of Study Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Major/Field of Study *</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }, validationErrors.major && styles.selectorError]}
                  onPress={() => setShowMajorPicker(true)}
                >
                  <Text style={[styles.selectorText, { color: colors.text }, !academicInfo.major && styles.placeholderText]}>
                    {academicInfo.major || "Select Major"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {validationErrors.major && (
                  <Text style={styles.errorText}>{validationErrors.major}</Text>
                )}
              </View>

              {/* GPA Input - Numeric only */}
              <CustomTextInput
                label="Current GPA"
                value={academicInfo.gpa}
                onChangeText={(val) => handleAcademicInfoChange("gpa", val)}
                style={styles.input}
                placeholder="0.00 - 4.00"
                keyboardType="numeric"
                error={validationErrors.gpa}
              />

              {/* Expected Graduation Date Picker */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Expected Graduation</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }]}
                  onPress={() => setShowGradDatePicker(true)}
                >
                  <Text style={[styles.selectorText, { color: colors.text }, !academicInfo.graduation && styles.placeholderText]}>
                    {academicInfo.graduation || "Select Date"}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {showGradDatePicker && (
                <DateTimePicker
                  value={academicInfo.graduation ? new Date(academicInfo.graduation.split('/').reverse().join('-')) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant={isDark ? "dark" : "light"}
                  onChange={onGradDateChange}
                  minimumDate={new Date()}
                />
              )}

              {/* Current Academic Year Date Picker */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Current Academic Year</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }, validationErrors.year && styles.selectorError]}
                  onPress={() => setShowAcademicYearPicker(true)}
                >
                  <Text style={[styles.selectorText, { color: colors.text }, !academicInfo.year && styles.placeholderText]}>
                    {academicInfo.year || "Select Year"}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {validationErrors.year && (
                  <Text style={styles.errorText}>{validationErrors.year}</Text>
                )}
              </View>
              {showAcademicYearPicker && (
                <DateTimePicker
                  value={academicInfo.year ? new Date(academicInfo.year.split('/').reverse().join('-')) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant={isDark ? "dark" : "light"}
                  onChange={onAcademicYearChange}
                />
              )}

              <Button
                title={isSaving ? "Saving..." : "Save Academic Info"}
                onPress={handleSaveAcademic}
                variant="primary"
                style={styles.saveButton}
                disabled={isSaving || !hasUnsavedChanges}
              />
            </View>
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

      {/* Modals */}
      <SelectionModal
        visible={showCoursePicker}
        onClose={() => setShowCoursePicker(false)}
        title="Select Current Course"
        options={COURSE_OPTIONS}
        selected={academicInfo.currentCourse}
        onSelect={(val: string) => {
          handleAcademicInfoChange("currentCourse", val);
          setShowCoursePicker(false);
        }}
      />
      <SelectionModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        title="Select Course Category"
        options={COURSE_CATEGORY_OPTIONS}
        selected={academicInfo.currentCourseCategory}
        onSelect={(val: string) => {
          handleAcademicInfoChange("currentCourseCategory", val);
          setShowCategoryPicker(false);
        }}
      />
      <SelectionModal
        visible={showMajorPicker}
        onClose={() => setShowMajorPicker(false)}
        title="Select Major/Field of Study"
        options={MAJOR_OPTIONS}
        selected={academicInfo.major}
        onSelect={(val: string) => {
          handleAcademicInfoChange("major", val);
          setShowMajorPicker(false);
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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  unsavedBadge: {
    backgroundColor: "#FF9800" + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unsavedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FF9800",
  },
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
  },
  // Selection Styles
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginLeft: 4,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderWidth: 1.5,
    borderColor: "rgba(51, 51, 51, 0.15)",
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
    color: "#333",
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
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: "60%",
    paddingTop: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f9f9f9",
  },
  optionSelected: {
    backgroundColor: "rgba(0, 86, 210, 0.05)",
  },
  optionText: {
    fontSize: 15,
    color: "#222",
  },
  optionTextSelected: {
    color: "#0056D2",
    fontWeight: "600",
  },
});
