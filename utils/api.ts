import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { getApiUrl } from "./apiConfig";

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorcode?: string; // Moodle error codes like 'accountnotverified', 'invalidtoken', etc.
}

// API Error types
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

/**
 * Helper function to check for authentication errors
 * Returns true if user should be logged out, false otherwise
 */
async function checkAuthenticationError(data: any): Promise<boolean> {
  // Check for invalid/expired token
  if (data?.errorcode === "invalidtoken" || data?.data?.errorcode === "invalidtoken") {
    console.log("🔒 Invalid token detected - logging out user");
    await AsyncStorage.removeItem("authData");
    router.replace("/(auth)/sign-in");
    return true;
  }

  if (data?.errorcode === "accountinactive" || data?.data?.errorcode === "accountinactive") {
    console.log("🔒 Account inactive detected - logging out user");
    await AsyncStorage.removeItem("authData");
    router.replace("/(auth)/sign-in");
    return true;
  }

  if (data?.errorcode === "usernotfullysetup" || data?.data?.errorcode === "usernotfullysetup") {
    console.log("⚠️ User profile not fully setup - redirecting to profile completion");
    // Store the auth data to keep user logged in
    // Just redirect to profile setup screen
    router.replace("/(auth)/sign-in");
    return true;
  }

  return false;
}

/**
 * Make API request with error handling
 */
