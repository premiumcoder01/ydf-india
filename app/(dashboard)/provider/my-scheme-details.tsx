import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ReviewerHeader from "../../../components/ReviewerHeader";

import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MySchemeDetailsScreen() {
    const { isDark, colors } = useTheme();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();

    const scholarship = useMemo(() => {
        const total = parseInt((params.applications_count as string) || "0", 10);
        let rawStatus = (params.status as string) || "Draft";
        // Capitalize first letter
        const status = (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()) as "Active" | "Draft" | "Closed";

        return {
            id: (params.id as string) || "",
            title: (params.title as string) || "Untitled Scheme",
            status: status,
            description: (params.description as string) || "No description available.",
            amount: parseFloat((params.fund_amount as string) || "0"),
            deadline: (params.end_date as string) || "",
            applicants: {
                total: total,
                approved: 0,
                rejected: 0,
                pending: total
            },
        };
    }, [params]);

    const formatCurrency = (amount: number) => {
        // Use compact notation for very large numbers to prevent line wrapping
        if (amount >= 10000000) { // 1 Crore+
            return `₹${(amount / 10000000).toFixed(2)} Cr`;
        } else if (amount >= 100000) { // 1 Lakh+
            return `₹${(amount / 100000).toFixed(2)} L`;
        }
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(amount);
    };

    const formattedDeadline = useMemo(() => {
        if (!scholarship.deadline) return "No Deadline";
        try {
            // Check if unix timestamp
            if (!isNaN(Number(scholarship.deadline)) && scholarship.deadline.length < 13) {
                return new Date(Number(scholarship.deadline) * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
            }
            const d = new Date(scholarship.deadline);
            return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
        } catch {
            return scholarship.deadline;
        }
    }, [scholarship.deadline]);

    const approvalRate = useMemo(() => {
        const processed = scholarship.applicants.approved + scholarship.applicants.rejected;
        return processed > 0 ? ((scholarship.applicants.approved / processed) * 100).toFixed(0) : 0;
    }, [scholarship.applicants]);

    const getStatusStyle = (status: "Active" | "Draft" | "Closed") => {
        switch (status) {
            case "Active": return { backgroundColor: 'rgba(76, 175, 80, 0.2)', borderColor: '#4CAF50' };
            case "Closed": return { backgroundColor: 'rgba(244, 67, 54, 0.2)', borderColor: '#F44336' };
            default: return { backgroundColor: 'rgba(255, 193, 7, 0.2)', borderColor: '#FFC107' };
        }
    };

    const getStatusTextStyle = (status: "Active" | "Draft" | "Closed") => {
        switch (status) {
            case "Active": return { color: '#4CAF50' };
            case "Closed": return { color: '#F44336' };
            default: return { color: '#FFC107' };
        }
    };

    // Simple parser to handle headers in description
    const renderDescription = () => {
        // Split by lines
        const lines = scholarship.description.split('\n');

        return lines.map((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return null;

            // Check if line looks like a header (starts with Emoji or is short and ends with colon or is plain text that looks like a title)
            // Heuristic: Starts with emoji OR is short (< 50 chars) and uppercase/titlecase
            // The screenshot shows "📝 Application | ..."
            const isHeader = /[\p{Extended_Pictographic}<]/u.test(trimmed.substring(0, 2));

            if (isHeader) {
                return (
                    <Text key={index} style={[styles.descHeader, { color: colors.text, marginTop: index === 0 ? 0 : 16 }]}>
                        {trimmed}
                    </Text>
                );
            }

            return (
                <Text key={index} style={[styles.descText, { color: colors.textSecondary }]}>
                    {trimmed}
                </Text>
            );
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ReviewerHeader title="Scheme Details" />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Header Card - Redesigned */}
                <View style={styles.heroCard}>
                    <LinearGradient
                        colors={isDark ? ['#1e1e2e', '#2a2a40'] : ['#ffffff', '#f8f9fa']}
                        style={styles.heroBg}
                    >
                        <View style={styles.heroHeader}>
                            <View style={[styles.statusPill, getStatusStyle(scholarship.status)]}>
                                <View style={[styles.statusDot, { backgroundColor: getStatusTextStyle(scholarship.status).color }]} />
                                <Text style={[styles.statusText, getStatusTextStyle(scholarship.status)]}>{scholarship.status}</Text>
                            </View>
                        </View>

                        <Text style={[styles.heroTitle, { color: colors.text }]}>{scholarship.title}</Text>

                        <View style={styles.heroDivider} />

                        <View style={styles.heroGrid}>
                            <View style={styles.heroCol}>
                                <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Award Amount</Text>
                                <Text style={[styles.heroValue, { color: colors.primary }]}>{formatCurrency(scholarship.amount)}</Text>
                            </View>
                            <View style={styles.heroCol}>
                                <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Deadline</Text>
                                <Text style={[styles.heroValue, { color: colors.text }]}>{formattedDeadline}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Description Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(102, 126, 234, 0.1)' : '#EFF6FF' }]}>
                            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>About This Scholarship</Text>
                    </View>
                    <View style={styles.descriptionContainer}>
                        {renderDescription()}
                    </View>
                </View>

                {/* Applications Overview */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(102, 126, 234, 0.1)' : '#EFF6FF' }]}>
                            <Ionicons name="stats-chart-outline" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Applications Overview</Text>
                    </View>

                    <View style={styles.summaryGrid}>
                        <View style={[styles.summaryItem, { backgroundColor: isDark ? colors.surface : '#F8FAFC', borderColor: colors.border }]}>
                            <Text style={[styles.summaryCount, { color: colors.text }]}>{scholarship.applicants.total}</Text>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Apps</Text>
                            <View style={[styles.summaryBar, { backgroundColor: '#E2E8F0' }]}>
                                <View style={[styles.summaryBarFill, { backgroundColor: colors.primary, width: '100%' }]} />
                            </View>
                        </View>

                        <View style={[styles.summaryItem, { backgroundColor: isDark ? colors.surface : '#F8FAFC', borderColor: colors.border }]}>
                            <Text style={[styles.summaryCount, { color: '#4CAF50' }]}>{scholarship.applicants.approved}</Text>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Approved</Text>
                            <View style={[styles.summaryBar, { backgroundColor: '#E2E8F0' }]}>
                                <View style={[styles.summaryBarFill, { backgroundColor: '#4CAF50', width: `${scholarship.applicants.total ? (scholarship.applicants.approved / scholarship.applicants.total) * 100 : 0}%` }]} />
                            </View>
                        </View>

                        <View style={[styles.summaryItem, { backgroundColor: isDark ? colors.surface : '#F8FAFC', borderColor: colors.border }]}>
                            <Text style={[styles.summaryCount, { color: '#FF9800' }]}>{scholarship.applicants.pending}</Text>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Pending</Text>
                            <View style={[styles.summaryBar, { backgroundColor: '#E2E8F0' }]}>
                                <View style={[styles.summaryBarFill, { backgroundColor: '#FF9800', width: `${scholarship.applicants.total ? (scholarship.applicants.pending / scholarship.applicants.total) * 100 : 0}%` }]} />
                            </View>
                        </View>

                        <View style={[styles.summaryItem, { backgroundColor: isDark ? colors.surface : '#F8FAFC', borderColor: colors.border }]}>
                            <Text style={[styles.summaryCount, { color: '#F44336' }]}>{scholarship.applicants.rejected}</Text>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Rejected</Text>
                            <View style={[styles.summaryBar, { backgroundColor: '#E2E8F0' }]}>
                                <View style={[styles.summaryBarFill, { backgroundColor: '#F44336', width: `${scholarship.applicants.total ? (scholarship.applicants.rejected / scholarship.applicants.total) * 100 : 0}%` }]} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Actions */}
                {scholarship.applicants.total > 0 && (
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                            activeOpacity={0.9}
                            onPress={() => router.push({
                                pathname: "/(dashboard)/provider/applicants",
                                params: {
                                    scholarship_id: scholarship.id,
                                    scheme_title: scholarship.title
                                }
                            })}
                        >
                            <View style={styles.actionContent}>
                                <Ionicons name="people" size={20} color="#fff" />
                                <Text style={styles.actionBtnText}>View Applicants</Text>
                            </View>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                            activeOpacity={0.9}
                            onPress={() => router.push({
                                pathname: "/(dashboard)/provider/reports",
                                params: {
                                    scheme_id: scholarship.id,
                                    scheme_name: scholarship.title
                                }
                            })}
                        >
                            <View style={styles.actionContent}>
                                <Ionicons name="stats-chart" size={20} color={colors.text} />
                                <Text style={[styles.actionBtnText, { color: colors.text }]}>View Analytics</Text>
                            </View>
                            <Ionicons name="arrow-forward" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}


            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 12,
    },
    scroll: {
        flex: 1,
    },
    content: {
        padding: 20,
        gap: 20,
    },
    heroCard: {
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    heroBg: {
        padding: 24,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: 16,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: "800",
        lineHeight: 34,
        letterSpacing: -0.5,
        marginBottom: 20,
    },
    heroDivider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.06)',
        marginBottom: 20,
    },
    heroGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 20,
    },
    heroCol: {
        flex: 1,
        gap: 4,
    },
    heroLabel: {
        fontSize: 13,
        fontWeight: "600",
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    heroValue: {
        fontSize: 20,
        fontWeight: "700",
        letterSpacing: -0.5,
    },
    card: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "700",
        letterSpacing: -0.3,
    },
    descriptionContainer: {
        gap: 8,
    },
    descHeader: {
        fontSize: 16,
        fontWeight: "700",
        lineHeight: 24,
    },
    descText: {
        fontSize: 15,
        lineHeight: 24,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    summaryItem: {
        width: '48%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 4,
    },
    summaryCount: {
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: -0.5,
    },
    summaryLabel: {
        fontSize: 13,
        fontWeight: "500",
    },
    summaryBar: {
        height: 4,
        borderRadius: 2,
        marginTop: 8,
        overflow: 'hidden',
    },
    summaryBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    actionsGrid: {
        marginTop: 8,
        gap: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
    },
    actionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
