import { useTheme } from "@/context/ThemeContext";
import { donorReviewApplication, getDonorApplicantDetails } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ReviewerHeader from "../../../components/ReviewerHeader";

export default function ProviderApplicantDetailsScreen() {
  const { isDark, colors } = useTheme();
  const params = useLocalSearchParams();

  const applicantData = useMemo(() => {
    if (params.applicant) {
      try { return JSON.parse(params.applicant as string); }
      catch { return null; }
    }
    return null;
  }, [params.applicant]);

  const [apiData, setApiData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState("");

  useEffect(() => {
    if (!applicantData) return;
    setApiData(applicantData);
    const enrich = async () => {
      try {
        const raw = await AsyncStorage.getItem("authData");
        if (!raw) return;
        const { token } = JSON.parse(raw);
        if (!token) return;
        const res = await getDonorApplicantDetails(token, Number(applicantData.id));
        if (res.success && res.data) {
          const enriched = res.data.application || res.data;
          setApiData((prev: any) => ({ ...prev, ...enriched }));
        }
      } catch (_) { }
    };
    enrich();
  }, [applicantData?.id]);

  const app = useMemo(() => {
    if (!apiData?.application_text) return {};
    try {
      return typeof apiData.application_text === "string"
        ? JSON.parse(apiData.application_text)
        : apiData.application_text;
    } catch { return {}; }
  }, [apiData]);

  const user = apiData?.user || {};
  const scholarship = apiData?.scholarship || {};
  const academicDetails: any[] = apiData?.academic_details || [];
  const attachments: any[] = apiData?.attachments || [];
  const documents: any[] = apiData?.documents || [];
  const status: string = apiData?.status || "new";

  const statusCfg = useMemo(() => {
    if (status === "approved") return { label: "Approved", color: "#10B981", light: "#D1FAE5", icon: "checkmark-circle" as const };
    if (status === "rejected") return { label: "Rejected", color: "#EF4444", light: "#FEE2E2", icon: "close-circle" as const };
    return { label: "Pending Review", color: "#F59E0B", light: "#FEF3C7", icon: "time" as const };
  }, [status]);

  const heroGrad: [string, string, string] =
    status === "approved" ? ["#064E3B", "#065F46", "#059669"] :
      status === "rejected" ? ["#7F1D1D", "#991B1B", "#DC2626"] :
        ["#1E1B4B", "#312E81", "#4F46E5"];

  const fullName = user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim();
  const initials = fullName.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() || "?";

  const appliedDate = apiData?.timecreated
    ? new Date(apiData.timecreated).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const verificationTime = app.verification_time
    ? new Date(app.verification_time).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  const handleApprove = () => {
    Alert.alert("Approve Application", `Approve ${fullName}'s application?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve", style: "default",
        onPress: async () => {
          try {
            setSubmitting(true);
            const raw = await AsyncStorage.getItem("authData");
            if (!raw) return;
            const { token } = JSON.parse(raw);
            const res = await donorReviewApplication(token, Number(apiData?.id), "approve");
            if (res.success) Alert.alert("✓ Approved", "Application approved successfully.", [{ text: "Done", onPress: () => router.back() }]);
            else Alert.alert("Error", res.error || "Failed to approve");
          } catch (e: any) { Alert.alert("Error", e.message); }
          finally { setSubmitting(false); }
        },
      },
    ]);
  };

  const submitRejection = async () => {
    if (!rejectionNotes.trim()) { Alert.alert("Required", "Please enter a rejection reason."); return; }
    try {
      setSubmitting(true);
      const raw = await AsyncStorage.getItem("authData");
      if (!raw) return;
      const { token } = JSON.parse(raw);
      const res = await donorReviewApplication(token, Number(apiData?.id), "reject", rejectionNotes);
      if (res.success) {
        setShowRejectModal(false); setRejectionNotes("");
        Alert.alert("Done", "Application rejected.", [{ text: "OK", onPress: () => router.back() }]);
      } else Alert.alert("Error", res.error || "Failed to reject");
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setSubmitting(false); }
  };

  if (!apiData) {
    return (
      <View style={[S.container, { backgroundColor: colors.background }]}>
        <ReviewerHeader title="Applicant Details" />
        <View style={S.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={[S.container, { backgroundColor: isDark ? "#0F172A" : "#F1F5F9" }]}>
      <ReviewerHeader title="Applicant Details" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>

        {/* ══════════ HERO ══════════ */}
        <LinearGradient colors={heroGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.hero}>
          {/* Decorative circles */}
          <View style={S.decCircle1} />
          <View style={S.decCircle2} />

          {/* Top row: avatar + name + status */}
          <View style={S.heroRow}>
            <View style={S.avatarRing}>
              {user.picture ? (
                <Image source={{ uri: user.picture }} style={S.avatar} resizeMode="cover" />
              ) : (
                <LinearGradient colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]} style={[S.avatar, S.avatarFb]}>
                  <Text style={S.avatarInitials}>{initials}</Text>
                </LinearGradient>
              )}
            </View>
            <View style={S.heroNameBlock}>
              <Text style={S.heroName} numberOfLines={2}>{fullName}</Text>
              <Text style={S.heroSub} numberOfLines={1}>{app.major || "—"}</Text>
              <View style={[S.statusPill, { backgroundColor: statusCfg.color + "30", borderColor: statusCfg.color + "60" }]}>
                <View style={[S.statusDot, { backgroundColor: statusCfg.color }]} />
                <Text style={[S.statusLabel, { color: statusCfg.color }]}>{statusCfg.label.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Scholarship pill */}
          {scholarship.name ? (
            <View style={S.schBanner}>
              <Ionicons name="ribbon" size={14} color="rgba(255,255,255,0.6)" />
              <View style={{ flex: 1 }}>
                <Text style={S.schLabel}>SCHOLARSHIP</Text>
                <Text style={S.schName} numberOfLines={2}>{scholarship.name}</Text>
              </View>
              <View style={S.appIdPill}><Text style={S.appIdText}>#{apiData.id}</Text></View>
            </View>
          ) : null}

          {/* 3-stat strip */}
          <View style={S.statStrip}>
            <StatCell label="APPLIED ON" value={appliedDate} flex={2} />
            <View style={S.statSep} />
            <StatCell label="GPA / %" value={app.gpa || "—"} accent flex={1} />
            <View style={S.statSep} />
            <StatCell label="YEAR" value={app.current_year || "—"} flex={1} />
          </View>
        </LinearGradient>

        {/* ══════════ CONTACT ══════════ */}
        <Card title="Contact" icon="person-outline" isDark={isDark} colors={colors}>
          <Row label="Email" value={user.email || app.email} isDark={isDark} colors={colors} />
          <Row label="Phone" value={app.phone} isDark={isDark} colors={colors} />
          <Row label="Student ID" value={app.student_id} isDark={isDark} colors={colors} last />
        </Card>

        {/* ══════════ ACADEMICS ══════════ */}
        <Card title="Academic Profile" icon="school-outline" isDark={isDark} colors={colors}>
          <Row label="Institution" value={app.institution} isDark={isDark} colors={colors} />
          <Row label="Major / Field" value={app.major} isDark={isDark} colors={colors} />
          <Row label="Current Year" value={app.current_year} isDark={isDark} colors={colors} />
          <Row label="Graduation Year" value={app.graduation_date} isDark={isDark} colors={colors} />
          <Row label="GPA / Percentage" value={app.gpa ? `${app.gpa}%` : undefined} isDark={isDark} colors={colors} accent last />
        </Card>

        {/* ══════════ INTERVIEW ══════════ */}
        {(app.interview_mode || verificationTime) ? (
          <Card title="Interview Details" icon="videocam-outline" isDark={isDark} colors={colors}>
            <Row label="Mode" value={app.interview_mode} isDark={isDark} colors={colors} />
            {verificationTime ? <Row label="Scheduled At" value={verificationTime} isDark={isDark} colors={colors} last /> : null}
          </Card>
        ) : null}

        {/* ══════════ ASSESSMENT ══════════ */}
        {(app.assessment_q1 || app.assessment_q2 || app.activities || app.financial_info) ? (
          <Card title="Assessment" icon="clipboard-outline" isDark={isDark} colors={colors}>
            {app.assessment_q1 ? <Block label="Question 1" value={app.assessment_q1} isDark={isDark} colors={colors} /> : null}
            {app.assessment_q2 ? <Block label="Question 2" value={app.assessment_q2} isDark={isDark} colors={colors} /> : null}
            {app.activities ? <Block label="Activities" value={app.activities} isDark={isDark} colors={colors} /> : null}
            {app.financial_info ? <Block label="Financial Info" value={app.financial_info} isDark={isDark} colors={colors} /> : null}
          </Card>
        ) : null}

        {/* ══════════ ACADEMIC HISTORY ══════════ */}
        {academicDetails.length > 0 ? (
          <Card title={`Academic History`} icon="library-outline" isDark={isDark} colors={colors} badge={`${academicDetails.length}`}>
            {academicDetails.map((ac: any, i: number) => (
              <View key={ac.id || i}>
                {i > 0 && <View style={[S.divider, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]} />}
                <View style={S.acItem}>
                  <View style={S.acTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[S.acCourse, { color: isDark ? "#F1F5F9" : "#0F172A" }]}>{ac.course_name}</Text>
                      <Text style={[S.acMajor, { color: isDark ? "#94A3B8" : "#64748B" }]}>{ac.major} · {ac.institution}</Text>
                    </View>
                    <View style={[S.cgpaBadge, { backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "#FEF9C3" }]}>
                      <Text style={S.cgpaVal}>{ac.cgpa}</Text>
                      <Text style={S.cgpaUnit}>CGPA</Text>
                    </View>
                  </View>
                  <Text style={[S.acMeta, { color: isDark ? "#64748B" : "#94A3B8" }]}>
                    {ac.academic_year} · Graduated {ac.graduation_year} · {ac.percentage}%
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {/* ══════════ DOCUMENTS ══════════ */}
        {(attachments.length > 0 || documents.length > 0) ? (
          <Card title="Documents" icon="document-attach-outline" isDark={isDark} colors={colors}>
            {[...attachments, ...documents].map((doc: any, i: number) => (
              <View key={i} style={[S.docRow, { borderColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
                <View style={[S.docIcon, { backgroundColor: isDark ? "rgba(99,102,241,0.12)" : "#EEF2FF" }]}>
                  <Ionicons name="document-text-outline" size={16} color="#6366F1" />
                </View>
                <Text style={[S.docName, { color: isDark ? "#E2E8F0" : "#1E293B" }]} numberOfLines={1}>
                  {doc.filename || doc.name || `Document ${i + 1}`}
                </Text>
                {doc.verified !== undefined && (
                  <View style={[S.verifiedPill, { backgroundColor: doc.verified ? "#D1FAE5" : "#FEF3C7" }]}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: doc.verified ? "#059669" : "#D97706" }}>
                      {doc.verified ? "Verified" : "Pending"}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </Card>
        ) : null}

        {/* ══════════ ACTIONS ══════════ */}
        {status === "new" ? (
          <View style={S.actions}>
            <TouchableOpacity style={[S.actionBtn, submitting && S.disabled]} onPress={handleApprove} disabled={submitting} activeOpacity={0.85}>
              <LinearGradient colors={["#10B981", "#059669"]} style={S.actionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={S.actionText}>Approve Application</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[S.actionBtnOutline, { borderColor: "#EF4444" }, submitting && S.disabled]} onPress={() => setShowRejectModal(true)} disabled={submitting} activeOpacity={0.85}>
              <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
              <Text style={[S.actionTextOutline, { color: "#EF4444" }]}>Reject Application</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[S.reviewedBanner, { backgroundColor: statusCfg.color + "18", borderColor: statusCfg.color + "40" }]}>
            <Ionicons name={statusCfg.icon} size={22} color={statusCfg.color} />
            <View>
              <Text style={[S.reviewedTitle, { color: statusCfg.color }]}>Application {statusCfg.label}</Text>
              <Text style={[S.reviewedSub, { color: isDark ? "#64748B" : "#94A3B8" }]}>No further action required.</Text>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ══════════ REJECT MODAL ══════════ */}
      <Modal visible={showRejectModal} transparent animationType="slide" onRequestClose={() => setShowRejectModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={S.modalOverlay}>
          <View style={[S.modalSheet, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
            <View style={S.modalHandle} />
            <View style={S.modalHead}>
              <Text style={[S.modalTitle, { color: isDark ? "#F1F5F9" : "#0F172A" }]}>Reject Application</Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)} style={[S.modalClose, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}>
                <Ionicons name="close" size={18} color={isDark ? "#94A3B8" : "#64748B"} />
              </TouchableOpacity>
            </View>
            <Text style={[S.modalSub, { color: isDark ? "#64748B" : "#94A3B8" }]}>
              This reason will be shared with the applicant. Please be clear and professional.
            </Text>
            <TextInput
              style={[S.modalInput, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", color: isDark ? "#F1F5F9" : "#0F172A", borderColor: isDark ? "#334155" : "#E2E8F0" }]}
              placeholder="Enter rejection reason..."
              placeholderTextColor={isDark ? "#475569" : "#94A3B8"}
              value={rejectionNotes}
              onChangeText={setRejectionNotes}
              multiline numberOfLines={5}
              textAlignVertical="top"
            />
            <View style={S.modalActions}>
              <TouchableOpacity style={[S.modalCancel, { borderColor: isDark ? "#334155" : "#E2E8F0" }]} onPress={() => { setShowRejectModal(false); setRejectionNotes(""); }} disabled={submitting}>
                <Text style={[S.modalCancelTxt, { color: isDark ? "#94A3B8" : "#64748B" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.modalSubmit, submitting && S.disabled]} onPress={submitRejection} disabled={submitting}>
                <LinearGradient colors={["#EF4444", "#DC2626"]} style={S.modalSubmitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={S.modalSubmitTxt}>Submit Rejection</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCell({ label, value, accent, flex }: { label: string; value: string; accent?: boolean; flex?: number }) {
  return (
    <View style={[S.statCell, flex ? { flex } : undefined]}>
      <Text style={S.statLabel}>{label}</Text>
      <Text style={[S.statValue, accent && { color: "#FCD34D" }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Card({ title, icon, isDark, colors, children, badge }: any) {
  return (
    <View style={[S.card, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", shadowColor: isDark ? "#000" : "#94A3B8" }]}>
      <View style={[S.cardHead, { borderBottomColor: isDark ? "#334155" : "#F1F5F9" }]}>
        <Ionicons name={icon} size={17} color={isDark ? "#818CF8" : "#6366F1"} />
        <Text style={[S.cardTitle, { color: isDark ? "#F1F5F9" : "#0F172A" }]}>{title}</Text>
        {badge ? (
          <View style={[S.cardBadge, { backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF" }]}>
            <Text style={[S.cardBadgeTxt, { color: isDark ? "#818CF8" : "#6366F1" }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={S.cardBody}>{children}</View>
    </View>
  );
}

function Row({ label, value, isDark, colors, last, accent }: any) {
  if (!value) return null;
  return (
    <View style={[S.row, !last && { borderBottomWidth: 1, borderBottomColor: isDark ? "#1E293B" : "#F8FAFC" }]}>
      <Text style={[S.rowLabel, { color: isDark ? "#475569" : "#94A3B8" }]}>{label}</Text>
      <Text style={[S.rowValue, { color: accent ? (isDark ? "#FBBF24" : "#D97706") : (isDark ? "#E2E8F0" : "#0F172A") }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function Block({ label, value, isDark, colors }: any) {
  return (
    <View style={[S.block, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor: isDark ? "#334155" : "#E2E8F0" }]}>
      <Text style={[S.blockLabel, { color: isDark ? "#475569" : "#94A3B8" }]}>{label}</Text>
      <Text style={[S.blockValue, { color: isDark ? "#E2E8F0" : "#1E293B" }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 20 },

  // ── Hero ──
  hero: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 14,
    overflow: "hidden",
  },
  decCircle1: {
    position: "absolute", width: 200, height: 200,
    borderRadius: 100, top: -60, right: -60,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  decCircle2: {
    position: "absolute", width: 140, height: 140,
    borderRadius: 70, bottom: -40, left: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  avatarRing: {
    padding: 3,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  avatar: { width: 72, height: 72, borderRadius: 18 },
  avatarFb: { alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 26, fontWeight: "800", color: "#fff" },
  heroNameBlock: { flex: 1, gap: 5, paddingTop: 2 },
  heroName: { fontSize: 22, fontWeight: "800", color: "#fff", lineHeight: 27 },
  heroSub: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.65)" },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, marginTop: 2,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },

  // Scholarship banner
  schBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  schLabel: { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.5)", letterSpacing: 0.8, textTransform: "uppercase" },
  schName: { fontSize: 13, fontWeight: "700", color: "#fff", marginTop: 2 },
  appIdPill: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  appIdText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.85)" },

  // Stat strip
  statStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  statCell: { flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 4 },
  statSep: { width: 1, backgroundColor: "rgba(255,255,255,0.12)" },
  statLabel: { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.5)", letterSpacing: 0.6, textTransform: "uppercase" },
  statValue: { fontSize: 13, fontWeight: "800", color: "#fff", textAlign: "center" },

  // ── Cards ──
  card: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 12,
    elevation: 3, overflow: "hidden",
  },
  cardHead: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", flex: 1 },
  cardBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  cardBadgeTxt: { fontSize: 11, fontWeight: "700" },
  cardBody: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8 },

  // ── Row ──
  row: { paddingVertical: 12, gap: 3 },
  rowLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  rowValue: { fontSize: 15, fontWeight: "700" },

  // ── Block ──
  block: { borderRadius: 12, borderWidth: 1, padding: 12, marginVertical: 5, gap: 5 },
  blockLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  blockValue: { fontSize: 14, fontWeight: "500", lineHeight: 20 },

  // ── Academic item ──
  divider: { height: 1 },
  acItem: { paddingVertical: 12, gap: 6 },
  acTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  acCourse: { fontSize: 14, fontWeight: "700" },
  acMajor: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  cgpaBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignItems: "center" },
  cgpaVal: { fontSize: 16, fontWeight: "800", color: "#F59E0B" },
  cgpaUnit: { fontSize: 9, fontWeight: "700", color: "#F59E0B", letterSpacing: 0.5 },
  acMeta: { fontSize: 12, fontWeight: "500" },

  // ── Documents ──
  docRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 11, borderBottomWidth: 1,
  },
  docIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  docName: { fontSize: 13, fontWeight: "600", flex: 1 },
  verifiedPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },

  // ── Actions ──
  actions: { marginHorizontal: 16, marginTop: 20, gap: 10 },
  actionBtn: { borderRadius: 16, overflow: "hidden" },
  actionGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  actionText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  actionBtnOutline: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15, borderRadius: 16, borderWidth: 1.5,
  },
  actionTextOutline: { fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.55 },

  // Reviewed banner
  reviewedBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginTop: 20,
    borderRadius: 16, borderWidth: 1, padding: 16,
  },
  reviewedTitle: { fontSize: 15, fontWeight: "800" },
  reviewedSub: { fontSize: 12, fontWeight: "500", marginTop: 2 },

  // ── Modal ──
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, gap: 14 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 6 },
  modalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalClose: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalSub: { fontSize: 13, fontWeight: "500", lineHeight: 20 },
  modalInput: { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 14, minHeight: 120, fontWeight: "500" },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  modalCancelTxt: { fontSize: 15, fontWeight: "700" },
  modalSubmit: { flex: 1.5, borderRadius: 14, overflow: "hidden" },
  modalSubmitGrad: { paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  modalSubmitTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },
});
