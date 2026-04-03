import { Button, CustomTextInput, Toast } from "@/components";
import { registerUser } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
    consent?: string;
  }>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const inset = useSafeAreaInsets();


  // Generate username from firstname + lastname + random number
  const generateUsername = (first: string, last: string): string => {
    const firstName = first.trim().toLowerCase().replace(/\s+/g, "");
    const lastName = last.trim().toLowerCase().replace(/\s+/g, "");
    const randomNum = Math.floor(Math.random() * 10000);
    return `${firstName}${lastName}${randomNum}`;
  };

  // Real-time validation functions
  const validateFirstName = (value: string) => {
    const nameRegex = /^[A-Za-z\s.-]+$/;
    if (value.trim().length >= 2 && nameRegex.test(value.trim())) {
      setErrors(prev => ({ ...prev, firstName: undefined }));
    } else if (value.trim().length > 0 && !nameRegex.test(value.trim())) {
      setErrors(prev => ({ ...prev, firstName: "First name can only contain letters" }));
    }
  };

  const validateLastName = (value: string) => {
    const nameRegex = /^[A-Za-z\s.-]+$/;
    if (value.trim().length >= 2 && nameRegex.test(value.trim())) {
      setErrors(prev => ({ ...prev, lastName: undefined }));
    } else if (value.trim().length > 0 && !nameRegex.test(value.trim())) {
      setErrors(prev => ({ ...prev, lastName: "Last name can only contain letters" }));
    }
  };

  const validateEmail = (value: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const lowerEmail = value.toLowerCase();

    if (emailRegex.test(value) && !(lowerEmail.includes("@gmail.") && !lowerEmail.endsWith("@gmail.com"))) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const validatePhone = (value: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    if (phoneRegex.test(value)) {
      setErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  const validatePassword = (value: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;
    if (passwordRegex.test(value)) {
      setErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  const validateConfirmPassword = (value: string) => {
    if (value.length >= 6 && value === password) {
      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const validate = () => {
    const nextErrors: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      password?: string;
      confirmPassword?: string;
      consent?: string;
    } = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const nameRegex = /^[A-Za-z\s.-]+$/;

    if (firstName.trim().length < 2)
      nextErrors.firstName = "Enter your first name";
    else if (!nameRegex.test(firstName.trim()))
      nextErrors.firstName = "First name can only contain letters";

    if (lastName.trim().length < 2)
      nextErrors.lastName = "Enter your last name";
    else if (!nameRegex.test(lastName.trim()))
      nextErrors.lastName = "Last name can only contain letters";
    // Strict check for common domain typos
    const lowerEmail = email.toLowerCase();
    if (!emailRegex.test(email)) {
      nextErrors.email = "Enter a valid email";
    } else if (
      lowerEmail.includes("@gmail.") &&
      !lowerEmail.endsWith("@gmail.com")
    ) {
      nextErrors.email = "Did you mean @gmail.com?";
    }
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone))
      nextErrors.phone = "Enter a valid 10-digit mobile number";
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;
    if (!passwordRegex.test(password)) {
      nextErrors.password =
        "Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, & 1 special character";
    }
    if (confirmPassword.length < 6)
      nextErrors.confirmPassword = "Minimum 6 characters";
    if (
      !nextErrors.password &&
      !nextErrors.confirmPassword &&
      password !== confirmPassword
    )
      nextErrors.confirmPassword = "Passwords do not match";

    if (!consentChecked) {
      nextErrors.consent = "Please agree to the terms to continue";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async () => {
    // Validate form fields
    if (!validate()) {
      setSubmitting(false);
      return;
    }

    setSubmitting(true);

    try {
      // Generate username
      const username = generateUsername(firstName, lastName);

      // Get phone number with country code
      let phoneNumber = phone.replace(/\D/g, ""); // Remove all non-digits
      if (phoneNumber.length === 10) {
        phoneNumber = "91" + phoneNumber;
      }

      // Call registration API
      const response = await registerUser({
        username: username,
        password: password,
        email: email.trim(),
        firstname: firstName.trim(),
        lastname: lastName.trim(),
        phone: phoneNumber,
      });
      // Check if registration was successful
      if (response.success && response.data) {
        console.log(response, "response.data");

        await AsyncStorage.setItem("authData", JSON.stringify(response.data));

        // Navigate to OTP screen
        router.replace("/(auth)/otp");
      } else {
        // Show toast with API error message
        setToastMessage(response.error || response.message || "Registration failed. Please try again.");
        setShowToast(true);
        setSubmitting(false);
      }
    } catch (error: any) {
      // Handle unexpected errors
      console.error("Registration error:", error);
      setToastMessage(
        error.message || "Something went wrong. Please try again."
      );
      setShowToast(true);
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: inset.bottom, paddingTop: inset.top }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to start your journey</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* First Name Input */}
            <CustomTextInput
              label="First Name"
              placeholder="Your first name"
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                validateFirstName(text);
              }}
              onFocus={() => setFocusedField("firstName")}
              onBlur={() => setFocusedField(null)}
              error={errors.firstName}
              focused={focusedField === "firstName"}
              forceLight={true}
            />

            {/* Last Name Input */}
            <CustomTextInput
              label="Last Name"
              placeholder="Your last name"
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                validateLastName(text);
              }}
              onFocus={() => setFocusedField("lastName")}
              onBlur={() => setFocusedField(null)}
              error={errors.lastName}
              focused={focusedField === "lastName"}
              forceLight={true}
            />

            {/* Email Input */}
            <CustomTextInput
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                validateEmail(text);
              }}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              focused={focusedField === "email"}
              forceLight={true}
            />

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View
                style={[
                  styles.phoneContainer,
                  focusedField === "phone" && styles.phoneFocused,
                  errors.phone && styles.phoneError,
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", height: 48 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginRight: 10,
                      paddingRight: 10,
                      borderRightWidth: 1,
                      borderRightColor: "rgba(51, 51, 51, 0.1)",
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>🇮🇳</Text>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#333", marginLeft: 8 }}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.phoneTextInput, { flex: 1 }]}
                    value={phone}
                    onChangeText={(text) => {
                      const numeric = text.replace(/[^0-9]/g, "");
                      if (numeric.length <= 10) {
                        setPhone(numeric);
                        validatePhone(numeric);
                      }
                    }}
                    onFocus={() => setFocusedField("phone")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Mobile Number"
                    placeholderTextColor="rgba(51, 51, 51, 0.4)"
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
              </View>
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>

            {/* Password Input */}
            <CustomTextInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                validatePassword(text);
                // Re-validate confirm password if it has a value
                if (confirmPassword) {
                  if (confirmPassword.length >= 6 && confirmPassword === text) {
                    setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                  } else if (errors.confirmPassword === undefined) {
                    // Only set error if passwords don't match and no error exists
                    if (confirmPassword !== text) {
                      setErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }));
                    }
                  }
                }
              }}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={true}
              error={errors.password}
              focused={focusedField === "password"}
              showPasswordToggle={true}
              forceLight={true}
            />
            <Text style={styles.passwordHelper}>
              Must be at least 8 characters, including 1 uppercase, 1 lowercase, 1
              number, and 1 special character.
            </Text>

            {/* Confirm Password Input */}
            <CustomTextInput
              label="Confirm Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                validateConfirmPassword(text);
              }}
              onFocus={() => setFocusedField("confirmPassword")}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={true}
              error={errors.confirmPassword}
              focused={focusedField === "confirmPassword"}
              showPasswordToggle={true}
              forceLight={true}
            />

            {/* Consent Section */}
            <View style={styles.consentContainer}>
              <View style={[styles.consentBox, errors.consent && styles.consentBoxError]}>
                <Text style={styles.consentHeader}>Consent for Use of Information</Text>
                <Text style={styles.consentText}>
                  By signing up, you consent to the collection and use of the personal, academic, and financial information you provide solely for the purpose of processing and managing your scholarship application.
                </Text>
                <Text style={styles.consentText}>
                  Your information will be kept confidential and used only for scholarship-related activities, as required by the program or policy.
                </Text>

                <View style={styles.consentDivider} />

                <Text style={[styles.consentHeader, { marginTop: 0 }]}>जानकारी के उपयोग के लिए सहमति</Text>
                <Text style={styles.consentTextHindi}>
                  साइन अप करके आप अपनी व्यक्तिगत, शैक्षणिक और वित्तीय जानकारी के संग्रह और उपयोग के लिए सहमति देते हैं, जिसका उपयोग केवल आपकी छात्रवृत्ति आवेदन प्रक्रिया को संचालित और प्रबंधित करने के उद्देश्य से किया जाएगा।
                </Text>
                <Text style={styles.consentTextHindi}>
                  आपकी जानकारी गोपनीय रखी जाएगी और केवल छात्रवृत्ति से संबंधित गतिविधियों के लिए ही उपयोग की जाएगी, जैसा कि कार्यक्रम या नीति के अनुसार आवश्यक है।
                </Text>
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.8}
                onPress={() => {
                  setConsentChecked(!consentChecked);
                  if (!consentChecked) setErrors(prev => ({ ...prev, consent: undefined }));
                }}
              >
                <View style={[
                  styles.checkbox,
                  consentChecked && styles.checkboxActive,
                  errors.consent && styles.checkboxError
                ]}>
                  {consentChecked && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </View>
                <Text style={[styles.checkboxLabel, errors.consent && { color: "rgba(239, 68, 68, 1)" }]}>
                  I agree to the above terms and provide my consent
                </Text>
                {errors.consent && (
                  <Ionicons name="alert-circle" size={18} color="rgba(239, 68, 68, 1)" style={{ marginLeft: "auto" }} />
                )}
              </TouchableOpacity>
            </View>

            {/* Create Account Button */}
            <Button
              title={submitting ? "Register account..." : "Register"}
              onPress={onSubmit}
              disabled={submitting}
              loading={submitting}
              variant="primary"
              forceLight={true}
            />


          </View>

          {/* Sign In Link */}
          <View style={styles.signInContainer}>
            <Text style={styles.signInQuestion}>Already have an account?</Text>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.signInLink}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type="error"
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
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
    color: "rgba(239, 68, 68, 1)",
    fontSize: 13,
    marginTop: 6,
    fontWeight: "500",
  },
  signUpButton: {
    backgroundColor: "#333",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
  },
  signUpButtonDisabled: {
    opacity: 0.7,
  },
  signUpText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(51, 51, 51, 0.2)",
  },
  dividerText: {
    color: "rgba(51, 51, 51, 0.6)",
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "500",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderWidth: 1.5,
    borderColor: "rgba(51, 51, 51, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
  },
  signInQuestion: {
    color: "rgba(51, 51, 51, 0.7)",
    fontSize: 15,
  },
  signInLink: {
    color: "#333",
    fontWeight: "700",
    fontSize: 15,
  },
  phoneContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(51, 51, 51, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  phoneFocused: {
    borderColor: "#f2c44d",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  phoneError: {
    borderColor: "rgba(239, 68, 68, 0.8)",
  },
  phoneInputContainer: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    margin: 0,
    height: 48,
  },
  phoneTextContainer: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    margin: 0,
    height: 48,
  },
  phoneTextInput: {
    fontSize: 16,
    color: "#333",
    paddingVertical: 12,
    backgroundColor: "transparent",
    height: 48,
  },

  passwordHelper: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    marginBottom: 16,
    marginLeft: 4,
  },

  // Consent Styles
  consentContainer: {
    marginVertical: 24,
  },
  consentBox: {
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    marginBottom: 16,
  },
  consentBoxError: {
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(239, 68, 68, 0.02)",
  },
  consentHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: "#333",
    marginBottom: 10,
    marginTop: 4,
  },
  consentText: {
    fontSize: 12,
    color: "#555",
    lineHeight: 18,
    marginBottom: 10,
  },
  consentTextHindi: {
    fontSize: 12,
    color: "#555",
    lineHeight: 20,
    marginBottom: 10,
  },
  consentDivider: {
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    marginVertical: 12,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 4,
    paddingBottom: 24, // Increased space before button
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2, // Align with first line of text
  },
  checkboxActive: {
    backgroundColor: "#333",
    borderColor: "#333",
  },
  checkboxError: {
    borderColor: "rgba(239, 68, 68, 1)",
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    flex: 1,
  },
});
