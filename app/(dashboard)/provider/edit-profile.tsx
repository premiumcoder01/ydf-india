import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getUserProfile, updateUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Image,
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

interface ValidationErrors {
    [key: string]: string;
}

const RELIGION_OPTIONS = [
    "Hinduism",
    "Muslim",
    "Christianity",
    "Sikhism",
    "Buddhism",
    "Jainism",
    "Zoroastrianism",
    "Prefer not to say"
];

const CASTE_OPTIONS = [
    "Scheduled Tribe (ST)",
    "Scheduled Caste (SC)",
    "OBC",
    "General",
    "Minority",
    "Prefer not to say"
];

const GENDER_OPTIONS = ["Male", "Female", "Other"];

const ANNUAL_INCOME_OPTIONS = [
    "Below ₹50,000",
    "₹50,000 - ₹1,00,000",
    "₹1,00,000 - ₹2,50,000",
    "₹2,50,000 - ₹5,00,000",
    "Above ₹5,00,000"
];

const SCHEME_OPTIONS = [
    "PRIF Nashik Scholarship",
    "PRIF Behror Scholarship",
    "PRIF Derabassi Scholarship",
    "Godrej Girls Scholarship",
    "Shree Bipin Bhai Gandhi Girls Scholarship",
    "Sanskrit Scholarship Program",
    "Siddhi Girls Scholarship",
    "Veena Upendra Scholarship",
    "Prerana Prakash Jyoti Scholarship",
    "Pehchaan Scholarship Program",
    "IFFCO TOKIO Scholarship",
    "other"
];

const REGISTERING_AS_OPTIONS = ["New Applicant", "Renew Applicant"];

const YEAR_OF_COURSE_OPTIONS = ["23-24", "24-25", "25-26"];

const BOARD_12TH_OPTIONS = [
    "BSEB(BR)",
    "MSB(MH)",
    "RBSE(RJ)",
    "PSEB",
    "CBSE",
    "ICSE",
    "Other",
    "Not applicable"
];

const STREAM_12TH_OPTIONS = [
    "Science with Maths",
    "Science with Biology",
    "Biology with Maths",
    "Commerce",
    "Arts",
    "Not applicable"
];

const PASSING_YEAR_12TH_OPTIONS = ["2024", "2025", "Not Applicable"];

