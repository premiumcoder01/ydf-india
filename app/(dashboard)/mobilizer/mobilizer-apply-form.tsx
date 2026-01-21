import { AppHeader, Button, CustomTextInput } from "@/components";
import Toast from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import { getMobilizerStudents, getScholarshipDetails, mobilizerApplyForStudent } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
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
    documentId?: number | string;
    label?: string;
};

const formSchema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(8, "Phone is required"),
    studentId: z.string().min(1, "Student ID is required"),
    institution: z.string().min(2, "Institution is required"),
    major: z.string().min(2, "Major is required"),
    gradDate: z.string().min(4, "Graduation date is required"),
    currentYear: z.string().min(1, "Current year is required"),
    gpa: z.string().refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) <= 10.0), {
        message: "CGPA must be a number up to 10.0",
    }),
    statement: z.string().min(1, "Statement is required"),
    activities: z.string().optional().default(""),
    financial: z.string().optional().default(""),
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
    assessmentQ1: z.string().optional(),
    assessmentQ2: z.string().optional(),
    interviewMode: z.string().optional(),
    agreed: z.boolean().refine((v) => v, { message: "You must agree before submitting" }),
});

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
    { key: "student", title: "Select Student" },
    { key: "personal", title: "Personal" },
    { key: "academic", title: "Academic" },
    { key: "narrative", title: "Narrative" },
    { key: "assessment", title: "Assessment" },
    { key: "documents", title: "Documents" },
    { key: "summary", title: "Review" },
    { key: "declare", title: "Submit" },
] as const;

const FIELDS_BY_STEP: Record<string, (keyof FormValues)[]> = {
    student: [],
    personal: ["fullName", "email", "phone", "studentId"],
    academic: ["institution", "major", "gradDate", "currentYear", "gpa"],
    narrative: ["financial", "activities", "statement"],
    assessment: ["assessmentQ1", "assessmentQ2"],
    documents: ["documents"],
    summary: [],
    declare: ["agreed"],
};

