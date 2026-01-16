import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getTermsAndConditions } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

export default function StudentTermsScreen() {
    const { isDark, colors } = useTheme();
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTerms = async () => {
            try {
                const authDataStr = await AsyncStorage.getItem("authData");
                if (authDataStr) {
                    const authData = JSON.parse(authDataStr);
                    if (authData.token) {
                        const res = await getTermsAndConditions(authData.token);
                        if (res.success && res.data) {
                            setContent(res.data.content || "<p>No terms available.</p>");
                        } else {
                            setContent("<p>Failed to load terms.</p>");
                        }
                    }
                } else {
                    setContent("<p>Please login to view terms.</p>");
                }
            } catch (e) {
                setContent("<p>Failed to load terms.</p>");
            } finally {
                setLoading(false);
            }
        };
        fetchTerms();
    }, []);

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, system-ui; color: ${colors.text}; background-color: transparent; padding: 20px; }
            p { line-height: 1.6; font-size: 15px; color: ${colors.textSecondary}; }
            h1, h2, h3, h4, h5, h6 { color: ${colors.text}; margin-top: 20px; margin-bottom: 10px; }
            a { color: ${colors.primary}; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
                style={styles.background}
                locations={[0, 0.3, 1]}
            />

            <AppHeader title="Terms of Service" onBack={() => router.back()} />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <View style={[styles.cardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <WebView
                        originWhitelist={['*']}
                        source={{ html: htmlContent }}
                        style={{ backgroundColor: 'transparent' }}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    cardContainer: {
        flex: 1,
        margin: 20,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        elevation: 2,
    }
});
