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
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Comprehensive list of Indian Banks
const INDIAN_BANKS = [
    // Public Sector Banks
    "State Bank of India (SBI)",
    "Punjab National Bank (PNB)",
    "Bank of Baroda (BOB)",
    "Canara Bank",
    "Union Bank of India",
    "Indian Bank",
    "Bank of India (BOI)",
    "Central Bank of India",
    "Indian Overseas Bank (IOB)",
    "UCO Bank",
    "Bank of Maharashtra",
    "Punjab & Sind Bank",

    // Private Sector Banks
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Kotak Mahindra Bank",
    "IndusInd Bank",
    "Yes Bank",
    "IDFC First Bank",
    "Federal Bank",
    "RBL Bank",
    "South Indian Bank",
    "Karur Vysya Bank",
    "City Union Bank",
    "Tamilnad Mercantile Bank",
    "Lakshmi Vilas Bank",
    "Nainital Bank",
    "Dhanlaxmi Bank",
    "Jammu & Kashmir Bank",
    "Karnataka Bank",
    "Bandhan Bank",
    "CSB Bank",
    "DCB Bank",

    // Small Finance Banks
    "AU Small Finance Bank",
    "Equitas Small Finance Bank",
    "Ujjivan Small Finance Bank",
    "Suryoday Small Finance Bank",
    "Utkarsh Small Finance Bank",
    "ESAF Small Finance Bank",
    "Fincare Small Finance Bank",
    "Jana Small Finance Bank",
    "North East Small Finance Bank",
    "Capital Small Finance Bank",
    "Shivalik Small Finance Bank",

    // Payment Banks
    "Paytm Payments Bank",
    "Airtel Payments Bank",
    "India Post Payments Bank",
    "Fino Payments Bank",
    "Jio Payments Bank",
    "NSDL Payments Bank",

    // Foreign Banks
    "Citibank",
    "HSBC Bank",
    "Standard Chartered Bank",
    "Deutsche Bank",
    "Barclays Bank",
    "Bank of America",
    "American Express Banking Corp",
    "DBS Bank",
    "Mizuho Bank",
    "MUFG Bank",
    "Sumitomo Mitsui Banking Corporation",
    "BNP Paribas",
    "Credit Suisse",
    "Royal Bank of Scotland",
    "UBS AG",
    "Societe Generale",

    // Cooperative Banks
    "Saraswat Cooperative Bank",
    "Cosmos Cooperative Bank",
    "Abhyudaya Cooperative Bank",
    "TJSB Sahakari Bank",
    "Bharat Cooperative Bank",
    "Gujarat State Cooperative Bank",
    "Maharashtra State Cooperative Bank",
    "Karnataka State Cooperative Bank",
    "Andhra Pradesh State Cooperative Bank",
    "Tamil Nadu State Cooperative Bank",

    // Regional Rural Banks (Major ones)
    "Andhra Pradesh Grameena Vikas Bank",
    "Andhra Pragathi Grameena Bank",
    "Arunachal Pradesh Rural Bank",
    "Aryavart Bank",
    "Assam Gramin Vikash Bank",
    "Bangiya Gramin Vikash Bank",
    "Baroda Gujarat Gramin Bank",
    "Baroda Rajasthan Kshetriya Gramin Bank",
    "Baroda UP Bank",
    "Chaitanya Godavari Grameena Bank",
    "Chhattisgarh Rajya Gramin Bank",
    "Dakshin Bihar Gramin Bank",
    "Ellaquai Dehati Bank",
    "Himachal Pradesh Gramin Bank",
    "J&K Grameen Bank",
    "Jharkhand Rajya Gramin Bank",
    "Karnataka Gramin Bank",
    "Karnataka Vikas Grameena Bank",
    "Kerala Gramin Bank",
    "Madhya Pradesh Gramin Bank",
    "Madhyanchal Gramin Bank",
    "Maharashtra Gramin Bank",
    "Manipur Rural Bank",
    "Meghalaya Rural Bank",
    "Mizoram Rural Bank",
    "Nagaland Rural Bank",
    "Odisha Gramya Bank",
    "Paschim Banga Gramin Bank",
    "Prathama UP Gramin Bank",
    "Puduvai Bharathiar Grama Bank",
    "Punjab Gramin Bank",
    "Rajasthan Marudhara Gramin Bank",
    "Saptagiri Grameena Bank",
    "Saurashtra Gramin Bank",
    "Telangana Grameena Bank",
    "Tripura Gramin Bank",
    "Utkal Grameen Bank",
    "Uttar Bihar Gramin Bank",
    "Uttarakhand Gramin Bank",
    "Uttarbanga Kshetriya Gramin Bank",
    "Vidharbha Konkan Gramin Bank",
].sort(); // Alphabetically sorted

