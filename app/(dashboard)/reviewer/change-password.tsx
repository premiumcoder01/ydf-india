import { AppHeader, Button, CustomTextInput } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ReviewerChangePasswordScreen() {
    const { colors } = useTheme();
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
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            Alert.alert("Success", "Password changed successfully");
            router.back();
        }, 1500);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <AppHeader title="Change Password" onBack={() => router.back()} />
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: inset.bottom + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                <CustomTextInput
                    label="Current Password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    secureTextEntry
                    showPasswordToggle={true}
                    togglePosition="right"
                />
                <CustomTextInput
                    label="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    secureTextEntry
                    showPasswordToggle={true}
                    togglePosition="right"
                />
                <CustomTextInput
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter new password"
                    secureTextEntry
                    showPasswordToggle={true}
                    togglePosition="right"
                />

                <View style={styles.actionContainer}>
                    <Button title="Update Password" onPress={handleChangePassword} loading={loading} />
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
