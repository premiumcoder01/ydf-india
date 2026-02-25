import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getAcademicDetails, getScholarshipDetails, getUserProfile, submitApplication, type AcademicDetailItem } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

type DocumentItem = {
  name: string;
  uri: string;
  mimeType?: string | null;
  size?: number | null;
  documentId?: number | string; // To link to specific requirement
  label?: string; // To store the requirement label
};

const formSchema = z.object({
  // Personal (can be prefilled in future from profile)
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Phone number must be a valid 10-digit Indian number"),
  studentId: z.string().min(1, "Student ID is required"),

  // Academic
  institution: z.string().min(2, "Institution is required"),
  major: z.string().min(2, "Major is required"),
  gradDate: z.string().min(4, "Graduation date is required"),
  currentYear: z.string().min(1, "Current year is required"),
  gpa: z
    .string()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) <= 100.0 && Number(v) >= 0), {
      message: "Please enter a valid percentage (0-100)",
    }),

  // Narrative
  statement: z.string().optional(),
  activities: z.string().optional().default(""),
  financial: z.string().optional().default(""),

  // Docs
  // Docs
  documents: z.array(z.any()).optional(),
  acknowledgedDocIds: z.array(z.string()).optional(),

  // Need Assessment (Static/Mock)
  assessmentQ1: z.string().optional(),
  assessmentQ2: z.string().optional(),

  // Interview (Static/Mock)
  interviewMode: z.string().optional(),

  // Verification (Static/Mock)
  verificationTime: z
    .union([z.date(), z.string()])
    .transform((val) => (typeof val === "string" ? new Date(val) : val))
    .optional()
    .nullable(),

  // Declaration
  agreed: z.boolean().refine((v) => v, { message: "You must agree before submitting" }),
});

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
  { key: "personal", title: "Personal Details" },
  { key: "academic", title: "Academic Info" },
  { key: "family", title: "Family / Income" },
  { key: "assessment", title: "Need Assessment" },
  { key: "interview", title: "Interview Details" },
  { key: "verification", title: "Home Verification" },
  { key: "documents", title: "Documents" },
  { key: "summary", title: "Summary" },
  { key: "declare", title: "Declaration" },
] as const;

const FIELDS_BY_STEP: Record<string, (keyof FormValues)[]> = {
  personal: ["fullName", "email", "phone", "studentId"],
  academic: ["institution", "major", "gradDate", "currentYear", "gpa"],
  family: ["financial", "activities", "statement"],
  assessment: ["assessmentQ1", "assessmentQ2"],
  interview: ["interviewMode"],
  verification: ["verificationTime"],
  documents: ["acknowledgedDocIds"],
  summary: [],
  declare: ["agreed"],
};

