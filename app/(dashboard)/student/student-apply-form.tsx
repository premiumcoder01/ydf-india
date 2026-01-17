import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getScholarshipDetails, getUserProfile, submitApplication } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StepIndicator from "react-native-step-indicator";
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
  phone: z.string().min(8, "Phone is required"),
  studentId: z.string().min(1, "Student ID is required"),

  // Academic
  institution: z.string().min(2, "Institution is required"),
  major: z.string().min(2, "Major is required"),
  gradDate: z.string().min(4, "Graduation date is required"),
  currentYear: z.string().min(1, "Current year is required"),
  gpa: z
    .string()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) <= 10.0), {
      message: "CGPA must be a number up to 10.0",
    }),

  // Narrative
  statement: z.string().min(1, "Statement is required"), // Relaxed min length for testing given user issues
  activities: z.string().optional().default(""),
  financial: z.string().optional().default(""),

  // Docs
  documents: z.array(
    z.object({
      name: z.string(),
      uri: z.string(),
      mimeType: z.string().nullable().optional(),
      size: z.number().nullable().optional(),
      documentId: z.union([z.string(), z.number()]).optional(),
      label: z.string().optional(),
    })
  ).min(1, "Please upload required documents"),

  // Need Assessment (Static/Mock)
  assessmentQ1: z.string().optional(),
  assessmentQ2: z.string().optional(),

  // Interview (Static/Mock)
  interviewMode: z.string().optional(),

  // Verification (Static/Mock)
  verificationTime: z.date().optional().nullable(),

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
  documents: ["documents"],
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

  const [pickerState, setPickerState] = useState<{ show: boolean; mode: "date" | "time"; field: keyof FormValues | null }>({
    show: false,
    mode: "date",
    field: null,
  });

  const openPicker = (field: keyof FormValues, mode: "date" | "time") => {
    setPickerState({ show: true, mode, field });
  };

  const handleDateConfirm = (selectedDate: Date) => {
    const currentField = pickerState.field;
    setPickerState({ show: false, mode: "date", field: null });

    if (!selectedDate || !currentField) {
      return;
    }

    if (currentField === "gradDate") {
      // Format MM/YYYY
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();
      const formatted = `${month.toString().padStart(2, '0')}/${year}`;
      setValue("gradDate", formatted, { shouldValidate: true });
    } else if (currentField === "verificationTime") {
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

                // Check dates manually
                const deadline = scholarData.application_deadline || scholarData.end_date || scholarData.start_date;
                if (deadline) {
                  const today = new Date();
                  const deadlineDate = new Date(deadline);
                  if (deadlineDate.getTime() < today.setHours(0, 0, 0, 0)) {
                    Alert.alert("Application Closed", "This scholarship has expired.", [
                      { text: "OK", onPress: () => router.back() }
                    ]);
                    setLoading(false);
                    return;
                  }
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
                phone: user.phone1 || user.phone || getField('phone') || "",
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

  const currentStepKey = useMemo(() => STEPS[stepIndex].key, [stepIndex]);

  const next = async () => {
    // Validate only fields relevant to current step
    const fields = FIELDS_BY_STEP[currentStepKey];
    if (fields.length) {
      const ok = await trigger(fields as any);
      if (!ok) return;
    }
    setStepIndex((i) => {
      const ni = Math.min(i + 1, STEPS.length - 1);
      return ni;
    });
  };

  const back = () =>
    setStepIndex((i) => {
      const ni = Math.max(0, i - 1);
      return ni;
    });

  // Pick global docs (fallback)
  const onPickGlobalDocuments = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    const picked: DocumentItem[] = res.assets.map((a) => ({ name: a.name, uri: a.uri, mimeType: a.mimeType ?? undefined, size: a.size ?? undefined }));
    const existing = getValues("documents");
    setValue("documents", [...existing, ...picked], { shouldDirty: true, shouldValidate: true });
  };

  // Pick specific doc
  const onPickSpecificDocument = async (reqDoc: any) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: false, copyToCacheDirectory: true });
      if (res.canceled) return;

      const asset = res.assets[0];
      const newItem: DocumentItem = {
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType ?? undefined,
        size: asset.size ?? undefined,
        documentId: reqDoc.id || reqDoc.shortname,
        label: reqDoc.label || reqDoc.name
      };

      const existing = getValues("documents") || [];
      // Remove previous upload for this same requirement if exists
      const filtered = existing.filter(d => d.documentId !== newItem.documentId);

      setValue("documents", [...filtered, newItem], { shouldDirty: true, shouldValidate: true });
    } catch (err) {
      console.log("Picker error", err);
    }
  };

  const removeDocument = (index: number) => {
    const existing = getValues("documents");
    const nextDocs = existing.filter((_, i) => i !== index);
    setValue("documents", nextDocs, { shouldDirty: true, shouldValidate: true });
  };

  const findStepForField = (fieldName: keyof FormValues): number => {
    const stepKey = (Object.keys(FIELDS_BY_STEP) as (keyof typeof FIELDS_BY_STEP)[])
      .find((k) => (FIELDS_BY_STEP[k] as (keyof FormValues)[]).includes(fieldName));
    const idx = stepKey ? STEPS.findIndex((s) => s.key === stepKey) : 0;
    return idx >= 0 ? idx : 0;
  };

  const onSubmit = handleSubmit(
    async (values) => {
      try {
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
          application_text: values.statement,
          fullname: values.fullName,
          email: values.email,
          phone: values.phone,
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
          // Delay redirect to show toast
          setTimeout(() => {
            router.replace("/(dashboard)/student/student-application-status");
          }, 2000);
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
    const colorActive = isDark ? colors.primary : "#111827";
    const colorDone = "#10B981";
    const colorPending = isDark ? "rgba(255,255,255,0.2)" : "#D1D5DB";
    const colorLabel = isDark ? colors.textSecondary : "#6B7280";

    const customStyles = {
      stepIndicatorSize: 28,
      currentStepIndicatorSize: 32,
      separatorStrokeWidth: 3,
      currentStepStrokeWidth: 2,
      stepStrokeWidth: 2,
      stepStrokeCurrentColor: colorActive,
      stepStrokeFinishedColor: colorDone,
      stepStrokeUnFinishedColor: colorPending,
      separatorFinishedColor: colorDone,
      separatorUnFinishedColor: colorPending,
      stepIndicatorFinishedColor: colorDone,
      stepIndicatorUnFinishedColor: isDark ? colors.card : "#FFFFFF",
      stepIndicatorCurrentColor: isDark ? colors.card : "#FFFFFF",
      stepIndicatorLabelFontSize: 12,
      currentStepIndicatorLabelFontSize: 12,
      stepIndicatorLabelCurrentColor: colorActive,
      stepIndicatorLabelFinishedColor: "#FFFFFF",
      stepIndicatorLabelUnFinishedColor: isDark ? colors.textSecondary : "#9CA3AF",
      labelColor: colorLabel,
      currentStepLabelColor: isDark ? colors.primary : colorActive,
      labelSize: 11,
    };

    return (
      <View style={styles.stepperContainer}>
        <View style={[styles.stepperInner, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.9)", borderColor: isDark ? colors.border : "rgba(51,51,51,0.08)" }]}>
          <ScrollView
            ref={stepperScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ width: totalWidth }}
          >
            <View style={{ width: totalWidth, paddingVertical: 6 }}>
              <StepIndicator
                stepCount={STEPS.length}
                currentPosition={stepIndex}
                customStyles={customStyles as any}
                direction="horizontal"
                labels={STEPS.map((s) => s.title)}
                onPress={() => { }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  const Section = ({ children }: { children: React.ReactNode }) => (
    <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 250 }}>
      <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: isDark ? colors.border : "rgba(51, 51, 51, 0.1)", borderWidth: isDark ? 1 : 1 }]}>{children}</View>
    </MotiView>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f2c44d", justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={isDark ? colors.primary : "#333"} />
        <Text style={{ marginTop: 20, color: isDark ? colors.text : "#333" }}>Checking scholarship status...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f2c44d" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? colors.background : "#fff"} />
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      <AppHeader title="Apply for Scholarship" onBack={() => router.back()} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} style={styles.scrollView} contentContainerStyle={{ paddingBottom: 370, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
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
                <Controller control={control} name="phone" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput label="Phone Number" placeholder="Enter your phone" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" error={errors.phone?.message} required />
                )} />
                <Controller control={control} name="studentId" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput label="Student ID" placeholder="Enter your student ID" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.studentId?.message} required />
                )} />
              </Section>
            )}

            {currentStepKey === "academic" && (
              <Section>
                <Controller control={control} name="institution" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput label="Institution Name" placeholder="Enter your institution" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.institution?.message} required />
                )} />
                <Controller control={control} name="major" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput label="Major / Field of Study" placeholder="Enter your major" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.major?.message} required />
                )} />
                <Controller control={control} name="gradDate" render={({ field: { value } }) => (
                  <TouchableOpacity onPress={() => openPicker("gradDate", "date")}>
                    <View pointerEvents="none">
                      <CustomTextInput
                        label="Expected Graduation"
                        placeholder="Select Date"
                        value={value}
                        editable={false}
                        error={errors.gradDate?.message}
                        onChangeText={() => { }}
                        required
                      />
                    </View>
                  </TouchableOpacity>
                )} />
                <Controller control={control} name="currentYear" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput
                    label="Current Year of Study"
                    placeholder="e.g. 1, 2, 3"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="numeric"
                    error={errors.currentYear?.message}
                    required
                  />
                )} />
                <Controller control={control} name="gpa" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput
                    label="Current CGPA/% (Max 10)"
                    placeholder="Enter value up to 10"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="numeric"
                    error={errors.gpa?.message}
                  />
                )} />
              </Section>
            )}

            {currentStepKey === "family" && (
              <Section>
                <Controller control={control} name="financial" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput label="Family / Income Info" placeholder="Explain your financial situation" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.financial?.message} />
                )} />
                <Controller control={control} name="activities" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput label="Extracurricular Activities" placeholder="List your activities" value={value} onChangeText={onChange} onBlur={onBlur} />
                )} />

                <Controller control={control} name="statement" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput label="Personal Statement" placeholder="Why do you deserve this scholarship? (min 50 char)" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.statement?.message} inputStyle={{ minHeight: 100, textAlignVertical: "top" }} required />
                )} />
              </Section>
            )}

            {currentStepKey === "assessment" && (
              <Section>
                <Text style={{ fontSize: 14, color: isDark ? colors.textSecondary : "#666", marginBottom: 12 }}>
                  Please answer the following to help us assess your need level.
                </Text>
                <Controller control={control} name="assessmentQ1" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput
                    label="Do you own any vehicle (2-wheeler/4-wheeler)?"
                    placeholder="Yes/No, please specify details..."
                    value={value || ""}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )} />
                <Controller control={control} name="assessmentQ2" render={({ field: { onChange, value, onBlur } }) => (
                  <CustomTextInput
                    label="Type of Housing"
                    placeholder="e.g. Owned, Rented, Kutcha/Pucca house"
                    value={value || ""}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
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
                <Text style={{ fontSize: 14, color: isDark ? colors.textSecondary : "#666", marginBottom: 16 }}>
                  If shortlisted, an interview will be conducted. Please indicate your preferences.
                </Text>

                <Controller
                  control={control}
                  name="interviewMode"
                  render={({ field: { value, onChange } }) => (
                    <View style={{ gap: 8, marginBottom: 16 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>Preferred Interview Mode</Text>
                      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                        {["Online (Video Call)", "Telephonic", "In-Person"].map((mode) => (
                          <TouchableOpacity
                            key={mode}
                            onPress={() => onChange(mode)}
                            style={{
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              borderRadius: 20,
                              borderWidth: 1,
                              borderColor: value === mode ? colors.primary : colors.border,
                              backgroundColor: value === mode ? (isDark ? colors.primary : "#EEF2FF") : "transparent"
                            }}
                          >
                            <Text style={{
                              fontSize: 13,
                              color: value === mode ? (isDark ? "#fff" : colors.primary) : colors.textSecondary
                            }}>
                              {mode}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                />
              </Section>
            )}

            {currentStepKey === "verification" && (
              <Section>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: isDark ? colors.surface : "#E0F2FE", alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Ionicons name="home-outline" size={30} color="#0284C7" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, textAlign: 'center' }}>Home Verification Visit</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
                    A field officer may visit your permanent residence for verification.
                  </Text>
                </View>

                <Controller control={control} name="verificationTime" render={({ field: { value } }) => (
                  <TouchableOpacity onPress={() => openPicker("verificationTime", "time")}>
                    <View pointerEvents="none">
                      <CustomTextInput
                        label="Preferred Time for Visit"
                        placeholder="Select Time"
                        value={value ? (value instanceof Date ? value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : String(value)) : ""}
                        editable={false}
                        onChangeText={() => { }}
                      />
                    </View>
                  </TouchableOpacity>
                )} />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, paddingRight: 20 }}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                    By proceeding, you consent to a potential home visit for verification of the details provided in this application.
                  </Text>
                </View>
              </Section>
            )}

            {currentStepKey === "documents" && (
              <Section>
                <View style={{ gap: 16 }}>
                  {/* Dynamic Requirements */}
                  {scholarship && scholarship.documents && scholarship.documents.length > 0 ? (
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 12, color: colors.text }}>Required Documents</Text>
                      {scholarship.documents.map((reqDoc: any, index: number) => {
                        const uploadedDoc = documents.find(d => d.documentId === (reqDoc.id || reqDoc.shortname));
                        return (
                          <View key={reqDoc.id || index} style={[styles.docReqItem, { borderColor: isDark ? colors.border : '#e5e5e5' }]}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.reqDocLabel, { color: colors.text }]}>
                                {/* {reqDoc.label || reqDoc.name} */}Upload Document
                                {reqDoc.required !== false && <Text style={{ color: 'red' }}> *</Text>}
                              </Text>
                              {uploadedDoc ? (
                                <View style={styles.uploadedBadge}>
                                  <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                                  <Text numberOfLines={1} style={styles.uploadedText}>{uploadedDoc.name}</Text>
                                </View>
                              ) : (
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Not uploaded yet</Text>
                              )}
                            </View>
                            <TouchableOpacity
                              onPress={() => onPickSpecificDocument(reqDoc)}
                              style={[styles.uploadSmallBtn, { backgroundColor: uploadedDoc ? (isDark ? '#333' : '#f0fdf4') : colors.primary }]}
                            >
                              <Ionicons name={uploadedDoc ? "refresh" : "cloud-upload-outline"} size={16} color={uploadedDoc ? colors.text : '#fff'} />
                              <Text style={{ color: uploadedDoc ? colors.text : '#fff', fontSize: 12, fontWeight: '600' }}>
                                {uploadedDoc ? "Change" : "Upload"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Button variant="secondary" onPress={onPickGlobalDocuments}>
                      <Text style={{ fontWeight: "700", color: isDark ? colors.text : "#333" }}>Pick Documents</Text>
                    </Button>
                  )}

                  {/* General / Extra Documents list */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 8 }}>Attached Files:</Text>

                    {documents.length === 0 && (
                      <Text style={{ fontStyle: 'italic', color: colors.textSecondary, fontSize: 12 }}>No documents selected</Text>
                    )}

                    {documents.map((doc, idx) => (
                      <View key={`${doc.uri}-${idx}`} style={[styles.docItem, { backgroundColor: isDark ? colors.surface : "rgba(255,255,255,0.8)", borderColor: isDark ? colors.border : "rgba(51,51,51,0.1)" }]}>
                        <Ionicons name="document-attach-outline" size={20} color={isDark ? colors.text : "#333"} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text numberOfLines={1} style={[styles.docName, { color: colors.text }]}>{doc.name}</Text>
                          {doc.label && <Text style={{ fontSize: 10, color: colors.textSecondary }}>{doc.label}</Text>}
                        </View>
                        <TouchableOpacity onPress={() => removeDocument(idx)} style={styles.docRemove}>
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {errors.documents?.message && (
                      <Text style={styles.errorTextInline}>{String(errors.documents.message)}</Text>
                    )}
                  </View>
                </View>
              </Section>
            )}

            {currentStepKey === "summary" && (
              <Section>
                <View style={{ gap: 10 }}>
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>Review Your Application</Text>
                  {(
                    [
                      ["Full Name", getValues("fullName")],
                      ["Email", getValues("email")],
                      ["Phone", getValues("phone")],
                      ["Student ID", getValues("studentId")],
                      ["Institution", getValues("institution")],
                      ["Major", getValues("major")],
                      ["Graduation", getValues("gradDate")],
                      ["Current Year", getValues("currentYear")],
                      ["GPA", getValues("gpa") || "-"],
                      ["Activities", getValues("activities") || "-"],
                      ["Financial", getValues("financial") || "-"],
                    ] as const
                  ).map(([label, val]) => (
                    <View key={label} style={[styles.summaryRow, { borderColor: isDark ? colors.border : "rgba(51,51,51,0.06)" }]}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
                      <Text style={[styles.summaryValue, { color: colors.text }]}>{val}</Text>
                    </View>
                  ))}
                  <View style={[styles.summaryRow, { borderColor: isDark ? colors.border : "rgba(51,51,51,0.06)" }]}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Documents</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{documents.length} file(s)</Text>
                  </View>
                </View>
              </Section>
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
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <View style={[styles.footerInner, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.98)", borderColor: isDark ? colors.border : "rgba(0,0,0,0.06)" }]}>
            {stepIndex === 0 ? (
              <Button title="Cancel" onPress={() => router.back()} variant="secondary" style={[styles.footerBtn, !isDark && { backgroundColor: "#FFF" }]} />
            ) : (
              <Button title="Back" onPress={back} variant="secondary" style={[styles.footerBtn, !isDark && { backgroundColor: "#FFF" }]} />
            )}
            {stepIndex < STEPS.length - 1 ? (
              <Button title="Next" onPress={next} variant="primary" style={[styles.footerBtn, styles.footerPrimary]} />
            ) : (
              <Button title={isSubmitting ? "Submitting..." : "Submit"} onPress={onSubmit} variant="primary" style={[styles.footerBtn, styles.footerPrimary]} disabled={isSubmitting} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
      <DateTimePickerModal
        isVisible={pickerState.show}
        mode={pickerState.mode}
        onConfirm={handleDateConfirm}
        onCancel={handleDateCancel}
        date={new Date()}
        is24Hour={true}
        display="spinner"
        confirmTextIOS="Confirm"
        cancelTextIOS="Cancel"
      />
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  footerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
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
  }
});
