import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

const DIGILOCKER_CONFIG = {
  CLIENT_ID: process.env.EXPO_PUBLIC_DIGILOCKER_CLIENT_ID || "LU843A12AD",
  CLIENT_SECRET: process.env.EXPO_PUBLIC_DIGILOCKER_CLIENT_SECRET || "dc761d2389025ef195c2",
  // Use app scheme for redirect if env var is not set, to ensure it returns to the app
  REDIRECT_URI: process.env.EXPO_PUBLIC_DIGILOCKER_REDIRECT_URI || Linking.createURL("digilocker"),
  AUTH_URL: "https://api.digitallocker.gov.in/public/oauth2/1/authorize",
  TOKEN_URL: "https://api.digitallocker.gov.in/public/oauth2/1/token",
  API_BASE_URL: "https://api.digilocker.gov.in/v1",
  SCOPE: "read", 
};

const STORAGE_KEYS = {
  DIGILOCKER_ACCESS_TOKEN: "@ydf_digilocker_access_token",
  DIGILOCKER_REFRESH_TOKEN: "@ydf_digilocker_refresh_token",
  DIGILOCKER_TOKEN_EXPIRY: "@ydf_digilocker_token_expiry",
  DIGILOCKER_CONNECTED: "@ydf_digilocker_connected",
};

export interface DigiLockerTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface DigiLockerDocument {
  uri: string;
  name: string;
  type: string;
  size: string;
  date: string;
  doctype: string;
}


export const getDigiLockerAuthUrl = (): string => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: DIGILOCKER_CONFIG.CLIENT_ID,
    redirect_uri: DIGILOCKER_CONFIG.REDIRECT_URI,
    scope: DIGILOCKER_CONFIG.SCOPE,
    state: generateRandomState(),
  });

  return `${DIGILOCKER_CONFIG.AUTH_URL}?${params.toString()}`;
};


const generateRandomState = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};


export const exchangeCodeForToken = async (code: string): Promise<DigiLockerTokenResponse> => {
  try {
    const response = await fetch(DIGILOCKER_CONFIG.TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: DIGILOCKER_CONFIG.REDIRECT_URI,
        client_id: DIGILOCKER_CONFIG.CLIENT_ID,
        client_secret: DIGILOCKER_CONFIG.CLIENT_SECRET,
      }),
    });
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }
    const data: DigiLockerTokenResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw error;
  }
};

/**
 * Store DigiLocker tokens
 */
export const storeDigiLockerTokens = async (tokenResponse: DigiLockerTokenResponse): Promise<void> => {
  try {
    const expiryTime = Date.now() + tokenResponse.expires_in * 1000;
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.DIGILOCKER_ACCESS_TOKEN, tokenResponse.access_token],
      [STORAGE_KEYS.DIGILOCKER_REFRESH_TOKEN, tokenResponse.refresh_token],
      [STORAGE_KEYS.DIGILOCKER_TOKEN_EXPIRY, expiryTime.toString()],
      [STORAGE_KEYS.DIGILOCKER_CONNECTED, "true"],
    ]);
  } catch (error) {
    console.error("Error storing DigiLocker tokens:", error);
    throw error;
  }
};

/**
 * Get stored access token
 */
export const getDigiLockerAccessToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.DIGILOCKER_ACCESS_TOKEN);
    const expiry = await AsyncStorage.getItem(STORAGE_KEYS.DIGILOCKER_TOKEN_EXPIRY);
    
    if (!token || !expiry) {
      return null;
    }

    // Check if token is expired
    if (Date.now() > parseInt(expiry)) {
      // Token expired, try to refresh
      const refreshed = await refreshDigiLockerToken();
      return refreshed;
    }

    return token;
  } catch (error) {
    console.error("Error getting DigiLocker token:", error);
    return null;
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshDigiLockerToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.DIGILOCKER_REFRESH_TOKEN);
    
    if (!refreshToken) {
      return null;
    }

    const response = await fetch(DIGILOCKER_CONFIG.TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: DIGILOCKER_CONFIG.CLIENT_ID,
        client_secret: DIGILOCKER_CONFIG.CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }
    const data: DigiLockerTokenResponse = await response.json();
    await storeDigiLockerTokens(data);
    return data.access_token;
  } catch (error) {
    console.error("Error refreshing DigiLocker token:", error);
    // Clear stored tokens on refresh failure
    await clearDigiLockerTokens();
    return null;
  }
};

