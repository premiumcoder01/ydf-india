import { Button, CustomTextInput, ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  DimensionValue,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// --- Static Data ---
const GEO_DATA = {
  states: ["Maharashtra", "Karnataka", "Gujarat", "Delhi", "Tamil Nadu", "Uttar Pradesh", "West Bengal", "Rajasthan"],
  districts: ["Mumbai", "Pune", "Bangalore", "Mysore", "Ahmedabad", "Surat", "New Delhi", "Chennai", "Kolkata", "Jaipur", "Lucknow"],
  blocks: ["Block A", "Block B", "Block C", "Block D", "Block E"],
  villages: ["Village X", "Village Y", "Village Z", "Town Alpha", "Town Beta"],
};

const DOCUMENT_OPTIONS: Record<string, string[]> = {
  "Identity Proof": ["Aadhaar Card", "PAN Card", "Voter ID", "Passport", "Driving License", "College ID", "Other"],
  "Address Proof": ["Aadhaar Card", "Passport", "Voter ID", "Ration Card", "Electricity Bill", "Rent Agreement", "Driving License", "Other"],
  "Income Certificate": ["Income Certificate", "Salary Slip", "Form 16", "ITR Acknowledgement", "Other"],
  "Academic Marksheets": ["10th Marksheet", "12th Marksheet", "Graduation Marksheet", "Last Passing Marksheet", "Diploma Certificate", "Other"],
  "Admission Proof / Fees Receipt": ["Admission Letter", "Fee Receipt", "Bonafide Certificate", "College ID Card", "Other"],
  "Bank Account Details": ["Bank Passbook", "Cancelled Cheque", "Bank Statement", "Other"],
  "Disbursement Proof": ["Payment Receipt", "Transaction Screenshot", "Other"],
  "Caste Certificate": ["Caste Certificate", "Tribe Certificate", "Other"],
};

// --- Types ---
type Stage = {
  id: string;
  name: string;
  mode: string;
  startDate: Date | null;
  endDate: Date | null;
};

type FormData = {
  // Step 1: Basic Details
  schemeName: string;
  category: string;
  providerName: string;
  description: string;
  logo: string | null;
  banner: string | null;
  startDate: Date | null;
  endDate: Date | null;
  numStages: number;
  stages: Stage[];
  totalSeats: string;
  amountType: "fixed" | "actuals";
  fixedAmount: string;
  actualAmountLimit: string;
  paymentCycle: string;
  distributionStudent: string; // 0-100%
  distributionInstitute: string; // 0-100%

  // Step 2: Eligibility
  states: string[];
  districts: string[];
  blocks: string[];
  villages: string[];
  gender: string[];
  casteCategory: string[];
  specialCategory: string[];
  incomeLimit: string;
  educationLevel: string[];
  streams: string[];
  lastClassPercent: string;
  tenthClassPercent: string;
  twelfthClassPercent: string;
  competitiveExams: string;
  minRank: string;
  minScore: string;

  // Step 3: Documents
  requiredDocuments: { category: string; description: string }[];
};

const STEPS = ["Basic Details", "Eligibility", "Documents"];

export default function ProviderAddScholarshipScreen() {
  const { id } = useLocalSearchParams();
  const isEditMode = !!id;
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [formData, setFormData] = useState<FormData>({
    schemeName: "",
    category: "",
    providerName: "",
    description: "",
    logo: null,
    banner: null,
    startDate: null,
    endDate: null,
    numStages: 1,
    stages: [
      { id: "1", name: "Application", mode: "Online", startDate: null, endDate: null },
    ],
    totalSeats: "",
    amountType: "fixed",
    fixedAmount: "",
    actualAmountLimit: "",
    paymentCycle: "One-time",
    distributionStudent: "100",
    distributionInstitute: "0",
    states: [],
    districts: [],
    blocks: [],
    villages: [],
    gender: [],
    casteCategory: [],
    specialCategory: [],
    incomeLimit: "",
    educationLevel: [],
    streams: [],
    lastClassPercent: "",
    tenthClassPercent: "",
    twelfthClassPercent: "",
    competitiveExams: "",
    minRank: "",
    minScore: "",
    requiredDocuments: [],
  });

  useEffect(() => {
    if (isEditMode && id) {
      // Fetch details to prefill
      const fetchDetails = async () => {
        try {
          // In a real app, use getScholarshipDetails(token, id) and map response to formData
          // For now, we update the title/mode to indicate readiness
          console.log("Edit mode for ID:", id);
        } catch (e) { console.error(e); }
      };
      fetchDetails();
    }
  }, [id, isEditMode]);

  const [selectionModal, setSelectionModal] = useState<{
    show: boolean;
    title: string;
    options: string[];
    field: string;
    stageId?: string;
    isMulti?: boolean;
  }>({
    show: false,
    title: "",
    options: [],
    field: "",
  });

  const [datePicker, setDatePicker] = useState<{
    show: boolean;
    field: string;
    stageId?: string;
    type: "start" | "end";
  }>({
    show: false,
    field: "",
    type: "start",
  });

  // --- Handlers ---
  const updateField = (key: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handlePickImage = async (field: "logo" | "banner") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: field === "logo" ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      updateField(field, result.assets[0].uri);
    }
  };

  const toggleSelection = (key: keyof FormData, value: string) => {
    if (key === "requiredDocuments") {
      const docs = [...formData.requiredDocuments];
      const index = docs.findIndex(d => d.category === value);
      if (index > -1) {
        docs.splice(index, 1);
      } else {
        docs.push({ category: value, description: "" });
      }
      setFormData({ ...formData, requiredDocuments: docs });
    } else {
      const current = (formData[key] as string[]) || [];
      if (current.includes(value)) {
        updateField(key, current.filter((v) => v !== value));
      } else {
        updateField(key, [...current, value]);
      }
    }
  };

  const updateDocumentDescription = (category: string, description: string) => {
    const docs = [...formData.requiredDocuments];
    const index = docs.findIndex(d => d.category === category);
    if (index > -1) {
      docs[index] = { ...docs[index], description };
      setFormData({ ...formData, requiredDocuments: docs });
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = () => {
    Alert.alert("Success", "Scholarship details submitted for verification.");
    router.back();
  };

  const handleDistributionChange = (field: "distributionStudent" | "distributionInstitute", value: string) => {
    let numVal = parseInt(value) || 0;
    if (numVal > 100) numVal = 100;
    const otherVal = (100 - numVal).toString();

    if (field === "distributionStudent") {
      setFormData(prev => ({ ...prev, distributionStudent: numVal.toString(), distributionInstitute: otherVal }));
    } else {
      setFormData(prev => ({ ...prev, distributionInstitute: numVal.toString(), distributionStudent: otherVal }));
    }
  };

  const addStage = () => {
    const nextId = (formData.stages.length + 1).toString();
    const newStage: Stage = {
      id: nextId,
      name: `Stage ${nextId}`,
      mode: "Online",
      startDate: null,
      endDate: null,
    };
    updateField("stages", [...formData.stages, newStage]);
  };

  const removeStage = (id: string) => {
    updateField("stages", formData.stages.filter(s => s.id !== id));
  };

  // --- Render Helpers ---

  const SectionHeader = ({ title, icon }: { title: string; icon: string }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + "15" }]}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );

  const StepIndicator = () => (
    <View style={[styles.stepIndicatorContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {STEPS.map((step, index) => (
        <React.Fragment key={step}>
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                {
                  backgroundColor:
                    index <= currentStep ? colors.primary : colors.surface,
                  borderColor: index <= currentStep ? colors.primary : colors.border,
                },
              ]}
            >
              {index < currentStep ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    { color: index <= currentStep ? "#fff" : colors.textSecondary },
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                {
                  color: index <= currentStep ? colors.primary : colors.textSecondary,
                  fontWeight: index === currentStep ? "700" : "500",
                },
              ]}
            >
              {step}
            </Text>
          </View>
          {index < STEPS.length - 1 && (
            <View
              style={[
                styles.stepLine,
                { backgroundColor: index < currentStep ? colors.primary : colors.border },
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const renderBasicDetails = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: -20 }}
      style={styles.stepContent}
    >
      {/* Identity Section */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconBox, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.1)" : "#EEF2FF" }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Scheme Identity</Text>
        </View>

        <View style={styles.inputGroup}>
          <CustomTextInput
            label="Scheme Full Name"
            placeholder="e.g. National Merit Scholarship 2025"
            value={formData.schemeName}
            onChangeText={(v) => updateField("schemeName", v)}
          />
        </View>


        <View style={{ flex: 1, marginRight: 8, marginBottom: 10 }}>
          <Text style={[styles.label, { color: colors.text, marginTop: 0 }]}>Category</Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setSelectionModal({
              show: true,
              title: "Select Category",
              options: ["Merit-based", "Need-based", "Minority", "Talent-based", "Sports", "Special Ability", "General Research", "Other"],
              field: "category"
            })}
          >
            <Text style={[styles.inputValue, { color: formData.category ? colors.text : colors.textSecondary }]}>
              {formData.category || "Select Type"}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, marginVertical: 10 }}>
          <CustomTextInput
            label="Provider Name"
            placeholder="Organization / Dept"
            value={formData.providerName}
            onChangeText={(v) => updateField("providerName", v)}
            mainStyle={{ marginBottom: 0 }}
          />
        </View>


        <View style={[styles.inputGroup, { marginTop: 5 }]}>
          <CustomTextInput
            label="Brief Description"
            placeholder="Describe the scholarship objective and benefits..."
            value={formData.description}
            onChangeText={(v) => updateField("description", v)}
            multiline
          />
        </View>
      </View>

      {/* Visual Assets */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconBox, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5" }]}>
            <Ionicons name="image-outline" size={20} color="#10B981" />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Visual Assets</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.label, { color: colors.text }]}>Logo (1:1)</Text>
            <TouchableOpacity
              style={[styles.uploadBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handlePickImage("logo")}
            >
              {formData.logo ? (
                <Image source={{ uri: formData.logo }} style={styles.uploadedImageFull} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                  <Text style={styles.uploadText}>Upload Logo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ flex: 2, marginLeft: 8 }}>
            <Text style={[styles.label, { color: colors.text }]}>Banner (16:9)</Text>
            <TouchableOpacity
              style={[styles.uploadBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handlePickImage("banner")}
            >
              {formData.banner ? (
                <Image source={{ uri: formData.banner }} style={styles.uploadedImageFull} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="image-outline" size={24} color={colors.primary} />
                  <Text style={styles.uploadText}>Upload Cover Image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Timeline Section */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconBox, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "#FFFBEB" }]}>
            <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Program Timeline</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.label, { color: colors.text }]}>Starts On</Text>
            <TouchableOpacity
              style={[styles.dateInput, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setDatePicker({ show: true, field: "startDate", type: "start" })}
            >
              <Ionicons name="calendar" size={18} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: formData.startDate ? colors.text : colors.textSecondary }]}>
                {formData.startDate ? formData.startDate.toLocaleDateString() : "Select Date"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.label, { color: colors.text }]}>Ends On</Text>
            <TouchableOpacity
              style={[styles.dateInput, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setDatePicker({ show: true, field: "endDate", type: "end" })}
            >
              <Ionicons name="calendar" size={18} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: formData.endDate ? colors.text : colors.textSecondary }]}>
                {formData.endDate ? formData.endDate.toLocaleDateString() : "Select Date"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stages Section */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.cardHeader, { marginBottom: 16 }]}>
          <View style={[styles.cardIconBox, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.1)" : "#F5F3FF" }]}>
            <Ionicons name="git-merge-outline" size={20} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Selection Stages</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Define selection process steps</Text>
          </View>
          <TouchableOpacity
            style={[styles.addStageBtnSmall, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.2)" : "#EEF2FF" }]}
            onPress={addStage}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[styles.addStageTextSmall, { color: colors.primary }]}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stagesList}>
          {formData.stages.map((stage, idx) => (
            <MotiView
              key={stage.id}
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={[styles.stageItem, { backgroundColor: isDark ? colors.surface : "#F9FAFB", borderColor: colors.border }]}
            >
              <View style={styles.stageItemHeader}>
                <View style={[styles.stageNumberBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stageNumberText}>{idx + 1}</Text>
                </View>
                <TextInput
                  style={[styles.stageNameInput, { color: colors.text }]}
                  value={stage.name}
                  placeholder="Stage Name"
                  placeholderTextColor={colors.textSecondary}
                  onChangeText={(v) => {
                    const updated = formData.stages.map(s => s.id === stage.id ? { ...s, name: v } : s);
                    updateField("stages", updated);
                  }}
                />
                <View style={styles.stageActions}>
                  <TouchableOpacity
                    style={[styles.modePill, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setSelectionModal({
                      show: true,
                      title: "Select Mode",
                      options: ["Online", "Offline", "Hybrid"],
                      field: "stages_mode",
                      stageId: stage.id
                    })}
                  >
                    <Text style={[styles.modePillText, { color: colors.textSecondary }]}>{stage.mode}</Text>
                    <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeStage(stage.id)} style={styles.removeStageBtn}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.stageDatesRow}>
                <TouchableOpacity
                  onPress={() => setDatePicker({ show: true, field: "stages", stageId: stage.id, type: "start" })}
                  style={styles.miniDateTrigger}
                >
                  <Text style={styles.miniDateLabel}>Start:</Text>
                  <Text style={[styles.miniDateValue, { color: colors.text }]}>
                    {stage.startDate ? stage.startDate.toLocaleDateString() : "Set Date"}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.miniDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity
                  onPress={() => setDatePicker({ show: true, field: "stages", stageId: stage.id, type: "end" })}
                  style={styles.miniDateTrigger}
                >
                  <Text style={styles.miniDateLabel}>End:</Text>
                  <Text style={[styles.miniDateValue, { color: colors.text }]}>
                    {stage.endDate ? stage.endDate.toLocaleDateString() : "Set Date"}
                  </Text>
                </TouchableOpacity>
              </View>
            </MotiView>
          ))}
        </View>
      </View>

      {/* Financials & Distribution */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconBox, { backgroundColor: isDark ? "rgba(6, 182, 212, 0.1)" : "#ECFEFF" }]}>
            <Ionicons name="wallet-outline" size={20} color="#06B6D4" />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Financials</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <CustomTextInput
              label="Total Seats"
              placeholder="0"
              keyboardType="numeric"
              value={formData.totalSeats}
              onChangeText={(v) => updateField("totalSeats", v)}
              mainStyle={{ marginBottom: 0 }}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.label, { color: colors.text, marginTop: 0 }]}>Cycle</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSelectionModal({
                show: true,
                title: "Payment Cycle",
                options: ["One-time", "Monthly", "Quarterly", "Half-yearly", "Yearly"],
                field: "paymentCycle"
              })}
            >
              <Text style={[styles.inputValue, { color: formData.paymentCycle ? colors.text : colors.textSecondary }]}>
                {formData.paymentCycle}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.segmentedControl, { backgroundColor: isDark ? colors.surface : "#F3F4F6" }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, formData.amountType === "fixed" && styles.segmentBtnActive]}
            onPress={() => updateField("amountType", "fixed")}
          >
            <Text style={[styles.segmentText, formData.amountType === "fixed" && styles.segmentTextActive]}>Fixed Amount</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, formData.amountType === "actuals" && styles.segmentBtnActive]}
            onPress={() => updateField("amountType", "actuals")}
          >
            <Text style={[styles.segmentText, formData.amountType === "actuals" && styles.segmentTextActive]}>Actual Costs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <CustomTextInput
            label={formData.amountType === "fixed" ? "Scholarship Amount" : "Max Limit (Per Student)"}
            placeholder="₹ 0.00"
            keyboardType="numeric"
            value={formData.amountType === "fixed" ? formData.fixedAmount : formData.actualAmountLimit}
            onChangeText={(v) => updateField(formData.amountType === "fixed" ? "fixedAmount" : "actualAmountLimit", v)}
          />
        </View>

        <View style={[styles.distributionBox, { backgroundColor: isDark ? colors.surface : "#F9FAFB", borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text, marginBottom: 12 }]}>Fund Distribution</Text>

          <View style={styles.distBarWrapper}>
            <View style={[styles.distBarFill, { width: `${formData.distributionStudent}%` as DimensionValue, backgroundColor: colors.primary }]} />
            <View style={[styles.distBarRemaining, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.distInputsRow}>
            <View style={styles.distInputItem}>
              <Text style={[styles.distInputLabel, { color: colors.textSecondary }]}>Student</Text>
              <View style={[styles.distInputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  value={formData.distributionStudent}
                  onChangeText={(v) => handleDistributionChange("distributionStudent", v)}
                  style={[styles.distInputText, { color: colors.text }]}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.distSymbol}>%</Text>
              </View>
            </View>

            <View style={styles.distInputItem}>
              <Text style={[styles.distInputLabel, { color: colors.textSecondary }]}>Institute</Text>
              <View style={[styles.distInputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  value={formData.distributionInstitute}
                  onChangeText={(v) => handleDistributionChange("distributionInstitute", v)}
                  style={[styles.distInputText, { color: colors.text }]}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.distSymbol}>%</Text>
              </View>
            </View>
          </View>
        </View>

      </View>
    </MotiView>
  );

  const renderEligibility = () => (
    <MotiView
      from={{ opacity: 0, translateX: 50 }}
      animate={{ opacity: 1, translateX: 0 }}
      exit={{ opacity: 0, translateX: -50 }}
      style={styles.stepContent}
    >
      {/* Geography Section */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconBox, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.1)" : "#EFF6FF" }]}>
            <Ionicons name="earth-outline" size={20} color="#3B82F6" />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Geographical Criteria</Text>
        </View>

        <View style={styles.chipGrid}>
          {[
            { label: "State", field: "states" },
            { label: "District", field: "districts" },
            { label: "Block", field: "blocks" },
            { label: "Village / Town", field: "villages" },
          ].map((item, index) => (
            <View key={item.field} style={{ width: '48%' }}>
              <Text style={[styles.label, { color: colors.text, marginBottom: 6 }]}>{item.label}</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 12 }]}
                onPress={() => {
                  setSelectionModal({
                    show: true,
                    title: `Select ${item.label}`,
                    options: GEO_DATA[item.field as keyof typeof GEO_DATA] || [],
                    field: item.field,
                    isMulti: true
                  });
                }}
              >
                <Text style={[styles.inputValue, { fontSize: 13, color: (formData[item.field as keyof FormData] as string[]).length > 0 ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                  {(formData[item.field as keyof FormData] as string[]).length > 0
                    ? `${(formData[item.field as keyof FormData] as string[]).length} selected`
                    : "Select"}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* Demography Section */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconBox, { backgroundColor: isDark ? "rgba(236, 72, 153, 0.1)" : "#FDF2F8" }]}>
            <Ionicons name="people-outline" size={20} color="#EC4899" />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Demographic Criteria</Text>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
          <View style={styles.chipGrid}>
            {["Male", "Female", "Transgender", "Any gender"].map((g) => {
              const isSelected = formData.gender.includes(g);
              return (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.selectionChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => {
                    if (g === "Any gender") {
                      updateField("gender", isSelected ? [] : ["Any gender"]);
                    } else {
                      let next = formData.gender.filter(i => i !== "Any gender");
                      isSelected ? next = next.filter(i => i !== g) : next.push(g);
                      updateField("gender", next);
                    }
                  }}
                >
                  <Text style={[styles.chipText, { color: isSelected ? "#fff" : colors.text }]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.label, { color: colors.text }]}>Caste Category</Text>
          <View style={styles.chipGrid}>
            {["SC", "ST", "OBC", "General", "Any category"].map((c) => {
              const isSelected = formData.casteCategory.includes(c);
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.selectionChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => {
                    if (c === "Any category") {
                      updateField("casteCategory", isSelected ? [] : ["Any category"]);
                    } else {
                      let next = formData.casteCategory.filter(i => i !== "Any category");
                      isSelected ? next = next.filter(i => i !== c) : next.push(c);
                      updateField("casteCategory", next);
                    }
                  }}
                >
                  <Text style={[styles.chipText, { color: isSelected ? "#fff" : colors.text }]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.label, { color: colors.text }]}>Special Category</Text>
          <View style={styles.chipGrid}>
            {["Single Parent", "Orphan", "PwD", "Any category"].map((s) => {
              const isSelected = formData.specialCategory.includes(s);
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.selectionChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => {
                    if (s === "Any category") {
                      updateField("specialCategory", isSelected ? [] : ["Any category"]);
                    } else {
                      let next = formData.specialCategory.filter(i => i !== "Any category");
                      isSelected ? next = next.filter(i => i !== s) : next.push(s);
                      updateField("specialCategory", next);
                    }
                  }}
                >
                  <Text style={[styles.chipText, { color: isSelected ? "#fff" : colors.text }]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <CustomTextInput
            label="Family Annual Income Limit"
            placeholder="e.g. 250000"
            value={formData.incomeLimit}
            onChangeText={(v) => updateField("incomeLimit", v)}
            keyboardType="numeric"
            mainStyle={{ marginBottom: 0 }}
          />
        </View>
      </View>

      {/* Academics Section */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconBox, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "#FFFBEB" }]}>
            <Ionicons name="school-outline" size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Academic Qualifications</Text>
        </View>

        {/* Education Levels List */}
        <View style={{ gap: 12 }}>
          {[
            { label: "Any", streams: ["Any"] },
            { label: "School (Class 1-12)", streams: ["Any", "Arts", "Commerce", "Science"] },
            { label: "ITI / Diploma", streams: ["Any", "Mechanical", "Electrical", "Civil", "CS", "Other"] },
            { label: "Graduation", streams: ["Any", "B.Tech", "B.Sc", "B.Com", "B.A", "MBBS", "Other"] },
            { label: "Post Graduation", streams: ["Any", "M.Tech", "M.Sc", "M.Com", "MBA", "Other"] },
          ].map((level) => {
            const isLvlSelected = formData.educationLevel.includes(level.label);
            return (
              <View key={level.label} style={[styles.stageItem, { backgroundColor: isDark ? colors.surface : "#F9FAFB", borderColor: colors.border, padding: 0, overflow: 'hidden' }]}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}
                  onPress={() => toggleSelection("educationLevel", level.label)}
                >
                  <View style={[styles.checkbox, isLvlSelected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    {isLvlSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={{ marginLeft: 12, fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 }}>{level.label}</Text>
                  <Ionicons name={isLvlSelected ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                {isLvlSelected && level.streams.length > 0 && (
                  <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8, fontWeight: '600' }}>SELECT STREAMS:</Text>
                    <View style={styles.chipGrid}>
                      {level.streams.map(stream => {
                        const streamKey = `${level.label}:${stream}`;
                        const isStreamSelected = formData.streams.includes(streamKey);
                        return (
                          <TouchableOpacity
                            key={stream}
                            style={[
                              styles.selectionChip,
                              {
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                backgroundColor: isStreamSelected ? colors.primary : colors.surface,
                                borderColor: isStreamSelected ? colors.primary : colors.border
                              }
                            ]}
                            onPress={() => toggleSelection("streams", streamKey)}
                          >
                            <Text style={[styles.chipText, { fontSize: 12, color: isStreamSelected ? "#fff" : colors.text }]}>{stream}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Merit & Exam Criteria */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconBox, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.1)" : "#F5F3FF" }]}>
            <Ionicons name="trophy-outline" size={20} color="#8B5CF6" />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Merit & Performance</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <CustomTextInput
              label="Min Last Class %"
              placeholder="0.0"
              keyboardType="numeric"
              value={formData.lastClassPercent}
              onChangeText={(v) => updateField("lastClassPercent", v)}
              mainStyle={{ marginBottom: 0 }}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <CustomTextInput
              label="Min 10th Class %"
              placeholder="0.0"
              keyboardType="numeric"
              value={formData.tenthClassPercent}
              onChangeText={(v) => updateField("tenthClassPercent", v)}
              mainStyle={{ marginBottom: 0 }}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <CustomTextInput
              label="Min 12th Class %"
              placeholder="0.0"
              keyboardType="numeric"
              value={formData.twelfthClassPercent}
              onChangeText={(v) => updateField("twelfthClassPercent", v)}
              mainStyle={{ marginBottom: 0 }}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            {/* Empty spacer or additional criteria */}
          </View>
        </View>

        <View style={{ marginBottom: 12, marginTop: 4, height: 1, backgroundColor: colors.border }} />

        <Text style={[styles.label, { color: colors.text, marginBottom: 12 }]}>Competitive Exam (Optional)</Text>
        <CustomTextInput
          label="Exam Name"
          placeholder="e.g. JEE Mains, NEET, CLAT"
          value={formData.competitiveExams}
          onChangeText={(v) => updateField("competitiveExams", v)}
        />

        <View style={[styles.row, { marginTop: 4 }]}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <CustomTextInput
              label="Min Rank"
              placeholder="Enter Rank"
              keyboardType="numeric"
              value={formData.minRank}
              onChangeText={(v) => updateField("minRank", v)}
              mainStyle={{ marginBottom: 0 }}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <CustomTextInput
              label="Min Score"
              placeholder="Enter Score"
              keyboardType="numeric"
              value={formData.minScore}
              onChangeText={(v) => updateField("minScore", v)}
              mainStyle={{ marginBottom: 0 }}
            />
          </View>
        </View>

      </View>
    </MotiView>
  );

  const renderDocuments = () => (
    <MotiView
      from={{ opacity: 0, translateX: 50 }}
      animate={{ opacity: 1, translateX: 0 }}
      exit={{ opacity: 0, translateX: -50 }}
      style={styles.stepContent}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconBox, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5" }]}>
            <Ionicons name="document-text-outline" size={20} color="#10B981" />
          </View>
          <View style={{ flex: 1, marginLeft: 4 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Required Documents</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Select documents applicants must submit</Text>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          {[
            "Identity Proof",
            "Address Proof",
            "Income Certificate",
            "Academic Marksheets",
            "Admission Proof / Fees Receipt",
            "Bank Account Details",
            "Disbursement Proof",
            "Caste Certificate",
          ].map((docCategory) => {
            const selectedDoc = formData.requiredDocuments.find(d => d.category === docCategory);
            const isSelected = !!selectedDoc;

            return (
              <View key={docCategory} style={{ marginBottom: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.selectionChip,
                    {
                      width: '100%',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: isSelected ? (isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5") : colors.surface,
                      borderColor: isSelected ? "#10B981" : colors.border
                    }
                  ]}
                  onPress={() => toggleSelection("requiredDocuments", docCategory)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? "#10B981" : 'transparent',
                        borderColor: isSelected ? "#10B981" : colors.textSecondary,
                        marginRight: 12,
                        width: 22,
                        height: 22,
                        borderRadius: 6
                      }
                    ]}>
                      {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={[styles.chipText, { fontSize: 15, color: colors.text, fontWeight: isSelected ? '600' : '500' }]}>{docCategory}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
                </TouchableOpacity>

                {isSelected && (
                  <MotiView
                    from={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    style={{ marginTop: 8 }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.minimalInput,
                        {
                          width: '100%',
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          paddingHorizontal: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }
                      ]}
                      onPress={() => setSelectionModal({
                        show: true,
                        title: `Select Document Type for ${docCategory}`,
                        options: DOCUMENT_OPTIONS[docCategory] || ["Other"],
                        field: "document_description",
                        stageId: docCategory // Using stageId to pass the category name
                      })}
                    >
                      <Text style={{
                        fontSize: 14,
                        color: selectedDoc.description ? colors.text : colors.textSecondary,
                        fontWeight: '400'
                      }}>
                        {selectedDoc.description || `Select Document Name (e.g. Aadhaar Card)`}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </MotiView>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </MotiView>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}

    >
      <ReviewerHeader
        title={isEditMode ? "Edit Scholarship" : "Create Scholarship"}
        subtitle={isEditMode ? "Update scheme details" : "Publish a new scholarship scheme"}
      />

      <StepIndicator />

      <ScrollView
        contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <AnimatePresence exitBeforeEnter>
          {currentStep === 0 && renderBasicDetails()}
          {currentStep === 1 && renderEligibility()}
          {currentStep === 2 && renderDocuments()}
        </AnimatePresence>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>
            {currentStep === 0 ? "Cancel" : "Back"}
          </Text>
        </TouchableOpacity>

        <Button
          title={currentStep === STEPS.length - 1 ? "Submit" : "Continue"}
          onPress={handleNext}
          style={styles.nextBtn}
        />
      </View>

      {datePicker.show && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setDatePicker({ ...datePicker, show: false });
            if (date) {
              if (datePicker.field === "stages" && datePicker.stageId) {
                const updatedStages = formData.stages.map(s =>
                  s.id === datePicker.stageId
                    ? { ...s, [datePicker.type === "start" ? "startDate" : "endDate"]: date }
                    : s
                );
                updateField("stages", updatedStages);
              } else {
                updateField(datePicker.field as any, date);
              }
            }
          }}
        />
      )}

      {/* Selection Modal */}
      <Modal
        visible={selectionModal.show}
        transparent
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectionModal({ ...selectionModal, show: false })}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{selectionModal.title}</Text>
              <TouchableOpacity onPress={() => setSelectionModal({ ...selectionModal, show: false })}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.optionsList}>
              {selectionModal.options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionRow, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    const { field, stageId, isMulti } = selectionModal;
                    if (isMulti) {
                      toggleSelection(field as any, option);
                    } else if (field === "stages_mode" && stageId) {
                      const updated = formData.stages.map(s => s.id === stageId ? { ...s, mode: option } : s);
                      updateField("stages", updated);
                      setSelectionModal({ ...selectionModal, show: false });
                    } else if (field === "document_description" && stageId) {
                      updateDocumentDescription(stageId, option);
                      setSelectionModal({ ...selectionModal, show: false });
                    } else {
                      updateField(field as any, option);
                      setSelectionModal({ ...selectionModal, show: false });
                    }
                  }}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
                  {(
                    (selectionModal.isMulti && Array.isArray(formData[selectionModal.field as keyof FormData]) && (formData[selectionModal.field as keyof FormData] as string[]).includes(option)) ||
                    (!selectionModal.isMulti && formData[selectionModal.field as keyof FormData] === option) ||
                    (selectionModal.field === "stages_mode" && formData.stages.find(s => s.id === selectionModal.stageId)?.mode === option) ||
                    (selectionModal.field === "document_description" && formData.requiredDocuments.find(d => d.category === selectionModal.stageId)?.description === option)
                  ) && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollInner: {
    padding: 20,
  },
  stepIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "700",
  },
  stepLabel: {
    fontSize: 10,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepLine: {
    width: width * 0.15,
    height: 2,
    marginHorizontal: 8,
    marginBottom: 16,
  },
  stepContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
    color: "#555",
  },
  subLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#777",
    marginBottom: 10,
    marginTop: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  imagePickerSmall: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  imagePickerLarge: {
    flex: 1,
    height: 80,
    marginLeft: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  imagePlaceholderSmall: {
    alignItems: "center",
  },
  imagePlaceholderLarge: {
    alignItems: "center",
  },
  imagePlaceholderText: {
    fontSize: 10,
    marginTop: 4,
    color: "#999",
    fontWeight: "500",
  },
  pickedImageSmall: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  pickedImageLarge: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  dateSelector: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    backgroundColor: "#fafafa",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  stagesContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    padding: 12,
  },
  stagesHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 8,
    marginBottom: 8,
  },
  columnHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
  },
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  stageName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  modeBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  modeText: {
    fontSize: 12,
    color: "#0056D2",
    fontWeight: "600",
  },
  stageDateBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  addStageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#eee",
    borderStyle: "dashed",
    borderRadius: 12,
  },
  addStageText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  amountToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    padding: 4,
    marginVertical: 12,
  },
  amountToggle: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  amountToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  distributionInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  distributionLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  percentInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  percentSign: {
    marginLeft: -25,
    marginRight: 10,
    fontWeight: "700",
    color: "#999",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  geoSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "#fff",
  },
  geoText: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    backgroundColor: "#fafafa",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
  },
  helperText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 20,
  },
  docsList: {
    gap: 12,
  },
  docItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: "#fff",
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  docCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  docName: {
    fontSize: 15,
    fontWeight: "600",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  nextBtn: {
    flex: 1,
    marginLeft: 10,
  },
  // New Styles for Added Fields
  stagesWrapper: {
    gap: 12,
    marginBottom: 20,
  },
  stageCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stageCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  stageBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stageBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  stageTitleInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    padding: 0,
  },
  stageDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
  },
  modeSelectorSmall: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    backgroundColor: "#fff",
  },
  modeTextSmall: {
    fontSize: 12,
    fontWeight: "600",
  },
  stageTimeline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stageDateItem: {
    alignItems: "center",
  },
  stageDateLabel: {
    fontSize: 10,
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  stageDateValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  addStageBtnFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#EEF0F4",
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "#FAFBFC",
  },
  minimalInput: {
    fontSize: 16,
    fontWeight: "700",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    minWidth: 60,
    textAlign: "center",
  },
  optionsList: {
    maxHeight: 400,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    paddingRight: 12,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  // Distribution Panel Styles
  distributionPanel: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  distributionBarContainer: {
    height: 12,
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    marginBottom: 20,
    overflow: "hidden",
  },
  distributionBarFill: {
    height: "100%",
  },
  distributionBarRemaining: {
    height: "100%",
  },
  distInputGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  distLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  distLabelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  distInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 12,
  },
  distInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    paddingVertical: 10,
  },
  distPercentSign: {
    fontSize: 14,
    fontWeight: "700",
    color: "#999",
    marginLeft: 4,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 5,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16, // Increased from 14 to match TextInput
  },
  inputValue: {
    fontSize: 16, // Increased from 15 to match TextInput
    fontWeight: "500",
  },
  uploadBox: {
    height: 90,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  uploadPlaceholder: {
    alignItems: "center",
    gap: 4,
  },
  uploadText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  uploadedImageFull: {
    width: "100%",
    height: "100%",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
  },
  addStageBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  addStageTextSmall: {
    fontSize: 12,
    fontWeight: "700",
  },
  stagesList: {
    gap: 12,
  },
  stageItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  stageItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  stageNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stageNumberText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  stageNameInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    padding: 0,
  },
  stageActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  modePillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  removeStageBtn: {
    padding: 4,
  },
  stageDatesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 16,
    marginLeft: 34,
  },
  miniDateTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  miniDateLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
    textTransform: "uppercase",
  },
  miniDateValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  miniDivider: {
    width: 1,
    height: 12,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  segmentTextActive: {
    color: "#111827",
  },
  distributionBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  distBarWrapper: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  distBarFill: {
    height: "100%",
  },
  distBarRemaining: {
    flex: 1,
    height: "100%",
  },
  distInputsRow: {
    flexDirection: "row",
    gap: 12,
  },
  distInputItem: {
    flex: 1,
  },
  distInputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  distInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  distInputText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    paddingVertical: 10,
  },
  distSymbol: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  // Eligibility Styles (Restored)
  geoGrid: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    overflow: "hidden",
    marginBottom: 20,
  },
  geoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  geoLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  geoDropdown: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FAFBFC",
  },
  geoValueText: {
    fontSize: 13,
    color: "#444",
    flex: 1,
  },
  demogSection: {
    marginBottom: 16,
  },
  checkboxGrid: {
    marginLeft: 12,
    gap: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 4,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSmall: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 3,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  academicTable: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F4",
  },
  tableHeadText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  academicRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  lvlSelect: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  lvlText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 1,
  },
  streamColumn: {
    flex: 2,
    gap: 6,
  },
  streamCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-end",
  },
  streamText: {
    fontSize: 12,
    fontWeight: "500",
  },
  shortlistGrid: {
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 12,
  },
  shortlistRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shortlistLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    flex: 1,
  },
  shortlistInput: {
    flex: 1.5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
});