import { AppHeader, Button, CustomTextInput } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getScholarshipDetails } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
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

// Mock Students Data
const MOCK_STUDENTS = [
    { id: 1, name: "Rahul Kumar", email: "rahul@example.com", phone: "9876543210", studentId: "STU001", institution: "IIT Bombay", major: "Computer Science", gradDate: "05/2026", currentYear: "3", gpa: "8.5" },
    { id: 2, name: "Priya Singh", email: "priya@example.com", phone: "9876543211", studentId: "STU002", institution: "Delhi University", major: "Physics", gradDate: "05/2025", currentYear: "4", gpa: "9.0" },
    { id: 3, name: "Amit Patel", email: "amit@example.com", phone: "9876543212", studentId: "STU003", institution: "NIT Surat", major: "Civil Engineering", gradDate: "05/2027", currentYear: "2", gpa: "7.8" },
    { id: 4, name: "Sneha Gupta", email: "sneha@example.com", phone: "9876543213", studentId: "STU004", institution: "BITS Pilani", major: "Electronics", gradDate: "05/2026", currentYear: "3", gpa: "8.9" },
    { id: 5, name: "Vikram Malhotra", email: "vikram@example.com", phone: "9876543214", studentId: "STU005", institution: "Manipal University", major: "Mechanical", gradDate: "05/2025", currentYear: "4", gpa: "8.2" },
];

const formSchema = z.object({
    // Personal (Pre-filled from selected student)
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
    statement: z.string().min(1, "Statement is required"),
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

    // Other info
    assessmentQ1: z.string().optional(),
    assessmentQ2: z.string().optional(),
    interviewMode: z.string().optional(),
    verificationTime: z.date().optional().nullable(),
    agreed: z.boolean().refine((v) => v, { message: "You must agree before submitting" }),
});

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
    { key: "student", title: "Select Student" },
    { key: "personal", title: "Personal Details" },
    { key: "academic", title: "Academic Info" },
    { key: "family", title: "Family / Income" },
    { key: "assessment", title: "Need Assessment" },
    { key: "documents", title: "Documents" },
    { key: "summary", title: "Summary" },
    { key: "declare", title: "Declaration" },
] as const;

