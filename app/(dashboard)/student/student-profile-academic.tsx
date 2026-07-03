import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { createAcademicDetail, deleteAcademicDetail, DropdownData, getAcademicDetails, getDropdownDefinitions, updateAcademicDetail } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AcademicRecord {
  id: string;
  institution: string;
  major: string;
  gpa: string;
  gradeType?: 'cgpa' | 'percentage';
  graduation: string;
  year: string;
  currentCourse: string;
  currentCourseCategory: string;
}

interface ValidationErrors {
  [key: string]: string;
}

interface Option {
  label: string;
  value: string;
}


// Generate graduation year options (current year to 2040)
const currentYear = new Date().getFullYear();
const GRADUATION_YEAR_OPTIONS = Array.from(
  { length: 2040 - currentYear + 1 },
  (_, i) => (currentYear + i).toString()
);

const INITIAL_RECORD: AcademicRecord = {
  id: "",
  institution: "",
  major: "",
  gpa: "",
  gradeType: 'cgpa',
  graduation: "",
  year: "",
  currentCourse: "",
  currentCourseCategory: "",
};

export default function StudentProfileAcademicScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [dropdowns, setDropdowns] = useState<DropdownData | null>(null);


  // State for list of records
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal & Editing State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AcademicRecord>(INITIAL_RECORD);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Picker States
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showMajorPicker, setShowMajorPicker] = useState(false);
  const [showGradYearPicker, setShowGradYearPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // CGPA/Percentage toggle
  const [gradeType, setGradeType] = useState<'cgpa' | 'percentage'>('cgpa');

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("error");

  const isSchoolCourse = (course: string) => {
    if (!course) return false;
    const schoolLevels = ["10th", "11th", "12th"];
    return schoolLevels.some(level => course.toLowerCase().includes(level.toLowerCase()));
  };

  const is10thCourse = (course: string) => {
    if (!course) return false;
    return course.toLowerCase().includes("10th");
  };

  useEffect(() => {
    fetchAcademicDetails();
    fetchDropdowns();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchAcademicDetails(),
      fetchDropdowns()
    ]);
    setRefreshing(false);
  }, []);

  const fetchDropdowns = async () => {
    try {
      const authData = await AsyncStorage.getItem("authData");
      if (!authData) return;
      const { token } = JSON.parse(authData);
      const response = await getDropdownDefinitions(token);
      if (response.success && response.data) {
        setDropdowns(response.data);
      }
    } catch (error) {
      console.error("Error fetching dropdowns:", error);
    }
  };

  const getOptionsByShortname = (shortname: string) => {
    if (!dropdowns) return [];
    const courseField = dropdowns.course_fields?.find(f => f.shortname === shortname);
    if (courseField) return courseField.options;
    const userField = dropdowns.user_fields?.find(f => f.shortname === shortname);
    if (userField) return userField.options;
    return [];
  };

  const fetchAcademicDetails = async () => {
    try {
      setLoading(true);
      const authDataStr = await AsyncStorage.getItem("authData");
      if (authDataStr) {
        const authData = JSON.parse(authDataStr);
        if (authData.token) {
          const response = await getAcademicDetails(authData.token);
          if (response.success && Array.isArray(response.data)) {
            const mappedRecords: AcademicRecord[] = response.data.map((item: any) => ({
              id: item.id.toString(),
              institution: (item.institution && item.institution.toLowerCase().trim() !== "n/a" && item.institution.toLowerCase().trim() !== "na") ? item.institution : "",
              major: item.major || "",
              gpa: item.cgpa ? item.cgpa.toString() : (item.percentage ? item.percentage.toString() : ""),
              gradeType: item.percentage && !item.cgpa ? 'percentage' : 'cgpa',
              graduation: item.graduation_year ? item.graduation_year.toString() : "",
              year: item.academic_year ? item.academic_year.toString() : "",
              currentCourse: item.course_name || "",
              currentCourseCategory: item.category || ""
            }));
            setRecords(mappedRecords);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch academic details", error);
      setToastMessage("Failed to load academic details");
      setToastType("error");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  const handleAddNew = () => {
    if (records.length >= 4) {
      setToastMessage("Maximum 4 academic records allowed. Please delete an existing record to add a new one.");
      setToastType("error");
      setShowToast(true);
      return;
    }
    setEditingRecord({ ...INITIAL_RECORD });
    setGradeType('cgpa');
    setValidationErrors({});
    setIsModalVisible(true);
  };

  const handleEdit = (record: AcademicRecord) => {
    setEditingRecord({ ...record });
    setGradeType(record.gradeType || 'cgpa');
    setValidationErrors({});
    setIsModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Record", "Are you sure you want to delete this academic record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const authDataStr = await AsyncStorage.getItem("authData");
            if (authDataStr) {
              const authData = JSON.parse(authDataStr);
              if (authData.token) {
                const response = await deleteAcademicDetail(authData.token, parseInt(id));
                if (response.success) {
                  setRecords(prev => prev.filter(r => r.id !== id));
                  setToastMessage("Record deleted successfully");
                  setToastType("success");
                } else {
                  setToastMessage(response.error || "Failed to delete record");
                  setToastType("error");
                }
                setShowToast(true);
              }
            }
          } catch (error) {
            setToastMessage("An error occurred");
            setToastType("error");
            setShowToast(true);
          }
        }
      }
    ]);
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    const isSchool = isSchoolCourse(editingRecord.currentCourse);
    const is10th = is10thCourse(editingRecord.currentCourse);

    if (!editingRecord.currentCourse.trim()) {
      errors.currentCourse = "Required";
    }

    if (!editingRecord.year.trim()) errors.year = "Required";

    if (!isSchool) {
      if (!editingRecord.institution.trim()) errors.institution = "Required";
      if (!editingRecord.currentCourseCategory.trim()) errors.currentCourseCategory = "Required";
      if (!editingRecord.major.trim()) errors.major = "Required";
    }

    // Academic Performance Validation (Required)
    if (!editingRecord.gpa || !editingRecord.gpa.trim()) {
      errors.gpa = "Academic performance is required";
    } else {
      const gpaNum = parseFloat(editingRecord.gpa);
      if (isNaN(gpaNum)) {
        errors.gpa = "Please enter a valid number";
      } else if (gradeType === 'cgpa') {
        // CGPA validation (0-10)
        if (gpaNum < 0 || gpaNum > 10.0) {
          errors.gpa = "CGPA must be between 0 and 10";
        }
      } else {
        // Percentage validation (0-100)
        if (gpaNum < 0 || gpaNum > 100) {
          errors.gpa = "Percentage must be between 0 and 100";
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setToastMessage("Please fix errors");
      setToastType("error");
      setShowToast(true);
      return;
    }

    try {
      setSaving(true);
      const authDataStr = await AsyncStorage.getItem("authData");
      if (authDataStr) {
        const authData = JSON.parse(authDataStr);
        if (authData.token) {
          const isSchool = isSchoolCourse(editingRecord.currentCourse);
          const is10th = is10thCourse(editingRecord.currentCourse);
          const apiParams = {
            course_name: editingRecord.currentCourse,
            category: isSchool ? "" : editingRecord.currentCourseCategory,
            institution: isSchool ? "N/A" : editingRecord.institution,
            major: isSchool ? "" : editingRecord.major,
            percentage: gradeType === 'percentage' ? editingRecord.gpa : "",
            cgpa: gradeType === 'cgpa' ? editingRecord.gpa : "",
            academic_year: editingRecord.year,
            graduation_year: isSchool ? "" : editingRecord.graduation,
          };
          console.log(apiParams)

          let response;
          if (editingRecord.id) {
            response = await updateAcademicDetail(authData.token, parseInt(editingRecord.id), apiParams);
          } else {
            response = await createAcademicDetail(authData.token, apiParams);
          }

          if (response.success) {
            await fetchAcademicDetails();
            setIsModalVisible(false);
            setToastMessage(editingRecord.id ? "Record updated successfully" : "Record created successfully");
            setToastType("success");
            setShowToast(true);
          } else {
            Alert.alert("Error", response.error || (editingRecord.id ? "Failed to update record" : "Failed to create record"));
          }
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: keyof AcademicRecord, value: string) => {
    setEditingRecord(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // --- Render Components ---

  const SelectionModal = ({ visible, onClose, title, options, selected, onSelect }: {
    visible: boolean;
    onClose: () => void;
    title: string;
    options: Option[] | string[]; // Can be Option objects or string array for GRADUATION_YEAR_OPTIONS
    selected: string;
    onSelect: (value: string) => void;
  }) => {
    const [searchQuery, setSearchQuery] = React.useState("");

    if (!visible) return null;

    // Normalize options to {label, value} array
    const normalizedOptions: Option[] = options.map((opt: Option | string) =>
      typeof opt === 'string' ? { label: opt, value: opt } : opt
    );

    // Filter options based on search query
    const filteredOptions = normalizedOptions.filter((opt: Option) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Reset search when modal closes
    React.useEffect(() => {
      if (!visible) {
        setSearchQuery("");
      }
    }, [visible]);

    return (
      <View style={[styles.modalOverlay, { zIndex: 1000, elevation: 1000 }]}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1F1F1F' : '#F5F5F5', borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`Search ${title.toLowerCase()}...`}
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {filteredOptions.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                  No results found for "{searchQuery}"
                </Text>
              </View>
            ) : (
              filteredOptions.map((opt: Option) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionRow, selected === opt.value && styles.optionSelected, { borderBottomColor: colors.border }]}
                  onPress={() => onSelect(opt.value)}
                >
                  <Text style={[styles.optionText, { color: colors.text }, selected === opt.value && styles.optionTextSelected]}>
                    {opt.label}
                  </Text>
                  {selected === opt.value && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    );
  };


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />


      <AppHeader
        title="Academic Details"
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Academic Records</Text>
              <Text style={[styles.sectionSubtitleText, { color: colors.textSecondary }]}>Manage your educational milestones</Text>
            </View>
            <TouchableOpacity
              style={styles.addButtonWrapper}
              onPress={handleAddNew}
              disabled={records.length >= 4}
              activeOpacity={0.8}
            >
              {records.length >= 4 ? (
                <View style={[styles.addButtonGradient, { backgroundColor: colors.border, opacity: 0.5 }]}>
                  <Ionicons name="add" size={18} color={colors.textSecondary} />
                  <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>Add</Text>
                </View>
              ) : (
                <LinearGradient
                  colors={["#7C3AED", "#5B21B6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addButtonGradient}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addButtonText}>Add</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>

          {records.length >= 4 && (
            <View style={[styles.warningContainer, { backgroundColor: isDark ? '#3D2A1F' : '#FFF4E5', borderColor: isDark ? '#8A5D3B' : '#FFD699' }]}>
              <Ionicons name="warning-outline" size={20} color={isDark ? '#FFB84D' : '#E67E22'} />
              <Text style={[styles.warningText, { color: isDark ? '#FFB84D' : '#D35400' }]}>
                Maximum limit of 4 records reached. Delete an existing one to add something new.
              </Text>
            </View>
          )}

          {records.length === 0 ? (
            <View style={[styles.emptyStateCard, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', backgroundColor: isDark ? 'rgba(30, 30, 35, 0.3)' : 'rgba(255,255,255,0.5)' }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.12)' : 'rgba(124, 58, 237, 0.06)', borderColor: isDark ? 'rgba(124, 58, 237, 0.25)' : 'rgba(124, 58, 237, 0.15)' }]}>
                <Ionicons name="school" size={42} color={colors.primary} />
              </View>
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Academic Records</Text>
              <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
                Add your school and college history to complete your application profile and unlock top opportunities.
              </Text>
              <TouchableOpacity onPress={handleAddNew} activeOpacity={0.8} style={styles.emptyCTAWrapper}>
                <LinearGradient
                  colors={["#7C3AED", "#5B21B6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyCTAButon}
                >
                  <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyCTAText}>Add Educational Detail</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {records.map((record) => (
                <View key={record.id} style={[styles.recordCard, { backgroundColor: isDark ? 'rgba(30, 30, 35, 0.45)' : 'rgba(255, 255, 255, 0.75)', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', borderWidth: 1 }]}>
                  <View style={styles.recordHeader}>
                    <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.1)' : 'rgba(124, 58, 237, 0.05)', borderColor: isDark ? 'rgba(124, 58, 237, 0.25)' : 'rgba(124, 58, 237, 0.15)', borderWidth: 1 }]}>
                      <Ionicons name="school" size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.recordTitle, { color: colors.text }]}>{record.currentCourse}</Text>
                        {record.currentCourseCategory && !isSchoolCourse(record.currentCourse) ? (
                          <View style={[styles.categoryBadge, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.08)', borderColor: isDark ? 'rgba(124, 58, 237, 0.3)' : 'rgba(124, 58, 237, 0.2)', borderWidth: 1 }]}>
                            <Text style={[styles.categoryText, { color: colors.primary }]}>{record.currentCourseCategory}</Text>
                          </View>
                        ) : null}
                      </View>
                      {!isSchoolCourse(record.currentCourse) && record.institution && record.institution !== "N/A" ? (
                        <Text style={[styles.recordSubtitle, { color: colors.textSecondary }]}>{record.institution}</Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                  <View style={styles.recordDetailsGrid}>
                    <View style={styles.detailItemGrid}>
                      <View style={styles.detailLabelRow}>
                        <Ionicons name="ribbon-outline" size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Grade / GPA</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                        <Text style={[styles.detailValue, { color: colors.primary, fontSize: 16, fontWeight: '700' }]}>{record.gpa}</Text>
                        <Text style={[styles.detailType, { color: colors.textSecondary, fontSize: 10, fontWeight: '600' }]}>{record.gradeType?.toUpperCase()}</Text>
                      </View>
                    </View>

                    {record.year ? (
                      <View style={styles.detailItemGrid}>
                        <View style={styles.detailLabelRow}>
                          <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Year</Text>
                        </View>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{record.year}</Text>
                      </View>
                    ) : null}

                    {record.major && record.major !== "N/A" && !isSchoolCourse(record.currentCourse) ? (
                      <View style={styles.detailItemGrid}>
                        <View style={styles.detailLabelRow}>
                          <Ionicons name="git-branch-outline" size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Major / Stream</Text>
                        </View>
                        <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{record.major}</Text>
                      </View>
                    ) : null}

                    {record.graduation && record.graduation !== "N/A" ? (
                      <View style={styles.detailItemGrid}>
                        <View style={styles.detailLabelRow}>
                          <Ionicons name="school-outline" size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Graduation</Text>
                        </View>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{record.graduation}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', marginVertical: 14 }]} />

                  <View style={styles.cardActionContainer}>
                    <TouchableOpacity
                      style={[styles.premiumActionBtn, { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.08)' : 'rgba(33, 150, 243, 0.05)', borderColor: isDark ? 'rgba(33, 150, 243, 0.25)' : 'rgba(33, 150, 243, 0.15)' }]}
                      onPress={() => handleEdit(record)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil-outline" size={14} color={isDark ? '#64B5F6' : '#1976D2'} style={{ marginRight: 4 }} />
                      <Text style={[styles.premiumActionBtnText, { color: isDark ? '#64B5F6' : '#1976D2' }]}>Edit Record</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.premiumActionBtn, { backgroundColor: isDark ? 'rgba(244, 67, 54, 0.08)' : 'rgba(244, 67, 54, 0.05)', borderColor: isDark ? 'rgba(244, 67, 54, 0.25)' : 'rgba(244, 67, 54, 0.15)' }]}
                      onPress={() => handleDelete(record.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color={isDark ? '#E57373' : '#D32F2F'} style={{ marginRight: 4 }} />
                      <Text style={[styles.premiumActionBtnText, { color: isDark ? '#E57373' : '#D32F2F' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={[styles.fullScreenModal, { backgroundColor: colors.background }]}>
          <View style={[styles.fsModalHeader, { borderBottomColor: colors.border, paddingTop: insets.top + 16 }]}>
            <Text style={[styles.fsModalTitle, { color: colors.text }]}>
              {editingRecord.id ? "Edit Academic Record" : "Add Academic Record"}
            </Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 24, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>

              {/* Course & Category Section */}
              <View style={[styles.formSection, { backgroundColor: isDark ? 'rgba(30, 30, 35, 0.45)' : '#F8F9FA', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="school-outline" size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle2, { color: colors.text }]}>Course Information</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Course Name *</Text>
                  <TouchableOpacity
                    style={[styles.selector, { borderColor: validationErrors.currentCourse ? '#EF4444' : (isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border), backgroundColor: isDark ? '#252525' : '#FFFFFF' }]}
                    onPress={() => setShowCoursePicker(true)}
                  >
                    <Ionicons name="book-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text
                      style={[{ flex: 1, marginRight: 8 }, { color: editingRecord.currentCourse ? colors.text : colors.textSecondary }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {editingRecord.currentCourse || "Select your course"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {validationErrors.currentCourse && <Text style={styles.errorText}>{validationErrors.currentCourse}</Text>}
                </View>

                {!isSchoolCourse(editingRecord.currentCourse) && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Category *</Text>
                    <TouchableOpacity
                      style={[styles.selector, { borderColor: validationErrors.currentCourseCategory ? '#EF4444' : (isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border), backgroundColor: isDark ? '#252525' : '#FFFFFF' }]}
                      onPress={() => setShowCategoryPicker(true)}
                    >
                      <Ionicons name="grid-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                      <Text
                        style={[{ flex: 1, marginRight: 8 }, { color: editingRecord.currentCourseCategory ? colors.text : colors.textSecondary }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {editingRecord.currentCourseCategory || "Select category (e.g., Engineering)"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {validationErrors.currentCourseCategory && <Text style={styles.errorText}>{validationErrors.currentCourseCategory}</Text>}
                  </View>
                )}

                {!isSchoolCourse(editingRecord.currentCourse) && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Major / Stream *</Text>
                    <TouchableOpacity
                      style={[styles.selector, { borderColor: validationErrors.major ? '#EF4444' : (isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border), backgroundColor: isDark ? '#252525' : '#FFFFFF' }]}
                      onPress={() => setShowMajorPicker(true)}
                    >
                      <Ionicons name="ribbon-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                      <Text
                        style={[{ flex: 1, marginRight: 8 }, { color: editingRecord.major ? colors.text : colors.textSecondary }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {editingRecord.major || "Select your specialization"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {validationErrors.major && <Text style={styles.errorText}>{validationErrors.major}</Text>}
                  </View>
                )}

                {/* Consolidated Fields for School */}
                {isSchoolCourse(editingRecord.currentCourse) && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>Passing Year *</Text>
                      <TouchableOpacity
                        style={[styles.selector, { borderColor: validationErrors.year ? '#EF4444' : (isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border), backgroundColor: isDark ? '#252525' : '#FFFFFF' }]}
                        onPress={() => setShowStartDatePicker(true)}
                      >
                        <Ionicons name="calendar" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                        <Text
                          style={[{ flex: 1, marginRight: 8 }, { color: editingRecord.year ? colors.text : colors.textSecondary }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {editingRecord.year || "Select passing year"}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {validationErrors.year && <Text style={styles.errorText}>{validationErrors.year}</Text>}
                    </View>
                  </>
                )}
              </View>

              {/* Institution Section (College Only) */}
              {!isSchoolCourse(editingRecord.currentCourse) && (
                <View style={[styles.formSection, { backgroundColor: isDark ? 'rgba(30, 30, 35, 0.45)' : '#F8F9FA', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="business-outline" size={20} color={colors.primary} />
                    <Text style={[styles.sectionTitle2, { color: colors.text }]}>Institution Details</Text>
                  </View>

                  <CustomTextInput
                    label="College / University Name *"
                    value={editingRecord.institution}
                    onChangeText={(t) => handleFieldChange("institution", t)}
                    placeholder="e.g., IIT Delhi, Delhi University"
                    style={{ marginBottom: 0 }}
                    error={validationErrors.institution}
                  />
                </View>
              )}

              {/* Academic Performance Section */}
              <View style={[styles.formSection, { backgroundColor: isDark ? 'rgba(30, 30, 35, 0.45)' : '#F8F9FA', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="trophy-outline" size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle2, { color: colors.text }]}>Academic Performance</Text>
                </View>

                {/* Grade Type Toggle */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Grade Type</Text>
                  <View style={[styles.toggleContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F0F0F2' }]}>
                    <TouchableOpacity
                      style={[styles.toggleButton, gradeType === 'cgpa' && styles.toggleButtonActive, { backgroundColor: gradeType === 'cgpa' ? colors.primary : 'transparent' }]}
                      onPress={() => setGradeType('cgpa')}
                    >
                      <Text style={[styles.toggleText, { color: gradeType === 'cgpa' ? '#FFFFFF' : colors.textSecondary }]}>CGPA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleButton, gradeType === 'percentage' && styles.toggleButtonActive, { backgroundColor: gradeType === 'percentage' ? colors.primary : 'transparent' }]}
                      onPress={() => setGradeType('percentage')}
                    >
                      <Text style={[styles.toggleText, { color: gradeType === 'percentage' ? '#FFFFFF' : colors.textSecondary }]}>Percentage</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <CustomTextInput
                  label="Academic Performance (CGPA / %) *"
                  value={editingRecord.gpa}
                  onChangeText={(t) => handleFieldChange("gpa", t)}
                  keyboardType="decimal-pad"
                  placeholder="e.g., 8.5 or 85"
                  error={validationErrors.gpa}
                  style={{ marginBottom: 0 }}
                />
              </View>

              {/* Timeline Section */}
              {/* Timeline Section (College Only) */}
              {!isSchoolCourse(editingRecord.currentCourse) && (
                <View style={[styles.formSection, { backgroundColor: isDark ? '#1A1A1A' : '#F8F9FA', borderColor: colors.border }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={[styles.sectionTitle2, { color: colors.text }]}>Timeline</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Academic Year (Start Year) *</Text>
                    <TouchableOpacity
                      style={[styles.selector, { borderColor: validationErrors.year ? '#EF4444' : colors.border, backgroundColor: isDark ? '#252525' : '#FFFFFF' }]}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Ionicons name="calendar" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                      <Text
                        style={[{ flex: 1, marginRight: 8 }, { color: editingRecord.year ? colors.text : colors.textSecondary }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {editingRecord.year || "Select start date"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {validationErrors.year && <Text style={styles.errorText}>{validationErrors.year}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Expected Academic End Date</Text>
                    <TouchableOpacity
                      style={[styles.selector, { borderColor: colors.border, backgroundColor: isDark ? '#252525' : '#FFFFFF' }]}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Ionicons name="flag-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                      <Text
                        style={[{ flex: 1, marginRight: 8 }, { color: editingRecord.graduation ? colors.text : colors.textSecondary }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {editingRecord.graduation || "Select end date"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.saveButtonWrapper}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#7C3AED", "#5B21B6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.saveButtonText}>Save Details</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

            </ScrollView>
          </KeyboardAvoidingView>

          {/* Selection Pickers Nested Inside Modal */}
          <SelectionModal
            visible={showCoursePicker}
            onClose={() => setShowCoursePicker(false)}
            title="Select Course"
            options={getOptionsByShortname("course_name_1")}
            selected={editingRecord.currentCourse}
            onSelect={(val: string) => { handleFieldChange("currentCourse", val); setShowCoursePicker(false); }}
          />
          <SelectionModal
            visible={showCategoryPicker}
            onClose={() => setShowCategoryPicker(false)}
            title="Select Category"
            options={getOptionsByShortname("course_category_1")}
            selected={editingRecord.currentCourseCategory}
            onSelect={(val: string) => { handleFieldChange("currentCourseCategory", val); setShowCategoryPicker(false); }}
          />
          <SelectionModal
            visible={showMajorPicker}
            onClose={() => setShowMajorPicker(false)}
            title="Select Major/Stream"
            options={getOptionsByShortname("course_stream_1")}
            selected={editingRecord.major}
            onSelect={(val: string) => { handleFieldChange("major", val); setShowMajorPicker(false); }}
          />

          <DateTimePickerModal
            isVisible={showStartDatePicker}
            mode="date"
            minimumDate={new Date(2000, 0, 1)}
            maximumDate={new Date(2035, 11, 31)}
            onConfirm={(date) => {
              handleFieldChange("year", date.toISOString().split('T')[0]);
              setShowStartDatePicker(false);
            }}
            onCancel={() => setShowStartDatePicker(false)}
            isDarkModeEnabled={isDark}
            textColor={isDark ? "#FFFFFF" : "#000000"}
            themeVariant={isDark ? "dark" : "light"}
            display={Platform.OS === "ios" ? "inline" : "default"}
          />

          <DateTimePickerModal
            isVisible={showEndDatePicker}
            mode="date"
            minimumDate={new Date(2000, 0, 1)}
            maximumDate={new Date(2040, 11, 31)}
            onConfirm={(date) => {
              handleFieldChange("graduation", date.toISOString().split('T')[0]);
              setShowEndDatePicker(false);
            }}
            onCancel={() => setShowEndDatePicker(false)}
            isDarkModeEnabled={isDark}
            textColor={isDark ? "#FFFFFF" : "#000000"}
            themeVariant={isDark ? "dark" : "light"}
            display={Platform.OS === "ios" ? "inline" : "default"}
          />
        </View>
      </Modal>

      <Toast message={toastMessage} type={toastType} visible={showToast} onHide={() => setShowToast(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { position: "absolute", top: 0, left: 0, bottom: 0, right: 0 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  sectionSubtitleText: { fontSize: 13, marginTop: 2, opacity: 0.8 },
  
  addButtonWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  recordCard: {
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  recordHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  recordSubtitle: { fontSize: 13, marginTop: 2 },
  actionButtons: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, marginVertical: 16 },
  recordDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
  },
  detailItemGrid: {
    width: '50%',
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  detailType: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Modal Styles
  fullScreenModal: { flex: 1 },
  fsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  fsModalTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  closeBtn: { 
    padding: 6,
    borderRadius: 12,
  },
  inputGroup: { marginBottom: 20 },
  label: { marginBottom: 8, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56
  },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 6, fontWeight: '500' },
  formSection: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle2: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  toggleContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  toggleButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Selection Modal (Internal)
  modalOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", zIndex: 1000 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '80%',
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  noResultsText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  optionRow: { flexDirection: "row", justifyContent: "space-between", padding: 18, borderBottomWidth: 1 },
  optionSelected: { backgroundColor: "rgba(124, 58, 237, 0.08)" },
  optionText: { fontSize: 16, fontWeight: '500' },
  optionTextSelected: { fontWeight: "700", color: "#7C3AED" },

  // Premium Empty State
  emptyStateCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
    lineHeight: 22,
  },
  emptyCTAWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyCTAButon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyCTAText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Premium Save Button
  saveButtonWrapper: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    minHeight: 56,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  cardActionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 2,
  },
  premiumActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  premiumActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
