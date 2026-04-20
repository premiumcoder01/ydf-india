import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { updatePassword } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ValidationErrors {
  [key: string]: string;
}

export default function StudentProfileSettingsScreen() {
  const { toggleTheme, isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();

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
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      <AppHeader title="Settings" onBack={() => router.navigate("/(dashboard)/student/student-profile")} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Appearance Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconBadge, { backgroundColor: "#8B5CF6" }]}>
                  <Ionicons name="color-palette" size={15} color="#fff" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
              </View>
            </View>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: "#8B5CF6", borderLeftWidth: 4 }]}>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={toggleTheme}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconBox, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.1)" }]}>
                    <Ionicons name={isDark ? "moon" : "sunny"} size={22} color="#8B5CF6" />
                  </View>
                  <View style={styles.settingTexts}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
                    <Text style={[styles.settingSubLabel, { color: colors.textSecondary }]}>
                      {isDark ? "Enable light theme" : "Enable dark theme"}
                    </Text>
                  </View>
                </View>
                <View pointerEvents="none">
                  <Switch
                    value={isDark}
                    onValueChange={toggleTheme}
                    trackColor={{ false: "#767577", true: "#8B5CF6" }}
                    ios_backgroundColor="#3e3e3e"
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Security Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconBadge, { backgroundColor: "#EF4444" }]}>
                  <Ionicons name="lock-closed" size={15} color="#fff" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Security</Text>
              </View>
            </View>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: "#EF4444", borderLeftWidth: 4 }]}>
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
                  icon="key-outline"
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
                  icon="lock-closed-outline"
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
                  icon="checkmark-done-outline"
                />
              </View>

              <Button
                title={isSaving ? "Updating password..." : "Update Password"}
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
        </ScrollView>
      </KeyboardAvoidingView>

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
  contentContainer: {
    padding: 20,
    paddingTop: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTexts: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingSubLabel: {
    fontSize: 12,
  },
  inputDetails: {
    gap: 12,
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 12,
  },
});







