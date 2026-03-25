import { AppHeader, Button, CustomTextInput } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { updatePassword } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ReviewerChangePasswordScreen() {
    const { colors, isDark } = useTheme();
    const inset = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "New passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) {
                Alert.alert("Error", "Session expired. Please login again.");
                return;
            }

            const authData = JSON.parse(authDataStr);
            if (!authData.token) {
                Alert.alert("Error", "Session invalid. Please login again.");
                return;
            }

            const response = await updatePassword(authData.token, currentPassword, newPassword);

            if (response.success) {
                Alert.alert("Success", "Password changed successfully");
                router.back();
            } else {
                Alert.alert("Error", response.message || response.error || "Failed to update password");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <AppHeader title="Change Password" onBack={() => router.back()} />
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: inset.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[
                    styles.formCard,
                    { 
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        shadowColor: isDark ? "#000" : "#6b7280",
                    }
                ]}>
                    <CustomTextInput
                        label="Current Password"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="Enter current password"
                        secureTextEntry
                        showPasswordToggle={true}
                        togglePosition="right"
                        icon="lock-closed-outline"
                        iconColor={colors.primary}
                    />
                    <CustomTextInput
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Enter new password"
                        secureTextEntry
                        showPasswordToggle={true}
                        togglePosition="right"
                        icon="shield-checkmark-outline"
                        iconColor={colors.primary}
                    />
                    <CustomTextInput
                        label="Confirm New Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Re-enter new password"
                        secureTextEntry
                        showPasswordToggle={true}
                        togglePosition="right"
                        icon="shield-checkmark-outline"
                        iconColor={colors.primary}
                    />
                </View>

                <View style={styles.actionContainer}>
                    <Button title="Update Password" onPress={handleChangePassword} loading={loading} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20 },
    formCard: {
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 8,
    },
    actionContainer: {
        marginTop: 16,
    },
});
