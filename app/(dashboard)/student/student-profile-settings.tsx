import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { updatePassword } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

interface ValidationErrors {
  [key: string]: string;
}

export default function StudentProfileSettingsScreen() {
  const { theme, toggleTheme, isDark, colors } = useTheme();
  // Removed unused settings state

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("error");

  const validatePassword = (password: string): boolean => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password)
    );
  };

  const handleChangePassword = async () => {
    const errors: ValidationErrors = {};

    if (!passwordData.oldPassword) {
      errors.oldPassword = "Current password is required";
    }

    if (!validatePassword(passwordData.newPassword)) {
      errors.newPassword =
        "Password must be at least 8 characters with uppercase, lowercase, and number";
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setToastMessage(Object.values(errors)[0]);
      setToastType("error");
      setShowToast(true);
      return;
    }

    setIsSaving(true);

    try {
      const authDataString = await AsyncStorage.getItem("authData");
      if (!authDataString) {
        setToastMessage("Authentication error. Please login again.");
        setToastType("error");
        setShowToast(true);
        setIsSaving(false);
        return;
      }

      const authData = JSON.parse(authDataString);
      const token = authData?.token;

      if (!token) {
        setToastMessage("Authentication token not found. Please login again.");
        setToastType("error");
        setShowToast(true);
        setIsSaving(false);
        return;
      }

      const response = await updatePassword(
        token,
        passwordData.oldPassword,
        passwordData.newPassword
      );

      if (response.success) {
        setPasswordData({
          oldPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setValidationErrors({});
        setToastMessage(response.message || "Password updated successfully");
        setToastType("success");
        setShowToast(true);
      } else {
        setToastMessage(response.error || "Failed to update password");
        setToastType("error");
        setShowToast(true);
      }
    } catch (error: any) {
      setToastMessage(error.message || "Failed to update password");
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#121212", "#1e1e1e"] : ["#fff", "#f8f9fa"]}
        style={styles.background}
      />

      <AppHeader title="Settings" onBack={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Appearance
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? "#2c2c2c" : "#f0f2f5" }]}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={22} color={colors.primary} />
              </View>
              <View style={styles.settingTexts}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[styles.settingSubLabel, { color: colors.textSecondary }]}>
                  {isDark ? "On" : "Off"}
                </Text>
              </View>
            </View>
            <View pointerEvents="none">
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#767577", true: colors.primary }}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Security
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.inputDetails}>
            <CustomTextInput
              label="Current Password"
              value={passwordData.oldPassword}
              onChangeText={(val) =>
                setPasswordData((prev) => ({ ...prev, oldPassword: val }))
              }
              secureTextEntry
              showPasswordToggle
              error={validationErrors.oldPassword}
              placeholder="Enter current password"
            />
            <CustomTextInput
              label="New Password"
              value={passwordData.newPassword}
              onChangeText={(val) =>
                setPasswordData((prev) => ({ ...prev, newPassword: val }))
              }
              secureTextEntry
              showPasswordToggle
              error={validationErrors.newPassword}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
            />
            <CustomTextInput
              label="Confirm New Password"
              value={passwordData.confirmPassword}
              onChangeText={(val) =>
                setPasswordData((prev) => ({
                  ...prev,
                  confirmPassword: val,
                }))
              }
              secureTextEntry
              showPasswordToggle
              error={validationErrors.confirmPassword}
              placeholder="Re-enter new password"
            />
          </View>

          <Button
            title={isSaving ? "Updating..." : "Update Password"}
            onPress={handleChangePassword}
            variant="primary"
            style={styles.saveButton}
            disabled={
              isSaving ||
              !passwordData.oldPassword ||
              !passwordData.newPassword ||
              !passwordData.confirmPassword
            }
          />
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
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 0.5,
    marginTop: 10,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTexts: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingSubLabel: {
    fontSize: 13,
  },
  inputDetails: {
    gap: 16,
  },
  saveButton: {
    marginTop: 24,
    height: 50,
    borderRadius: 14,
  },
});







