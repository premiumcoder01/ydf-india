import { AppHeader, SearchBar } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getMobilizerApplications, getMobilizerScholarships, getMobilizerStudents } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { MotiView } from "moti";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

// Type definitions based on actual API response
interface Student {
    id: number;
    name: string;
    email: string;
}

interface Scholarship {
    id: number;
    name: string;
}

interface Application {
    id: number;
    student: Student;
    scholarship: Scholarship;
    status: string;
    applied_at: string;
    timecreated: string;
    timemodified: string;
}

interface PaginationInfo {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
}

export default function MobilizerApplicationsScreen() {
    const { isDark, colors } = useTheme();
    const [applications, setApplications] = useState<Application[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [scholarships, setScholarships] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);

    // Filter states
    const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
    const [selectedScholarship, setSelectedScholarship] = useState<number | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal states
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showScholarshipModal, setShowScholarshipModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);

    const statusOptions = [
        { value: null, label: "All Statuses", icon: "apps-outline" },
        { value: "new", label: "New", icon: "sparkles-outline" },
        { value: "pending", label: "Pending", icon: "time-outline" },
        { value: "approved", label: "Approved", icon: "checkmark-circle-outline" },
        { value: "rejected", label: "Rejected", icon: "close-circle-outline" },
        { value: "in_progress", label: "In Progress", icon: "sync-outline" },
        { value: "submitted", label: "Submitted", icon: "send-outline" },
    ];

    const fetchData = async () => {
        try {
            setLoading(true);
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) return;
            const { token } = JSON.parse(authDataStr);

            // Fetch applications with filters
            const appsResponse = await getMobilizerApplications(token, {
                page: 1,
                per_page: 100,
                student_id: selectedStudent || undefined,
                scholarship_id: selectedScholarship || undefined,
                status: selectedStatus || undefined,
            });

            console.log("Applications Response:", JSON.stringify(appsResponse, null, 2));

            if (appsResponse.success && appsResponse.data) {
                const appsData = appsResponse.data.applications || [];
                const paginationData = appsResponse.data.pagination;
                setApplications(Array.isArray(appsData) ? appsData : []);
                setPagination(paginationData || null);
            } else {
                setApplications([]);
                setPagination(null);
            }

            // Fetch students list for filter (only once)
            if (students.length === 0) {
                const studentsResponse = await getMobilizerStudents(token, 1, 100);
                if (studentsResponse.success && studentsResponse.data?.students) {
                    setStudents(studentsResponse.data.students);
                }
            }

            // Fetch scholarships list for filter (only once)
            if (scholarships.length === 0) {
                const scholarshipsResponse = await getMobilizerScholarships(token, { per_page: 100 });
                if (scholarshipsResponse.success && scholarshipsResponse.data) {
                    const schData = scholarshipsResponse.data.data || scholarshipsResponse.data;
                    setScholarships(Array.isArray(schData) ? schData : schData?.data || []);
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [selectedStudent, selectedScholarship, selectedStatus])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const getStatusConfig = (status: string) => {
        const statusLower = status?.toLowerCase() || "";
        switch (statusLower) {
            case "new":
                return { color: "#9C27B0", bgColor: "#F3E5F5", icon: "sparkles" };
            case "approved":
                return { color: "#4CAF50", bgColor: "#E8F5E9", icon: "checkmark-circle" };
            case "pending":
                return { color: "#FF9800", bgColor: "#FFF3E0", icon: "time" };
            case "submitted":
                return { color: "#2196F3", bgColor: "#E3F2FD", icon: "send" };
            case "rejected":
                return { color: "#F44336", bgColor: "#FFEBEE", icon: "close-circle" };
            case "in_progress":
                return { color: "#00BCD4", bgColor: "#E0F7FA", icon: "sync" };
            default:
                return { color: "#9E9E9E", bgColor: "#F5F5F5", icon: "help-circle" };
        }
    };

    const getStatusLabel = (status: string) => {
        if (!status) return "Unknown";
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const formatDateTime = (dateString: string) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getSelectedStudentName = () => {
        if (!selectedStudent) return "All Students";
        const student = students.find(s => s.id === selectedStudent);
        return student ? student.fullname || `${student.firstname} ${student.lastname}` : "All Students";
    };

    const getSelectedScholarshipName = () => {
        if (!selectedScholarship) return "All Scholarships";
        const scholarship = scholarships.find(s => s.id === selectedScholarship);
        return scholarship ? scholarship.name || scholarship.title : "All Scholarships";
    };

    const getSelectedStatusLabel = () => {
        if (!selectedStatus) return "All Statuses";
        return getStatusLabel(selectedStatus);
    };

    // Filter applications by search query
    const filteredApplications = useMemo(() => {
        if (!searchQuery.trim()) return applications;
        const query = searchQuery.toLowerCase();
        return applications.filter(app =>
            app.student.name.toLowerCase().includes(query) ||
            app.student.email.toLowerCase().includes(query) ||
            app.scholarship.name.toLowerCase().includes(query) ||
            app.status.toLowerCase().includes(query)
        );
    }, [applications, searchQuery]);

    const activeFiltersCount = [selectedStudent, selectedScholarship, selectedStatus].filter(Boolean).length;

    const clearAllFilters = () => {
        setSelectedStudent(null);
        setSelectedScholarship(null);
        setSelectedStatus(null);
        setSearchQuery("");
    };

    const renderFilterModal = (
        visible: boolean,
        onClose: () => void,
        title: string,
        data: any[],
        selectedValue: any,
        onSelect: (value: any) => void,
        renderItem: (item: any) => { label: string; value: any; icon?: string }
    ) => (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <MotiView
                    from={{ translateY: 400, opacity: 0 }}
                    animate={{ translateY: 0, opacity: 1 }}
                    transition={{ type: "timing", duration: 300 }}
                    style={[styles.modalContent, { backgroundColor: colors.card }]}
                >
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                        {data.map((item, index) => {
                            const { label, value, icon } = renderItem(item);
                            const isSelected = value === selectedValue;
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.modalItem,
                                        { borderBottomColor: colors.border },
                                        isSelected && {
                                            backgroundColor: isDark ? `${colors.primary}20` : `${colors.primary}10`
                                        }
                                    ]}
                                    onPress={() => {
                                        onSelect(value);
                                        onClose();
                                    }}
                                >
                                    {icon && (
                                        <Ionicons
                                            name={icon as any}
                                            size={20}
                                            color={isSelected ? colors.primary : colors.textSecondary}
                                            style={{ marginRight: 12 }}
                                        />
                                    )}
                                    <Text style={[styles.modalItemText, { color: isSelected ? colors.primary : colors.text }]}>
                                        {label}
                                    </Text>
                                    {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </MotiView>
            </View>
        </Modal>
    );

    const renderApplicationCard = ({ item, index }: { item: Application; index: number }) => {
        const statusConfig = getStatusConfig(item.status);

        return (
            <MotiView
                from={{ opacity: 0, translateY: 50 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 400, delay: index * 100 }}
            >
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    activeOpacity={0.7}
                    onPress={() => {
                        // Navigate to application details
                        router.push({
                            pathname: "/(dashboard)/mobilizer/mobilizer-student-profile",
                            params: { studentId: item.student.id }
                        });
                    }}
                >
                    {/* Header with Status Badge */}
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                            <View style={styles.scholarshipTitleRow}>
                                <Ionicons name="school" size={18} color={colors.primary} />
                                <Text style={[styles.scholarshipTitle, { color: colors.text }]} numberOfLines={2}>
                                    {item.scholarship.name}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                            <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
                            <Text style={[styles.statusText, { color: statusConfig.color }]}>
                                {getStatusLabel(item.status)}
                            </Text>
                        </View>
                    </View>

                    {/* Student Info */}
                    <View style={[styles.studentSection, { backgroundColor: isDark ? colors.surface : '#F8F9FA' }]}>
                        <View style={[styles.studentAvatar, { backgroundColor: colors.primary }]}>
                            <Text style={styles.avatarText}>
                                {item.student.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>
                                {item.student.name}
                            </Text>
                            <View style={styles.emailRow}>
                                <Ionicons name="mail-outline" size={12} color={colors.textSecondary} />
                                <Text style={[styles.studentEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {item.student.email}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Details Grid */}
                    <View style={styles.detailsGrid}>
                        <View style={styles.detailBox}>
                            <View style={[styles.detailIconBox, { backgroundColor: `${colors.primary}15` }]}>
                                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Applied</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {formatDate(item.applied_at)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.detailBox}>
                            <View style={[styles.detailIconBox, { backgroundColor: `${colors.primary}15` }]}>
                                <Ionicons name="time-outline" size={16} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Last Updated</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                                    {formatDate(item.timemodified)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Application ID Footer */}
                    <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                        <Text style={[styles.appIdText, { color: colors.textSecondary }]}>
                            Application #{item.id}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>
            </MotiView>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#0A0A0A" : "#F5F7FA" }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <LinearGradient
                colors={isDark ? ["#0A0A0A", "#121212", "#1A1A1A"] : ["#FFFFFF", "#F5F7FA", "#E8EBF0"]}
                style={styles.background}
                locations={[0, 0.5, 1]}
            />

            <AppHeader title="My Applications" onBack={() => router.back()} />

            <View style={styles.content}>
                {/* Stats Header */}
                {/* {!loading && pagination && (
                    <MotiView
                        from={{ opacity: 0, translateY: -20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: "timing", duration: 400 }}
                        style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                        <LinearGradient
                            colors={isDark ? [colors.primary + "30", colors.primary + "10"] : [colors.primary + "20", colors.primary + "05"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.statsGradient}
                        >
                            <View style={styles.statItem}>
                                <Ionicons name="document-text" size={24} color={colors.primary} />
                                <View style={{ marginLeft: 12 }}>
                                    <Text style={[styles.statValue, { color: colors.text }]}>{pagination.total}</Text>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Applications</Text>
                                </View>
                            </View>
                            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                            <View style={styles.statItem}>
                                <Ionicons name="funnel" size={24} color={colors.primary} />
                                <View style={{ marginLeft: 12 }}>
                                    <Text style={[styles.statValue, { color: colors.text }]}>{filteredApplications.length}</Text>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Filtered Results</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </MotiView>
                )} */}

                {/* Search Bar */}
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search by student, email, or scholarship..."
                    onClear={() => setSearchQuery("")}
                />

                {/* Filter Section */}
                <View style={styles.filterSection}>
                    <View style={styles.filterHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="options-outline" size={18} color={colors.text} />
                            <Text style={[styles.filterTitle, { color: colors.text }]}>Filters</Text>
                            {activeFiltersCount > 0 && (
                                <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                                </View>
                            )}
                        </View>
                        {activeFiltersCount > 0 && (
                            <TouchableOpacity onPress={clearAllFilters} style={styles.clearBtn}>
                                <Ionicons name="close-circle" size={16} color={colors.primary} />
                                <Text style={[styles.clearBtnText, { color: colors.primary }]}>
                                    Clear All
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: selectedStudent ? colors.primary : (isDark ? colors.card : '#fff'),
                                    borderColor: selectedStudent ? colors.primary : colors.border
                                }
                            ]}
                            onPress={() => setShowStudentModal(true)}
                        >
                            <Ionicons
                                name="person-outline"
                                size={16}
                                color={selectedStudent ? '#fff' : colors.textSecondary}
                            />
                            <Text style={[
                                styles.filterChipText,
                                { color: selectedStudent ? '#fff' : colors.text }
                            ]} numberOfLines={1}>
                                {getSelectedStudentName()}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={14}
                                color={selectedStudent ? '#fff' : colors.textSecondary}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: selectedScholarship ? colors.primary : (isDark ? colors.card : '#fff'),
                                    borderColor: selectedScholarship ? colors.primary : colors.border
                                }
                            ]}
                            onPress={() => setShowScholarshipModal(true)}
                        >
                            <Ionicons
                                name="school-outline"
                                size={16}
                                color={selectedScholarship ? '#fff' : colors.textSecondary}
                            />
                            <Text style={[
                                styles.filterChipText,
                                { color: selectedScholarship ? '#fff' : colors.text }
                            ]} numberOfLines={1}>
                                {getSelectedScholarshipName()}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={14}
                                color={selectedScholarship ? '#fff' : colors.textSecondary}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: selectedStatus ? colors.primary : (isDark ? colors.card : '#fff'),
                                    borderColor: selectedStatus ? colors.primary : colors.border
                                }
                            ]}
                            onPress={() => setShowStatusModal(true)}
                        >
                            <Ionicons
                                name="flag-outline"
                                size={16}
                                color={selectedStatus ? '#fff' : colors.textSecondary}
                            />
                            <Text style={[
                                styles.filterChipText,
                                { color: selectedStatus ? '#fff' : colors.text }
                            ]}>
                                {getSelectedStatusLabel()}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={14}
                                color={selectedStatus ? '#fff' : colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Applications List */}
                {loading && !refreshing ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading applications...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredApplications}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderApplicationCard}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[colors.primary]}
                                tintColor={colors.primary}
                            />
                        }
                        ListEmptyComponent={
                            <MotiView
                                from={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: "timing", duration: 400 }}
                                style={styles.emptyContainer}
                            >
                                <View style={[styles.emptyIconBox, { backgroundColor: `${colors.primary}15` }]}>
                                    <Ionicons name="documents-outline" size={64} color={colors.primary} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Applications Found</Text>
                                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                                    {activeFiltersCount > 0 || searchQuery
                                        ? "Try adjusting your filters or search query"
                                        : "Applications you submit will appear here"}
                                </Text>
                                {activeFiltersCount > 0 && (
                                    <TouchableOpacity
                                        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                                        onPress={clearAllFilters}
                                    >
                                        <Ionicons name="refresh" size={18} color="#fff" />
                                        <Text style={styles.emptyButtonText}>Clear Filters</Text>
                                    </TouchableOpacity>
                                )}
                            </MotiView>
                        }
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* Student Filter Modal */}
            {renderFilterModal(
                showStudentModal,
                () => setShowStudentModal(false),
                "Select Student",
                [{ id: null, fullname: "All Students" }, ...students],
                selectedStudent,
                setSelectedStudent,
                (item) => ({
                    label: item.fullname || `${item.firstname || ""} ${item.lastname || ""}`.trim() || "All Students",
                    value: item.id,
                    icon: "person-outline"
                })
            )}

            {/* Scholarship Filter Modal */}
            {renderFilterModal(
                showScholarshipModal,
                () => setShowScholarshipModal(false),
                "Select Scholarship",
                [{ id: null, name: "All Scholarships" }, ...scholarships],
                selectedScholarship,
                setSelectedScholarship,
                (item) => ({
                    label: item.name || item.title || "All Scholarships",
                    value: item.id,
                    icon: "school-outline"
                })
            )}

            {/* Status Filter Modal */}
            {renderFilterModal(
                showStatusModal,
                () => setShowStatusModal(false),
                "Select Status",
                statusOptions,
                selectedStatus,
                setSelectedStatus,
                (item) => ({
                    label: item.label,
                    value: item.value,
                    icon: item.icon
                })
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
    content: { flex: 1, paddingHorizontal: 16 },

    // Stats Card
    statsCard: {
        borderRadius: 20,
        marginTop: 12,
        marginBottom: 16,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    statsGradient: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 40,
        marginHorizontal: 16,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },

    // Filter Section
    filterSection: {
        marginBottom: 16,
    },
    filterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    filterTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    filterBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    clearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    clearBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    filterChips: {
        flexDirection: 'row',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1.5,
        marginRight: 10,
        gap: 6,
        maxWidth: 180,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },

    // List
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '500',
    },
    listContent: {
        paddingBottom: 32,
    },

    // Application Card
    card: {
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    scholarshipTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scholarshipTitle: {
        fontSize: 17,
        fontWeight: '700',
        flex: 1,
        lineHeight: 22,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Student Section
    studentSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 12,
    },
    studentAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    studentName: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    emailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    studentEmail: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Details Grid
    detailsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    detailBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    detailIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 10,
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '700',
    },

    // Card Footer
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
    },
    appIdText: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'monospace',
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
        paddingHorizontal: 32,
    },
    emptyIconBox: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '75%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalList: {
        maxHeight: 450,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderBottomWidth: 1,
    },
    modalItemText: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
});
