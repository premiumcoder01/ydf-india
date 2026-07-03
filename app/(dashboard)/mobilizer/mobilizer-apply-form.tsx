import { AppHeader, Button, CustomTextInput } from "@/components";
import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";

import { DropdownData, getDropdownDefinitions, getMobilizerStudentProfile, getScholarshipDetails, mobilizerApplyForStudent } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    View
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StepIndicator from "react-native-step-indicator";
import { z } from "zod";



const formSchema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Phone number must be a valid 10-digit Indian number"),
    studentId: z.string().min(1, "Student ID is required"),
    institution: z.string().min(2, "Institution is required"),
    major: z.string().min(2, "Major is required"),
    gradDate: z.string().optional(),
    currentYear: z.string().optional(),
    gpa: z.string().refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) <= 100.0 && Number(v) >= 0), {
        message: "Please enter a valid percentage (0-100)",
    }),
    statement: z.string().optional().default(""),
    activities: z.string().optional().default(""),
    financial: z.string().optional().default(""),
    agreed: z.boolean().refine((v) => v, { message: "You must agree before submitting" }),
}).superRefine((data, ctx) => {
    const HIDDEN_FIELDS_MAJORS = ["10th Grade (Secondary)", "11th Grade (Higher Secondary)", "12th Grade (Higher Secondary)"];
    const currentYearNum = new Date().getFullYear();
    if (!HIDDEN_FIELDS_MAJORS.includes(data.major)) {
        if (!data.gradDate || !/^\d{4}$/.test(data.gradDate.trim())) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please enter a valid 4-digit graduation year",
                path: ["gradDate"],
            });
        } else {
            const gradYear = parseInt(data.gradDate.trim());
            if (gradYear < currentYearNum) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Graduation year cannot be earlier than ${currentYearNum}`,
                    path: ["gradDate"],
                });
            }
        }
        if (!data.currentYear || !/^\d{4}$/.test(data.currentYear.trim())) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please enter a valid 4-digit current year",
                path: ["currentYear"],
            });
        }
    } else {
        if (!data.currentYear || !/^\d{4}$/.test(data.currentYear.trim())) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please enter a valid 4-digit passing year",
                path: ["currentYear"],
            });
        } else {
            const passingYear = parseInt(data.currentYear.trim());
            if (passingYear < currentYearNum) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Passing year cannot be earlier than ${currentYearNum}`,
                    path: ["currentYear"],
                });
            }
        }
    }
});

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
    { key: "personal", title: "Personal" },
    { key: "academic", title: "Academic" },
    { key: "narrative", title: "Narrative" },
    { key: "summary", title: "Review" },
    { key: "declare", title: "Submit" },
] as const;

const FIELDS_BY_STEP: Record<string, (keyof FormValues)[]> = {
    personal: ["fullName", "email", "phone", "studentId"],
    academic: ["institution", "major", "gradDate", "currentYear", "gpa"],
    narrative: ["financial", "activities", "statement"],
    summary: [],
    declare: ["agreed"],
};

