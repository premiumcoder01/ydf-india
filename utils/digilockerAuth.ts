import { DigiLockerWebView } from "@/components/DigiLockerWebView";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import React, { useState } from "react";

/**
 * URL Tracking with React Native WebView
 * 
 * Using react-native-webview instead of expo-web-browser for full URL tracking:
 * - Track ALL URL changes including intermediate navigation
 * - Full control over WebView lifecycle
 * - Close WebView when redirect URL is detected
 * - Real-time URL logging in console
 */

/**
 * Current browser URL tracker
 * This stores the current URL of the web browser for future use
 */
let currentBrowserUrl: string | null = null;


export function getCurrentBrowserUrl(): string | null {
  return currentBrowserUrl;
}


const DIGILOCKER_CLIENT_ID =
  process.env.EXPO_PUBLIC_DIGILOCKER_CLIENT_ID || "";

const DIGILOCKER_CLIENT_SECRET =
  process.env.EXPO_PUBLIC_DIGILOCKER_CLIENT_SECRET || "";

const DIGILOCKER_AUTH_URL =
  "https://api.digitallocker.gov.in/public/oauth2/1/authorize";

const DIGILOCKER_TOKEN_URL =
  "https://api.digitallocker.gov.in/public/oauth2/1/token";

const DIGILOCKER_USER_INFO_URL =
  "https://api.digitallocker.gov.in/public/oauth2/1/user";

// DigiLocker requires scope to be either "avs" or "avs_parent"
const DIGILOCKER_SCOPE = "";


// Redirect URI must match exactly what's configured in API Setu dashboard
const DIGILOCKER_REDIRECT_URI =
  process.env.EXPO_PUBLIC_DIGILOCKER_REDIRECT_URI || "https://www.ydfindia.com/digilocker-callback.html";


export interface DigiLockerAuthResult {
  authorizationCode: string;
  codeVerifier?: string; // PKCE code verifier for token exchange
}


export interface DigiLockerTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
  digilockerid?: string;
  name?: string;
  dob?: string;
  gender?: string;
  eaadhaar?: string;
  reference_key?: string;
  mobile?: string;
  new_account?: string;
}


export interface DigiLockerUserInfo {
  digilockerid: string; // 36-character DigiLocker ID
  name: string; // User's name
  dob: string; // Date of birth in DDMMYYYY format
  gender: "M" | "F" | "T"; // Gender: M=Male, F=Female, T=Transgender
  eaadhaar: "Y" | "N"; // Whether eAadhaar data is available
  reference_key?: string; // Transient reference key for tracing
}


function generateState(): string {
  return (
    Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2)
  );
}


function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  
  while (i < bytes.length) {
    const a = bytes[i++];
    const b = i < bytes.length ? bytes[i++] : 0;
    const c = i < bytes.length ? bytes[i++] : 0;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += i - 2 < bytes.length ? chars.charAt((bitmap >> 6) & 63) : "=";
    result += i - 1 < bytes.length ? chars.charAt(bitmap & 63) : "=";
  }
  
  return result;
}

/**
 * Generate PKCE code verifier and challenge
 * DigiLocker requires PKCE for OAuth flows
 */
async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const base64 = uint8ArrayToBase64(randomBytes);
  const codeVerifier = base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  const codeChallenge = hash
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  
  return { codeVerifier, codeChallenge };
}


/**
 * Global state for WebView authentication
 */
let webViewResolve: ((result: DigiLockerAuthResult | null) => void) | null = null;
let webViewReject: ((error: Error) => void) | null = null;
let webViewVisible = false;
let webViewUrl = "";
let webViewRedirectUri = "";
let webViewCodeVerifier: string | undefined = undefined;

/**
 * WebView component instance (will be set by the hook)
 */
let WebViewInstance: React.ReactElement | null = null;

/**
 * Hook to use DigiLocker WebView authentication
 * Returns the WebView component that should be rendered in your app
 */
