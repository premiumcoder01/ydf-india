import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getFAQs } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import RenderHtml from "react-native-render-html";

export default function ReviewerHelpSupportScreen() {
  const { isDark, colors } = useTheme();
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        const authDataStr = await AsyncStorage.getItem("authData");
        if (authDataStr) {
          const authData = JSON.parse(authDataStr);
          if (authData.token) {
            const res = await getFAQs(authData.token);
            if (res.success && res.data) {
              setFaqs(res.data);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchFAQs();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      <AppHeader title="Help Center" onBack={() => router.back()} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <Text style={[styles.headerTitle, { color: colors.text }]}>Frequently Asked Questions</Text>

          {faqs.length > 0 ? (
            faqs.map((faq, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
                activeOpacity={0.8}
              >
                <View style={styles.faqHeader}>
                  <Text style={[styles.question, { color: colors.text }]}>{faq.title}</Text>
                  <Ionicons
                    name={expandedIndex === index ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>
                {expandedIndex === index && (
                  <View style={[styles.answer, { borderTopColor: colors.border }]}>
                    <RenderHtml
                      contentWidth={width - 72} // 20 padding container + 16 padding card = 36 * 2 = 72
                      source={{ html: faq.content || "" }}
                      baseStyle={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}
                      tagsStyles={{
                        p: { color: colors.textSecondary, marginTop: 0, marginBottom: 0 },
                        a: { color: colors.primary, textDecorationLine: 'none' }
                      }}
                    />
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
              No FAQs available at the moment.
            </Text>
          )}


          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Still have questions?</Text>
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: isDark ? colors.primary : "#333" }]}
              onPress={() => router.push("/(dashboard)/reviewer/contact-support")}
            >
              <Text style={[styles.contactButtonText, { color: isDark ? "#fff" : "#fff" }]}>Contact Support</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
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
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
  },
  faqCard: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  question: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  answer: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
    lineHeight: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  footer: {
    marginTop: 30,
    alignItems: "center",
  },
  footerText: {
    fontSize: 15,
    color: "#666",
    marginBottom: 12,
  },
  contactButton: {
    backgroundColor: "#333",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  contactButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