export default function MobilizerApplyFormScreen() {
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
    const params = useLocalSearchParams();
    const scholarshipId = params.scholarshipId;
    const studentId = params.studentId;

    const [loading, setLoading] = useState(true);
    const [scholarship, setScholarship] = useState<any>(null);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    // Toast State
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

    const [isSubmitLoading, setIsSubmitLoading] = useState(false);

    const [optionPickerState, setOptionPickerState] = useState<{

        visible: boolean;
        title: string;
        options: string[];
        onSelect: (val: string) => void;
    }>({ visible: false, title: "", options: [], onSelect: () => { } });

    const [searchQuery, setSearchQuery] = useState("");
    const filteredOptions = useMemo(() => {
        return (optionPickerState.options || []).filter((o) =>
            o.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [optionPickerState.options, searchQuery]);

    const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
    };

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
            agreed: false,
        },
        mode: "onSubmit",
        reValidateMode: "onSubmit",
    });

    const watchedMajor = watch("major");
    const isGradeStudent = useMemo(() => {
        return [
            "10th Grade (Secondary)",
            "11th Grade (Higher Secondary)",
            "12th Grade (Higher Secondary)"
        ].includes(watchedMajor);
    }, [watchedMajor]);



    const currentStepKey = useMemo(() => STEPS[stepIndex].key, [stepIndex]);

    // Only get all values when we're on the summary step to avoid unnecessary re-renders
    const allValues = useMemo(() => {
        if (currentStepKey === 'summary') {
            return getValues();
        }
        return {} as FormValues;
    }, [currentStepKey, getValues]);

    useEffect(() => {
        const fetchRequiredData = async () => {
            try {
                setLoading(true);
                const authDataStr = await AsyncStorage.getItem("authData");
                if (authDataStr) {
                    const authData = JSON.parse(authDataStr);
                    if (authData.token) {
                        // Fetch Scholarship Details
                        if (scholarshipId) {
                            const scholarResponse = await getScholarshipDetails(authData.token, Number(scholarshipId));
                            if (scholarResponse.success) {
                                const scholarData = scholarResponse.data?.data?.data || scholarResponse.data?.data || scholarResponse.data;
                                setScholarship(scholarData);
                                if (scholarData && scholarData.expired) {
                                    Alert.alert("Application Closed", "This scholarship has expired.", [
                                        { text: "OK", onPress: () => router.back() }
                                    ]);
                                }
                            }
                        }

                        // Fetch Student Profile
                        if (studentId) {
                            const profileResponse = await getMobilizerStudentProfile(authData.token, Number(studentId));
                            if (profileResponse.success && profileResponse.data) {
                                const studentData = profileResponse.data.student || profileResponse.data;
                                // Parse custom fields if string
                                let cf = studentData.custom_fields || {};
                                if (typeof cf === 'string') {
                                    try { cf = JSON.parse(cf); } catch (e) { cf = {}; }
                                }
                                studentData.parsed_custom_fields = cf;

                                setSelectedStudent(studentData);

                                const v = (...args: any[]) => {
                                    for (const arg of args) {
                                        if (arg !== null && arg !== undefined) {
                                            if (typeof arg === 'string') {
                                                const trimmed = arg.trim();
                                                const lower = trimmed.toLowerCase();
                                                if (trimmed !== "" && lower !== "select" && lower !== "choose..." && lower !== "select any one" && lower !== "n/a") {
                                                    return trimmed;
                                                }
                                            } else {
                                                return arg;
                                            }
                                        }
                                    }
                                    return "";
                                };

                                // Pre-fill form
                                reset({
                                    ...getValues(),
                                    fullName: v(studentData.fullname, `${studentData.firstname} ${studentData.lastname}`),
                                    email: studentData.email,
                                    phone: (() => {
                                        let p = studentData.phone1 || studentData.phone || cf.phone_number || cf.mobile || "";
                                        if (typeof p === 'string') {
                                            p = p.replace(/\D/g, '');
                                            if (p.length > 10 && p.startsWith('91')) p = p.substring(p.length - 10);
                                        }
                                        return p;
                                    })(),
                                    studentId: String(studentData.id),
                                    institution: v(studentData.institution, cf.college_name, cf.institution_name, studentData.academic_details?.[0]?.institution),
                                    major: (() => {
                                        let m = v(studentData.major, cf.course, cf.major_field, studentData.academic_details?.[0]?.major);
                                        const courseName = studentData.academic_details?.[0]?.course_name || "";
                                        if (courseName.toLowerCase().includes("10th")) {
                                            return "10th Grade (Secondary)";
                                        } else if (courseName.toLowerCase().includes("11th")) {
                                            return "11th Grade (Higher Secondary)";
                                        } else if (courseName.toLowerCase().includes("12th")) {
                                            return "12th Grade (Higher Secondary)";
                                        }
                                        return m;
                                    })(),
                                    gradDate: String(v(studentData.gradDate, cf["12th_passing_year"], cf.graduation_year, studentData.academic_details?.[0]?.graduation_year)).substring(0, 4),
                                    currentYear: (() => {
                                        let val = v(studentData.currentYear, cf.year_of_course, cf.current_year, cf.session, studentData.academic_details?.[0]?.academic_year);
                                        if (typeof val === 'string' && val.length > 4) {
                                            return val.substring(0, 4);
                                        }
                                        return String(val).substring(0, 4);
                                    })(),
                                    gpa: String(v(studentData.gpa, cf.percentage_12, cf["10th"], studentData.academic_details?.[0]?.cgpa)),
                                    financial: v(cf.Family_income, cf.annual_income),
                                });
                            } else {
                                Alert.alert("Error", "Failed to load student details");
                            }
                        }
                        // Fetch Dropdowns
                        const dropdownResponse = await getDropdownDefinitions(authData.token);
                        if (dropdownResponse.success && dropdownResponse.data) {
                            setDropdownData(dropdownResponse.data);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
                showToast("Failed to load data", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchRequiredData();
    }, [scholarshipId, studentId]);

    const next = async () => {
        const fields = FIELDS_BY_STEP[currentStepKey];
        if (fields && fields.length) {
            const ok = await trigger(fields as any);
            if (!ok) return;
        }
        setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    };




    const back = () => setStepIndex((i) => Math.max(0, i - 1));





    const onSubmit = handleSubmit(
        async (values) => {
            setIsSubmitLoading(true);
            try {
                if (!selectedStudent) {
                    Alert.alert("Error", "Please select a student");
                    setIsSubmitLoading(false);
                    return;
                }
                const authDataStr = await AsyncStorage.getItem("authData");
                if (!authDataStr) {
                    Alert.alert("Error", "Authentication required");
                    setIsSubmitLoading(false);
                    return;
                }
                const { token } = JSON.parse(authDataStr);
                const submissionData = {
                    student_id: selectedStudent.id,
                    scholarship_id: Number(scholarshipId),
                    application_text: values.statement,
                    fullname: values.fullName,
                    email: values.email,
                    phone: values.phone.length === 10 ? `91${values.phone}` : values.phone,
                    student_id_number: values.studentId,
                    institution: values.institution,
                    major: values.major,
                    graduation_date: values.gradDate,
                    current_year: values.currentYear,
                    gpa: values.gpa,
                    activities: values.activities,
                    financial_info: values.financial,

                };
                console.log("Submission Data:", JSON.stringify(submissionData, null, 2));
                const response = await mobilizerApplyForStudent(token, submissionData as any);
                console.log("Application Response:", JSON.stringify(response, null, 2));
                if (response.success) {
                    showToast("Application submitted successfully!", "success");
                    setTimeout(() => {
                        Alert.alert(
                            "Application Submitted",
                            `Application for ${selectedStudent.fullname || selectedStudent.firstname} has been submitted successfully!`,
                            [{ text: "OK", onPress: () => router.replace({ pathname: "/(dashboard)/mobilizer/mobilizer-scholarship-details", params: { scholarshipId: String(scholarshipId), studentId: String(studentId), studentName: selectedStudent?.fullname || `${selectedStudent?.firstname || ""} ${selectedStudent?.lastname || ""}`.trim() } }) }]
                        );
                    }, 1000);
                } else {
                    setIsSubmitLoading(false);
                    showToast(response.error || "Failed to submit application", "error");
                    Alert.alert("Submission Failed", response.error || response.message || "Please try again");
                }
            } catch (error: any) {
                setIsSubmitLoading(false);
                console.error("Error submitting application:", error);
                showToast("An error occurred", "error");
                Alert.alert("Error", error.message || "Failed to submit application");
            }
        },
        (formErrors) => {
            const firstErrorField = Object.keys(formErrors)[0] as keyof FormValues | undefined;
            Alert.alert("Incomplete Application", formErrors[firstErrorField!]?.message as string || "Please check errors.");
        }
    );

    const STEP_ITEM_WIDTH = 120;
    useEffect(() => {
        const screenW = Dimensions.get('window').width;
        const scrollViewportW = screenW - 40;
        const stepCenter = (stepIndex * STEP_ITEM_WIDTH) + (STEP_ITEM_WIDTH / 2);
        const scrollX = stepCenter - (scrollViewportW / 2);
        stepperScrollRef.current?.scrollTo({ x: Math.max(0, scrollX), animated: true });
        scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, [stepIndex]);

    const Stepper = useCallback(() => {
        const totalWidth = STEP_ITEM_WIDTH * STEPS.length;
        const customStyles = {
            stepIndicatorSize: 32,
            currentStepIndicatorSize: 36,
            separatorStrokeWidth: 2,
            currentStepStrokeWidth: 3,
            stepStrokeWidth: 2,
            stepStrokeCurrentColor: colors.primary,
            stepStrokeFinishedColor: "#10B981",
            stepStrokeUnFinishedColor: isDark ? "rgba(255,255,255,0.2)" : "#D1D5DB",
            separatorFinishedColor: "#10B981",
            separatorUnFinishedColor: isDark ? "rgba(255,255,255,0.2)" : "#D1D5DB",
            stepIndicatorFinishedColor: "#10B981",
            stepIndicatorUnFinishedColor: isDark ? colors.card : "#FFFFFF",
            stepIndicatorCurrentColor: isDark ? colors.card : "#FFFFFF",
            stepIndicatorLabelFontSize: 13,
            currentStepIndicatorLabelFontSize: 13,
            stepIndicatorLabelCurrentColor: colors.primary,
            stepIndicatorLabelFinishedColor: "#FFFFFF",
            stepIndicatorLabelUnFinishedColor: colors.textSecondary,
            labelColor: colors.textSecondary,
            currentStepLabelColor: colors.primary,
            labelSize: 11,
            labelFontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        };

        return (
            <View style={styles.stepperContainer}>
                <View style={[styles.stepperInner, { backgroundColor: isDark ? colors.card : "#fff", borderColor: colors.border }]}>
                    <ScrollView
                        ref={stepperScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ width: totalWidth, paddingHorizontal: 10 }}
                    >
                        <View style={{ width: totalWidth - 20, paddingVertical: 10 }}>
                            <StepIndicator
                                stepCount={STEPS.length}
                                currentPosition={stepIndex}
                                customStyles={customStyles as any}
                                labels={STEPS.map((s) => s.title)}
                                onPress={() => { }}
                            />
                        </View>
                    </ScrollView>
                </View>
            </View>
        );
    }, [stepIndex, isDark, colors]);

    const Section = useCallback(({ children, title }: { children: React.ReactNode; title?: string }) => (
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 300 }}>
            <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "#fff", borderColor: colors.border }]}>
                {title && (
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIconBox, { backgroundColor: `${colors.primary}15` }]}>
                            <Ionicons name="document-text" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
                    </View>
                )}
                {children}
            </View>
        </MotiView>
    ), [isDark, colors]);

    const SummaryRow = useCallback(({ label, value }: { label: string; value: string }) => (
        <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{value || "Not provided"}</Text>
        </View>
    ), [colors]);

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f5f5f5", justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 20, color: colors.text, fontSize: 16 }}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f5f5f5" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <LinearGradient
                colors={isDark ? ["#121212", "#1a1a1a", "#1e1e1e"] : ["#ffffff", "#f9fafb", "#f3f4f6"]}
                style={styles.background}
            />

            <AppHeader title="Apply for Scholarship" onBack={() => router.back()} />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}

            >
                <ScrollView
                    ref={scrollRef}
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Stepper />

                    <View style={styles.formContainer}>
                        {/* Header Info - Student Being Applied For */}
                        <View style={{ marginBottom: 20, padding: 16, backgroundColor: isDark ? colors.card : '#E0F2FE', borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                                width: 40, height: 40, borderRadius: 20,
                                backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12
                            }}>
                                <Ionicons name="person" size={20} color="#fff" />
                            </View>
                            <View>
                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Applying for</Text>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                                    {selectedStudent?.fullname || `${selectedStudent?.firstname || ''} ${selectedStudent?.lastname || ''}`}
                                </Text>
                            </View>
                        </View>

                        {/* STEP 1: Personal Details */}
                        {currentStepKey === "personal" && (
                            <Section title="Personal Information">
                                <Controller control={control} name="fullName" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Full Name" placeholder="Enter full name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.fullName?.message} required />
                                )} />
                                <Controller control={control} name="email" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Email Address" placeholder="student@example.com" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} required />
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
                                    <CustomTextInput label="Student ID" placeholder="Enter student ID" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.studentId?.message} editable={false} style={{ backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#F3F4F6", opacity: 0.65 }} required />
                                )} />
                            </Section>
                        )}

                        {/* STEP 2: Academic Details */}
                        {currentStepKey === "academic" && (
                            <Section title="Academic Information">
                                <Controller control={control} name="institution" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Institution Name" placeholder="Enter institution" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.institution?.message} required />
                                )} />
                                <Controller control={control} name="major" render={({ field: { onChange, value } }) => (
                                    <TouchableOpacity onPress={() => {
                                        setOptionPickerState({
                                            visible: true,
                                            title: "Select Major / Field of Study",
                                            options: [
                                                "Computer Science", "Information Technology", "Data Science / AI", "Mechanical Engineering", "Civil Engineering", "Electrical / Electronics Engineering", "Biomedical Engineering", "Chemical Engineering", "Aerospace / Aeronautical Engineering", "Medicine (MBBS)", "Dental (BDS)", "Nursing", "Pharmacy", "Business Administration (BBA/MBA)", "Finance / Accounting", "Economics", "Marketing", "Law (LLB/LLM)", "History", "Political Science", "Psychology", "Sociology", "English / Literature", "Physics", "Chemistry", "Mathematics", "Biology / Biotechnology", "Environmental Science", "Architecture", "Design (Fashion/Graphic/Interior)", "Journalism / Mass Communication", "Agriculture / Horticulture", "Veterinary Science", "Education / Teaching", "Hotel Management / Hospitality", "Vocational Training (ITI)", "Polytechnic / Diploma", "10th Grade (Secondary)", "11th Grade (Higher Secondary)", "12th Grade (Higher Secondary)", "Other"
                                            ],
                                            onSelect: (val) => onChange(val)
                                        });
                                    }}>
                                        <View pointerEvents="none">
                                            <CustomTextInput label="Major / Field of Study" placeholder="Select major" value={value} editable={false} onChangeText={() => { }} error={errors.major?.message} required rightIcon="chevron-down" />
                                        </View>
                                    </TouchableOpacity>
                                )} />
                                {isGradeStudent ? (
                                    <Controller control={control} name="currentYear" render={({ field: { onChange, value, onBlur } }) => (
                                        <CustomTextInput label="Passing Year" placeholder="YYYY" value={value || ""} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" maxLength={4} error={errors.currentYear?.message} required rightIcon="calendar-outline" />
                                    )} />
                                ) : (
                                    <>
                                        <Controller control={control} name="gradDate" render={({ field: { onChange, value, onBlur } }) => (
                                            <CustomTextInput label="Expected Graduation Year" placeholder="YYYY" value={value || ""} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" maxLength={4} error={errors.gradDate?.message} required rightIcon="calendar-outline" />
                                        )} />
                                        <Controller control={control} name="currentYear" render={({ field: { onChange, value, onBlur } }) => (
                                            <CustomTextInput label="Current Year of Study" placeholder="YYYY" value={value || ""} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" maxLength={4} error={errors.currentYear?.message} required rightIcon="calendar-outline" />
                                        )} />
                                    </>
                                )}
                                <Controller control={control} name="gpa" render={({ field: { onChange, value, onBlur } }) => (
                                    <View style={{ marginBottom: 16 }}>
                                        <CustomTextInput label="Last Exam Percentage (%) (Optional)" placeholder="e.g. 82.5" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" error={errors.gpa?.message} maxLength={5} />
                                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4, marginTop: 4 }}>
                                            If the institute provides CGPA, please convert it to percentage (e.g., CGPA × 9.5).
                                        </Text>
                                    </View>
                                )} />
                            </Section>
                        )}

                        {/* STEP 3: Narrative */}
                        {currentStepKey === "narrative" && (
                            <Section title="Personal Statement & Background">
                                <Controller control={control} name="financial" render={({ field: { onChange, value } }) => (
                                    <TouchableOpacity onPress={() => {
                                        setOptionPickerState({
                                            visible: true,
                                            title: "Family Annual Income",
                                            options: getOptionsByShortname('Family_income').map((o: any) => o.label),
                                            onSelect: (val) => onChange(val)
                                        });
                                    }}>
                                        <View pointerEvents="none">
                                            <CustomTextInput label="Family Annual Income (Optional)" placeholder="Select income range" value={value} editable={false} onChangeText={() => { }} error={errors.financial?.message} rightIcon="chevron-down" />
                                        </View>
                                    </TouchableOpacity>
                                )} />
                                <Controller control={control} name="activities" render={({ field: { onChange, value } }) => (
                                    <TouchableOpacity onPress={() => {
                                        setOptionPickerState({
                                            visible: true,
                                            title: "Extracurricular Activities",
                                            options: ["Sports (Team/Individual)", "Music / Performing Arts", "Debate / Public Speaking", "Volunteering / Social Work", "Student Council / Leadership", "Tech / Coding Clubs", "Arts & Crafts", "None", "Other"],
                                            onSelect: (val) => onChange(val)
                                        });
                                    }}>
                                        <View pointerEvents="none">
                                            <CustomTextInput label="Extracurricular Activities (Optional)" placeholder="Select primary activity" value={value} editable={false} onChangeText={() => { }} rightIcon="chevron-down" />
                                        </View>
                                    </TouchableOpacity>
                                )} />
                                <Controller control={control} name="statement" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput
                                        label="Personal Statement (Optional)"
                                        placeholder="Why does this student deserve this scholarship?"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        error={errors.statement?.message}
                                        inputStyle={{ minHeight: 120, textAlignVertical: "top" }}
                                        multiline
                                    />
                                )} />
                            </Section>
                        )}

                        {/* STEP 6: Summary */}
                        {currentStepKey === "summary" && (
                            <Section title="Review Application">
                                <View style={[styles.summaryCard, { backgroundColor: isDark ? colors.surface : '#fafafa' }]}>
                                    <View style={styles.summarySection}>
                                        <Text style={[styles.summarySectionTitle, { color: colors.primary }]}>Student Information</Text>
                                        <SummaryRow label="Full Name" value={allValues.fullName} />
                                        <SummaryRow label="Email" value={allValues.email} />
                                        <SummaryRow label="Phone" value={allValues.phone} />
                                        <SummaryRow label="Student ID" value={allValues.studentId} />
                                    </View>

                                    <View style={styles.summarySection}>
                                        <Text style={[styles.summarySectionTitle, { color: colors.primary }]}>Academic Details</Text>
                                        <SummaryRow label="Institution" value={allValues.institution} />
                                        <SummaryRow label="Major" value={allValues.major} />
                                        {!["10th Grade (Secondary)", "12th Grade (Higher Secondary)"].includes(allValues.major || "") && (
                                            <>
                                                <SummaryRow label="Graduation Date" value={allValues.gradDate || ""} />
                                                <SummaryRow label="Current Year" value={allValues.currentYear || ""} />
                                            </>
                                        )}
                                        <SummaryRow label="CGPA" value={allValues.gpa} />
                                    </View>

                                    <View style={styles.summarySection}>
                                        <Text style={[styles.summarySectionTitle, { color: colors.primary }]}>Background</Text>
                                        <SummaryRow label="Financial Info" value={allValues.financial || "Not provided"} />
                                        <SummaryRow label="Activities" value={allValues.activities || "Not provided"} />
                                        <SummaryRow label="Statement" value={allValues.statement ? `${allValues.statement.substring(0, 100)}...` : "Not provided"} />
                                    </View>


                                </View>
                            </Section>
                        )}

                        {/* STEP 7: Declaration */}
                        {currentStepKey === "declare" && (
                            <Section title="Declaration & Submit">
                                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                    <View style={[styles.illustrationBox, { backgroundColor: `${colors.primary}10` }]}>
                                        <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
                                    </View>
                                    <Text style={[styles.stepDescription, { color: colors.text, textAlign: 'center', marginBottom: 24 }]}>
                                        Please review and confirm before submitting
                                    </Text>
                                    <Controller control={control} name="agreed" render={({ field: { value, onChange } }) => (
                                        <TouchableOpacity onPress={() => onChange(!value)} style={styles.declareRow}>
                                            <View style={[styles.checkbox, { borderColor: value ? colors.primary : colors.border, backgroundColor: value ? colors.primary : 'transparent' }]}>
                                                {value && <Ionicons name="checkmark" size={18} color="#fff" />}
                                            </View>
                                            <Text style={[styles.declareText, { color: colors.text }]}>
                                                I confirm that I am applying on behalf of the selected student and all information provided is accurate and truthful.
                                            </Text>
                                        </TouchableOpacity>
                                    )} />
                                    {errors.agreed?.message && <Text style={[styles.errorText, { marginTop: 8 }]}>{errors.agreed.message}</Text>}
                                </View>
                            </Section>
                        )}
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: insets.bottom, backgroundColor: isDark ? colors.card : '#fff', borderTopColor: colors.border }]}>
                    <View style={styles.footerInner}>
                        {stepIndex > 0 && (
                            <Button title="Back" onPress={back} variant="secondary" style={styles.footerBtn} />
                        )}
                        {stepIndex < STEPS.length - 1 ? (
                            <Button title="Next" onPress={next} variant="primary" style={[styles.footerBtn, stepIndex === 0 && { flex: 1 }]} />
                        ) : (
                            <Button
                                title={isSubmitting ? "Submitting..." : "Submit"}
                                onPress={onSubmit}
                                variant="primary"
                                style={styles.footerBtn}
                                disabled={isSubmitting}
                            />
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>




            {/* Option Picker Modal */}
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
                        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#eee' }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{optionPickerState.title}</Text>
                        </View>

                        <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#eee' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? colors.surface : '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, height: 44 }}>
                                <Ionicons name="search" size={20} color={colors.textSecondary} />
                                <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search..." placeholderTextColor={colors.textSecondary} style={{ flex: 1, marginLeft: 8, fontSize: 15, color: colors.text, paddingVertical: 0 }} />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                                        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {filteredOptions.length > 0 ? (
                            <FlatList
                                data={filteredOptions}
                                keyExtractor={(item) => item}
                                keyboardShouldPersistTaps="always"
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#f5f5f5' }} onPress={() => { optionPickerState.onSelect(item); setOptionPickerState(prev => ({ ...prev, visible: false })); setSearchQuery(""); }}>
                                        <Text style={{ fontSize: 16, color: colors.text }}>{item}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        ) : (
                            <View style={{ padding: 32, alignItems: 'center' }}>
                                <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                                <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>No results found</Text>
                            </View>
                        )}
                        <Button title="Cancel" onPress={() => { setOptionPickerState({ ...optionPickerState, visible: false }); setSearchQuery(""); }} variant="secondary" style={{ margin: 16, marginTop: 0 }} />
                    </View>
                </TouchableOpacity>
            </Modal>

            {
                isSubmitLoading && (
                    <Modal transparent animationType="fade" visible={isSubmitLoading}>
                        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: 'center', alignItems: 'center' }}>
                            <View style={{ backgroundColor: isDark ? colors.card : '#fff', padding: 24, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '700', color: colors.text }}>Submitting Application</Text>
                                <Text style={{ marginTop: 6, fontSize: 13, color: colors.textSecondary }}>Please wait, do not close the app</Text>
                            </View>
                        </View>
                    </Modal>
                )
            }

            <Toast
                visible={toastVisible}
                message={toastMessage}
                type={toastType}
                onHide={() => setToastVisible(false)}
            />
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: "absolute", top: 0, left: 0, bottom: 0, right: 0 },
    scrollView: { flex: 1 },
    stepperContainer: { marginBottom: 16 },
    stepperInner: { paddingVertical: 12, borderBottomWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    formContainer: { paddingHorizontal: 16 },
    formCard: { borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    sectionIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '700' },
    sectionSubtitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
    illustrationBox: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    stepDescription: { fontSize: 16, fontWeight: '500', textAlign: 'center', marginBottom: 16, paddingHorizontal: 20 },

    helperText: { fontSize: 13, marginBottom: 16, lineHeight: 20 },
    inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5 },
    chipText: { fontSize: 13, fontWeight: '600' },
    docReqItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
    reqDocLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    uploadedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    uploadedText: { fontSize: 12, fontWeight: '500', maxWidth: 180 },
    uploadBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
    docItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
    docName: { fontSize: 14, fontWeight: '500' },
    docRemove: { padding: 6 },
    summaryCard: { borderRadius: 16, padding: 16 },
    summarySection: { marginBottom: 24 },
    summarySectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
    summaryLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
    summaryValue: { fontSize: 13, fontWeight: '600', flex: 1.5, textAlign: 'right' },
    declareRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16 },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
    declareText: { flex: 1, fontSize: 14, lineHeight: 22 },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 6 },
    footer: { borderTopWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
    footerInner: { flexDirection: 'row', padding: 16, gap: 12 },
    footerBtn: { flex: 1 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalTitle: { fontSize: 22, fontWeight: '700' },
    optionModalContent: { margin: 20, borderRadius: 20, padding: 24, maxHeight: '60%' },
    optionItem: { paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    optionText: { fontSize: 16, fontWeight: '500' },
});
