import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MobilizerProfileScreen() {
    const { isDark, toggleTheme, colors } = useTheme();
    const insets = useSafeAreaInsets();
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

    const ActionItem = ({ icon, label, onPress, color, isLast, rightElement }: any) => (
        <TouchableOpacity
            style={[
                styles.actionItem,
                { borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
                isLast && { borderBottomWidth: 0 }
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.actionIconCircle, { backgroundColor: color + "15" }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
            {rightElement ? rightElement : (
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? "#0f0f0f" : "#F8F9FA", justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#0f0f0f" : "#F8F9FA" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppHeader title="Profile" onBack={() => router.back()} />

            <ScrollView
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Enhanced Profile Header with Gradient */}
                <View style={styles.headerSection}>
                    <LinearGradient
                        colors={isDark ? ["#1e3a8a", "#3b82f6", "#60a5fa"] : ["#3b82f6", "#60a5fa", "#93c5fd"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientHeader}
                    >
                        {/* Decorative circles */}
                        <View style={[styles.decorativeCircle, { top: -40, right: -40, width: 120, height: 120 }]} />
                        <View style={[styles.decorativeCircle, { bottom: -30, left: -30, width: 100, height: 100 }]} />

                        <View style={styles.profileHeaderContent}>
                            <View style={styles.avatarContainer}>
                                <LinearGradient
                                    colors={["#fff", "#f0f9ff"]}
                                    style={styles.avatarGradient}
                                >
                                    <Text style={styles.avatarText}>
                                        {profile?.firstname?.charAt(0) || "M"}
                                    </Text>
                                </LinearGradient>
                                <View style={styles.onlineBadge}>
                                    <View style={styles.onlineDot} />
                                </View>
                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={styles.profileName}>{profile?.fullname || "Mobilizer Name"}</Text>
                                <View style={styles.roleBadge}>
                                    <Ionicons name="shield-checkmark" size={14} color="#fff" />
                                    <Text style={styles.roleText}>Student Mobilizer</Text>
                                </View>
                                <View style={styles.emailRow}>
                                    <Ionicons name="mail-outline" size={14} color="rgba(255,255,255,0.9)" />
                                    <Text style={styles.emailText}>{profile?.email}</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                <View style={{ paddingHorizontal: 20 }}>
                    {/* Quick Access List */}
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Access</Text>
                        <View style={[styles.sectionDivider, { backgroundColor: colors.primary + "30" }]} />
                    </View>

                    <View style={[styles.settingsCard, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                        <ActionItem
                            icon="people"
                            label="My Students"
                            color="#2196F3"
                            onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-students")}
                        />

                        <ActionItem
                            icon="documents"
                            label="Applications"
                            color="#FF9800"
                            onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-applications")}
                        />

                        <ActionItem
                            icon="school"
                            label="Scholarships"
                            color="#4CAF50"
                            isLast
                            onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-scholarship-listing")}
                        />
                    </View>

                    {/* Enhanced Settings Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings & Preferences</Text>
                        <View style={[styles.sectionDivider, { backgroundColor: colors.primary + "30" }]} />
                    </View>

                    <View style={[styles.settingsCard, { backgroundColor: isDark ? colors.card : "#fff" }]}>
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

                    {/* Enhanced Version Footer */}
                    <View style={styles.versionContainer}>
                        <View style={[styles.versionBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
                            <Ionicons name="code-slash" size={14} color={colors.textSecondary} />
                            <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version 1.0.0</Text>
                        </View>
                        <Text style={[styles.copyrightText, { color: colors.textSecondary }]}>
                            © 2024 YDF. All rights reserved.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerSection: {
        marginBottom: 24,
    },
    gradientHeader: {
        paddingTop: 32,
        paddingBottom: 40,
        paddingHorizontal: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    decorativeCircle: {
        position: 'absolute',
        borderRadius: 1000,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    profileHeaderContent: {
        alignItems: 'center',
        zIndex: 1,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.3)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '800',
        color: '#3b82f6',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#3b82f6',
    },
    onlineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
    },
    profileInfo: {
        alignItems: 'center',
    },
    profileName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        marginBottom: 8,
    },
    roleText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    emailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    emailText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
    },
    sectionHeader: {
        marginTop: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    sectionDivider: {
        height: 3,
        width: 40,
        borderRadius: 2,
    },
    gridContainer: {
        flexDirection: 'row',
        gap: 14,
        marginBottom: 8,
    },
    gridItem: {
        flex: 1,
        padding: 18,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    gridIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    gridLabel: {
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    settingsCard: {
        borderRadius: 24,
        paddingVertical: 8,
        paddingHorizontal: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
    },
    actionIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    versionContainer: {
        alignItems: 'center',
        marginTop: 32,
        gap: 8,
    },
    versionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    versionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    copyrightText: {
        fontSize: 12,
        fontWeight: '500',
    },
});
