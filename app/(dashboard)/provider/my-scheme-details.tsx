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

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(amount);

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
            case "Active": return { backgroundColor: 'rgba(255, 255, 255, 0.25)' };
            case "Closed": return { backgroundColor: 'rgba(255, 255, 255, 0.25)' };
            default: return { backgroundColor: 'rgba(255, 255, 255, 0.25)' };
        }
    };

    const getStatusDotStyle = (status: "Active" | "Draft" | "Closed") => {
        switch (status) {
            case "Active": return { backgroundColor: '#4CAF50' };
            case "Closed": return { backgroundColor: '#F44336' };
            default: return { backgroundColor: '#FFC107' };
        }
    };

    const getStatusTextStyle = (status: "Active" | "Draft" | "Closed") => {
        return { color: '#fff' };
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ReviewerHeader title="Scheme Details" />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Header Card */}
                <View style={styles.heroCard}>
                    <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroGradient}
                    >
                        <View style={styles.heroContent}>
                            <View style={styles.heroTop}>
                                <View style={styles.heroTitleContainer}>
                                    <Text style={styles.heroTitle}>{scholarship.title}</Text>
                                    <View style={[styles.statusBadge, getStatusStyle(scholarship.status)]}>
                                        <View style={[styles.statusDot, getStatusDotStyle(scholarship.status)]} />
                                        <Text style={[styles.statusText, getStatusTextStyle(scholarship.status)]}>
                                            {scholarship.status}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.heroStats}>
                                <View style={styles.heroStat}>
                                    <Text style={styles.heroStatValue}>{formatCurrency(scholarship.amount)}</Text>
                                    <Text style={styles.heroStatLabel}>Award Amount</Text>
                                </View>
                                <View style={styles.heroDivider} />
                                <View style={styles.heroStat}>
                                    <Text style={styles.heroStatValue}>{scholarship.applicants.total}</Text>
                                    <Text style={styles.heroStatLabel}>Total Applicants</Text>
                                </View>
                                <View style={styles.heroDivider} />
                                <View style={styles.heroStat}>
                                    <Text style={styles.heroStatValue}>{approvalRate}%</Text>
                                    <Text style={styles.heroStatLabel}>Approval Rate</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Description Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBadge, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.15)" : "#F0F1FF" }]}>
                            <Ionicons name="information-circle" size={20} color="#667eea" />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>About This Scholarship</Text>
                    </View>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>{scholarship.description}</Text>

                    <View style={styles.metaRow}>
                        <View style={[styles.metaItem, { backgroundColor: colors.surface }]}>
                            <View style={[styles.metaIconBg, { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.15)' : '#E8F5E9' }]}>
                                <Ionicons name="calendar-outline" size={16} color="#4CAF50" />
                            </View>
                            <View>
                                <Text style={styles.metaLabel}>Deadline</Text>
                                <Text style={[styles.metaValue, { color: colors.text }]}>{formattedDeadline}</Text>
                            </View>
                        </View>
                        <View style={[styles.metaItem, { backgroundColor: colors.surface }]}>
                            <View style={[styles.metaIconBg, { backgroundColor: isDark ? 'rgba(255, 152, 0, 0.15)' : '#FFF3E0' }]}>
                                <Ionicons name="time-outline" size={16} color="#FF9800" />
                            </View>
                            <View>
                                <Text style={styles.metaLabel}>Status</Text>
                                <Text style={[styles.metaValue, { color: colors.text }]}>Open</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Applications Overview */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBadge, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.15)" : "#F0F1FF" }]}>
                            <Ionicons name="stats-chart" size={20} color="#667eea" />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Applications Overview</Text>
                    </View>

                    <View style={styles.progressSection}>
                        <View style={styles.progressHeader}>
                            <Text style={[styles.progressTitle, { color: colors.text }]}>Review Progress</Text>
                            <Text style={styles.progressPercentage}>
                                {Math.round((1 - scholarship.applicants.pending / scholarship.applicants.total) * 100)}%
                            </Text>
                        </View>
                        <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${((scholarship.applicants.approved + scholarship.applicants.rejected) / scholarship.applicants.total) * 100}%`
                                    }
                                ]}
                            />
                        </View>
                    </View>

                    <View style={styles.summaryGrid}>
                        <SummaryCard
                            icon="checkmark-circle"
                            label="Approved"
                            value={scholarship.applicants.approved}
                            color="#4CAF50"
                            gradient={['#4CAF50', '#66BB6A'] as const}
                        />
                        <SummaryCard
                            icon="close-circle"
                            label="Rejected"
                            value={scholarship.applicants.rejected}
                            color="#F44336"
                            gradient={['#F44336', '#EF5350'] as const}
                        />
                        <SummaryCard
                            icon="time"
                            label="Pending"
                            value={scholarship.applicants.pending}
                            color="#FF9800"
                            gradient={['#FF9800', '#FFA726'] as const}
                        />
                        <SummaryCard
                            icon="people"
                            label="Total"
                            value={scholarship.applicants.total}
                            color="#2196F3"
                            gradient={['#2196F3', '#42A5F5'] as const}
                        />
                    </View>
                </View>

                {/* View Applicants Action */}
                {scholarship.applicants.total > 0 && (
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={styles.primaryActionBtn}
                            activeOpacity={0.8}
                            onPress={() => router.push({
                                pathname: "/(dashboard)/provider/applicants",
                                params: {
                                    scholarship_id: scholarship.id,
                                    scheme_title: scholarship.title
                                }
                            })}
                        >
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.actionGradient}
                            >
                                <Ionicons name="people" size={22} color="#fff" />
                                <Text style={styles.primaryActionText}>View Applicants</Text>
                                <Ionicons name="arrow-forward" size={18} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}


            </ScrollView>
        </View>
    );
}

function SummaryCard({ icon, label, value, color, gradient }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: number;
    color: string;
    gradient: readonly [string, string];
}) {
    return (
        <View style={styles.summaryCard}>
            <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summaryGradient}
            >
                <Ionicons name={icon} size={24} color="#fff" />
                <Text style={styles.summaryValue}>{value}</Text>
                <Text style={styles.summaryLabel}>{label}</Text>
            </LinearGradient>
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
        padding: 16,
        paddingBottom: 32,
        gap: 16,
    },
    heroCard: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: "#667eea",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    heroGradient: {
        padding: 24,
    },
    heroContent: {
        gap: 20,
    },
    heroTop: {
        gap: 12,
    },
    heroTitleContainer: {
        gap: 12,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: "900",
        color: "#fff",
        letterSpacing: 0.3,
        lineHeight: 32,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    heroStats: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        padding: 16,
        gap: 16,
    },
    heroStat: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    heroStatValue: {
        fontSize: 20,
        fontWeight: "900",
        color: "#fff",
        letterSpacing: 0.3,
    },
    heroStatLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.85)",
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        textAlign: 'center',
    },
    heroDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    card: {
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
        gap: 16,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: 0.2,
    },
    description: {
        fontSize: 15,
        lineHeight: 24,
        letterSpacing: 0.1,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 16,
    },
    metaItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
    },
    metaIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#999",
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metaValue: {
        fontSize: 14,
        fontWeight: "700",
        marginTop: 2,
    },
    progressSection: {
        gap: 8,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressTitle: {
        fontSize: 14,
        fontWeight: "700",
    },
    progressPercentage: {
        fontSize: 16,
        fontWeight: "900",
        color: "#667eea",
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#667eea',
        borderRadius: 4,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        minWidth: '46%',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    summaryGradient: {
        padding: 16,
        alignItems: 'center',
        gap: 8,
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: "900",
        color: "#fff",
        letterSpacing: 0.5,
    },
    summaryLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: "rgba(255, 255, 255, 0.95)",
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    actionsGrid: {
        gap: 12,
    },
    primaryActionBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: "#667eea",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    actionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
        paddingHorizontal: 24,
    },
    primaryActionText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: 0.3,
        flex: 1,
        textAlign: 'center',
    },
    secondaryActionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    secondaryActionBtn: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
    },
    secondaryActionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryActionText: {
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 0.2,
    },
});
