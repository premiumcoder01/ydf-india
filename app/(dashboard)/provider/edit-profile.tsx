import { AppHeader, Button, CustomTextInput } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getUserProfile } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProviderEditProfileScreen() {
    const { colors, isDark } = useTheme();
    const inset = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);

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
        try {
            setLoading(true);
            // Simulate API call
            setTimeout(() => {
                setLoading(false);
                Alert.alert("Success", "Profile updated successfully");
                router.back();
            }, 1000);
        } catch (error) {
            setLoading(false);
            Alert.alert("Error", "Failed to update profile");
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, gap: 16 },
    actionContainer: { marginTop: 20 },
});