export default function ProviderEditProfileScreen() {
    const { isDark, colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [personalInfo, setPersonalInfo] = useState({
        // General / Personal
        username: "",
        fullName: "",
        firstName: "",
        lastName: "",
        email: "",
        dob: "",
        gender: "",
        religion: "",
        caste: "",
        city: "",
        profileImageUrl: "",
        // Family
        fatherName: "",
        motherName: "",
        annualIncome: "",
        // New Fields
        session: "",
        yearOfCourse: "",
        passing10th: "",
        board12th: "",
        stream12th: "",
        applicationYear: "",
        registeringAs: "",
        schemeName: "",
        passingYear12th: "",
        address: "",
    });

    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Toast State
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error" | "info">("error");

    const [showReligionPicker, setShowReligionPicker] = useState(false);
    const [showCastePicker, setShowCastePicker] = useState(false);

    const [showGenderPicker, setShowGenderPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showIncomePicker, setShowIncomePicker] = useState(false);
    const [showSchemePicker, setShowSchemePicker] = useState(false);
    const [showRegisteringAsPicker, setShowRegisteringAsPicker] = useState(false);
    const [showYearOfCoursePicker, setShowYearOfCoursePicker] = useState(false);
    const [showBoard12thPicker, setShowBoard12thPicker] = useState(false);
    const [showStream12thPicker, setShowStream12thPicker] = useState(false);
    const [showPassingYear12thPicker, setShowPassingYear12thPicker] = useState(false);



    // Validation Functions
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };



    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const authDataStr = await AsyncStorage.getItem("authData");
                if (authDataStr) {
                    const authData = JSON.parse(authDataStr);
                    if (authData.token) {
                        const response = await getUserProfile(authData.token);
                        if (response.success && response.data && response.data.user) {
                            const user = response.data.user;
                            setPersonalInfo((prev) => ({
                                ...prev,
                                username: user.username || prev.username,
                                fullName: user.fullname || `${user.firstname} ${user.lastname}` || prev.fullName,
                                firstName: user.firstname || prev.firstName,
                                lastName: user.lastname || prev.lastName,
                                email: user.email || prev.email,

                                address: user.address || prev.address,
                                city: user.city || prev.city,
                                dob: user.dob
                                    ? (user.dob.includes('-') && user.dob.split('-')[0].length === 4
                                        ? user.dob.split('-').reverse().join('/')
                                        : user.dob)
                                    : (user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'dob')?.value
                                        ? new Date(parseInt(user.customfields.find((f: any) => f.shortname.toLowerCase() === 'dob').value) * 1000).toLocaleDateString('en-GB')
                                        : prev.dob),
                                gender: user.gender || user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'gender')?.value || prev.gender,
                                religion: user.religion || user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'religion')?.value || prev.religion,
                                caste: user.caste || user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'caste')?.value || prev.caste,

                                fatherName: user.fathername || user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'fathername')?.value || prev.fatherName,
                                motherName: user.mothername || user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'mothername')?.value || prev.motherName,
                                annualIncome: user.annualincome || user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'family_income' || f.shortname.toLowerCase() === 'annualincome')?.value || prev.annualIncome,

                                // New Fields Mapping
                                session: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'session')?.value || prev.session,
                                yearOfCourse: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'year_of_course')?.value || prev.yearOfCourse,
                                passing10th: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'passing_10th')?.value || prev.passing10th,
                                board12th: user.customfields?.find((f: any) => f.shortname.toLowerCase() === '12th_board')?.value || prev.board12th,
                                stream12th: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'stream_in_12th')?.value || prev.stream12th,
                                applicationYear: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'applicationyear')?.value || prev.applicationYear,
                                registeringAs: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'registering_as')?.value || prev.registeringAs,
                                schemeName: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'schemename')?.value || prev.schemeName,
                                passingYear12th: user.customfields?.find((f: any) => f.shortname.toLowerCase() === '12th_passing_year')?.value || prev.passingYear12th,

                                profileImageUrl: user?.profileimageurl || prev?.profileImageUrl,
                            }));
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
            }
        };

        fetchUserProfile();
    }, []);

    // Handlers
    const handlePersonalInfoChange = useCallback(
        (field: keyof typeof personalInfo, value: string) => {
            setPersonalInfo((prev) => ({ ...prev, [field]: value }));
            setHasUnsavedChanges(true);

            if (validationErrors[field]) {
                setValidationErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[field];
                    return newErrors;
                });
            }
        },
        [validationErrors]
    );

    const validatePersonalInfo = (): boolean => {
        const errors: ValidationErrors = {};

        if (!personalInfo.fullName.trim()) {
            errors.fullName = "Full name is required";
        }
        if (!validateEmail(personalInfo.email)) {
            errors.email = "Please enter a valid email address";
        }

        if (!personalInfo.annualIncome.trim()) errors.annualIncome = "Annual income is required";

        if (!personalInfo.gender) {
            errors.gender = "Gender is required";
        }
        if (!personalInfo.dob) {
            errors.dob = "Date of birth is required";
        }
        if (!personalInfo.religion) {
            errors.religion = "Religion is required";
        }
        if (!personalInfo.caste) {
            errors.caste = "Caste is required";
        }



        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleImagePick = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            setToastMessage("Permission to access gallery is required");
            setToastType("error");
            setShowToast(true);
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setPersonalInfo(prev => ({ ...prev, profileImageUrl: result.assets[0].uri }));
            setHasUnsavedChanges(true);
        }
    };



    const handleSavePersonal = async () => {
        if (!validatePersonalInfo()) {
            setToastMessage("Please fix the errors before saving");
            setToastType("error");
            setShowToast(true);
            return;
        }
        setIsSaving(true);
        try {
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) throw new Error("Authentication session expired");

            const authData = JSON.parse(authDataStr);
            if (!authData.token) throw new Error("Invalid session token");

            const payload = { ...personalInfo, phone: "" };
            const response = await updateUserProfile(authData.token, payload);

            if (response.success) {
                setHasUnsavedChanges(false);
                setToastMessage("Personal information updated successfully");
                setToastType("success");
                setShowToast(true);

                // Navigate back to dashboard after a delay
                setTimeout(() => {
                    router.back();
                }, 1500);
            } else {
                setToastMessage(response.error || "Failed to update profile");
                setToastType("error");
                setShowToast(true);
            }
        } catch (error: any) {
            setToastMessage(error.message || "Something went wrong");
            setToastType("error");
            setShowToast(true);
        } finally {
            setIsSaving(false);
        }
    };

    // Handler for iOS Modal Picker
    const onConfirmDate = (date: Date) => {
        const formattedDate = date.toLocaleDateString('en-GB'); // DD/MM/YYYY
        handlePersonalInfoChange("dob", formattedDate);
        setShowDatePicker(false);
    };

    const onCancelDate = () => {
        setShowDatePicker(false);
    };

    // Handler for Android Picker
    const onAndroidDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const formattedDate = selectedDate.toLocaleDateString('en-GB'); // DD/MM/YYYY
            handlePersonalInfoChange("dob", formattedDate);
        }
    };

    const SelectionModal = ({ visible, onClose, title, options, selected, onSelect }: any) => (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    onPress={onClose}
                    activeOpacity={1}
                />
                <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, backgroundColor: colors.surface }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
                        {options.map((opt: string) => (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.optionRow, selected === opt && styles.optionSelected, { borderBottomColor: colors.border }]}
                                onPress={() => {
                                    onSelect(opt);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[styles.optionText, { color: colors.text }, selected === opt && styles.optionTextSelected]}
                                >
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
        </Modal>
    );


    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
                style={styles.background}
                locations={[0, 0.3, 1]}
            />

            <AppHeader title="Edit Profile" onBack={() => router.back()} />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Profile Picture Section */}
                    <View style={styles.profileSection}>
                        <TouchableOpacity
                            style={styles.imageContainer}
                            onPress={handleImagePick}
                            activeOpacity={0.8}
                        >
                            {personalInfo?.profileImageUrl !== "" ? (
                                <Image
                                    source={{ uri: personalInfo?.profileImageUrl }}
                                    style={[styles.profileImage, { borderColor: isDark ? colors.card : "#fff" }]}
                                />
                            ) : (
                                <View style={[styles.placeholderContainer, { backgroundColor: isDark ? colors.surface : "#F0F0F0", borderColor: isDark ? colors.card : "#fff" }]}>
                                    <Ionicons name="person" size={50} color={isDark ? "#666" : "#999"} />
                                </View>
                            )}
                            <View style={[styles.editBadge, { borderColor: isDark ? colors.card : "#fff" }]}>
                                <Ionicons name="camera" size={16} color="#fff" />
                            </View>
                        </TouchableOpacity>

                    </View>

                    {/* Section 1: Personal Details */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Details</Text>
                            {hasUnsavedChanges && (
                                <View style={styles.unsavedBadge}>
                                    <Text style={styles.unsavedText}>Unsaved</Text>
                                </View>
                            )}
                        </View>
                        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <CustomTextInput
                                label="Username"
                                value={personalInfo.username}
                                onChangeText={(val) => handlePersonalInfoChange("username", val)}
                                style={styles.input}
                            />
                            <CustomTextInput
                                label="Full Name *"
                                value={personalInfo.fullName}
                                onChangeText={(val) => handlePersonalInfoChange("fullName", val)}
                                style={styles.input}
                                error={validationErrors.fullName}
                            />

                            <CustomTextInput
                                label="First Name"
                                value={personalInfo.firstName}
                                onChangeText={(val) => handlePersonalInfoChange("firstName", val)}
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                            />
                            <CustomTextInput
                                label="Last Name"
                                value={personalInfo.lastName}
                                onChangeText={(val) => handlePersonalInfoChange("lastName", val)}
                                style={[styles.input, { flex: 1 }]}
                            />

                            <CustomTextInput
                                label="Email Address *"
                                value={personalInfo.email}
                                onChangeText={(val) => handlePersonalInfoChange("email", val)}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                style={styles.input}
                                error={validationErrors.email}
                            />

                        </View>
                    </View>

                    {/* Section: Family Details */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Family Details</Text>
                        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Annual Income *</Text>
                                <TouchableOpacity
                                    style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }, validationErrors.annualIncome && styles.selectorError]}
                                    onPress={() => setShowIncomePicker(true)}
                                >
                                    <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.annualIncome && styles.placeholderText]}>
                                        {personalInfo.annualIncome || "Select Income Range"}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                                {validationErrors.annualIncome && (
                                    <Text style={styles.errorText}>{validationErrors.annualIncome}</Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Section: Educational & Application Details */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Education & Application</Text>
                        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Scheme Name</Text>
                                <TouchableOpacity
                                    style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }]}
                                    onPress={() => setShowSchemePicker(true)}
                                >
                                    <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.schemeName && styles.placeholderText]}>
                                        {personalInfo.schemeName || "Select Scheme"}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Registering As</Text>
                                <TouchableOpacity
                                    style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }]}
                                    onPress={() => setShowRegisteringAsPicker(true)}
                                >
                                    <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.registeringAs && styles.placeholderText]}>
                                        {personalInfo.registeringAs || "Select Type"}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <CustomTextInput
                                        label="Session"
                                        value={personalInfo.session}
                                        onChangeText={(val) => handlePersonalInfoChange("session", val)}
                                        style={styles.input}
                                        placeholder="e.g. 24-25"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <CustomTextInput
                                        label="Application Year"
                                        value={personalInfo.applicationYear}
                                        onChangeText={(val) => handlePersonalInfoChange("applicationYear", val)}
                                        style={styles.input}
                                        placeholder="e.g. 25-26"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Year of Course</Text>
                                <TouchableOpacity
                                    style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }]}
                                    onPress={() => setShowYearOfCoursePicker(true)}
                                >
                                    <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.yearOfCourse && styles.placeholderText]}>
                                        {personalInfo.yearOfCourse || "Select Year"}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>12th Board</Text>
                                <TouchableOpacity
                                    style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }]}
                                    onPress={() => setShowBoard12thPicker(true)}
                                >
                                    <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.board12th && styles.placeholderText]}>
                                        {personalInfo.board12th || "Select Board"}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Stream in 12th</Text>
                                <TouchableOpacity
                                    style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }]}
                                    onPress={() => setShowStream12thPicker(true)}
                                >
                                    <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.stream12th && styles.placeholderText]}>
                                        {personalInfo.stream12th || "Select Stream"}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <CustomTextInput
                                        label="10th Passing Year"
                                        value={personalInfo.passing10th}
                                        onChangeText={(val) => handlePersonalInfoChange("passing10th", val)}
                                        style={styles.input}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>12th Passing Year</Text>
                                        <TouchableOpacity
                                            style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }]}
                                            onPress={() => setShowPassingYear12thPicker(true)}
                                        >
                                            <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.passingYear12th && styles.placeholderText]}>
                                                {personalInfo.passingYear12th || "Select Year"}
                                            </Text>
                                            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>


                        </View>
                    </View>

                    {/* Section 2: Basic Details */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Basic Details</Text>
                        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Gender *</Text>
                                <TouchableOpacity
                                    style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }, validationErrors.gender && styles.selectorError]}
                                    onPress={() => setShowGenderPicker(true)}
                                >
                                    <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.gender && styles.placeholderText]}>
                                        {personalInfo.gender || "Choose..."}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                                {validationErrors.gender && (
                                    <Text style={styles.errorText}>{validationErrors.gender}</Text>
                                )}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Date of Birth *</Text>
                                <TouchableOpacity
                                    style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }, validationErrors.dob && styles.selectorError]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.dob && styles.placeholderText]}>
                                        {personalInfo.dob || "DD/MM/YYYY"}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                                {validationErrors.dob && (
                                    <Text style={styles.errorText}>{validationErrors.dob}</Text>
                                )}
                            </View>



                            {Platform.OS === 'ios' ? (
                                <DateTimePickerModal
                                    isVisible={showDatePicker}
                                    mode="date"
                                    display="spinner"
                                    locale="en-GB"
                                    onConfirm={onConfirmDate}
                                    onCancel={onCancelDate}
                                    date={personalInfo.dob ? new Date(personalInfo.dob.split('/').reverse().join('-')) : new Date()}
                                    maximumDate={new Date()}
                                    fullscreen={true}

                                />
                            ) : (
                                showDatePicker && (
                                    <DateTimePicker
                                        value={personalInfo.dob ? new Date(personalInfo.dob.split('/').reverse().join('-')) : new Date()}
                                        mode="date"
                                        display="default"
                                        themeVariant={isDark ? "dark" : "light"}
                                        onChange={onAndroidDateChange}
                                        maximumDate={new Date()}
                                    />
                                )
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Religion *</Text>
                                <TouchableOpacity
                                    style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }, validationErrors.religion && styles.selectorError]}
                                    onPress={() => setShowReligionPicker(true)}
                                >
                                    <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.religion && styles.placeholderText]}>
                                        {personalInfo.religion || "Choose..."}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                                {validationErrors.religion && (
                                    <Text style={styles.errorText}>{validationErrors.religion}</Text>
                                )}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Caste *</Text>
                                <TouchableOpacity
                                    style={[styles.selector, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9", borderColor: colors.border }, validationErrors.caste && styles.selectorError]}
                                    onPress={() => setShowCastePicker(true)}
                                >
                                    <Text style={[styles.selectorText, { color: colors.text }, !personalInfo.caste && styles.placeholderText]}>
                                        {personalInfo.caste || "Choose..."}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                                {validationErrors.caste && (
                                    <Text style={styles.errorText}>{validationErrors.caste}</Text>
                                )}
                            </View>



                            <CustomTextInput
                                label="Address"
                                value={personalInfo.address}
                                onChangeText={(val) => handlePersonalInfoChange("address", val)}
                                style={styles.input}
                            />

                            <CustomTextInput
                                label="City"
                                value={personalInfo.city}
                                onChangeText={(val) => handlePersonalInfoChange("city", val)}
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                            />
                        </View>
                    </View>





                    {/* Save Button */}
                    <View style={[styles.section, { marginTop: 0 }]}>
                        <Button
                            title={isSaving ? "Saving..." : "Save All Changes"}
                            onPress={handleSavePersonal}
                            variant="primary"
                            style={styles.saveButton}
                            disabled={isSaving || !hasUnsavedChanges}
                        />
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            <Toast
                message={toastMessage}
                type={toastType}
                visible={showToast}
                onHide={() => setShowToast(false)}
                duration={3000}
            />

            <SelectionModal
                visible={showReligionPicker}
                onClose={() => setShowReligionPicker(false)}
                title="Select Religion"
                options={RELIGION_OPTIONS}
                selected={personalInfo.religion}
                onSelect={(val: string) => {
                    handlePersonalInfoChange("religion", val);
                    setShowReligionPicker(false);
                }}
            />

            <SelectionModal
                visible={showIncomePicker}
                onClose={() => setShowIncomePicker(false)}
                title="Select Annual Income"
                options={ANNUAL_INCOME_OPTIONS}
                selected={personalInfo.annualIncome}
                onSelect={(val: string) => {
                    handlePersonalInfoChange("annualIncome", val);
                    setShowIncomePicker(false);
                }}
            />

            <SelectionModal
                visible={showSchemePicker}
                onClose={() => setShowSchemePicker(false)}
                title="Select Scheme"
                options={SCHEME_OPTIONS}
                selected={personalInfo.schemeName}
                onSelect={(val: string) => {
                    handlePersonalInfoChange("schemeName", val);
                    setShowSchemePicker(false);
                }}
            />

            <SelectionModal
                visible={showRegisteringAsPicker}
                onClose={() => setShowRegisteringAsPicker(false)}
                title="Registering As"
                options={REGISTERING_AS_OPTIONS}
                selected={personalInfo.registeringAs}
                onSelect={(val: string) => {
                    handlePersonalInfoChange("registeringAs", val);
                    setShowRegisteringAsPicker(false);
                }}
            />
            <SelectionModal
                visible={showCastePicker}
                onClose={() => setShowCastePicker(false)}
                title="Select Caste"
                options={CASTE_OPTIONS}
                selected={personalInfo.caste}
                onSelect={(val: string) => {
                    handlePersonalInfoChange("caste", val);
                    setShowCastePicker(false);
                }}
            />

            <SelectionModal
                visible={showGenderPicker}
                onClose={() => setShowGenderPicker(false)}
                title="Select Gender"
                options={GENDER_OPTIONS}
                selected={personalInfo.gender}
                onSelect={(val: string) => {
                    handlePersonalInfoChange("gender", val);
                    setShowGenderPicker(false);
                }}
            />

            <SelectionModal
                visible={showYearOfCoursePicker}
                onClose={() => setShowYearOfCoursePicker(false)}
                title="Select Year of Course"
                options={YEAR_OF_COURSE_OPTIONS}
                selected={personalInfo.yearOfCourse}
                onSelect={(val: string) => {
                    handlePersonalInfoChange("yearOfCourse", val);
                    setShowYearOfCoursePicker(false);
                }}
            />

            <SelectionModal
                visible={showBoard12thPicker}
                onClose={() => setShowBoard12thPicker(false)}
                title="Select 12th Board"
                options={BOARD_12TH_OPTIONS}
                selected={personalInfo.board12th}
                onSelect={(val: string) => {
                    handlePersonalInfoChange("board12th", val);
                    setShowBoard12thPicker(false);
                }}
            />

            <SelectionModal
                visible={showStream12thPicker}
                onClose={() => setShowStream12thPicker(false)}
                title="Select Stream in 12th"
                options={STREAM_12TH_OPTIONS}
                selected={personalInfo.stream12th}
                onSelect={(val: string) => {
                    handlePersonalInfoChange("stream12th", val);
                    setShowStream12thPicker(false);
                }}
            />

            <SelectionModal
                visible={showPassingYear12thPicker}
                onClose={() => setShowPassingYear12thPicker(false)}
                title="Select 12th Passing Year"
                options={PASSING_YEAR_12TH_OPTIONS}
                selected={personalInfo.passingYear12th}
                onSelect={(val: string) => {
                    handlePersonalInfoChange("passingYear12th", val);
                    setShowPassingYear12thPicker(false);
                }}
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
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
        marginTop: 8,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        letterSpacing: -0.5,
        color: "#333",
    },
    unsavedBadge: {
        backgroundColor: "#FFE0B2",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    unsavedText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#E65100",
    },
    formCard: {
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: "rgba(51, 51, 51, 0.08)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
    },
    input: {
        marginBottom: 16,
    },
    row: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    saveButton: {
        marginTop: 8,
        height: 56,
        borderRadius: 16,
    },
    profileSection: {
        alignItems: "center",
        paddingVertical: 32,
    },
    imageContainer: {
        position: "relative",
        marginBottom: 16,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: "#fff",
    },
    placeholderContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#F0F0F0",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: "#fff",
    },
    editBadge: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#4CAF50",
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#fff",
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        marginBottom: 8,
        marginLeft: 4,
    },
    selector: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderWidth: 1.5,
        borderColor: "rgba(51, 51, 51, 0.15)",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        height: 56,
    },
    selectorError: {
        borderColor: "#EF4444",
    },
    selectorText: {
        fontSize: 16,
        color: "#333",
        fontWeight: "500",
    },
    placeholderText: {
        color: "#999",
    },
    errorText: {
        color: "#EF4444",
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
        fontWeight: "500",
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
    },
    modalBackdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        maxHeight: "60%",
        paddingTop: 8,
        borderWidth: 1,
        borderColor: "#f0f0f0",
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1a1a1a",
    },
    optionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f9f9f9",
    },
    optionSelected: {
        backgroundColor: "rgba(0, 86, 210, 0.05)",
    },
    optionText: {
        fontSize: 15,
        color: "#222",
    },
    optionTextSelected: {
        color: "#0056D2",
        fontWeight: "600",
    },
});