export function useDigiLockerWebView() {
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState("");
  const [redirectUri, setRedirectUri] = useState("");

  const handleSuccess = (callbackUrl: string) => {
    currentBrowserUrl = callbackUrl;
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ REDIRECT URL RECEIVED! This is the callback URL:");
    console.log("🌐 Browser Redirect URL:", callbackUrl);
    console.log("📋 Current URL (copy this):", callbackUrl);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Update current URL tracker
    currentBrowserUrl = callbackUrl;

    try {
      const parsed = Linking.parse(callbackUrl);
      const code = parsed.queryParams?.code as string | undefined;
      const error = parsed.queryParams?.error as string | undefined;
      const errorDescription = parsed.queryParams?.error_description as string | undefined;

      if (error) {
        console.error("❌ DigiLocker error:", error, errorDescription);
        if (webViewReject) {
          webViewReject(new Error(errorDescription || error || "Authentication failed"));
        }
        setVisible(false);
        return;
      }

      if (!code) {
        console.error("❌ No authorization code in URL:", callbackUrl);
        if (webViewReject) {
          webViewReject(new Error("No authorization code received from DigiLocker."));
        }
        setVisible(false);
        return;
      }

      console.log("✅ DigiLocker authorization code received:", code.substring(0, 10) + "...");

      if (webViewResolve) {
        webViewResolve({
          authorizationCode: code,
          codeVerifier: webViewCodeVerifier,
        });
      }
    } catch (error) {
      if (webViewReject) {
        webViewReject(error as Error);
      }
    }

    setVisible(false);
  };

  const handleClose = () => {
    console.log("ℹ️ User closed WebView");
    if (webViewResolve) {
      webViewResolve(null);
    }
    setVisible(false);
  };

  const handleError = (error: string) => {
    console.error("❌ WebView error:", error);
    if (webViewReject) {
      webViewReject(new Error(error));
    }
    setVisible(false);
  };

  // Update global state when local state changes
  React.useEffect(() => {
    webViewVisible = visible;
    webViewUrl = url;
    webViewRedirectUri = redirectUri;
  }, [visible, url, redirectUri]);

  const WebViewComponent = React.createElement(
    DigiLockerWebView,
    {
      visible,
      url,
      redirectUri,
      onClose: handleClose,
      onSuccess: handleSuccess,
      onError: handleError,
    }
  );

  return {
    WebViewComponent,
    show: (authUrl: string, redirect: string) => {
      setUrl(authUrl);
      setRedirectUri(redirect);
      setVisible(true);
    },
  };
}

/**
 * Start DigiLocker login using React Native WebView
 * This requires the WebView hook to be used in your component
 */
export async function loginWithDigiLocker(
  showWebView: (url: string, redirectUri: string) => void
): Promise<DigiLockerAuthResult | null> {
  try {
    const redirectUri = DIGILOCKER_REDIRECT_URI;
    const state = generateState();
    
    // Generate PKCE parameters (required by DigiLocker)
    const { codeVerifier, codeChallenge } = await generatePKCE();
    webViewCodeVerifier = codeVerifier;
    console.log("🔐 Generated PKCE code challenge");

    const authUrl =
      `${DIGILOCKER_AUTH_URL}?` +
      new URLSearchParams({
        response_type: "code",
        client_id: DIGILOCKER_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: DIGILOCKER_SCOPE,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256", // SHA256
      }).toString();

    console.log("🔐 DigiLocker Auth URL:", authUrl);
    console.log("🔗 Redirect URI (must match API Setu dashboard):", redirectUri);
    console.log("📱 Opening WebView for DigiLocker authentication...");
    console.log("🔏 DigiLocker Scope:", DIGILOCKER_SCOPE);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🌐 Initial URL:");
    console.log("📋 Current URL (copy this):", authUrl);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("ℹ️ URL Tracking Info:");
    console.log("   • ALL URL changes will be logged in real-time");
    console.log("   • WebView will close automatically when redirect is detected");

    currentBrowserUrl = authUrl;

    // Show WebView
    showWebView(authUrl, redirectUri);

    // Return a promise that resolves when WebView closes
    return new Promise<DigiLockerAuthResult | null>((resolve, reject) => {
      webViewResolve = resolve;
      webViewReject = reject;
    });
  } catch (error) {
    console.error("❌ DigiLocker login failed:", error);
    throw error;
  }
}

/**
 * Exchange authorization code for access token
 * POST https://api.digitallocker.gov.in/public/oauth2/1/token
 * Content-Type: application/x-www-form-urlencoded
 */
