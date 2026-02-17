import { AppHeader, Button } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getMobilizerStudentProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Helper for safe JSON parsing
const safeParse = (jsonString: string | object) => {
    if (typeof jsonString === 'object') return jsonString;
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        return {};
    }
};

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

            if (response.success && response.data) {
                const studentData = response.data.student || response.data;
                // Parse custom_fields immediately
                if (studentData.custom_fields) {
                    studentData.parsed_custom_fields = safeParse(studentData.custom_fields);
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

    // Call Actions
    const handleCall = (number: string) => {
        if (number) Linking.openURL(`tel:${number}`);
    };

    const handleEmail = (email: string) => {
        if (email) Linking.openURL(`mailto:${email}`);
    };

    // Organized Data Sections
    const studentDetails = useMemo(() => {
        if (!student) return null;
        const cf = student.parsed_custom_fields || {};
        const ad = student.academic_details?.[0] || {};

        return {
            personal: [
                { label: "Gender", value: cf.Gender, icon: "person-outline" },
                { label: "Date of Birth", value: cf.DOB !== "0" && cf.DOB !== 0 ? cf.DOB : null, icon: "calendar-outline" },
                { label: "Category", value: cf.Category || cf.category, icon: "bookmark-outline" },
                { label: "Religion", value: cf.Religion, icon: "moon-outline" },
                { label: "Caste", value: cf.Caste, icon: "people-outline" },
                { label: "Father's Name", value: cf.father, icon: "male-outline" },
                { label: "Mother's Name", value: cf.mother, icon: "female-outline" },
                { label: "Family Income", value: cf.Family_income, icon: "cash-outline" },
            ],
            contact: [
                { label: "Phone", value: student.phone1 || cf.phone_number, icon: "call-outline", action: () => handleCall(student.phone1 || cf.phone_number), isLink: true, actionIcon: "call" },
                { label: "Email", value: student.email, icon: "mail-outline", action: () => handleEmail(student.email), isLink: true, actionIcon: "mail" },
                { label: "City", value: student.city || cf.city, icon: "location-outline" },
                { label: "District", value: cf.district || cf.domicile_district || cf.College_District, icon: "map-outline" },
                { label: "State", value: cf.State || "India", icon: "earth-outline" },
                { label: "Village", value: cf.Village, icon: "home-outline" },
            ],
            education_current: [
                { label: "Course", value: ad.course_name || cf.course || "N/A", icon: "school-outline" },
                { label: "Major/Stream", value: ad.major || cf.stream_in_12th, icon: "flask-outline" },
                { label: "Institute", value: student.institution || ad.institution || cf.college_name || cf.university, icon: "business-outline" },
                { label: "CGPA", value: ad.cgpa, icon: "star-outline" },
                { label: "Percentage", value: ad.percentage || cf.percentage_12, icon: "pie-chart-outline" },
                { label: "Session", value: cf.session, icon: "time-outline" },
                { label: "Current Year", value: cf.year_of_course || ad.academic_year, icon: "calendar-number-outline" },
                { label: "Graduation Year", value: ad.graduation_year, icon: "school-outline" },
                { label: "Fees", value: cf.fees, icon: "wallet-outline" },
            ],
            education_history: [
                { label: "12th Board", value: cf['12th_board'] || cf['12th'], icon: "library-outline" },
                { label: "Stream", value: cf.stream_in_12th, icon: "flask-outline" },
                { label: "Passing Year", value: cf['12th_passing_year'], icon: "calendar-outline" },
                { label: "Percentage", value: cf.percentage_12, icon: "pie-chart-outline" },
                { label: "10th Board", value: cf.passing_10th || cf['10th'], icon: "book-outline" },
            ],
            documents: [
                { label: "Aadhar", value: cf.aachar_card_number, icon: "card-outline" },
                { label: "Name in Aadhar", value: cf.name_in_aadhar_card, icon: "person-circle-outline" },
                { label: "Income Cert.", value: cf.income_in_income_certificate ? `₹${cf.income_in_income_certificate}` : null, icon: "document-text-outline" },
                { label: "Income Cert. Date", value: cf.issue_date_of_income_certificate, icon: "calendar-outline" },
                { label: "Reg. As", value: cf.Registering_as, icon: "information-circle-outline" },
            ]
        };
    }, [student]);

    const InfoCard = ({ title, data }: { title: string, data: any[] }) => {
        const validData = data.filter(item => item.value && item.value !== "" && item.value !== "0" && item.value !== 0);
        if (validData.length === 0) return null;

        return (
            <View style={[styles.cardContainer, { backgroundColor: isDark ? colors.card : "#fff", borderColor: colors.border }]}>
                <View style={[styles.cardHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0' }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
                </View>
                <View style={styles.cardContent}>
                    {validData.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.infoRow,
                                index === validData.length - 1 && styles.lastInfoRow,
                                { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0' }
                            ]}
                            onPress={item.action}
                            disabled={!item.action}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F7FA' }]}>
                                <Ionicons name={item.icon} size={18} color={colors.textSecondary} />
                            </View>
                            <View style={styles.infoTextBox}>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>
                                    {item.value}
                                </Text>
                            </View>
                            {item.isLink && (
                                <View style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.15)' : '#E3F2FD' }]}>
                                    <Ionicons name={item.actionIcon || "chevron-forward"} size={14} color={colors.primary} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    const StatBox = ({ label, value, color, icon }: any) => (
        <View style={[styles.statBox, { backgroundColor: isDark ? colors.card : "#fff", borderColor: colors.border }]}>
            <View style={[styles.statIconCircle, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <View>
                <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
            </View>
        </View>
    );

    const ApplicationsList = ({ applications }: { applications: any[] }) => {
        if (!applications || applications.length === 0) return null;

        return (
            <View style={styles.sectionWrapper}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Recent Applications</Text>
                <View style={[styles.cardContainer, { backgroundColor: isDark ? colors.card : "#fff", borderColor: colors.border }]}>
                    {applications.map((app, index) => {
                        const scholarshipName = app.scholarship?.name || "Unknown Scholarship";
                        const statusColor = app.status === 'approved' ? '#4CAF50' :
                            app.status === 'rejected' ? '#F44336' : '#FF9800';
                        const statusBg = app.status === 'approved' ? 'rgba(76, 175, 80, 0.1)' :
                            app.status === 'rejected' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(255, 152, 0, 0.1)';

                        return (
                            <View
                                key={app.id}
                                style={[
                                    styles.infoRow,
                                    index === applications.length - 1 && styles.lastInfoRow,
                                    { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0' }
                                ]}
                            >
                                <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F7FA' }]}>
                                    <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
                                </View>
                                <View style={styles.infoTextBox}>
                                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                                        {new Date(app.created_at).toLocaleDateString()}
                                    </Text>
                                    <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                                        {scholarshipName}
                                    </Text>
                                </View>
                                <View style={{
                                    backgroundColor: statusBg,
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 4
                                }}>
                                    <Text style={{
                                        color: statusColor,
                                        fontSize: 10,
                                        fontWeight: '600',
                                        textTransform: 'uppercase'
                                    }}>{app.status}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#F8F9FA" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <LinearGradient
                colors={isDark ? ["#121212", "#1e1e1e"] : ["#fff", "#FFF8E1"]}
                style={styles.background}
                locations={[0, 1]}
            />

            <AppHeader title="Student Details" onBack={() => router.back()} />

            {loading ? (
                <View style={styles.centerRef}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Fetching profile...</Text>
                </View>
            ) : error ? (
                <View style={styles.centerRef}>
                    <View style={[styles.errorIcon, { backgroundColor: '#FFEBEE' }]}>
                        <Ionicons name="alert" size={32} color="#D32F2F" />
                    </View>
                    <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                    <Button title="Try Again" onPress={fetchStudentProfile} style={{ marginTop: 24, minWidth: 150 }} />
                </View>
            ) : !student ? (
                <View style={styles.centerRef}>
                    <Text style={{ color: colors.textSecondary }}>No student data available</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Profile Card */}
                    <View style={[styles.profileCard, { backgroundColor: isDark ? colors.card : "#fff", shadowColor: colors.shadow }]}>
                        <View style={styles.profileHeader}>
                            {student.picture && !student.picture.includes("gravatar.com/avatar/default") ? (
                                <Image
                                    source={{ uri: student.picture }}
                                    style={styles.avatar}
                                    contentFit="cover"
                                    transition={500}
                                />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.avatarText}>
                                        {(student.firstname || "S").charAt(0).toUpperCase()}
                                        {(student.lastname || "").charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.profileMainInfo}>
                                <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={2}>
                                    {student.fullname || `${student.firstname} ${student.lastname}`}
                                </Text>
                                <Text style={[styles.studentId, { color: colors.textSecondary }]}>
                                    ID: #{student.id}
                                </Text>
                                <View style={[styles.activeBadge, { backgroundColor: '#E8F5E9' }]}>
                                    <View style={styles.activeDot} />
                                    <Text style={styles.activeText}>Active Student</Text>
                                </View>
                            </View>
                        </View>


                    </View>

                    {/* Stats Summary */}
                    <View style={styles.sectionWrapper}>
                        <Text style={[styles.sectionHeading, { color: colors.text }]}>Application Overview</Text>
                        <View style={styles.statsGrid}>
                            <StatBox
                                label="Total"
                                value={student.applications_summary?.total || 0}
                                color="#2196F3"
                                icon="documents-outline"
                            />
                            <StatBox
                                label="Approved"
                                value={student.applications_summary?.approved || 0}
                                color="#4CAF50"
                                icon="checkmark-circle-outline"
                            />
                            <StatBox
                                label="In Progress" // Use In Progress instead of Pending to match API key if needed, or visual label
                                value={student.applications_summary?.in_progress || 0}
                                color="#FF9800"
                                icon="time-outline"
                            />
                            <StatBox
                                label="Rejected"
                                value={student.applications_summary?.rejected || 0}
                                color="#F44336"
                                icon="close-circle-outline"
                            />
                        </View>
                    </View>

                    <ApplicationsList applications={student.recent_applications} />

                    {/* Information Sections */}
                    {studentDetails && (
                        <View style={styles.detailsGap}>
                            <InfoCard title="Personal Details" data={studentDetails.personal} />
                            <InfoCard title="Contact Information" data={studentDetails.contact} />
                            <InfoCard title="Current Education" data={studentDetails.education_current} />
                            <InfoCard title="Education History" data={studentDetails.education_history} />
                            <InfoCard title="Documents & IDs" data={studentDetails.documents} />
                        </View>
                    )}

                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
    },
    centerRef: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        fontWeight: '500',
    },
    errorIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 24,
    },
    scrollContent: {
        padding: 16,
    },

    // Profile Header Card
    profileCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileMainInfo: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    studentName: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    studentId: {
        fontSize: 13,
        marginBottom: 8,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4CAF50',
        marginRight: 6,
    },
    activeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2E7D32',
    },
    divider: {
        height: 1,
        width: '100%',
        marginVertical: 16,
    },
    actionRow: {
        flexDirection: 'row',
    },
    applyButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 12,
    },

    // Stats
    sectionWrapper: {
        marginBottom: 24,
    },
    sectionHeading: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
        marginLeft: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statBox: {
        width: '48%', // Ensure 2 per row
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        // iOS Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 5,
        // Android Elevation
        elevation: 1,
    },
    statIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 20,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
    },

    // Info Cards
    detailsGap: {
        gap: 20,
    },
    cardContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.3,
        textTransform: 'uppercase',
    },
    cardContent: {
        paddingTop: 0,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    lastInfoRow: {
        borderBottomWidth: 0,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoTextBox: {
        flex: 1,
        gap: 2,
    },
    infoLabel: {
        fontSize: 11,
        fontWeight: '500',
        opacity: 0.7,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    actionBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
});