export default function ApplyFormScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const stepperScrollRef = useRef<ScrollView | null>(null);
  const { scholarshipId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [scholarship, setScholarship] = useState<any>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "error" | "info" }>({
    visible: false,
    message: "",
    type: "info",
  });

  const {
    control,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    reset,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      studentId: "",
      institution: "",
      major: "",
      gradDate: "",
      currentYear: "",
      gpa: "",
      statement: "",
      activities: "",
      financial: "",
      documents: [],
      acknowledgedDocIds: [],
      assessmentQ1: "",
      assessmentQ2: "",
      interviewMode: "",
      verificationTime: null,
      agreed: false,
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const documents = watch("documents") || [];
  const hasDocumentRequirements = Boolean(
    scholarship && Array.isArray(scholarship.documents) && scholarship.documents.length > 0
  );

  const [pickerState, setPickerState] = useState<{ show: boolean; mode: "date" | "time" | "datetime"; field: keyof FormValues | null }>({
    show: false,
    mode: "date",
    field: null,
  });

  const [optionPickerState, setOptionPickerState] = useState<{
    visible: boolean;
    title: string;
    options: string[];
    onSelect: (val: string) => void;
  }>({ visible: false, title: "", options: [], onSelect: () => { } });

  const [academicDetailsList, setAcademicDetailsList] = useState<AcademicDetailItem[]>([]);
  const [loadingAcademicDetails, setLoadingAcademicDetails] = useState(false);
  const [academicDataModalVisible, setAcademicDataModalVisible] = useState(false);
  const [academicModalSearch, setAcademicModalSearch] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return optionPickerState.options;
    return optionPickerState.options.filter(option =>
      option.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [optionPickerState.options, searchQuery]);

  const filteredAcademicList = useMemo(() => {
    if (!academicModalSearch.trim()) return academicDetailsList;
    const q = academicModalSearch.toLowerCase().trim();
    return academicDetailsList.filter(
      (item) =>
        (item.course_name || "").toLowerCase().includes(q) ||
        (item.institution || "").toLowerCase().includes(q) ||
        (item.major || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q)
    );
  }, [academicDetailsList, academicModalSearch]);

  const openPicker = (field: keyof FormValues, mode: "date" | "time" | "datetime") => {
    setPickerState({ show: true, mode, field });
  };

  const handleDateConfirm = (selectedDate: Date) => {
    const currentField = pickerState.field;
    setPickerState({ show: false, mode: "date", field: null });

    if (!selectedDate || !currentField) {
      return;
    }

    if (currentField === "verificationTime") {
      setValue("verificationTime" as any, selectedDate as any, { shouldValidate: true });
    }
  };

  const handleDateCancel = () => {
    setPickerState({ show: false, mode: "date", field: null });
  };


  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const authDataStr = await AsyncStorage.getItem("authData");
        if (authDataStr) {
          const authData = JSON.parse(authDataStr);
          if (authData.token) {

            // 1. Fetch Scholarship Details FIRST to check expiry
            if (scholarshipId) {
              const scholarResponse = await getScholarshipDetails(authData.token, Number(scholarshipId));

              if (scholarResponse.success) {
                const scholarData = scholarResponse.data?.data?.data || scholarResponse.data?.data || scholarResponse.data;
                setScholarship(scholarData);

                // Check if expired
                if (scholarData && scholarData.expired) {
                  Alert.alert("Application Closed", "This scholarship has expired and is no longer accepting applications.", [
                    { text: "OK", onPress: () => router.back() }
                  ]);
                  setLoading(false); // Even though we go back, stop loading
                  return;
                }


              }
            }

            // 2. Fetch User Profile to prefill
            const response = await getUserProfile(authData.token);
            if (response.success && response.data && response.data.user) {
              const user = response.data.user;

              // Helper to find custom field value
              const getField = (shortname: string) =>
                user.customfields?.find((f: any) => f.shortname === shortname)?.value || "";

              reset({
                ...getValues(),
                fullName: user.fullname || `${user.firstname} ${user.lastname}` || "",
                email: user.email || "",
                // Clean phone number (remove +91 or 91)
                phone: (() => {
                  let p = user.phone1 || user.phone || getField('phone') || "";
                  if (typeof p === 'string') {
                    p = p.replace(/\D/g, ''); // keep only digits
                    if (p.length > 10 && (p.startsWith('91'))) {
                      p = p.substring(p.length - 10);
                    }
                  }
                  return p;
                })(),
                studentId: user.username || getField('student_id') || "",

                // Academic Auto-fill
                institution: user.institution || getField('institution') || "",
                major: user.major || getField('major') || "",
                gradDate: user.graduationdate || getField('graduationdate') || "",
                currentYear: user.academicyear || getField('academicyear') || "",
                gpa: user.gpa || getField('gpa') || "",

                // Other fields if available
                financial: getField('financial_info') || "",
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed to prefill form or fetch scholarship:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [reset, getValues, scholarshipId]);

  // --- Draft Saving Logic ---
  const [userId, setUserId] = useState<string | number | null>(null);

  // 1. Get User ID on mount to enable drafting
  useEffect(() => {
    const getUserId = async () => {
      try {
        const authDataStr = await AsyncStorage.getItem("authData");
        if (authDataStr) {
          const authData = JSON.parse(authDataStr);
          if (authData?.user?.id) {
            setUserId(authData.user.id);
          }
        }
      } catch (e) {
        console.log("Error getting user ID for draft", e);
      }
    };
    getUserId();
  }, []);

  // 2. Recovery: Check for draft when UserID is available
  useEffect(() => {
    if (!userId || !scholarshipId) return;

    const checkDraft = async () => {
      try {
        const draftKey = `draft_application_${userId}_${scholarshipId}`;
        const savedDraft = await AsyncStorage.getItem(draftKey);

        if (savedDraft) {
          const { values, step } = JSON.parse(savedDraft);
          Alert.alert(
            "Draft Found",
            "We found an unfinished application for this scholarship. Would you like to resume where you left off?",
            [
              {
                text: "No, Start Fresh",
                style: "cancel",
                onPress: async () => {
                  await AsyncStorage.removeItem(draftKey);
                }
              },
              {
                text: "Yes, Resume",
                onPress: () => {
                  // Merge saved values with default/reset structure to avoid missing keys
                  const restoredValues = { ...values };
                  if (restoredValues.verificationTime && typeof restoredValues.verificationTime === "string") {
                    restoredValues.verificationTime = new Date(restoredValues.verificationTime);
                  }
                  reset({ ...getValues(), ...restoredValues });
                  setStepIndex(step || 0);
                  setToast({ visible: true, message: "Draft restored successfully", type: "success" });
                }
              }
            ]
          );
        }
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    };

    // Small delay to ensure profile fetch doesn't conflict visually, though logic handles merge
    setTimeout(checkDraft, 1000);
  }, [userId, scholarshipId, reset, getValues]);

  // Helper function to save draft manually
  const saveDraft = async (nextStepIndex: number) => {
    if (!userId || !scholarshipId) return;

    try {
      const draftKey = `draft_application_${userId}_${scholarshipId}`;
      const draftData = JSON.stringify({
        values: getValues(),
        step: nextStepIndex // Save the step we're moving TO, not the current step
      });
      await AsyncStorage.setItem(draftKey, draftData);
    } catch (e) {
      console.error("Failed to save draft", e);
    }
  };

  const currentStepKey = useMemo(() => STEPS[stepIndex].key, [stepIndex]);

  // Fetch academic details when user enters Academic Info step (for "Fill from your academic data")
  useEffect(() => {
    if (currentStepKey !== "academic") return;

    const fetchAcademicDetails = async () => {
      setLoadingAcademicDetails(true);
      setAcademicDetailsList([]);
      try {
        const authDataStr = await AsyncStorage.getItem("authData");
        if (!authDataStr) {
          setLoadingAcademicDetails(false);
          return;
        }
        const authData = JSON.parse(authDataStr);
        if (!authData?.token) {
          setLoadingAcademicDetails(false);
          return;
        }
        const res = await getAcademicDetails(authData.token);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setAcademicDetailsList(res.data);
        }
      } catch (e) {
        console.error("Failed to fetch academic details", e);
      } finally {
        setLoadingAcademicDetails(false);
      }
    };

    fetchAcademicDetails();
  }, [currentStepKey]);

  const next = async () => {
    // Validate only fields relevant to current step
    const fields = FIELDS_BY_STEP[currentStepKey];
    if (fields.length) {
      const ok = await trigger(fields as any);
      if (!ok) return; // Validation failed, don't save draft
    }

    if (currentStepKey === "documents" && hasDocumentRequirements) {
      const acknowledged = getValues("acknowledgedDocIds") || [];
      const requiredDocs = scholarship.documents || [];
      // Assuming all listed are required unless specified otherwise, but logic implies all checkboxes needed
      const allChecked = requiredDocs.every((d: any) => {
        const id = String(d.id || d.shortname || d.label || d.name || requiredDocs.indexOf(d));
        return acknowledged.includes(id);
      });

      if (!allChecked) {
        setError("acknowledgedDocIds", { type: "manual", message: "Please confirmation all required documents." });
        return; // Validation failed, don't save draft
      }
    } else if (currentStepKey === "documents") {
      clearErrors("acknowledgedDocIds");
    }

    // Validation passed, move to next step and save draft
    setStepIndex((i) => {
      const ni = Math.min(i + 1, STEPS.length - 1);
      // Save draft with the new step index
      saveDraft(ni);
      return ni;
    });
  };

  const back = () =>
    setStepIndex((i) => {
      const ni = Math.max(0, i - 1);
      return ni;
    });

  const findStepForField = (fieldName: keyof FormValues): number => {
    const stepKey = (Object.keys(FIELDS_BY_STEP) as (keyof typeof FIELDS_BY_STEP)[])
      .find((k) => (FIELDS_BY_STEP[k] as (keyof FormValues)[]).includes(fieldName));
    const idx = stepKey ? STEPS.findIndex((s) => s.key === stepKey) : 0;
    return idx >= 0 ? idx : 0;
  };

  const onSubmit = handleSubmit(
    async (values) => {
      try {
        // Validation for docs is handled in next() step logic now.

        const authDataStr = await AsyncStorage.getItem("authData");
        if (!authDataStr) {
          Alert.alert("Error", "User not logged in");
          return;
        }
        const authData = JSON.parse(authDataStr);
        if (!authData.token) {
          Alert.alert("Error", "Invalid session");
          return;
        }

        const submissionData = {
          scholarship_id: Number(scholarshipId),
          application_text: values.statement || "",
          fullname: values.fullName,
          email: values.email,
          phone: values.phone.length === 10 ? `91${values.phone}` : values.phone,
          student_id: values.studentId,
          institution: values.institution,
          major: values.major,
          graduation_date: values.gradDate,
          current_year: values.currentYear,
          gpa: values.gpa,
          activities: values.activities,
          financial_info: values.financial,
          assessment_q1: values.assessmentQ1,
          assessment_q2: values.assessmentQ2,
          interview_mode: values.interviewMode,
          verification_time: values.verificationTime ? String(values.verificationTime) : undefined,
          documents: values.documents, // Pass documents if API supports it or handle separately
        };

        const response = await submitApplication(authData.token, submissionData);

        if (response.success) {
          setToast({ visible: true, message: response.message || "Application submitted successfully!", type: "success" });

          // Clear draft on success
          if (userId && scholarshipId) {
            const draftKey = `draft_application_${userId}_${scholarshipId}`;
            await AsyncStorage.removeItem(draftKey);
          }

          // Delay redirect to show toast
          setTimeout(() => {
            router.replace("/(dashboard)/student/student-application-status");
          }, 1000);
        } else {
          setToast({ visible: true, message: response.message || "Submission failed", type: "error" });
        }

      } catch (err: any) {
        setToast({ visible: true, message: err.message || "An unexpected error occurred", type: "error" });
      }
    },
    (formErrors) => {
      // Jump to the first errored step and notify user
      const firstErrorField = Object.keys(formErrors)[0] as keyof FormValues | undefined;
      if (firstErrorField) {
        const targetStep = findStepForField(firstErrorField);
        setStepIndex(targetStep);
        // Alert logic...
        const message = (formErrors[firstErrorField]?.message as string) || "Please complete required fields";
        Alert.alert("Incomplete Application", message);
      }
    }
  );

  const STEP_ITEM_WIDTH = 140;


  useEffect(() => {
    const screenW = Dimensions.get('window').width;
    const scrollViewportW = screenW - 40;
    const stepCenter = (stepIndex * STEP_ITEM_WIDTH) + (STEP_ITEM_WIDTH / 2);
    const scrollX = stepCenter - (scrollViewportW / 2);

    stepperScrollRef.current?.scrollTo({ x: Math.max(0, scrollX), animated: true });
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [stepIndex]);

  const Stepper = () => {
    const totalWidth = STEP_ITEM_WIDTH * STEPS.length;

    return (

      <ScrollView
        ref={stepperScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ width: totalWidth, paddingBottom: 10 }}
      >
        <View style={{ width: totalWidth, flexDirection: "row", alignItems: "flex-start" }}>
          {STEPS.map((step, index) => {
            const isCompleted = index < stepIndex;
            const isCurrent = index === stepIndex;
            const isPending = index > stepIndex;

            return (
              <View key={step.key} style={{ width: STEP_ITEM_WIDTH, alignItems: "center" }}>
                {/* Connector Line (before step) */}
                {index > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      left: -STEP_ITEM_WIDTH / 2 + 18,
                      top: 16,
                      width: STEP_ITEM_WIDTH - 32,
                      height: 2,
                      backgroundColor: isCompleted
                        ? "#10B981"
                        : (isDark ? "rgba(255,255,255,0.15)" : "#E5E7EB"),
                    }}
                  />
                )}

                {/* Step Circle */}
                <MotiView
                  from={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "timing", duration: 300, delay: index * 50 }}
                >
                  <View
                    style={{
                      width: isCurrent ? 36 : 32,
                      height: isCurrent ? 36 : 32,
                      borderRadius: isCurrent ? 18 : 16,
                      backgroundColor: isCompleted
                        ? "#10B981"
                        : isCurrent
                          ? colors.primary
                          : (isDark ? colors.surface : "#F3F4F6"),
                      borderWidth: 2,
                      borderColor: isCompleted
                        ? "#10B981"
                        : isCurrent
                          ? colors.primary
                          : (isDark ? "rgba(255,255,255,0.2)" : "#D1D5DB"),
                      justifyContent: "center",
                      alignItems: "center",
                      shadowColor: isCurrent ? colors.primary : "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isCurrent ? 0.3 : 0.1,
                      shadowRadius: isCurrent ? 4 : 2,
                      elevation: isCurrent ? 4 : 2,
                    }}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={{
                          fontSize: isCurrent ? 14 : 13,
                          fontWeight: "700",
                          color: isCurrent
                            ? "#FFFFFF"
                            : (isDark ? colors.textSecondary : "#9CA3AF"),
                        }}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>

                  {/* Pulsing animation for current step */}
                  {isCurrent && (
                    <MotiView
                      from={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.3, opacity: 0 }}
                      transition={{
                        type: "timing",
                        duration: 1500,
                        loop: true,
                      }}
                      style={{
                        position: "absolute",
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: colors.primary,
                      }}
                    />
                  )}
                </MotiView>

                {/* Step Label */}
                <Text
                  style={{
                    marginTop: 6,
                    fontSize: isCurrent ? 11 : 10,
                    fontWeight: isCurrent ? "700" : "600",
                    color: isCompleted
                      ? "#10B981"
                      : isCurrent
                        ? colors.primary
                        : (isDark ? colors.textSecondary : "#6B7280"),
                    textAlign: "center",
                    maxWidth: STEP_ITEM_WIDTH - 20,
                  }}
                  numberOfLines={2}
                >
                  {step.title}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

    );
  };

  const Section = ({ children }: { children: React.ReactNode }) => (
    <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 250 }}>
      <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: isDark ? colors.border : "rgba(0,0,0,0.06)", borderWidth: 1 }]}>{children}</View>
    </MotiView>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#F4F6F8", justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 20, color: colors.text }}>Checking scholarship status...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#F4F6F8" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? colors.background : "#F4F6F8"} />

      <AppHeader title="Apply for Scholarship" onBack={() => router.back()} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} style={styles.scrollView} contentContainerStyle={{ paddingBottom: 20, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
          <Stepper />

          <View style={styles.formContainer}>
            {currentStepKey === "personal" && (
              <Section>
                <Controller control={control} name="fullName" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput label="Full Name" placeholder="Enter your full name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.fullName?.message} required />
                )} />
                <Controller control={control} name="email" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput label="Email" placeholder="Enter your email" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} required />
                )} />
                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", marginBottom: 8, color: colors.text }}>
                        Phone Number <Text style={{ color: "#EF4444" }}>*</Text>
                      </Text>
                      <View
                        style={[
                          {
                            flexDirection: "row",
                            alignItems: "center",
                            borderWidth: 1,
                            borderColor: errors.phone ? "#EF4444" : "rgba(51, 51, 51, 0.1)",
                            borderRadius: 12,
                            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff",
                            height: 50,
                            overflow: "hidden",
                          },
                        ]}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 12,
                            height: "100%",
                            borderRightWidth: 1,
                            borderRightColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(51, 51, 51, 0.1)",
                            backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA",
                          }}
                        >
                          <Text style={{ fontSize: 18, marginRight: 6 }}>🇮🇳</Text>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>+91</Text>
                        </View>
                        <TextInput
                          value={value}
                          onChangeText={(text) => {
                            const numeric = text.replace(/[^0-9]/g, "");
                            if (numeric.length > 10) {
                              onChange(numeric.slice(0, 10));
                            } else {
                              onChange(numeric);
                            }
                          }}
                          onBlur={onBlur}
                          placeholder="Mobile Number"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="number-pad"
                          maxLength={10}
                          style={{
                            flex: 1,
                            paddingHorizontal: 12,
                            fontSize: 15,
                            color: colors.text,
                            height: "100%",
                          }}
                        />
                      </View>
                      {errors.phone && (
                        <Text style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>
                          {errors.phone.message}
                        </Text>
                      )}
                    </View>
                  )}
                />
                <Controller control={control} name="studentId" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput label="Student ID" placeholder="Enter your student ID" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.studentId?.message} required />
                )} />
              </Section>
            )}

            {currentStepKey === "academic" && (
              <Section>
                {loadingAcademicDetails && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, paddingVertical: 8 }}>
                    <ActivityIndicator size="small" color="#8B5CF6" />
                    <Text style={{ marginLeft: 10, fontSize: 14, color: colors.textSecondary }}>Loading your academic data...</Text>
                  </View>
                )}
                {!loadingAcademicDetails && academicDetailsList.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setAcademicModalSearch("");
                      setAcademicDataModalVisible(true);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 20,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(139, 92, 246, 0.4)" : "#C4B5FD",
                      backgroundColor: isDark ? "rgba(139, 92, 246, 0.12)" : "#EDE9FE",
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="document-text" size={20} color="#8B5CF6" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#8B5CF6" }}>Fill from your academic data</Text>
                  </TouchableOpacity>
                )}

                <Modal
                  visible={academicDataModalVisible}
                  animationType="slide"
                  transparent
                  onRequestClose={() => setAcademicDataModalVisible(false)}
                >
                  <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAcademicDataModalVisible(false)} />
                    <View style={{
                      height: Dimensions.get("window").height * 0.7,
                      borderTopLeftRadius: 20,
                      borderTopRightRadius: 20,
                      backgroundColor: colors.background,
                      paddingTop: 16,
                      paddingBottom: insets.bottom + 16,
                    }}>
                      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 8 }}>Your academic data</Text>
                        {/* <TextInput
                          placeholder="Search course, institution, major..."
                          placeholderTextColor={colors.textSecondary}
                          value={academicModalSearch}
                          onChangeText={setAcademicModalSearch}
                          style={{
                            height: 44,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: colors.border,
                            paddingHorizontal: 14,
                            fontSize: 15,
                            color: colors.text,
                            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f8f8f8",
                          }}
                        /> */}
                      </View>
                      <FlatList
                        data={filteredAcademicList}
                        keyExtractor={(item) => String(item.id)}
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
                        ListEmptyComponent={
                          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingVertical: 24 }}>
                            {academicModalSearch.trim() ? "No matching record" : "No academic data"}
                          </Text>
                        }
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            onPress={() => {
                              setValue("institution", item.institution || "");
                              setValue("major", item.major || "");
                              setValue("gradDate", String(item.graduation_year || ""));
                              setValue("currentYear", item.academic_year ? String(item.academic_year) : "");
                              setValue("gpa", item.percentage != null ? String(item.percentage) : (item.cgpa ? String(item.cgpa) : ""));
                              clearErrors(["institution", "major", "gradDate", "currentYear", "gpa"]);
                              setAcademicDataModalVisible(false);
                              setAcademicModalSearch("");
                              setToast({ visible: true, message: "Academic details filled from your data", type: "success" });
                            }}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingVertical: 14,
                              paddingHorizontal: 12,
                              marginBottom: 8,
                              borderRadius: 10,
                              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f5f5f5",
                              borderWidth: 1,
                              borderColor: isDark ? colors.border : "rgba(0,0,0,0.06)",
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }} numberOfLines={1}>
                                {item.course_name}{item.major ? ` · ${item.major}` : ""}
                              </Text>
                              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                                {item.institution || "—"} · Grad {item.graduation_year}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  </View>
                </Modal>

                <Controller control={control} name="institution" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput label="Institution Name" placeholder="Enter your institution" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.institution?.message} required />
                )} />
                <Controller control={control} name="major" render={({ field: { onChange, value } }) => (
                  <TouchableOpacity onPress={() => {
                    setOptionPickerState({
                      visible: true,
                      title: "Select Major / Field of Study",
                      options: [
                        "Computer Science",
                        "Information Technology",
                        "Data Science / AI",
                        "Mechanical Engineering",
                        "Civil Engineering",
                        "Electrical / Electronics Engineering",
                        "Biomedical Engineering",
                        "Chemical Engineering",
                        "Aerospace / Aeronautical Engineering",
                        "Medicine (MBBS)",
                        "Dental (BDS)",
                        "Nursing",
                        "Pharmacy",
                        "Business Administration (BBA/MBA)",
                        "Finance / Accounting",
                        "Economics",
                        "Marketing",
                        "Law (LLB/LLM)",
                        "History",
                        "Political Science",
                        "Psychology",
                        "Sociology",
                        "English / Literature",
                        "Physics",
                        "Chemistry",
                        "Mathematics",
                        "Biology / Biotechnology",
                        "Environmental Science",
                        "Architecture",
                        "Design (Fashion/Graphic/Interior)",
                        "Journalism / Mass Communication",
                        "Agriculture / Horticulture",
                        "Veterinary Science",
                        "Education / Teaching",
                        "Hotel Management / Hospitality",
                        "Vocational Training (ITI)",
                        "Polytechnic / Diploma",
                        "10th Grade (Secondary)",
                        "12th Grade (Higher Secondary)",
                        "Other"
                      ],
                      onSelect: (val) => onChange(val)
                    });
                  }}>
                    <View pointerEvents="none">
                      <CustomTextInput
                        label="Major / Field of Study"
                        placeholder="Select your major"
                        value={value}
                        editable={false}
                        onChangeText={() => { }}
                        error={errors.major?.message}
                        required
                        inputStyle={{ color: colors.text, opacity: 1 }}
                        rightIcon="chevron-down"
                      />
                    </View>
                  </TouchableOpacity>
                )} />
                <Controller control={control} name="gradDate" render={({ field: { onChange, value } }) => (
                  <TouchableOpacity onPress={() => {
                    const currentYear = new Date().getFullYear();
                    const years = Array.from({ length: 10 }, (_, i) => String(currentYear + i));
                    setOptionPickerState({
                      visible: true,
                      title: "Select Graduation Year",
                      options: years,
                      onSelect: (val) => onChange(val)
                    });
                  }}>
                    <View pointerEvents="none">
                      <CustomTextInput
                        label="Expected Graduation Year"
                        placeholder="Select Year"
                        value={value}
                        editable={false}
                        error={errors.gradDate?.message}
                        onChangeText={() => { }}
                        required
                        inputStyle={{ color: colors.text, opacity: 1 }}
                        rightIcon="calendar-outline"
                      />
                    </View>
                  </TouchableOpacity>
                )} />
                <Controller control={control} name="currentYear" render={({ field: { onChange, value } }) => (
                  <TouchableOpacity onPress={() => {
                    setOptionPickerState({
                      visible: true,
                      title: "Current Year of Study",
                      options: ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Internship", "PhD"],
                      onSelect: (val) => onChange(val)
                    });
                  }}>
                    <View pointerEvents="none">
                      <CustomTextInput
                        label="Current Year of Study"
                        placeholder="Select Year"
                        value={value}
                        editable={false}
                        error={errors.currentYear?.message}
                        onChangeText={() => { }}
                        required
                        inputStyle={{ color: colors.text, opacity: 1 }}
                        rightIcon="school-outline"
                      />
                    </View>
                  </TouchableOpacity>
                )} />
                <Controller control={control} name="gpa" render={({ field: { onChange, value, onBlur } }) => (
                  <View style={{ marginBottom: 16 }}>
                    <CustomTextInput
                      label="Last Exam Percentage (%) (Optional)"
                      placeholder="e.g. 82.5"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="numeric"
                      error={errors.gpa?.message}
                      mainStyle={{ marginBottom: 4 }}
                      maxLength={5}
                    />
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4 }}>
                      If your institute provides CGPA, please convert it to percentage (e.g., CGPA × 9.5).
                    </Text>
                  </View>
                )} />
              </Section>
            )}

            {currentStepKey === "family" && (
              <Section>
                <Controller control={control} name="financial" render={({ field: { onChange, value } }) => (
                  <TouchableOpacity onPress={() => {
                    setOptionPickerState({
                      visible: true,
                      title: "Family Annual Income",
                      options: [
                        "Less than ₹1 Lakh",
                        "₹1 Lakh - ₹3 Lakhs",
                        "₹3 Lakhs - ₹5 Lakhs",
                        "₹5 Lakhs - ₹8 Lakhs",
                        "More than ₹8 Lakhs"
                      ],
                      onSelect: (val) => onChange(val)
                    });
                  }}>
                    <View pointerEvents="none">
                      <CustomTextInput
                        label="Family Annual Income (Optional)"
                        placeholder="Select income range"
                        value={value}
                        editable={false}
                        onChangeText={() => { }}
                        error={errors.financial?.message}
                        inputStyle={{ color: colors.text, opacity: 1 }}
                        rightIcon="chevron-down"
                      />
                    </View>
                  </TouchableOpacity>
                )} />
                <Controller control={control} name="activities" render={({ field: { onChange, value } }) => (
                  <TouchableOpacity onPress={() => {
                    setOptionPickerState({
                      visible: true,
                      title: "Extracurricular Activities",
                      options: [
                        "Sports (Team/Individual)",
                        "Music / Performing Arts",
                        "Debate / Public Speaking",
                        "Volunteering / Social Work",
                        "Student Council / Leadership",
                        "Tech / Coding Clubs",
                        "Arts & Crafts",
                        "None",
                        "Other"
                      ],
                      onSelect: (val) => onChange(val)
                    });
                  }}>
                    <View pointerEvents="none">
                      <CustomTextInput
                        label="Extracurricular Activities (Optional)"
                        placeholder="Select primary activity"
                        value={value}
                        editable={false}
                        onChangeText={() => { }}
                        inputStyle={{ color: colors.text, opacity: 1 }}
                        rightIcon="chevron-down"
                      />
                    </View>
                  </TouchableOpacity>
                )} />

                <Controller control={control} name="statement" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput
                    label="Why do you deserve this scholarship? (Optional)"
                    placeholder="Briefly describe your academic achievements, financial need, and career goals (max 150 words)..."
                    value={value || ""}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.statement?.message}
                    inputStyle={{ minHeight: 150 }}
                    multiline={true}
                    style={{ alignItems: "flex-start" }}
                  />
                )} />
              </Section>
            )}

            {currentStepKey === "assessment" && (
              <Section>
                <Text style={{ fontSize: 14, color: isDark ? colors.textSecondary : "#666", marginBottom: 12 }}>
                  Please answer the following to help us assess your need level.
                </Text>

                <Controller control={control} name="assessmentQ1" render={({ field: { value, onChange } }) => (
                  <TouchableOpacity onPress={() => {
                    setOptionPickerState({
                      visible: true,
                      title: "Do you own any vehicle?",
                      options: ["Yes", "No"],
                      onSelect: (val) => onChange(val)
                    });
                  }}>
                    <View pointerEvents="none">
                      <CustomTextInput
                        label="Do you own any vehicle (2-wheeler/4-wheeler)? (Optional)"
                        placeholder="Select Yes/No"
                        value={value || ""}
                        editable={false}
                        onChangeText={() => { }}
                        inputStyle={{ color: colors.text, opacity: 1 }} // Ensure text is visible
                        rightIcon="chevron-down"
                      />
                    </View>
                  </TouchableOpacity>
                )} />

                <Controller control={control} name="assessmentQ2" render={({ field: { value, onChange } }) => (
                  <TouchableOpacity onPress={() => {
                    setOptionPickerState({
                      visible: true,
                      title: "Type of Housing",
                      options: ["Owned", "Rented", "Kutcha House", "Pucca House", "Other"],
                      onSelect: (val) => onChange(val)
                    });
                  }}>
                    <View pointerEvents="none">
                      <CustomTextInput
                        label="Type of Housing (Optional)"
                        placeholder="Select Housing Type"
                        value={value || ""}
                        editable={false}
                        onChangeText={() => { }}
                        inputStyle={{ color: colors.text, opacity: 1 }}
                        rightIcon="chevron-down"
                      />
                    </View>
                  </TouchableOpacity>
                )} />

                <View style={{ marginTop: 8, padding: 12, backgroundColor: isDark ? colors.surface : "#FFF9E6", borderRadius: 8 }}>
                  <Text style={{ fontSize: 13, color: isDark ? colors.text : "#B45309", fontStyle: 'italic' }}>
                    Note: This information helps prioritize applications based on socio-economic markers.
                  </Text>
                </View>
              </Section>
            )}

            {currentStepKey === "interview" && (
              <Section>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 8 }}>
                  Preferred Interview Mode
                </Text>
                <Text style={{ fontSize: 14, color: isDark ? colors.textSecondary : "#666", marginBottom: 24, lineHeight: 20 }}>
                  If shortlisted, an interview will be conducted. Please select how you would prefer to give your interview.
                </Text>

                <Controller
                  control={control}
                  name="interviewMode"
                  render={({ field: { value, onChange } }) => (
                    <View style={{ gap: 12 }}>
                      {[
                        { label: "Online (Video Call)", value: "Online (Video Call)", icon: "videocam-outline", desc: "Interview via Zoom/Google Meet" },
                        { label: "Telephonic", value: "Telephonic", icon: "call-outline", desc: "Voice call interview on your phone" },
                        { label: "In-Person", value: "In-Person", icon: "people-outline", desc: "Visit our nearest center for interview" }
                      ].map((item) => {
                        const isSelected = value === item.value;
                        return (
                          <TouchableOpacity
                            key={item.value}
                            onPress={() => onChange(item.value)}
                            activeOpacity={0.7}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              padding: 16,
                              borderRadius: 16,
                              borderWidth: isSelected ? 2 : 1,
                              borderColor: isSelected ? colors.primary : isDark ? colors.border : "#E5E7EB",
                              backgroundColor: isSelected
                                ? (isDark ? "rgba(37, 99, 235, 0.1)" : "#F0F9FF")
                                : (isDark ? colors.surface : "#FFF"),
                            }}
                          >
                            <View
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: isSelected ? colors.primary : (isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6"),
                                justifyContent: "center",
                                alignItems: "center",
                                marginRight: 16,
                              }}
                            >
                              <Ionicons
                                name={item.icon as any}
                                size={22}
                                color={isSelected ? "#FFF" : colors.textSecondary}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 16, fontWeight: "600", color: isSelected ? colors.primary : colors.text, marginBottom: 4 }}>
                                {item.label}
                              </Text>
                              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                {item.desc}
                              </Text>
                            </View>
                            <View
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                borderWidth: 2,
                                borderColor: isSelected ? colors.primary : colors.border,
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}
                            >
                              {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                />
              </Section>
            )}

            {currentStepKey === "verification" && (
              <Section>
                <View style={{ marginBottom: 24, padding: 20, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F0F9FF", borderRadius: 16, borderLeftWidth: 4, borderLeftColor: "#0284C7" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <Ionicons name="home" size={24} color="#0284C7" style={{ marginRight: 12 }} />
                    <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Home Verification Visit</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: isDark ? colors.textSecondary : "#475569", lineHeight: 22 }}>
                    A field officer may need to visit your permanent residence for physical verification of documents and living conditions.
                  </Text>
                </View>

                <Controller control={control} name="verificationTime" render={({ field: { value } }) => {
                  // Format Date
                  let displayValue = "";
                  if (value) {
                    const dateObj = new Date(value);
                    if (!isNaN(dateObj.getTime())) {
                      displayValue = dateObj.toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true
                      });
                    }
                  }

                  return (
                    <TouchableOpacity onPress={() => openPicker("verificationTime", "datetime")}>
                      <View pointerEvents="none">
                        <CustomTextInput
                          label="Preferred Date & Time for Visit (Optional)"
                          placeholder="Select Date & Time"
                          value={displayValue}
                          editable={false}
                          onChangeText={() => { }}
                          inputStyle={{ color: colors.text, opacity: 1, fontWeight: "600" }}
                          rightIcon="calendar"
                        />
                      </View>
                    </TouchableOpacity>
                  );
                }} />

                <View style={{ flexDirection: "row", gap: 12, marginTop: 12, paddingHorizontal: 4 }}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                    By proceeding, you consent to a potential home visit. Our team will contact you to confirm the final slot.
                  </Text>
                </View>
              </Section>
            )}




            {currentStepKey === "documents" && (
              <Section>
                <View style={{ gap: 16 }}>
                  {scholarship && scholarship.documents && scholarship.documents.length > 0 ? (
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8, color: colors.text }}>
                        Document Checklist
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20 }}>
                        Please check the boxes below to confirm you have these documents. You will be required to upload them later after submitting the application.
                      </Text>

                      <View style={{ gap: 12 }}>
                        {scholarship.documents.map((reqDoc: any, index: number) => {
                          const docId = String(reqDoc.id || reqDoc.shortname || reqDoc.label || reqDoc.name || index);
                          const isChecked = (watch("acknowledgedDocIds") || []).includes(docId);

                          return (
                            <TouchableOpacity
                              key={docId}
                              activeOpacity={0.7}
                              onPress={() => {
                                const current = getValues("acknowledgedDocIds") || [];
                                const exists = current.includes(docId);
                                if (exists) {
                                  setValue("acknowledgedDocIds", current.filter((id: string) => id !== docId), { shouldValidate: true });
                                } else {
                                  setValue("acknowledgedDocIds", [...current, docId], { shouldValidate: true });
                                }
                              }}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                padding: 16,
                                borderRadius: 12,
                                borderWidth: 1,
                                backgroundColor: isChecked
                                  ? (isDark ? "rgba(37, 99, 235, 0.1)" : "#EFF6FF")
                                  : (isDark ? colors.surface : "#FFF"),
                                borderColor: isChecked
                                  ? "#2563EB"
                                  : (isDark ? colors.border : "#E5E7EB"),
                              }}
                            >
                              <View
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 6,
                                  borderWidth: 2,
                                  borderColor: isChecked ? "#2563EB" : (isDark ? "#6B7280" : "#D1D5DB"),
                                  backgroundColor: isChecked ? "#2563EB" : "transparent",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  marginRight: 12
                                }}
                              >
                                {isChecked && <Ionicons name="checkmark" size={16} color="#FFF" />}
                              </View>

                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                                  {reqDoc.label || reqDoc.name || "Required Document"}
                                  {reqDoc.required !== false && <Text style={{ color: "#EF4444" }}> *</Text>}
                                </Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                                  {reqDoc.description || "Required for verification"}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {errors.acknowledgedDocIds && (
                        <Text style={[styles.errorTextInline, { marginTop: 16 }]}>
                          {String(errors.acknowledgedDocIds.message)}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View style={[styles.noDocNote, {
                      backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5",
                      borderColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#A7F3D0"
                    }]}>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                      <Text style={[styles.noDocNoteText, { color: isDark ? "#34D399" : "#047857", marginLeft: 8 }]}>
                        There are no documents required for this scheme. You can proceed further.
                      </Text>
                    </View>
                  )}
                </View>
              </Section>
            )}

            {currentStepKey === "summary" && (
              <View style={{ gap: 16 }}>
                {/* Header */}
                <Section>
                  <View style={{ alignItems: "center", marginBottom: 8 }}>
                    <View style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: isDark ? "rgba(37, 99, 235, 0.15)" : "#EFF6FF",
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 12
                    }}>
                      <Ionicons name="document-text" size={32} color={colors.primary} />
                    </View>
                    <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 4 }}>
                      Review Your Application
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center" }}>
                      Please review all the information below before submitting
                    </Text>
                  </View>
                </Section>

                {/* Personal Details */}
                <Section>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: isDark ? "rgba(59, 130, 246, 0.1)" : "#DBEAFE",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12
                    }}>
                      <Ionicons name="person" size={20} color="#3B82F6" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Personal Details</Text>
                  </View>
                  {[
                    ["Full Name", getValues("fullName") || "-"],
                    ["Email", getValues("email") || "-"],
                    ["Phone", getValues("phone") ? `+91 ${getValues("phone")}` : "-"],
                    ["Student ID", getValues("studentId") || "-"],
                  ].map(([label, val]) => (
                    <View key={label} style={[styles.summaryRow, { borderColor: isDark ? colors.border : "rgba(51,51,51,0.06)" }]}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
                      <Text style={[styles.summaryValue, { color: val === "-" ? colors.textSecondary : colors.text }]}>{val}</Text>
                    </View>
                  ))}
                </Section>

                {/* Academic Information */}
                <Section>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: isDark ? "rgba(139, 92, 246, 0.1)" : "#EDE9FE",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12
                    }}>
                      <Ionicons name="school" size={20} color="#8B5CF6" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Academic Information</Text>
                  </View>
                  {[
                    ["Institution", getValues("institution") || "-"],
                    ["Major / Field of Study", getValues("major") || "-"],
                    ["Expected Graduation", getValues("gradDate") || "-"],
                    ["Current Year", getValues("currentYear") || "-"],
                    ["Last Exam Percentage", getValues("gpa") ? `${getValues("gpa")}%` : "-"],
                  ].map(([label, val]) => (
                    <View key={label} style={[styles.summaryRow, { borderColor: isDark ? colors.border : "rgba(51,51,51,0.06)" }]}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
                      <Text style={[styles.summaryValue, { color: val === "-" ? colors.textSecondary : colors.text }]}>{val}</Text>
                    </View>
                  ))}
                </Section>

                {/* Family & Income */}
                <Section>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#D1FAE5",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12
                    }}>
                      <Ionicons name="home" size={20} color="#10B981" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Family & Income Details</Text>
                  </View>
                  {[
                    ["Family Annual Income", getValues("financial") || "Not provided"],
                    ["Extracurricular Activities", getValues("activities") || "Not provided"],
                  ].map(([label, val]) => (
                    <View key={label} style={[styles.summaryRow, { borderColor: isDark ? colors.border : "rgba(51,51,51,0.06)" }]}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
                      <Text style={[styles.summaryValue, { color: val === "Not provided" ? colors.textSecondary : colors.text }]}>{val}</Text>
                    </View>
                  ))}
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
                      Why do you deserve this scholarship?
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>
                      {getValues("statement") || "Not provided"}
                    </Text>
                  </View>
                </Section>

                {/* Need Assessment */}
                <Section>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "#FEF3C7",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12
                    }}>
                      <Ionicons name="clipboard" size={20} color="#F59E0B" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Need Assessment</Text>
                  </View>
                  {[
                    ["Do you own any vehicle?", getValues("assessmentQ1") || "Not answered"],
                    ["Type of Housing", getValues("assessmentQ2") || "Not answered"],
                  ].map(([label, val]) => (
                    <View key={label} style={[styles.summaryRow, { borderColor: isDark ? colors.border : "rgba(51,51,51,0.06)" }]}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
                      <Text style={[styles.summaryValue, { color: val === "Not answered" ? colors.textSecondary : colors.text }]}>{val}</Text>
                    </View>
                  ))}
                </Section>

                {/* Interview Preference */}
                <Section>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: isDark ? "rgba(236, 72, 153, 0.1)" : "#FCE7F3",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12
                    }}>
                      <Ionicons name="videocam" size={20} color="#EC4899" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Interview Preference</Text>
                  </View>
                  <View style={[styles.summaryRow, { borderColor: isDark ? colors.border : "rgba(51,51,51,0.06)" }]}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Preferred Mode</Text>
                    <Text style={[styles.summaryValue, { color: getValues("interviewMode") ? colors.text : colors.textSecondary }]}>
                      {getValues("interviewMode") || "Not selected"}
                    </Text>
                  </View>
                </Section>

                {/* Home Verification */}
                <Section>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: isDark ? "rgba(6, 182, 212, 0.1)" : "#CFFAFE",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12
                    }}>
                      <Ionicons name="location" size={20} color="#06B6D4" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Home Verification</Text>
                  </View>
                  <View style={[styles.summaryRow, { borderColor: isDark ? colors.border : "rgba(51,51,51,0.06)" }]}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Preferred Date & Time</Text>
                    <Text style={[styles.summaryValue, { color: getValues("verificationTime") ? colors.text : colors.textSecondary }]}>
                      {(() => {
                        const vTime = getValues("verificationTime");
                        if (!vTime) return "Not selected";
                        const dateObj = new Date(vTime);
                        if (isNaN(dateObj.getTime())) return "Not selected";
                        return dateObj.toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                          hour12: true
                        });
                      })()}
                    </Text>
                  </View>
                </Section>

                {/* Documents */}
                <Section>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "#FEE2E2",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12
                    }}>
                      <Ionicons name="document-attach" size={20} color="#EF4444" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Documents Acknowledgement</Text>
                  </View>
                  {scholarship && scholarship.documents && scholarship.documents.length > 0 ? (
                    <View>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
                        You have acknowledged the following documents:
                      </Text>
                      {scholarship.documents.map((doc: any, idx: number) => {
                        const docId = String(doc.id || doc.shortname || doc.label || doc.name || idx);
                        const acknowledged = (getValues("acknowledgedDocIds") || []).includes(docId);
                        return (
                          <View
                            key={docId}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingVertical: 10,
                              borderBottomWidth: idx < scholarship.documents.length - 1 ? 1 : 0,
                              borderBottomColor: isDark ? colors.border : "rgba(51,51,51,0.06)"
                            }}
                          >
                            <Ionicons
                              name={acknowledged ? "checkmark-circle" : "close-circle"}
                              size={20}
                              color={acknowledged ? "#10B981" : "#EF4444"}
                              style={{ marginRight: 10 }}
                            />
                            <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>
                              {doc.label || doc.name || "Document"}
                            </Text>
                            <Text style={{ fontSize: 12, color: acknowledged ? "#10B981" : "#EF4444" }}>
                              {acknowledged ? "Acknowledged" : "Not acknowledged"}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 14, color: colors.textSecondary, fontStyle: "italic" }}>
                      No documents required for this scholarship
                    </Text>
                  )}
                </Section>
              </View>
            )}

            {currentStepKey === "declare" && (
              <Section>
                <Controller control={control} name="agreed" render={({ field: { value, onChange } }) => (
                  <TouchableOpacity onPress={() => onChange(!value)} style={styles.declareRow}>
                    <Ionicons name={value ? "checkbox" : "square-outline"} size={22} color={value ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.declareText, { color: colors.text }]}>
                      I confirm that all information provided is accurate and complete.
                      <Text style={{ color: '#EF4444' }}> *</Text>
                    </Text>
                  </TouchableOpacity>
                )} />
                {errors.agreed?.message && <Text style={styles.errorTextInline}>{errors.agreed.message}</Text>}
              </Section>
            )}
          </View>

          {/* Spacer handled via contentContainerStyle */}
        </ScrollView >
        <View style={[styles.footer, { paddingBottom: insets.bottom || 20 }]}>
          <View style={[styles.footerInner, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: isDark ? colors.border : "rgba(0,0,0,0.06)" }]}>
            {stepIndex === 0 ? (
              <Button title="Cancel" onPress={() => router.back()} variant="secondary" style={[styles.footerBtn, !isDark && { backgroundColor: "#F3F4F6", borderColor: "transparent" }]} />
            ) : (
              <Button title="Back" onPress={back} variant="secondary" style={[styles.footerBtn, !isDark && { backgroundColor: "#F3F4F6", borderColor: "transparent" }]} />
            )}
            {stepIndex < STEPS.length - 1 ? (
              <Button title="Next" onPress={next} variant="primary" style={[styles.footerBtn, styles.footerPrimary]} />
            ) : (
              <Button title={isSubmitting ? "Submitting..." : "Submit"} onPress={onSubmit} variant="primary" style={[styles.footerBtn, styles.footerPrimary]} disabled={isSubmitting} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView >
      <DateTimePickerModal
        isVisible={pickerState.show}
        mode={pickerState.mode}
        onConfirm={handleDateConfirm}
        onCancel={handleDateCancel}
        date={new Date()}
        is24Hour={false}
        display="spinner"
        confirmTextIOS="Confirm"
        cancelTextIOS="Cancel"
      />

      <Modal
        visible={optionPickerState.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setOptionPickerState(prev => ({ ...prev, visible: false }));
          setSearchQuery("");
        }}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: 'center', padding: 20 }}
          activeOpacity={1}
          onPress={() => {
            setOptionPickerState(prev => ({ ...prev, visible: false }));
            setSearchQuery("");
          }}
        >
          <View style={{ backgroundColor: isDark ? colors.card : "#fff", borderRadius: 12, overflow: 'hidden', maxHeight: '70%' }}>
            {/* Header */}
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#eee' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{optionPickerState.title}</Text>
            </View>

            {/* Search Input */}
            <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#eee' }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? colors.surface : '#F3F4F6',
                borderRadius: 8,
                paddingHorizontal: 12,
                height: 44
              }}>
                <Ionicons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search..."
                  placeholderTextColor={colors.textSecondary}
                  style={{
                    flex: 1,
                    marginLeft: 8,
                    fontSize: 15,
                    color: colors.text,
                    paddingVertical: 0
                  }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Options List */}
            {filteredOptions.length > 0 ? (
              <FlatList
                data={filteredOptions}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="always"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#f5f5f5' }}
                    onPress={() => {
                      optionPickerState.onSelect(item);
                      setOptionPickerState(prev => ({ ...prev, visible: false }));
                      setSearchQuery("");
                    }}
                  >
                    <Text style={{ fontSize: 16, color: colors.text }}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                  No results found for "{searchQuery}"
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
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
  stepperContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  stepperInner: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  formCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  footer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    backgroundColor: "transparent",
  },
  footerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  footerBtn: { flex: 1 },
  footerPrimary: { flex: 1.2 },
  docItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  docName: {
    flex: 1,
    marginLeft: 8,
  },
  docRemove: {
    padding: 6,
    marginLeft: 8,
  },
  errorTextInline: {
    color: "#EF4444",
    fontSize: 13,
    marginTop: 6,
    fontWeight: "500",
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  declareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  declareText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  docReqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderStyle: 'dashed'
  },
  reqDocLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  uploadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  uploadedText: {
    fontSize: 12,
    color: '#4CAF50',
    maxWidth: 150
  },
  uploadSmallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  existingDocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6
  },
  existingDocText: {
    fontSize: 12
  },
  noDocNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12
  },
  noDocNoteText: {
    fontSize: 12,
    flex: 1
  }
});