/**
 * Check if DigiLocker is connected
 */

export const isDigiLockerConnected = async (): Promise<boolean> => {
  try {
    const connected = await AsyncStorage.getItem(STORAGE_KEYS.DIGILOCKER_CONNECTED);
    const token = await getDigiLockerAccessToken();
    return connected === "true" && token !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Clear DigiLocker tokens and connection status
 */
export const clearDigiLockerTokens = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.DIGILOCKER_ACCESS_TOKEN,
      STORAGE_KEYS.DIGILOCKER_REFRESH_TOKEN,
      STORAGE_KEYS.DIGILOCKER_TOKEN_EXPIRY,
      STORAGE_KEYS.DIGILOCKER_CONNECTED,
    ]);
  } catch (error) {
    console.error("Error clearing DigiLocker tokens:", error);
  }
};

/**
 * Initiate DigiLocker OAuth flow
 */
export const initiateDigiLockerAuth = async (): Promise<string | null> => {
  try {
    const authUrl = getDigiLockerAuthUrl();
    
    // Open browser for OAuth authentication
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      DIGILOCKER_CONFIG.REDIRECT_URI
    );

    if (result.type === "success" && result.url) {
      // Extract authorization code from callback URL
      const url = new URL(result.url);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        throw new Error(`OAuth error: ${error}`);
      }

      if (code) {
        return code;
      }
    }

    return null;
  } catch (error) {
    console.error("Error initiating DigiLocker auth:", error);
    throw error;
  }
};

/**
 * Complete DigiLocker authentication flow
 */
export const connectDigiLocker = async (): Promise<boolean> => {
  try {
    // Step 1: Initiate OAuth flow
    const code = await initiateDigiLockerAuth();
    
    if (!code) {
      throw new Error("No authorization code received");
    }

    // Step 2: Exchange code for tokens
    const tokenResponse = await exchangeCodeForToken(code);
    
    // Step 3: Store tokens
    await storeDigiLockerTokens(tokenResponse);
    
    return true;
  } catch (error) {
    console.error("Error connecting DigiLocker:", error);
    return false;
  }
};

/**
 * Fetch documents from DigiLocker
 */
export const fetchDigiLockerDocuments = async (): Promise<DigiLockerDocument[]> => {
  try {
    const accessToken = await getDigiLockerAccessToken();
    
    if (!accessToken) {
      throw new Error("DigiLocker not connected. Please connect first.");
    }

    // Fetch documents from DigiLocker API
    const response = await fetch(`${DIGILOCKER_CONFIG.API_BASE_URL}/documents`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        const newToken = await refreshDigiLockerToken();
        if (newToken) {
          // Retry with new token
          return fetchDigiLockerDocuments();
        }
      }
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform DigiLocker documents to our format
    return data.documents?.map((doc: any) => ({
      uri: doc.uri || doc.url,
      name: doc.name || doc.title,
      type: doc.type || "PDF",
      size: doc.size || "Unknown",
      date: doc.date || doc.created_at,
      doctype: doc.doctype || doc.document_type,
    })) || [];
  } catch (error) {
    console.error("Error fetching DigiLocker documents:", error);
    throw error;
  }
};

/**
 * Download document from DigiLocker
 */
export const downloadDigiLockerDocument = async (documentUri: string): Promise<{
  name: string;
  size: string;
  type: string;
  uri: string;
}> => {
  try {
    const accessToken = await getDigiLockerAccessToken();
    
    if (!accessToken) {
      throw new Error("DigiLocker not connected");
    }

    // Fetch document from DigiLocker
    const response = await fetch(documentUri, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.statusText}`);
    }

    // For React Native, we'll return the URI for the document
    // In a real implementation, you might want to save it locally
    const blob = await response.blob();
    const fileName = documentUri.split("/").pop() || `digilocker_${Date.now()}.pdf`;
    const fileSize = blob.size ? `${(blob.size / (1024 * 1024)).toFixed(2)} MB` : "Unknown";

    // Create a local file URI (this is a simplified version)
    // In production, you'd use expo-file-system to save the file
    return {
      name: fileName,
      size: fileSize,
      type: "PDF",
      uri: documentUri, // In production, this would be a local file URI
    };
  } catch (error) {
    console.error("Error downloading DigiLocker document:", error);
    throw error;
  }
};

