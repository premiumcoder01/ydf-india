import { AppHeader, SearchBar } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getMobilizerApplications } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { MotiView } from "moti";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Application {
    id: number;
    student: { id: number; name: string; email: string };
    scholarship: { id: number; name: string };
    status: string;
    applied_at: string;
    timecreated: string;
    timemodified: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_PALETTE = [
    ["#6366F1", "#8B5CF6"], ["#EC4899", "#F43F5E"], ["#F59E0B", "#EF4444"],
    ["#10B981", "#059669"], ["#3B82F6", "#6366F1"], ["#14B8A6", "#06B6D4"],
    ["#F97316", "#EF4444"], ["#8B5CF6", "#A855F7"], ["#06B6D4", "#3B82F6"],
];
const avatarColor = (id: number) => AVATAR_PALETTE[id % AVATAR_PALETTE.length][0];
const initials = (name: string) =>
    name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

const STATUS_CFG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
    new: { color: "#6366F1", bg: "#EDE9FE", label: "New", icon: "sparkles" },
    approved: { color: "#10B981", bg: "#D1FAE5", label: "Approved", icon: "checkmark-circle" },
    rejected: { color: "#EF4444", bg: "#FEE2E2", label: "Rejected", icon: "close-circle" },
    pending: { color: "#F59E0B", bg: "#FEF3C7", label: "Pending", icon: "time" },
    submitted: { color: "#3B82F6", bg: "#DBEAFE", label: "Submitted", icon: "send" },
    in_progress: { color: "#06B6D4", bg: "#CFFAFE", label: "In Progress", icon: "sync" },
};
const getStatus = (s: string) =>
    STATUS_CFG[s?.toLowerCase()] ?? { color: "#94A3B8", bg: "#F1F5F9", label: s || "Unknown", icon: "help-circle" };

const fmt = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const FILTER_TABS = ["All", "New", "Approved", "Rejected", "Pending"];

// ─── Application Card ─────────────────────────────────────────────────────────
function AppCard({ item, index, isDark }: { item: Application; index: number; isDark: boolean }) {
    const st = getStatus(item.status);
    const ac = avatarColor(item.student.id);
    const bg = isDark ? "#13131A" : "#FFFFFF";
    const bdr = isDark ? "#1E1E2E" : "#F1F5F9";
    const main = isDark ? "#F1F5F9" : "#0F172A";
    const sub = isDark ? "#64748B" : "#94A3B8";

    return (
        <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 380, delay: index * 45 }}
            style={{ marginBottom: 12 }}
        >
            <View style={[card.wrap, { backgroundColor: bg, borderColor: bdr, borderLeftColor: st.color }]}>

                {/* ── Row 1: Student ──────────────────────────────── */}
                <Pressable
                    style={({ pressed }) => [card.studentRow, pressed && { opacity: 0.75 }]}
                    onPress={() =>
                        router.push({
                            pathname: "/(dashboard)/mobilizer/mobilizer-student-profile",
                            params: { studentId: item.student.id },
                        })
                    }
                >
                    {/* Avatar */}
                    <View style={[card.avatar, { backgroundColor: ac + "22" }]}>
                        <Text style={[card.avatarTxt, { color: ac }]}>{initials(item.student.name)}</Text>
                    </View>

                    {/* Name + email */}
                    <View style={{ flex: 1 }}>
                        <Text style={[card.studentName, { color: main }]} numberOfLines={1}>
                            {item.student.name}
                        </Text>
                        <Text style={[card.studentEmail, { color: sub }]} numberOfLines={1}>
                            {item.student.email}
                        </Text>
                    </View>

                    {/* Status pill */}
                    <View style={[card.statusPill, { backgroundColor: isDark ? st.color + "22" : st.bg }]}>
                        <Ionicons name={st.icon as any} size={10} color={st.color} />
                        <Text style={[card.statusTxt, { color: st.color }]}>{st.label}</Text>
                    </View>
                </Pressable>

                {/* ── Connector ──────────────────────────────────── */}
                <View style={[card.connector, { borderLeftColor: isDark ? "#2D2D3D" : "#E2E8F0" }]}>
                    <View style={[card.connectorDot, { backgroundColor: isDark ? "#2D2D3D" : "#E2E8F0" }]} />
                    <Text style={[card.connectorLabel, { color: sub }]}>applied for</Text>
                </View>

                {/* ── Row 2: Scholarship ─────────────────────────── */}
                <View style={[card.schRow, { backgroundColor: isDark ? "#1C1C2A" : "#F8FAFF", borderColor: isDark ? "#2A2A3E" : "#E8EEFF" }]}>
                    <View style={[card.schIcon, { backgroundColor: "#6366F1" + "18" }]}>
                        <Ionicons name="school" size={15} color="#6366F1" />
                    </View>
                    <Text style={[card.schName, { color: main }]} numberOfLines={2}>
                        {item.scholarship.name}
                    </Text>
                </View>

                {/* ── Footer ────────────────────────────────────── */}
                <View style={card.footer}>
                    <View style={card.footerLeft}>
                        <Ionicons name="calendar-outline" size={12} color={sub} />
                        <Text style={[card.footerTxt, { color: sub }]}>{fmt(item.applied_at)}</Text>
                    </View>
                    <View style={[card.idBadge, { backgroundColor: isDark ? "#1C1C2A" : "#F1F5F9" }]}>
                        <Text style={[card.idTxt, { color: sub }]}>#{item.id}</Text>
                    </View>
                </View>
            </View>
        </MotiView>
    );
}