interface ValidationErrors {
    [key: string]: string;
}

// Function to get brand colors based on bank name
const getBankGradient = (bankName: string): readonly [string, string, ...string[]] => {
    const name = bankName.toLowerCase();

    // SBI - Blue
    if (name.includes('state bank of india') || name.includes('sbi')) {
        return ['#1a237e', '#283593', '#1e88e5'];
    }
    // HDFC - Navy Blue
    if (name.includes('hdfc')) {
        return ['#00103a', '#002663', '#004c8f'];
    }
    // ICICI - Orange/Maroon
    if (name.includes('icici')) {
        return ['#8B1D15', '#C03308', '#F37E20'];
    }
    // Axis - Burgundy
    if (name.includes('axis')) {
        return ['#58081f', '#8e1233', '#ae2848'];
    }
    // Kotak - Red
    if (name.includes('kotak')) {
        return ['#a30000', '#da1710', '#ed1c24'];
    }
    // PNB - Maroon
    if (name.includes('punjab national') || name.includes('pnb')) {
        return ['#6e1220', '#a21a2e', '#cf2840'];
    }
    // Bank of Baroda - Orange
    if (name.includes('baroda') || name.includes('bob')) {
        return ['#d35400', '#e67e22', '#f39c12'];
    }
    // IDFC First - Red/Burnt Orange
    if (name.includes('idfc')) {
        return ['#680811', '#93121b', '#b91c26'];
    }
    // Union Bank - Red/Dark Blue
    if (name.includes('union bank')) {
        return ['#c0392b', '#2980b9', '#1a237e'];
    }
    // Canara - Blue/Yellow
    if (name.includes('canara')) {
        return ['#004886', '#0065bd', '#007fff'];
    }
    // IndusInd - Crimson
    if (name.includes('indusind')) {
        return ['#570814', '#851020', '#b31b30'];
    }
    // Yes Bank - Deep Blue
    if (name.includes('yes bank')) {
        return ['#002d6b', '#0045a5', '#01579b'];
    }
    // Bank of India (BOI) - Blue/Red
    if (name.includes('bank of india') || name.includes('boi')) {
        return ['#003366', '#0055a4', '#d41113'];
    }
    // Central Bank of India - Blue/Yellow
    if (name.includes('central bank')) {
        return ['#004b93', '#0067b1', '#ffcc00'];
    }
    // Indian Bank - Blue/Gold
    if (name.includes('indian bank')) {
        return ['#1a3c61', '#214e7a', '#c29b40'];
    }
    // Bank of Maharashtra - Blue
    if (name.includes('maharashtra')) {
        return ['#004b91', '#0069c0', '#42a5f5'];
    }
    // UCO Bank - Blue/Yellow
    if (name.includes('uco bank')) {
        return ['#005ca8', '#0077c8', '#ffdf00'];
    }
    // Federal Bank - Blue/Green
    if (name.includes('federal bank')) {
        return ['#004a99', '#0067b1', '#579d42'];
    }
    // Bandhan Bank - Blue/Yellow
    if (name.includes('bandhan')) {
        return ['#004b91', '#006bd1', '#ffc107'];
    }
    // IDBI - Green/Blue
    if (name.includes('idbi')) {
        return ['#006a4d', '#004a99', '#00966b'];
    }
    // Paytm - Cyan/Blue
    if (name.includes('paytm')) {
        return ['#00baf2', '#002e6e', '#002970'];
    }
    // Airtel Payments Bank - Red
    if (name.includes('airtel')) {
        return ['#e40000', '#f12711', '#f5af19'];
    }
    // Post Office / IPPB - Blue/Red
    if (name.includes('post office') || name.includes('ippb')) {
        return ['#004fa3', '#e31e24', '#003366'];
    }
    // Karnataka Bank - Red/Yellow
    if (name.includes('karnataka bank')) {
        return ['#ed1c24', '#fcee21', '#c1272d'];
    }
    // AU Small Finance Bank - Deep Blue/Orange
    if (name.includes('au small') || name.includes('au bank')) {
        return ['#152e5d', '#3154a1', '#f15a24'];
    }

    // American Express - Iconic Platinum/Silver
    if (name.includes('american express') || name.includes('amex')) {
        return ['#8e9eab', '#abbaba', '#8e9eab'];
    }

    // RRBs / Grameen Banks - Generic Premium Blue/Light Blue
    if (name.includes('grameen') || name.includes('rural') || name.includes('gramin')) {
        return ['#0d47a1', '#1976d2', '#64b5f6'];
    }

    // Default Premium Royal Gradient
    return ['#1a237e', '#283593', '#3949ab'];
};

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
                colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#fff", "#fff", "#f2c44d"]}
                style={styles.background}
                locations={[0, 0.3, 1]}
            />

            <AppHeader title="Financial Information" onBack={() => router.back()} />

            <ScrollView style={styles.content}>
                {/* Check if financial info is empty */}
                {!financialInfo.bankAccountNo && !financialInfo.bankName && !financialInfo.ifscCode ? (
                    // Empty State
                    <View style={styles.emptyStateContainer}>
                        <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
                            <Ionicons name="card-outline" size={64} color={colors.textSecondary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Bank Account Added</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                            Add your bank account details to receive scholarship funds directly to your account.
                        </Text>
                        <TouchableOpacity
                            style={[styles.addAccountBtn, { backgroundColor: colors.primary }]}
                            onPress={openEditModal}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.addAccountBtnText}>Add Bank Account</Text>
                        </TouchableOpacity>

                        <View style={[styles.infoCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderColor: colors.border, marginTop: 30 }]}>
                            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
                            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                                This bank account will be used for transferring scholarship funds. Please ensure the details are correct and the account is active.
                            </Text>
                        </View>
                    </View>
                ) : (
                    // Bank Card Display
                    <>
                        <View style={styles.cardContainer}>
                            <LinearGradient
                                colors={getBankGradient(financialInfo.bankName)}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.bankCard}
                            >
                                {/* Card Header: Bank Name & Edit */}
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.bankLabel}>Bank Name</Text>
                                        <Text style={styles.bankName} numberOfLines={1} ellipsizeMode="tail">
                                            {financialInfo.bankName || "Your Bank Name"}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.editIconBtn}
                                        onPress={openEditModal}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="create-outline" size={18} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                {/* Chip & Contactless */}
                                <View style={styles.cardChipRow}>
                                    <View style={styles.chip} />
                                    <Ionicons name="wifi" size={20} color="rgba(255,255,255,0.4)" style={{ transform: [{ rotate: '90deg' }] }} />
                                </View>

                                {/* Card Number */}
                                <View style={styles.cardNumberContainer}>
                                    <Text style={styles.cardNumber}>
                                        {financialInfo.bankAccountNo ? (financialInfo.bankAccountNo.match(/.{1,4}/g)?.join(' ') || financialInfo.bankAccountNo) : "•••• •••• •••• ••••"}
                                    </Text>
                                </View>

                                {/* Card Footer: Redesigned Stacking */}
                                <View style={styles.cardFooterNew}>
                                    <View style={styles.glassContainer}>
                                        <View style={styles.holderSection}>
                                            <Text style={styles.cardLabelSmall}>Account Holder</Text>
                                            <Text style={styles.cardValueLarge} numberOfLines={1} ellipsizeMode="tail">
                                                {financialInfo.accountHolderName || "STUDENT NAME"}
                                            </Text>
                                        </View>
                                        <View style={styles.ifscSection}>
                                            <Text style={styles.cardLabelSmall}>IFSC Code</Text>
                                            <Text style={styles.ifscValue}>
                                                {financialInfo.ifscCode || "IFSCXXXX"}
                                            </Text>
                                        </View>
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
        alignItems: 'center',
        zIndex: 1,
        marginBottom: 8,
    },
    bankLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 2,
    },
    bankName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    editIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        position: "absolute",
        top: -15,
        right: -15,
    },
    cardChipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 15,
        zIndex: 1,
    },
    chip: {
        width: 40,
        height: 30,
        borderRadius: 6,
        backgroundColor: '#e0c9a6',
        borderWidth: 1,
        borderColor: '#bfa780',
    },
    cardNumberContainer: {
        marginVertical: 5,
        zIndex: 1,
    },
    cardNumber: {
        color: '#fff',
        fontSize: 20,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        letterSpacing: 3,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    cardFooterNew: {
        marginTop: 15,
        zIndex: 1,
    },
    glassContainer: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 12,
        borderRadius: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    holderSection: {
        flex: 2,
        marginRight: 10,
    },
    ifscSection: {
        flex: 1,

    },
    cardLabelSmall: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2,
    },
    cardValueLarge: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    ifscValue: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
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
        fontWeight: '700',
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
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontWeight: '600',
        fontSize: 16,
    },
    // Empty State Styles
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
        paddingTop: 60,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 10,
    },
    addAccountBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    addAccountBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
});
