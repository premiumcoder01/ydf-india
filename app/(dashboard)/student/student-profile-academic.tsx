import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getUserProfile, updateUserProfile } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

interface ValidationErrors {
  [key: string]: string;
}

export default function StudentProfileAcademicScreen() {
  const { isDark, colors } = useTheme();
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
              <CustomTextInput
                label="Current Course *"
                value={academicInfo.currentCourse}
                onChangeText={(val) => handleAcademicInfoChange("currentCourse", val)}
                style={styles.input}
                error={validationErrors.currentCourse}
              />
              <CustomTextInput
                label="Course Category *"
                value={academicInfo.currentCourseCategory}
                onChangeText={(val) => handleAcademicInfoChange("currentCourseCategory", val)}
                style={styles.input}
                error={validationErrors.currentCourseCategory}
              />
              <CustomTextInput
                label="Institution"
                value={academicInfo.institution}
                onChangeText={(val) =>
                  handleAcademicInfoChange("institution", val)
                }
                style={styles.input}
                error={validationErrors.institution}
              />
              <CustomTextInput
                label="Major/Field of Study"
                value={academicInfo.major}
                onChangeText={(val) => handleAcademicInfoChange("major", val)}
                style={styles.input}
                error={validationErrors.major}
              />
              <CustomTextInput
                label="Current GPA"
                value={academicInfo.gpa}
                onChangeText={(val) => handleAcademicInfoChange("gpa", val)}
                style={styles.input}
                placeholder="0.00 - 4.00"
                error={validationErrors.gpa}
              />
              <CustomTextInput
                label="Expected Graduation"
                value={academicInfo.graduation}
                onChangeText={(val) =>
                  handleAcademicInfoChange("graduation", val)
                }
                style={styles.input}
                placeholder="e.g., May 2024"
              />
              <CustomTextInput
                label="Academic Year"
                value={academicInfo.year}
                onChangeText={(val) => handleAcademicInfoChange("year", val)}
                style={styles.input}
                error={validationErrors.year}
              />
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
});







