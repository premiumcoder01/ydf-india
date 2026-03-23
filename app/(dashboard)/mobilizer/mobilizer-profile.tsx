import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function getCustomField(fields: any[], shortname: string): string {
    return fields?.find((f: any) => f.shortname === shortname)?.value || "";
}

function formatDOB(timestamp: string): string {
    if (!timestamp || isNaN(Number(timestamp))) return "";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function cleanPhone(phone: string): string {
    if (!phone) return "";
    if (phone.startsWith("91") && phone.length === 12) return "+91 " + phone.slice(2);
    if (phone.startsWith("+91")) return phone;
    return phone;
}

export default function MobilizerProfileScreen() {
    const { isDark, toggleTheme, colors } = useTheme();
    const insets = useSafeAreaInsets();
    const scrollY = useRef(new Animated.Value(0)).current;
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (authDataStr) {
                const authData = JSON.parse(authDataStr);
                if (authData.token) {
                    const response = await getUserProfile(authData.token);
                    if (response.success && response.data?.user) {
                        setProfile(response.data.user);
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    const handleLogout = async () => {
        Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: async () => {
                    await AsyncStorage.removeItem("authData");
                    router.replace("/(auth)/sign-in");
                },
            },
        ]);
    };

    const heroScale = scrollY.interpolate({ inputRange: [0, 100], outputRange: [1, 0.95], extrapolate: "clamp" });
    const heroOpacity = scrollY.interpolate({ inputRange: [0, 100], outputRange: [1, 0.85], extrapolate: "clamp" });

    // ── Sub-components ────────────────────────────────────────────────────────

    const InfoRow = ({ icon, label, value, color, isLast = false }: any) => {
        if (!value) return null;
        return (
            <View style={[
                styles.infoRow,
                !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6" }
            ]}>
                <View style={[styles.infoIcon, { backgroundColor: color + "18" }]}>
                    <Ionicons name={icon} size={17} color={color} />
                </View>
                <View style={styles.infoText}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
                </View>
            </View>
        );
    };

    const ActionItem = ({ icon, label, onPress, color, isLast = false, rightElement }: any) => (
        <TouchableOpacity
            style={[
                styles.actionItem,
                !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6" }
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.actionIcon, { backgroundColor: color + "18" }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={[styles.actionLabel, { color: label === "Logout" ? color : colors.text }]}>{label}</Text>
            {rightElement ?? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
        </TouchableOpacity>
    );

    const SectionTitle = ({ title, icon }: any) => (
        <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name={icon} size={15} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? "#0f0f0f" : "#f4f6fb", justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const cf = profile?.customfields || [];
    const gender = getCustomField(cf, "Gender");
    const dob = formatDOB(getCustomField(cf, "DOB"));
    const religion = getCustomField(cf, "Religion");
    const caste = getCustomField(cf, "Caste");
    const state = getCustomField(cf, "State");
    const district = getCustomField(cf, "district");
    const domicileDistrict = getCustomField(cf, "domicile_district");
    const passing10th = getCustomField(cf, "passing_10th");
    const board12th = getCustomField(cf, "12th_board");
    const stream12th = getCustomField(cf, "stream_in_12th");
    const passing12th = getCustomField(cf, "12th_passing_year");
    const familyIncome = getCustomField(cf, "Family_income");
    const applStatus = getCustomField(cf, "appl_status");
    const session = getCustomField(cf, "session");
    const schemeName = getCustomField(cf, "schemename");

    const initials = profile?.fullname
        ?.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() || "M";

    const applStatusColor =
        applStatus === "Approved" ? "#10B981" :
            applStatus === "Pending" ? "#F59E0B" :
                applStatus === "Rejected" ? "#EF4444" : "#6B7280";

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#0f0f0f" : "#f4f6fb" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppHeader title="Profile" onBack={() => router.back()} />

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            >
                {/* ── Hero Card ────────────────────────────────────────────── */}
                <Animated.View style={[
                    styles.heroWrap,
                    { opacity: heroOpacity, transform: [{ scale: heroScale }] }
                ]}>
                    <LinearGradient
                        colors={isDark ? ["#1e3a8a", "#2563eb"] : ["#2563eb", "#60a5fa"]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.heroGradient}
                    >
                        <View style={styles.blob1} />
                        <View style={styles.blob2} />

                        {/* Avatar */}
                        <View style={styles.avatarWrap}>
                            {profile?.profileimageurl ? (
                                <Image
                                    source={{ uri: `${profile.profileimageurl}?t=${Date.now()}` }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={styles.avatarFallback}>
                                    <Text style={styles.avatarInitials}>{initials}</Text>
                                </View>
                            )}
                            <View style={styles.onlineBadge}>
                                <View style={styles.onlineDot} />
                            </View>
                        </View>

                        <Text style={styles.heroName}>{profile?.fullname || "Mobilizer"}</Text>
                        {profile?.username ? (
                            <Text style={styles.heroUsername}>@{profile.username}</Text>
                        ) : null}

                        <View style={styles.rolePill}>
                            <Ionicons name="shield-checkmark" size={13} color="#fff" />
                            <Text style={styles.rolePillText}>Student Mobilizer</Text>
                        </View>

                        {profile?.email ? (
                            <View style={styles.heroMetaRow}>
                                <Ionicons name="mail-outline" size={13} color="rgba(255,255,255,0.75)" />
                                <Text style={styles.heroMetaText}>{profile.email}</Text>
                            </View>
                        ) : null}

                        {(profile?.city || state) ? (
                            <View style={styles.heroMetaRow}>
                                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.75)" />
                                <Text style={styles.heroMetaText}>{[profile?.city, state].filter(Boolean).join(", ")}</Text>
                            </View>
                        ) : null}

                        {/* Application Status Badge */}
                        {applStatus ? (
                            <View style={[styles.statusBadge, { backgroundColor: applStatusColor + "22", borderColor: applStatusColor + "88" }]}>
                                <View style={[styles.statusDot, { backgroundColor: applStatusColor }]} />
                                <Text style={[styles.statusText, { color: "#fff" }]}>Application: {applStatus}</Text>
                            </View>
                        ) : null}

                        {/* Stats strip */}
                        <View style={styles.statsStrip}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{session || "—"}</Text>
                                <Text style={styles.statLabel}>Session</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{passing12th || "—"}</Text>
                                <Text style={styles.statLabel}>12th Pass</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{passing10th || "—"}</Text>
                                <Text style={styles.statLabel}>10th Pass</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                <View style={styles.content}>
                    {/* ── Contact Info ─────────────────────────────────────── */}
                    <View style={styles.section}>
                        <SectionTitle title="Contact Information" icon="call-outline" />
                        <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff", borderColor: isDark ? colors.border : "#eee" }]}>
                            <InfoRow icon="mail-outline" label="Email Address" value={profile?.email} color="#2563eb" />
                            <InfoRow icon="call-outline" label="Phone Number" value={cleanPhone(profile?.phone1 || profile?.phone2 || "")} color="#10B981" />
                            <InfoRow icon="phone-portrait-outline" label="Alt. Phone" value={profile?.phone2 !== profile?.phone1 ? cleanPhone(profile?.phone2 || "") : ""} color="#06B6D4" />
                            <InfoRow icon="location-outline" label="City / State" value={[profile?.city, state].filter(Boolean).join(", ")} color="#F59E0B" isLast />
                        </View>
                    </View>

                    {/* ── Personal Info ─────────────────────────────────────── */}
                    <View style={styles.section}>
                        <SectionTitle title="Personal Information" icon="person-outline" />
                        <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff", borderColor: isDark ? colors.border : "#eee" }]}>
                            <InfoRow icon="person-outline" label="Gender" value={gender} color="#8B5CF6" />
                            <InfoRow icon="calendar-outline" label="Date of Birth" value={dob} color="#EC4899" />
                            <InfoRow icon="heart-outline" label="Religion" value={religion} color="#F59E0B" />
                            <InfoRow icon="people-outline" label="Caste Category" value={caste} color="#10B981" />
                            <InfoRow icon="wallet-outline" label="Family Income" value={familyIncome} color="#6366F1" isLast />
                        </View>
                    </View>

                    {/* ── Location Info ─────────────────────────────────────── */}
                    {(state || district || domicileDistrict) ? (
                        <View style={styles.section}>
                            <SectionTitle title="Location Details" icon="map-outline" />
                            <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff", borderColor: isDark ? colors.border : "#eee" }]}>
                                <InfoRow icon="business-outline" label="State" value={state} color="#2563eb" />
                                <InfoRow icon="navigate-outline" label="District" value={district} color="#F59E0B" />
                                <InfoRow icon="home-outline" label="Domicile District" value={domicileDistrict !== district ? domicileDistrict : ""} color="#10B981" isLast />
                            </View>
                        </View>
                    ) : null}

                    {/* ── Academic Info ─────────────────────────────────────── */}
                    {(board12th || stream12th || passing10th || passing12th) ? (
                        <View style={styles.section}>
                            <SectionTitle title="Academic Details" icon="school-outline" />
                            <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff", borderColor: isDark ? colors.border : "#eee" }]}>
                                <InfoRow icon="ribbon-outline" label="10th Passing Year" value={passing10th} color="#10B981" />
                                <InfoRow icon="ribbon-outline" label="12th Board" value={board12th} color="#2563eb" />
                                <InfoRow icon="book-outline" label="Stream (12th)" value={stream12th} color="#8B5CF6" />
                                <InfoRow icon="ribbon-outline" label="12th Passing Year" value={passing12th} color="#F59E0B" isLast />
                            </View>
                        </View>
                    ) : null}

                    {/* ── Application Info ──────────────────────────────────── */}
                    {(applStatus || schemeName) ? (
                        <View style={styles.section}>
                            <SectionTitle title="Application Details" icon="document-text-outline" />
                            <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff", borderColor: isDark ? colors.border : "#eee" }]}>
                                <InfoRow icon="checkmark-circle-outline" label="Application Status" value={applStatus} color={applStatusColor} />
                                <InfoRow icon="layers-outline" label="Scheme Name" value={schemeName !== "other" ? schemeName : "Other"} color="#6366F1" isLast />
                            </View>
                        </View>
                    ) : null}



                    {/* ── Settings ──────────────────────────────────────────── */}
                    <View style={styles.section}>
                        <SectionTitle title="Settings & Preferences" icon="settings-outline" />
                        <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff", borderColor: isDark ? colors.border : "#eee", padding: 0, overflow: "hidden" }]}>
                            <ActionItem
                                icon="create-outline"
                                label="Edit Profile"
                                color="#3B82F6"
                                onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-account")}
                            />
                            <ActionItem
                                icon={isDark ? "moon" : "sunny"}
                                label="Dark Mode"
                                color={isDark ? "#A855F7" : "#F59E0B"}
                                onPress={toggleTheme}
                                rightElement={
                                    <Switch
                                        value={isDark}
                                        onValueChange={toggleTheme}
                                        trackColor={{ false: "#d1d5db", true: colors.primary }}
                                        thumbColor="#fff"
                                        ios_backgroundColor="#d1d5db"
                                    />
                                }
                            />
                            <ActionItem
                                icon="lock-closed-outline"
                                label="Change Password"
                                color="#10B981"
                                onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-privacy")}
                            />
                            <ActionItem
                                icon="help-circle-outline"
                                label="Help & Support"
                                color="#8B5CF6"
                                onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-help")}
                            />
                            <ActionItem
                                icon="information-circle-outline"
                                label="About App"
                                color="#06B6D4"
                                onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-about")}
                            />
                            <ActionItem
                                icon="log-out-outline"
                                label="Logout"
                                color="#EF4444"
                                isLast
                                onPress={handleLogout}
                            />
                        </View>
                    </View>

                    {/* ── Footer ────────────────────────────────────────────── */}
                    <View style={styles.footer}>
                        <View style={[styles.versionBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }]}>
                            <Ionicons name="code-slash" size={13} color={colors.textSecondary} />
                            <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version 1.0.0</Text>
                        </View>
                        <Text style={[styles.copyright, { color: colors.textSecondary }]}>© 2024 YDF. All rights reserved.</Text>
                    </View>
                </View>
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    /* Hero */
    heroWrap: {
        marginHorizontal: 16, marginTop: 16, marginBottom: 8,
        borderRadius: 28, overflow: "hidden",
        shadowColor: "#2563eb", shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
    },
    heroGradient: {
        paddingTop: 36, paddingBottom: 28, paddingHorizontal: 24,
        alignItems: "center",
    },
    blob1: {
        position: "absolute", width: 220, height: 220, borderRadius: 110,
        backgroundColor: "rgba(255,255,255,0.07)", top: -80, right: -60,
    },
    blob2: {
        position: "absolute", width: 140, height: 140, borderRadius: 70,
        backgroundColor: "rgba(255,255,255,0.07)", bottom: -50, left: -40,
    },

    avatarWrap: { position: "relative", marginBottom: 16 },
    avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: "#fff" },
    avatarFallback: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center", justifyContent: "center",
        borderWidth: 4, borderColor: "#fff",
    },
    avatarInitials: { fontSize: 36, fontWeight: "800", color: "#fff" },
    onlineBadge: {
        position: "absolute", bottom: 2, right: 2,
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: "#fff",
        alignItems: "center", justifyContent: "center",
        borderWidth: 3, borderColor: "#2563eb",
    },
    onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#10B981" },

    heroName: { fontSize: 24, fontWeight: "800", color: "#fff", marginBottom: 4, textAlign: "center" },
    heroUsername: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: "500", marginBottom: 8 },

    rolePill: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 14, paddingVertical: 6,
        borderRadius: 20, marginBottom: 10,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    },
    rolePillText: { fontSize: 12, fontWeight: "700", color: "#fff" },

    heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    heroMetaText: { fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "500" },

    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 7,
        marginTop: 10, paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 999, borderWidth: 1,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: "700" },

    statsStrip: {
        flexDirection: "row", alignItems: "center",
        marginTop: 20,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20,
        width: "100%",
    },
    statItem: { flex: 1, alignItems: "center" },
    statValue: { fontSize: 18, fontWeight: "800", color: "#fff" },
    statLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "600", marginTop: 2 },
    statDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.25)" },

    /* Layout */
    content: { paddingHorizontal: 16, paddingTop: 12 },
    section: { marginBottom: 20 },

    sectionHeaderRow: {
        flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12,
    },
    sectionIconWrap: {
        width: 30, height: 30, borderRadius: 10,
        alignItems: "center", justifyContent: "center",
    },
    sectionTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },

    /* Card */
    card: {
        borderRadius: 20, padding: 6, borderWidth: 1,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    },

    /* Info row */
    infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 12 },
    infoIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginRight: 14 },
    infoText: { flex: 1 },
    infoLabel: { fontSize: 11, fontWeight: "600", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.3 },
    infoValue: { fontSize: 15, fontWeight: "700" },

    /* Action item */
    actionItem: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16 },
    actionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginRight: 14 },
    actionLabel: { flex: 1, fontSize: 16, fontWeight: "600" },

    /* Footer */
    footer: { alignItems: "center", marginTop: 8, gap: 8 },
    versionBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    },
    versionText: { fontSize: 12, fontWeight: "600" },
    copyright: { fontSize: 12, fontWeight: "500" },
});
