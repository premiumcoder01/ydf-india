import { AppHeader, CustomTextInput } from "@/components";
import Button from "@/components/Button";
import { useTheme } from "@/context/ThemeContext";
import { getUserProfile, updateUserProfile } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

export default function MobilizerAccountScreen() {
    const { isDark, colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        firstname: "",
        lastname: "",
        email: "",
        phone: "",
        address: "",
        city: "",
    });

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (authDataStr) {
                const authData = JSON.parse(authDataStr);
                if (authData.token) {
                    const response = await getUserProfile(authData.token);
                    if (response.success && response.data?.user) {
                        const user = response.data.user;
                        setFormData({
                            firstname: user.firstname || "",
                            lastname: user.lastname || "",
                            email: user.email || "",
                            phone: user.phone1 || "",
                            address: user.address || "",
                            city: user.city || "",
                        });
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    const handleSave = async () => {
        try {
            setSaving(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) return;
            const authData = JSON.parse(authDataStr);

            const payload = {
                firstName: formData.firstname,
                lastName: formData.lastname,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
            };

            const response = await updateUserProfile(authData.token, payload);

            if (response.success) {
                Alert.alert("Success", "Profile updated successfully");
            } else {
                Alert.alert("Error", response.message || "Failed to update profile");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "An unexpected error occurred");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f5f5f5", justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f5f5f5" }]}>
            <AppHeader title="Account Details" onBack={() => router.back()} />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>
                    <CustomTextInput
                        label="First Name"
                        value={formData.firstname}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, firstname: text }))}
                        placeholder="Enter first name"
                    />
                    <CustomTextInput
                        label="Last Name"
                        value={formData.lastname}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, lastname: text }))}
                        placeholder="Enter last name"
                    />
                    <CustomTextInput
                        label="Email"
                        value={formData.email}
                        onChangeText={() => { }} // Email usually read-only
                        placeholder="Enter email"
                        editable={false}
                    />
                    <CustomTextInput
                        label="Phone Number"
                        value={formData.phone}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                        placeholder="Enter phone number"
                        keyboardType="phone-pad"
                    />
                    <CustomTextInput
                        label="Address"
                        value={formData.address}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                        placeholder="Enter address"
                    />
                    <CustomTextInput
                        label="City"
                        value={formData.city}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
                        placeholder="Enter city"
                    />

                    <View style={styles.footer}>
                        <Button
                            title={saving ? "Saving..." : "Save Changes"}
                            onPress={handleSave}
                            disabled={saving}
                            variant="primary"
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, gap: 16 },
    footer: { marginTop: 20 },
});
