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
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ValidationErrors {
    [key: string]: string;
}

export default function StudentProfileFinancialScreen() {
    const { isDark, colors } = useTheme();
    const insets = useSafeAreaInsets();

    const [financialInfo, setFinancialInfo] = useState({
        bankAccountNo: "",
        ifscCode: "",
        bankName: "",
        accountHolderName: "",
        updatedAt: "",
    });

    // Edit Form State
    const [editForm, setEditForm] = useState({
        bankAccountNo: "",
        ifscCode: "",
        bankName: "",
        accountHolderName: "",
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

        if (!editForm.bankAccountNo.trim()) {
            errors.bankAccountNo = "Bank account number is required";
        }

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

        if (!editForm.bankName.trim()) {
            errors.bankName = "Bank name is required";
        }

        if (!editForm.accountHolderName.trim()) {
            errors.accountHolderName = "Account holder name is required";
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

    const formatCardNumber = (number: string) => {
        if (!number) return "•••• •••• •••• ••••";
        // Show last 4 digits, mask rest
        const last4 = number.slice(-4);
        const masked = "•••• •••• •••• " + last4;
        return masked;
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
                style={styles.background}
                locations={[0, 0.3, 1]}
            />

            <AppHeader title="Financial Information" onBack={() => router.back()} />

            <ScrollView style={styles.content}>
                <View style={styles.cardContainer}>
                    <LinearGradient
                        colors={['#1a237e', '#283593', '#3949ab']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.bankCard}
                    >
                        {/* Card Header: Bank Name & Edit */}
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.bankLabel}>Bank Name</Text>
                                <Text style={styles.bankName}>
                                    {financialInfo.bankName || "Your Bank Name"}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.editIconBtn}
                                onPress={openEditModal}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="pencil" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* Chip & Contactless */}
                        <View style={styles.cardChipRow}>
                            <View style={styles.chip} />
                            <Ionicons name="wifi" size={24} color="rgba(255,255,255,0.6)" style={{ transform: [{ rotate: '90deg' }] }} />
                        </View>




                        {/* Card Number */}
                        <Text style={styles.cardNumber}>
                            {financialInfo.bankAccountNo ? (financialInfo.bankAccountNo.match(/.{1,4}/g)?.join(' ') || financialInfo.bankAccountNo) : "•••• •••• •••• ••••"}
                        </Text>

                        {/* Card Footer: Holder & IFSC */}
                        <View style={styles.cardFooter}>
                            <View>
                                <Text style={styles.cardLabel}>Account Holder</Text>
                                <Text style={styles.cardValue} numberOfLines={1}>
                                    {financialInfo.accountHolderName || "STUDENT NAME"}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.cardLabel}>IFSC Code</Text>
                                <Text style={styles.cardValue}>
                                    {financialInfo.ifscCode || "IFSCXXXX"}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.circleGreeting, { right: -50, top: -50 }]} />
                        <View style={[styles.circleGreeting, { left: -50, bottom: -50 }]} />
                    </LinearGradient>
                    {financialInfo.updatedAt ? (
                        <View style={{ marginTop: 12, alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                Last Updated: {new Date(financialInfo.updatedAt).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.infoSection}>
                    <View style={[styles.infoCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderColor: colors.border }]}>
                        <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            This bank account will be used for transferring scholarship funds. Please ensure the details are correct and the account is active.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={isEditModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsEditModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Bank Details</Text>
                            <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <CustomTextInput
                                label="Bank Name"
                                value={editForm.bankName}
                                onChangeText={(val: string) => handleEditChange("bankName", val)}
                                style={styles.input}
                                error={validationErrors.bankName}
                                placeholder="e.g. State Bank of India"
                            />
                            <CustomTextInput
                                label="Account Holder Name"
                                value={editForm.accountHolderName}
                                onChangeText={(val: string) => handleEditChange("accountHolderName", val)}
                                style={styles.input}
                                error={validationErrors.accountHolderName}
                                placeholder="As per bank passbook"
                            />
                            <CustomTextInput
                                label="Account Number"
                                value={editForm.bankAccountNo}
                                onChangeText={(val: string) => handleEditChange("bankAccountNo", val)}
                                keyboardType="numeric"
                                style={styles.input}
                                error={validationErrors.bankAccountNo}
                                placeholder="Enter full account number"
                            />
                            <CustomTextInput
                                label="IFSC Code"
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
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.cancelBtn, { borderColor: colors.border }]}
                                onPress={() => setIsEditModalVisible(false)}
                            >
                                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <Button
                                title={isSaving ? "Saving..." : "Save Details"}
                                onPress={handleSaveFinancial}
                                variant="primary"
                                style={{ flex: 1 }}
                                disabled={isSaving}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
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
        padding: 20,
    },
    cardContainer: {
        marginBottom: 30,
        marginTop: 10,
    },
    bankCard: {
        borderRadius: 20,
        padding: 24,
        minHeight: 220,
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
        position: 'relative',
        overflow: 'hidden',
    },
    circleGreeting: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255,255,255,0.05)',
        zIndex: 0,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        zIndex: 1,
    },
    bankLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    bankName: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    editIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    cardChipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 10,
        zIndex: 1,
    },
    chip: {
        width: 45,
        height: 34,
        borderRadius: 6,
        backgroundColor: '#e0c9a6', // gold-ish
        borderWidth: 1,
        borderColor: '#bfa780',
    },
    cardNumber: {
        color: '#fff',
        fontSize: 22,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        letterSpacing: 2,
        marginVertical: 10,
        zIndex: 1,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        zIndex: 1,
    },
    cardLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    cardValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 1,
    },
    updatedAtContainer: {
        position: 'absolute',
        top: 24,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    updatedAtText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
    },
    infoSection: {
        paddingHorizontal: 5,
    },
    infoCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 20,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 5,
    },
    modalBody: {
        maxHeight: 400,
    },
    input: {
        marginBottom: 16,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    cancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontWeight: '600',
        fontSize: 16,
    },
});