export async function exchangeAuthorizationCodeForToken(
  authorizationCode: string,
  codeVerifier?: string
): Promise<DigiLockerTokenResponse> {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔄 Exchanging authorization code for access token...");
    console.log("📋 API Endpoint:", DIGILOCKER_TOKEN_URL);
    console.log("📋 Authorization Code:", authorizationCode.substring(0, 20) + "...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Build request body exactly as specified
    const requestBody = new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      client_id: DIGILOCKER_CLIENT_ID,
      client_secret: DIGILOCKER_CLIENT_SECRET,
      redirect_uri: DIGILOCKER_REDIRECT_URI,
    });

    // Add PKCE code_verifier if provided
    if (codeVerifier) {
      requestBody.append("code_verifier", codeVerifier);
    }

    console.log("📤 Request Body Parameters:");
    console.log("   • grant_type: authorization_code");
    console.log("   • code:", authorizationCode.substring(0, 20) + "...");
    console.log("   • client_id:", DIGILOCKER_CLIENT_ID);
    console.log("   • client_secret:", DIGILOCKER_CLIENT_SECRET ? "***" : "NOT SET");
    console.log("   • redirect_uri:", DIGILOCKER_REDIRECT_URI);
    if (codeVerifier) {
      console.log("   • code_verifier:", codeVerifier.substring(0, 20) + "...");
    }

    const response = await fetch(DIGILOCKER_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody.toString(),
    });

    console.log("📥 Response Status:", response.status, response.statusText);
    console.log("📥 Response Headers:", JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    const responseText = await response.text();
    console.log("📥 Raw Response:", responseText);

    if (!response.ok) {
      console.error("❌ Token exchange failed!");
      console.error("❌ Status:", response.status);
      console.error("❌ Response:", responseText);
      throw new Error(`Token exchange failed: ${response.status} - ${responseText}`);
    }

    // Parse JSON response
    let tokenData: DigiLockerTokenResponse;
    try {
      tokenData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse response as JSON:", parseError);
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ TOKEN EXCHANGE SUCCESSFUL!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 Full Token Response:");
    console.log(JSON.stringify(tokenData, null, 2));
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 Token Details:");
    console.log("   • access_token:", tokenData.access_token ? tokenData.access_token.substring(0, 30) + "..." : "NOT FOUND");
    console.log("   • token_type:", tokenData.token_type || "NOT FOUND");
    console.log("   • expires_in:", tokenData.expires_in || "NOT FOUND");
    console.log("   • refresh_token:", tokenData.refresh_token ? tokenData.refresh_token.substring(0, 30) + "..." : "NOT FOUND");
    console.log("   • scope:", tokenData.scope || "NOT FOUND");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return tokenData;
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR EXCHANGING CODE FOR TOKEN:");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(error);
    throw error;
  }
}

/**
 * Get user information from DigiLocker
 * According to DigiLocker API docs: https://api.digitallocker.gov.in/public/oauth2/1/user
 */
export async function getDigiLockerUserInfo(
  accessToken: string
): Promise<DigiLockerUserInfo> {
  try {
    console.log("🔄 Fetching user information from DigiLocker...");

    const response = await fetch(DIGILOCKER_USER_INFO_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Failed to fetch user info:", response.status, errorText);
    }

    const userInfo: DigiLockerUserInfo = await response.json();
    console.log("✅ User information received:");
    console.log("📋 DigiLocker ID:", userInfo.digilockerid);
    console.log("📋 Name:", userInfo.name);
    console.log("📋 DOB:", userInfo.dob);
    console.log("📋 Gender:", userInfo.gender);
    console.log("📋 eAadhaar available:", userInfo.eaadhaar);

    return userInfo;
  } catch (error) {
    console.error("❌ Error fetching user info:", error);
    throw error;
  }
}

/**
 * Complete DigiLocker authentication flow
 * Exchanges authorization code for token and fetches user info
 */
export async function completeDigiLockerAuth(
  authResult: DigiLockerAuthResult
): Promise<{
  token: DigiLockerTokenResponse;
  userInfo: DigiLockerUserInfo;
}> {
  try {
    if (!authResult.codeVerifier) {
      throw new Error("Code verifier is required for token exchange");
    }

    // Step 1: Exchange authorization code for access token
    const token = await exchangeAuthorizationCodeForToken(
      authResult.authorizationCode,
      authResult.codeVerifier
    );

    // Step 2: Get user information
    const userInfo = await getDigiLockerUserInfo(token.access_token);

    return {
      token,
      userInfo,
    };
  } catch (error) {
    console.error("❌ Error completing DigiLocker auth:", error);
    throw error;
  }
}
