import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getNotifications, markAllNotificationsRead } from "@/utils/api";
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

    const renderItem = ({ item, index }: any) => {
        // Determine icon based on subject/message content if possible, else default
        let icon = "notifications-outline";
        let color = "#2196F3";

        const subject = (item.subject || "").toLowerCase();
        if (subject.includes("approve")) { icon = "checkmark-circle-outline"; color = "#4CAF50"; }
        else if (subject.includes("reject")) { icon = "close-circle-outline"; color = "#F44336"; }
        else if (subject.includes("document")) { icon = "document-text-outline"; color = "#FF9800"; }
        else if (subject.includes("deadline")) { icon = "time-outline"; color = "#E91E63"; }

        return (
            <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: index * 50 }}
                style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff", opacity: item.is_read ? 0.7 : 1 }]}
            >
                <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
                    <Ionicons name={icon as any} size={24} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={[styles.subject, { color: colors.text }]}>{item.subject}</Text>
                        <Text style={[styles.time, { color: colors.textSecondary }]}>{item.timeago || "Just now"}</Text>
                    </View>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>{item.smallmessage || item.message}</Text>
                </View>
                {!item.is_read && <View style={styles.dot} />}
            </MotiView>
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
