import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import ReviewerHeader from "../../../components/ReviewerHeader";

type ScholarshipStatus = "Active" | "Closed" | "Draft" | "Pending";

type Scholarship = {
    id: string;
    title: string;
    amount: number;
    deadline: string;
    applicants: number;
    status: ScholarshipStatus;
    category: string;
};

const TABS: Array<{ key: "All" | ScholarshipStatus; label: string }> = [
    { key: "All", label: "All" },
    { key: "Active", label: "Active" },
    { key: "Pending", label: "Pending" },
    { key: "Closed", label: "Closed" },
    { key: "Draft", label: "Draft" },
];

export default function MyCreatedSchemesScreen() {
    const { isDark, colors } = useTheme();
    const [query, setQuery] = useState("");
    const [activeTab, setActiveTab] =
        useState<(typeof TABS)[number]["key"]>("All");

    const [scholarships] = useState<Scholarship[]>([
        {
            id: "s1",
            title: "Merit Excellence Scholarship",
            amount: 5000,
            deadline: "2025-12-31",
            applicants: 126,
            status: "Active",
            category: "Merit",
        },
        {
            id: "s2",
            title: "STEM Innovation Grant",
            amount: 8000,
            deadline: "2025-11-15",
            applicants: 89,
            status: "Active",
            category: "STEM",
        },
        {
            id: "s3",
            title: "Community Service Award",
            amount: 3000,
            deadline: "2025-10-30",
            applicants: 54,
            status: "Closed",
            category: "Community",
        },
        {
            id: "s4",
            title: "Academic Achievement Scholarship",
            amount: 6000,
            deadline: "2026-01-20",
            applicants: 12,
            status: "Draft",
            category: "Academics",
        },
        {
            id: "s5",
            title: "Women in Tech Scholarship",
            amount: 7000,
            deadline: "2025-12-05",
            applicants: 203,
            status: "Active",
            category: "Technology",
        },
        {
            id: "s6",
            title: "Future Leaders Grant",
            amount: 10000,
            deadline: "2026-02-15",
            applicants: 0,
            status: "Pending",
            category: "Leadership",
        },
    ]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return scholarships
            .filter((s) => {
                if (activeTab !== "All" && s.status !== activeTab) return false;
                return (
                    s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => {
                // Sort pending/draft first for easy visibility
                if (a.status === "Pending" && b.status !== "Pending") return -1;
                if (a.status === "Draft" && b.status !== "Draft" && b.status !== "Pending") return -1;
                return 0;
            });
    }, [scholarships, query, activeTab]);

    const getStatusStyle = (status: ScholarshipStatus) => {
        switch (status) {
            case "Active":
                return { backgroundColor: isDark ? "#1B5E2030" : "#E8F5E9", borderColor: "#4CAF50" };
            case "Closed":
                return { backgroundColor: isDark ? "#B71C1C30" : "#FBE9E7", borderColor: "#F44336" };
            case "Pending":
                return { backgroundColor: isDark ? "#E6510030" : "#FFF3E0", borderColor: "#FF9800" };
            default:
                return { backgroundColor: isDark ? "#0D47A130" : "#E3F2FD", borderColor: "#2196F3" };
        }
    };

    const getStatusTextColor = (status: ScholarshipStatus) => {
        switch (status) {
            case "Active": return "#2E7D32";
            case "Closed": return "#C62828";
            case "Pending": return "#EF6C00";
            default: return "#1565C0";
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ReviewerHeader title="My Created Schemes" subtitle="Manage your scholarship programs" />

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? colors.card : "#fff", borderColor: colors.border }]}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} />
                    <TextInput
                        placeholder="Search my schemes..."
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={query}
                        onChangeText={setQuery}
                    />
                </View>
            </View>

            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
                    {TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => setActiveTab(tab.key)}
                            style={[
                                styles.tab,
                                activeTab === tab.key && { backgroundColor: colors.primary },
                                activeTab !== tab.key && { backgroundColor: isDark ? colors.card : "#fff", borderWidth: 1, borderColor: colors.border }
                            ]}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    activeTab === tab.key ? { color: "#fff" } : { color: colors.text }
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                {filtered.length > 0 ? (
                    filtered.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.card, { backgroundColor: isDark ? colors.card : "#fff", borderColor: colors.border }]}
                            onPress={() => router.push({ pathname: "/(dashboard)/provider/my-scheme-details", params: { id: item.id } })}
                            activeOpacity={0.7}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.headerLeft}>
                                    <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                                    <Text style={[styles.cardCategory, { color: colors.textSecondary }]}>{item.category}</Text>
                                </View>
                                <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                                    <Text style={[styles.statusText, { color: isDark ? colors.text : getStatusTextColor(item.status) }]}>{item.status}</Text>
                                </View>
                            </View>

                            <View style={[styles.divider, { backgroundColor: colors.border }]} />

                            <View style={styles.cardStats}>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(item.amount)}</Text>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Amount</Text>
                                </View>
                                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: colors.text }]}>{item.applicants}</Text>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Applicants</Text>
                                </View>
                                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: colors.text }]}>{new Date(item.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}</Text>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Deadline</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="folder-open-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No schemes found</Text>
                    </View>
                )}
            </ScrollView>

            {/* FAB to add new scheme */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/(dashboard)/provider/add-scholarship")}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        padding: 16,
        paddingBottom: 8,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
    },
    tabsContainer: {
        paddingBottom: 8,
    },
    tabsContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    tabText: {
        fontSize: 14,
        fontWeight: "600",
    },
    list: {
        padding: 16,
        gap: 16,
        paddingBottom: 100,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    headerLeft: {
        flex: 1,
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 4,
        lineHeight: 22,
    },
    cardCategory: {
        fontSize: 13,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    divider: {
        height: 1,
        marginBottom: 16,
    },
    cardStats: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statDivider: {
        width: 1,
        height: "80%",
        alignSelf: "center",
    },
    statValue: {
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 60,
        gap: 12,
    },
    emptyStateText: {
        fontSize: 16,
    },
    fab: {
        position: "absolute",
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
});
