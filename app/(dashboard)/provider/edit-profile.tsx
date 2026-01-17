import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getUserProfile, updateUserProfile } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProviderEditProfileScreen() {
    const { colors, isDark } = useTheme();
    const inset = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);

    // Toast State
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error" | "info">("error");

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        organization: "",
        address: "",
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
                            setFormData({
                                firstName: user.firstname || "",
                                lastName: user.lastname || "",
                                email: user.email || "",
                                phone: user.phone || user.phone1 || "",
                                organization: user.fullname || "",
                                address: user.address || "",
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
        // Validation
        if (!formData.firstName.trim()) {
            setToastMessage("First name is required");
            setToastType("error");
            setShowToast(true);
            return;
        }

        if (!formData.lastName.trim()) {
            setToastMessage("Last name is required");
            setToastType("error");
            setShowToast(true);
            return;
        }

        if (!formData.email.trim()) {
            setToastMessage("Email is required");
            setToastType("error");
            setShowToast(true);
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setToastMessage("Please enter a valid email address");
            setToastType("error");
            setShowToast(true);
            return;
        }

        try {
            setLoading(true);

            // Get token from AsyncStorage
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) {
                setToastMessage("Authentication error. Please login again.");
                setToastType("error");
                setShowToast(true);
                setLoading(false);
                return;
            }

            const authData = JSON.parse(authDataStr);
            const token = authData?.token;

            if (!token) {
                setToastMessage("Authentication token not found. Please login again.");
                setToastType("error");
                setShowToast(true);
                setLoading(false);
                return;
            }

            // Call the updateUserProfile API
            const response = await updateUserProfile(token, {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
            });

            if (response.success) {
                // Update the authData in AsyncStorage with new profile info
                const updatedAuthData = {
                    ...authData,
                    user: {
                        ...authData.user,
                        firstname: formData.firstName,
                        lastname: formData.lastName,
                        email: formData.email,
                        phone: formData.phone,
                        phone1: formData.phone,
                        address: formData.address,
                        fullname: `${formData.firstName} ${formData.lastName}`,
                    },
                };
                await AsyncStorage.setItem("authData", JSON.stringify(updatedAuthData));

                setToastMessage("Profile updated successfully");
                setToastType("success");
                setShowToast(true);

                // Navigate back after a short delay
                setTimeout(() => {
                    router.back();
                }, 1500);
            } else {
                setToastMessage(response.error || "Failed to update profile");
                setToastType("error");
                setShowToast(true);
            }
        } catch (error: any) {
            console.error("Error updating profile:", error);
            setToastMessage(error.message || "Failed to update profile");
            setToastType("error");
            setShowToast(true);
        } finally {
            setLoading(false);
        }
    };

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
                />
                <CustomTextInput
                    label="Phone"
                    value={formData.phone}
                    onChangeText={(t) => setFormData(prev => ({ ...prev, phone: t }))}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                />
                <CustomTextInput
                    label="Organization Name"
                    value={formData.organization}
                    onChangeText={(t) => setFormData(prev => ({ ...prev, organization: t }))}
                    placeholder="Enter organization name"
                />
                <CustomTextInput
                    label="Address"
                    value={formData.address}
                    onChangeText={(t) => setFormData(prev => ({ ...prev, address: t }))}
                    placeholder="Enter address"
                    multiline
                />

                <View style={styles.actionContainer}>
                    <Button title="Save Changes" onPress={handleSave} loading={loading} />
                </View>
            </ScrollView>

            <Toast
                message={toastMessage}
                type={toastType}
                visible={showToast}
                onHide={() => setShowToast(false)}
                duration={3000}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, gap: 16 },
    actionContainer: { marginTop: 20 },
});
