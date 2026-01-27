import { AppHeader, Button, CustomTextInput } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { addMobilizerStudent } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

const formSchema = z.object({
    username: z.string().min(4, "Username must be at least 4 characters"),
    password: z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Must contain uppercase").regex(/[0-9]/, "Must contain number").regex(/[^a-zA-Z0-9]/, "Must contain special char"),
    firstname: z.string().min(1, "First name is required"),
    lastname: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone1: z.string().optional(),
    city: z.string().optional(),
    country: z.string().length(2, "Country code must be 2 letters (e.g. IN)").optional(),
    institution: z.string().optional(),
    gender: z.string().optional(),
    religion: z.string().optional(),
    caste: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const RELIGION_OPTIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"];
const CASTE_OPTIONS = ["General", "OBC", "SC", "ST", "Other"];

export default function MobilizerAddStudentScreen() {
    const { isDark, colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);

    // Picker State
    const [pickerConfig, setPickerConfig] = useState<{ visible: boolean; title: string; options: string[]; field: keyof FormValues | null }>({
        visible: false,
        title: "",
        options: [],
        field: null,
    });

    const {
        control,
        handleSubmit,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
            firstname: "",
            lastname: "",
            email: "",
            phone1: "",
            city: "",
            country: "IN",
            institution: "",
            gender: "",
            religion: "",
            caste: "",
        },
    });

    const openPicker = (field: keyof FormValues, title: string, options: string[]) => {
        setPickerConfig({ visible: true, title, options, field });
    };

    const handleSelect = (value: string) => {
        if (pickerConfig.field) {
            setValue(pickerConfig.field, value, { shouldValidate: true });
        }
        setPickerConfig((prev) => ({ ...prev, visible: false }));
    };

    const onSubmit = async (data: FormValues) => {
        try {
            setLoading(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) return;
            const { token } = JSON.parse(authDataStr);

            const customfields = [];
            if (data.gender) customfields.push({ shortname: "gender", value: data.gender });
            if (data.religion) customfields.push({ shortname: "religion", value: data.religion });
            if (data.caste) customfields.push({ shortname: "caste", value: data.caste });

            // Build payload with indexed customfields format
            const payload: any = {
                username: data.username,
                password: data.password,
                firstname: data.firstname,
                lastname: data.lastname,
                email: data.email,
            };

            // Add optional fields
            if (data.phone1) payload.phone1 = data.phone1;
            if (data.city) payload.city = data.city;
            if (data.country) payload.country = data.country;
            if (data.institution) payload.institution = data.institution;

            // Add customfields as indexed array (matching Postman format)
            customfields.forEach((field, index) => {
                payload[`customfields[${index}][shortname]`] = field.shortname;
                payload[`customfields[${index}][value]`] = field.value.toLowerCase();
            });

            const response = await addMobilizerStudent(token, payload);

            if (response.success) {
                Alert.alert("Success", "Student added successfully!", [
                    { text: "OK", onPress: () => router.back() }
                ]);
            } else {
                Alert.alert("Error", response.message || "Failed to add student");
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Something went wrong");
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
            <AppHeader title="Add New Student" onBack={() => router.back()} />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.9)", borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Details</Text>

                        <Controller control={control} name="username" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput label="Username *" placeholder="Unique username" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.username?.message} />
                        )} />

                        <Controller control={control} name="password" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput label="Password *" placeholder="Strong password" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry showPasswordToggle error={errors.password?.message} />
                        )} />

                        <Controller control={control} name="email" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput label="Email *" placeholder="Student email" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" error={errors.email?.message} />
                        )} />
                    </View>

                    <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.9)", borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>

                        <Controller control={control} name="firstname" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput label="First Name *" placeholder="Student first name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.firstname?.message} />
                        )} />

                        <Controller control={control} name="lastname" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput label="Last Name *" placeholder="Student last name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.lastname?.message} />
                        )} />

                        <Controller control={control} name="phone1" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput label="Phone" placeholder="Mobile number" value={value || ""} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" error={errors.phone1?.message} />
                        )} />

                        <Controller control={control} name="gender" render={({ field: { value } }) => (
                            <TouchableOpacity onPress={() => openPicker("gender", "Select Gender", GENDER_OPTIONS)}>
                                <View pointerEvents="none">
                                    <CustomTextInput label="Gender" placeholder="Select Gender" value={value || ""} editable={false} onChangeText={() => { }} />
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} style={styles.dropdownIcon} />
                                </View>
                            </TouchableOpacity>
                        )} />
                    </View>

                    <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.9)", borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Location & Institution</Text>

                        <Controller control={control} name="city" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput label="City" placeholder="City" value={value || ""} onChangeText={onChange} onBlur={onBlur} />
                        )} />

                        <Controller control={control} name="country" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput label="Country Code" placeholder="e.g. IN" value={value || ""} onChangeText={onChange} onBlur={onBlur} error={errors.country?.message} />
                        )} />

                        <Controller control={control} name="institution" render={({ field: { onChange, value, onBlur } }) => (
                            <CustomTextInput label="Institution" placeholder="School/College Name" value={value || ""} onChangeText={onChange} onBlur={onBlur} />
                        )} />
                    </View>

                    <View style={[styles.formCard, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.9)", borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Details</Text>

                        <Controller control={control} name="religion" render={({ field: { value } }) => (
                            <TouchableOpacity onPress={() => openPicker("religion", "Select Religion", RELIGION_OPTIONS)}>
                                <View pointerEvents="none">
                                    <CustomTextInput label="Religion" placeholder="Select Religion" value={value || ""} editable={false} onChangeText={() => { }} />
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} style={styles.dropdownIcon} />
                                </View>
                            </TouchableOpacity>
                        )} />

                        <Controller control={control} name="caste" render={({ field: { value } }) => (
                            <TouchableOpacity onPress={() => openPicker("caste", "Select Caste", CASTE_OPTIONS)}>
                                <View pointerEvents="none">
                                    <CustomTextInput label="Caste" placeholder="Select Caste" value={value || ""} editable={false} onChangeText={() => { }} />
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} style={styles.dropdownIcon} />
                                </View>
                            </TouchableOpacity>
                        )} />
                    </View>

                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: isDark ? colors.card : "#fff" }]}>
                    <Button
                        title={loading ? "Creating..." : "Create Student Account"}
                        onPress={handleSubmit(onSubmit)}
                        disabled={loading}
                        variant="primary"
                    />
                </View>
            </KeyboardAvoidingView>

            {/* Generic Picker Modal */}
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
    formCard: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
    sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)" },
    dropdownIcon: { position: "absolute", right: 12, top: 40 }, // Adjust based on CustomTextInput layout
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
    modalContent: { borderRadius: 12, maxHeight: "50%", padding: 0, overflow: 'hidden' },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.1)" },
    modalTitle: { fontSize: 18, fontWeight: "700" },
    optionItem: { padding: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    optionText: { fontSize: 16 },
    loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }
});
