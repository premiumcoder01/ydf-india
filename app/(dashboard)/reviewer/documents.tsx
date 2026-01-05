import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

type DocItem = {
  id: string;
  title: string;
  fileName: string;
  status: "pending" | "verified" | "rejected";
  comment?: string;
  scheme: string;
};

export default function ReviewerDocumentsScreen() {
  const inset = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [selectedScheme, setSelectedScheme] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const SCHEMES = ["All", "Merit Excellence Scholarship", "Financial Aid Program", "General Scholarship", "Freshers Grant", "State Quota Scholarship"];
  const [documents, setDocuments] = useState<DocItem[]>([
    { id: "1", title: "College ID", fileName: "college_id.pdf", status: "verified", comment: "", scheme: "Merit Excellence Scholarship" },
    { id: "2", title: "Marksheet (Sem 1)", fileName: "marksheet_sem1.pdf", status: "verified", comment: "", scheme: "Merit Excellence Scholarship" },
    { id: "3", title: "Marksheet (Sem 2)", fileName: "marksheet_sem2.pdf", status: "pending", comment: "", scheme: "Merit Excellence Scholarship" },
    { id: "4", title: "Income Certificate", fileName: "income_certificate_2024.jpg", status: "rejected", comment: "Image is too blurry, please re-upload", scheme: "Financial Aid Program" },
    { id: "5", title: "Aadhaar Card", fileName: "aadhaar_front_back.pdf", status: "pending", comment: "", scheme: "General Scholarship" },
    { id: "6", title: "Bank Passbook", fileName: "bank_details.jpg", status: "pending", comment: "", scheme: "General Scholarship" },
    { id: "7", title: "Admission Letter", fileName: "admission_confirmation.pdf", status: "verified", comment: "", scheme: "Freshers Grant" },
    { id: "8", title: "Bonafide Certificate", fileName: "bonafide_2024.pdf", status: "pending", comment: "", scheme: "Freshers Grant" },
    { id: "9", title: "Domicile Certificate", fileName: "domicile_gujarat.pdf", status: "pending", comment: "", scheme: "State Quota Scholarship" },
    { id: "10", title: "Recommendation Letter", fileName: "recommendation_principal.pdf", status: "pending", comment: "", scheme: "Merit Excellence Scholarship" },
  ]);

  const filteredDocuments = useMemo(() => {
    let docs = documents;

    if (selectedScheme !== "All") {
      docs = docs.filter(d => d.scheme === selectedScheme);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q) ||
        d.scheme.toLowerCase().includes(q)
      );
    }

    return docs;
  }, [documents, selectedScheme, searchQuery]);

  const stats = useMemo(() => {
    const verified = filteredDocuments.filter((d) => d.status === "verified").length;
    const rejected = filteredDocuments.filter((d) => d.status === "rejected").length;
    const pending = filteredDocuments.filter((d) => d.status === "pending").length;
    return { verified, rejected, pending, total: filteredDocuments.length };
  }, [filteredDocuments]);

  const allReviewed = stats.pending === 0;
  const hasRejections = stats.rejected > 0;

  const updateDocStatus = (id: string, status: "verified" | "rejected") => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, status } : doc))
    );
  };

  const updateComment = (id: string, comment: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, comment } : doc))
    );
  };

  const handleSave = () => {
    Alert.alert("Saved", "Progress saved successfully");
  };

  const handleSubmit = () => {
    if (!allReviewed) {
      Alert.alert("Incomplete Review", "Please review all documents before submitting");
      return;
    }
    Alert.alert("Submit Review", "Are you sure you want to submit this review?", [
      { text: "Cancel", style: "cancel" },
      { text: "Submit", onPress: () => console.log("Review submitted") },
    ]);
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith(".pdf")) return "document-text";
    if (fileName.match(/\.(jpg|jpeg|png)$/)) return "image";
    if (fileName.endsWith(".zip")) return "folder";
    return "document";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Document Verification"
        subtitle="Review and validate uploaded files"
      />

      {/* Progress Stats */}
      <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: "#10B981" }]} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>Verified: {stats.verified}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: "#EF4444" }]} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>Rejected: {stats.rejected}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: "#F59E0B" }]} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>Pending: {stats.pending}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Scheme Filter */}
        <View style={{ marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {SCHEMES.map((scheme) => (
              <TouchableOpacity
                key={scheme}
                onPress={() => setSelectedScheme(scheme)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: selectedScheme === scheme ? colors.primary : (isDark ? colors.card : "#fff"),
                  borderWidth: 1,
                  borderColor: selectedScheme === scheme ? colors.primary : colors.border,
                }}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: selectedScheme === scheme ? "#fff" : colors.text
                }}>
                  {scheme}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Applicant Filter */}
        <View style={{ marginBottom: 16 }}>
          <TextInput
            placeholder="Search by document name or scholarship..."
            style={{
              backgroundColor: isDark ? colors.card : "#fff",
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text
            }}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {filteredDocuments.map((doc, index) => (
          <View key={doc.id} style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Document Header */}
            <View style={styles.docTop}>
              <View style={styles.docInfo}>
                <View style={[styles.fileIcon, getIconBgColor(doc.status, isDark)]}>
                  <Ionicons
                    name={getFileIcon(doc.fileName)}
                    size={22}
                    color={getIconColor(doc.status)}
                  />
                </View>
                <View style={styles.docText}>
                  <Text style={[styles.docTitle, { color: colors.text }]}>{doc.title}</Text>
                  <Text style={[styles.fileName, { color: colors.textSecondary, marginBottom: 6 }]}>{doc.fileName}</Text>

                  <View style={[styles.schemeTag, { backgroundColor: isDark ? "rgba(33, 150, 243, 0.15)" : "#E3F2FD" }]}>
                    <Ionicons name="pricetag-outline" size={12} color={isDark ? "#64B5F6" : "#1976D2"} />
                    <Text style={[styles.schemeTagText, { color: isDark ? "#64B5F6" : "#1976D2" }]}>
                      {doc.scheme}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.previewButton, { backgroundColor: isDark ? colors.border : "#EFF6FF" }]}
                onPress={() => router.push({
                  pathname: "/(dashboard)/reviewer/document-view",
                  params: { id: doc.id, title: doc.title, fileName: doc.fileName }
                })}
              >
                <Ionicons name="eye-outline" size={18} color={isDark ? colors.primary : "#3B82F6"} />
                <Text style={[styles.previewText, { color: isDark ? colors.primary : "#3B82F6" }]}>View</Text>
              </TouchableOpacity>
            </View>

            {/* Status Badge */}
            {doc.status !== "pending" && (
              <View style={[styles.statusBadge, getStatusBadgeStyle(doc.status)]}>
                <Ionicons
                  name={doc.status === "verified" ? "checkmark-circle" : "close-circle"}
                  size={14}
                  color="#fff"
                />
                <Text style={styles.statusBadgeText}>
                  {doc.status === "verified" ? "Verified" : "Rejected"}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.verifyBtn,
                  { backgroundColor: isDark ? colors.card : "#fff", borderColor: "#10B981" },
                  doc.status === "verified" && styles.verifyBtnActive,
                ]}
                onPress={() => updateDocStatus(doc.id, "verified")}
              >
                <Ionicons
                  name={doc.status === "verified" ? "checkmark-circle" : "checkmark-circle-outline"}
                  size={20}
                  color={doc.status === "verified" ? "#fff" : "#10B981"}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: colors.text },
                    doc.status === "verified" && styles.actionBtnTextActive,
                  ]}
                >
                  Verify
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.rejectBtn,
                  { backgroundColor: isDark ? colors.card : "#fff", borderColor: "#EF4444" },
                  doc.status === "rejected" && styles.rejectBtnActive,
                ]}
                onPress={() => updateDocStatus(doc.id, "rejected")}
              >
                <Ionicons
                  name={doc.status === "rejected" ? "close-circle" : "close-circle-outline"}
                  size={20}
                  color={doc.status === "rejected" ? "#fff" : "#EF4444"}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: colors.text },
                    doc.status === "rejected" && styles.actionBtnTextActive,
                  ]}
                >
                  Reject
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: isDark ? colors.card : "#fff", borderColor: colors.primary },
                ]}
                onPress={() => router.push({
                  pathname: "/(dashboard)/reviewer/document-edit",
                  params: { id: doc.id, title: doc.title, status: doc.status }
                })}
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.actionBtnText, { color: colors.text }]}>
                  Edit
                </Text>
              </TouchableOpacity>
            </View>

            {/* Comment Section - Only show when rejected or has comment */}
            {(doc.status === "rejected" || doc.comment) && (
              <View style={[styles.commentSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.commentLabel, { color: colors.textSecondary }]}>
                  {doc.status === "rejected" ? "Rejection reason *" : "Comment (optional)"}
                </Text>
                <TextInput
                  value={doc.comment}
                  onChangeText={(text) => updateComment(doc.id, text)}
                  placeholder={
                    doc.status === "rejected"
                      ? "Please specify the reason for rejection"
                      : "Add any notes or observations"
                  }
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.commentInput,
                    {
                      backgroundColor: isDark ? colors.surface : "#F9FAFB",
                      borderColor: colors.border,
                      color: colors.text
                    },
                    doc.status === "rejected" && !doc.comment && styles.commentInputError,
                  ]}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Fixed Footer */}
      <View style={[styles.footer, { paddingBottom: inset.bottom || 16, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: isDark ? colors.border : "#F3F4F6" }]} onPress={handleSave}>
          <Ionicons name="bookmark-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.saveButtonText, { color: colors.textSecondary }]}>Save Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, !allReviewed && styles.submitButtonDisabled, { backgroundColor: isDark ? colors.primary : "#111827" }]}
          onPress={handleSubmit}
          disabled={!allReviewed}
        >
          <Ionicons name="checkmark-done" size={20} color="#fff" />
          <Text style={styles.submitButtonText}>
            {allReviewed ? "Submit Review" : `${stats.pending} Pending`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getIconBgColor = (status: string, isDark: boolean = false) => {
  const opacity = isDark ? 0.2 : 1;
  switch (status) {
    case "verified": return { backgroundColor: isDark ? `rgba(16, 185, 129, ${opacity})` : "#D1FAE5" };
    case "rejected": return { backgroundColor: isDark ? `rgba(239, 68, 68, ${opacity})` : "#FEE2E2" };
    default: return { backgroundColor: isDark ? "rgba(107, 114, 128, 0.1)" : "#F3F4F6" };
  }
};

const getIconColor = (status: string) => {
  switch (status) {
    case "verified": return "#10B981";
    case "rejected": return "#EF4444";
    default: return "#6B7280";
  }
};

const getStatusBadgeStyle = (status: string) => {
  return status === "verified"
    ? { backgroundColor: "#10B981" }
    : { backgroundColor: "#EF4444" };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  docCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  docTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  docInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  docText: {
    flex: 1,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  fileName: {
    fontSize: 13,
    color: "#6B7280",
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3B82F6",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  verifyBtn: {
    backgroundColor: "#fff",
    borderColor: "#10B981",
  },
  verifyBtnActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  rejectBtn: {
    backgroundColor: "#fff",
    borderColor: "#EF4444",
  },
  rejectBtnActive: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  actionBtnTextActive: {
    color: "#fff",
  },
  commentSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  commentLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    minHeight: 70,
    backgroundColor: "#F9FAFB",
  },
  commentInputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  submitButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 10,
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  schemeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  schemeTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
});