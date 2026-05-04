import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getFinancialInfo, updateFinancialInfo } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated,
    Dimensions
} from "react-native";
import AnimatedRN, { FadeInUp, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";



interface ValidationErrors {
    [key: string]: string;
}

// Function to get brand colors based on bank name
const getBankGradient = (bankName: string): readonly [string, string, ...string[]] => {
    const name = bankName.toLowerCase();

    // SBI - Deep Blue
    if (name.includes('state bank of india') || name.includes('sbi')) {
        return ['#1e3a8a', '#1e40af', '#1d4ed8'];
    }
    // HDFC - Navy Professional
    if (name.includes('hdfc')) {
        return ['#0f172a', '#1e293b', '#334155'];
    }
    // ICICI - Sophisticated Orange
    if (name.includes('icici')) {
        return ['#9a3412', '#c2410c', '#ea580c'];
    }
    // Axis - Deep Burgundy
    if (name.includes('axis')) {
        return ['#701a35', '#831843', '#9d174d'];
    }
    // Kotak - Premium Red
    if (name.includes('kotak')) {
        return ['#991b1b', '#b91c1c', '#dc2626'];
    }
    // PNB - Maroon
    if (name.includes('punjab national') || name.includes('pnb')) {
        return ['#7f1d1d', '#991b1b', '#b91c1c'];
    }
    // Bank of Baroda - Modern Orange
    if (name.includes('baroda') || name.includes('bob')) {
        return ['#c2410c', '#ea580c', '#f97316'];
    }
    // IDFC First - Elegant Red
    if (name.includes('idfc')) {
        return ['#7f1d1d', '#b91c1c', '#ef4444'];
    }
    // Default Premium Royal Gradient
    return ['#312e81', '#3730a3', '#4338ca'];
};

export default function StudentProfileFinancialScreen() {
    const { isDark, colors } = useTheme();
    const insets = useSafeAreaInsets();

    const [financialInfo, setFinancialInfo] = useState({
        bankAccountNo: "",
        ifscCode: "",
        bankName: "",
        accountHolderName: "",
        accountType: "",
        updatedAt: "",
    });

    // Edit Form State
    const [editForm, setEditForm] = useState({
        bankAccountNo: "",
        ifscCode: "",
        bankName: "",
        accountHolderName: "",
        accountType: "",
    });
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);

    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});


    // Toast State
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error" | "info">("error");

    // Fetch Financial Info
    useEffect(() => {
        const fetchFinancialData = async () => {
            try {
                const authDataStr = await AsyncStorage.getItem("authData");
                if (authDataStr) {
                    const authData = JSON.parse(authDataStr);
                    if (authData.token) {
                        const response = await getFinancialInfo(authData.token);
                        if (response.success && response.data) {
                            const data = response.data;
                            setFinancialInfo({
                                bankAccountNo: data.account_number_full || data.account_number || "",
                                ifscCode: data.ifsc || "",
                                bankName: data.bank_name || "",
                                accountHolderName: data.accountholder || "",
                                accountType: data.account_type || "",
                                updatedAt: data.updated_at || "",
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch financial info:", error);
            } finally {
                setIsLoadingProfile(false);
            }
        };

        fetchFinancialData();
    }, []);

    const openEditModal = () => {
        setEditForm({
            bankAccountNo: financialInfo.bankAccountNo,
            ifscCode: financialInfo.ifscCode,
            bankName: financialInfo.bankName,
            accountHolderName: financialInfo.accountHolderName,
            accountType: financialInfo.accountType,
        });
        setValidationErrors({});
        setIsEditModalVisible(true);
    };

    const handleEditChange = (field: keyof typeof editForm, value: string) => {
        setEditForm((prev) => ({ ...prev, [field]: value }));
        if (validationErrors[field]) {
            setValidationErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validateEditForm = (): boolean => {
        const errors: ValidationErrors = {};

        // Bank Name Validation
        if (!editForm.bankName.trim()) {
            errors.bankName = "Bank name is required";
        }

        // Account Holder Name Validation
        if (!editForm.accountHolderName.trim()) {
            errors.accountHolderName = "Account holder name is required";
        } else if (editForm.accountHolderName.trim().length < 3) {
            errors.accountHolderName = "Name must be at least 3 characters";
        }

        // Account Type Validation
        if (!editForm.accountType.trim()) {
            errors.accountType = "Account type is required";
        }

        // Account Number Validation
        if (!editForm.bankAccountNo.trim()) {
            errors.bankAccountNo = "Bank account number is required";
        } else {
            const accountNo = editForm.bankAccountNo.trim();
            // Account number should be numeric and between 9-18 digits
            if (!/^\d+$/.test(accountNo)) {
                errors.bankAccountNo = "Account number must contain only digits";
            } else if (accountNo.length < 9 || accountNo.length > 18) {
                errors.bankAccountNo = "Account number must be 9-18 digits";
            }
        }

        // IFSC Code Validation
        if (!editForm.ifscCode.trim()) {
            errors.ifscCode = "IFSC code is required";
        } else {
            // IFSC Code format: 4 letters + 0 + 6 alphanumeric characters (11 chars total)
            const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            const trimmedIfsc = editForm.ifscCode.trim().toUpperCase();

            if (trimmedIfsc.length !== 11) {
                errors.ifscCode = "IFSC code must be 11 characters";
            } else if (!ifscRegex.test(trimmedIfsc)) {
                errors.ifscCode = "Invalid IFSC code format (e.g., SBIN0001234)";
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveFinancial = async () => {
        if (!validateEditForm()) {
            return;
        }
        setIsSaving(true);
        try {
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) throw new Error("Authentication session expired");

            const authData = JSON.parse(authDataStr);
            if (!authData.token) throw new Error("Invalid session token");

            const apiParams = {
                accountholder: editForm.accountHolderName,
                bank_name: editForm.bankName,
                account_number: editForm.bankAccountNo,
                account_type: editForm.accountType,
                ifsc: editForm.ifscCode
            };

            const response = await updateFinancialInfo(authData.token, apiParams);

            if (response.success) {
                setFinancialInfo({
                    ...editForm,
                    updatedAt: new Date().toISOString() // Optimistic update of date
                });
                setIsEditModalVisible(false);
                setToastMessage("Financial information updated successfully");
                setToastType("success");
                setShowToast(true);
            } else {
                Alert.alert("Error", response.error || "Failed to update profile");
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Something went wrong");
        } finally {
            setIsSaving(false);
        }
    };



    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDark ? ["#0F172A", "#1E293B", "#0F172A"] : ["#F8FAFC", "#F1F5F9", "#E2E8F0"]}
                style={styles.background}
            />

            <AppHeader title="Financial Information" onBack={() => router.back()} />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Check if financial info is empty */}
                {!financialInfo.bankAccountNo && !financialInfo.bankName && !financialInfo.ifscCode ? (
                    // Empty State
                    <AnimatedRN.View entering={FadeInUp.duration(600).springify()} style={styles.emptyStateContainer}>
                        <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                            <Ionicons name="card-outline" size={64} color={colors.primary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Bank Account Found</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                            Securely add your bank account to receive scholarship funds directly and track your disbursements.
                        </Text>
                        <TouchableOpacity
                            style={[styles.addAccountBtn, { backgroundColor: colors.primary }]}
                            onPress={openEditModal}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add" size={24} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.addAccountBtnText}>Configure Bank Account</Text>
                        </TouchableOpacity>

                        <View style={[styles.notificationBox, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#EFF6FF', borderColor: isDark ? colors.border : '#DBEAFE' }]}>
                            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                            <Text style={[styles.notificationText, { color: isDark ? colors.textSecondary : '#1E40AF' }]}>
                                Your data is protected with 256-bit encryption. We only use this for scholarship disbursements.
                            </Text>
                        </View>
                    </AnimatedRN.View>
                ) : (
                    // Bank Card Display
                    <>
                        <AnimatedRN.View entering={FadeInUp.delay(200).duration(800).springify()} style={styles.cardContainer}>
                            <LinearGradient
                                colors={getBankGradient(financialInfo.bankName)}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.bankCard}
                            >
                                {/* Patterns overlay */}
                                <View style={styles.cardPattern} />
                                
                                {/* Card Header */}
                                <View style={styles.cardHeader}>
                                    <View style={styles.bankIdentity}>
                                        <View style={styles.bankLogoPlaceholder}>
                                            <Ionicons name="business" size={18} color="#fff" />
                                        </View>
                                        <View>
                                            <Text style={styles.bankLabel}>Bank Name</Text>
                                            <Text style={styles.bankName} numberOfLines={1}>
                                                {financialInfo.bankName || "Your Bank Name"}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.modernEditBtn}
                                        onPress={openEditModal}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="pencil" size={16} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                {/* Chip & NFC */}
                                <View style={styles.cardTechRow}>
                                    <LinearGradient 
                                        colors={['#FFD700', '#FDB931', '#977A1A']} 
                                        style={styles.chipPremium} 
                                    />
                                    <Ionicons name="wifi-outline" size={22} color="rgba(255,255,255,0.6)" style={{ transform: [{ rotate: '90deg' }] }} />
                                </View>

                                {/* Account Number */}
                                <View style={styles.accountNumberRow}>
                                    <Text style={styles.accountNumberText}>
                                        {financialInfo.bankAccountNo ? (financialInfo.bankAccountNo.match(/.{1,4}/g)?.join('  ') || financialInfo.bankAccountNo) : "****  ****  ****  ****"}
                                    </Text>
                                </View>

                                {/* Footer Highlights */}
                                <View style={styles.glassFooter}>
                                    <View style={styles.footerCol}>
                                        <Text style={styles.footerLabel}>ACCOUNT HOLDER</Text>
                                        <Text style={styles.footerValue} numberOfLines={1}>
                                            {financialInfo.accountHolderName.toUpperCase() || "NOT SET"}
                                        </Text>
                                    </View>
                                    <View style={styles.footerCol}>
                                        <Text style={styles.footerLabel}>IFSC CODE</Text>
                                        <Text style={styles.footerValue}>
                                            {financialInfo.ifscCode || "IFSCXXXX"}
                                        </Text>
                                    </View>
                                </View>
                            </LinearGradient>

                            {financialInfo.updatedAt && (
                                <View style={styles.updateBadgeContainer}>
                                    <View style={[styles.updateBadge, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                                        <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                                        <Text style={[styles.updateBadgeText, { color: colors.textSecondary }]}>
                                            Verified: {new Date(financialInfo.updatedAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </AnimatedRN.View>

                        <AnimatedRN.View entering={FadeInUp.delay(400).duration(800).springify()} style={styles.infoSection}>
                            <View style={[styles.premiumNotice, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF', borderColor: isDark ? colors.border : '#E2E8F0' }]}>
                                <View style={[styles.noticeIcon, { backgroundColor: isDark ? '#1D4ED8' : '#DBEAFE' }]}>
                                    <Ionicons name="information-circle" size={22} color={isDark ? '#fff' : '#2563EB'} />
                                </View>
                                <View style={styles.noticeContent}>
                                    <Text style={[styles.noticeTitle, { color: colors.text }]}>Verification Active</Text>
                                    <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                                        These details are used for all fund transfers. Ensure the account remains active to avoid payment delays.
                                    </Text>
                                </View>
                            </View>
                        </AnimatedRN.View>
                    </>
                )}
            </ScrollView>

            <Modal
                visible={isEditModalVisible}
                animationType="slide"
                onRequestClose={() => setIsEditModalVisible(false)}
            >
                <View style={[styles.fullScreenModal, { backgroundColor: colors.background }]}>
                    {/* Header */}
                    <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            {financialInfo.bankAccountNo ? 'Edit Bank Details' : 'Add Bank Account'}
                        </Text>
                        <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.closeBtn}>
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Form Content */}
                    <ScrollView
                        style={styles.modalBody}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <CustomTextInput
                            label="Bank Name *"
                            value={editForm.bankName}
                            onChangeText={(val: string) => handleEditChange("bankName", val)}
                            style={styles.input}
                            error={validationErrors.bankName}
                            placeholder="Enter your bank name"
                        />

                        <CustomTextInput
                            label="Account Holder Name *"
                            value={editForm.accountHolderName}
                            onChangeText={(val: string) => handleEditChange("accountHolderName", val)}
                            style={styles.input}
                            error={validationErrors.accountHolderName}
                            placeholder="As per bank passbook"
                        />
                        <CustomTextInput
                            label="Account Number *"
                            value={editForm.bankAccountNo}
                            onChangeText={(val: string) => handleEditChange("bankAccountNo", val)}
                            keyboardType="numeric"
                            style={styles.input}
                            error={validationErrors.bankAccountNo}
                            placeholder="Enter full account number"
                        />
                        <CustomTextInput
                            label="Account Type *"
                            value={editForm.accountType}
                            onChangeText={(val: string) => handleEditChange("accountType", val)}
                            style={styles.input}
                            error={validationErrors.accountType}
                            placeholder="e.g. Savings, Current"
                        />
                        <CustomTextInput
                            label="IFSC Code *"
                            value={editForm.ifscCode}
                            onChangeText={(val: string) => {
                                const formatted = val.toUpperCase().slice(0, 11);
                                handleEditChange("ifscCode", formatted);
                            }}
                            autoCapitalize="characters"
                            style={styles.input}
                            error={validationErrors.ifscCode}
                            placeholder="e.g. SBIN0001234"
                            maxLength={11}
                        />

                        {/* Info Card */}
                        <View style={[styles.infoCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFF3CD', borderColor: isDark ? colors.border : '#FFC107', marginTop: 10 }]}>
                            <Ionicons name="information-circle" size={24} color={isDark ? colors.primary : '#FFA000'} />
                            <Text style={[styles.infoText, { color: isDark ? colors.textSecondary : '#856404' }]}>
                                Please ensure all details match your bank passbook exactly. This account will be used for scholarship fund transfers.
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Footer Buttons */}
                    <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 20, backgroundColor: colors.background, borderTopColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.cancelBtn, { borderColor: colors.border, backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}
                            onPress={() => setIsEditModalVisible(false)}
                        >
                            <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                        <Button
                            title={isSaving ? "Saving..." : (financialInfo.bankAccountNo ? "Update Details" : "Add Account")}
                            onPress={handleSaveFinancial}
                            variant="primary"
                            style={{ flex: 1 }}
                            disabled={isSaving}
                            loading={isSaving}
                        />
                    </View>
                </View>
            </Modal>


            <Toast
                message={toastMessage}
                type={toastType}
                visible={showToast}
                onHide={() => setShowToast(false)}
                duration={3000}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    cardContainer: {
        marginBottom: 20,
        marginTop: 20,
        width: '100%',
    },
    bankCard: {
        borderRadius: 24,
        padding: 24,
        minHeight: 230,
        width: '100%',
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
        position: 'relative',
        overflow: 'hidden',
    },
    cardPattern: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.05,
        backgroundColor: 'rgba(255,255,255,0.1)',
        // Could add a real pattern image here
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        zIndex: 2,
    },
    bankIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    bankLogoPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    bankLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    bankName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    modernEditBtn: {
        width: 34,
        height: 34,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    cardTechRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginTop: 10,
        zIndex: 2,
    },
    chipPremium: {
        width: 45,
        height: 34,
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    accountNumberRow: {
        marginVertical: 15,
        zIndex: 2,
    },
    accountNumberText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '600',
        letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    glassFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.12)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        zIndex: 2,
    },
    footerCol: {
        flex: 1,
    },
    footerLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    footerValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    updateBadgeContainer: {
        alignItems: 'center',
        marginTop: 16,
    },
    updateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 20,
    },
    updateBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    infoSection: {
        marginTop: 10,
        paddingBottom: 40,
    },
    premiumNotice: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        gap: 16,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 1,
    },
    noticeIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noticeContent: {
        flex: 1,
    },
    noticeTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    noticeText: {
        fontSize: 13,
        lineHeight: 18,
    },
    // Empty State
    emptyStateContainer: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 2,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 35,
        paddingHorizontal: 15,
    },
    addAccountBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        paddingHorizontal: 32,
        borderRadius: 16,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 6,
    },
    addAccountBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    notificationBox: {
        marginTop: 40,
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
        alignItems: 'center',
    },
    notificationText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '500',
    },

    // Bank Dropdown Styles
    label: {
        marginBottom: 8,
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 56,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 6,
    },

    // Inline Bank Picker Styles
    inlineBankPicker: {
        marginTop: 12,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        maxHeight: 350,
    },
    inlineSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        gap: 10,
    },
    inlineSearchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 0,
    },
    inlineBankList: {
        maxHeight: 280,
    },
    inlineBankOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 10,
        borderBottomWidth: 0.5,
    },
    inlineBankOptionText: {
        fontSize: 15,
        flex: 1,
    },
    inlineNoResults: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        gap: 12,
    },
    inlineNoResultsText: {
        fontSize: 14,
        textAlign: 'center',
    },
    // Modal Styles
    fullScreenModal: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    closeBtn: {
        padding: 4,
    },
    modalBody: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    input: {
        marginBottom: 20,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontWeight: '700',
        fontSize: 16,
    },
    infoCard: {
        flexDirection: 'row',
        padding: 18,
        borderRadius: 18,
        borderWidth: 1,
        gap: 12,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '500',
    },
});
