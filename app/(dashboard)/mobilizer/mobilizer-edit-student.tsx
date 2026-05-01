import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";

import { DropdownData, getDropdownDefinitions, getMobilizerStudentProfile, updateMobilizerStudent, uploadProfileImage } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

const formSchema = z.object({
    username: z.string().min(4, "Username must be at least 4 characters"),
    firstname: z.string().min(1, "First name is required").regex(/^[A-Za-z\s.-]+$/, "First name can only contain letters"),
    lastname: z.string().min(1, "Last name is required").regex(/^[A-Za-z\s.-]+$/, "Last name can only contain letters"),
    email: z.string().email("Invalid email address"),
    phone1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().length(2, "Country code must be 2 letters (e.g. IN)").optional(),
    address: z.string().optional(),
    institution: z.string().optional(),
    gender: z.string().optional(),
    religion: z.string().optional(),
    caste: z.string().optional(),
    date_of_birth: z.string().optional(),
    academic_level: z.string().optional(),
    stream: z.string().optional(),
    year: z.string().optional(),
    university: z.string().optional(),
    marks_10_type: z.string().optional(),
    marks_10_value: z.string().optional(),
    marks_12_type: z.string().optional(),
    marks_12_value: z.string().optional(),
    graduation_type: z.string().optional(),
    graduation_value: z.string().optional(),
    father_name: z.string().optional().refine(val => !val || /^[A-Za-z\s.-]+$/.test(val), { message: "Father's name can only contain letters" }),
    mother_name: z.string().optional().refine(val => !val || /^[A-Za-z\s.-]+$/.test(val), { message: "Mother's name can only contain letters" }),
    domicile_state: z.string().optional(),
    family_annual_income: z.string().optional(),
}).superRefine((data, ctx) => {
    const validCGPA = (s: string) => { const n = parseFloat(s); return !isNaN(n) && n >= 0 && n <= 10; };
    const validPct = (s: string) => { const n = parseFloat(s); return !isNaN(n) && n >= 0 && n <= 100; };
    // Only validate when user has filled the field (non-blank). Blank = skip, no error.
    const v10 = (data.marks_10_value || "").trim();
    if (v10) {
        if (data.marks_10_type === "cgpa" && !validCGPA(data.marks_10_value!)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CGPA must be between 0 and 10", path: ["marks_10_value"] });
        else if (data.marks_10_type === "percentage" && !validPct(data.marks_10_value!)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Percentage must be between 0 and 100", path: ["marks_10_value"] });
    }
    const v12 = (data.marks_12_value || "").trim();
    if (v12) {
        if (data.marks_12_type === "cgpa" && !validCGPA(data.marks_12_value!)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CGPA must be between 0 and 10", path: ["marks_12_value"] });
        else if (data.marks_12_type === "percentage" && !validPct(data.marks_12_value!)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Percentage must be between 0 and 100", path: ["marks_12_value"] });
    }
    const vGrad = (data.graduation_value || "").trim();
    if (vGrad) {
        if (data.graduation_type === "cgpa" && !validCGPA(data.graduation_value!)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CGPA must be between 0 and 10", path: ["graduation_value"] });
        else if (data.graduation_type === "percentage" && !validPct(data.graduation_value!)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Percentage must be between 0 and 100", path: ["graduation_value"] });
    }
});

type FormValues = z.infer<typeof formSchema>;

const MARKS_TYPE_OPTIONS = [{ label: "CGPA", value: "cgpa" }, { label: "Percentage", value: "percentage" }];




export default function MobilizerEditStudentScreen() {
    const { isDark, colors } = useTheme();
    const { studentId: paramStudentId } = useLocalSearchParams();
    const studentId = Number(paramStudentId);
    const [dropdownData, setDropdownData] = useState<DropdownData | null>(null);

    const getOptionsByShortname = useCallback((shortname: string) => {
        if (!dropdownData) return [];
        const courseField = dropdownData.course_fields?.find((f: any) => f.shortname.toLowerCase() === shortname.toLowerCase());
        if (courseField) return courseField.options;

        const userField = dropdownData.user_fields?.find((f: any) => f.shortname.toLowerCase() === shortname.toLowerCase());
        if (userField) return userField.options;

        return [];
    }, [dropdownData]);

    const insets = useSafeAreaInsets();

    const GENDER_OPTIONS = getOptionsByShortname('gender').map((o: any) => o.label);
    const RELIGION_OPTIONS = getOptionsByShortname('religion').map((o: any) => o.label);
    const CASTE_OPTIONS = getOptionsByShortname('caste').map((o: any) => o.label);
    const ANNUAL_INCOME_OPTIONS = getOptionsByShortname('family_income').map((o: any) => o.label);
    const STATE_OPTIONS = getOptionsByShortname('state').map((o: any) => o.label);
    const DISTRICT_OPTIONS = getOptionsByShortname('district').map((o: any) => o.label);
    const ACADEMIC_LEVEL_OPTIONS = getOptionsByShortname('academic_qualifications').map((o: any) => o.label);
    const STREAM_OPTIONS = getOptionsByShortname('course_category_1').map((o: any) => o.label);
    const YEAR_OPTIONS = getOptionsByShortname('year_of_course').map((o: any) => o.label);

    const [loading, setLoading] = useState(false);
    const [studentName, setStudentName] = useState("");

    // Image state
    const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
    const [profileImageFile, setProfileImageFile] = useState<{ uri: string; name: string; type: string; mimeType?: string } | null>(null);

    // Picker State
    const [pickerConfig, setPickerConfig] = useState<{ visible: boolean; title: string; options: string[]; field: keyof FormValues | null }>({
        visible: false,
        title: "",
        options: [],
        field: null,
    });

    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "error" | "info" }>({
        visible: false,
        message: "",
        type: "info",
    });

    const {
        control,
        handleSubmit,
        setValue,
        getValues,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            firstname: "",
            lastname: "",
            email: "",
            phone1: "",
            city: "",
            state: "",
            country: "IN",
            address: "",
            institution: "",
            gender: "",
            religion: "",
            caste: "",
            date_of_birth: "",
            academic_level: "",
            stream: "",
            year: "",
            university: "",
            marks_10_type: "cgpa",
            marks_10_value: "",
            marks_12_type: "cgpa",
            marks_12_value: "",
            graduation_type: "cgpa",
            graduation_value: "",
            father_name: "",
            mother_name: "",
            domicile_state: "",
            family_annual_income: "",
        },
    });

    const fetchDropdowns = useCallback(async () => {
        try {
            const authDataStr = await AsyncStorage.getItem("authData");
            if (authDataStr) {
                const authData = JSON.parse(authDataStr);
                if (authData.token) {
                    const response = await getDropdownDefinitions(authData.token);
                    if (response.success && response.data) {
                        setDropdownData(response.data);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch dropdowns:", error);
        }
    }, []);

    const fetchStudentProfile = useCallback(async () => {
        if (!studentId) return;
        try {
            setLoading(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (authDataStr) {
                const authData = JSON.parse(authDataStr);
                if (authData.token) {
                    const response = await getMobilizerStudentProfile(authData.token, studentId);
                    console.log(JSON.stringify(response))
                    if (response.success && response.data) {
                        const d = response.data.student || response.data;
                        setStudentName(d.fullname || `${d.firstname} ${d.lastname}` || d.username || "Edit Profile");
                        let cf: Record<string, string> = {};
                        try {
                            if (typeof d.custom_fields === 'string') cf = JSON.parse(d.custom_fields);
                            else if (typeof d.custom_fields === 'object') cf = d.custom_fields;
                        } catch (e) { }

                        const cleanVal = (val: string | undefined | null) => {
                            if (!val) return "";
                            const lower = String(val).toLowerCase().trim();
                            if (lower === "select" || lower === "choose..." || lower === "select any one") return "";
                            return String(val).trim();
                        };

                        setValue("username", cleanVal(d.username));
                        setValue("firstname", cleanVal(d.firstname));
                        setValue("lastname", cleanVal(d.lastname));
                        setValue("email", cleanVal(d.email));

                        let phoneStr = cleanVal(d.phone1 || d.phone2 || cf.phone_number || cf.mobile);
                        if (phoneStr.startsWith("91") && phoneStr.length >= 12) phoneStr = phoneStr.substring(2);
                        else if (phoneStr.startsWith("+91")) phoneStr = phoneStr.substring(3);
                        setValue("phone1", phoneStr);

                        setValue("city", cleanVal(d.city || cf.city || cf.district));
                        setValue("state", cleanVal(cf.state || cf.State));
                        setValue("country", cleanVal(d.country) || "IN");
                        setValue("address", cleanVal(d.address || cf.address || cf.Village));
                        setValue("institution", cleanVal(d.institution || cf.college_name));

                        // Capitalize options properly or map exactly. The form options might match directly.
                        setValue("gender", cleanVal(cf.gender || cf.Gender));
                        setValue("religion", cleanVal(cf.religion || cf.Religion));
                        setValue("caste", cleanVal(cf.caste || cf.Caste));

                        let dobStr = cleanVal(cf.date_of_birth || cf.DOB);
                        if (dobStr && !isNaN(Number(dobStr)) && dobStr.length >= 8) {
                            const dObj = new Date(Number(dobStr) * 1000);
                            if (!isNaN(dObj.getTime())) {
                                dobStr = dObj.toISOString().split("T")[0];
                            }
                        }
                        setValue("date_of_birth", dobStr);

                        setValue("academic_level", cleanVal(cf.academic_level || d.academic_level || cf.category));
                        setValue("stream", cleanVal(cf.stream || cf.course_category_1));
                        setValue("year", cleanVal(cf.college_current_year || cf.year_of_course));
                        setValue("university", cleanVal(cf.university));

                        setValue("marks_10_type", cleanVal(cf.marks_10_type) || "cgpa");
                        setValue("marks_10_value", cleanVal(cf.marks_10_value || cf.percentage_10 || cf["10th"]));
                        setValue("marks_12_type", cleanVal(cf.marks_12_type) || "cgpa");
                        setValue("marks_12_value", cleanVal(cf.marks_12_value || cf.percentage_12));
                        setValue("graduation_type", cleanVal(cf.marks_graduation_type) || "cgpa");
                        setValue("graduation_value", cleanVal(cf.marks_graduation_value));

                        setValue("father_name", cleanVal(cf.father_name || cf.father));
                        setValue("mother_name", cleanVal(cf.mother_name || cf.mother));
                        setValue("domicile_state", cleanVal(cf.domicile_state || cf.domicile_district));
                        setValue("family_annual_income", cleanVal(cf.family_annual_income || cf.Family_income));

                        if (d.picture && !d.picture.includes('gravatar.com')) {
                            setProfileImageUri(d.picture);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch student profile:", error);
        } finally {
            setLoading(false);
        }
    }, [studentId, setValue]);

    React.useEffect(() => {
        fetchDropdowns();
        fetchStudentProfile();
    }, [fetchDropdowns, fetchStudentProfile]);

    const openPicker = (field: keyof FormValues, title: string, options: string[]) => {
        setPickerConfig({ visible: true, title, options, field });
    };

    const handleSelect = (value: string) => {
        if (pickerConfig.field) {
            setValue(pickerConfig.field, value, { shouldValidate: true });
        }
        setPickerConfig((prev) => ({ ...prev, visible: false }));
    };

    const openDatePicker = () => {
        setDatePickerVisible(true);
    };

    const getDatePickerValue = (): Date => {
        const val = getValues("date_of_birth");
        if (!val) return new Date(2005, 0, 1);
        const parts = val.split(/[-/]/);
        if (parts.length >= 3) {
            const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10) - 1, d = parseInt(parts[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
        }
        return new Date(2005, 0, 1);
    };

    const onDateConfirm = (date: Date) => {
        setValue("date_of_birth", date.toISOString().split("T")[0], { shouldValidate: true });
        setDatePickerVisible(false);
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission", "Gallery access is required to upload photo.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            setProfileImageUri(asset.uri);
            setProfileImageFile({
                uri: asset.uri,
                name: asset.fileName || `student_${Date.now()}.jpg`,
                type: asset.type || "image/jpeg",
                mimeType: asset.type || "image/jpeg",
            });
        }
    };

    const removeImage = () => {
        setProfileImageUri(null);
        setProfileImageFile(null);
    };

    const onSubmit = async (data: FormValues) => {
        try {
            setLoading(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) return;
            const { token } = JSON.parse(authDataStr);

            let profileImageFileId: number | null = null;
            if (profileImageFile) {
                const uploadRes = await uploadProfileImage(token, profileImageFile);
                if (uploadRes.success && uploadRes.data?.id) {
                    profileImageFileId = uploadRes.data.id;
                }
            }

            const customfields: { shortname: string; value: string }[] = [];
            if (data.gender) customfields.push({ shortname: "gender", value: data.gender });
            if (data.religion) customfields.push({ shortname: "religion", value: data.religion });
            if (data.caste) customfields.push({ shortname: "caste", value: data.caste });
            if (data.date_of_birth) customfields.push({ shortname: "date_of_birth", value: data.date_of_birth });
            if (data.address) customfields.push({ shortname: "address", value: data.address });
            if (data.state) customfields.push({ shortname: "state", value: data.state });
            if (data.academic_level) customfields.push({ shortname: "academic_level", value: data.academic_level });
            if (data.stream) customfields.push({ shortname: "stream", value: data.stream });
            if (data.year) customfields.push({ shortname: "college_current_year", value: data.year });
            if (data.university) customfields.push({ shortname: "university", value: data.university });
            if (data.marks_10_type && data.marks_10_value) {
                customfields.push({ shortname: "marks_10_type", value: data.marks_10_type });
                customfields.push({ shortname: "marks_10_value", value: data.marks_10_value.trim() });
            }
            if (data.marks_12_type && data.marks_12_value) {
                customfields.push({ shortname: "marks_12_type", value: data.marks_12_type });
                customfields.push({ shortname: "marks_12_value", value: data.marks_12_value.trim() });
            }
            if (data.graduation_type && data.graduation_value) {
                customfields.push({ shortname: "marks_graduation_type", value: data.graduation_type });
                customfields.push({ shortname: "marks_graduation_value", value: data.graduation_value.trim() });
            }
            if (data.father_name) customfields.push({ shortname: "father_name", value: data.father_name.trim() });
            if (data.mother_name) customfields.push({ shortname: "mother_name", value: data.mother_name.trim() });
            if (data.domicile_state) customfields.push({ shortname: "domicile_state", value: data.domicile_state.trim() });
            if (data.family_annual_income) customfields.push({ shortname: "family_annual_income", value: data.family_annual_income });

            const payload: any = {
                student_id: studentId,
                firstname: data.firstname,
                lastname: data.lastname,
                email: data.email,
            };
            if (data.username) payload.username = data.username;
            if (data.phone1) {
                const digits = data.phone1.replace(/\D/g, "");
                payload.phone1 = digits.length === 10 ? `91${digits}` : digits ? `91${digits}` : data.phone1;
            }
            if (data.city) payload.city = data.city;
            if (data.country) payload.country = data.country;
            if (data.institution) payload.institution = data.institution;
            if (profileImageFileId != null) payload.profileimage_file_id = profileImageFileId;

            customfields.forEach((field, index) => {
                payload[`customfields[${index}][shortname]`] = field.shortname;
                const val = String(field.value).trim();
                payload[`customfields[${index}][value]`] = ["gender", "religion", "caste"].includes(field.shortname) ? val.toLowerCase() : val;
            });



            const response = await updateMobilizerStudent(token, payload);

            if (response.success) {
                setToast({ visible: true, message: "Student updated successfully!", type: "success" });
                setTimeout(() => router.back(), 1500);
            } else {
                setToast({ visible: true, message: response.message || "Failed to update student", type: "error" });
            }
        } catch (error: any) {
            setToast({ visible: true, message: error.message || "Something went wrong", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f2c44d" }]}>
            <LinearGradient
                colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
                style={styles.background}
            />
            <AppHeader title={`Edit ${studentName} Profile`} onBack={() => router.back()} />
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
            />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Student Photo */}
                    <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.9)", borderColor: colors.border, alignItems: 'center' }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text, textAlign: 'center' }]}>{studentName.split(' ')[0]}'s Photo</Text>
                        <View style={styles.photoContainer}>
                            <TouchableOpacity onPress={pickImage} style={[styles.photoCircle, { backgroundColor: isDark ? colors.border : "#f0f0f0", borderColor: colors.primary, borderWidth: 1 }]}>
                                {profileImageUri ? (
                                    <Image source={{ uri: profileImageUri }} style={styles.photoImage} />
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <Ionicons name="camera" size={36} color={colors.primary} />
                                        <Text style={[styles.photoHint, { color: colors.textSecondary }]}>Upload Photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            {profileImageUri && (
                                <TouchableOpacity onPress={removeImage} style={[styles.removePhotoBtn, { backgroundColor: '#ff4d4d' }]}>
                                    <Ionicons name="trash-outline" size={16} color="#fff" />
                                    <Text style={styles.removePhotoText}>Remove</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.9)", borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Details</Text>
                        <Controller control={control} name="username" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput icon="person-outline" label="Username *" placeholder="Unique username" value={value || ""} onChangeText={onChange} onBlur={onBlur} error={errors.username?.message} />
                        )} />
                        <Controller control={control} name="email" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput icon="mail-outline" label="Email *" placeholder="Student email" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" error={errors.email?.message} />
                        )} />
                    </View>

                    <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.9)", borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
                        <Controller control={control} name="firstname" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput icon="person-outline" label="First Name *" placeholder="Student first name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.firstname?.message} />
                        )} />
                        <Controller control={control} name="lastname" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput icon="person-outline" label="Last Name *" placeholder="Student last name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.lastname?.message} />
                        )} />
                        <Controller
                            control={control}
                            name="phone1"
                            render={({ field: { onChange, value } }) => (
                                <View style={styles.phoneFieldWrap}>
                                    <Text style={[styles.phoneLabel, { color: colors.textSecondary }]}>Phone Number</Text>
                                    <View
                                        style={[
                                            styles.phoneContainer,
                                            {
                                                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9",
                                                borderColor: errors.phone1 ? "#EF4444" : colors.border,
                                            },
                                        ]}
                                    >
                                        <View style={{ flexDirection: "row", alignItems: "center", height: 48 }}>
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    marginRight: 10,
                                                    paddingRight: 10,
                                                    borderRightWidth: 1,
                                                    borderRightColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(51, 51, 51, 0.1)",
                                                }}
                                            >
                                                <Text style={{ fontSize: 20 }}>🇮🇳</Text>
                                                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, marginLeft: 8 }}>+91</Text>
                                            </View>
                                            <TextInput
                                                style={[styles.phoneTextInput, { flex: 1, color: colors.text }]}
                                                value={value || ""}
                                                onChangeText={(text) => {
                                                    const numeric = text.replace(/[^0-9]/g, "");
                                                    if (numeric.length <= 10) onChange(numeric);
                                                }}
                                                placeholder="Mobile Number"
                                                placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : "rgba(51, 51, 51, 0.4)"}
                                                keyboardType="number-pad"
                                                maxLength={10}
                                            />
                                        </View>
                                    </View>
                                    {errors.phone1 && <Text style={styles.phoneErrorText}>{errors.phone1.message}</Text>}
                                </View>
                            )}
                        />
                        <Controller control={control} name="gender" render={({ field: { value } }) => (
                            <TouchableOpacity onPress={() => openPicker("gender", "Select Gender", GENDER_OPTIONS)}>
                                <View pointerEvents="none">
                                    <CustomTextInput icon="male-female-outline" label="Gender" placeholder="Select Gender" value={value || ""} editable={false} onChangeText={() => { }} inputStyle={{ opacity: 1, fontWeight: "400" }} rightIcon="chevron-down" />
                                </View>
                            </TouchableOpacity>
                        )} />
                        <Controller control={control} name="date_of_birth" render={({ field: { value } }) => (
                            <TouchableOpacity onPress={openDatePicker}>
                                <View pointerEvents="none">
                                    <CustomTextInput icon="calendar-outline" label="Date of Birth" placeholder="Select DOB" value={value || ""} editable={false} onChangeText={() => { }} inputStyle={{ opacity: 1, fontWeight: "400" }} />
                                </View>
                            </TouchableOpacity>
                        )} />
                    </View>

                    <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.9)", borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Address & Location</Text>
                        <Controller control={control} name="address" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput label="Address" placeholder="Full address" value={value || ""} onChangeText={onChange} onBlur={onBlur} multiline />
                        )} />
                        <Controller control={control} name="city" render={({ field: { value } }) => (
                            <TouchableOpacity onPress={() => openPicker("city", "Select City/District", DISTRICT_OPTIONS)}>
                                <View pointerEvents="none">
                                    <CustomTextInput icon="business-outline" label="City" placeholder="Select City" value={value || ""} editable={false} onChangeText={() => { }} inputStyle={{ opacity: 1 }} rightIcon="chevron-down" />
                                </View>
                            </TouchableOpacity>
                        )} />
                        <Controller control={control} name="state" render={({ field: { value } }) => (
                            <TouchableOpacity onPress={() => openPicker("state", "Select State", STATE_OPTIONS)}>
                                <View pointerEvents="none">
                                    <CustomTextInput icon="map-outline" label="State" placeholder="Select State" value={value || ""} editable={false} onChangeText={() => { }} inputStyle={{ opacity: 1 }} rightIcon="chevron-down" />
                                </View>
                            </TouchableOpacity>
                        )} />
                        <Controller control={control} name="domicile_state" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput icon="flag-outline" label="Domicile State" placeholder="e.g. Uttar Pradesh, Bihar" value={value || ""} onChangeText={onChange} onBlur={onBlur} />
                        )} />
                    </View>

                    <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.9)", borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Institution</Text>
                        <Controller control={control} name="institution" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput icon="school-outline" label="College Name" placeholder="College name" value={value || ""} onChangeText={onChange} onBlur={onBlur} />
                        )} />
                        <Controller control={control} name="university" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput icon="business-outline" label="University Name" placeholder="University name" value={value || ""} onChangeText={onChange} onBlur={onBlur} />
                        )} />
                        <Controller control={control} name="academic_level" render={({ field: { value } }) => (
                            <TouchableOpacity onPress={() => openPicker("academic_level", "Academic Level", ACADEMIC_LEVEL_OPTIONS)}>
                                <View pointerEvents="none">
                                    <CustomTextInput icon="school-outline" label="Academic Level" placeholder="e.g. UG, PG" value={value || ""} editable={false} onChangeText={() => { }} inputStyle={{ opacity: 1 }} rightIcon="chevron-down" />
                                </View>
                            </TouchableOpacity>
                        )} />
                        <Controller control={control} name="stream" render={({ field: { value } }) => (
                            <TouchableOpacity onPress={() => openPicker("stream", "Stream", STREAM_OPTIONS)}>
                                <View pointerEvents="none">
                                    <CustomTextInput icon="book-outline" label="Stream" placeholder="Select stream" value={value || ""} editable={false} onChangeText={() => { }} inputStyle={{ opacity: 1, fontWeight: "400" }} rightIcon="chevron-down" />
                                </View>
                            </TouchableOpacity>
                        )} />
                        <Controller control={control} name="year" render={({ field: { value } }) => (
                            <TouchableOpacity onPress={() => openPicker("year", "Current Year", YEAR_OPTIONS)}>
                                <View pointerEvents="none">
                                    <CustomTextInput icon="time-outline" label="Current Year" placeholder="e.g. 2nd Year" value={value || ""} editable={false} onChangeText={() => { }} inputStyle={{ opacity: 1, fontWeight: "400" }} rightIcon="chevron-down" />
                                </View>
                            </TouchableOpacity>
                        )} />
                    </View>

                    <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.9)", borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Marks & Performance</Text>

                        {/* Class 10: CGPA or Percentage */}
                        <View style={styles.marksRow}>
                            <Text style={[styles.marksLabel, { color: colors.textSecondary }]}>Class 10</Text>
                            <View style={styles.marksTypeRow}>
                                {MARKS_TYPE_OPTIONS.map((opt) => (
                                    <Controller key={`10-${opt.value}`} control={control} name="marks_10_type" render={({ field: { value, onChange } }) => (
                                        <TouchableOpacity
                                            onPress={() => { onChange(opt.value); setValue("marks_10_value", ""); }}
                                            style={[styles.marksChip, { borderColor: colors.border, backgroundColor: value === opt.value ? (colors.primary + "20") : (isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5") }]}
                                        >
                                            <Text style={[styles.marksChipText, { color: value === opt.value ? colors.primary : colors.text }]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    )} />
                                ))}
                            </View>
                            <Controller control={control} name="marks_10_value" render={({ field: { onChange, value } }) => (
                                <CustomTextInput
                                    label=""
                                    placeholder={watch("marks_10_type") === "cgpa" ? "e.g. 8.5 (0–10)" : watch("marks_10_type") === "percentage" ? "e.g. 85 (0–100)" : "Select type first"}
                                    value={value || ""}
                                    onChangeText={onChange}
                                    keyboardType="decimal-pad"
                                    error={errors.marks_10_value?.message}
                                />
                            )} />
                        </View>

                        {/* Class 12: CGPA or Percentage */}
                        <View style={styles.marksRow}>
                            <Text style={[styles.marksLabel, { color: colors.textSecondary }]}>Class 12</Text>
                            <View style={styles.marksTypeRow}>
                                {MARKS_TYPE_OPTIONS.map((opt) => (
                                    <Controller key={`12-${opt.value}`} control={control} name="marks_12_type" render={({ field: { value, onChange } }) => (
                                        <TouchableOpacity
                                            onPress={() => { onChange(opt.value); setValue("marks_12_value", ""); }}
                                            style={[styles.marksChip, { borderColor: colors.border, backgroundColor: value === opt.value ? (colors.primary + "20") : (isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5") }]}
                                        >
                                            <Text style={[styles.marksChipText, { color: value === opt.value ? colors.primary : colors.text }]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    )} />
                                ))}
                            </View>
                            <Controller control={control} name="marks_12_value" render={({ field: { onChange, value } }) => (
                                <CustomTextInput
                                    label=""
                                    placeholder={watch("marks_12_type") === "cgpa" ? "e.g. 9.0 (0–10)" : watch("marks_12_type") === "percentage" ? "e.g. 90 (0–100)" : "Select type first"}
                                    value={value || ""}
                                    onChangeText={onChange}
                                    keyboardType="decimal-pad"
                                    error={errors.marks_12_value?.message}
                                />
                            )} />
                        </View>

                        {/* Graduation: Current Year CGPA or Percentage */}
                        <View style={styles.marksRow}>
                            <Text style={[styles.marksLabel, { color: colors.textSecondary }]}>Current Year (College)</Text>
                            <View style={styles.marksTypeRow}>
                                {MARKS_TYPE_OPTIONS.map((opt) => (
                                    <Controller key={`grad-${opt.value}`} control={control} name="graduation_type" render={({ field: { value, onChange } }) => (
                                        <TouchableOpacity
                                            onPress={() => { onChange(opt.value); setValue("graduation_value", ""); }}
                                            style={[styles.marksChip, { borderColor: colors.border, backgroundColor: value === opt.value ? (colors.primary + "20") : (isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5") }]}
                                        >
                                            <Text style={[styles.marksChipText, { color: value === opt.value ? colors.primary : colors.text }]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    )} />
                                ))}
                            </View>
                            <Controller control={control} name="graduation_value" render={({ field: { onChange, value } }) => (
                                <CustomTextInput
                                    label=""
                                    placeholder={watch("graduation_type") === "cgpa" ? "e.g. 8.5 (0–10)" : watch("graduation_type") === "percentage" ? "e.g. 82 (0–100)" : "Select type first"}
                                    value={value || ""}
                                    onChangeText={onChange}
                                    keyboardType="decimal-pad"
                                    error={errors.graduation_value?.message}
                                />
                            )} />
                        </View>
                    </View>

                    <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.9)", borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Family & Category</Text>
                        <Controller control={control} name="father_name" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput icon="person-outline" label="Father's Name" placeholder="Father's name" value={value || ""} onChangeText={onChange} onBlur={onBlur} />
                        )} />
                        <Controller control={control} name="mother_name" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput icon="person-outline" label="Mother's Name" placeholder="Mother's name" value={value || ""} onChangeText={onChange} onBlur={onBlur} />
                        )} />
                        <Controller control={control} name="family_annual_income" render={({ field: { value } }) => (
                            <TouchableOpacity onPress={() => openPicker("family_annual_income", "Family Annual Income", ANNUAL_INCOME_OPTIONS)}>
                                <View pointerEvents="none">
                                    <CustomTextInput icon="cash-outline" label="Family Annual Income (₹)" placeholder="Select income range" value={value || ""} editable={false} onChangeText={() => { }} inputStyle={{ opacity: 1, fontWeight: "400" }} rightIcon="chevron-down" />
                                </View>
                            </TouchableOpacity>
                        )} />
                        <Controller control={control} name="religion" render={({ field: { value } }) => (
                            <TouchableOpacity onPress={() => openPicker("religion", "Select Religion", RELIGION_OPTIONS)}>
                                <View pointerEvents="none">
                                    <CustomTextInput icon="people-outline" label="Religion" placeholder="Select Religion" value={value || ""} editable={false} onChangeText={() => { }} inputStyle={{ opacity: 1, fontWeight: "400" }} rightIcon="chevron-down" />
                                </View>
                            </TouchableOpacity>
                        )} />
                        <Controller control={control} name="caste" render={({ field: { value } }) => (
                            <TouchableOpacity onPress={() => openPicker("caste", "Select Caste", CASTE_OPTIONS)}>
                                <View pointerEvents="none">
                                    <CustomTextInput icon="people-outline" label="Caste" placeholder="Select Caste" value={value || ""} editable={false} onChangeText={() => { }} inputStyle={{ opacity: 1, fontWeight: "400" }} rightIcon="chevron-down" />
                                </View>
                            </TouchableOpacity>
                        )} />
                    </View>

                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: isDark ? colors.card : "#fff" }]}>
                    <Button
                        title={loading ? "Saving..." : "Save Changes"}
                        onPress={handleSubmit(onSubmit)}
                        disabled={loading}
                        variant="primary"
                    />
                </View>
            </KeyboardAvoidingView>

            {/* Option Picker Modal */}
            <Modal visible={pickerConfig.visible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerConfig(prev => ({ ...prev, visible: false }))}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? "#1e1e1e" : "#fff" }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>{pickerConfig.title}</Text>
                            <TouchableOpacity onPress={() => setPickerConfig(prev => ({ ...prev, visible: false }))}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={pickerConfig.options}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={[styles.optionItem, { borderBottomColor: colors.border }]} onPress={() => handleSelect(item)}>
                                    <Text style={[styles.optionText, { color: colors.text }]}>{item}</Text>
                                    {pickerConfig.field && (getValues(pickerConfig.field as any) === item) && (
                                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Date Picker - DOB only */}
            <DateTimePickerModal
                isVisible={datePickerVisible}
                mode="date"
                display="spinner"
                date={getDatePickerValue()}
                maximumDate={new Date()}
                onConfirm={onDateConfirm}
                onCancel={() => setDatePickerVisible(false)}
            />

            {loading && (
                <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: "absolute", top: 0, left: 0, bottom: 0, right: 0 },
    scrollContent: { padding: 20, paddingBottom: 100 },
    formCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3
    },
    sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 20, letterSpacing: 0.5 },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", elevation: 10, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
    dropdownIcon: { position: "absolute", right: 12, top: 40 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
    modalContent: { borderRadius: 16, maxHeight: "60%", padding: 0, overflow: "hidden" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.1)" },
    modalTitle: { fontSize: 18, fontWeight: "700" },
    optionItem: { padding: 18, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    optionText: { fontSize: 16, fontWeight: "500" },
    loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
    photoContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 10 },
    photoCircle: { width: 120, height: 120, borderRadius: 60, overflow: "hidden", justifyContent: "center", alignItems: "center", marginBottom: 12 },
    photoImage: { width: 120, height: 120, borderRadius: 60 },
    photoPlaceholder: { alignItems: "center", justifyContent: "center", gap: 8 },
    photoHint: { fontSize: 12, fontWeight: "500" },
    removePhotoBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    removePhotoText: { color: "#fff", fontSize: 14, fontWeight: "600" },
    phoneFieldWrap: { marginBottom: 16 },
    phoneLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
    phoneContainer: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 4 },
    phoneTextInput: { fontSize: 16, paddingVertical: 12, backgroundColor: "transparent", height: 48 },
    phoneErrorText: { fontSize: 12, color: "#EF4444", marginTop: 4 },
    marksRow: { marginBottom: 20 },
    marksLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
    marksTypeRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
    marksChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
    marksChipText: { fontSize: 14, fontWeight: "600" },
});
