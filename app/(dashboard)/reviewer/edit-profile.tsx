import { AppHeader, Button, CustomTextInput } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getUserProfile, updateUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RELIGION_OPTIONS = [
    "Hinduism", "Muslim", "Christianity", "Sikhism", "Buddhism", "Jainism", "Zoroastrianism", "Prefer not to say"
];
const CASTE_OPTIONS = [
    "Scheduled Tribe (ST)", "Scheduled Caste (SC)", "OBC", "General", "Minority", "Prefer not to say"
];
const GENDER_OPTIONS = ["Male", "Female", "Other"];
const DOMICILE_STATE_OPTIONS = [
    "Bihar", "Punjab", "Rajasthan", "Maharashtra", "Delhi", "Gujarat", "Haryana", "Other"
];

export default function ReviewerEditProfileScreen() {
    const { colors, isDark } = useTheme();
    const inset = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);

    // Modal States
    const [showGenderPicker, setShowGenderPicker] = useState(false);
    const [showReligionPicker, setShowReligionPicker] = useState(false);
    const [showCastePicker, setShowCastePicker] = useState(false);
    const [showStatePicker, setShowStatePicker] = useState(false);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        gender: "",
        dob: "",
        religion: "",
        caste: "",
        state: "",
        district: "",
        city: "",
        address: "",
        pincode: "",
        tenthPassingYear: "",
        twelfthBoard: "",
        twelfthStream: "",
        twelfthPassingYear: "",
        familyIncome: ""
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const authDataStr = await AsyncStorage.getItem("authData");
                if (authDataStr) {
                    const authData = JSON.parse(authDataStr);
                    if (authData.token) {
                        const response = await getUserProfile(authData.token);
                        if (response.success && response.data?.user) {
                            const user = response.data.user;

                            // Parse custom fields map
                            let customMap: any = {};
                            try {
                                if (user.customfields_map && typeof user.customfields_map === 'string') {
                                    customMap = JSON.parse(user.customfields_map);
                                } else if (user.customfields && Array.isArray(user.customfields)) {
                                    user.customfields.forEach((field: any) => {
                                        customMap[field.shortname] = field.value;
                                    });
                                }
                            } catch (e) {
                                console.log("Error parsing custom fields", e);
                            }

                            setFormData({
                                firstName: user.firstname || "",
                                lastName: user.lastname || "",
                                email: user.email || "",
                                phone: user.phone1 || customMap.phone_number || "",
                                gender: customMap.Gender || "",
                                dob: customMap.DOB || "", // Note: API might return timestamp
                                religion: customMap.Religion || "",
                                caste: customMap.Caste || "",
                                state: customMap.State || "",
                                district: customMap.district || "",
                                city: user.city || "",
                                address: user.address || "",
                                pincode: "", // Not explicitly in provided JSON, leaving blank
                                tenthPassingYear: customMap.passing_10th || "",
                                twelfthBoard: customMap["12th_board"] || "",
                                twelfthStream: customMap.stream_in_12th || "",
                                twelfthPassingYear: customMap["12th_passing_year"] || "",
                                familyIncome: customMap.Family_income || ""
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to load profile", error);
            }
        };
        fetchProfile();
    }, []);

    const handleSave = async () => {
        try {
            setLoading(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) return;

            const authData = JSON.parse(authDataStr);
            const token = authData.token;

            // Call the update API with flat structure matching api.ts expectations
            const response = await updateUserProfile(token, {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,

                // Custom fields - passed flat as api.ts handles the mapping
                gender: formData.gender,
                dob: formData.dob,
                religion: formData.religion,
                caste: formData.caste,
                domicileState: formData.state, // api.ts expects 'domicilestate' mapped from 'domicileState'? Let's check api.ts line 1203: profileData.domicileState
                district: formData.district, // api.ts line 1204: profileData.district maps to 'domiciledistrict', wait. logic is addCustomField('domiciledistrict', profileData.district). correct.

                // Other custom fields
                passing10th: formData.tenthPassingYear,
                board12th: formData.twelfthBoard,
                stream12th: formData.twelfthStream,
                passingYear12th: formData.twelfthPassingYear,
                annualIncome: formData.familyIncome // api.ts 1208: maps annualIncome to Family_income
            });

            if (response.success) {
                Alert.alert("Success", "Profile updated successfully");
                router.back();
            } else {
                Alert.alert("Error", response.message || "Failed to update profile");
            }

        } catch (error) {
            setLoading(false);
            Alert.alert("Error", "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const SelectionModal = ({ visible, onClose, title, options, selected, onSelect }: any) => (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1} />
                <View style={[styles.modalContent, { paddingBottom: inset.bottom + 20, backgroundColor: colors.surface || colors.card || "#fff" }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.textSecondary || "#666"} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 350 }}>
                        {options.map((opt: string) => (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.optionRow, selected === opt && styles.optionSelected, { borderBottomColor: colors.border }]}
                                onPress={() => onSelect(opt)}
                            >
                                <Text
                                    style={[styles.optionText, { color: colors.text }, selected === opt && { color: colors.primary || "#007bff" }]}
                                >
                                    {opt}
                                </Text>
                                {selected === opt && (
                                    <Ionicons name="checkmark-circle" size={22} color={colors.primary || "#007bff"} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderSelector = (label: string, value: string, placeholder: string, onPress: () => void) => (
        <View style={{ marginBottom: 16 }}>
            <Text style={{ marginBottom: 8, fontSize: 14, fontWeight: "500", color: colors.textSecondary }}>{label}</Text>
            <TouchableOpacity
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9"
                }}
                onPress={onPress}
            >
                <Text style={{ fontSize: 16, color: value ? colors.text : colors.textSecondary }}>
                    {value || placeholder}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <AppHeader title="Edit Profile" onBack={() => router.back()} />
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: inset.bottom + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                <CustomTextInput
                    label="First Name"
                    value={formData.firstName}
                    onChangeText={(t) => setFormData(prev => ({ ...prev, firstName: t }))}
                    placeholder="Enter first name"
                />
                <CustomTextInput
                    label="Last Name"
                    value={formData.lastName}
                    onChangeText={(t) => setFormData(prev => ({ ...prev, lastName: t }))}
                    placeholder="Enter last name"
                />
                <CustomTextInput
                    label="Email"
                    value={formData.email}
                    onChangeText={(t) => setFormData(prev => ({ ...prev, email: t }))}
                    placeholder="Enter email"
                    keyboardType="email-address"
                    editable={false} // Often email is not editable directly
                />
                <CustomTextInput
                    label="Phone"
                    value={formData.phone}
                    onChangeText={(t) => setFormData(prev => ({ ...prev, phone: t }))}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                />

                <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

                {renderSelector("Gender", formData.gender, "Select Gender", () => setShowGenderPicker(true))}

                <CustomTextInput
                    label="Date of Birth"
                    value={formData.dob}
                    onChangeText={(t) => setFormData(prev => ({ ...prev, dob: t }))}
                    placeholder="YYYY-MM-DD or Timestamp"
                />

                {renderSelector("State", formData.state, "Select State", () => setShowStatePicker(true))}

                <CustomTextInput
                    label="District"
                    value={formData.district}
                    onChangeText={(t) => setFormData(prev => ({ ...prev, district: t }))}
                    placeholder="Enter district"
                />
                <CustomTextInput
                    label="City"
                    value={formData.city}
                    onChangeText={(t) => setFormData(prev => ({ ...prev, city: t }))}
                    placeholder="Enter city"
                />
                <CustomTextInput
                    label="Address"
                    value={formData.address}
                    onChangeText={(t) => setFormData(prev => ({ ...prev, address: t }))}
                    placeholder="Enter address"
                    multiline
                />

                <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

                {renderSelector("Religion", formData.religion, "Select Religion", () => setShowReligionPicker(true))}
                {renderSelector("Caste", formData.caste, "Select Caste", () => setShowCastePicker(true))}

                <CustomTextInput
                    label="Family Income"
                    value={formData.familyIncome}
                    onChangeText={(t) => setFormData(prev => ({ ...prev, familyIncome: t }))}
                    placeholder="Enter family income"
                />

                <View style={styles.actionContainer}>
                    <Button title="Save Changes" onPress={handleSave} loading={loading} />
                </View>

                {/* Modals */}
                <SelectionModal
                    visible={showGenderPicker}
                    onClose={() => setShowGenderPicker(false)}
                    title="Select Gender"
                    options={GENDER_OPTIONS}
                    selected={formData.gender}
                    onSelect={(val: string) => {
                        setFormData(prev => ({ ...prev, gender: val }));
                        setShowGenderPicker(false);
                    }}
                />
                <SelectionModal
                    visible={showReligionPicker}
                    onClose={() => setShowReligionPicker(false)}
                    title="Select Religion"
                    options={RELIGION_OPTIONS}
                    selected={formData.religion}
                    onSelect={(val: string) => {
                        setFormData(prev => ({ ...prev, religion: val }));
                        setShowReligionPicker(false);
                    }}
                />
                <SelectionModal
                    visible={showCastePicker}
                    onClose={() => setShowCastePicker(false)}
                    title="Select Caste"
                    options={CASTE_OPTIONS}
                    selected={formData.caste}
                    onSelect={(val: string) => {
                        setFormData(prev => ({ ...prev, caste: val }));
                        setShowCastePicker(false);
                    }}
                />
                <SelectionModal
                    visible={showStatePicker}
                    onClose={() => setShowStatePicker(false)}
                    title="Select State"
                    options={DOMICILE_STATE_OPTIONS}
                    selected={formData.state}
                    onSelect={(val: string) => {
                        setFormData(prev => ({ ...prev, state: val }));
                        setShowStatePicker(false);
                    }}
                />

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, gap: 16 },
    actionContainer: { marginTop: 20 },
    sectionDivider: {
        height: 1,
        marginVertical: 8,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
    },
    optionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
    },
    optionSelected: {
        backgroundColor: "rgba(0,0,0,0.02)",
    },
    optionText: {
        fontSize: 16,
    },
});
