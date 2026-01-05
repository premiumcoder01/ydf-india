import { AppHeader, Button, SearchBar } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { router } from "expo-router";
import React, { useState } from "react";
import { FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Mock Students Data (Same as in Apply Form)
const MOCK_STUDENTS = [
    { id: 1, name: "Rahul Kumar", email: "rahul@example.com", phone: "9876543210", studentId: "STU001", institution: "IIT Bombay", major: "Computer Science", gradDate: "05/2026", currentYear: "3", gpa: "8.5" },
    { id: 2, name: "Priya Singh", email: "priya@example.com", phone: "9876543211", studentId: "STU002", institution: "Delhi University", major: "Physics", gradDate: "05/2025", currentYear: "4", gpa: "9.0" },
    { id: 3, name: "Amit Patel", email: "amit@example.com", phone: "9876543212", studentId: "STU003", institution: "NIT Surat", major: "Civil Engineering", gradDate: "05/2027", currentYear: "2", gpa: "7.8" },
    { id: 4, name: "Sneha Gupta", email: "sneha@example.com", phone: "9876543213", studentId: "STU004", institution: "BITS Pilani", major: "Electronics", gradDate: "05/2026", currentYear: "3", gpa: "8.9" },
    { id: 5, name: "Vikram Malhotra", email: "vikram@example.com", phone: "9876543214", studentId: "STU005", institution: "Manipal University", major: "Mechanical", gradDate: "05/2025", currentYear: "4", gpa: "8.2" },
];

export default function MobilizerStudentsScreen() {
    const { isDark, colors } = useTheme();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredStudents = MOCK_STUDENTS.filter(
        (s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.studentId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#f5f5f5" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppHeader title="My Students" onBack={() => router.back()} />

            <View style={styles.content}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search students..."
                    onClear={() => setSearchQuery("")}
                />

                <FlatList
                    data={filteredStudents}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={{ paddingVertical: 16 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff" }]}
                            onPress={() => {
                                // Navigate to student profile details if needed
                                // For now just alert or log
                            }}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.avatar}>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{item.name.charAt(0)}</Text>
                                </View>
                                <View style={styles.info}>
                                    <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                                    <Text style={[styles.subtext, { color: colors.textSecondary }]}>{item.studentId}</Text>
                                </View>
                                <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.2)' : '#E8F5E9' }]}>
                                    <Text style={{ color: '#4CAF50', fontSize: 12, fontWeight: '600' }}>Active</Text>
                                </View>
                            </View>

                            <View style={[styles.detailsRow, { borderTopColor: isDark ? colors.border : '#f0f0f0' }]}>
                                <View style={styles.detailItem}>
                                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Institution</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>{item.institution}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Major</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>{item.major}</Text>
                                </View>
                            </View>

                            <View style={styles.actions}>
                                <Button
                                    title="Apply For"
                                    onPress={() => {
                                        // Navigate to apply form pre-selected (if we implemented param passing for selection)
                                        // For now, let's just go to listing
                                        router.push("/(dashboard)/mobilizer/mobilizer-scholarship-listing");
                                    }}
                                    style={{ flex: 1, minHeight: 45 }}
                                    textStyle={{ fontSize: 14 }}
                                />
                                <Button
                                    title="View Profile"
                                    variant="secondary"
                                    onPress={() => {
                                        router.push({
                                            pathname: "/(dashboard)/mobilizer/mobilizer-student-profile",
                                            params: { studentId: item.id }
                                        });
                                    }}
                                    style={{ flex: 1, minHeight: 45 }}
                                    textStyle={{ fontSize: 14 }}
                                />
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary }}>No students found</Text>
                        </View>
                    }
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 16 },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#2196F3',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '700' },
    subtext: { fontSize: 13 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    detailsRow: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, marginBottom: 16, gap: 16 },
    detailItem: { flex: 1 },
    detailLabel: { fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
    detailValue: { fontSize: 14, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 10 },
});
