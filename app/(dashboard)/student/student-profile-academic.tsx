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
              institution: item.institution || "",
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
    if (!editingRecord.institution.trim()) errors.institution = "Required";
    if (!editingRecord.year.trim()) errors.year = "Required";
    if (!editingRecord.currentCourse.trim()) errors.currentCourse = "Required";
    if (!editingRecord.currentCourseCategory.trim()) errors.currentCourseCategory = "Required";
    if (!editingRecord.major.trim()) errors.major = "Required"; // Added major validation

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
          const apiParams = {
            course_name: editingRecord.currentCourse,
            category: editingRecord.currentCourseCategory,
            institution: editingRecord.institution,
            major: editingRecord.major,
            percentage: gradeType === 'percentage' ? editingRecord.gpa : "",
            cgpa: gradeType === 'cgpa' ? editingRecord.gpa : "",
            academic_year: editingRecord.year,
            graduation_year: editingRecord.graduation,
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Academic Records</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: records.length >= 4 ? colors.textSecondary + '50' : colors.primary, opacity: records.length >= 4 ? 0.6 : 1 }]}
              onPress={handleAddNew}
              activeOpacity={records.length >= 4 ? 1 : 0.7}
            >
              <Ionicons name="add" size={24} color="#fff" />
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
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? '#333' : '#f5f5f5' }]}>
                <Ionicons name="school-outline" size={48} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Academic Records</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Add your educational background to build your profile.
              </Text>

            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {records.map((record) => (
                <View key={record.id} style={[styles.recordCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.recordHeader}>
                    <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name="school" size={24} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recordTitle, { color: colors.text }]}>{record.currentCourse}</Text>
                      <Text style={[styles.recordSubtitle, { color: colors.textSecondary }]}>{record.institution}</Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#E3F2FD' }]}
                        onPress={() => handleEdit(record)}
                      >
                        <Ionicons name="pencil" size={16} color="#2196F3" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#FFEBEE' }]}
                        onPress={() => handleDelete(record.id)}
                      >
                        <Ionicons name="trash" size={16} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={styles.recordDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Year</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{record.year}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Major</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{record.major || "N/A"}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Graduation</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{record.graduation || "N/A"}</Text>
                    </View>
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
              <View style={[styles.formSection, { backgroundColor: isDark ? '#1A1A1A' : '#F8F9FA', borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="school-outline" size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle2, { color: colors.text }]}>Course Information</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Course Name *</Text>
                  <TouchableOpacity
                    style={[styles.selector, { borderColor: validationErrors.currentCourse ? '#EF4444' : colors.border, backgroundColor: isDark ? '#252525' : '#FFFFFF' }]}
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

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Category *</Text>
                  <TouchableOpacity
                    style={[styles.selector, { borderColor: validationErrors.currentCourseCategory ? '#EF4444' : colors.border, backgroundColor: isDark ? '#252525' : '#FFFFFF' }]}
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

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Major / Stream *</Text>
                  <TouchableOpacity
                    style={[styles.selector, { borderColor: validationErrors.major ? '#EF4444' : colors.border, backgroundColor: isDark ? '#252525' : '#FFFFFF' }]}
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
              </View>

              {/* Institution Section */}
              <View style={[styles.formSection, { backgroundColor: isDark ? '#1A1A1A' : '#F8F9FA', borderColor: colors.border }]}>
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

              {/* Academic Performance Section */}
              <View style={[styles.formSection, { backgroundColor: isDark ? '#1A1A1A' : '#F8F9FA', borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="trophy-outline" size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle2, { color: colors.text }]}>Academic Performance</Text>
                </View>

                {/* Grade Type Toggle */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Grade Type</Text>
                  <View style={styles.toggleContainer}>
                    <TouchableOpacity
                      style={[styles.toggleButton, gradeType === 'cgpa' && styles.toggleButtonActive, { borderColor: colors.border, backgroundColor: gradeType === 'cgpa' ? colors.primary : (isDark ? '#252525' : '#FFFFFF') }]}
                      onPress={() => {
                        setGradeType('cgpa');
                        // Conversion logic: if switching to CGPA and value > 10, likely needs conversion
                        if (editingRecord.gpa && parseFloat(editingRecord.gpa) > 10) {
                          handleFieldChange("gpa", (parseFloat(editingRecord.gpa) / 10).toFixed(2));
                        }
                      }}
                    >
                      <Text style={[styles.toggleText, { color: gradeType === 'cgpa' ? '#FFFFFF' : colors.textSecondary }]}>CGPA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleButton, gradeType === 'percentage' && styles.toggleButtonActive, { borderColor: colors.border, backgroundColor: gradeType === 'percentage' ? colors.primary : (isDark ? '#252525' : '#FFFFFF') }]}
                      onPress={() => {
                        setGradeType('percentage');
                        // Conversion logic: if switching to Percentage and value <= 10, likely needs conversion
                        if (editingRecord.gpa && parseFloat(editingRecord.gpa) <= 10) {
                          handleFieldChange("gpa", (parseFloat(editingRecord.gpa) * 10).toFixed(2));
                        }
                      }}
                    >
                      <Text style={[styles.toggleText, { color: gradeType === 'percentage' ? '#FFFFFF' : colors.textSecondary }]}>Percentage</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <CustomTextInput
                  label={gradeType === 'cgpa' ? 'CGPA (out of 10) *' : 'Percentage (%) *'}
                  value={editingRecord.gpa}
                  onChangeText={(t) => handleFieldChange("gpa", t)}
                  keyboardType="decimal-pad"
                  placeholder={gradeType === 'cgpa' ? 'e.g., 8.5' : 'e.g., 85'}
                  error={validationErrors.gpa}
                  style={{ marginBottom: 0 }}
                />
              </View>

              {/* Timeline Section */}
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

              <Button
                title={saving ? "Saving..." : "Save Details"}
                loading={saving}
                onPress={handleSave}
                style={{ marginTop: 20 }}
              />

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
    marginBottom: 20
  },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  recordCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recordHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  recordTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  recordSubtitle: { fontSize: 13 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  divider: { height: 1, marginVertical: 12 },
  recordDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { gap: 4 },
  detailLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase' },
  detailValue: { fontSize: 13, fontWeight: '600' },

  // Modal Styles
  fullScreenModal: { flex: 1 },
  fsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  fsModalTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: { padding: 4 },
  inputGroup: { marginBottom: 20 },
  label: { marginBottom: 8, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56
  },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 6 },
  formSection: {
    borderRadius: 16,
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
    fontWeight: '700',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '600',
  },

  // Selection Modal (Internal)
  modalOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", zIndex: 1000 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
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
  },
  optionRow: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  optionSelected: { backgroundColor: "rgba(33, 150, 243, 0.1)" },
  optionText: { fontSize: 16 },
  optionTextSelected: { fontWeight: "700", color: "#2196F3" },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 0,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
