import { AppHeader, CustomTextInput } from "@/components";
import Button from "@/components/Button";
import { useTheme } from "@/context/ThemeContext";
import { updatePassword } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";

export default function MobilizerPrivacyScreen() {
    const { isDark, colors } = useTheme();

    // Password Change State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Settings State
    const [twoFactor, setTwoFactor] = useState(false);
    const [profileVisibility, setProfileVisibility] = useState(true);

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert("Error", "Please fill all password fields");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "New passwords do not match");
            return;
        }

        try {
            setLoading(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (authDataStr) {
                const authData = JSON.parse(authDataStr);
                const response = await updatePassword(authData.token, currentPassword, newPassword);
                if (response.success) {
                    Alert.alert("Success", "Password updated successfully");
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                } else {
                    Alert.alert("Error", response.message || "Failed to update password");
                }
            }
        } catch (e) {
            Alert.alert("Error", "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const SettingItem = ({ label, value, onValueChange, description }: any) => (
        <View style={[styles.settingItem, { backgroundColor: isDark ? colors.card : "#fff" }]}>
            <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>{description}</Text>
            </View>
            <Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#eee", true: colors.primary }} />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f5f5f5" }]}>
            <AppHeader title="Change Password" onBack={() => router.back()} />
            <ScrollView contentContainerStyle={styles.content}>


                <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                    <CustomTextInput
                        label="Current Password"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry
                        placeholder="Enter current password"
                    />
                    <CustomTextInput
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        placeholder="Enter new password"
                    />
                    <CustomTextInput
                        label="Confirm New Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        placeholder="Confirm new password"
                    />
                    <View style={{ marginTop: 16 }}>
                        <Button title={loading ? "Updating..." : "Update Password"} onPress={handleChangePassword} disabled={loading} variant="primary" />
                    </View>
                </View>


            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20 },
    sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 },
    card: { padding: 16, borderRadius: 16, backgroundColor: '#fff', gap: 12 },
    settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12 },
    settingLabel: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    settingDesc: { fontSize: 12 },
});
