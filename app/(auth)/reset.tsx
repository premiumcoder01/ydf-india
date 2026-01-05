import { Button, CustomTextInput, Toast } from "@/components";
import { resetPassword } from "@/utils/api";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    email?: string;
    otp?: string;
  }>();

  console.log("Reset Params:", JSON.stringify(params, null, 2));

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success" | "info">("error");

  useEffect(() => {
    // Handle params - expo-router sometimes converts params to arrays
    const emailParam = Array.isArray(params.email) ? params.email[0] : params.email;
    const otpParam = Array.isArray(params.otp) ? params.otp[0] : params.otp;

    if (emailParam) {
      setEmail(emailParam.trim());
    }
    if (otpParam) {
      setOtp(otpParam.trim());
    }
  }, [params]);

  const showToast = (message: string, type: "error" | "success" | "info" = "error") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const validate = () => {
    const nextErrors: { password?: string; confirmPassword?: string } = {};
    if (password.length < 6) nextErrors.password = "Minimum 6 characters";
    if (confirmPassword.length < 6)
      nextErrors.confirmPassword = "Minimum 6 characters";
    if (
      !nextErrors.password &&
      !nextErrors.confirmPassword &&
      password !== confirmPassword
    )
      nextErrors.confirmPassword = "Passwords do not match";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;

    if (!email || !otp) {
      showToast("Email or OTP is missing. Please try again.");
      return;
    }

    setSubmitting(true);

    try {
      console.log("Submitting Reset with:", { email, otp, password });
      // Call reset password API
      const response = await resetPassword(email, otp, password);
      console.log(response, '12334422');

      if (response.success) {
        // Success - show success message and navigate to sign in
        showToast("Password reset successfully! Please sign in with your new password.", "success");
        setTimeout(() => {
          router.replace("/(auth)/sign-in");
        }, 1500);
      } else {
        // Show error toast
        showToast(response.error || response.message || "Failed to reset password. Please try again.");
        setSubmitting(false);
      }
    } catch (error) {
      console.error("Error during password reset:", error);
      showToast("An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Toast Component */}
      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={hideToast}
      />

      {/* Gradient Background */}
      <LinearGradient
        colors={["#f2c44d", "#f2c44d", "#fff"]}
        style={styles.background}
        locations={[0, 0.7, 1]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Image
              source={require("@/assets/appImages/new.png")}
              resizeMode="contain"
              style={{ width: 150, height: 150, marginBottom: 20 }}
            />
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your new password below
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Password Input */}
            <CustomTextInput
              label="New Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={true}
              error={errors.password}
              focused={focusedField === "password"}
              showPasswordToggle={true}
              forceLight={true}
            />

            {/* Confirm Password Input */}
            <CustomTextInput
              label="Confirm Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setFocusedField("confirmPassword")}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={true}
              error={errors.confirmPassword}
              focused={focusedField === "confirmPassword"}
              showPasswordToggle={true}
              forceLight={true}
            />

            {/* Update Password Button */}
            <Button
              title={submitting ? "Updating..." : "Update password"}
              onPress={onSubmit}
              disabled={submitting}
              loading={submitting}
              variant="primary"
              forceLight={true}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2c44d",
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    fontSize: 64,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 4,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
    textShadowColor: "rgba(255, 255, 255, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.2)",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(51, 51, 51, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputFocused: {
    borderColor: "#f2c44d",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  inputError: {
    borderColor: "rgba(239, 68, 68, 0.8)",
  },
  input: {
    fontSize: 16,
    color: "#333",
    paddingVertical: 12,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    marginTop: 6,
    fontWeight: "500",
  },
  updateButton: {
    backgroundColor: "#333",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 4,
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  updateText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.5,
  },
});