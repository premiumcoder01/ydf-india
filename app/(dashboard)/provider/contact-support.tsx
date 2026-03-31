import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { contactSupport } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ProviderContactSupportScreen() {
  const { isDark, colors } = useTheme();
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  });
  const [isSending, setIsSending] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const handleSend = async () => {
    if (!formData.subject || !formData.message) {
      setToastMessage("Please fill in all fields");
      setToastType("error");
      setShowToast(true);
      return;
    }

    setIsSending(true);
    try {
      const authDataStr = await AsyncStorage.getItem("authData");
      if (authDataStr) {
        const authData = JSON.parse(authDataStr);
        if (authData.token) {
          const response = await contactSupport(authData.token, formData.subject, formData.message);
          if (response.success) {
            setToastMessage("Message sent successfully. Our team will contact you soon.");
            setToastType("success");
            setShowToast(true);
            setFormData({ subject: "", message: "" });
            setTimeout(() => {
              router.back();
            }, 2000);
          } else {
            setToastMessage(response.error || "Failed to send message");
            setToastType("error");
            setShowToast(true);
          }
        }
      }
    } catch (error) {
      setToastMessage("An unexpected error occurred");
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      <AppHeader title="Contact Support" onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.headerText, { color: colors.text }]}>How can we help you?</Text>
            <Text style={[styles.subHeaderText, { color: colors.textSecondary }]}>
              Send us a message and we'll get back to you as soon as possible.
            </Text>

            <CustomTextInput
              label="Subject"
              placeholder="What is this about?"
              value={formData.subject}
              onChangeText={(val) => setFormData({ ...formData, subject: val })}
              style={styles.input}
            />

            <CustomTextInput
              label="Message"
              placeholder="Describe your issue or question in detail..."
              value={formData.message}
              onChangeText={(val) => setFormData({ ...formData, message: val })}
              multiline
              inputStyle={{ height: 120, textAlignVertical: "top", paddingTop: 12 }}
              style={styles.input}
            />

            <Button
              title={isSending ? "Sending..." : "Send Message"}
              onPress={handleSend}
              variant="primary"
              disabled={isSending}
              style={styles.button}
            />
          </View>

          <View style={styles.infoSection}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => Linking.openURL("mailto:helpdesk@youthdreamersfoundation.org")}
              style={[styles.infoItem, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.8)", borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#E3F2FD" }]}>
                <Ionicons name="mail-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email Us</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  helpdesk@youthdreamersfoundation.org</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => Linking.openURL("tel:+919599681997")}
              style={[styles.infoItem, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.8)", borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#E3F2FD" }]}>
                <Ionicons name="call-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Call Us</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>+91 9599681997</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        message={toastMessage}
        type={toastType}
        visible={showToast}
        onHide={() => setShowToast(false)}
        duration={3000}
      />
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
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(51, 51, 51, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
  },
  infoSection: {
    marginTop: 30,
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
});
