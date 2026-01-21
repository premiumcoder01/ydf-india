import { AppHeader, Button } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getMobilizerStudentProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MobilizerStudentProfileScreen() {
    const { isDark, colors } = useTheme();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const studentId = params.studentId ? Number(params.studentId) : 0;

    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStudentProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) {
                setError("Authentication required");
                setLoading(false);
                return;
            }

            const { token } = JSON.parse(authDataStr);
            const response = await getMobilizerStudentProfile(token, studentId);

            console.log("Student Profile Response:", JSON.stringify(response, null, 2));

            if (response.success && response.data) {
                // Extract student from nested structure
                const studentData = response.data.student || response.data;

                // Parse custom_fields if it's a JSON string
                if (studentData.custom_fields && typeof studentData.custom_fields === 'string') {
                    try {
                        studentData.parsed_custom_fields = JSON.parse(studentData.custom_fields);
                    } catch (e) {
                        console.error("Error parsing custom fields:", e);
                        studentData.parsed_custom_fields = {};
                    }
                }

                setStudent(studentData);
            } else {
                setError(response.error || response.message || "Failed to load student profile");
            }
        } catch (err: any) {
            console.error("Error fetching student profile:", err);
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (studentId) {
                fetchStudentProfile();
            }
        }, [studentId])
    );

    const StatItem = ({ label, value, color }: any) => (
        <View style={[styles.statItem, { backgroundColor: isDark ? colors.card : "#fff" }]}>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
    );

    const InfoRow = ({ icon, label, value }: any) => (
        <View style={[styles.infoRow, { borderBottomColor: isDark ? colors.border : "#f0f0f0" }]}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }]}>
                <Ionicons name={icon} size={18} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{value || "N/A"}</Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f5f5f5" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppHeader title="Student Profile" onBack={() => router.back()} />

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading student profile...</Text>
                </View>
            ) : error ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
                    <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                    <Button title="Retry" onPress={fetchStudentProfile} style={{ marginTop: 16 }} />
                </View>
            ) : !student ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="person-outline" size={64} color={colors.textSecondary} />
                    <Text style={[styles.errorText, { color: colors.text }]}>Student not found</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                    {/* Profile Header */}
                    <View style={[styles.card, styles.headerCard, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                        <View style={styles.avatarContainer}>
                            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                                <Text style={{ fontSize: 36, fontWeight: '700', color: '#fff' }}>
                                    {(student.fullname || student.firstname || "S").charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: '#E8F5E9' }]}>
                                <Text style={{ color: '#4CAF50', fontSize: 12, fontWeight: '700' }}>ACTIVE</Text>
                            </View>
                        </View>

                        <Text style={[styles.name, { color: colors.text }]}>
                            {student.fullname || `${student.firstname || ""} ${student.lastname || ""}`.trim()}
                        </Text>
                        <Text style={[styles.idText, { color: colors.textSecondary }]}>
                            ID: {student.id} • {student.institution || "N/A"}
                        </Text>

                        <View style={styles.statsRow}>
                            <StatItem
                                label="Total"
                                value={student.applications_summary?.total || 0}
                                color="#2196F3"
                            />
                            <StatItem
                                label="Approved"
                                value={student.applications_summary?.approved || 0}
                                color="#4CAF50"
                            />
                            <StatItem
                                label="In Progress"
                                value={student.applications_summary?.in_progress || 0}
                                color="#FF9800"
                            />
                            <StatItem
                                label="Rejected"
                                value={student.applications_summary?.rejected || 0}
                                color="#F44336"
                            />
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.quickActions}>
                        <Button
                            onPress={() => router.push({ pathname: "/(dashboard)/mobilizer/mobilizer-scholarship-listing", params: { forStudentId: student.id } })}
                            variant="primary"
                            style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                        >
                            <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Apply for Scholarship</Text>
                        </Button>
                    </View>

                    {/* Personal Details */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
                        <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                            <InfoRow icon="mail-outline" label="Email" value={student.email} />
                            <InfoRow icon="call-outline" label="Phone" value={student.phone1 || student.phone} />
                            <InfoRow icon="location-outline" label="City" value={student.city} />
                            <InfoRow icon="globe-outline" label="Country" value={student.country} />
                        </View>
                    </View>

                    {/* Academic Details */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Academic Details</Text>
                        <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                            <InfoRow icon="school-outline" label="Institution" value={student.institution} />
                            <InfoRow icon="book-outline" label="Academic Level" value={student.academic_level} />
                            <InfoRow icon="calendar-outline" label="Joined" value={student.created_at ? new Date(student.created_at).toLocaleDateString() : "N/A"} />
                        </View>
                    </View>

                    {/* Custom Fields (if any) */}
                    {student.parsed_custom_fields && Object.keys(student.parsed_custom_fields).length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Information</Text>
                            <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                                {Object.entries(student.parsed_custom_fields)
                                    .filter(([key, value]) => value && value !== "" && value !== "0")
                                    .map(([key, value], idx) => (
                                        <InfoRow
                                            key={idx}
                                            icon="information-circle-outline"
                                            label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            value={String(value)}
                                        />
                                    ))}
                            </View>
                        </View>
                    )}

                    {/* Recent Applications (if any) */}
                    {student.recent_applications && student.recent_applications.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Applications</Text>
                            <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                                {student.recent_applications.map((app: any, idx: number) => (
                                    <View key={idx} style={[styles.docItem, { borderBottomWidth: idx === student.recent_applications.length - 1 ? 0 : 1, borderBottomColor: isDark ? colors.border : '#f0f0f0' }]}>
                                        <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={[styles.docName, { color: colors.text }]}>{app.scholarship_name || app.name}</Text>
                                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                                {app.status || "Pending"}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        gap: 16,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 12,
    },
    errorText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        textAlign: 'center',
    },
    card: {
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 8,
        overflow: 'hidden',
    },
    headerCard: {
        margin: 16,
        padding: 24,
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBadge: {
        position: 'absolute',
        bottom: -6,
        alignSelf: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#fff',
    },
    name: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 4,
        textAlign: 'center',
    },
    idText: {
        fontSize: 14,
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        width: '100%',
    },
    statItem: {
        width: '48%',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 24,
        gap: 12,
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        marginLeft: 4,
    },
    infoRow: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '500',
    },
    docItem: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    docName: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
});
