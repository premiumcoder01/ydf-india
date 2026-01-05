import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';

interface LinkedInLoginProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: (accessToken: string) => void;
    onFailure: (error: string) => void;
    clientID: string;
    clientSecret: string;
    redirectUri: string;
    authState?: string;
}

export const LinkedInLogin = ({
    visible,
    onClose,
    onSuccess,
    onFailure,
    clientID,
    clientSecret,
    redirectUri,
    authState = 'random_state_string',
}: LinkedInLoginProps) => {
    const [loading, setLoading] = useState(false);

    // Scopes required for OpenID Connect
    const scopes = ['openid', 'profile', 'email'];
    const scopeString = encodeURIComponent(scopes.join(' '));

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientID}&redirect_uri=${encodeURIComponent(
        redirectUri
    )}&state=${authState}&scope=${scopeString}`;

    const exchangeCodeForToken = async (code: string) => {
        setLoading(true);
        try {
            const details = {
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: clientID,
                client_secret: clientSecret,
            };

            const formBody = Object.keys(details)
                .map(
                    (key) =>
                        encodeURIComponent(key) + '=' + encodeURIComponent((details as any)[key])
                )
                .join('&');

            const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody,
            });

            const json = await response.json();

            if (json.access_token) {
                onSuccess(json.access_token);
                onClose();
            } else {
                onFailure(json.error_description || 'Failed to get access token');
            }
        } catch (error: any) {
            onFailure(error.message || 'Error exchanging code');
        } finally {
            setLoading(false);
        }
    };

    const handleNavigationStateChange = (navState: WebViewNavigation) => {
        const { url } = navState;

        if (!url) return;

        console.log('LinkedIn WebView URL:', url);

        // Check if we have been redirected to the callback URL
        if (url.startsWith(redirectUri)) {
            // Parse the query parameters
            const params = new URL(url).searchParams;
            const code = params.get('code');
            const error = params.get('error');

            if (code) {
                // We found a code! Stop loading the page and exchange it.
                // We set loading true to show a spinner while we exchange token
                exchangeCodeForToken(code);
            } else if (error) {
                onFailure(params.get('error_description') || 'LinkedIn login failed');
                onClose();
            }
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#fff' }}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Sign in with LinkedIn</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={26} color="#000" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0077B5" />
                        <Text style={{ marginTop: 10 }}>Finalizing login...</Text>
                    </View>
                ) : (
                    <WebView
                        source={{ uri: authUrl }}
                        onNavigationStateChange={handleNavigationStateChange}
                        startInLoadingState
                        renderLoading={() => (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#0077B5" />
                            </View>
                        )}
                        style={{ flex: 1 }}
                        incognito={true} // Use incognito to avoid caching previous sessions if needed
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    header: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
