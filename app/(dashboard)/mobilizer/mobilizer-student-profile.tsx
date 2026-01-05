import { AppHeader, Button } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Mock Data (mirroring the list for simplicity in this demo)
const MOCK_STUDENTS_DATA: Record<string, any> = {
    "1": {
        id: 1,
        name: "Rahul Kumar",
        email: "rahul@example.com",
        phone: "+91 98765 43210",
        studentId: "STU001",
        institution: "IIT Bombay",
        major: "Computer Science",
        gradDate: "05/2026",
        currentYear: "3rd Year",
        gpa: "8.5",
        dob: "15 Aug 2003",
        address: "Block A, IIT Campus, Powai, Mumbai, Maharashtra",
        documents: [
            { name: "Aadhar Card", status: "verified" },
            { name: "10th Marksheet", status: "verified" },
            { name: "12th Marksheet", status: "pending" }
        ],
        stats: {
            applied: 5,
            approved: 1,
            pending: 2
        }
    },
    "2": {
        id: 2,
        name: "Priya Singh",
        email: "priya@example.com",
        phone: "+91 98765 43211",
        studentId: "STU002",
        institution: "Delhi University",
        major: "Physics",
        gradDate: "05/2025",
        currentYear: "4th Year",
        gpa: "9.0",
        dob: "22 Sep 2002",
        address: "North Campus, Delhi University, New Delhi",
        documents: [
            { name: "Aadhar Card", status: "verified" },
            { name: "Income Certificate", status: "verified" }
        ],
        stats: { applied: 3, approved: 2, pending: 0 }
    },
    // Fallback for others
    "default": {
        name: "Student Name",
        email: "student@example.com",
        phone: "+91 00000 00000",
        studentId: "STUXXX",
        institution: "University Name",
        major: "Major Subject",
        gradDate: "MM/YYYY",
        currentYear: "Year",
        gpa: "-",
        documents: [],
        stats: { applied: 0, approved: 0, pending: 0 }
    }
};

export default function MobilizerStudentProfileScreen() {
    const { isDark, colors } = useTheme();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const studentId = params.studentId ? String(params.studentId) : "1";

    const student = MOCK_STUDENTS_DATA[studentId] || MOCK_STUDENTS_DATA["default"];

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
                <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colors.background : "#f5f5f5" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppHeader title="Student Profile" onBack={() => router.back()} />

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={[styles.card, styles.headerCard, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                            <Text style={{ fontSize: 36, fontWeight: '700', color: '#fff' }}>
                                {student.name.charAt(0)}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: '#E8F5E9' }]}>
                            <Text style={{ color: '#4CAF50', fontSize: 12, fontWeight: '700' }}>ACTIVE</Text>
                        </View>
                    </View>

                    <Text style={[styles.name, { color: colors.text }]}>{student.name}</Text>
                    <Text style={[styles.idText, { color: colors.textSecondary }]}>{student.studentId} • {student.institution}</Text>

                    <View style={styles.statsRow}>
                        <StatItem label="Applied" value={student.stats?.applied || 0} color="#2196F3" />
                        <StatItem label="Approved" value={student.stats?.approved || 0} color="#4CAF50" />
                        <StatItem label="Pending" value={student.stats?.pending || 0} color="#FF9800" />
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
                    <Button
                        title="Edit"
                        onPress={() => { }}
                        variant="secondary"
                        style={{ width: 80 }}
                    />
                </View>

                {/* Personal Details */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
                    <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                        <InfoRow icon="mail-outline" label="Email" value={student.email} />
                        <InfoRow icon="call-outline" label="Phone" value={student.phone} />
                        <InfoRow icon="calendar-outline" label="Date of Birth" value={student.dob || "N/A"} />
                        <InfoRow icon="location-outline" label="Address" value={student.address || "N/A"} />
                    </View>
                </View>

                {/* Academic Details */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Academic Details</Text>
                    <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                        <InfoRow icon="school-outline" label="Institution" value={student.institution} />
                        <InfoRow icon="book-outline" label="Major" value={student.major} />
                        <InfoRow icon="time-outline" label="Current Year" value={student.currentYear} />
                        <InfoRow icon="analytics-outline" label="GPA / Percentage" value={student.gpa} />
                        <InfoRow icon="calendar-number-outline" label="Expected Graduation" value={student.gradDate} />
                    </View>
                </View>

                {/* Documents */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Documents</Text>
                    <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                        {student.documents && student.documents.length > 0 ? (
                            student.documents.map((doc: any, idx: number) => (
                                <View key={idx} style={[styles.docItem, { borderBottomWidth: idx === student.documents.length - 1 ? 0 : 1, borderBottomColor: isDark ? colors.border : '#f0f0f0' }]}>
                                    <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[styles.docName, { color: colors.text }]}>{doc.name}</Text>
                                        <Text style={{ fontSize: 12, color: doc.status === 'verified' ? '#4CAF50' : '#FF9800' }}>
                                            {doc.status.toUpperCase()}
                                        </Text>
                                    </View>
                                    <Ionicons name="eye-outline" size={20} color={colors.textSecondary} />
                                </View>
                            ))
                        ) : (
                            <Text style={{ padding: 16, color: colors.textSecondary, textAlign: 'center' }}>No documents uploaded</Text>
                        )}
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
        gap: 12,
        width: '100%',
    },
    statItem: {
        flex: 1,
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
