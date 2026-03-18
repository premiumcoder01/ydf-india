import { AppHeader, Button } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getMobilizerStudentProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeParse = (v: string | object): Record<string, any> => {
    if (typeof v === "object" && v !== null) return v as any;
    try { return JSON.parse(v as string); } catch { return {}; }
};

const AVATAR_COLORS = [
    ["#6366F1", "#8B5CF6"], ["#EC4899", "#F43F5E"], ["#F59E0B", "#EF4444"],
    ["#10B981", "#059669"], ["#3B82F6", "#6366F1"], ["#14B8A6", "#06B6D4"],
    ["#F97316", "#EF4444"], ["#8B5CF6", "#A855F7"], ["#06B6D4", "#3B82F6"],
    ["#84CC16", "#10B981"], ["#EC4899", "#A855F7"], ["#F59E0B", "#F97316"],
];
const getGrad = (id: number): [string, string] => AVATAR_COLORS[id % AVATAR_COLORS.length] as [string, string];
const getInitials = (f?: string, l?: string) =>
    `${(f || "S").charAt(0)}${(l || "").charAt(0)}`.toUpperCase();

const STATUS_MAP: Record<string, { color: string; bg: string; label: string }> = {
    approved: { color: "#10B981", bg: "#D1FAE5", label: "Approved" },
    rejected: { color: "#EF4444", bg: "#FEE2E2", label: "Rejected" },
    new: { color: "#6366F1", bg: "#EDE9FE", label: "New" },
    in_progress: { color: "#F59E0B", bg: "#FEF3C7", label: "In Progress" },
};
const getStatus = (s: string) => STATUS_MAP[s] ?? { color: "#94A3B8", bg: "#F1F5F9", label: s };

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatStrip({ summary, isDark }: { summary: any; isDark: boolean }) {
    const stats = [
        { label: "Total", value: summary?.total ?? 0, color: "#6366F1", icon: "documents-outline" },
        { label: "In Progress", value: summary?.in_progress ?? 0, color: "#F59E0B", icon: "time-outline" },
        { label: "Approved", value: summary?.approved ?? 0, color: "#10B981", icon: "checkmark-circle-outline" },
        { label: "Rejected", value: summary?.rejected ?? 0, color: "#EF4444", icon: "close-circle-outline" },
    ];
    return (
        <View style={[stripStyles.row, { backgroundColor: isDark ? "#13131A" : "#fff", borderColor: isDark ? "#1E1E2E" : "#F1F5F9" }]}>
            {stats.map((s, i) => (
                <React.Fragment key={s.label}>
                    <View style={stripStyles.cell}>
                        <View style={[stripStyles.iconWrap, { backgroundColor: s.color + "18" }]}>
                            <Ionicons name={s.icon as any} size={16} color={s.color} />
                        </View>
                        <Text style={[stripStyles.num, { color: isDark ? "#F1F5F9" : "#0F172A" }]}>{s.value}</Text>
                        <Text style={[stripStyles.lbl, { color: isDark ? "#64748B" : "#94A3B8" }]}>{s.label}</Text>
                    </View>
                    {i < stats.length - 1 && (
                        <View style={[stripStyles.sep, { backgroundColor: isDark ? "#1E1E2E" : "#F1F5F9" }]} />
                    )}
                </React.Fragment>
            ))}
        </View>
    );
}

const stripStyles = StyleSheet.create({
    row: { flexDirection: "row", borderRadius: 20, borderWidth: 1, marginBottom: 20, overflow: "hidden" },
    cell: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 4 },
    iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
    num: { fontSize: 18, fontWeight: "900" },
    lbl: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
    sep: { width: 1, marginVertical: 12 },
});