const card = StyleSheet.create({
    wrap: {
        borderRadius: 16, borderWidth: 1, borderLeftWidth: 4,
        overflow: "hidden", padding: 14,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    studentRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
    avatar: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    avatarTxt: { fontSize: 14, fontWeight: "800" },
    studentName: { fontSize: 14, fontWeight: "700", marginBottom: 1 },
    studentEmail: { fontSize: 11, fontWeight: "400" },
    statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, flexShrink: 0 },
    statusTxt: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
    connector: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 19, marginBottom: 6, borderLeftWidth: 1.5, marginLeft: 18 },
    connectorDot: { width: 6, height: 6, borderRadius: 3 },
    connectorLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
    schRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
    schIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    schName: { flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 18 },
    footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    footerLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
    footerTxt: { fontSize: 11, fontWeight: "500" },
    idBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    idTxt: { fontSize: 11, fontWeight: "600" },
});

// ─── Stats Strip ──────────────────────────────────────────────────────────────
function StatsStrip({ apps, isDark }: { apps: Application[]; isDark: boolean }) {
    const counts = useMemo(() => ({
        total: apps.length,
        new: apps.filter(a => a.status === "new").length,
        approved: apps.filter(a => a.status === "approved").length,
        rejected: apps.filter(a => a.status === "rejected").length,
    }), [apps]);

    const items = [
        { label: "Total", value: counts.total, color: "#6366F1" },
        { label: "New", value: counts.new, color: "#8B5CF6" },
        { label: "Approved", value: counts.approved, color: "#10B981" },
        { label: "Rejected", value: counts.rejected, color: "#EF4444" },
    ];
    const bg = isDark ? "#13131A" : "#FFFFFF";
    const bdr = isDark ? "#1E1E2E" : "#F1F5F9";
    return (
        <View style={[ss.row, { backgroundColor: bg, borderColor: bdr }]}>
            {items.map((it, i) => (
                <React.Fragment key={it.label}>
                    <View style={ss.cell}>
                        <Text style={[ss.num, { color: it.color }]}>{it.value}</Text>
                        <Text style={[ss.lbl, { color: isDark ? "#64748B" : "#94A3B8" }]}>{it.label}</Text>
                    </View>
                    {i < items.length - 1 && <View style={[ss.sep, { backgroundColor: bdr }]} />}
                </React.Fragment>
            ))}
        </View>
    );
}
const ss = StyleSheet.create({
    row: { flexDirection: "row", borderRadius: 16, borderWidth: 1, marginHorizontal: 16, marginBottom: 12, },
    cell: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 2 },
    num: { fontSize: 20, fontWeight: "900" },
    lbl: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
    sep: { width: 1, marginVertical: 10 },
});

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
function FilterTabs({ active, onChange, isDark }: { active: string; onChange: (t: string) => void; isDark: boolean }) {
    return (
        <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={{ flexShrink: 0, flexGrow: 0 }}
            contentContainerStyle={ft.scroll}
        >
            {FILTER_TABS.map(tab => {
                const st = getStatus(tab.toLowerCase());
                const isActive = active === tab;
                return (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => onChange(tab)}
                        activeOpacity={0.8}
                        style={[
                            ft.tab,
                            isActive
                                ? { backgroundColor: tab === "All" ? "#6366F1" : st.color, borderColor: "transparent" }
                                : { backgroundColor: isDark ? "#13131A" : "#F8FAFF", borderColor: isDark ? "#1E1E2E" : "#E2E8F0" },
                        ]}
                    >
                        {tab !== "All" && (
                            <Ionicons
                                name={st.icon as any}
                                size={11}
                                color={isActive ? "#fff" : (isDark ? "#64748B" : "#94A3B8")}
                            />
                        )}
                        <Text style={[ft.label, { color: isActive ? "#fff" : (isDark ? "#94A3B8" : "#64748B") }]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}
const ft = StyleSheet.create({
    scroll: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
    tab: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, height: 34, borderRadius: 20, borderWidth: 1 },
    label: { fontSize: 12, fontWeight: "700" },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MobilizerApplicationsScreen() {
    const { isDark } = useTheme();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("All");

    const fetchData = async () => {
        try {
            setLoading(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) return;
            const { token } = JSON.parse(authDataStr);
            const res = await getMobilizerApplications(token, { page: 1, per_page: 100 });
            if (res.success && res.data) {
                const data = res.data.applications || [];
                setApplications(Array.isArray(data) ? data : []);
            } else {
                setApplications([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    const filtered = useMemo(() => {
        let list = applications;
        if (activeFilter !== "All")
            list = list.filter(a => a.status.toLowerCase() === activeFilter.toLowerCase());
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(a =>
                a.student.name.toLowerCase().includes(q) ||
                a.student.email.toLowerCase().includes(q) ||
                a.scholarship.name.toLowerCase().includes(q)
            );
        }
        return list;
    }, [applications, activeFilter, searchQuery]);

    const bg = isDark ? "#0A0A0F" : "#F4F6FF";

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <AppHeader title="Applications" onBack={() => router.back()} />

            {/* Search */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search student, email or scholarship…"
                    onClear={() => setSearchQuery("")}
                />
            </View>

            {/* Stats */}
            <StatsStrip apps={applications} isDark={isDark} />

            {/* Filters */}
            <FilterTabs active={activeFilter} onChange={setActiveFilter} isDark={isDark} />

            {/* List */}
            {loading && applications.length === 0 ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={{ color: isDark ? "#64748B" : "#94A3B8", fontSize: 14, fontWeight: "500" }}>
                        Loading applications…
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item, index }) => (
                        <AppCard item={item} index={index} isDark={isDark} />
                    )}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); fetchData(); }}
                            colors={["#6366F1"]}
                            tintColor="#6366F1"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        filtered.length > 0 ? (
                            <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#64748B" : "#94A3B8", marginBottom: 10 }}>
                                {filtered.length} application{filtered.length !== 1 ? "s" : ""}
                                {activeFilter !== "All" ? ` · ${activeFilter}` : ""}
                                {searchQuery ? ` · "${searchQuery}"` : ""}
                            </Text>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: "center", marginTop: 60, gap: 12 }}>
                            <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: isDark ? "#13131A" : "#EDE9FE", alignItems: "center", justifyContent: "center" }}>
                                <Ionicons name="documents-outline" size={32} color="#6366F1" />
                            </View>
                            <Text style={{ fontSize: 17, fontWeight: "700", color: isDark ? "#F1F5F9" : "#0F172A" }}>
                                No Applications Found
                            </Text>
                            <Text style={{ fontSize: 13, color: isDark ? "#64748B" : "#94A3B8", textAlign: "center", maxWidth: 240 }}>
                                {searchQuery || activeFilter !== "All"
                                    ? "Try clearing your filters or search."
                                    : "Applications from your students will appear here."}
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
