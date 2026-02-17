import { AppHeader, SearchBar } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getMobilizerStudents } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
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

        let customFields: any = {};
        try {
            if (typeof item.custom_fields === 'string') {
                customFields = JSON.parse(item.custom_fields);
            } else if (typeof item.custom_fields === 'object') {
                customFields = item.custom_fields;
            }
        } catch (e) {
            console.log("Error parsing custom fields", e);
        }

        const course = customFields?.course || customFields?.stream_in_12th || item.academic_level || "N/A";
        // Ensure phone doesn't just display "IN" or weird data if phone1 is bad
        const phone = (item.phone1 && item.phone1.length > 5) ? item.phone1 : (customFields?.phone_number || "N/A");
        const gender = customFields?.Gender || "Student";
        const location = item.city || customFields?.district || "N/A";
        const applicationStatus = customFields?.appl_status || "Not Applied";
        const category = customFields?.Category || customFields?.category;

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                    router.push({
                        pathname: "/(dashboard)/mobilizer/mobilizer-student-profile",
                        params: { studentId: item.id }
                    });
                }}
                activeOpacity={0.9}
            >
                <View style={styles.cardHeader}>
                    {item.picture && !item.picture.includes("gravatar.com/avatar/default") ? (
                        <Image
                            source={{ uri: item.picture }}
                            style={styles.avatarImage}
                            contentFit="cover"
                            transition={500}
                        />
                    ) : (
                        <View style={[styles.avatarContainer, { backgroundColor: avatarColor }]}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                    )}

                    <View style={styles.headerInfo}>
                        <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>
                            {item.fullname || `${item.firstname} ${item.lastname}`}
                        </Text>
                        <Text style={[styles.studentEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.email}
                        </Text>
                        <View style={styles.badgesRow}>
                            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.2)' : '#E3F2FD' }]}>
                                <Text style={[styles.badgeText, { color: '#2196F3' }]}>{gender}</Text>
                            </View>
                            {category && (
                                <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255, 152, 0, 0.2)' : '#FFF3E0' }]}>
                                    <Text style={[styles.badgeText, { color: '#FF9800' }]}>{category}</Text>
                                </View>
                            )}
                            <View style={[
                                styles.badge,
                                {
                                    backgroundColor: applicationStatus === "Applied"
                                        ? (isDark ? 'rgba(76, 175, 80, 0.2)' : '#E8F5E9')
                                        : (isDark ? 'rgba(158, 158, 158, 0.2)' : '#F5F5F5')
                                }
                            ]}>
                                <Text style={[
                                    styles.badgeText,
                                    {
                                        color: applicationStatus === "Applied" ? '#4CAF50' : '#9E9E9E'
                                    }
                                ]}>{applicationStatus}</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.arrowButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}
                        onPress={() => {
                            router.push({
                                pathname: "/(dashboard)/mobilizer/mobilizer-student-profile",
                                params: { studentId: item.id }
                            });
                        }}
                    >
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Ionicons name="school-outline" size={16} color={colors.textSecondary} style={styles.infoIcon} />
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Course</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{course}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Ionicons name="call-outline" size={16} color={colors.textSecondary} style={styles.infoIcon} />
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{phone}</Text>
                        </View>
                    </View>

                    <View style={[styles.infoRow, { marginTop: 12 }]}>
                        <View style={styles.infoItem}>
                            <Ionicons name="location-outline" size={16} color={colors.textSecondary} style={styles.infoIcon} />
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>City</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{location}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} style={styles.infoIcon} />
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Applications</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>{item.applications_count || 0}</Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.cardFooter, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fafafa', borderTopColor: colors.border }]}>
                    <Text style={[styles.joinedText, { color: colors.textSecondary }]}>
                        Joined {formatDate(item.created_at)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
                        <Text style={[styles.statusLabel, { color: '#4CAF50' }]}>Active</Text>
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

            <AppHeader
                title="My Students"
                onBack={() => router.back()}
                rightElement={
                    <TouchableOpacity onPress={() => router.push("/(dashboard)/mobilizer/mobilizer-add-student")}>
                        <Ionicons name="add-circle" size={32} color={colors.primary} />
                    </TouchableOpacity>
                }
            />

            <View style={styles.headerSection}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search students..."
                    onClear={() => setSearchQuery("")}
                />
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
        // paddingBottom: 12,
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
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
        overflow: 'hidden'
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    avatarContainer: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 3,
    },
    avatarImage: {
        width: 54,
        height: 54,
        borderRadius: 27,
        marginRight: 14,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerInfo: {
        flex: 1,
        gap: 4,
    },
    studentName: {
        fontSize: 17,
        fontWeight: '700',
    },
    studentEmail: {
        fontSize: 13,
    },
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    arrowButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    divider: {
        height: 1,
        width: '100%',
        opacity: 0.5,
    },
    cardBody: {
        padding: 16,
        paddingTop: 12,
        paddingBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoIcon: {
        opacity: 0.7,
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: '500',
        width: 50,
        display: 'none' // Hidden for cleaner look, icons serve as labels
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    joinedText: {
        fontSize: 12,
        fontWeight: '500',
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        paddingHorizontal: 20,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
});
