import { Button, Toast } from "@/components";
import { sendOtp, verifyOtp } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function OtpScreen() {
  const params = useLocalSearchParams<{
    email?: string;
    otp?: string;
    fromForgotPassword?: string;
  }>();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState<string>("");
  const [receivedOtp, setReceivedOtp] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"error" | "success" | "info">("error");
  const [fromForgotPassword, setFromForgotPassword] = useState(false);

  // Refs for OTP input boxes
  const inputRefs = useRef<(TextInput | null)[]>([]);

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

  // Handle OTP input change
  const handleOtpChange = (value: string, index: number) => {
    // Only allow single digit
    if (value.length > 1) {
      value = value.charAt(value.length - 1);
    }

    // Only allow numbers
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace/delete with improved logic
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      // If current box has value, clear it (don't move focus)
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
        // Don't move focus, stay on current box
      } else if (index > 0) {
        // If current box is empty, move to previous box and clear it
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
      // Prevent default backspace behavior
      e.preventDefault();
    }
  };

  // Handle resend OTP
  const handleResend = async () => {
    setResending(true);
    await handleSendOtp();
    setResending(false);
  };

  // Handle OTP verification
  const handleVerify = async () => {
    const otpString = otp.join("");

    if (otpString.length !== 6) {
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
      if (otpString === receivedOtp) {
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
      const response = await verifyOtp(otpString, email);
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
            otp: otp.join(""),
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-unread" size={36} color="#333" />
            </View>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>
              We have sent a 6-digit verification code to
              <Text style={styles.emailText}>{email ? `\n${email}` : ""}</Text>
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Custom OTP Input */}
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpBox,
                    digit && styles.otpBoxFilled,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => {
                    // Select text when box is focused (for easy replacement)
                    if (digit) {
                      inputRefs.current[index]?.setNativeProps({
                        selection: { start: 0, end: 1 }
                      });
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  textAlign="center"
                  placeholder="-"
                  placeholderTextColor="rgba(51, 51, 51, 0.3)"
                />
              ))}
            </View>

            {/* Verify Button */}
            <Button
              title={loading ? "Verifying..." : "Verify Code"}
              onPress={handleVerify}
              variant="primary"
              disabled={loading || otp.join("").length !== 6}
              forceLight={true}
            />

            {/* Resend Link */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendQuestion}>
                Didn't receive the code?
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleResend}
                disabled={resending}
              >
                <Text
                  style={[
                    styles.resendLink,
                    resending && styles.resendLinkDisabled,
                  ]}
                >
                  {resending ? "Sending..." : "Resend"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(51, 51, 51, 0.8)",
    textAlign: "center",
    paddingHorizontal: 10,
    lineHeight: 22,
  },
  emailText: {
    fontWeight: "700",
    color: "#333",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    gap: 32,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingVertical: 4,
  },
  otpBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(51, 51, 51, 0.15)",
    backgroundColor: "#F9FAFB",
    width: "14.5%", 
    aspectRatio: 0.85, 
    fontSize: 22,
    fontWeight: "800",
    color: "#333",
    shadowColor: "rgba(0, 0, 0, 0.04)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  otpBoxFilled: {
    borderColor: "#333",
    backgroundColor: "#fff",
    borderWidth: 2,
    shadowColor: "rgba(51, 51, 51, 0.15)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  otpBoxFocused: {
    borderColor: "#333",
    backgroundColor: "#fff",
    borderWidth: 2.5,
    shadowColor: "rgba(51, 51, 51, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
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
