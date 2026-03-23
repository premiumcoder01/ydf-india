import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getAcademicDetails, getScholarshipDetails, getUserProfile, submitApplication, type AcademicDetailItem, getDropdownDefinitions, DropdownData } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";



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

  // Declaration
  agreed: z.boolean().refine((v) => v, { message: "You must agree before submitting" }),
});

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
  { key: "personal", title: "Personal Details" },
  { key: "academic", title: "Academic Info" },
  { key: "family", title: "Family / Income" },
  { key: "summary", title: "Summary" },
  { key: "declare", title: "Declaration" },
] as const;

const FIELDS_BY_STEP: Record<string, (keyof FormValues)[]> = {
  personal: ["fullName", "email", "phone", "studentId"],
  academic: ["institution", "major", "gradDate", "currentYear", "gpa"],
  family: ["financial", "activities", "statement"],
  summary: [],
  declare: ["agreed"],
};

export default function ApplyFormScreen() {
  const { isDark, colors } = useTheme();
  
  const [dropdownData, setDropdownData] = useState<DropdownData | null>(null);

  const getOptionsByShortname = useCallback((shortname: string) => {
    if (!dropdownData) return [];
    const courseField = dropdownData.course_fields?.find((f: any) => f.shortname === shortname || f.shortname.trim() === shortname.trim());
    if (courseField) return courseField.options;

    const userField = dropdownData.user_fields?.find((f: any) => f.shortname === shortname || f.shortname.trim() === shortname.trim());
    if (userField) return userField.options;

    return [];
  }, [dropdownData]);

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
  const [userId, setUserId] = useState<string | number | null>(null);

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
      agreed: false,
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });


  // No picker state needed for now since verification step is removed

  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

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



  // ─── Single unified auth effect: fetch scholarship + profile + draft ───────
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        setLoading(true);
        const authDataStr = await AsyncStorage.getItem("authData");
        if (!authDataStr || cancelled) return;
        const authData = JSON.parse(authDataStr);
        if (!authData?.token) return;

        const token: string = authData.token;
        const uid: string | number = authData?.user?.id;
        if (uid) setUserId(uid);

        // 1. Scholarship details + expiry check
        if (scholarshipId) {
          const scholarResponse = await getScholarshipDetails(token, Number(scholarshipId));
          if (cancelled) return;
          if (scholarResponse.success) {
            const scholarData =
              scholarResponse.data?.data?.data ||
              scholarResponse.data?.data ||
              scholarResponse.data;
            setScholarship(scholarData);
            if (scholarData?.expired) {
              Alert.alert(
                "Application Closed",
                "This scholarship has expired and is no longer accepting applications.",
                [{ text: "OK", onPress: () => router.back() }]
              );
              setLoading(false);
              return;
            }
          }
        }

        // 2. User profile prefill
        const response = await getUserProfile(token);
        if (cancelled) return;
        if (response.success && response.data?.user) {
          const user = response.data.user;
          const getField = (shortname: string) =>
            user.customfields?.find((f: any) => f.shortname === shortname)?.value || "";

          reset({
            ...getValues(),
            fullName: user.fullname || `${user.firstname} ${user.lastname}` || "",
            email: user.email || "",
            phone: (() => {
              let p = user.phone1 || user.phone || getField('phone') || "";
              if (typeof p === 'string') {
                p = p.replace(/\D/g, '');
                if (p.length > 10 && p.startsWith('91')) p = p.substring(p.length - 10);
              }
              return p;
            })(),
            studentId: user.username || getField('student_id') || "",
            institution: user.institution || getField('institution') || "",
            major: user.major || getField('major') || "",
            gradDate: user.graduationdate || getField('graduationdate') || "",
            currentYear: user.academicyear || getField('academicyear') || "",
            gpa: user.gpa || getField('gpa') || "",
            financial: getField('financial_info') || "",
          });
        }

        // 3. Draft recovery (after profile so merge is correct)
        if (uid && scholarshipId) {
          const draftKey = `draft_application_${uid}_${scholarshipId}`;
          const savedDraft = await AsyncStorage.getItem(draftKey);
          if (savedDraft && !cancelled) {
            const { values, step } = JSON.parse(savedDraft);
            Alert.alert(
              "Draft Found",
              "We found an unfinished application. Would you like to resume?",
              [
                {
                  text: "No, Start Fresh",
                  style: "cancel",
                  onPress: () => AsyncStorage.removeItem(draftKey),
                },
                {
                  text: "Yes, Resume",
                  onPress: () => {
                    reset({ ...getValues(), ...values });
                    // Ensure restored step is within bounds
                    const safeStep = Math.min(step || 0, STEPS.length - 1);
                    setStepIndex(safeStep);
                    setToast({ visible: true, message: "Draft restored", type: "success" });
                  },
                },
              ]
            );
          }
        }

        // 4. Fetch dropdowns
        const dropResponse = await getDropdownDefinitions(token);
        if (dropResponse.success && dropResponse.data && !cancelled) {
          setDropdownData(dropResponse.data);
        }
      } catch (error) {
        console.error("Bootstrap error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrap();
    return () => { cancelled = true; };
  }, [scholarshipId]);

  // ─── Academic details: fetch once per session when entering academic step ──
  const academicFetchedRef = useRef(false);
  const currentStepKey = useMemo(() => {
    return STEPS[stepIndex]?.key || STEPS[0].key;
  }, [stepIndex]);

  // ─── Save draft in background (never blocks UI) ──────────────────────────
  const saveDraft = useCallback(async (nextStepIndex: number) => {
    if (!userId || !scholarshipId) return;
    try {
      const draftKey = `draft_application_${userId}_${scholarshipId}`;
      await AsyncStorage.setItem(draftKey, JSON.stringify({ values: getValues(), step: nextStepIndex }));
    } catch (e) {
      console.error("Failed to save draft", e);
    }
  }, [userId, scholarshipId, getValues]);

  useEffect(() => {
    if (currentStepKey !== "academic" || academicFetchedRef.current) return;

    const fetchAcademicDetails = async () => {
      setLoadingAcademicDetails(true);
      try {
        const authDataStr = await AsyncStorage.getItem("authData");
        if (!authDataStr) return;
        const { token } = JSON.parse(authDataStr);
        if (!token) return;
        const res = await getAcademicDetails(token);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setAcademicDetailsList(res.data);
          academicFetchedRef.current = true;
        }
      } catch (e) {
        console.error("Failed to fetch academic details", e);
      } finally {
        setLoadingAcademicDetails(false);
      }
    };

    fetchAcademicDetails();
  }, [currentStepKey]);

  const next = useCallback(async () => {
    const fields = FIELDS_BY_STEP[currentStepKey];
    if (fields.length) {
      const ok = await trigger(fields as any);
      if (!ok) return;
    }

    // Move step immediately (no async inside setStepIndex = no flicker)
    const nextIndex = Math.min(stepIndex + 1, STEPS.length - 1);
    setStepIndex(nextIndex);
    // Save draft in background after state update
    saveDraft(nextIndex);
  }, [currentStepKey, stepIndex, trigger, saveDraft]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const findStepForField = (fieldName: keyof FormValues): number => {
    const stepKey = (Object.keys(FIELDS_BY_STEP) as (keyof typeof FIELDS_BY_STEP)[])
      .find((k) => (FIELDS_BY_STEP[k] as (keyof FormValues)[]).includes(fieldName));
    const idx = stepKey ? STEPS.findIndex((s) => s.key === stepKey) : 0;
    return idx >= 0 ? idx : 0;
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setIsSubmitLoading(true);
      try {

        const authDataStr = await AsyncStorage.getItem("authData");
        if (!authDataStr) {
          Alert.alert("Error", "User not logged in");
          setIsSubmitLoading(false);
          return;
        }
        const authData = JSON.parse(authDataStr);
        if (!authData.token) {
          Alert.alert("Error", "Invalid session");
          setIsSubmitLoading(false);
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
          setIsSubmitLoading(false);
          setToast({ visible: true, message: response.message || "Submission failed", type: "error" });
        }

      } catch (err: any) {
        setIsSubmitLoading(false);
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

  const Section = memo(({ children }: { children: React.ReactNode }) => (
    <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 250 }}>
      <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: isDark ? colors.border : "rgba(0,0,0,0.06)", borderWidth: 1 }]}>{children}</View>
    </MotiView>
  ));

  const Stepper = memo(() => {
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
            return (
              <View key={step.key} style={{ width: STEP_ITEM_WIDTH, alignItems: "center" }}>
                {index > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      left: -STEP_ITEM_WIDTH / 2 + 18,
                      top: 16,
                      width: STEP_ITEM_WIDTH - 32,
                      height: 2,
                      backgroundColor: isCompleted ? "#10B981" : (isDark ? "rgba(255,255,255,0.15)" : "#E5E7EB"),
                    }}
                  />
                )}
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
                      backgroundColor: isCompleted ? "#10B981" : isCurrent ? colors.primary : (isDark ? colors.surface : "#F3F4F6"),
                      borderWidth: 2,
                      borderColor: isCompleted ? "#10B981" : isCurrent ? colors.primary : (isDark ? "rgba(255,255,255,0.2)" : "#D1D5DB"),
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
                      <Text style={{ fontSize: isCurrent ? 14 : 13, fontWeight: "700", color: isCurrent ? "#FFFFFF" : (isDark ? colors.textSecondary : "#9CA3AF") }}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  {isCurrent && (
                    <MotiView
                      from={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.3, opacity: 0 }}
                      transition={{ type: "timing", duration: 1500, loop: true }}
                      style={{ position: "absolute", width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary }}
                    />
                  )}
                </MotiView>
                <Text
                  style={{
                    marginTop: 6,
                    fontSize: isCurrent ? 11 : 10,
                    fontWeight: isCurrent ? "700" : "600",
                    color: isCompleted ? "#10B981" : isCurrent ? colors.primary : (isDark ? colors.textSecondary : "#6B7280"),
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
  });

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
        <ScrollView ref={scrollRef} style={styles.scrollView} contentContainerStyle={{ paddingBottom: 200, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
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
                      options: getOptionsByShortname('Family_income').map(o => o.label),
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

            {/* Remaining steps handled below */}

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

                {/* Summary sections for Assessment, Interview, Verification and Documents removed */}
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
      {/* DateTimePickerModal removed */}

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

      {isSubmitLoading && (
        <Modal transparent animationType="fade" visible={isSubmitLoading}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: isDark ? colors.card : '#fff', padding: 24, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '700', color: colors.text }}>Submitting Application</Text>
              <Text style={{ marginTop: 6, fontSize: 13, color: colors.textSecondary }}>Please wait, do not close the app</Text>
            </View>
          </View>
        </Modal>
      )}

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
  scrollView: {
    flex: 1,
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
  errorTextInline: {
    color: "#EF4444",
    fontSize: 13,
    marginTop: 6,
    fontWeight: "500",
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

});
