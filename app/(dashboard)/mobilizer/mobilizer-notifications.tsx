import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { MotiView } from "moti";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

export default function MobilizerNotificationsScreen() {
    const { isDark, colors } = useTheme();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async () => {
        try {
            if (!refreshing) setLoading(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (authDataStr) {
                const authData = JSON.parse(authDataStr);
                // Using "Studentmobilizer" or normalized role logic if needed, 
                // but typically API infers from token or we just get user notifications.
                const response = await getNotifications(authData.token);
                if (response.success) {
                    const raw = response.data?.data || response.data?.notifications || [];
                    setNotifications(raw);
                } else {
                    // Fallback/Empty
                    setNotifications([]);
                }
            }
        } catch (e) {
            console.error(e);
            setNotifications([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const handleMarkAllRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

        try {
            const authDataStr = await AsyncStorage.getItem("authData");
            if (authDataStr) {
                const authData = JSON.parse(authDataStr);
                await markAllNotificationsRead(authData.token);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleMarkRead = async (notificationId: number) => {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
        try {
            const authDataStr = await AsyncStorage.getItem("authData");
            if (authDataStr) {
                const authData = JSON.parse(authDataStr);
                await markNotificationRead(authData.token, notificationId);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const renderItem = ({ item, index }: any) => {
        let icon = "notifications-sharp";
        let color = "#3B82F6";

        const subject = (item.subject || "").toLowerCase();
        const eventType = item.event_type;

        if (subject.includes("approve") || eventType === "enrolcoursewelcomemessage") { 
            icon = "checkmark-circle"; color = "#10B981"; 
        } else if (subject.includes("reject")) { 
            icon = "close-circle"; color = "#EF4444"; 
        } else if (subject.includes("document") || eventType === "assign_due_soon") { 
            icon = "document-text"; color = "#FF9800"; 
        } else if (eventType === "newlogin") { 
            icon = "shield-checkmark"; color = "#F59E0B"; 
        }

        const isRead = item.is_read;

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => !isRead && handleMarkRead(item.id)}
            >
                <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ delay: index * 50 }}
                    style={[styles.card, { 
                        backgroundColor: isDark ? colors.card : '#fff', 
                        borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#eee',
                        opacity: isRead ? 0.65 : 1 
                    }]}
                >
                    <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
                        <Ionicons name={icon as any} size={20} color={color} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.subject, { color: colors.text, fontWeight: isRead ? '600' : '700', fontSize: 14 }]} numberOfLines={2}>{item.subject}</Text>
                        <Text style={[styles.message, { color: colors.textSecondary, fontSize: 12 }]} numberOfLines={3}>{item.message}</Text>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.time, { color: colors.textSecondary }]}>{item.created_at || "Just now"}</Text>
                        </View>
                    </View>
                    {!isRead && <View style={[styles.dot, { backgroundColor: color }]} />}
                </MotiView>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f5f5f5" }]}>
            <AppHeader title="Notifications" onBack={() => router.back()} />

            <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleMarkAllRead}>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Mark all as read</Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => String(item.id || index)}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="notifications-off-outline" size={64} color={colors.textSecondary} />
                            <Text style={{ color: colors.textSecondary, marginTop: 16 }}>No notifications yet</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerActions: { alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 8 },
    card: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'flex-start',
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subject: {
        fontSize: 15,
        fontWeight: '700',
        flex: 1,
        marginRight: 8
    },
    time: {
        fontSize: 11,
    },
    message: {
        fontSize: 13,
        marginTop: 4,
        lineHeight: 18,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2196F3',
        marginTop: 6
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
