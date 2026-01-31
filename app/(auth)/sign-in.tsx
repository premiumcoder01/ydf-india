import { Button, CustomTextInput, Toast } from "@/components";
import { LinkedInLogin } from "@/components/LinkedInLogin";
import { loginUser, socialLogin } from "@/utils/api";
import { completeDigiLockerAuth, loginWithDigiLocker, useDigiLockerWebView } from "@/utils/digilockerAuth";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";


import {
  GoogleSignin
} from '@react-native-google-signin/google-signin';



// Helper function to get dashboard route based on role
const getDashboardRoute = (roleKey: string): string => {
  const routeMap: Record<string, string> = {
    student: "/(dashboard)/student-dashboard",
    "application-reviewer": "/(dashboard)/application-reviewer",
    "scholarship-provider": "/(dashboard)/scholarship-provider",
    "student-mobilizer": "/(dashboard)/student-mobilizer",
  };
  return routeMap[roleKey] || "/(auth)/welcome";
};

// Helper function to normalize role name from API to route key
const normalizeRole = (role: string): string => {
  const roleLower = role.toLowerCase().trim();
  // Map common role variations to route keys
  if (roleLower === "student") return "student";
  if (
    roleLower === "reviewer" ||
    roleLower === "application reviewer" ||
    roleLower === "application-reviewer"
  )
    return "application-reviewer";

  if (
    roleLower === "scholarship provider" ||
    roleLower === "scholarship-provider" ||
    roleLower === "donor"
  )
    return "scholarship-provider";

  if (
    roleLower === "studentmobilizer" ||
    roleLower === "student mobilizer" ||
    roleLower === "student-mobilizer" ||
    roleLower === "counselor" ||
    roleLower === "editingteacher"
  )
    return "student-mobilizer";

  // Return lowercase version if no match
  return roleLower;
};

