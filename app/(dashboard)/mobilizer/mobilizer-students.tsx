import { AppHeader, SearchBar } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getMobilizerStudents } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function MobilizerStudentsScreen() {
    const { isDark, colors } = useTheme();
    const [searchQuery, setSearchQuery] = useState("");
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pagination, setPagination] = useState<any>(null);

    // Filter students based on search query
    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students;

        const query = searchQuery.toLowerCase();
        return students.filter((student) => {
            const fullname = (student.fullname || "").toLowerCase();
            const email = (student.email || "").toLowerCase();
            const phone = (student.phone1 || "").toLowerCase();
            const institution = (student.institution || "").toLowerCase();
            const city = (student.city || "").toLowerCase();

            return (
                fullname.includes(query) ||
                email.includes(query) ||
                phone.includes(query) ||
                institution.includes(query) ||
                city.includes(query)
            );
        });
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
                setPagination(response.data.pagination);
            } else {
                setStudents([]);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchStudents();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchStudents();
    };

    const getInitials = (firstname?: string, lastname?: string) => {
        const first = (firstname || "S").charAt(0).toUpperCase();
        const last = (lastname || "").charAt(0).toUpperCase();
        return last ? `${first}${last}` : first;
    };

    const getAvatarColor = (id: number) => {
        const colors = [
            "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
            "#98D8C8", "#6C5CE7", "#A29BFE", "#FD79A8",
            "#FDCB6E", "#00B894", "#0984E3", "#E17055"
        ];
        return colors[id % colors.length];
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();

        // Reset time to midnight for accurate day comparison
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const diffTime = nowOnly.getTime() - dateOnly.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const renderStudentCard = ({ item, index }: { item: any; index: number }) => {
        const avatarColor = getAvatarColor(item.id);
        const initials = getInitials(item.firstname, item.lastname);

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                    router.push({
                        pathname: "/(dashboard)/mobilizer/mobilizer-student-profile",
                        params: { studentId: item.id }
                    });
                }}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={isDark ? ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)'] : ['rgba(0,0,0,0.01)', 'rgba(0,0,0,0.02)']}
                    style={styles.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                <View style={styles.cardContent}>
                    {/* Header Section */}
                    <View style={styles.cardHeader}>
                        <View style={styles.avatarSection}>
                            <LinearGradient
                                colors={[avatarColor, `${avatarColor}CC`]}
                                style={styles.avatar}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.avatarText}>{initials}</Text>
                            </LinearGradient>
                            <View style={styles.studentInfo}>
                                <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>
                                    {item.fullname || `${item.firstname} ${item.lastname}`}
                                </Text>
                                <View style={styles.metaRow}>
                                    <Ionicons name="mail-outline" size={12} color={colors.textSecondary} />
                                    <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                                        {item.email}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.15)' : '#E8F5E9' }]}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>Active</Text>
                        </View>
                    </View>

                    {/* Details Grid */}
                    <View style={[styles.detailsGrid, { borderTopColor: colors.border }]}>
                        <View style={styles.detailItem}>
                            <View style={[styles.detailIconContainer, { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.1)' : '#E3F2FD' }]}>
                                <Ionicons name="school-outline" size={16} color="#2196F3" />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Institution</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                                    {item.institution || "Not specified"}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.detailItem}>
                            <View style={[styles.detailIconContainer, { backgroundColor: isDark ? 'rgba(156, 39, 176, 0.1)' : '#F3E5F5' }]}>
                                <Ionicons name="location-outline" size={16} color="#9C27B0" />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                                    {item.city || "Not specified"}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.detailItem}>
                            <View style={[styles.detailIconContainer, { backgroundColor: isDark ? 'rgba(255, 152, 0, 0.1)' : '#FFF3E0' }]}>
                                <Ionicons name="call-outline" size={16} color="#FF9800" />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Phone</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                                    {item.phone1 || "Not provided"}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.detailItem}>
                            <View style={[styles.detailIconContainer, { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.1)' : '#E8F5E9' }]}>
                                <Ionicons name="document-text-outline" size={16} color="#4CAF50" />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Applications</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {item.applications_count || 0}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Footer Section */}
                    <View style={styles.cardFooter}>
                        <View style={styles.joinedInfo}>
                            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                            <Text style={[styles.joinedText, { color: colors.textSecondary }]}>
                                Joined {formatDate(item.created_at)}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.viewProfileBtn, { backgroundColor: colors.primary }]}
                            onPress={() => {
                                router.push({
                                    pathname: "/(dashboard)/mobilizer/mobilizer-student-profile",
                                    params: { studentId: item.id }
                                });
                            }}
                        >
                            <Text style={styles.viewProfileText}>View Profile</Text>
                            <Ionicons name="arrow-forward" size={14} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#f5f5f5" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <LinearGradient
                colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#FFF8E1"]}
                style={styles.background}
                locations={[0, 0.4, 1]}
            />

            <AppHeader title="My Students" onBack={() => router.back()} />

            <View style={styles.headerSection}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search students..."
                    onClear={() => setSearchQuery("")}
                />
                {pagination && (
                    <View style={styles.statsRow}>
                        <View style={[styles.statChip, { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.1)' : '#E3F2FD' }]}>
                            <Ionicons name="people" size={16} color="#2196F3" />
                            <Text style={[styles.statText, { color: colors.text }]}>
                                {pagination.total} {pagination.total === 1 ? 'Student' : 'Students'}
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading students...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredStudents}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderStudentCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }]}>
                                <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Students Found</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                                {searchQuery ? "Try adjusting your search" : "Add students to get started"}
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
    headerSection: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    statText: {
        fontSize: 13,
        fontWeight: '600',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    card: {
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    cardGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    cardContent: {
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    avatarSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    studentInfo: {
        flex: 1,
        gap: 4,
    },
    studentName: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 13,
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4CAF50',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4CAF50',
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        marginBottom: 16,
    },
    detailItem: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    detailIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailContent: {
        flex: 1,
        gap: 2,
    },
    detailLabel: {
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    joinedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    joinedText: {
        fontSize: 12,
        fontWeight: '500',
    },
    viewProfileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    viewProfileText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