const FIELDS_BY_STEP: Record<string, (keyof FormValues)[]> = {
    student: [], // No fields to validate, but we verify selection
    personal: ["fullName", "email", "phone", "studentId"],
    academic: ["institution", "major", "gradDate", "currentYear", "gpa"],
    family: ["financial", "activities", "statement"],
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

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setPickerState((prev) => ({ ...prev, show: false }));
        if (selectedDate && pickerState.field) {
            if (pickerState.field === "gradDate") {
                const month = selectedDate.getMonth() + 1;
                const year = selectedDate.getFullYear();
                const formatted = `${month.toString().padStart(2, '0')}/${year}`;
                setValue("gradDate", formatted, { shouldValidate: true });
            } else if (pickerState.field === "verificationTime") {
                setValue("verificationTime" as any, selectedDate as any, { shouldValidate: true });
            }
        }
    };

    useEffect(() => {
        const fetchRequiredData = async () => {
            try {
                setLoading(true);
                const authDataStr = await AsyncStorage.getItem("authData");
                if (authDataStr) {
                    const authData = JSON.parse(authDataStr);
                    if (authData.token && scholarshipId) {
                        const scholarResponse = await getScholarshipDetails(authData.token, Number(scholarshipId));
                        if (scholarResponse.success) {
                            const scholarData = scholarResponse.data?.data?.data || scholarResponse.data?.data || scholarResponse.data;
                            setScholarship(scholarData);

                            // Check if expired
                            if (scholarData && scholarData.expired) {
                                Alert.alert("Application Closed", "This scholarship has expired.", [
                                    { text: "OK", onPress: () => router.back() }
                                ]);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch scholarship:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRequiredData();
    }, [scholarshipId]);

    const selectStudent = (student: any) => {
        setSelectedStudent(student);
        setShowStudentPicker(false);

        // Auto-populate form
        reset({
            ...getValues(),
            fullName: student.name,
            email: student.email,
            phone: student.phone,
            studentId: student.studentId,
            institution: student.institution,
            major: student.major,
            gradDate: student.gradDate,
            currentYear: student.currentYear,
            gpa: student.gpa,
        });

        // Move to next step if we are on step 0
        if (stepIndex === 0) {
            setStepIndex(1);
        }
    };

    const currentStepKey = useMemo(() => STEPS[stepIndex].key, [stepIndex]);

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
            // Mock Submission
            setTimeout(() => {
                Alert.alert(
                    "Application Submitted",
                    `Application for ${selectedStudent.name} has been submitted successfully!`,
                    [{ text: "OK", onPress: () => router.replace("/(dashboard)/mobilizer/mobilizer-scholarship-listing") }]
                );
            }, 1500);
        },
        (formErrors) => {
            const firstErrorField = Object.keys(formErrors)[0] as keyof FormValues | undefined;
            Alert.alert("Incomplete Application", formErrors[firstErrorField!]?.message as string || "Please check errors.");
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
        const customStyles = {
            stepIndicatorSize: 28,
            currentStepIndicatorSize: 32,
            stepStrokeCurrentColor: isDark ? colors.primary : "#111827",
            stepStrokeFinishedColor: "#10B981",
            stepStrokeUnFinishedColor: isDark ? "rgba(255,255,255,0.2)" : "#D1D5DB",
            currentStepLabelColor: isDark ? colors.primary : "#111827",
        };

        return (
            <View style={styles.stepperContainer}>
                <View style={[styles.stepperInner, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.9)" }]}>
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
            <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.95)", borderColor: isDark ? colors.border : "rgba(51, 51, 51, 0.1)", borderWidth: 1 }]}>{children}</View>
        </MotiView>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f2c44d", justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 20, color: colors.text }}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f2c44d" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <LinearGradient
                colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
                style={styles.background}
            />

            <AppHeader title="Scholarship Application" onBack={() => router.back()} />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <ScrollView ref={scrollRef} style={styles.scrollView} contentContainerStyle={{ paddingBottom: 120, paddingTop: 20 }}>
                    <Stepper />

                    <View style={styles.formContainer}>
                        {/* Step 0: Student Selection (Visual representation only, modal handles logic) */}
                        {currentStepKey === "student" && (
                            <Section>
                                <View style={{ alignItems: 'center', padding: 20 }}>
                                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(33, 150, 243, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                                        <Ionicons name="people" size={40} color="#2196F3" />
                                    </View>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Select a Student</Text>
                                    <Text style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: 20 }}>
                                        You are applying on behalf of a student. Please select the student from your list to auto-fill their details.
                                    </Text>
                                    {selectedStudent ? (
                                        <View style={{ width: '100%', padding: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F9FF', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#2196F3' }}>
                                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{selectedStudent.name}</Text>
                                            <Text style={{ color: colors.textSecondary }}>{selectedStudent.studentId} • {selectedStudent.institution}</Text>
                                            <TouchableOpacity onPress={() => setShowStudentPicker(true)} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ color: '#2196F3', fontWeight: '600' }}>Change Student</Text>
                                                <Ionicons name="chevron-forward" size={16} color="#2196F3" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <Button title="Choose Student" onPress={() => setShowStudentPicker(true)} variant="primary" style={{ width: 200 }} />
                                    )}
                                </View>
                            </Section>
                        )}

                        {currentStepKey === "personal" && (
                            <Section>
                                <Controller control={control} name="fullName" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Full Name" placeholder="Enter full name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.fullName?.message} />
                                )} />
                                <Controller control={control} name="email" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Email" placeholder="Enter email" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" error={errors.email?.message} />
                                )} />
                                <Controller control={control} name="phone" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Phone Number" placeholder="Enter phone" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" error={errors.phone?.message} />
                                )} />
                                <Controller control={control} name="studentId" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Student ID" placeholder="Enter student ID" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.studentId?.message} />
                                )} />
                            </Section>
                        )}

                        {/* Reuse similar structure for other steps as original form, omitted for brevity but need to include key fields */}
                        {currentStepKey === "academic" && (
                            <Section>
                                <Controller control={control} name="institution" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Institution Name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.institution?.message} />
                                )} />
                                <Controller control={control} name="major" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Major" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.major?.message} />
                                )} />
                                <Controller control={control} name="gradDate" render={({ field: { value } }) => (
                                    <TouchableOpacity onPress={() => openPicker("gradDate", "date")}>
                                        <View pointerEvents="none">
                                            <CustomTextInput label="Graduation Date" value={value} editable={false} error={errors.gradDate?.message} onChangeText={() => { }} />
                                        </View>
                                    </TouchableOpacity>
                                )} />
                                <Controller control={control} name="gpa" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="GPA/Percentage" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" error={errors.gpa?.message} />
                                )} />
                                <Controller control={control} name="currentYear" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Current Year" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" error={errors.currentYear?.message} />
                                )} />
                            </Section>
                        )}

                        {currentStepKey === "family" && (
                            <Section>
                                <Controller control={control} name="financial" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Family / Income Info" value={value} onChangeText={onChange} onBlur={onBlur} />
                                )} />
                                <Controller control={control} name="activities" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Extracurricular Activities" value={value} onChangeText={onChange} onBlur={onBlur} />
                                )} />
                                <Controller control={control} name="statement" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Personal Statement" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.statement?.message} inputStyle={{ minHeight: 100, textAlignVertical: "top" }} />
                                )} />
                            </Section>
                        )}

                        {currentStepKey === "assessment" && (
                            <Section>
                                <Controller control={control} name="assessmentQ1" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Vehicle Ownership" value={value || ""} onChangeText={onChange} onBlur={onBlur} />
                                )} />
                                <Controller control={control} name="assessmentQ2" render={({ field: { onChange, value, onBlur } }) => (
                                    <CustomTextInput label="Housing Type" value={value || ""} onChangeText={onChange} onBlur={onBlur} />
                                )} />
                            </Section>
                        )}

                        {currentStepKey === "documents" && (
                            <Section>
                                <View style={{ gap: 16 }}>
                                    {scholarship && scholarship.documents ? (
                                        <View>
                                            <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 12, color: colors.text }}>Required Documents</Text>
                                            {scholarship.documents.map((reqDoc: any, index: number) => {
                                                const uploadedDoc = documents.find(d => d.documentId === (reqDoc.id || reqDoc.shortname));
                                                return (
                                                    <View key={reqDoc.id || index} style={[styles.docReqItem, { borderColor: isDark ? colors.border : '#e5e5e5' }]}>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[styles.reqDocLabel, { color: colors.text }]}>{reqDoc.label || reqDoc.name} {reqDoc.required !== false && <Text style={{ color: 'red' }}>*</Text>}</Text>
                                                            {uploadedDoc ? (
                                                                <Text style={styles.uploadedText}>{uploadedDoc.name}</Text>
                                                            ) : (
                                                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Not uploaded</Text>
                                                            )}
                                                        </View>
                                                        <TouchableOpacity onPress={() => onPickSpecificDocument(reqDoc)} style={[styles.uploadSmallBtn, { backgroundColor: colors.primary }]}>
                                                            <Ionicons name="cloud-upload-outline" size={16} color='#fff' />
                                                        </TouchableOpacity>
                                                    </View>
                                                )
                                            })}
                                        </View>
                                    ) : (
                                        <Button variant="secondary" onPress={onPickGlobalDocuments}>
                                            <Text style={{ fontWeight: "700", color: isDark ? colors.text : "#333" }}>Pick Documents</Text>
                                        </Button>
                                    )}

                                    {documents.map((doc, idx) => (
                                        <View key={idx} style={[styles.docItem, { backgroundColor: isDark ? colors.surface : "#fff" }]}>
                                            <Text numberOfLines={1} style={[styles.docName, { color: colors.text }]}>{doc.name}</Text>
                                            <TouchableOpacity onPress={() => removeDocument(idx)}>
                                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </Section>
                        )}

                        {currentStepKey === "summary" && (
                            <Section>
                                <Text style={[styles.summaryTitle, { color: colors.text }]}>Review</Text>
                                <View style={{ marginTop: 10 }}>
                                    <Text style={{ color: colors.textSecondary }}>Student: {getValues("fullName")}</Text>
                                    <Text style={{ color: colors.textSecondary }}>Documents: {documents.length} attached</Text>
                                </View>
                            </Section>
                        )}

                        {currentStepKey === "declare" && (
                            <Section>
                                <Controller control={control} name="agreed" render={({ field: { value, onChange } }) => (
                                    <TouchableOpacity onPress={() => onChange(!value)} style={styles.declareRow}>
                                        <Ionicons name={value ? "checkbox" : "square-outline"} size={22} color={value ? colors.primary : colors.textSecondary} />
                                        <Text style={[styles.declareText, { color: colors.text }]}>I confirm that I am applying on behalf of the selected student and all information is accurate.</Text>
                                    </TouchableOpacity>
                                )} />
                                {errors.agreed?.message && <Text style={styles.errorTextInline}>{errors.agreed.message}</Text>}
                            </Section>
                        )}
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={[styles.footerInner, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                        <Button title="Back" onPress={back} variant="secondary" style={styles.footerBtn} />
                        {stepIndex < STEPS.length - 1 ? (
                            <Button title="Next" onPress={next} variant="primary" style={[styles.footerBtn, styles.footerPrimary]} />
                        ) : (
                            <Button title={isSubmitting ? "Submitting..." : "Submit Application"} onPress={onSubmit} variant="primary" style={[styles.footerBtn, styles.footerPrimary]} disabled={isSubmitting} />
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Student Selection Modal */}
            <Modal visible={showStudentPicker} animationType="slide" transparent>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Select Student</Text>
                            {selectedStudent && (
                                <TouchableOpacity onPress={() => setShowStudentPicker(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <FlatList
                            data={MOCK_STUDENTS}
                            keyExtractor={(item) => String(item.id)}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => selectStudent(item)} style={[styles.studentItem, { borderBottomColor: isDark ? '#333' : '#eee' }]}>
                                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                        <Text style={{ color: '#fff', fontWeight: '700' }}>{item.name.charAt(0)}</Text>
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{item.name}</Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{item.studentId} • {item.major}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {pickerState.show && (
                <DateTimePicker
                    value={new Date()}
                    mode={pickerState.mode}
                    display="default"
                    onChange={handleDateChange}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: "absolute", top: 0, left: 0, bottom: 0, right: 0 },
    scrollView: { flex: 1 },
    stepperContainer: { paddingVertical: 10 },
    stepperInner: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    formContainer: { paddingHorizontal: 20, paddingBottom: 20 },
    formCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    footerInner: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
    footerBtn: { flex: 1 },
    footerPrimary: { flex: 2 },
    docReqItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 10, marginBottom: 8 },
    reqDocLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    uploadedText: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },
    uploadSmallBtn: { padding: 8, borderRadius: 8 },
    docItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8 },
    docName: { flex: 1, fontSize: 14, marginHorizontal: 8 },
    docRemove: { padding: 4 },
    summaryTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    declareRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    declareText: { flex: 1, fontSize: 14, lineHeight: 22 },
    errorTextInline: { color: '#EF4444', fontSize: 12, marginTop: 4 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { height: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    studentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 }
});
