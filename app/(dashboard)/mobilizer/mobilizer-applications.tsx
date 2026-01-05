import { AppHeader, SearchBar } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Mock Applications Data
const MOCK_APPLICATIONS = [
    { id: 101, studentName: "Rahul Kumar", scholarshipTitle: "National Merit Scholarship", status: "submitted", date: "2024-01-15", amount: "₹50,000" },
    { id: 102, studentName: "Priya Singh", scholarshipTitle: "Women in STEM Grant", status: "approved", date: "2023-12-10", amount: "₹75,000" },
    { id: 103, studentName: "Rahul Kumar", scholarshipTitle: "State Govt Aid", status: "need_action", date: "2024-01-20", amount: "₹25,000" },
    { id: 104, studentName: "Amit Patel", scholarshipTitle: "Engineering Excellence Award", status: "pending", date: "2024-02-01", amount: "₹1,00,000" },
    { id: 105, studentName: "Sneha Gupta", scholarshipTitle: "National Merit Scholarship", status: "rejected", date: "2023-11-05", amount: "₹50,000" },
];

export default function MobilizerApplicationsScreen() {
    const { isDark, colors } = useTheme();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStudent, setFilterStudent] = useState<string | null>(null);

    // Extract unique students for filter
    const students = useMemo(() => {
        const names = new Set(MOCK_APPLICATIONS.map(a => a.studentName));
        return Array.from(names);
    }, []);

    const filteredApps = useMemo(() => {
        return MOCK_APPLICATIONS.filter((app) => {
            const matchesSearch = app.scholarshipTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                app.studentName.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStudent = filterStudent ? app.studentName === filterStudent : true;
            return matchesSearch && matchesStudent;
        });
    }, [searchQuery, filterStudent]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "approved": return "#4CAF50";
            case "pending": return "#FF9800";
            case "submitted": return "#2196F3";
            case "rejected": return "#F44336";
            case "need_action": return "#E91E63";
            default: return "#999";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "need_action": return "Action Required";
            default: return status.charAt(0).toUpperCase() + status.slice(1);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#f5f5f5" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppHeader title="My Applications" onBack={() => router.back()} />

            <View style={styles.content}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search by scholarship or student..."
                    onClear={() => setSearchQuery("")}
                />

                {/* Student Filter Chips */}
                <View style={styles.filterRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
                        <TouchableOpacity
                            style={[
                                styles.chip,
                                { backgroundColor: !filterStudent ? (isDark ? colors.primary : '#333') : (isDark ? colors.card : '#e0e0e0') }
                            ]}
                            onPress={() => setFilterStudent(null)}
                        >
                            <Text style={{ color: !filterStudent ? '#fff' : (isDark ? colors.text : '#333'), fontWeight: '600' }}>All Students</Text>
                        </TouchableOpacity>
                        {students.map((student) => (
                            <TouchableOpacity
                                key={student}
                                style={[
                                    styles.chip,
                                    { backgroundColor: filterStudent === student ? (isDark ? colors.primary : '#333') : (isDark ? colors.card : '#e0e0e0') }
                                ]}
                                onPress={() => setFilterStudent(student === filterStudent ? null : student)}
                            >
                                <Text style={{ color: filterStudent === student ? '#fff' : (isDark ? colors.text : '#333') }}>{student}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <FlatList
                    data={filteredApps}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={{ paddingVertical: 16 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff" }]}>
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.title, { color: colors.text }]}>{item.scholarshipTitle}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                        <Ionicons name="person-circle-outline" size={16} color={colors.textSecondary} />
                                        <Text style={[styles.studentRole, { color: colors.textSecondary }]}> {item.studentName}</Text>
                                    </View>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                    <Text style={{ color: getStatusColor(item.status), fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                                        {getStatusLabel(item.status)}
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.detailsRow, { borderTopColor: isDark ? colors.border : '#f0f0f0' }]}>
                                <View>
                                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Applied On</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>{item.date}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Amount</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>{item.amount}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <Ionicons name="documents-outline" size={48} color={colors.textSecondary} />
                            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>No applications found.</Text>
                        </View>
                    }
                />
            </View>
        </View>
    );
}

import { ScrollView } from "react-native";

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 16 },
    filterRow: { marginVertical: 12, height: 36 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    title: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
    studentRole: { fontSize: 13, fontWeight: '500' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    detailsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12 },
    detailLabel: { fontSize: 11, color: '#999', marginBottom: 2, textTransform: 'uppercase' },
    detailValue: { fontSize: 14, fontWeight: '600' },
});
