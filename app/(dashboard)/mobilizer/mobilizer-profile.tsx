import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from "react-native";

export default function MobilizerProfileScreen() {
    const { isDark, toggleTheme, colors } = useTheme();
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
                    // Assuming /sign-in is the correct route, typically one navigates to root or (auth)
                    router.replace("/(auth)/sign-in");
                },
            },
        ]);
    };

    const MenuItem = ({ icon, label, onPress, color = colors.text, dest }: any) => (
        <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: isDark ? colors.card : "#fff" }]}
            onPress={onPress || (() => dest && router.push(dest))}
        >
            <View style={[styles.menuIconBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }]}>
                <Ionicons name={icon} size={20} color={isDark ? colors.text : "#555"} />
            </View>
            <Text style={[styles.menuLabel, { color: color }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f5f5f5", justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f5f5f5" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppHeader title="My Profile" onBack={() => router.back()} />

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                            <Text style={{ fontSize: 32, fontWeight: '700', color: '#fff' }}>
                                {profile?.firstname?.charAt(0) || "T"}
                            </Text>
                        </View>
                        <View style={styles.editBadge}>
                            <Ionicons name="pencil" size={12} color="#fff" />
                        </View>
                    </View>
                    <Text style={[styles.userName, { color: colors.text }]}>{profile?.fullname || "Mobilizer Name"}</Text>
                    <Text style={[styles.userRole, { color: colors.primary }]}>Student Mobilizer / Teacher</Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{profile?.email}</Text>
                </View>

                {/* Quick Access Grid */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Quick Actions</Text>
                <View style={styles.gridContainer}>
                    <TouchableOpacity
                        style={[styles.gridItem, { backgroundColor: isDark ? colors.card : "#fff" }]}
                        onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-students")}
                    >
                        <Ionicons name="people" size={28} color="#2196F3" />
                        <Text style={[styles.gridLabel, { color: colors.text }]}>My Students</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.gridItem, { backgroundColor: isDark ? colors.card : "#fff" }]}
                        onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-applications")}
                    >
                        <Ionicons name="documents" size={28} color="#FF9800" />
                        <Text style={[styles.gridLabel, { color: colors.text }]}>Applications</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.gridItem, { backgroundColor: isDark ? colors.card : "#fff" }]}
                        onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-scholarship-listing")}
                    >
                        <Ionicons name="school" size={28} color="#4CAF50" />
                        <Text style={[styles.gridLabel, { color: colors.text }]}>Scholarships</Text>
                    </TouchableOpacity>
                </View>

                {/* Settings Section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Settings</Text>
                <View style={styles.menuContainer}>
                    <View style={[styles.menuItem, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                        <View style={[styles.menuIconBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }]}>
                            <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={isDark ? colors.text : "#555"} />
                        </View>
                        <Text style={[styles.menuLabel, { color: colors.text }]}>Dark Mode</Text>
                        <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: "#eee", true: colors.primary }} />
                    </View>

                    <MenuItem icon="person-outline" label="Account Details" dest="/(dashboard)/mobilizer/mobilizer-account" />
                    <MenuItem icon="lock-closed-outline" label="Privacy & Security" dest="/(dashboard)/mobilizer/mobilizer-privacy" />
                    <MenuItem icon="help-circle-outline" label="Help & Support" dest="/(dashboard)/mobilizer/mobilizer-help" />
                    <MenuItem icon="information-circle-outline" label="About App" dest="/(dashboard)/mobilizer/mobilizer-about" />
                </View>

                <TouchableOpacity style={[styles.logoutBtn, { borderColor: "#F44336" }]} onPress={handleLogout}>
                    <Text style={{ color: "#F44336", fontWeight: "700" }}>Log Out</Text>
                </TouchableOpacity>

                <Text style={{ textAlign: 'center', marginTop: 20, color: colors.textSecondary, fontSize: 12 }}>Version 1.0.0</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    profileCard: {
        margin: 16,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    avatarContainer: { position: 'relative', marginBottom: 16 },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#2196F3',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    userName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
    userRole: { fontSize: 14, fontWeight: '600' },
    sectionTitle: { marginLeft: 20, marginBottom: 10, marginTop: 10, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
    gridContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 10 },
    gridItem: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 100,
    },
    gridLabel: { fontSize: 12, fontWeight: '600' },
    menuContainer: { paddingHorizontal: 16, gap: 12 },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
    },
    menuIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
    logoutBtn: {
        margin: 20,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
