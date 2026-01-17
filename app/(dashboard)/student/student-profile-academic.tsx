import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { createAcademicDetail, deleteAcademicDetail, getAcademicDetails, updateAcademicDetail } from "@/utils/api";
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
  ScrollView,
  StyleSheet,
  Text,
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
  graduation: string;
  year: string;
  currentCourse: string;
  currentCourseCategory: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const COURSE_OPTIONS = [
  "B.Tech", "B.E.", "B.Sc", "B.Com", "B.A.", "BBA", "BCA", "MBBS", "BDS",
  "B.Pharm", "LLB", "M.Tech", "M.Sc", "MBA", "MCA", "M.A.", "M.Com",
  "Ph.D", "Diploma", "Other"
];

const COURSE_CATEGORY_OPTIONS = [
  "Engineering", "Medical", "Arts", "Science", "Commerce", "Law",
  "Management", "Pharmacy", "Education", "Vocational", "Other"
];

const MAJOR_OPTIONS = [
  "Computer Science", "Information Technology", "Mechanical Engineering",
  "Civil Engineering", "Electrical Engineering", "Electronics & Communication",
  "Physics", "Chemistry", "Mathematics", "Biology", "Economics", "English",
  "History", "Political Science", "Accounting", "Finance", "Marketing",
  "Human Resources", "General", "Other"
];

const INITIAL_RECORD: AcademicRecord = {
  id: "",
  institution: "",
  major: "",
  gpa: "",
  graduation: "",
  year: "",
  currentCourse: "",
  currentCourseCategory: "",
};

