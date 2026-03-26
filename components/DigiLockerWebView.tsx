import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewNavigation } from "react-native-webview";

/**
 * WebView Authentication Component
 * Displays a modal with WebView for OAuth authentication
 */
interface WebViewAuthProps {
  visible: boolean;
  url: string;
  redirectUri: string;
  onClose: () => void;
  onSuccess: (url: string) => void;
  onError: (error: string) => void;
}

export function DigiLockerWebView({ visible, url, redirectUri, onClose, onSuccess, onError }: WebViewAuthProps) {
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);
  const { isDark, colors } = useTheme();

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const newUrl = navState.url;

    // Log every URL change
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🌐 URL Changed:", newUrl);
    console.log("📋 Current URL (copy this):", newUrl);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Check if this is the redirect URI (contains code= or error=)
    if (newUrl.includes("code=") || newUrl.includes("error=") || (redirectUri && newUrl.includes(redirectUri))) {
      console.log("✅ Redirect URL Detected in Navigation! Closing WebView...");
      console.log("🔗 Full redirect URL:", newUrl);

      // Stop loading immediately to avoid SSL errors on the redirect domain
      webViewRef.current?.stopLoading();

      // Close WebView and return the URL
      onSuccess(newUrl);
    }
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    
    // IGNORE SSL PROTOCOL ERRORS ON THE REDIRECT DOMAIN
    // This is the common fix for net::ERR_SSL_PROTOCOL_ERROR on callback URLs
    if (nativeEvent.url && (nativeEvent.url.includes("code=") || nativeEvent.url.includes(redirectUri))) {
      console.log("ℹ️ Ignoring WebView error on redirect URL:", nativeEvent.description);
      return;
    }

    console.error("❌ WebView Error:", nativeEvent);
    onError(nativeEvent.description || "WebView error occurred");
  };

  const handleShouldStartLoadWithRequest = (request: any) => {
    const { url } = request;
    
    // If the request is for the redirect URI, we can sometimes intercept it here 
    // before the WebView even tries to load it (and fails with SSL error)
    if (url.includes("code=") || url.includes("error=") || (redirectUri && url.includes(redirectUri))) {
      console.log("✅ Redirect URL Intercepted in Request! Closing WebView...");
      onSuccess(url);
      return false; // Prevent loading
    }
    return true;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.card }}>
        {/* Header with close button */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sign in with DigiLocker</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* WebView */}
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onError={handleError}
          onLoadStart={() => {
            setLoading(true);
            console.log("🔄 WebView started loading");
          }}
          onLoadEnd={() => {
            setLoading(false);
            console.log("✅ WebView finished loading");
          }}
          style={[styles.webview, { backgroundColor: colors.card }]}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={[styles.loadingOverlay, { backgroundColor: colors.card }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading DigiLocker...</Text>
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
});

