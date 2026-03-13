import { AppHeader, SearchBar } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getMobilizerApplications } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { MotiView } from "moti";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    View
} from "react-native";

// Type definitions based on actual API response
interface Student {
    id: number;
    name: string;
    email: string;
}

interface Scholarship {
    id: number;
    name: string;
}

interface Application {
    id: number;
    student: Student;
    scholarship: Scholarship;
    status: string;
    applied_at: string;
    timecreated: string;
    timemodified: string;
}



export default function MobilizerApplicationsScreen() {
    const { isDark, colors } = useTheme();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchData = async () => {
        try {
            setLoading(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) return;
            const { token } = JSON.parse(authDataStr);

            // Fetch applications without complex filters, just get latest 100
            const appsResponse = await getMobilizerApplications(token, {
                page: 1,
                per_page: 100,
            });

            if (appsResponse.success && appsResponse.data) {
                const appsData = appsResponse.data.applications || [];
                setApplications(Array.isArray(appsData) ? appsData : []);
            } else {
                setApplications([]);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const getStatusConfig = (status: string) => {
        const statusLower = status?.toLowerCase() || "";
        switch (statusLower) {
            case "new":
                return { color: "#8B5CF6", bgColor: "#F3E8FF", icon: "sparkles" };
            case "approved":
                return { color: "#10B981", bgColor: "#ECFDF5", icon: "checkmark-circle" };
            case "pending":
                return { color: "#F59E0B", bgColor: "#FFFBEB", icon: "time" };
            case "submitted":
                return { color: "#3B82F6", bgColor: "#EFF6FF", icon: "send" };
            case "rejected":
                return { color: "#EF4444", bgColor: "#FEF2F2", icon: "close-circle" };
            case "in_progress":
                return { color: "#06B6D4", bgColor: "#ECFEFF", icon: "sync" };
            default:
                return { color: "#6B7280", bgColor: "#F3F4F6", icon: "help-circle" };
        }
    };

    const getStatusLabel = (status: string) => {
        if (!status) return "Unknown";
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
            hour12: true
        });
    };

    // Filter applications by search query
    const filteredApplications = useMemo(() => {
        if (!searchQuery.trim()) return applications;
        const query = searchQuery.toLowerCase();
        return applications.filter(app =>
            app.student.name.toLowerCase().includes(query) ||
            app.student.email.toLowerCase().includes(query) ||
            app.scholarship.name.toLowerCase().includes(query) ||
            app.status.toLowerCase().includes(query)
        );
    }, [applications, searchQuery]);

    const renderApplicationCard = ({ item, index }: { item: Application; index: number }) => {
        const statusConfig = getStatusConfig(item.status);

        return (
            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 400, delay: index * 50 }}
                style={{ marginBottom: 12 }}
            >
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            // Subtle shadow for pro feel
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isDark ? 0.2 : 0.05,
                            shadowRadius: 8,
                            elevation: 3,
                        }
                    ]}
                >
                    {/* Top Row: Student & Status */}
                    <View style={styles.cardHeader}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.studentInfo,
                                pressed && { opacity: 0.7 }
                            ]}
                            onPress={() => router.push({
                                pathname: "/(dashboard)/mobilizer/mobilizer-student-profile",
                                params: { studentId: item.student.id }
                            })}
                        >
                            <LinearGradient
                                colors={isDark ? ['#4c1d95', '#8b5cf6'] : ['#e0e7ff', '#c7d2fe']}
                                style={styles.avatar}
                            >
                                <Text style={[styles.avatarText, { color: isDark ? '#fff' : '#4338ca' }]}>
                                    {item.student.name.charAt(0).toUpperCase()}
                                </Text>
                            </LinearGradient>
                            <View style={styles.nameContainer}>
                                <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>
                                    {item.student.name}
                                </Text>
                                <Text style={[styles.studentEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {item.student.email}
                                </Text>
                            </View>
                        </Pressable>

                        <View style={[styles.statusBadge, {
                            backgroundColor: isDark ? `${statusConfig.color}20` : statusConfig.bgColor,
                            borderColor: isDark ? `${statusConfig.color}40` : 'transparent',
                            borderWidth: isDark ? 1 : 0
                        }]}>
                            <Ionicons name={statusConfig.icon as any} size={10} color={statusConfig.color} />
                            <Text style={[styles.statusText, { color: statusConfig.color }]}>
                                {getStatusLabel(item.status)}
                            </Text>
                        </View>
                    </View>

                    {/* Middle: Scholarship Link */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.scholarshipContainer,
                            {
                                backgroundColor: isDark ? `${colors.primary}10` : '#F9FAFB',
                                borderColor: isDark ? `${colors.primary}20` : '#E5E7EB'
                            },
                            pressed && { opacity: 0.8, backgroundColor: isDark ? `${colors.primary}20` : '#F3F4F6' }
                        ]}
                    // onPress={() => router.push({
                    //     pathname: "/(dashboard)/mobilizer/mobilizer-scholarship-details",
                    //     params: { scholarshipId: item.scholarship.id }
                    // })}
                    >
                        <View style={styles.scholarshipIconBox}>
                            <Ionicons name="school" size={16} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.scholarshipLabel, { color: colors.textSecondary }]}>Applying for</Text>
                            <Text style={[styles.scholarshipName, { color: colors.text }]} numberOfLines={1}>
                                {item.scholarship.name}
                            </Text>
                        </View>
                        {/* <Ionicons name="arrow-forward" size={16} color={colors.primary} /> */}
                    </Pressable>

                    {/* Bottom: Date & Footer */}
                    <View style={styles.cardFooter}>
                        <View style={styles.dateContainer}>
                            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                                {formatDate(item.applied_at)}
                            </Text>
                        </View>
                        <Text style={[styles.appIdText, { color: colors.textSecondary }]}>#{item.id}</Text>
                    </View>
                </View>
            </MotiView>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#0A0A0A" : "#F5F7FA" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Background Gradient */}
            <LinearGradient
                colors={isDark ? ["#0A0A0A", "#121212", "#1A1A1A"] : ["#FFFFFF", "#F5F7FA", "#E8EBF0"]}
                style={StyleSheet.absoluteFill}
                locations={[0, 0.5, 1]}
            />

            <AppHeader title="Applications" onBack={() => router.back()} />

            <View style={styles.content}>
                <View style={styles.searchSection}>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search student or scholarship..."
                        onClear={() => setSearchQuery("")}
                    />
                </View>

                {loading && !refreshing && applications.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredApplications}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderApplicationCard}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[colors.primary]}
                                tintColor={colors.primary}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}>
                                    <Ionicons name="documents-outline" size={40} color={colors.textSecondary} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Applications Found</Text>
                                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                                    {searchQuery ? "Try adjusting your search query." : "Applications received will appear here."}
                                </Text>
                            </View>
                        }
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1 },
    searchSection: {
        marginBottom: 10,
    },
    listContent: {
        paddingBottom: 40,
        paddingHorizontal: 16,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
        gap: 8,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Card Styles
    card: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    studentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
    },
    nameContainer: {
        flex: 1,
    },
    studentName: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    studentEmail: {
        fontSize: 12,
        opacity: 0.8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 3,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    scholarshipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 12,
        gap: 10,
    },
    scholarshipIconBox: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scholarshipLabel: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    scholarshipName: {
        fontSize: 13,
        fontWeight: '600',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '500',
    },
    appIdText: {
        fontSize: 11,
        fontWeight: '500',
        opacity: 0.5,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        maxWidth: 250,
    },
});