export default function StudentProfileAcademicScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();


  // State for list of records
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal & Editing State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AcademicRecord>(INITIAL_RECORD);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

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

  useEffect(() => {
    fetchAcademicDetails();
  }, []);

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
    setEditingRecord({ ...INITIAL_RECORD }); // Keep ID empty for new record
    setValidationErrors({});
    setIsModalVisible(true);
  };

  const handleEdit = (record: AcademicRecord) => {
    setEditingRecord({ ...record });
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

    // GPA Validation
    if (editingRecord.gpa) {
      const gpaNum = parseFloat(editingRecord.gpa);
      if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > 10.0) {
        errors.gpa = "Invalid GPA (0-10)";
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
            percentage: editingRecord.gpa,
            cgpa: editingRecord.gpa,
            academic_year: editingRecord.year,
            graduation_year: editingRecord.graduation,
          };

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

  const SelectionModal = ({ visible, onClose, title, options, selected, onSelect }: any) => {
    if (!visible) return null;
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
          <ScrollView style={{ maxHeight: 350 }}>
            {options.map((opt: string) => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionRow, selected === opt && styles.optionSelected, { borderBottomColor: colors.border }]}
                onPress={() => onSelect(opt)}
              >
                <Text style={[styles.optionText, { color: colors.text }, selected === opt && styles.optionTextSelected]}>
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
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Academic Records</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAddNew}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

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
            <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 30 }}>
              {/* Course & Category */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Course Name *</Text>
                <TouchableOpacity
                  style={[styles.selector, { borderColor: validationErrors.currentCourse ? '#EF4444' : colors.border, backgroundColor: isDark ? '#1F1F1F' : '#FAFAFA' }]}
                  onPress={() => setShowCoursePicker(true)}
                >
                  <Text style={{ color: editingRecord.currentCourse ? colors.text : colors.textSecondary }}>
                    {editingRecord.currentCourse || "Select Course"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {validationErrors.currentCourse && <Text style={styles.errorText}>{validationErrors.currentCourse}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Category *</Text>
                <TouchableOpacity
                  style={[styles.selector, { borderColor: validationErrors.currentCourseCategory ? '#EF4444' : colors.border, backgroundColor: isDark ? '#1F1F1F' : '#FAFAFA' }]}
                  onPress={() => setShowCategoryPicker(true)}
                >
                  <Text style={{ color: editingRecord.currentCourseCategory ? colors.text : colors.textSecondary }}>
                    {editingRecord.currentCourseCategory || "Select Category"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {validationErrors.currentCourseCategory && <Text style={styles.errorText}>{validationErrors.currentCourseCategory}</Text>}
              </View>

              <CustomTextInput
                label="Institution Name *"
                value={editingRecord.institution}
                onChangeText={(t) => handleFieldChange("institution", t)}
                style={{ marginBottom: 16 }}
                error={validationErrors.institution}
              />

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Major / Stream *</Text>
                <TouchableOpacity
                  style={[styles.selector, { borderColor: validationErrors.major ? '#EF4444' : colors.border, backgroundColor: isDark ? '#1F1F1F' : '#FAFAFA' }]}
                  onPress={() => setShowMajorPicker(true)}
                >
                  <Text style={{ color: editingRecord.major ? colors.text : colors.textSecondary }}>
                    {editingRecord.major || "Select Major"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {validationErrors.major && <Text style={styles.errorText}>{validationErrors.major}</Text>}
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <CustomTextInput
                    label="GPA / Percentage"
                    value={editingRecord.gpa}
                    onChangeText={(t) => handleFieldChange("gpa", t)}
                    keyboardType="numeric"
                    placeholder="e.g. 8.5"
                    error={validationErrors.gpa}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Academic Year *</Text>
                    <TouchableOpacity
                      style={[styles.selector, { borderColor: validationErrors.year ? '#EF4444' : colors.border, backgroundColor: isDark ? '#1F1F1F' : '#FAFAFA', height: 50, paddingVertical: 14 }]}
                      onPress={() => setShowAcademicYearPicker(true)}
                    >
                      <Text style={{ color: editingRecord.year ? colors.text : colors.textSecondary }}>
                        {editingRecord.year || "Select Year"}
                      </Text>
                    </TouchableOpacity>
                    {validationErrors.year && <Text style={styles.errorText}>{validationErrors.year}</Text>}
                  </View>
                </View>
              </View>

              {/* Graduation Date Picker - Added Back */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Expected Graduation</Text>
                <TouchableOpacity
                  style={[styles.selector, { borderColor: colors.border, backgroundColor: isDark ? '#1F1F1F' : '#FAFAFA' }]}
                  onPress={() => setShowGradDatePicker(true)}
                >
                  <Text style={{ color: editingRecord.graduation ? colors.text : colors.textSecondary }}>
                    {editingRecord.graduation || "Select Date"}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
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
            options={COURSE_OPTIONS}
            selected={editingRecord.currentCourse}
            onSelect={(val: string) => { handleFieldChange("currentCourse", val); setShowCoursePicker(false); }}
          />
          <SelectionModal
            visible={showCategoryPicker}
            onClose={() => setShowCategoryPicker(false)}
            title="Select Category"
            options={COURSE_CATEGORY_OPTIONS}
            selected={editingRecord.currentCourseCategory}
            onSelect={(val: string) => { handleFieldChange("currentCourseCategory", val); setShowCategoryPicker(false); }}
          />
          <SelectionModal
            visible={showMajorPicker}
            onClose={() => setShowMajorPicker(false)}
            title="Select Major"
            options={MAJOR_OPTIONS}
            selected={editingRecord.major}
            onSelect={(val: string) => { handleFieldChange("major", val); setShowMajorPicker(false); }}
          />

          {/* Date Pickers (Moved inside Modal to fix z-order overlay issue) */}
          <DateTimePickerModal
            isVisible={showAcademicYearPicker}
            mode="date"
            display="spinner"
            locale="en-GB"
            onConfirm={(date) => {
              handleFieldChange("year", date.getFullYear().toString());
              setShowAcademicYearPicker(false);
            }}
            onCancel={() => setShowAcademicYearPicker(false)}
            isDarkModeEnabled={isDark}
          />

          <DateTimePickerModal
            isVisible={showGradDatePicker}
            mode="date"
            display="spinner"
            locale="en-GB"
            onConfirm={(date) => {
              handleFieldChange("graduation", date.toLocaleDateString('en-GB'));
              setShowGradDatePicker(false);
            }}
            onCancel={() => setShowGradDatePicker(false)}
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
  inputGroup: { marginBottom: 16 },
  label: { marginBottom: 8, fontSize: 14, fontWeight: '600' },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56
  },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },

  // Selection Modal (Internal)
  modalOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", zIndex: 1000 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
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
});
