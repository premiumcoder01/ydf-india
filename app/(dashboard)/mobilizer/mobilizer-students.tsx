import { AppHeader, SearchBar } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getMobilizerStudents } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
    "#6366F1", "#8B5CF6", "#EC4899", "#F59E0B",
    "#10B981", "#3B82F6", "#EF4444", "#14B8A6",
    "#F97316", "#06B6D4", "#84CC16", "#A855F7",
];

function getAvatarColor(id: number) {
    return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function getInitials(firstname?: string, lastname?: string) {
    const f = (firstname || "S").charAt(0).toUpperCase();
    const l = (lastname || "").charAt(0).toUpperCase();
    return l ? `${f}${l}` : f;
}

function formatPhone(raw: string) {
    if (!raw || raw.length < 5 || raw === "IN") return null;
    // strip leading 91 country code
    let p = raw.replace(/\D/g, "");
    if (p.startsWith("91") && p.length === 12) p = p.slice(2);
    if (p.length === 10) return `+91 ${p.slice(0, 5)} ${p.slice(5)}`;
    return raw;
}

function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.floor((nowOnly.getTime() - dateOnly.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff}d ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function parseCustomFields(raw: any): Record<string, string> {
    try {
        if (typeof raw === "string") return JSON.parse(raw);
        if (typeof raw === "object" && raw !== null) return raw;
    } catch (_) { }
    return {};
}

const LEVEL_COLOR: Record<string, { bg: string; text: string }> = {
    "Post Graduate (PG)": { bg: "#EDE9FE", text: "#6D28D9" },
    "Under Graduate (UG)": { bg: "#DBEAFE", text: "#1D4ED8" },
    Diploma: { bg: "#FEF3C7", text: "#92400E" },
    "Class 12": { bg: "#FCE7F3", text: "#9D174D" },
    "Class 10": { bg: "#DCFCE7", text: "#166534" },
};

function levelStyle(level?: string | null) {
    if (!level) return { bg: "#F1F5F9", text: "#64748B" };
    return LEVEL_COLOR[level] ?? { bg: "#E0F2FE", text: "#0369A1" };
}

// ─── Student Card ─────────────────────────────────────────────────────────────
function StudentCard({ item, isDark }: { item: any; isDark: boolean }) {
    const cf = parseCustomFields(item.custom_fields);
    const avatarColor = getAvatarColor(item.id);
    const initials = getInitials(item.firstname, item.lastname);
    const isAcademicEmpty = !item.academic_level && (!cf?.course || cf?.course === 'Select');
    const academicLevel = isAcademicEmpty ? "Academic Details Pending" : (item.academic_level || cf?.course);
    const lvl = isAcademicEmpty ? { bg: "#FFF7ED", text: "#EA580C" } : levelStyle(item.academic_level || cf?.course);

    const phone = formatPhone(item.phone1) || formatPhone(cf.phone_number) || null;
    const institution = item.institution || cf.college_name || cf.university || null;
    const cleanCity = item.city === "IN" ? "India" : item.city;
    const location = [cleanCity, cf.State !== 'Select' ? cf.State : null, cf.district !== 'Select' ? cf.district : null].filter(Boolean).join(", ") || null;
    const income = cf.Family_income && cf.Family_income !== 'Select' ? cf.Family_income : null;
    const gender = cf.Gender && cf.Gender !== 'Select' ? cf.Gender : null;
    const caste = cf.Caste && cf.Caste !== 'Select' ? cf.Caste : null;
    const appCount = item.applications_count ?? 0;

    const cardBg = isDark ? "#13131A" : "#FFFFFF";
    const borderCol = isDark ? "#1E1E2E" : "#F1F5F9";
    const subText = isDark ? "#64748B" : "#94A3B8";
    const mainText = isDark ? "#F1F5F9" : "#0F172A";
    const rowBg = isDark ? "#0F0F17" : "#F8FAFF";

    return (
        <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => router.push({ pathname: "/(dashboard)/mobilizer/mobilizer-student-profile", params: { studentId: item.id } })}
            style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol, shadowColor: isDark ? "#000" : avatarColor }]}
        >
            {/* Left accent */}
            <View style={[styles.accent, { backgroundColor: avatarColor }]} />

            <View style={styles.cardInner}>
                {/* ── Top: Avatar + Name + Level + Count ── */}
                <View style={styles.topRow}>
                    {/* Avatar */}
                    <View style={styles.avatarWrap}>
                        {item.picture ? (
                            <Image
                                source={{ uri: item.picture }}
                                style={[styles.avatarImg, { borderColor: avatarColor + "55" }]}
                                contentFit="cover"
                                transition={400}
                            />
                        ) : (
                            <LinearGradient
                                colors={[avatarColor, avatarColor + "BB"]}
                                style={styles.avatarFallback}
                            >
                                <Text style={styles.avatarInitials}>{initials}</Text>
                            </LinearGradient>
                        )}
                        {/* Active dot */}
                        <View style={[styles.activeDot, { borderColor: cardBg }]} />
                    </View>

                    {/* Name + email + badges */}
                    <View style={styles.nameBlock}>
                        <Text style={[styles.studentName, { color: mainText }]} numberOfLines={1}>
                            {item.fullname || `${item.firstname} ${item.lastname}`}
                        </Text>
                        <Text style={[styles.studentEmail, { color: subText }]} numberOfLines={1}>
                            {item.email}
                        </Text>
                        <View style={styles.pillRow}>
                            {academicLevel ? (
                                <View style={[styles.pill, { backgroundColor: lvl.bg }, isAcademicEmpty && { borderStyle: 'dashed', borderWidth: 1, borderColor: "#EA580C" }]}>
                                    <Text style={[styles.pillText, { color: lvl.text }, isAcademicEmpty && { fontStyle: 'italic' }]}>{academicLevel}</Text>
                                </View>
                            ) : null}
                            {gender ? (
                                <View style={[styles.pill, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
                                    <Text style={[styles.pillText, { color: subText }]}>{gender}</Text>
                                </View>
                            ) : null}
                            {caste ? (
                                <View style={[styles.pill, { backgroundColor: isDark ? "#1E293B" : "#FFF7ED" }]}>
                                    <Text style={[styles.pillText, { color: "#C2410C" }]}>{caste}</Text>
                                </View>
                            ) : null}
                        </View>
                    </View>

                    {/* Application count badge */}
                    <View style={[styles.countBadge, { backgroundColor: avatarColor + "18", borderColor: avatarColor + "44" }]}>
                        <Text style={[styles.countNum, { color: avatarColor }]}>{appCount}</Text>
                        <Text style={[styles.countLabel, { color: avatarColor + "AA" }]}>apps</Text>
                    </View>
                </View>

                {/* ── Info grid ── */}
                <View style={[styles.infoGrid, { backgroundColor: rowBg, borderColor: borderCol }]}>
                    {phone ? (
                        <InfoCell icon="call-outline" value={phone} isDark={isDark} subText={subText} mainText={mainText} />
                    ) : null}
                    {location ? (
                        <InfoCell icon="location-outline" value={location} isDark={isDark} subText={subText} mainText={mainText} />
                    ) : null}
                    {institution ? (
                        <InfoCell icon="business-outline" value={institution} isDark={isDark} subText={subText} mainText={mainText} />
                    ) : null}
                    {income ? (
                        <InfoCell icon="wallet-outline" value={income} isDark={isDark} subText={subText} mainText={mainText} />
                    ) : null}
                </View>

                {/* ── Footer ── */}
                <View style={styles.footer}>
                    <View style={styles.joinedRow}>
                        <Ionicons name="time-outline" size={13} color={subText} />
                        <Text style={[styles.joinedText, { color: subText }]}>
                            Joined {formatDate(item.created_at)}
                        </Text>
                    </View>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() =>
                            router.push({
                                pathname: "/(dashboard)/mobilizer/student-scholarships",
                                params: { studentId: item.id, studentName: item.fullname || `${item.firstname} ${item.lastname}` },
                            })
                        }
                        style={[styles.scholarshipBtn, { backgroundColor: avatarColor }]}
                    >
                        <Ionicons name="school-outline" size={14} color="#fff" />
                        <Text style={styles.scholarshipBtnText}>View Scholarships</Text>
                        <Ionicons name="arrow-forward" size={13} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function InfoCell({ icon, value, subText, mainText }: any) {
    return (
        <View style={styles.infoCell}>
            <Ionicons name={icon} size={14} color={subText} style={{ flexShrink: 0 }} />
            <Text style={[styles.infoCellText, { color: mainText }]} numberOfLines={1}>{value}</Text>
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MobilizerStudentsScreen() {
    const { isDark, colors } = useTheme();
    const [searchQuery, setSearchQuery] = useState("");
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students;
        const q = searchQuery.toLowerCase();
        return students.filter((s) =>
            (s.fullname || "").toLowerCase().includes(q) ||
            (s.email || "").toLowerCase().includes(q) ||
            (s.phone1 || "").toLowerCase().includes(q) ||
            (s.institution || "").toLowerCase().includes(q) ||
            (s.city || "").toLowerCase().includes(q)
        );
    }, [students, searchQuery]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) return;
            const { token } = JSON.parse(authDataStr);
            const response = await getMobilizerStudents(token, 1, 100, searchQuery);
            if (response.success && response.data?.students) {
                setStudents(response.data.students);
            } else {
                setStudents([]);
            }
        } catch (err) {
            console.error("Error fetching students:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchStudents(); }, []));

    const onRefresh = () => { setRefreshing(true); fetchStudents(); };

    const bg = isDark ? "#0A0A0F" : "#F4F6FF";

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* ── Header (kept as-is) ── */}
            <AppHeader
                title="My Students"
                onBack={() => router.back()}
                rightElement={
                    <TouchableOpacity onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-add-student")}>
                        <Ionicons name="add-circle" size={32} color={colors.primary} />
                    </TouchableOpacity>
                }
            />

            <View style={styles.searchWrap}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search students..."
                    onClear={() => setSearchQuery("")}
                />
            </View>

            {/* Results count */}
            {!loading && (
                <View style={styles.resultsRow}>
                    <Text style={[styles.resultsText, { color: isDark ? "#475569" : "#94A3B8" }]}>
                        {filteredStudents.length === students.length
                            ? `${students.length} students`
                            : `${filteredStudents.length} of ${students.length} matching`}
                    </Text>
                </View>
            )}

            {loading && !refreshing ? (
                <View style={styles.loaderWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loaderText, { color: isDark ? "#64748B" : "#9CA3AF" }]}>
                        Loading students…
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredStudents}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => <StudentCard item={item} isDark={isDark} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <View style={[styles.emptyIcon, { backgroundColor: isDark ? "#1E1E2E" : "#EDE9FE" }]}>
                                <Ionicons name="people-outline" size={52} color="#6366F1" style={{ opacity: 0.7 }} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: isDark ? "#F1F5F9" : "#0F172A" }]}>
                                No Students Found
                            </Text>
                            <Text style={[styles.emptySub, { color: isDark ? "#475569" : "#94A3B8" }]}>
                                {searchQuery ? "Try a different search term" : "Add students to get started"}
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },
    searchWrap: { paddingHorizontal: 16, paddingTop: 8 },
    resultsRow: { paddingHorizontal: 20, paddingVertical: 6 },
    resultsText: { fontSize: 12, fontWeight: "500" },
    loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
    loaderText: { fontSize: 14, fontWeight: "500" },
    listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },

    // Card
    card: {
        flexDirection: "row",
        borderRadius: 20,
        marginBottom: 14,
        borderWidth: 1,
        overflow: "hidden",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    accent: { width: 4 },
    cardInner: { flex: 1, padding: 14 },

    // Top row
    topRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
    avatarWrap: { position: "relative" },
    avatarImg: {
        width: 52, height: 52, borderRadius: 16,
        borderWidth: 2,
    },
    avatarFallback: {
        width: 52, height: 52, borderRadius: 16,
        justifyContent: "center", alignItems: "center",
    },
    avatarInitials: { color: "#fff", fontSize: 18, fontWeight: "800" },
    activeDot: {
        position: "absolute", bottom: 1, right: 1,
        width: 11, height: 11, borderRadius: 6,
        backgroundColor: "#22C55E", borderWidth: 2,
    },

    nameBlock: { flex: 1, gap: 3 },
    studentName: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
    studentEmail: { fontSize: 12, fontWeight: "400" },
    pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 3 },
    pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    pillText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize", letterSpacing: 0.2 },

    countBadge: {
        alignItems: "center", justifyContent: "center",
        width: 48, height: 48, borderRadius: 14,
        borderWidth: 1, gap: 0,
    },
    countNum: { fontSize: 18, fontWeight: "900", lineHeight: 22 },
    countLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },

    // Info grid
    infoGrid: {
        borderRadius: 12, borderWidth: 1,
        paddingHorizontal: 12, paddingVertical: 10,
        gap: 8, marginBottom: 12,
    },
    infoCell: { flexDirection: "row", alignItems: "center", gap: 8 },
    infoCellText: { fontSize: 13, fontWeight: "500", flex: 1 },

    // Footer
    footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    joinedRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    joinedText: { fontSize: 11, fontWeight: "500" },
    actionsRow: { flexDirection: "row", gap: 8 },
    actionBtn: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    },
    actionBtnText: { fontSize: 12, fontWeight: "700" },
    scholarshipBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    },
    scholarshipBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

    // Empty
    emptyWrap: { alignItems: "center", justifyContent: "center", marginTop: 60, paddingHorizontal: 24 },
    emptyIcon: {
        width: 96, height: 96, borderRadius: 28,
        justifyContent: "center", alignItems: "center", marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontWeight: "800", marginBottom: 6, textAlign: "center" },
    emptySub: { fontSize: 13, textAlign: "center", lineHeight: 20 },
});