export default function MobilizerApplyFormScreen() {
    const { isDark, colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [stepIndex, setStepIndex] = useState(0);
    const scrollRef = useRef<ScrollView | null>(null);
    const stepperScrollRef = useRef<ScrollView | null>(null);
    const { scholarshipId } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [scholarship, setScholarship] = useState<any>(null);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [showStudentPicker, setShowStudentPicker] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

    const [datePickerState, setDatePickerState] = useState<{
        visible: boolean;
        mode: "date" | "time";
        field: keyof FormValues | null;
    }>({ visible: false, mode: "date", field: null });

    const [optionPickerState, setOptionPickerState] = useState<{
        visible: boolean;
        title: string;
        options: string[];
        onSelect: (val: string) => void;
    }>({ visible: false, title: "", options: [], onSelect: () => { } });

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
            documents: [],
            assessmentQ1: "",
            assessmentQ2: "",
            interviewMode: "",
            agreed: false,
        },
        mode: "onSubmit",
        reValidateMode: "onSubmit",
    });

    const documents = watch("documents") || [];

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
                        const studentsResponse = await getMobilizerStudents(authData.token, 1, 100);
                        if (studentsResponse.success && studentsResponse.data?.students) {
                            setStudents(studentsResponse.data.students);
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
    }, [scholarshipId]);

    const selectStudent = (student: any) => {
        setSelectedStudent(student);
        setShowStudentPicker(false);
        reset({
            ...getValues(),
            fullName: student.fullname || `${student.firstname} ${student.lastname}`,
            email: student.email,
            phone: student.phone1 || student.phone || "",
            studentId: String(student.id),
            institution: student.institution || "",
            major: student.major || "",
            gradDate: student.gradDate || "",
            currentYear: student.currentYear || student.current_year || "",
            gpa: student.gpa || "",
        });
        if (stepIndex === 0) {
            setStepIndex(1);
        }
    };


    const next = async () => {
        if (currentStepKey === 'student' && !selectedStudent) {
            Alert.alert("Selection Required", "Please select a student to proceed.");
            setShowStudentPicker(true);
            return;
        }
        const fields = FIELDS_BY_STEP[currentStepKey];
        if (fields.length) {
            const ok = await trigger(fields as any);
            if (!ok) return;
        }
        setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    };

    const back = () => setStepIndex((i) => Math.max(0, i - 1));

    const openDatePicker = (field: keyof FormValues, mode: "date" | "time" = "date") => {
        setDatePickerState({ visible: true, mode, field });
    };

    const handleDateConfirm = (selectedDate: Date) => {
        const currentField = datePickerState.field;
        setDatePickerState({ visible: false, mode: "date", field: null });
        if (!selectedDate || !currentField) return;
        if (currentField === "gradDate") {
            const month = selectedDate.getMonth() + 1;
            const year = selectedDate.getFullYear();
            const formatted = `${month.toString().padStart(2, '0')}/${year}`;
            setValue("gradDate", formatted, { shouldValidate: true });
        } else if (currentField === "currentYear") {
            const year = selectedDate.getFullYear().toString();
            setValue("currentYear", year, { shouldValidate: true });
        }
    };

    const onPickGlobalDocuments = async () => {
        const res = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true, copyToCacheDirectory: true });
        if (res.canceled) return;
        const picked: DocumentItem[] = res.assets.map((a) => ({ name: a.name, uri: a.uri, mimeType: a.mimeType ?? undefined, size: a.size ?? undefined }));
        const existing = getValues("documents");
        setValue("documents", [...existing, ...picked], { shouldDirty: true, shouldValidate: true });
    };

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

    const onSubmit = handleSubmit(
        async (values) => {
            try {
                if (!selectedStudent) {
                    Alert.alert("Error", "Please select a student");
                    return;
                }
                const authDataStr = await AsyncStorage.getItem("authData");
                if (!authDataStr) {
                    Alert.alert("Error", "Authentication required");
                    return;
                }
                const { token } = JSON.parse(authDataStr);
                const submissionData = {
                    student_id: selectedStudent.id,
                    scholarship_id: Number(scholarshipId),
                    application_text: values.statement,
                    fullname: values.fullName,
                    email: values.email,
                    phone: values.phone,
                    student_id_number: values.studentId,
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
                    documents: values.documents,
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
                            [{ text: "OK", onPress: () => router.replace("/(dashboard)/mobilizer/mobilizer-applications") }]
                        );
                    }, 1000);
                } else {
                    showToast(response.error || "Failed to submit application", "error");
                    Alert.alert("Submission Failed", response.error || response.message || "Please try again");
                }
            } catch (error: any) {
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
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    ref={scrollRef}
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingBottom: 150 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Stepper />

                    <View style={styles.formContainer}>
                        {/* STEP 0: Student Selection */}
                        {currentStepKey === "student" && (
                            <Section title="Select Student">
                                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                    <View style={[styles.illustrationBox, { backgroundColor: `${colors.primary}10` }]}>
                                        <Ionicons name="people" size={48} color={colors.primary} />
                                    </View>
                                    <Text style={[styles.stepDescription, { color: colors.text }]}>
                                        Choose the student you're applying for
                                    </Text>
                                    {selectedStudent ? (
                                        <View style={[styles.selectedStudentCard, { backgroundColor: isDark ? colors.surface : '#F0F9FF', borderColor: colors.primary }]}>
                                            <View style={[styles.studentAvatar, { backgroundColor: colors.primary }]}>
                                                <Text style={styles.avatarText}>
                                                    {(selectedStudent.fullname || selectedStudent.firstname || "S").charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={[styles.selectedStudentName, { color: colors.text }]}>
                                                    {selectedStudent.fullname || `${selectedStudent.firstname} ${selectedStudent.lastname}`}
                                                </Text>
                                                <Text style={[styles.selectedStudentInfo, { color: colors.textSecondary }]}>
                                                    {selectedStudent.email}
                                                </Text>
                                                <Text style={[styles.selectedStudentInfo, { color: colors.textSecondary }]}>
                                                    {selectedStudent.institution || "N/A"}
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={() => setShowStudentPicker(true)} style={[styles.changeButton, { backgroundColor: colors.primary }]}>
                                                <Ionicons name="swap-horizontal" size={18} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <Button title="Choose Student" onPress={() => setShowStudentPicker(true)} variant="primary" style={{ marginTop: 20, minWidth: 200 }} />
                                    )}
                                </View>
                            </Section>
                        )}

                        {/* STEP 1: Personal Details */}
                        {currentStepKey === "personal" && (
                            <Section title="Personal Information">
                                <Controller control={control} name="fullName" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Full Name" placeholder="Enter full name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.fullName?.message} required />
                                )} />
                                <Controller control={control} name="email" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Email Address" placeholder="student@example.com" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} required />
                                )} />
                                <Controller control={control} name="phone" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Phone Number" placeholder="+91 98765 43210" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" error={errors.phone?.message} required />
                                )} />
                                <Controller control={control} name="studentId" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Student ID" placeholder="Enter student ID" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.studentId?.message} required />
                                )} />
                            </Section>
                        )}

                        {/* STEP 2: Academic Details */}
                        {currentStepKey === "academic" && (
                            <Section title="Academic Information">
                                <Controller control={control} name="institution" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Institution Name" placeholder="Enter institution" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.institution?.message} required />
                                )} />
                                <Controller control={control} name="major" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Major / Field of Study" placeholder="e.g., Computer Science" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.major?.message} required />
                                )} />
                                <Controller control={control} name="gradDate" render={({ field: { value } }) => (
                                    <TouchableOpacity onPress={() => openDatePicker("gradDate", "date")}>
                                        <View pointerEvents="none">
                                            <CustomTextInput
                                                label="Expected Graduation"
                                                placeholder="MM/YYYY"
                                                value={value}
                                                editable={false}
                                                error={errors.gradDate?.message}
                                                onChangeText={() => { }}
                                                required
                                                icon="calendar-outline"
                                            />
                                        </View>
                                    </TouchableOpacity>
                                )} />
                                <Controller control={control} name="currentYear" render={({ field: { value } }) => (
                                    <TouchableOpacity onPress={() => openDatePicker("currentYear", "date")}>
                                        <View pointerEvents="none">
                                            <CustomTextInput
                                                label="Current Year of Study"
                                                placeholder="YYYY"
                                                value={value}
                                                editable={false}
                                                error={errors.currentYear?.message}
                                                onChangeText={() => { }}
                                                required
                                                icon="school-outline"
                                            />
                                        </View>
                                    </TouchableOpacity>
                                )} />
                                <Controller control={control} name="gpa" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput
                                        label="Current CGPA/% (Max 10)"
                                        placeholder="e.g., 8.5"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        keyboardType="decimal-pad"
                                        error={errors.gpa?.message}
                                        icon="analytics-outline"
                                    />
                                )} />
                            </Section>
                        )}

                        {/* STEP 3: Narrative */}
                        {currentStepKey === "narrative" && (
                            <Section title="Personal Statement & Background">
                                <Controller control={control} name="financial" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput
                                        label="Family / Financial Information"
                                        placeholder="Describe your family's financial situation"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        inputStyle={{ minHeight: 80, textAlignVertical: "top" }}
                                        multiline
                                    />
                                )} />
                                <Controller control={control} name="activities" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput
                                        label="Extracurricular Activities"
                                        placeholder="List achievements, volunteer work, etc."
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        inputStyle={{ minHeight: 80, textAlignVertical: "top" }}
                                        multiline
                                    />
                                )} />
                                <Controller control={control} name="statement" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput
                                        label="Personal Statement"
                                        placeholder="Why does this student deserve this scholarship?"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        error={errors.statement?.message}
                                        inputStyle={{ minHeight: 120, textAlignVertical: "top" }}
                                        multiline
                                        required
                                    />
                                )} />
                            </Section>
                        )}

                        {/* STEP 4: Assessment */}
                        {currentStepKey === "assessment" && (
                            <Section title="Need Assessment">
                                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                                    These questions help us assess the student's socio-economic background
                                </Text>
                                <Controller control={control} name="assessmentQ1" render={({ field: { value, onChange } }) => (
                                    <TouchableOpacity onPress={() => {
                                        setOptionPickerState({
                                            visible: true,
                                            title: "Vehicle Ownership",
                                            options: ["Yes", "No"],
                                            onSelect: (val) => onChange(val)
                                        });
                                    }}>
                                        <View pointerEvents="none">
                                            <CustomTextInput
                                                label="Does the student's family own a vehicle?"
                                                placeholder="Select Yes/No"
                                                value={value || ""}
                                                editable={false}
                                                onChangeText={() => { }}
                                                icon="car-outline"
                                            />
                                        </View>
                                    </TouchableOpacity>
                                )} />
                                <Controller control={control} name="assessmentQ2" render={({ field: { value, onChange } }) => (
                                    <TouchableOpacity onPress={() => {
                                        setOptionPickerState({
                                            visible: true,
                                            title: "Housing Type",
                                            options: ["Owned", "Rented", "Kutcha House", "Pucca House", "Other"],
                                            onSelect: (val) => onChange(val)
                                        });
                                    }}>
                                        <View pointerEvents="none">
                                            <CustomTextInput
                                                label="Type of Housing"
                                                placeholder="Select housing type"
                                                value={value || ""}
                                                editable={false}
                                                onChangeText={() => { }}
                                                icon="home-outline"
                                            />
                                        </View>
                                    </TouchableOpacity>
                                )} />
                                <Controller control={control} name="interviewMode" render={({ field: { value, onChange } }) => (
                                    <View style={{ marginTop: 8 }}>
                                        <Text style={[styles.inputLabel, { color: colors.text }]}>Preferred Interview Mode</Text>
                                        <View style={styles.chipContainer}>
                                            {["Online (Video Call)", "Telephonic", "In-Person"].map((mode) => (
                                                <TouchableOpacity
                                                    key={mode}
                                                    onPress={() => onChange(mode)}
                                                    style={[
                                                        styles.chip,
                                                        {
                                                            borderColor: value === mode ? colors.primary : colors.border,
                                                            backgroundColor: value === mode ? `${colors.primary}15` : "transparent"
                                                        }
                                                    ]}
                                                >
                                                    <Text style={[styles.chipText, { color: value === mode ? colors.primary : colors.textSecondary }]}>
                                                        {mode}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )} />
                            </Section>
                        )}

                        {/* STEP 5: Documents */}
                        {currentStepKey === "documents" && (
                            <Section title="Required Documents">
                                <View style={{ gap: 16 }}>
                                    {scholarship?.documents && scholarship.documents.length > 0 ? (
                                        <View>
                                            {scholarship.documents
                                                .filter((reqDoc: any) => !reqDoc.name?.toLowerCase().includes("structured feedback"))
                                                .map((reqDoc: any, index: number) => {
                                                    const uploadedDoc = documents.find(d => d.documentId === (reqDoc.id || reqDoc.shortname));
                                                    return (
                                                        <View key={reqDoc.id || index} style={[styles.docReqItem, { borderColor: colors.border, backgroundColor: isDark ? colors.surface : '#fafafa' }]}>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={[styles.reqDocLabel, { color: colors.text }]}>
                                                                    {reqDoc.label || reqDoc.name || "Document"}
                                                                    {reqDoc.required !== false && <Text style={{ color: '#EF4444' }}> *</Text>}
                                                                </Text>
                                                                {uploadedDoc ? (
                                                                    <View style={styles.uploadedBadge}>
                                                                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                                                        <Text numberOfLines={1} style={[styles.uploadedText, { color: '#10B981' }]}>{uploadedDoc.name}</Text>
                                                                    </View>
                                                                ) : (
                                                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Not uploaded yet</Text>
                                                                )}
                                                            </View>
                                                            <TouchableOpacity
                                                                onPress={() => onPickSpecificDocument(reqDoc)}
                                                                style={[styles.uploadBtn, { backgroundColor: uploadedDoc ? (isDark ? colors.surface : '#f0fdf4') : colors.primary }]}
                                                            >
                                                                <Ionicons name={uploadedDoc ? "refresh" : "cloud-upload-outline"} size={18} color={uploadedDoc ? colors.text : '#fff'} />
                                                                <Text style={{ color: uploadedDoc ? colors.text : '#fff', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
                                                                    {uploadedDoc ? "Change" : "Upload"}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    );
                                                })}
                                        </View>
                                    ) : (
                                        <Button variant="secondary" onPress={onPickGlobalDocuments}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Ionicons name="cloud-upload-outline" size={20} color={colors.text} />
                                                <Text style={{ fontWeight: "700", color: colors.text }}>Pick Documents</Text>
                                            </View>
                                        </Button>
                                    )}

                                    <View style={{ marginTop: 16 }}>
                                        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Attached Files ({documents.length})</Text>
                                        {documents.length === 0 && (
                                            <Text style={{ fontStyle: 'italic', color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>No documents selected</Text>
                                        )}
                                        {documents.map((doc, idx) => (
                                            <View key={`${doc.uri}-${idx}`} style={[styles.docItem, { backgroundColor: isDark ? colors.surface : "#fff", borderColor: colors.border }]}>
                                                <Ionicons name="document-attach-outline" size={22} color={colors.primary} />
                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                    <Text numberOfLines={1} style={[styles.docName, { color: colors.text }]}>{doc.name}</Text>
                                                    {doc.label && <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{doc.label}</Text>}
                                                </View>
                                                <TouchableOpacity onPress={() => removeDocument(idx)} style={styles.docRemove}>
                                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                        {errors.documents?.message && (
                                            <Text style={styles.errorText}>{String(errors.documents.message)}</Text>
                                        )}
                                    </View>
                                </View>
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
                                        <SummaryRow label="Graduation Date" value={allValues.gradDate} />
                                        <SummaryRow label="Current Year" value={allValues.currentYear} />
                                        <SummaryRow label="CGPA" value={allValues.gpa} />
                                    </View>

                                    <View style={styles.summarySection}>
                                        <Text style={[styles.summarySectionTitle, { color: colors.primary }]}>Background</Text>
                                        <SummaryRow label="Financial Info" value={allValues.financial || "Not provided"} />
                                        <SummaryRow label="Activities" value={allValues.activities || "Not provided"} />
                                        <SummaryRow label="Statement" value={allValues.statement ? `${allValues.statement.substring(0, 100)}...` : "Not provided"} />
                                    </View>

                                    <View style={styles.summarySection}>
                                        <Text style={[styles.summarySectionTitle, { color: colors.primary }]}>Assessment</Text>
                                        <SummaryRow label="Vehicle Ownership" value={allValues.assessmentQ1 || "Not answered"} />
                                        <SummaryRow label="Housing Type" value={allValues.assessmentQ2 || "Not answered"} />
                                        <SummaryRow label="Interview Mode" value={allValues.interviewMode || "Not selected"} />
                                    </View>

                                    <View style={styles.summarySection}>
                                        <Text style={[styles.summarySectionTitle, { color: colors.primary }]}>Documents</Text>
                                        <View style={{ marginTop: 8 }}>
                                            <Text style={[styles.summaryValue, { color: colors.text }]}>{documents.length} document(s) attached</Text>
                                            {documents.map((doc, idx) => (
                                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 6 }}>{doc.name}</Text>
                                                </View>
                                            ))}
                                        </View>
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
                                title={isSubmitting ? "Submitting..." : "Submit Application"}
                                onPress={onSubmit}
                                variant="primary"
                                style={styles.footerBtn}
                                disabled={isSubmitting}
                            />
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Student Selection Modal */}
            <Modal visible={showStudentPicker} animationType="slide" transparent>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? colors.card : '#fff' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Student</Text>
                            {selectedStudent && (
                                <TouchableOpacity onPress={() => setShowStudentPicker(false)}>
                                    <Ionicons name="close" size={26} color={colors.text} />
                                </TouchableOpacity>
                            )}
                        </View>
                        {students.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No students found</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={students}
                                keyExtractor={(item) => String(item.id)}
                                renderItem={({ item }) => (
                                    <TouchableOpacity onPress={() => selectStudent(item)} style={[styles.studentItem, { borderBottomColor: colors.border }]}>
                                        <View style={[styles.studentItemAvatar, { backgroundColor: colors.primary }]}>
                                            <Text style={styles.studentItemAvatarText}>
                                                {(item.fullname || item.firstname || "S").charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.studentItemName, { color: colors.text }]}>
                                                {item.fullname || `${item.firstname} ${item.lastname}`}
                                            </Text>
                                            <Text style={[styles.studentItemInfo, { color: colors.textSecondary }]}>
                                                {item.email}
                                            </Text>
                                            <Text style={[styles.studentItemInfo, { color: colors.textSecondary }]}>
                                                {item.institution || "N/A"}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Date Picker Modal */}
            <DateTimePickerModal
                isVisible={datePickerState.visible}
                mode={datePickerState.mode}
                onConfirm={handleDateConfirm}
                onCancel={() => setDatePickerState({ visible: false, mode: "date", field: null })}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            />

            {/* Option Picker Modal */}
            <Modal visible={optionPickerState.visible} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={[styles.optionModalContent, { backgroundColor: isDark ? colors.card : '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 20 }]}>{optionPickerState.title}</Text>
                        {optionPickerState.options.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => {
                                    optionPickerState.onSelect(option);
                                    setOptionPickerState({ ...optionPickerState, visible: false });
                                }}
                                style={[styles.optionItem, { borderBottomColor: colors.border }]}
                            >
                                <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
                                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                        <Button
                            title="Cancel"
                            onPress={() => setOptionPickerState({ ...optionPickerState, visible: false })}
                            variant="secondary"
                            style={{ marginTop: 16 }}
                        />
                    </View>
                </View>
            </Modal>

            <Toast
                visible={toastVisible}
                message={toastMessage}
                type={toastType}
                onHide={() => setToastVisible(false)}
            />
        </View>
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
    sectionTitle: { fontSize: 18, fontWeight: '700' },
    sectionSubtitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
    illustrationBox: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    stepDescription: { fontSize: 16, fontWeight: '500', textAlign: 'center', marginBottom: 16, paddingHorizontal: 20 },
    selectedStudentCard: { width: '100%', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 2, marginTop: 16 },
    studentAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
    selectedStudentName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    selectedStudentInfo: { fontSize: 13, marginBottom: 2 },
    changeButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
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
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
    footerInner: { flexDirection: 'row', padding: 16, gap: 12 },
    footerBtn: { flex: 1 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { height: '75%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
    modalTitle: { fontSize: 22, fontWeight: '700' },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, marginTop: 16 },
    studentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
    studentItemAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    studentItemAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
    studentItemName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    studentItemInfo: { fontSize: 13, marginBottom: 2 },
    optionModalContent: { margin: 20, borderRadius: 20, padding: 24, maxHeight: '60%' },
    optionItem: { paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    optionText: { fontSize: 16, fontWeight: '500' },
});
