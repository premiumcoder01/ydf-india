import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

export default function ContactSupportScreen() {
  const inset = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.subject.trim() || !formData.description.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        "Success",
        "Your support ticket has been submitted successfully. We'll get back to you within 24 hours.",
        [
          {
            text: "OK",
            onPress: () => {
              setFormData({ subject: "", description: "" });
              router.back();
            },
          },
        ]
      );
    }, 2000);
  };

  const handleAttachFile = () => {
    Alert.alert("Attach File", "File attachment functionality will be implemented");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Contact Support"
        subtitle="Raise a support ticket"
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: inset.bottom + 20 }}>
        {/* Instructions */}
        <View style={[styles.instructionsCard, { backgroundColor: isDark ? "rgba(33, 150, 243, 0.1)" : "#E3F2FD" }]}>
          <View style={styles.instructionsIcon}>
            <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
          </View>
          <View style={styles.instructionsContent}>
            <Text style={[styles.instructionsTitle, { color: isDark ? "#64B5F6" : "#1976D2" }]}>Before submitting a ticket</Text>
            <Text style={[styles.instructionsText, { color: isDark ? "#90CAF9" : "#1976D2" }]}>
              Please check our FAQ section first. If you can't find the answer, provide as much detail as possible to help us assist you better.
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Support Ticket</Text>

          {/* Subject Field */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Subject *</Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: isDark ? colors.surface : "#fff", borderColor: colors.border, color: colors.text }
              ]}
              placeholder="Brief description of your issue"
              placeholderTextColor={colors.textSecondary}
              value={formData.subject}
              onChangeText={(text) => setFormData(prev => ({ ...prev, subject: text }))}
              maxLength={100}
            />
            <Text style={[styles.fieldCounter, { color: colors.textSecondary }]}>{formData.subject.length}/100</Text>
          </View>

          {/* Description Field */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Description *</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                { backgroundColor: isDark ? colors.surface : "#fff", borderColor: colors.border, color: colors.text }
              ]}
              placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable..."
              placeholderTextColor={colors.textSecondary}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={[styles.fieldCounter, { color: colors.textSecondary }]}>{formData.description.length}/1000</Text>
          </View>

          {/* Attach File Button */}
          <TouchableOpacity
            style={[styles.attachButton, {
              backgroundColor: isDark ? colors.surface : "#f9f9f9",
              borderColor: colors.border
            }]}
            onPress={handleAttachFile}
            activeOpacity={0.8}
          >
            <View style={[styles.attachIcon, { backgroundColor: isDark ? colors.border : "#fff" }]}>
              <Ionicons name="attach-outline" size={20} color={colors.textSecondary} />
            </View>
            <Text style={[styles.attachText, { color: colors.textSecondary }]}>Attach Screenshot / File</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.tipsTitle, { color: colors.text }]}>💡 Tips for faster resolution</Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>Include specific error messages if any</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>Mention the device and app version</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>Attach screenshots if relevant</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>Describe what you were trying to do</Text>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.submitButtonText}>Submitting...</Text>
            </View>
          ) : (
            <View style={styles.submitButtonContent}>
              <Text style={styles.submitButtonText}>Submit Ticket</Text>
              <Ionicons name="send-outline" size={18} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Response Time Info */}
        <View style={[styles.responseTimeCard, { backgroundColor: isDark ? "rgba(76, 175, 80, 0.1)" : "#E8F5E9" }]}>
          <View style={styles.responseTimeIcon}>
            <Ionicons name="time-outline" size={20} color="#4CAF50" />
          </View>
          <Text style={[styles.responseTimeText, { color: isDark ? "#81C784" : "#2E7D32" }]}>
            We typically respond within 24 hours during business days
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instructionsCard: {
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  instructionsIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  instructionsContent: {
    flex: 1,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1976D2",
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: "#1976D2",
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fff",
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  fieldCounter: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
  },
  attachIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  attachText: {
    flex: 1,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  tipsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipBullet: {
    fontSize: 16,
    color: "#4CAF50",
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: "#2196F3",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  responseTimeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 16,
  },
  responseTimeIcon: {
    marginRight: 12,
  },
  responseTimeText: {
    flex: 1,
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "500",
  },
});
