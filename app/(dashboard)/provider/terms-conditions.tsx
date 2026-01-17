import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getTermsAndConditions } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import RenderHtml from "react-native-render-html";

export default function ProviderTermsConditionsScreen() {
  const { isDark, colors } = useTheme();
  const { width } = useWindowDimensions();
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

  const tagsStyles = {
    body: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 24,
    },
    p: {
      color: colors.textSecondary,
      marginBottom: 10,
    },
    h1: { color: colors.text, marginTop: 20, marginBottom: 10 },
    h2: { color: colors.text, marginTop: 20, marginBottom: 10 },
    h3: { color: colors.text, marginTop: 20, marginBottom: 10 },
    a: { color: colors.primary, textDecorationLine: 'none' },
    li: { color: colors.textSecondary },
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#121212", "#1e1e1e"] : ["#fff", "#f8f9fa"]}
        style={styles.background}
      />

      <ReviewerHeader title="Terms of Service" />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <RenderHtml
              contentWidth={width - 80} // adjusted for padding
              source={{ html: content }}
              tagsStyles={tagsStyles as any}
              systemFonts={["System", "sans-serif"]}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  }
});