import { Button, Toast } from "@/components";
import { sendOtp, verifyOtp } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { OtpInput } from "react-native-otp-entry";

export default function OtpScreen() {
  const params = useLocalSearchParams<{
    email?: string;
    otp?: string;
    fromForgotPassword?: string;
  }>();

  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState<string>("");
  const [receivedOtp, setReceivedOtp] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"error" | "success" | "info">("error");
  const [fromForgotPassword, setFromForgotPassword] = useState(false);

  // Function to send OTP
  const handleSendOtp = async (userEmail?: string) => {
    const emailToUse = userEmail || email;
    if (!emailToUse) {
      setToastMessage("Email not found. Please register again.");
      setToastType("error");
      setShowToast(true);
      return;
    }

    try {
      const response = await sendOtp(emailToUse);
      console.log(response, "response");
      if (response.success) {
        // Extract OTP from response
        const otpValue = response.data?.otp || response.data?.data?.otp || "";
        if (otpValue) {
          setReceivedOtp(otpValue);
        }
        setToastMessage("OTP sent successfully to your email.");
        setToastType("success");
        setShowToast(true);
      } else {
        setToastMessage(response.error || response.message || "Failed to send OTP. Please try again.");
        setToastType("error");
        setShowToast(true);
      }
    } catch (error: any) {
      console.error("Send OTP error:", error);
      setToastMessage("Something went wrong. Please try again.");
      setToastType("error");
      setShowToast(true);
    }
  };

  // Initialize email and OTP from params or AsyncStorage
  useEffect(() => {
    const initializeData = async () => {
      // Check if coming from forgot password
      if (params.fromForgotPassword === "true" && params.email) {
        setEmail(params.email);
        setFromForgotPassword(true);

        // Set received OTP from params if available
        const otpParam = Array.isArray(params.otp) ? params.otp[0] : params.otp;
        if (otpParam) {
          setReceivedOtp(String(otpParam));
        }

        // Removed handleSendOtp here because forgotPassword API already sends the email
        return;
      }

      // Otherwise, get email from AsyncStorage (for registration flow)
      const fetchEmail = async () => {
        try {
          const authDataString = await AsyncStorage.getItem("authData");
          if (authDataString) {
            const authData = JSON.parse(authDataString);
            if (authData?.user?.email) {
              setEmail(authData.user.email);
              // Note: Backend already sent OTP during registration, so no need to call handleSendOtp here
            } else {
              setToastMessage("Email not found. Please register again.");
              setToastType("error");
              setShowToast(true);
            }
          } else {
            setToastMessage("No registration data found. Please register again.");
            setToastType("error");
            setShowToast(true);
          }
        } catch (error: any) {
          console.error("Error fetching email:", error);
          setToastMessage("Failed to load email. Please try again.");
          setToastType("error");
          setShowToast(true);
        }
      };

      fetchEmail();
    };

    initializeData();
  }, []);

  // Handle resend OTP
  const handleResend = async () => {
    setResending(true);
    await handleSendOtp();
    setResending(false);
  };

  // Handle OTP verification
  const handleVerify = async () => {
    if (otp.length !== 6) {
      setToastMessage("Please enter a valid 6-digit OTP.");
      setToastType("error");
      setShowToast(true);
      return;
    }

    if (!email) {
      setToastMessage("Email not found. Please register again.");
      setToastType("error");
      setShowToast(true);
      return;
    }

    setLoading(true);

    // If we have the OTP locally (frontend verification)
    if (receivedOtp) {
      if (otp === receivedOtp) {
        handleVerificationSuccess();
      } else {
        setToastMessage("Invalid OTP. Please try again.");
        setToastType("error");
        setShowToast(true);
        setLoading(false);
      }
      return;
    }

    if (fromForgotPassword) {
      handleVerificationSuccess();
      return;
    }

    try {
      const response = await verifyOtp(otp, email);
      console.log(JSON.stringify(response), "verify otp response");
      if (response.success) {
        handleVerificationSuccess(response.data);
      } else {
        setToastMessage(response.error || response.message || "Invalid OTP. Please try again.");
        setToastType("error");
        setShowToast(true);
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      setToastMessage("Something went wrong. Please try again.");
      setToastType("error");
      setShowToast(true);
      setLoading(false);
    }
  };

  const handleVerificationSuccess = (apiData?: any) => {
    setToastMessage("OTP verified successfully!");
    setToastType("success");
    setShowToast(true);

    // Navigate based on flow
    setTimeout(async () => {
      if (fromForgotPassword) {
        // Navigate to reset password screen with email and OTP
        router.replace({
          pathname: "/(auth)/reset",
          params: {
            email: email,
            otp: otp,
          },
        });
      } else {
        try {
          // If we have data from the verify OTP API (login/token data)
          if (apiData) {
            // Add userRole: "student" so the app knows which dashboard to load
            const authData = {
              ...apiData,
              userRole: "student",
            };

            // Save the complete auth data to AsyncStorage
            await AsyncStorage.setItem("authData", JSON.stringify(authData));
          }

          // Navigate directly to student dashboard
          router.replace("/(dashboard)/student-dashboard" as any);
        } catch (error) {
          console.error("Error saving auth data:", error);
          router.replace("/(dashboard)/student-dashboard" as any);
        }
      }
    }, 1500);
  };

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={["#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 1]}
      />

      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>
            We have sent a 6-digit code to your email{email ? ` (${email})` : ""}
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* OTP Input */}
          <OtpInput
            numberOfDigits={6}
            focusColor="#fff"
            onTextChange={(text) => setOtp(text)}
            theme={{
              containerStyle: styles.otpContainer,
              pinCodeContainerStyle: styles.otpBox,
              focusedPinCodeContainerStyle: styles.otpBoxFocused,
              pinCodeTextStyle: styles.otpText,
            }}
          />

          {/* Verify Button */}
          <Button
            title={loading ? "Verifying..." : "Verify"}
            onPress={handleVerify}
            variant="primary"
            disabled={loading || otp.length !== 6}
            forceLight={true}
          />

          {/* Resend Link */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendQuestion}>Didn't receive the code?</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleResend}
              disabled={resending}
            >
              <Text style={[styles.resendLink, resending && styles.resendLinkDisabled]}>
                {resending ? "Sending..." : "Resend"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Toast Notification */}
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
    backgroundColor: "#f2c44d",
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logo: {
    fontSize: 64,
    fontWeight: "800",
    color: "#333",
    letterSpacing: 4,
    textShadowColor: "rgba(255, 255, 255, 0.75)",
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
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 28,
    padding: 36,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.15)",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    gap: 36,
  },
  otpContainer: {
    gap: 5,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  otpBox: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(51, 51, 51, 0.25)",
    backgroundColor: "#FFFFFF",
    width: 40,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  otpBoxFocused: {
    borderColor: "#f2c44d",
    backgroundColor: "#FFFEF5",
    borderWidth: 3,
    shadowColor: "#f2c44d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  otpText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 0.5,
  },
  verifyButton: {
    backgroundColor: "#333",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  verifyText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.5,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  resendQuestion: {
    color: "rgba(51, 51, 51, 0.7)",
    fontSize: 14,
  },
  resendLink: {
    color: "#333",
    fontWeight: "700",
    fontSize: 14,
  },
  resendLinkDisabled: {
    opacity: 0.5,
  },
});
