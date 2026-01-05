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
                    router.replace("/(auth)/sign-in");
                },
            },
        ]);
    };

    const ActionItem = ({ icon, label, onPress, color, isLast, rightElement }: any) => (
        <TouchableOpacity
            style={[styles.actionItem, isLast && { borderBottomWidth: 0 }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.actionIconCircle, { backgroundColor: color + "15" }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
            {rightElement ? rightElement : (
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            )}
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
            <AppHeader title="Profile" onBack={() => router.back()} />

            <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}>

                {/* Identity Section */}
                <View style={[styles.identityCard, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                    <View style={styles.avatarRow}>
                        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                            <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>
                                {profile?.firstname?.charAt(0) || "T"}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.userName, { color: colors.text }]}>{profile?.fullname || "Mobilizer Name"}</Text>
                            <Text style={[styles.userRole, { color: colors.primary }]}>Student Mobilizer</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{profile?.email}</Text>
                        </View>
                    </View>
                </View>

                {/* Dashboard Grid (Restored Content) */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Dashboard</Text>
                <View style={styles.gridContainer}>
                    <TouchableOpacity
                        style={[styles.gridItem, { backgroundColor: isDark ? colors.card : "#fff" }]}
                        onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-students")}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.gridIcon, { backgroundColor: "#E3F2FD" }]}>
                            <Ionicons name="people" size={24} color="#2196F3" />
                        </View>
                        <Text style={[styles.gridLabel, { color: colors.text }]}>My Students</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.gridItem, { backgroundColor: isDark ? colors.card : "#fff" }]}
                        onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-applications")}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.gridIcon, { backgroundColor: "#FFF3E0" }]}>
                            <Ionicons name="documents" size={24} color="#FF9800" />
                        </View>
                        <Text style={[styles.gridLabel, { color: colors.text }]}>Applications</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.gridItem, { backgroundColor: isDark ? colors.card : "#fff" }]}
                        onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-scholarship-listing")}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.gridIcon, { backgroundColor: "#E8F5E9" }]}>
                            <Ionicons name="school" size={24} color="#4CAF50" />
                        </View>
                        <Text style={[styles.gridLabel, { color: colors.text }]}>Scholarships</Text>
                    </TouchableOpacity>
                </View>

                {/* Settings & Actions (Restored Content with New Design) */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings & Actions</Text>

                <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff", paddingVertical: 4 }]}>

                    <ActionItem
                        icon="create-outline"
                        label="Edit Profile"
                        color="#3B82F6"
                        onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-account")}
                    />

                    {/* Dark Mode Switch inside the list */}
                    <ActionItem
                        icon={isDark ? "moon-outline" : "sunny-outline"}
                        label="Dark Mode"
                        color={isDark ? "#A855F7" : "#F59E0B"}
                        onPress={toggleTheme}
                        rightElement={
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                trackColor={{ false: "#eee", true: colors.primary }}
                                style={{ transform: [{ scale: 0.8 }] }}
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

                {/* Version */}
                <Text style={{ textAlign: 'center', marginTop: 24, color: colors.textSecondary, fontSize: 12 }}>App Version 1.0.0</Text>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 24,
        marginBottom: 12,
        marginLeft: 4
    },
    card: {
        borderRadius: 20,
        paddingHorizontal: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    identityCard: {
        borderRadius: 20,
        padding: 20,
        marginTop: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2
    },
    userRole: {
        fontSize: 14,
        fontWeight: '500'
    },
    // Grid Items
    gridContainer: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'space-between'
    },
    gridItem: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    gridIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridLabel: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center'
    },
    // Action Items
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingHorizontal: 8,
    },
    actionIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    actionLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    }
});
