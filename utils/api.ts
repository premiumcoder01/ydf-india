import { getApiUrl } from "./apiConfig";

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// API Error types
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
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
  return apiRequest(
    "local/mobileapi/registration.php",
    {
      username: userData.username,
      password: userData.password,
      email: userData.email,
      emailagain: userData.email, // API requires email confirmation
      firstname: userData.firstname,
      lastname: userData.lastname,
      phone: userData.phone,
    },
    "POST"
  );
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
 * Get All Scholarships API call (POST with query parameters)
 * This requires a token from AsyncStorage
 */
export const getAllScholarships = async (
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
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_all_scholarships");
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
  scholarshipId: number
): Promise<ApiResponse> => {
  try {
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);
    
    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_scholarship_details");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    urlObj.searchParams.append("scholarship_id", String(scholarshipId));
    
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
 * Bookmark/Unbookmark Scholarship API call (POST with query parameters)
 * This requires a token from AsyncStorage, scholarship_id, and action (bookmark/unbookmark)
 */
export const bookmarkScholarship = async (
  token: string,
  scholarshipId: number,
  action: "bookmark" | "unbookmark"
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
    const urlObj = new URL(baseUrl);
    
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_update_profile");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    
    // Core fields
    if (profileData.firstName) urlObj.searchParams.append("firstname", profileData.firstName);
    if (profileData.lastName) urlObj.searchParams.append("lastname", profileData.lastName);
    if (profileData.email) urlObj.searchParams.append("email", profileData.email);
    if (profileData.phone) urlObj.searchParams.append("phone1", profileData.phone);
    if (profileData.address) urlObj.searchParams.append("address", profileData.address);
    if (profileData.city) urlObj.searchParams.append("city", profileData.city);
    urlObj.searchParams.append("country", "IN"); 

    // Birthday decomposition (DD/MM/YYYY)
    if (profileData.dob) {
      const parts = profileData.dob.split('/');
      if (parts.length === 3) {
        urlObj.searchParams.append("birthday", parts[0]);
        urlObj.searchParams.append("birthmonth", parts[1]);
        urlObj.searchParams.append("birthyear", parts[2]);
      }
    }

    // Custom Fields
    const customFieldMap: Record<string, string> = {
      gender: profileData.gender,
      religion: profileData.religion,
      caste: profileData.caste,
      domicilestate: profileData.domicileState,
      district: profileData.district,
      village: profileData.village,
      fathername: profileData.fatherName,
      mothername: profileData.motherName,
      annualincome: profileData.annualIncome,
      bankaccountno: profileData.bankAccountNo,
      ifsccode: profileData.ifscCode,
      bankname: profileData.bankName,
      branchname: profileData.branchName,
      currentcourse: profileData.currentCourse,
      currentcoursecategory: profileData.currentCourseCategory,
    };

    let fieldIndex = 0;
    Object.entries(customFieldMap).forEach(([shortname, value]) => {
      if (value) {
        urlObj.searchParams.append(`customfields[${fieldIndex}][shortname]`, shortname);
        urlObj.searchParams.append(`customfields[${fieldIndex}][value]`, value);
        fieldIndex++;
      }
    });

    const finalUrl = urlObj.toString();
    console.log("Update Profile URL:", finalUrl);

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
 * Get Notifications API call (POST with query parameters)
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
    const baseUrl = getApiUrl("webservice/rest/server.php");
    const urlObj = new URL(baseUrl);
    
    // Add required query parameters
    urlObj.searchParams.append("wstoken", token);
    urlObj.searchParams.append("wsfunction", "local_mobileapi_get_notifications");
    urlObj.searchParams.append("moodlewsrestformat", "json");
    
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