function SectionCard({
    icon, iconColor, title, rows, isDark,
}: {
    icon: string; iconColor: string; title: string;
    rows: { label: string; value?: any; icon: string; action?: () => void; actionIcon?: string }[];
    isDark: boolean;
}) {
    const valid = rows.filter(r => r.value && r.value !== "" && r.value !== "0" && r.value !== 0);
    if (!valid.length) return null;
    const bg = isDark ? "#13131A" : "#FFFFFF";
    const bdr = isDark ? "#1E1E2E" : "#F1F5F9";
    const sub = isDark ? "#64748B" : "#94A3B8";
    const main = isDark ? "#F1F5F9" : "#0F172A";
    return (
        <View style={[scStyles.card, { backgroundColor: bg, borderColor: bdr }]}>
            <View style={[scStyles.header, { borderBottomColor: bdr }]}>
                <View style={[scStyles.headerIcon, { backgroundColor: iconColor + "18" }]}>
                    <Ionicons name={icon as any} size={15} color={iconColor} />
                </View>
                <Text style={[scStyles.title, { color: main }]}>{title}</Text>
            </View>
            {valid.map((row, i) => (
                <TouchableOpacity
                    key={i}
                    onPress={row.action}
                    disabled={!row.action}
                    activeOpacity={0.7}
                    style={[scStyles.row, i === valid.length - 1 && scStyles.lastRow, { borderBottomColor: bdr }]}
                >
                    <View style={[scStyles.rowIcon, { backgroundColor: isDark ? "#1C1C28" : "#F8FAFF" }]}>
                        <Ionicons name={row.icon as any} size={15} color={sub} />
                    </View>
                    <View style={scStyles.rowText}>
                        <Text style={[scStyles.rowLabel, { color: sub }]}>{row.label}</Text>
                        <Text style={[scStyles.rowValue, { color: main }]}>{row.value}</Text>
                    </View>
                    {row.action && (
                        <View style={[scStyles.actionPill, { backgroundColor: "#6366F118" }]}>
                            <Ionicons name={(row.actionIcon || "chevron-forward") as any} size={13} color="#6366F1" />
                        </View>
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );
}

const scStyles = StyleSheet.create({
    card: { borderRadius: 20, borderWidth: 1, overflow: "hidden", marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    headerIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
    row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
    lastRow: { borderBottomWidth: 0 },
    rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
    rowText: { flex: 1, gap: 2 },
    rowLabel: { fontSize: 11, fontWeight: "500" },
    rowValue: { fontSize: 14, fontWeight: "600" },
    actionPill: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});

function RecentApplications({ apps, isDark }: { apps: any[]; isDark: boolean }) {
    if (!apps?.length) return null;
    const bg = isDark ? "#13131A" : "#FFFFFF";
    const bdr = isDark ? "#1E1E2E" : "#F1F5F9";
    const sub = isDark ? "#64748B" : "#94A3B8";
    const main = isDark ? "#F1F5F9" : "#0F172A";
    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={[raStyles.heading, { color: main }]}>Recent Applications</Text>
            <View style={[raStyles.card, { backgroundColor: bg, borderColor: bdr }]}>
                {apps.map((app, i) => {
                    const st = getStatus(app.status);
                    return (
                        <View key={app.id} style={[raStyles.row, i === apps.length - 1 && raStyles.lastRow, { borderBottomColor: bdr }]}>
                            <View style={[raStyles.numBadge, { backgroundColor: "#6366F118" }]}>
                                <Text style={raStyles.numText}>{i + 1}</Text>
                            </View>
                            <View style={raStyles.rowBody}>
                                <Text style={[raStyles.schName, { color: main }]} numberOfLines={2}>
                                    {app.scholarship?.name || "Unknown Scholarship"}
                                </Text>
                                <Text style={[raStyles.date, { color: sub }]}>
                                    {formatDate(app.created_at)}
                                </Text>
                            </View>
                            <View style={[raStyles.statusPill, { backgroundColor: st.bg }]}>
                                <Text style={[raStyles.statusText, { color: st.color }]}>{st.label}</Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const raStyles = StyleSheet.create({
    heading: { fontSize: 16, fontWeight: "800", marginBottom: 12, marginLeft: 4 },
    card: { borderRadius: 20, borderWidth: 1, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
    lastRow: { borderBottomWidth: 0 },
    numBadge: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    numText: { color: "#6366F1", fontSize: 12, fontWeight: "800" },
    rowBody: { flex: 1, gap: 3 },
    schName: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
    date: { fontSize: 11, fontWeight: "500" },
    statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, flexShrink: 0 },
    statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function MobilizerStudentProfileScreen() {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const studentId = params.studentId ? Number(params.studentId) : 0;

    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStudentProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) { setError("Authentication required"); setLoading(false); return; }
            const { token } = JSON.parse(authDataStr);
            const response = await getMobilizerStudentProfile(token, studentId);
            if (response.success && response.data) {
                const d = response.data.student || response.data;
                if (d.custom_fields) d.parsed_custom_fields = safeParse(d.custom_fields);
                setStudent(d);
            } else {
                setError(response.error || response.message || "Failed to load profile");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(useCallback(() => { if (studentId) fetchStudentProfile(); }, [studentId]));

    const grad = student ? getGrad(student.id) : (["#6366F1", "#8B5CF6"] as [string, string]);

    const sections = useMemo(() => {
        if (!student) return null;
        const cf = student.parsed_custom_fields || {};
        const ad = student.academic_details?.[0] || {};
        const handleCall = (n: string) => Linking.openURL(`tel:${n}`);
        const handleEmail = (e: string) => Linking.openURL(`mailto:${e}`);
        return [
            {
                icon: "person-circle-outline", iconColor: "#6366F1", title: "Personal Details",
                rows: [
                    { label: "Gender", value: cf.Gender, icon: "person-outline" },
                    { label: "Date of Birth", value: cf.DOB !== "0" && cf.DOB !== 0 ? cf.DOB : null, icon: "calendar-outline" },
                    { label: "Religion", value: cf.Religion, icon: "moon-outline" },
                    { label: "Caste", value: cf.Caste, icon: "people-outline" },
                    { label: "Category", value: cf.Category || cf.category, icon: "bookmark-outline" },
                    { label: "Father's Name", value: cf.father, icon: "male-outline" },
                    { label: "Mother's Name", value: cf.mother, icon: "female-outline" },
                    { label: "Family Income", value: cf.Family_income, icon: "cash-outline" },
                ],
            },
            {
                icon: "call-outline", iconColor: "#10B981", title: "Contact Information",
                rows: [
                    { label: "Phone", value: student.phone1 || cf.phone_number, icon: "call-outline", action: () => handleCall(student.phone1 || cf.phone_number), actionIcon: "call" },
                    { label: "Email", value: student.email, icon: "mail-outline", action: () => handleEmail(student.email), actionIcon: "mail" },
                    { label: "City", value: student.city || cf.city, icon: "location-outline" },
                    { label: "District", value: cf.district || cf.domicile_district || cf.College_District, icon: "map-outline" },
                    { label: "State", value: cf.State, icon: "earth-outline" },
                    { label: "Village", value: cf.Village, icon: "home-outline" },
                ],
            },
            {
                icon: "school-outline", iconColor: "#F59E0B", title: "Current Education",
                rows: [
                    { label: "Course", value: ad.course_name || cf.course, icon: "school-outline" },
                    { label: "Major / Stream", value: ad.major || cf.stream_in_12th, icon: "flask-outline" },
                    { label: "Institute", value: student.institution || ad.institution || cf.college_name || cf.university, icon: "business-outline" },
                    { label: "CGPA", value: ad.cgpa, icon: "star-outline" },
                    { label: "Percentage", value: ad.percentage || cf.percentage_12, icon: "pie-chart-outline" },
                    { label: "Session", value: cf.session, icon: "time-outline" },
                    { label: "Year of Course", value: cf.year_of_course || ad.academic_year, icon: "calendar-number-outline" },
                    { label: "Graduation Year", value: ad.graduation_year, icon: "school-outline" },
                    { label: "Annual Fees", value: cf.fees, icon: "wallet-outline" },
                ],
            },
            {
                icon: "library-outline", iconColor: "#EC4899", title: "Education History",
                rows: [
                    { label: "12th Board", value: cf["12th_board"] || cf["12th"], icon: "library-outline" },
                    { label: "Stream", value: cf.stream_in_12th, icon: "flask-outline" },
                    { label: "Passing Year", value: cf["12th_passing_year"], icon: "calendar-outline" },
                    { label: "Percentage", value: cf.percentage_12, icon: "pie-chart-outline" },
                    { label: "10th Board", value: cf.passing_10th || cf["10th"], icon: "book-outline" },
                ],
            },
            {
                icon: "card-outline", iconColor: "#3B82F6", title: "Documents & IDs",
                rows: [
                    { label: "Aadhar Number", value: cf.aachar_card_number, icon: "card-outline" },
                    { label: "Name in Aadhar", value: cf.name_in_aadhar_card, icon: "person-circle-outline" },
                    { label: "Income (Certificate)", value: cf.income_in_income_certificate ? `₹${cf.income_in_income_certificate}` : null, icon: "document-text-outline" },
                    { label: "Income Cert. Date", value: cf.issue_date_of_income_certificate, icon: "calendar-outline" },
                    { label: "Registered As", value: cf.Registering_as, icon: "information-circle-outline" },
                ],
            },
        ];
    }, [student]);

    const bg = isDark ? "#0A0A0F" : "#F4F6FF";

    return (
        <View style={[styles.root, { backgroundColor: bg }]}>
            <StatusBar barStyle="light-content" />

            {/* ── AppHeader kept as-is ── */}
            <AppHeader title="Student Details" onBack={() => router.back()} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={[styles.centerText, { color: isDark ? "#64748B" : "#9CA3AF" }]}>
                        Fetching profile…
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <View style={styles.errorIconWrap}>
                        <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
                    </View>
                    <Text style={[styles.centerText, { color: isDark ? "#F1F5F9" : "#0F172A" }]}>{error}</Text>
                    <Button title="Try Again" onPress={fetchStudentProfile} style={{ marginTop: 20, minWidth: 140 }} />
                </View>
            ) : !student ? (
                <View style={styles.center}>
                    <Text style={{ color: isDark ? "#64748B" : "#9CA3AF" }}>No data available</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Hero Banner ── */}
                    <LinearGradient
                        colors={[grad[0], grad[1]]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.hero}
                    >
                        {/* Avatar */}
                        <View style={styles.avatarRing}>
                            {student.picture ? (
                                <Image source={{ uri: student.picture }} style={styles.avatarImg} contentFit="cover" transition={400} />
                            ) : (
                                <LinearGradient colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]} style={styles.avatarFallback}>
                                    <Text style={styles.avatarInitials}>{getInitials(student.firstname, student.lastname)}</Text>
                                </LinearGradient>
                            )}
                        </View>

                        {/* Name + meta */}
                        <Text style={styles.heroName}>
                            {student.fullname || `${student.firstname} ${student.lastname}`}
                        </Text>
                        {student.institution ? (
                            <View style={styles.heroPill}>
                                <Ionicons name="business-outline" size={12} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.heroPillText}>{student.institution}</Text>
                            </View>
                        ) : null}
                        {student.city ? (
                            <View style={[styles.heroPill, { marginTop: 4 }]}>
                                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.heroPillText}>{student.city}, {student.country || "IN"}</Text>
                            </View>
                        ) : null}

                        {/* Active badge */}
                        <View style={styles.activeBadge}>
                            <View style={styles.activeDot} />
                            <Text style={styles.activeText}>Active Student</Text>
                        </View>

                        {/* Quick actions */}
                        <View style={styles.quickActions}>
                            {(student.phone1 || student.parsed_custom_fields?.phone_number) ? (
                                <TouchableOpacity
                                    style={styles.qaBtn}
                                    activeOpacity={0.8}
                                    onPress={() => Linking.openURL(`tel:${student.phone1 || student.parsed_custom_fields?.phone_number}`)}
                                >
                                    <Ionicons name="call" size={18} color={grad[0]} />
                                    <Text style={[styles.qaBtnText, { color: grad[0] }]}>Call</Text>
                                </TouchableOpacity>
                            ) : null}
                            {student.email ? (
                                <TouchableOpacity
                                    style={styles.qaBtn}
                                    activeOpacity={0.8}
                                    onPress={() => Linking.openURL(`mailto:${student.email}`)}
                                >
                                    <Ionicons name="mail" size={18} color={grad[0]} />
                                    <Text style={[styles.qaBtnText, { color: grad[0] }]}>Email</Text>
                                </TouchableOpacity>
                            ) : null}
                            <TouchableOpacity
                                style={styles.qaBtn}
                                activeOpacity={0.8}
                                onPress={() =>
                                    router.push({
                                        pathname: "/(dashboard)/mobilizer/student-scholarships",
                                        params: { studentId: student.id, studentName: student.fullname || `${student.firstname} ${student.lastname}` },
                                    })
                                }
                            >
                                <Ionicons name="school" size={18} color={grad[0]} />
                                <Text style={[styles.qaBtnText, { color: grad[0] }]}>Scholarships</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {/* ── Application Stats ── */}
                    <StatStrip summary={student.applications_summary} isDark={isDark} />

                    {/* ── Recent Applications ── */}
                    <RecentApplications apps={student.recent_applications} isDark={isDark} />

                    {/* ── Bookmarked Scholarships ── */}
                    <SectionCard
                        icon="bookmark"
                        iconColor="#6366F1"
                        title="Bookmarked Scholarships"
                        isDark={isDark}
                        rows={[
                            {
                                label: "Bookmarked Scholarships",
                                value: "View All",
                                icon: "bookmark-outline",
                                action: () => router.push({
                                    pathname: "/(dashboard)/mobilizer/mobilizer-bookmarked-scholarships",
                                    params: { studentId: student.id, studentName: student.fullname || `${student.firstname} ${student.lastname}` }
                                })
                            }
                        ]}
                    />

                    {/* ── Info sections ── */}
                    {sections?.map((s) => (
                        <SectionCard key={s.title} {...s} isDark={isDark} />
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    centerText: { fontSize: 14, fontWeight: "500", textAlign: "center" },
    errorIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 4 },
    scroll: { paddingHorizontal: 16, paddingTop: 20 },

    // Hero
    hero: {
        borderRadius: 24, marginBottom: 20, paddingTop: 28,
        paddingBottom: 20, paddingHorizontal: 20, alignItems: "center",
        overflow: "hidden",
    },
    avatarRing: {
        width: 90, height: 90, borderRadius: 28,
        borderWidth: 3, borderColor: "rgba(255,255,255,0.5)",
        overflow: "hidden", marginBottom: 14,
        shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
    },
    avatarImg: { width: "100%", height: "100%" },
    avatarFallback: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
    avatarInitials: { color: "#fff", fontSize: 30, fontWeight: "900" },
    heroName: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -0.3, textAlign: "center", marginBottom: 8 },
    heroPill: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
    heroPillText: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" },
    activeBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 10, marginBottom: 16 },
    activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ADE80" },
    activeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

    // Quick actions
    quickActions: { flexDirection: "row", gap: 12 },
    qaBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "rgba(255,255,255,0.92)",
        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 14,
    },
    qaBtnText: { fontSize: 13, fontWeight: "700" },
});