export default function SignInScreen() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    emailOrUsername?: string;
    password?: string;
  }>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [linkedinModalVisible, setLinkedinModalVisible] = useState(false);

  // WebView hook for DigiLocker authentication
  const { WebViewComponent, show: showWebView } = useDigiLockerWebView();

  GoogleSignin.configure({
    webClientId: '1001621686502-jopl8tosnhl2d71blsncqs3gte656tds.apps.googleusercontent.com',
    iosClientId: '1001621686502-9fifki7bjqknjshv0rroodrusj1das0m.apps.googleusercontent.com',
  });

  const handleLoginSuccess = async (response: any, defaultToStudent: boolean = false) => {
    try {
      const userRoles = response.data?.user?.roles;
      const authData = response.data;

      console.log("✅ Login Success. Processing Roles:", userRoles);

      if (userRoles && Array.isArray(userRoles) && userRoles.length > 0) {
        // Normalize all roles
        const normalizedRoles = userRoles.map((role: string) => normalizeRole(role));
        console.log("Normalized Roles:", normalizedRoles);

        let selectedRole = null;

        // Priority 1: Scholarship Provider
        if (normalizedRoles.includes("scholarship-provider")) {
          selectedRole = "scholarship-provider";
        }
        // Priority 2: Student Mobilizer (includes Editingteacher)
        else if (normalizedRoles.includes("student-mobilizer")) {
          selectedRole = "student-mobilizer";
        }
        // Priority 3: Application Reviewer
        else if (normalizedRoles.includes("application-reviewer")) {
          selectedRole = "application-reviewer";
        }
        // Priority 4: Student (Fallback if exists)
        else if (normalizedRoles.includes("student")) {
          selectedRole = "student";
        }

        // If no known role found in priority list, verify if any role has a valid route (fallback logic)
        if (!selectedRole) {
          for (const role of normalizedRoles) {
            const route = getDashboardRoute(role);
            if (route !== "/(auth)/welcome") {
              selectedRole = role;
              break;
            }
          }
        }

        console.log("🔹 Final Selected Role:", selectedRole);

        if (selectedRole) {
          const dashboardRoute = getDashboardRoute(selectedRole);
          console.log("🔹 Target Route:", dashboardRoute);

          authData.userRole = selectedRole;
          await AsyncStorage.setItem("authData", JSON.stringify(authData));
          router.replace(dashboardRoute as any);
          return;
        }

        // If still no valid role found:
        if (defaultToStudent) {
          console.log("⚠️ No valid dashboard for role, defaulting to Student for social login");
          const studentRole = "student";
          authData.userRole = studentRole;
          await AsyncStorage.setItem("authData", JSON.stringify(authData));
          router.replace(getDashboardRoute(studentRole) as any);
        } else {
          console.log("⚠️ No valid dashboard for role, redirecting to Role Selection");
          await AsyncStorage.setItem("authData", JSON.stringify(authData));
          router.replace("/(auth)/roles");
        }

      } else {
        // No roles found in response
        if (defaultToStudent) {
          console.log("ℹ️ No roles found, auto-assigning Student role");
          const studentRole = "student";
          authData.userRole = studentRole;
          await AsyncStorage.setItem("authData", JSON.stringify(authData));
          router.replace(getDashboardRoute(studentRole) as any);
        } else {
          console.log("ℹ️ No roles found, redirecting to Role Selection");
          await AsyncStorage.setItem("authData", JSON.stringify(authData));
          router.replace("/(auth)/roles");
        }
      }
    } catch (error) {
      console.error("Error in handleLoginSuccess:", error);
      showToast("An error occurred during redirection.");
    }
  };

  const validate = () => {
    const nextErrors: { emailOrUsername?: string; password?: string } = {};
    const emailRegex = /^(?:[^\s@]+@[^\s@]+\.[^\s@]+)$/;

    // Check if input is empty
    if (!emailOrUsername.trim()) {
      nextErrors.emailOrUsername = "Enter your email or username";
    } else {
      // If input looks like an email (has @), validate its format.
      // Otherwise, assume it's a username and accept it (no regex validation).
      if (emailOrUsername.includes("@") && !emailRegex.test(emailOrUsername.trim())) {
        nextErrors.emailOrUsername = "Enter a valid email address";
      }
    }

    if (password.length < 6) nextErrors.password = "Minimum 6 characters";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const response = await loginUser(emailOrUsername.trim(), password);
      if (response.success) {
        await handleLoginSuccess(response, false);
      } else {
        showToast(response.error || response.message || "Invalid credentials. Please try again.");
      }
    } catch (error) {
      console.error("Error during login:", error);
      showToast("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const digilockerLogin = async () => {
    try {
      setSubmitting(true);
      const digiLockerResult = await loginWithDigiLocker(showWebView);
      if (!digiLockerResult) {
        console.log("ℹ️ DigiLocker login cancelled by user");
        setSubmitting(false);
        return;
      }

      console.log("✅ DigiLocker authorization code received");
      console.log("📋 Authorization Code:", digiLockerResult.authorizationCode.substring(0, 10) + "...");
      const { token, userInfo } = await completeDigiLockerAuth(digiLockerResult);

      // Call social login API with DigiLocker access token
      console.log("🔄 Calling social login with DigiLocker token...", token);
      console.log("✅ DigiLocker user info received:", userInfo);
      

      // Prefer email from user info; fallback to token, else generate placeholder.
      let userEmail = (userInfo as any).email || (token as any).email;
      if (!userEmail) {
        // Generate email: first 10 chars of access token + @digilocker.com
        const shortToken = token.access_token.substring(0, 10);
        userEmail = `${shortToken}@digilocker.com`;
        console.log("⚠️ No email from DigiLocker, generated placeholder:", userEmail);
      }

      const apiResponse = await socialLogin("digilocker", token.access_token, userEmail);

      if (apiResponse.success && apiResponse.data) {
        await handleLoginSuccess(apiResponse, true);
      } else {
        // Show error toast
        showToast(apiResponse.error || apiResponse.message || "DigiLocker login failed. Please try again.");
      }

      setSubmitting(false);
      return;
    } catch (error: any) {
      console.error("❌ DigiLocker Login Error:", error);
      if (
        error?.message?.toLowerCase().includes("cancel") ||
        error?.message?.toLowerCase().includes("dismiss")
      ) {
        return;
      }
      showToast(
        error?.message ||
        "Something went wrong during DigiLocker login."
      );
    } finally {
      setSubmitting(false);
    }
  };



  const signIn = async () => {
    try {
      setSubmitting(true);

      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();

      // Sign in with Google
      const googleResponse = await GoogleSignin.signIn();
      console.log("Google Sign In Response: ", googleResponse);

      // Check if sign in was successful and has idToken
      if (googleResponse.type === "success" && googleResponse.data?.idToken) {
        const idToken = googleResponse.data.idToken;

        // Call social login API
        const apiResponse = await socialLogin("google", idToken);

        if (apiResponse.success && apiResponse.data) {
          await handleLoginSuccess(apiResponse, true);
        } else {
          // Show error toast
          showToast(apiResponse.error || apiResponse.message || "Google login failed. Please try again.");
        }
      } else {
        showToast("Google sign in was cancelled or failed.");
      }
    } catch (error: any) {
      console.log("Google Sign In Error: ", error);

      // Handle specific Google Sign In errors
      if (error.code === "SIGN_IN_CANCELLED") {
        // User cancelled, don't show error
        return;
      } else if (error.code === "IN_PROGRESS") {
        showToast("Sign in is already in progress.");
      } else if (error.code === "PLAY_SERVICES_NOT_AVAILABLE") {
        showToast("Google Play Services are not available.");
      } else {
        showToast("An error occurred during Google sign in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const linkedinLogin = () => {
    setLinkedinModalVisible(true);
  };



  return (
    <View style={styles.container}>
      {/* Toast Component */}
      <Toast
        message={toastMessage}
        type="error"
        visible={toastVisible}
        onHide={hideToast}
      />

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
          <View style={styles.header}>
            <Image
              source={require("@/assets/appImages/new.png")}
              resizeMode="contain"
              style={{ width: 150, height: 150 }}
            />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue your journey
            </Text>
          </View>
          <View style={styles.card}>
            <CustomTextInput
              label="Email or Username"
              placeholder="Enter email or username"
              value={emailOrUsername}
              onChangeText={setEmailOrUsername}
              onFocus={() => setFocusedField("emailOrUsername")}
              onBlur={() => setFocusedField(null)}
              keyboardType="default"
              autoCapitalize="none"
              error={errors.emailOrUsername}
              focused={focusedField === "emailOrUsername"}
              forceLight={true}
            />

            {/* Password Input */}
            <CustomTextInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              error={errors.password}
              focused={focusedField === "password"}
              secureTextEntry={true}
              showPasswordToggle={true}
              forceLight={true}
            />



            {/* Forgot Password */}
            <View style={styles.forgotContainer}>
              <Link href="/(auth)/forgot" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Sign In Button */}
            <Button
              title={submitting ? "Signing in..." : "Sign in"}
              onPress={onSubmit}
              disabled={submitting}
              loading={submitting}
              variant="primary"
              forceLight={true}
            />

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialContainer}>
              <Button
                title=""
                onPress={() => signIn()}
                variant="social"
                style={styles.socialButton}
                forceLight={true}
              >
                <Ionicons name="logo-google" size={20} color="#333" />
              </Button>

              <Button
                title=""
                onPress={() => linkedinLogin()}
                variant="social"
                style={styles.socialButton}
                forceLight={true}
              >
                <Ionicons name="logo-linkedin" size={20} color="#333" />
              </Button>

              {Platform.OS === 'ios' && (
                <Button
                  title=""
                  onPress={() => {
                    Alert.alert("Coming Soon", "This feature will be available soon.");
                  }}
                  variant="social"
                  style={styles.socialButton}
                  forceLight={true}
                >
                  <Ionicons name="logo-apple" size={20} color="#333" />
                </Button>
              )}

              {/* DigiLocker */}
              <Button
                title=""
                onPress={() => digilockerLogin()}
                variant="social"
                style={styles.socialButton}
                forceLight={true}
              >
                <Image
                  source={require("../../assets/appImages/digi.png")}
                  style={{ width: 25, height: 25, tintColor: "#333" }}
                />
              </Button>
            </View>
          </View>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpQuestion}>New here?</Text>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.signUpLink}>Create an account</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>


      <LinkedInLogin
        visible={linkedinModalVisible}
        onClose={() => setLinkedinModalVisible(false)}
        clientID={process.env.EXPO_PUBLIC_LINKEDIN_CLIENT_ID || ""}
        clientSecret={process.env.EXPO_PUBLIC_LINKEDIN_CLIENT_SECRET || ""}
        redirectUri="https://testing.ydfindia.org/admin/oauth2callback.php"
        onSuccess={async (accessToken) => {
          console.log("LinkedIn login successful", accessToken);
          setSubmitting(true);

          try {
            // Fetch User Profile from LinkedIn
            const response = await fetch('https://api.linkedin.com/v2/userinfo', {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });

            const userData = await response.json();
            console.log("LinkedIn User Data:", userData);

            // Now call your backend social login API with the token (and potentially user data if needed)
            // Call social login API with LinkedIn access token
            // Now call your backend social login API with the token (and potentially user data if needed)
            // Call social login API with LinkedIn access token
            const apiResponse = await socialLogin("linkedin", accessToken);

            if (apiResponse.success && apiResponse.data) {
              await handleLoginSuccess(apiResponse, true);
            } else {
              // Show error toast
              showToast(apiResponse.error || apiResponse.message || "LinkedIn login failed. Please try again.");
            }
          } catch (error: any) {
            console.error("LinkedIn profile fetch error:", error);
            showToast("Failed to fetch LinkedIn profile: " + error.message);
          } finally {
            setSubmitting(false);
          }
        }}
        onFailure={(err) => {
          console.log("LinkedIn login failed", err);
          showToast(`LinkedIn login failed: ${err}`);
        }}
      />
      {WebViewComponent}
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
    flexDirection: "row",
    alignItems: "center",
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
    flex: 1,
  },
  passwordToggle: {
    padding: 8,
    marginRight: -8,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    marginTop: 6,
    fontWeight: "500",
  },
  forgotContainer: {
    alignItems: "flex-end",
    marginBottom: 24,
  },
  forgotText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 14,
  },
  signInButton: {
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
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInText: {
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
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
  },
  signUpQuestion: {
    color: "rgba(51, 51, 51, 0.7)",
    fontSize: 15,
  },
  signUpLink: {
    color: "#333",
    fontWeight: "700",
    fontSize: 15,
  },
});
