import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { updatePassword } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ValidationErrors {
  [key: string]: string;
}

export default function StudentProfileSettingsScreen() {
  const { theme, toggleTheme, isDark, colors } = useTheme();
  const [settings, setSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
  });

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

  const toggleSetting = useCallback((key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

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
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      <AppHeader title="Settings" onBack={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: colors.border }]}
              onPress={() => toggleSetting("pushEnabled")}
              activeOpacity={0.7}
            >
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: isDark ? "#2c2c2c" : "#f8f8f8" }]}>
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color="#4CAF50"
                  />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Push Notifications</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    Receive notifications on your device
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => toggleSetting("pushEnabled")}
                style={[
                  styles.toggle,
                  settings.pushEnabled
                    ? styles.toggleActive
                    : styles.toggleInactive,
                ]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    settings.pushEnabled && styles.toggleThumbActive,
                  ]}
                />
              </TouchableOpacity>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: colors.border }]}
              onPress={() => toggleSetting("emailEnabled")}
              activeOpacity={0.7}
            >
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: isDark ? "#2c2c2c" : "#f8f8f8" }]}>
                  <Ionicons name="mail-outline" size={20} color="#2196F3" />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Email Notifications</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    Receive updates via email
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => toggleSetting("emailEnabled")}
                style={[
                  styles.toggle,
                  settings.emailEnabled
                    ? styles.toggleActive
                    : styles.toggleInactive,
                ]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    settings.emailEnabled && styles.toggleThumbActive,
                  ]}
                />
              </TouchableOpacity>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: isDark ? "#2c2c2c" : "#f8f8f8" }]}>
                  <Ionicons name="moon-outline" size={20} color="#9C27B0" />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Dark Mode</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    Switch to dark theme
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={toggleTheme}
                style={[
                  styles.toggle,
                  isDark
                    ? styles.toggleActive
                    : styles.toggleInactive,
                ]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    isDark && styles.toggleThumbActive,
                  ]}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
            Security
          </Text>
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <CustomTextInput
              label="Current Password"
              value={passwordData.oldPassword}
              onChangeText={(val) =>
                setPasswordData((prev) => ({ ...prev, oldPassword: val }))
              }
              secureTextEntry
              showPasswordToggle
              style={styles.input}
              error={validationErrors.oldPassword}
              placeholder="Enter your current password"
            />
            <CustomTextInput
              label="New Password"
              value={passwordData.newPassword}
              onChangeText={(val) =>
                setPasswordData((prev) => ({ ...prev, newPassword: val }))
              }
              secureTextEntry
              showPasswordToggle
              style={styles.input}
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
              style={styles.input}
              error={validationErrors.confirmPassword}
              placeholder="Re-enter your new password"
            />
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
        </View>

        <View style={{ height: 40 }} />
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
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  settingsCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: "#4CAF50",
  },
  toggleInactive: {
    backgroundColor: "#ddd",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  formCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
  },
});