export const apiRequest = async (
  endpoint: string,
  params: Record<string, string>,
  method: "GET" | "POST" = "GET"
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl(endpoint);
    let finalUrl = baseUrl;
    let requestOptions: RequestInit = {
      method: method,
      headers: {},
    };

    // For GET requests, add params to URL
    // For POST requests, add params to body
    if (method === "GET") {
      const urlObj = new URL(baseUrl);
      Object.keys(params).forEach((key) => {
        urlObj.searchParams.append(key, params[key]);
      });
      finalUrl = urlObj.toString();
      requestOptions.headers = {
        "Content-Type": "application/json",
      };
    } else {
      // POST request - send data in body as form-urlencoded
      requestOptions.headers = {
        "Content-Type": "application/x-www-form-urlencoded",
      };
      requestOptions.body = new URLSearchParams(params).toString();
    }

    // Make the request
    const response = await fetch(finalUrl, requestOptions);

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || data.success || "Request successful",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Request failed",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Registration API call (POST)
 */
export const registerUser = async (userData: {
  username: string;
  password: string;
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
}): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("local/mobileapi/registration.php");
    const urlObj = new URL(baseUrl);

    // Add query parameters
    urlObj.searchParams.append("username", userData.username);
    urlObj.searchParams.append("password", userData.password);
    urlObj.searchParams.append("email", userData.email);
    urlObj.searchParams.append("emailagain", userData.email); // API requires email confirmation
    urlObj.searchParams.append("firstname", userData.firstname);
    urlObj.searchParams.append("lastname", userData.lastname);
    urlObj.searchParams.append("phone", userData.phone);

    const finalUrl = urlObj.toString();
    console.log("Registration URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Registration successful",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Registration failed",
        message: data.message || "Registration failed",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Login API call (POST with query parameters)
 */
export const loginUser = async (email: string, password: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("local/mobileapi/login.php");
    const urlObj = new URL(baseUrl);

    // Add query parameters - using username for email as per API requirement
    urlObj.searchParams.append("username", email);
    urlObj.searchParams.append("password", password);

    const finalUrl = urlObj.toString();
    console.log("Login URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Login successful",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Invalid credentials",
        message: data.message || "Login failed",
        errorcode: data.errorcode || data.exception, // Include error code from Moodle
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Send OTP API call (POST with query parameters)
 */
export const sendOtp = async (email: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("local/mobileapi/send_otp.php");
    const urlObj = new URL(baseUrl);

    // Add query parameters
    urlObj.searchParams.append("wsfunction", "local_mobileapi_send_otp");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("email", email);
    urlObj.searchParams.append("identifier", "email");

    const finalUrl = urlObj.toString();

    console.log(finalUrl, "finalUrl");
    console.log(email, "email");

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "OTP sent successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to send OTP",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Verify OTP API call (POST with query parameters)
 */
export const verifyOtp = async (otp: string, email: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("local/mobileapi/verify_otp.php");
    const urlObj = new URL(baseUrl);

    // Add query parameters
    urlObj.searchParams.append("wsfunction", "local_mobileapi_verify_otp");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("otp", otp);
    urlObj.searchParams.append("identifier", email);
    urlObj.searchParams.append("type", "email");

    const finalUrl = urlObj.toString();
    console.log("finalUrl", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "OTP verified successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to verify OTP",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Forgot Password API call (POST with query parameters)
 */
export const forgotPassword = async (email: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("local/mobileapi/forgot_password.php");
    const urlObj = new URL(baseUrl);

    // Add query parameters
    urlObj.searchParams.append("wsfunction", "local_mobileapi_forgot_password");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("email", email);

    const finalUrl = urlObj.toString();
    console.log("Forgot Password URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Password reset instructions sent successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to send password reset instructions",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Reset Password API call (POST with query parameters)
 */
export const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("local/mobileapi/reset_password.php");
    const urlObj = new URL(baseUrl);

    // Add query parameters
    urlObj.searchParams.append("wsfunction", "local_mobileapi_reset_password");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("email", email);
    urlObj.searchParams.append("otp", otp);
    urlObj.searchParams.append("newpassword", newPassword);

    const finalUrl = urlObj.toString();
    console.log("--------------- Reset Password API Request ---------------");
    console.log("URL:", finalUrl);
    console.log("Method: POST");
    console.log("Params:", JSON.stringify({
      wsfunction: "local_mobileapi_reset_password",
      moodlewsrestformat: "json",
      email,
      otp,
      newpassword: newPassword
    }, null, 2));
    console.log("----------------------------------------------------------");

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Password reset successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to reset password",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};


/**
 * Get User Profile API call (POST with query parameters)
 * This requires a token from AsyncStorage
 */
export const getUserProfile = async (token: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_user_profile");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    const finalUrl = urlObj.toString();
    console.log("Get User Profile URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "User profile retrieved successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to retrieve user profile",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Academic details list (for prefill in application form)
 */
export interface AcademicDetailItem {
  id: number;
  course_name: string;
  category: string;
  institution: string;
  major: string;
  percentage: number;
  cgpa: string;
  academic_year: string;
  graduation_year: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get user's saved academic details (for "Fill from your academic data" in apply form)
 */
export const getAcademicDetails = async (token: string): Promise<ApiResponse<AcademicDetailItem[]>> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_academic_details");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    console.log("Academic Details URL:", urlObj.toString());

    const response = await fetch(urlObj.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      return {
        success: false,
        error: responseText || "Invalid response",
        message: "Invalid response from server",
      };
    }

    const shouldLogout = await checkAuthenticationError(data);
    if (shouldLogout) {
      return {
        success: false,
        error: "Invalid token",
        message: "Your session has expired. Please login again.",
      };
    }

    if (data.success === true && Array.isArray(data.data)) {
      return {
        success: true,
        data: data.data as AcademicDetailItem[],
        message: "Academic details retrieved",
      };
    }
    return {
      success: true,
      data: [],
      message: "No academic data",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
      message: "Failed to load academic details",
    };
  }
};

/**
 * Social Login API call (POST with query parameters)
 * Supports: google, apple, facebook, digilocker
 */
export const socialLogin = async (
  provider: "google" | "apple" | "facebook" | "digilocker" | "linkedin",
  token: string,
  email?: string
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("local/mobileapi/social_login.php");
    const urlObj = new URL(baseUrl);
    urlObj.searchParams.append("provider", provider);
    if (provider === "digilocker" || provider === "linkedin") {
      urlObj.searchParams.append("access_token", token);
    } else {
      urlObj.searchParams.append("id_token", token);
    }
    if (provider === "digilocker" && email) {
      urlObj.searchParams.append("email", email);
    }

    const finalUrl = urlObj.toString();
    console.log("Social Login URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Social login successful",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Social login failed",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Update Password API call (POST with query parameters)
 */
export const updatePassword = async (
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add query parameters
    urlObj.searchParams.append("wsfunction", "local_mobileapi_update_password");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("current_password", currentPassword);
    urlObj.searchParams.append("new_password", newPassword);

    const finalUrl = urlObj.toString();
    console.log("Update Password URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Password updated successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to update password",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};


/**
 * Get Reviewer Schemes API call (POST with query parameters)
 * This requires a token from AsyncStorage
 */
export const getReviewerSchemes = async (
  token: string,
  params?: {
    search?: string;
    page?: number;
    per_page?: number;
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    // Updated wsfunction for reviewer schemes
    urlObj.searchParams.append("wsfunction", "local_mobileapi_reviewer_get_my_schemes");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Add optional parameters if provided
    if (params?.search) {
      urlObj.searchParams.append("search", params.search);
    }
    if (params?.page) {
      urlObj.searchParams.append("page", String(params.page));
    }
    if (params?.per_page) {
      urlObj.searchParams.append("per_page", String(params.per_page));
    }

    const finalUrl = urlObj.toString();
    console.log("Get Reviewer Schemes URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Schemes retrieved successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to retrieve schemes",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get All Scholarships API call (POST with query parameters)
 * This requires a token from AsyncStorage
 */
export const getAllScholarships = async (
  token: string,
  params?: {
    search?: string;
    page?: number;
    per_page?: number;
    status?: string | "open" | "expired" | "closed";
    applied?: boolean | string;
    bookmarked?: boolean | string;
    state?: string;
    start_date?: string;
    end_date?: string;
    progress_min?: number | string;
    progress_max?: number | string;
    annual_family_income_max?: number | string;
    special_category?: string;
    last_class_percentage_min?: number | string;
    caste_category?: string;
    gender?: string;
    course_name?: string;
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_all_scholarships");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Add optional parameters if provided
    if (params) {
      if (params.search) urlObj.searchParams.append("search", params.search);
      if (params.page) urlObj.searchParams.append("page", String(params.page));
      if (params.per_page) urlObj.searchParams.append("per_page", String(params.per_page));
      if (params.status) urlObj.searchParams.append("status", params.status);
      if (params.applied !== undefined) urlObj.searchParams.append("applied", String(params.applied));
      if (params.bookmarked !== undefined) urlObj.searchParams.append("bookmarked", String(params.bookmarked));
      if (params.state) urlObj.searchParams.append("state", params.state);
      if (params.start_date) urlObj.searchParams.append("start_date", params.start_date);
      if (params.end_date) urlObj.searchParams.append("end_date", params.end_date);
      if (params.progress_min !== undefined) urlObj.searchParams.append("progress_min", String(params.progress_min));
      if (params.progress_max !== undefined) urlObj.searchParams.append("progress_max", String(params.progress_max));
      if (params.annual_family_income_max !== undefined) urlObj.searchParams.append("annual_family_income_max", String(params.annual_family_income_max));
      if (params.special_category) urlObj.searchParams.append("special_category", params.special_category);
      if (params.last_class_percentage_min !== undefined) urlObj.searchParams.append("last_class_percentage_min", String(params.last_class_percentage_min));
      if (params.caste_category) urlObj.searchParams.append("caste_category", params.caste_category);
      if (params.gender) urlObj.searchParams.append("gender", params.gender);
      if (params.course_name) urlObj.searchParams.append("course_name", params.course_name);
    }

    const finalUrl = urlObj.toString();
    console.log("Get All Scholarships URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Scholarships retrieved successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to retrieve scholarships",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Scholarship Details API call (POST with query parameters)
 * This requires a token from AsyncStorage and scholarship_id
 */
export const getScholarshipDetails = async (
  token: string,
  scholarshipId: number,
  studentId?: number
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_scholarship_details");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("scholarship_id", String(scholarshipId));
    if (studentId) urlObj.searchParams.append("student_id", String(studentId));

    const finalUrl = urlObj.toString();
    console.log("Get Scholarship Details URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Scholarship details retrieved successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to retrieve scholarship details",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Generic helper for Moodle WebService API requests
 */
const moodleApiRequest = async (
  token: string,
  wsfunction: string,
  params: Record<string, string> = {}
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", wsfunction);
    urlObj.searchParams.append("moodlewsrestformat", "json");

    Object.keys(params).forEach((key) => {
      urlObj.searchParams.append(key, params[key]);
    });

    const finalUrl = urlObj.toString();
    console.log("URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for Moodle exceptions even in 200 OK responses
      if (data.exception) {
        return {
          success: false,
          error: data.message || "Moodle error",
          errorcode: data.errorcode
        };
      }

      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) return { success: false, error: "Authentication failed" };

      // Check for business logic success field in data
      if (data && data.success === false) {
        return {
          success: false,
          error: data.error || data.message || "Operation failed",
          errorcode: data.errorcode
        };
      }
    } catch (e) {
      return { success: false, error: "Invalid JSON response" };
    }

    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.message || "API request failed" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Scheduler (Interview) APIs
 */
export const getSchedulerSlots = (token: string, cmid: number, studentId?: number | string) =>
  moodleApiRequest(token, "local_mobileapi_get_scheduler_slots", { cmid: String(cmid), ...(studentId ? { student_id: String(studentId) } : {}) });

export const bookSchedulerSlot = (token: string, cmid: number, slotid: number, studentId?: number | string) =>
  moodleApiRequest(token, "local_mobileapi_book_scheduler_slot", { cmid: String(cmid), slotid: String(slotid), ...(studentId ? { student_id: String(studentId) } : {}) });

export const getMySchedulerBookings = (token: string, cmid: number, studentId?: number | string) =>
  moodleApiRequest(token, "local_mobileapi_get_my_scheduler_bookings", { cmid: String(cmid), ...(studentId ? { student_id: String(studentId) } : {}) });

export const cancelSchedulerBooking = (token: string, cmid: number, slotid: number, studentId?: number | string) =>
  moodleApiRequest(token, "local_mobileapi_cancel_scheduler_booking", { cmid: String(cmid), slotid: String(slotid), ...(studentId ? { student_id: String(studentId) } : {}) });

export const createSchedulerSlots = (token: string, cmid: number, slots: any[]) => {
  const params: Record<string, string> = { cmid: String(cmid) };
  slots.forEach((slot, index) => {
    Object.keys(slot).forEach((key) => {
      params[`slots[${index}][${key}]`] = String(slot[key]);
    });
  });
  return moodleApiRequest(token, "local_mobileapi_create_scheduler_slots", params);
};

/**
 * Quiz APIs
 */
export const getQuizAccessInfo = (token: string, cmid: number, studentId?: number | string) =>
  moodleApiRequest(token, "local_mobileapi_get_quiz_access_info", { cmid: String(cmid), ...(studentId ? { student_id: String(studentId) } : {}) });

export const getQuizMyAttempts = (token: string, cmid: number, studentId?: number | string) =>
  moodleApiRequest(token, "local_mobileapi_get_quiz_my_attempts", { cmid: String(cmid), ...(studentId ? { student_id: String(studentId) } : {}) });

/**
 * Get generic activity details (for page, forum, qbank, customcert, etc.)
 * Returns content_type: "html_page" | "webview_only"
 *   - html_page    → use content_html to render natively
 *   - webview_only → open webview_url in the in-app WebView
 */
export const getActivityDetails = (token: string, cmid: number, studentId?: number | string) =>
  moodleApiRequest(token, "local_mobileapi_get_activity_details", { cmid: String(cmid), ...(studentId ? { student_id: String(studentId) } : {}) });

export const startQuizAttempt = (
  token: string,
  cmid: number,
  preflightdata: Record<string, string> = {},
  forcenew: boolean = false,
  studentId?: number | string
) =>
  moodleApiRequest(token, "local_mobileapi_start_quiz_attempt", {
    cmid: String(cmid),
    ...preflightdata,
    forcenew: forcenew ? "1" : "0",
    ...(studentId ? { student_id: String(studentId) } : {})
  });

/**
 * Bookmark/Unbookmark Scholarship API call (POST with query parameters)
 * This requires a token from AsyncStorage, scholarship_id, and action (bookmark/unbookmark)
 */
export const bookmarkScholarship = async (
  token: string,
  scholarshipId: number,
  action: "bookmark" | "unbookmark",
  studentId?: number | string
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_bookmark_scholarship");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("scholarship_id", String(scholarshipId));
    urlObj.searchParams.append("action", action);
    if (studentId) {
      urlObj.searchParams.append("student_id", String(studentId));
    }

    const finalUrl = urlObj.toString();
    console.log("Bookmark Scholarship URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || `Scholarship ${action === "bookmark" ? "bookmarked" : "unbookmarked"} successfully`,
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || `Failed to ${action} scholarship`,
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Bookmarked Scholarships API call (POST with query parameters)
 * This requires a token from AsyncStorage
 */
export const getBookmarkedScholarships = async (
  token: string,
  params?: {
    page?: number;
    per_page?: number;
    studentId?: number | string;
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_bookmarked_scholarships");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Add optional parameters if provided
    if (params?.page) {
      urlObj.searchParams.append("page", String(params.page));
    }
    if (params?.per_page) {
      urlObj.searchParams.append("per_page", String(params.per_page));
    }
    if (params?.studentId) {
      urlObj.searchParams.append("student_id", String(params.studentId));
    }

    const finalUrl = urlObj.toString();
    console.log("Get Bookmarked Scholarships URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Bookmarked scholarships retrieved successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to retrieve bookmarked scholarships",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get My Applications API call (POST with query parameters)
 * This requires a token from AsyncStorage
 */
export const getMyApplications = async (
  token: string,
  params?: {
    page?: number;
    per_page?: number;
    status?: string;
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_my_applications");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Add optional parameters if provided
    if (params?.page) {
      urlObj.searchParams.append("page", String(params.page));
    }
    if (params?.per_page) {
      urlObj.searchParams.append("per_page", String(params.per_page));
    }
    if (params?.status) {
      urlObj.searchParams.append("status", params.status);
    }

    const finalUrl = urlObj.toString();
    console.log("Get My Applications URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Applications retrieved successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to retrieve applications",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};



/**
 * Upload Profile Image API call (POST form-data)
 * Uploads an image to user's private area and returns a file ID
 * This file ID can then be used with updateUserProfile
 */
export const uploadProfileImage = async (
  token: string,
  imageFile: any
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("local/mobileapi/upload_document.php");
    const urlObj = new URL(baseUrl);

    // Add token query parameter
    urlObj.searchParams.append("wstoken", token);

    const finalUrl = urlObj.toString();
    console.log("Upload Profile Image URL:", finalUrl);

    // Create FormData
    const formData = new FormData();

    // Append image file
    const fileType =
      imageFile.mimeType ||
      imageFile.type ||
      "image/jpeg";

    formData.append("file", {
      uri: imageFile.uri,
      name: imageFile.name || "profile.jpg",
      type: fileType.includes("/") ? fileType : "image/jpeg",
    } as any);

    // Use mode='private' for profile images (uploads to user context)
    formData.append("mode", "private");

    console.log("Uploading profile image with mode=private", JSON.stringify(formData));

    // Make POST request with FormData
    const response = await fetch(finalUrl, {
      method: "POST",
      body: formData,
      headers: {
        "Accept": "application/json",
      },
    });

    const responseText = await response.text();
    console.log("Upload Profile Image Response:", responseText);

    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok && data.success) {
      return {
        success: true,
        data: data.data, // Return the nested data object which contains id, filename, etc.
        message: data.message || "Profile image uploaded successfully",
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Failed to upload image",
        message: data.message || "Failed to upload profile image",
      };
    }
  } catch (error: any) {
    console.error("Upload profile image error:", error);
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Upload Document API call (POST form-data)
 * This requires a token, file object, mode, and cmid
 */
export const uploadDocument = async (
  token: string,
  file: any,
  cmid: string | number,
  mode: string = "scheme"
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("local/mobileapi/upload_document.php");
    const urlObj = new URL(baseUrl);

    // Add token query parameter
    urlObj.searchParams.append("wstoken", token);

    const finalUrl = urlObj.toString();
    console.log("Upload Document URL:", finalUrl);

    // Create FormData
    const formData = new FormData();

    // Append file - modify this based on the actual file object handling from document picker
    // React Native FormData expects { uri, name, type }
    formData.append("file", {
      uri: file.uri,
      name: file.name || "document.pdf",
      type: file.mimeType || file.type || "application/pdf",
    } as any);

    formData.append("mode", mode);
    formData.append("cmid", String(cmid));

    // Make POST request with FormData
    const response = await fetch(finalUrl, {
      method: "POST",
      body: formData,
      headers: {
        // Content-Type header specific to FormData is handled automatically by fetch in RN
        "Accept": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Document uploaded successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to upload document",
      };
    }
  } catch (error: any) {
    // Handle network errors
    console.error("Upload error details:", error);
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Update User Profile API call
 */
export const updateUserProfile = async (
  token: string,
  profileData: any
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");

    // Construct the payload with JSON format
    const payload: any = {
      wstoken: token,
      wsfunction: "local_mobileapi_update_profile",
      moodlewsrestformat: "json",
    };

    // Core fields
    if (profileData.username !== undefined && profileData.username !== null) payload.username = profileData.username;
    if (profileData.firstName !== undefined && profileData.firstName !== null) payload.firstname = profileData.firstName;
    if (profileData.lastName !== undefined && profileData.lastName !== null) payload.lastname = profileData.lastName;
    if (profileData.email !== undefined && profileData.email !== null) payload.email = profileData.email;
    if (profileData.phone !== undefined && profileData.phone !== null) payload.phone1 = profileData.phone;
    if (profileData.address !== undefined && profileData.address !== null) payload.address = profileData.address;
    if (profileData.city !== undefined && profileData.city !== null) payload.city = profileData.city;
    payload.country = "IN";

    // Profile image file ID (new parameter for image upload)
    if (profileData.profileImageFileId !== undefined) {
      payload.profileimage_file_id = profileData.profileImageFileId;
    }

    // Date of birth handling
    let dobTimestamp: string | null = null;
    if (profileData.dob) {
      // Assuming format is DD/MM/YYYY from frontend
      const parts = profileData.dob.split('/');
      if (parts.length === 3) {
        // YYYY-MM-DD for core field
        payload.date_of_birth = `${parts[2]}-${parts[1]}-${parts[0]}`;

        // Convert to Unix timestamp for custom field
        const dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (!isNaN(dateObj.getTime())) {
          dobTimestamp = Math.floor(dateObj.getTime() / 1000).toString();
        }
      }
    }

    // Custom Fields
    const customFields: { shortname: string; value: string }[] = [];

    // Helper to add custom field if value exists
    const addCustomField = (shortname: string, value: any) => {
      if (value !== undefined && value !== null) {
        customFields.push({ shortname, value: String(value) });
      }
    };

    addCustomField('DOB', dobTimestamp); // Send DOB as custom field too
    addCustomField('Gender', profileData.gender);
    addCustomField('Religion', profileData.religion);
    addCustomField('Caste', profileData.caste);



    addCustomField('State', profileData.domicileState);
    addCustomField('domicile_district', profileData.domicileDistrict);
    addCustomField('category', profileData.specialCategory);
    addCustomField('percentage_12', profileData.percentage12);
    addCustomField('college_name', profileData.collegeName);
    addCustomField('College_District', profileData.collegeLocation);
    addCustomField('university', profileData.university);
    addCustomField('course', profileData.currentCourse);
    addCustomField('10th', profileData.percentage10);
    addCustomField('12th_marks', `<p dir="ltr" style="text-align:left;">${profileData.marks12}</p>`);

    if (profileData.village !== undefined) {
      addCustomField('village', profileData.village);
    }
    if (profileData.whatsapp_number !== undefined) {
      addCustomField('whatsapp_number', profileData.whatsapp_number);
    }
    addCustomField('father', profileData.fatherName);
    addCustomField('mother', profileData.motherName);
    addCustomField('Family_income', profileData.annualIncome); // Note: API uses Family_income or annualincome, user req to match response which showed Family_income

    // New fields from API response
    addCustomField('session', profileData.session);
    addCustomField('year_of_course', profileData.yearOfCourse);
    addCustomField('passing_10th', profileData.passing10th);
    addCustomField('12th_board', profileData.board12th);
    addCustomField('stream_in_12th', profileData.stream12th);
    addCustomField('applicationyear', profileData.applicationYear);
    addCustomField('Registering_as', profileData.registeringAs);
    addCustomField('schemename', profileData.schemeName);
    addCustomField('12th_passing_year', profileData.passingYear12th);
    addCustomField('application_type', profileData.application_type);
    addCustomField('competitive_exam', profileData.competitive_exam);
    addCustomField('competitive_exam_name', profileData.competitive_exam_name);

    // Add phone as custom field as well based on example
    addCustomField('phone_number', profileData.phone); // API response showed phone_number as well

    if (customFields.length > 0) {
      payload.customfields = customFields;
    }

    console.log("Update Profile URL:", baseUrl);

    // Convert payload to x-www-form-urlencoded string with indexed arrays for Moodle
    const formDataParts: string[] = [];

    Object.keys(payload).forEach(key => {
      const value = payload[key];
      if (key === 'customfields' && Array.isArray(value)) {
        value.forEach((field, index) => {
          formDataParts.push(`customfields[${index}][shortname]=${encodeURIComponent(field.shortname)}`);
          formDataParts.push(`customfields[${index}][value]=${encodeURIComponent(field.value)}`);
        });
      } else if (value !== undefined && value !== null) {
        formDataParts.push(`${key}=${encodeURIComponent(String(value))}`);
      }
    });

    const formBody = formDataParts.join("&");

    console.log(formBody, "formBody")

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok && !data.exception) {
      return {
        success: true,
        data: data,
        message: "Profile updated successfully",
      };
    } else {
      return {
        success: false,
        error: data.message || data.error || data.exception || "Update failed",
        message: data.message || "Failed to update profile",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Notifications API call (GET with query parameters)
 * This requires a token from AsyncStorage
 */
export const getNotifications = async (
  token: string,
  params?: {
    page?: number;
    per_page?: number;
    unread_only?: number;
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("local/mobileapi/notifications.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);

    // Add optional parameters if provided
    if (params?.page) {
      urlObj.searchParams.append("page", String(params.page));
    }
    if (params?.per_page) {
      urlObj.searchParams.append("per_page", String(params.per_page));
    }
    if (params?.unread_only !== undefined) {
      urlObj.searchParams.append("unread_only", String(params.unread_only));
    }

    const finalUrl = urlObj.toString();
    console.log("Get Notifications URL:", finalUrl);

    // Make GET request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Notifications retrieved successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to retrieve notifications",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Mark All Notifications as Read API call
 */
export const markAllNotificationsRead = async (token: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_mark_all_notifications_read");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    const finalUrl = urlObj.toString();

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      return { success: true, data, message: "Notifications marked as read" };
    } else {
      return { success: false, error: "Failed" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Mark Single Notification as Read API call
 */
export const markNotificationRead = async (
  token: string,
  notificationId: number | string
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_mark_notification_read");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("notification_id", String(notificationId));

    const finalUrl = urlObj.toString();

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      return { success: true, data, message: "Notification marked as read" };
    } else {
      return { success: false, error: "Failed to mark notification as read" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Submit Scholarship Application API call
 */
export const submitApplication = async (
  token: string,
  data: {
    scholarship_id: number | string;
    application_text: string;
    fullname?: string;
    email?: string;
    phone?: string;
    student_id?: string;
    institution?: string;
    major?: string;
    graduation_date?: string;
    current_year?: string;
    gpa?: string;
    activities?: string;
    financial_info?: string;
    assessment_q1?: string;
    assessment_q2?: string;
    interview_mode?: string;
    verification_time?: string;
    documents?: any[];
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_submit_application");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Add data parameters
    Object.keys(data).forEach(key => {
      // @ts-ignore
      const val = data[key];
      if (val !== undefined && val !== null) {
        if (typeof val === 'object') {
          urlObj.searchParams.append(key, JSON.stringify(val));
        } else {
          urlObj.searchParams.append(key, String(val));
        }
      }
    });

    const finalUrl = urlObj.toString();
    console.log("Submit Application URL:", finalUrl);

    // Make POST request
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    let resData: any = {};

    try {
      resData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (resData.exception) {
        return {
          success: false,
          error: resData.message || resData.exception,
          message: resData.message || "Submission failed"
        };
      }
      return {
        success: true,
        data: resData,
        message: resData.message || "Application submitted successfully",
      };
    } else {
      return {
        success: false,
        error: resData.error || resData.message || "Something went wrong",
        message: resData.message || "Failed to submit application",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Student Dashboard Stats API call
 */
export const getDashboardStats = async (token: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_student_get_dashboard_stats");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    const finalUrl = urlObj.toString();
    console.log("Get Dashboard Stats URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      return { success: true, data, message: "Stats retrieved successfully" };
    } else {
      return { success: false, error: "Failed to retrieve stats" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get Upcoming Deadlines API call
 */
export const getUpcomingDeadlines = async (
  token: string,
  limit: number = 10
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_upcoming_deadlines");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("limit", String(limit));

    const finalUrl = urlObj.toString();
    console.log("Get Upcoming Deadlines URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      // The API returns { success: true, data: [...] }
      return {
        success: true,
        data: data.data || [], // Return the array which is inside data.data
        message: data.message || "Deadlines retrieved successfully",
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Something went wrong",
        message: data.message || "Failed to retrieve deadlines",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Recommended Scholarships API call
 */
export const getRecommendedScholarships = async (
  token: string,
  params?: {
    page?: number;
    per_page?: number;
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_recommended_scholarships");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Add optional parameters
    if (params?.page) {
      urlObj.searchParams.append("page", String(params.page));
    }
    if (params?.per_page) {
      urlObj.searchParams.append("per_page", String(params.per_page));
    }

    const finalUrl = urlObj.toString();
    console.log("Get Recommended Scholarships URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      // The API returns standard scholarship list format
      return {
        success: true,
        data: data.data || data, // Handle if data is wrapped or direct array
        message: data.message || "Recommended scholarships retrieved successfully",
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Something went wrong",
        message: data.message || "Failed to retrieve recommended scholarships",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Application Progress API call
 */
export const getApplicationProgress = async (token: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_application_progress");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    const finalUrl = urlObj.toString();
    console.log("Get Application Progress URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      // Response format: { success: true, progress: { total_submitted, approved, rejected, pending } }
      if (data.progress) {
        return { success: true, data: data.progress, message: "Progress retrieved successfully" };
      }
      return { success: true, data: data, message: "Progress retrieved successfully" };
    } else {
      return { success: false, error: "Failed to retrieve progress" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Create Academic Detail API call
 */
export const createAcademicDetail = async (
  token: string,
  params: {
    course_name: string;
    category?: string;
    institution?: string;
    major?: string;
    percentage?: string;
    cgpa?: string;
    academic_year?: string;
    graduation_year?: string;
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_create_academic_detail");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Add create params
    Object.keys(params).forEach(key => {
      if (params[key as keyof typeof params]) {
        urlObj.searchParams.append(key, params[key as keyof typeof params] as string);
      }
    });

    const finalUrl = urlObj.toString();
    console.log("Create Academic Detail URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      if (data.success) {
        return { success: true, data: data, message: data.message || "Academic detail created successfully" };
      }
      return { success: false, error: data.message || "Failed to create academic detail" };
    } else {
      return { success: false, error: "Failed to create academic detail" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Update Academic Detail API call
 */
export const updateAcademicDetail = async (
  token: string,
  id: number,
  params: {
    course_name?: string;
    category?: string;
    institution?: string;
    major?: string;
    percentage?: string;
    cgpa?: string;
    academic_year?: string;
    graduation_year?: string;
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_update_academic_detail");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("id", String(id));

    // Add update params
    Object.keys(params).forEach(key => {
      if (params[key as keyof typeof params]) {
        urlObj.searchParams.append(key, params[key as keyof typeof params] as string);
      }
    });

    const finalUrl = urlObj.toString();
    console.log("Update Academic Detail URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      if (data.success) {
        return { success: true, data: data, message: data.message || "Academic detail updated successfully" };
      }
      return { success: false, error: data.message || "Failed to update academic detail" };
    } else {
      return { success: false, error: "Failed to update academic detail" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete Academic Detail API call
 */
export const deleteAcademicDetail = async (
  token: string,
  id: number
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_delete_academic_detail");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("id", String(id));

    const finalUrl = urlObj.toString();
    console.log("Delete Academic Detail URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      if (data.success) {
        return { success: true, data: data, message: data.message || "Academic detail deleted successfully" };
      }
      return { success: false, error: data.message || "Failed to delete academic detail" };
    } else {
      return { success: false, error: "Failed to delete academic detail" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get Financial Info API call
 */
export const getFinancialInfo = async (token: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_financial_info");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("include_full_account_number", "1");

    const finalUrl = urlObj.toString();
    console.log("Get Financial Info URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      if (data.success && data.data) {
        return { success: true, data: data.data, message: "Financial info retrieved successfully" };
      }
      return { success: true, data: null, message: "No financial info found" };
    } else {
      return { success: false, error: "Failed to retrieve financial info" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};


/**
 * Update Financial Info API call
 */
export const updateFinancialInfo = async (
  token: string,
  params: {
    accountholder: string;
    bank_name: string;
    account_number: string;
    ifsc: string;
    account_type: string;
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_update_financial_info");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Add update params
    urlObj.searchParams.append("accountholder", params.accountholder);
    urlObj.searchParams.append("bank_name", params.bank_name);
    urlObj.searchParams.append("account_number", params.account_number);
    urlObj.searchParams.append("ifsc", params.ifsc);
    urlObj.searchParams.append("account_type", params.account_type);

    const finalUrl = urlObj.toString();
    console.log("Update Financial Info URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      if (data.success) {
        return { success: true, data: data, message: data.message || "Financial information updated successfully" };
      }
      return { success: false, error: data.message || "Failed to update financial information" };
    } else {
      return { success: false, error: "Failed to update financial information" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get Terms and Conditions API call
 */
export const getTermsAndConditions = async (token: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_terms_conditions");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    const finalUrl = urlObj.toString();
    console.log("Get Terms URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      if (data.success && data.data) {
        return { success: true, data: data.data, message: "Terms retrieved successfully" };
      }
      return { success: false, error: data.message || "Failed to retrieve terms" };
    } else {
      return { success: false, error: "Failed to retrieve terms" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get Privacy Policy API call
 */
export const getPrivacyPolicy = async (token: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_privacy_policy");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    const finalUrl = urlObj.toString();
    console.log("Get Privacy Policy URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      if (data.success && data.data) {
        return { success: true, data: data.data, message: "Privacy policy retrieved successfully" };
      }
      return { success: false, error: data.message || "Failed to retrieve privacy policy" };
    } else {
      return { success: false, error: "Failed to retrieve privacy policy" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get About Page API call
 */
export const getAboutPage = async (token: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_about_page");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    const finalUrl = urlObj.toString();
    console.log("Get About Page URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      if (data.success && data.data) {
        return { success: true, data: data.data, message: "About page retrieved successfully" };
      }
      return { success: false, error: data.message || "Failed to retrieve about page" };
    } else {
      return { success: false, error: "Failed to retrieve about page" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Contact Support API call
 */
export const contactSupport = async (token: string, subject: string, message: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_contact_support");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Add params
    urlObj.searchParams.append("subject", subject);
    urlObj.searchParams.append("message", message);

    const finalUrl = urlObj.toString();
    console.log("Contact Support URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      if (data.success) {
        return { success: true, data: data, message: data.message || "Support request submitted successfully" };
      }
      return { success: false, error: data.message || "Failed to submit support request" };
    } else {
      return { success: false, error: "Failed to submit support request" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get FAQs API call
 */
export const getFAQs = async (token: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_faqs");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    const finalUrl = urlObj.toString();
    console.log("Get FAQs URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      if (data.success && data.data) {
        return { success: true, data: data.data, message: "FAQs retrieved successfully" };
      }
      return { success: false, error: data.message || "Failed to retrieve FAQs" };
    } else {
      return { success: false, error: "Failed to retrieve FAQs" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get All Applications in Scheme for Reviewer
 * Endpoint: /webservice/rest/server.php
 * Method: POST
 * Token Required: YES
 */
export const getReviewerApplications = async (
  token: string,
  scholarshipId: number,
  params?: {
    status?: "new" | "approved" | "waitlisted" | "rejected" | "pending" | "applied" | "";
    search?: string;
    page?: number;
    per_page?: number;
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_reviewer_get_all_applications");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("scholarship_id", String(scholarshipId));

    // Add optional parameters if provided
    if (params?.status !== undefined) {
      // Map 'pending' back to whatever the server expects?
      // User said "replaced in the api", so maybe the server accepts 'pending' now.
      // I'll just append it directly as it's defined in the type.
      urlObj.searchParams.append("status", params.status);
    }
    if (params?.search) {
      urlObj.searchParams.append("search", params.search);
    }
    if (params?.page) {
      urlObj.searchParams.append("page", String(params.page));
    }
    if (params?.per_page) {
      urlObj.searchParams.append("per_page", String(params.per_page));
    }


    const finalUrl = urlObj.toString();
    console.log("Get Reviewer Applications URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      if (data.exception || data.errorcode) {
        // Moodle workaround: if no applications are found, it might return an invalid response exception 
        // because an empty list doesn't match the strictly typed return structure.
        if (
          data.errorcode === "invalidresponse" ||
          data.exception === "invalid_response_exception" ||
          (data.message && data.message.includes("Invalid response value detected"))
        ) {
          return {
            success: true,
            data: {
              applications: [],
              pagination: { page: params?.page || 1, per_page: params?.per_page || 10, total: 0, total_pages: 1 }
            },
            message: "No applications found",
          };
        }

        return {
          success: false,
          error: data.message || data.errorcode || "An error occurred",
          message: data.message || "Permission denied",
        };
      }

      return {
        success: true,
        data: data,
        message: data.message || "Applications retrieved successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to retrieve applications",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Application Details for Reviewer
 * Endpoint: /webservice/rest/server.php
 * Method: POST
 * Token Required: YES
 */
export const getReviewerApplicationDetails = async (
  token: string,
  applicationId: number
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_reviewer_get_application_details");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("application_id", String(applicationId));

    const finalUrl = urlObj.toString();
    console.log("Get Reviewer Application Details URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for Moodle exception format
      if (data.exception || data.errorcode) {
        return {
          success: false,
          error: data.message || "Permission denied",
          message: data.message || "You do not have permission to view this application"
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Application details retrieved successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to retrieve application details",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};


/**
 * Verify or Reject Individual Document
 * Endpoint: /webservice/rest/server.php
 * Method: POST
 * Token Required: YES
 */
export const verifyDocument = async (
  token: string,
  fileId: number,
  action: "verify" | "reject",
  notes?: string,
  grade?: number,
  gradeLabel?: string
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_reviewer_verify_document");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("file_id", String(fileId));
    urlObj.searchParams.append("action", action);

    if (notes) {
      urlObj.searchParams.append("notes", notes);
    }

    if (grade !== undefined) {
      urlObj.searchParams.append("grade", String(grade));
    }

    if (gradeLabel) {
      urlObj.searchParams.append("grade_label", gradeLabel);
    }

    const finalUrl = urlObj.toString();
    console.log(`Verify Document (${action}) URL:`, finalUrl);

    // Make POST request
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for Moodle exception format
      if (data.exception || data.errorcode) {
        return {
          success: false,
          error: data.message || "Permission denied",
          message: data.message || "Action failed"
        };
      }
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      if (data.success === false) {
        return {
          success: false,
          error: data.message || "Action failed",
          message: data.message || "Action failed"
        };
      }

      return {
        success: true,
        data: data,
        message: data.message || `Document ${action === "verify" ? "verified" : "rejected"} successfully`,
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Something went wrong",
        message: data.message || "Failed to verify document",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
      message: "Failed to connect to server",
    };
  }
};



/**
 * Review Application (Approve/Reject)
 * Endpoint: /webservice/rest/server.php
 * Method: POST
 * Token Required: YES
 */
export const reviewApplication = async (
  token: string,
  applicationId: number,
  action: "approve" | "reject",
  notes?: string
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_reviewer_review_application");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("application_id", String(applicationId));
    urlObj.searchParams.append("action", action);

    if (notes) {
      urlObj.searchParams.append("notes", notes);
    }

    const finalUrl = urlObj.toString();
    console.log(`Review Application (${action}) URL:`, finalUrl);

    // Make POST request
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for Moodle exception format
      if (data.exception || data.errorcode) {
        return {
          success: false,
          error: data.message || "Permission denied",
          message: data.message || "Action failed"
        };
      }
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      if (data.success === false) {
        return {
          success: false,
          error: data.message || "Action failed",
          message: data.message || "Action failed"
        };
      }

      return {
        success: true,
        data: data,
        message: data.message || `Application ${action}d successfully`,
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Something went wrong",
        message: data.message || "Failed to submit review",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Review Application (Donor - Approve/Reject)
 * This API is for Donors to approve/reject applications.
 * Endpoint: /webservice/rest/server.php
 * Method: POST
 * Token Required: YES
 */
export const donorReviewApplication = async (
  token: string,
  applicationId: number,
  action: "approve" | "reject" | "waitlist",
  notes?: string
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_donor_review_application");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("application_id", String(applicationId));
    urlObj.searchParams.append("action", action);

    if (notes) {
      urlObj.searchParams.append("notes", notes);
    }

    const finalUrl = urlObj.toString();
    console.log(`Donor Review Application (${action}) URL:`, finalUrl);

    // Make POST request
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for Moodle exception format
      if (data.exception || data.errorcode) {
        return {
          success: false,
          error: data.message || "Permission denied",
          message: data.message || "Action failed"
        };
      }
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      if (data.success === false) {
        return {
          success: false,
          error: data.message || "Action failed",
          message: data.message || "Action failed"
        };
      }

      return {
        success: true,
        data: data,
        message: data.message || `Application ${action}d successfully`,
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Something went wrong",
        message: data.message || "Failed to submit review",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
      message: "Failed to connect to server",
    };
  }
};


/**
 * Get Dashboard Statistics for Reviewer
 * Endpoint: /webservice/rest/server.php
 * Method: POST
 * Token Required: YES
 */
export const getReviewerDashboardStats = async (token: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_reviewer_get_dashboard_stats");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    const finalUrl = urlObj.toString();
    console.log("Get Reviewer Dashboard Stats URL:", finalUrl);

    // Make POST request
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};

      if (data.exception || data.errorcode) {
        return {
          success: false,
          error: data.message || "Permission denied",
          message: data.message || "Failed to fetch stats"
        };
      }
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (data.success === false) {
        return {
          success: false,
          error: data.message || "Failed to fetch stats",
          message: data.message || "Failed to fetch stats"
        };
      }
      return {
        success: true,
        data: data,
        message: "Stats retrieved successfully",
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Something went wrong",
        message: "Failed to retrieve stats",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Recent Applications for Reviewer
 * Endpoint: /webservice/rest/server.php
 * Method: POST
 * Token Required: YES
 */
export const getReviewerRecentApplications = async (token: string, limit: number = 10): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_reviewer_get_recent_applications");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("limit", String(limit));

    const finalUrl = urlObj.toString();
    console.log("Get Recent Applications URL:", finalUrl);

    // Make POST request
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};

      if (data.exception || data.errorcode) {
        return {
          success: false,
          error: data.message || "Permission denied",
          message: data.message || "Failed to fetch recent applications"
        };
      }
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (data.success === false) {
        return {
          success: false,
          error: data.message || "Failed to fetch recent applications",
          message: data.message || "Failed to fetch recent applications"
        };
      }
      return {
        success: true,
        data: data,
        message: "Recent applications retrieved successfully",
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Something went wrong",
        message: "Failed to retrieve recent applications",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Reviewer Progress
 * Endpoint: /webservice/rest/server.php
 * Method: POST
 * Token Required: YES
 */
export const getReviewerProgress = async (token: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_reviewer_get_progress");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    const finalUrl = urlObj.toString();
    console.log("Get Reviewer Progress URL:", finalUrl);

    // Make POST request
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};

      if (data.exception || data.errorcode) {
        return {
          success: false,
          error: data.message || "Permission denied",
          message: data.message || "Failed to fetch progress"
        };
      }
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (data.success === false) {
        return {
          success: false,
          error: data.message || "Failed to fetch progress",
          message: data.message || "Failed to fetch progress"
        };
      }
      return {
        success: true,
        data: data,
        message: "Progress retrieved successfully",
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Something went wrong",
        message: "Failed to retrieve progress",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Dashboard Statistics for Donor/Provider
 * Endpoint: /webservice/rest/server.php
 * Method: POST
 * Token Required: YES
 */
export const getDonorDashboardStats = async (
  token: string,
  startDate?: number,
  endDate?: number
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_donor_get_dashboard_stats");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    if (startDate) {
      urlObj.searchParams.append("start_date", String(startDate));
    }
    if (endDate) {
      urlObj.searchParams.append("end_date", String(endDate));
    }

    const finalUrl = urlObj.toString();
    console.log("Get Donor Dashboard Stats URL:", finalUrl);

    // Make POST request
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};

      if (data.exception || data.errorcode) {
        return {
          success: false,
          error: data.message || "Permission denied",
          message: data.message || "Failed to fetch stats"
        };
      }
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (data.success === false) {
        return {
          success: false,
          error: data.message || "Failed to fetch stats",
          message: data.message || "Failed to fetch stats"
        };
      }
      return {
        success: true,
        data: data,
        message: "Stats retrieved successfully",
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Something went wrong",
        message: "Failed to retrieve stats",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Recent Scholarships for Donor/Provider
 * Endpoint: /webservice/rest/server.php
 * Method: POST
 * Token Required: YES
 */
export const getDonorRecentScholarships = async (
  token: string,
  limit: number = 10
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_donor_get_recent_scholarships");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("limit", String(limit));

    const finalUrl = urlObj.toString();
    console.log("Get Donor Recent Scholarships URL:", finalUrl);

    // Make POST request
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};

      if (data.exception || data.errorcode) {
        return {
          success: false,
          error: data.message || "Permission denied",
          message: data.message || "Failed to fetch recent scholarships"
        };
      }
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (data.success === false) {
        return {
          success: false,
          error: data.message || "Failed to fetch recent scholarships",
          message: data.message || "Failed to fetch recent scholarships"
        };
      }
      return {
        success: true,
        data: data,
        message: "Recent scholarships retrieved successfully",
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Something went wrong",
        message: "Failed to retrieve recent scholarships",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Scholarship Progress for Donor/Provider
 * Endpoint: /webservice/rest/server.php
 * Method: POST
 * Token Required: YES
 */
export const getDonorScholarshipProgress = async (
  token: string,
  scholarshipId: number
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_donor_get_scholarship_progress");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("scholarship_id", String(scholarshipId));

    const finalUrl = urlObj.toString();
    console.log("Get Scholarship Progress URL:", finalUrl);

    // Make POST request
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};

      if (data.exception || data.errorcode) {
        return {
          success: false,
          error: data.message || "Permission denied",
          message: data.message || "Failed to fetch progress"
        };
      }
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      return {
        success: true,
        data: data,
        message: "Progress retrieved successfully",
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Something went wrong",
        message: "Failed to retrieve progress",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
      message: "Failed to connect to server",
    };
  }
};

/**
 *Create Scholarship API call (POST)
 * This requires a token from AsyncStorage
 */
export const createScholarship = async (
  token: string,
  scholarshipData: any
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_donor_create_scholarship");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Prepare request parameters
    Object.keys(scholarshipData).forEach(key => {
      const val = scholarshipData[key];
      if (typeof val === 'object' && val !== null) {
        urlObj.searchParams.append(key, JSON.stringify(val));
      } else if (val === null || val === undefined) {
        urlObj.searchParams.append(key, "");
      } else {
        urlObj.searchParams.append(key, String(val));
      }
    });

    const finalUrl = urlObj.toString();
    console.log("Create Scholarship URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      if (data.exception) {
        return {
          success: false,
          error: data.message || data.exception,
          message: data.message || "Failed to create scholarship",
        };
      }
      return {
        success: true,
        data: data,
        message: data.message || "Scholarship created successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to create scholarship",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};
/**
 * Get My Scholarships API call (POST with query parameters)
 * This requires a token from AsyncStorage
 */
export const getMyScholarships = async (
  token: string,
  params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    categoryid?: number;
    start_date?: number;
    end_date?: number;
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_donor_get_my_scholarships");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Add optional parameters if provided
    if (params?.page) {
      urlObj.searchParams.append("page", String(params.page));
    }
    if (params?.per_page) {
      urlObj.searchParams.append("per_page", String(params.per_page));
    }
    if (params?.search) {
      urlObj.searchParams.append("search", params.search);
    }
    if (params?.status) {
      urlObj.searchParams.append("status", params.status);
    }
    if (params?.categoryid) {
      urlObj.searchParams.append("categoryid", String(params.categoryid));
    }
    if (params?.start_date) {
      urlObj.searchParams.append("start_date", String(params.start_date));
    }
    if (params?.end_date) {
      urlObj.searchParams.append("end_date", String(params.end_date));
    }

    const finalUrl = urlObj.toString();
    console.log("Get My Scholarships URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      if (data.exception) {
        return {
          success: false,
          error: data.message || data.exception,
          message: data.message || "Failed to retrieve scholarships",
        };
      }
      return {
        success: true,
        data: data,
        message: data.message || "Scholarships retrieved successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to retrieve scholarships",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Scholarship Applicants API call (POST with query parameters)
 * This requires a token from AsyncStorage and scholarship_id
 */
export const getScholarshipApplicants = async (
  token: string,
  scholarshipId: number,
  params?: {
    status?: string;
    page?: number;
    per_page?: number;
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_donor_get_scholarship_applicants");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("scholarship_id", String(scholarshipId));

    // Add optional parameters if provided
    if (params?.status) {
      urlObj.searchParams.append("status", params.status);
    }
    if (params?.page) {
      urlObj.searchParams.append("page", String(params.page));
    }
    if (params?.per_page) {
      urlObj.searchParams.append("per_page", String(params.per_page));
    }

    const finalUrl = urlObj.toString();
    console.log("Get Scholarship Applicants URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      if (data.exception) {
        return {
          success: false,
          error: data.message || data.exception,
          message: data.message || "Failed to retrieve applicants",
        };
      }
      return {
        success: true,
        data: data,
        message: "Applicants retrieved successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to retrieve applicants",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Applicant Details for Donor (POST with query parameters)
 * Endpoint: /webservice/rest/server.php
 * Method: POST
 * Token Required: YES
 * 
 * Fetch complete application details for a specific applicant (like reviewer get_application_details),
 * with donor permission checks.
 * 
 * Response includes:
 * - Application info + status + application text
 * - Attachments submitted with application (if any)
 * - All assignment-based scheme documents + files + verification status
 * - Academic details (from local_mobileapi_academic_details)
 * - Financial info summary (masked account number)
 */
export const getDonorApplicantDetails = async (
  token: string,
  applicationId: number
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_donor_get_applicant_details");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("application_id", String(applicationId));

    const finalUrl = urlObj.toString();
    console.log("Get Donor Applicant Details URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for Moodle-style exceptions
      if (data.exception || data.errorcode) {
        return {
          success: false,
          error: data.message || "Permission denied",
          message: data.message || "Failed to fetch applicant details"
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      if (data.success === false) {
        return {
          success: false,
          error: data.message || "Failed to fetch applicant details",
          message: data.message || "Failed to fetch applicant details"
        };
      }
      return {
        success: true,
        data: data,
        message: "Applicant details retrieved successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to retrieve applicant details",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

/**
 * Get Donor Analytics API call (POST with query parameters)
 * This requires a token from AsyncStorage
 */
export const getDonorAnalytics = async (
  token: string,
  params?: {
    scholarship_id?: number;
    start_date?: number;
    end_date?: number;
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_donor_get_analytics");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Add optional parameters if provided
    if (params?.scholarship_id !== undefined) {
      urlObj.searchParams.append("scholarship_id", String(params.scholarship_id));
    }
    if (params?.start_date) {
      urlObj.searchParams.append("start_date", String(params.start_date));
    }
    if (params?.end_date) {
      urlObj.searchParams.append("end_date", String(params.end_date));
    }

    const finalUrl = urlObj.toString();
    console.log("Get Donor Analytics URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      if (data.exception) {
        return {
          success: false,
          error: data.message || data.exception,
          message: data.message || "Failed to retrieve analytics",
        };
      }
      return {
        success: true,
        data: data,
        message: "Analytics retrieved successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to retrieve analytics",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};
// Existing export ...
// ...

/**
 * Submit / Update Donor KYC API call
 */
export const submitDonorKyc = async (
  token: string,
  data: {
    org_name?: string;
    org_email?: string;
    org_phone?: string;
    pan?: string;
    bank_account?: string;
    ifsc?: string;
    signatory_name?: string;
    documents_json?: string; // JSON array of file objects/ids
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_donor_submit_kyc");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Add optional params
    Object.keys(data).forEach(key => {
      // @ts-ignore
      const val = data[key];
      if (val !== undefined && val !== null) {
        urlObj.searchParams.append(key, String(val));
      }
    });

    const finalUrl = urlObj.toString();
    console.log("Submit Donor KYC URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let resData: any = {};
    try { resData = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      if (resData.exception) {
        return {
          success: false,
          error: resData.message || resData.exception,
          message: resData.message || "KYC Submission failed"
        };
      }
      return {
        success: true,
        data: resData,
        message: resData.message || "KYC submitted successfully",
      };
    } else {
      return {
        success: false,
        error: resData.error || resData.message || "Something went wrong",
        message: resData.message || "Failed to submit KYC",
      };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get Donor KYC Status API call
 */
export const getDonorKycStatus = async (token: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_donor_get_kyc_status");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    const finalUrl = urlObj.toString();
    console.log("Get Donor KYC Status URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try { data = JSON.parse(responseText); } catch (e) { }

    if (response.ok) {
      if (data.exception) {
        return {
          success: false,
          error: data.message || data.exception,
          message: data.message || "Failed to get KYC status"
        };
      }
      // Return the data field directly if it exists, as per user's provided response format
      const resultData = data.success && data.data ? data.data : data;
      return { success: true, data: resultData, message: "KYC status retrieved successfully" };
    } else {
      return { success: false, error: "Failed to retrieve KYC status" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get Mobilizer Dashboard Statistics API call
 * Returns stats about students added, applications created, approved, rejected, etc.
 */
export const getMobilizerDashboardStats = async (token: string): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_mobilizer_get_dashboard_stats");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    const finalUrl = urlObj.toString();
    console.log("Get Mobilizer Dashboard Stats URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (data.exception) {
        return {
          success: false,
          error: data.message || data.exception,
          message: data.message || "Failed to get mobilizer dashboard stats"
        };
      }
      return {
        success: true,
        data: data,
        message: data.message || "Dashboard stats retrieved successfully"
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Failed to retrieve dashboard stats",
        message: data.message || "Failed to retrieve dashboard stats"
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server"
    };
  }
};

/**
 * Get Mobilizer Upcoming Deadlines API call
 * Shows upcoming scholarship deadlines.
 */
export const getMobilizerUpcomingDeadlines = async (
  token: string,
  limit: number = 10,
  studentId?: number
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_mobilizer_get_upcoming_deadlines");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("limit", limit.toString());

    if (studentId) {
      urlObj.searchParams.append("student_id", studentId.toString());
    }

    const finalUrl = urlObj.toString();
    console.log("Get Mobilizer Upcoming Deadlines URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (data.exception) {
        return {
          success: false,
          error: data.message || data.exception,
          message: data.message || "Failed to get upcoming deadlines"
        };
      }
      return {
        success: true,
        data: data,
        message: "Upcoming deadlines retrieved successfully"
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Failed to retrieve upcoming deadlines",
        message: data.message || "Failed to retrieve upcoming deadlines"
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server"
    };
  }
};

/**
 * Get Mobilizer Recommended Scholarships API call
 * Returns visible scholarships not yet applied by the selected student.
 */
export const getMobilizerRecommendedScholarships = async (
  token: string,
  studentId: number,
  page: number = 1,
  perPage: number = 100
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_mobilizer_get_recommended_scholarships");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("student_id", studentId.toString());
    urlObj.searchParams.append("page", page.toString());
    urlObj.searchParams.append("per_page", perPage.toString());

    const finalUrl = urlObj.toString();
    console.log("Get Mobilizer Recommended Scholarships URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (data.exception) {
        return {
          success: false,
          error: data.message || data.exception,
          message: data.message || "Failed to get recommended scholarships"
        };
      }
      return {
        success: true,
        data: data,
        message: "Recommended scholarships retrieved successfully"
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Failed to retrieve recommended scholarships",
        message: data.message || "Failed to retrieve recommended scholarships"
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server"
    };
  }
};

/**
 * Get Mobilizer Scholarships for a specific student
 * Uses: local_mobileapi_mobilizer_get_scholarships
 */
export const getMobilizerStudentScholarships = async (
  token: string,
  studentId: number,
  params?: {
    search?: string;
    page?: number;
    per_page?: number;
    status?: string | "open" | "expired" | "closed";
    applied?: boolean | string;
    bookmarked?: boolean | string;
    state?: string;
    start_date?: string;
    end_date?: string;
    progress_min?: number | string;
    progress_max?: number | string;
    annual_family_income_max?: number | string;
    special_category?: string;
    last_class_percentage_min?: number | string;
    caste_category?: string;
    gender?: string;
    course_name?: string;
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_mobilizer_get_scholarships");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("student_id", studentId.toString());

    if (params) {
      if (params.search) urlObj.searchParams.append("search", params.search);
      if (params.page) urlObj.searchParams.append("page", String(params.page));
      if (params.per_page) urlObj.searchParams.append("per_page", String(params.per_page));
      if (params.status) urlObj.searchParams.append("status", params.status);
      if (params.applied !== undefined) urlObj.searchParams.append("applied", String(params.applied));
      if (params.bookmarked !== undefined) urlObj.searchParams.append("bookmarked", String(params.bookmarked));
      if (params.state) urlObj.searchParams.append("state", params.state);
      if (params.start_date) urlObj.searchParams.append("start_date", params.start_date);
      if (params.end_date) urlObj.searchParams.append("end_date", params.end_date);
      if (params.progress_min !== undefined) urlObj.searchParams.append("progress_min", String(params.progress_min));
      if (params.progress_max !== undefined) urlObj.searchParams.append("progress_max", String(params.progress_max));
      if (params.annual_family_income_max !== undefined) urlObj.searchParams.append("annual_family_income_max", String(params.annual_family_income_max));
      if (params.special_category) urlObj.searchParams.append("special_category", params.special_category);
      if (params.last_class_percentage_min !== undefined) urlObj.searchParams.append("last_class_percentage_min", String(params.last_class_percentage_min));
      if (params.caste_category) urlObj.searchParams.append("caste_category", params.caste_category);
      if (params.gender) urlObj.searchParams.append("gender", params.gender);
      if (params.course_name) urlObj.searchParams.append("course_name", params.course_name);
    }

    const finalUrl = urlObj.toString();
    console.log("Get Mobilizer Student Scholarships URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (data.exception) {
      return { success: false, error: data.message, message: data.message };
    }

    return { success: true, data: data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};



/**
 * Get Mobilizer Students API call
 * Get list of students managed by the current mobilizer.
 */
export const getMobilizerStudents = async (
  token: string,
  page: number = 1,
  perPage: number = 20,
  search?: string
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_mobilizer_get_my_students");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("page", page.toString());
    urlObj.searchParams.append("per_page", perPage.toString());

    if (search) {
      urlObj.searchParams.append("search", search);
    }

    const finalUrl = urlObj.toString();
    console.log("Get Mobilizer Students URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (data.exception) {
        return {
          success: false,
          error: data.message || data.exception,
          message: data.message || "Failed to get students"
        };
      }
      return {
        success: true,
        data: data,
        message: "Students retrieved successfully"
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Failed to retrieve students",
        message: data.message || "Failed to retrieve students"
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server"
    };
  }
};

/**
 * Get Mobilizer Student Profile API call
 * Fetch detailed profile of a student managed by the mobilizer.
 */
export const getMobilizerStudentProfile = async (
  token: string,
  studentId: number
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_mobilizer_get_student_profile");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("student_id", studentId.toString());

    const finalUrl = urlObj.toString();
    console.log("Get Mobilizer Student Profile URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (data.exception) {
        return {
          success: false,
          error: data.message || data.exception,
          message: data.message || "Failed to get student profile"
        };
      }
      return {
        success: true,
        data: data,
        message: "Student profile retrieved successfully"
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Failed to retrieve student profile",
        message: data.message || "Failed to retrieve student profile"
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server"
    };
  }
};

/**
 * Remove (Unlink) Student managed by the current mobilizer.
 */
export const mobilizerRemoveStudent = async (
  token: string,
  studentId: number
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_mobilizer_remove_student");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("student_id", studentId.toString());

    const finalUrl = urlObj.toString();
    console.log("Remove Student URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (data.exception) {
        return {
          success: false,
          error: data.message || data.exception,
          message: data.message || "Failed to remove student"
        };
      }
      return {
        success: true,
        data: data,
        message: data.message || "Student removed successfully from your panel"
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Failed to remove student",
        message: data.message || "Failed to remove student"
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server"
    };
  }
};



/**
 * Get Mobilizer Applications API call
 * Fetch applications created by the mobilizer with optional filters.
 */
export const getMobilizerApplications = async (
  token: string,
  params?: {
    page?: number;
    per_page?: number;
    student_id?: number;
    scholarship_id?: number;
    status?: string;
    start_date?: number; // unix timestamp
    end_date?: number; // unix timestamp
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_mobilizer_get_my_applications");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Add optional parameters if provided
    if (params?.page) {
      urlObj.searchParams.append("page", String(params.page));
    }
    if (params?.per_page) {
      urlObj.searchParams.append("per_page", String(params.per_page));
    }
    if (params?.student_id) {
      urlObj.searchParams.append("student_id", String(params.student_id));
    }
    if (params?.scholarship_id) {
      urlObj.searchParams.append("scholarship_id", String(params.scholarship_id));
    }
    if (params?.status) {
      urlObj.searchParams.append("status", params.status);
    }
    if (params?.start_date) {
      urlObj.searchParams.append("start_date", String(params.start_date));
    }
    if (params?.end_date) {
      urlObj.searchParams.append("end_date", String(params.end_date));
    }

    const finalUrl = urlObj.toString();
    console.log("Get Mobilizer Applications URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (data.exception) {
        return {
          success: false,
          error: data.message || data.exception,
          message: data.message || "Failed to get applications"
        };
      }
      return {
        success: true,
        data: data,
        message: "Applications retrieved successfully"
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Failed to retrieve applications",
        message: data.message || "Failed to retrieve applications"
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server"
    };
  }
};


/**
 * Mobilizer Apply for Student API call
 * Submit a scholarship application on behalf of a student.
 */
export const mobilizerApplyForStudent = async (
  token: string,
  data: {
    student_id: number;
    scholarship_id: number;
    application_text?: string;
    fullname?: string;
    email?: string;
    phone?: string;
    student_id_number?: string;
    institution?: string;
    major?: string;
    graduation_date?: string;
    current_year?: string;
    gpa?: string;
    activities?: string;
    financial_info?: string;
    assessment_q1?: string;
    assessment_q2?: string;
    interview_mode?: string;
    verification_time?: string;
    documents?: any[];
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_mobilizer_apply_for_student");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("student_id", String(data.student_id));
    urlObj.searchParams.append("scholarship_id", String(data.scholarship_id));

    // Add all optional parameters if provided
    if (data.application_text) {
      urlObj.searchParams.append("application_text", data.application_text);
    }
    if (data.fullname) {
      urlObj.searchParams.append("fullname", data.fullname);
    }
    if (data.email) {
      urlObj.searchParams.append("email", data.email);
    }
    if (data.phone) {
      urlObj.searchParams.append("phone", data.phone);
    }
    if (data.student_id_number) {
      urlObj.searchParams.append("student_id_number", data.student_id_number);
    }
    if (data.institution) {
      urlObj.searchParams.append("institution", data.institution);
    }
    if (data.major) {
      urlObj.searchParams.append("major", data.major);
    }
    if (data.graduation_date) {
      urlObj.searchParams.append("graduation_date", data.graduation_date);
    }
    if (data.current_year) {
      urlObj.searchParams.append("current_year", data.current_year);
    }
    if (data.gpa) {
      urlObj.searchParams.append("gpa", data.gpa);
    }
    if (data.activities) {
      urlObj.searchParams.append("activities", data.activities);
    }
    if (data.financial_info) {
      urlObj.searchParams.append("financial_info", data.financial_info);
    }
    if (data.assessment_q1) {
      urlObj.searchParams.append("assessment_q1", data.assessment_q1);
    }
    if (data.assessment_q2) {
      urlObj.searchParams.append("assessment_q2", data.assessment_q2);
    }
    if (data.interview_mode) {
      urlObj.searchParams.append("interview_mode", data.interview_mode);
    }
    if (data.verification_time) {
      urlObj.searchParams.append("verification_time", data.verification_time);
    }
    // Note: documents handling may need special processing depending on API requirements

    const finalUrl = urlObj.toString();
    console.log("Mobilizer Apply for Student URL:", finalUrl);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let responseData: any = {};

    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (responseData.exception) {
        return {
          success: false,
          error: responseData.message || responseData.exception,
          message: responseData.message || "Failed to submit application"
        };
      }
      return {
        success: true,
        data: responseData,
        message: responseData.message || "Application submitted successfully"
      };
    } else {
      return {
        success: false,
        error: responseData.error || responseData.message || "Failed to submit application",
        message: responseData.message || "Failed to submit application"
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server"
    };
  }
};


/**
 * Add Mobilizer Student API call
 * Add a new student managed by the mobilizer.
 */
export const addMobilizerStudent = async (
  token: string,
  studentData: any // Changed to any to accept indexed customfields format
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");

    // Prepare parameters for x-www-form-urlencoded body
    const params: string[] = [];
    params.push(`wsfunction=local_mobileapi_mobilizer_add_student`);
    params.push(`moodlewsrestformat=json`);
    params.push(`wstoken=${token}`);

    // Add all fields from studentData
    Object.keys(studentData).forEach(key => {
      const value = studentData[key];
      if (key === 'customfields' && Array.isArray(value)) {
        value.forEach((field: any, index: number) => {
          params.push(`customfields[${index}][shortname]=${encodeURIComponent(field.shortname)}`);
          params.push(`customfields[${index}][value]=${encodeURIComponent(field.value)}`);
        });
      } else if (value !== undefined && value !== null && value !== '') {
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    });

    const bodyContent = params.join('&');

    console.log("Add Mobilizer Student Body:", bodyContent);

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: bodyContent
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (data.exception) {
        return {
          success: false,
          error: data.message || data.exception,
          message: data.message || "Failed to add student"
        };
      }
      return {
        success: true,
        data: data,
        message: data.message || "Student added successfully"
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Failed to add student",
        message: data.message || "Failed to add student"
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server"
    };
  }
};

/**
 * Update Mobilizer Student API call
 * Update an existing student managed by the mobilizer.
 */
export const updateMobilizerStudent = async (
  token: string,
  studentData: any // Changed to any to accept indexed customfields format
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");

    // Prepare parameters for x-www-form-urlencoded body
    const params: string[] = [];
    params.push(`wsfunction=local_mobileapi_mobilizer_update_student`);
    params.push(`moodlewsrestformat=json`);
    params.push(`wstoken=${token}`);

    // Add all fields from studentData
    Object.keys(studentData).forEach(key => {
      const value = studentData[key];
      if (key === 'customfields' && Array.isArray(value)) {
        value.forEach((field: any, index: number) => {
          params.push(`customfields[${index}][shortname]=${encodeURIComponent(field.shortname)}`);
          params.push(`customfields[${index}][value]=${encodeURIComponent(field.value)}`);
        });
      } else if (value !== undefined && value !== null && value !== '') {
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    });

    const bodyContent = params.join('&');

    console.log("Update Mobilizer Student Body:", bodyContent);

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: bodyContent
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    if (response.ok) {
      if (data.exception) {
        return {
          success: false,
          error: data.message || data.exception,
          message: data.message || "Failed to update student"
        };
      }
      return {
        success: true,
        data: data,
        message: data.message || "Student updated successfully"
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Failed to update student",
        message: data.message || "Failed to update student"
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server"
    };
  }
};

/**
 * Get Mobilizer Scholarships API call (POST with query parameters)
 * This requires a token from AsyncStorage
 */
export const getMobilizerScholarships = async (
  token: string,
  params?: {
    search?: string;
    page?: number;
    per_page?: number;
    categoryid?: number;
    deadline_before?: number;
    bookmarked?: number; // 1 or 0
  }
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);

    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_mobilizer_get_scholarships");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    // Add optional parameters if provided
    if (params?.search) {
      urlObj.searchParams.append("search", params.search);
    }
    if (params?.page) {
      urlObj.searchParams.append("page", String(params.page));
    }
    if (params?.per_page) {
      urlObj.searchParams.append("per_page", String(params.per_page));
    }
    if (params?.categoryid) {
      urlObj.searchParams.append("categoryid", String(params.categoryid));
    }
    if (params?.deadline_before) {
      urlObj.searchParams.append("deadline_before", String(params.deadline_before));
    }
    if (params?.bookmarked !== undefined) {
      urlObj.searchParams.append("bookmarked", String(params.bookmarked));
    }

    const finalUrl = urlObj.toString();
    console.log("Get Mobilizer Scholarships URL:", finalUrl);

    // Make POST request with query parameters in URL
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get response text first to handle different response types
    const responseText = await response.text();
    let data: any = {};

    // Try to parse as JSON
    try {
      data = responseText ? JSON.parse(responseText) : {};

      // Check for authentication errors (invalid token or inactive account)
      const shouldLogout = await checkAuthenticationError(data);
      if (shouldLogout) {
        return {
          success: false,
          error: data?.errorcode === "invalidtoken"
            ? "Invalid token"
            : data?.errorcode === "accountinactive"
              ? "Account inactive"
              : "User profile incomplete",
          message: data?.errorcode === "invalidtoken"
            ? "Your session has expired. Please login again."
            : data?.errorcode === "accountinactive"
              ? "Your account is inactive."
              : "Please complete your profile setup.",
        };
      }
    } catch (e) {
      // If not JSON, treat as plain text error
      return {
        success: false,
        error: responseText || "Invalid response from server",
        message: "Server returned an invalid response",
      };
    }

    // Check if request was successful
    if (response.ok) {
      return {
        success: true,
        data: data,
        message: data.message || "Scholarships retrieved successfully",
      };
    } else {
      // Handle API errors
      return {
        success: false,
        error: data.error || data.message || data.error_message || "Something went wrong",
        message: data.message || "Failed to retrieve scholarships",
      };
    }
  } catch (error: any) {
    // Handle network errors
    return {
      success: false,
      error: error.message || "Network error. Please check your connection.",
      message: "Failed to connect to server",
    };
  }
};

// ==========================================
// Type Definitions for Dropdown Data
// ==========================================

export interface Option {
    value: string;
    label: string;
}

export interface DropdownField {
    shortname: string;
    name: string;
    options: Option[];
}

export interface DropdownData {
    course_fields: DropdownField[];
    user_fields: DropdownField[];
}

export const getDropdownDefinitions = async (token: string): Promise<ApiResponse<DropdownData>> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_dropdown_definitions");
    urlObj.searchParams.append("moodlewsrestformat", "json");

    const response = await fetch(urlObj.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const responseText = await response.text();
    let data: any = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      return { success: false, error: responseText || "Invalid response", message: "Invalid response from server" };
    }

    if (data.success && data.data) {
      return { success: true, data: data.data, message: "Dropdowns retrieved" };
    }
    return { success: false, error: data.message || "Failed to fetch dropdowns", message: "Failed to fetch dropdown definitions" };
  } catch (error: any) {
    return { success: false, error: error.message || "Network error", message: "Failed to connect to server" };
  }
};

/**
 * Link an existing student via email to the mobilizer's managed list.
 */
export const mobilizerLinkExistingStudent = async (token: string, email: string): Promise<ApiResponse> => {
    try {
        const baseUrl = getApiUrl("webservice/rest/server.php");
        const urlObj = new URL(baseUrl);
        urlObj.searchParams.append("wstoken", token);
        urlObj.searchParams.append("wsfunction", "local_mobileapi_mobilizer_link_existing_student");
        urlObj.searchParams.append("moodlewsrestformat", "json");
        urlObj.searchParams.append("email", email);

        console.log("🔗 Link Student URL:", urlObj.toString());

        const response = await fetch(urlObj.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        const responseText = await response.text();
        let data: any = {};
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            return { success: false, error: responseText || "Invalid response", message: "Invalid response from server" };
        }

        if (data.status === 'success' || data.success || !data.exception) {
            return { success: true, data: data, message: data.message || "Student linked successfully" };
        }
        return { success: false, error: data.message || "Failed to link student", message: data.message || "Failed to link existing student" };
    } catch (error: any) {
        return { success: false, error: error.message || "Network error", message: "Failed to connect to server" };
    }
};