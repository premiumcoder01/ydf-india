import { AppHeader, Button, CustomTextInput, Toast } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getFinancialInfo, updateFinancialInfo } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

interface ValidationErrors {
    [key: string]: string;
}

export default function StudentProfileFinancialScreen() {
    const { isDark, colors } = useTheme();

    const [financialInfo, setFinancialInfo] = useState({
        bankAccountNo: "",
        ifscCode: "",
        bankName: "",
        branchName: "",
        accountHolderName: "",
    });

    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
                                bankAccountNo: data.account_number || "",
                                ifscCode: data.ifsc || "",
                                bankName: data.bank_name || "",
                                branchName: data.branch_name || "",
                                accountHolderName: data.accountholder || "",
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

    // Handlers
    const handleFinancialInfoChange = useCallback(
        (field: keyof typeof financialInfo, value: string) => {
            setFinancialInfo((prev) => ({ ...prev, [field]: value }));
            setHasUnsavedChanges(true);

            if (validationErrors[field]) {
                setValidationErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[field];
                    return newErrors;
                });
            }
        },
        [validationErrors]
    );

    const validateFinancialInfo = (): boolean => {
        const errors: ValidationErrors = {};

        if (!financialInfo.bankAccountNo.trim()) errors.bankAccountNo = "Bank account number is required";
        if (!financialInfo.ifscCode.trim()) errors.ifscCode = "IFSC code is required";
        if (!financialInfo.bankName.trim()) errors.bankName = "Bank name is required";
        if (!financialInfo.branchName.trim()) errors.branchName = "Branch name is required";
        if (!financialInfo.accountHolderName.trim()) errors.accountHolderName = "Account holder name is required";

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveFinancial = async () => {
        if (!validateFinancialInfo()) {
            setToastMessage("Please fix the errors before saving");
            setToastType("error");
            setShowToast(true);
            return;
        }
        setIsSaving(true);
        try {
            const authDataStr = await AsyncStorage.getItem("authData");
            if (!authDataStr) throw new Error("Authentication session expired");

            const authData = JSON.parse(authDataStr);
            if (!authData.token) throw new Error("Invalid session token");

            const apiParams = {
                accountholder: financialInfo.accountHolderName,
                bank_name: financialInfo.bankName,
                account_number: financialInfo.bankAccountNo,
                ifsc: financialInfo.ifscCode
            };

            const response = await updateFinancialInfo(authData.token, apiParams);

            if (response.success) {
                setHasUnsavedChanges(false);
                setToastMessage("Financial information updated successfully");
                setToastType("success");
                setShowToast(true);

                // Navigate back after delay
                setTimeout(() => {
                    router.back();
                }, 1500);
            } else {
                setToastMessage(response.error || "Failed to update profile");
                setToastType("error");
                setShowToast(true);
            }
        } catch (error: any) {
            setToastMessage(error.message || "Something went wrong");
            setToastType("error");
            setShowToast(true);
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

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bank Details</Text>
                            {hasUnsavedChanges && (
                                <View style={styles.unsavedBadge}>
                                    <Text style={styles.unsavedText}>Unsaved</Text>
                                </View>
                            )}
                        </View>
                        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <CustomTextInput
                                label="Account Holder Name *"
                                value={financialInfo.accountHolderName}
                                onChangeText={(val: string) => handleFinancialInfoChange("accountHolderName", val)}
                                style={styles.input}
                                error={validationErrors.accountHolderName}
                                placeholder="Name as per Bank Passbook"
                            />
                            <CustomTextInput
                                label="Account Number *"
                                value={financialInfo.bankAccountNo}
                                onChangeText={(val: string) => handleFinancialInfoChange("bankAccountNo", val)}
                                keyboardType="numeric"
                                style={styles.input}
                                error={validationErrors.bankAccountNo}
                            />
                            <CustomTextInput
                                label="IFSC Code *"
                                value={financialInfo.ifscCode}
                                onChangeText={(val: string) => handleFinancialInfoChange("ifscCode", val)}
                                autoCapitalize="characters"
                                style={styles.input}
                                error={validationErrors.ifscCode}
                            />
                            <CustomTextInput
                                label="Bank Name *"
                                value={financialInfo.bankName}
                                onChangeText={(val: string) => handleFinancialInfoChange("bankName", val)}
                                style={styles.input}
                                error={validationErrors.bankName}
                            />
                            <CustomTextInput
                                label="Branch Name *"
                                value={financialInfo.branchName}
                                onChangeText={(val: string) => handleFinancialInfoChange("branchName", val)}
                                style={styles.input}
                                error={validationErrors.branchName}
                            />
                        </View>
                    </View>

                    <Button
                        title={isSaving ? "Saving..." : "Save Financial Info"}
                        onPress={handleSaveFinancial}
                        variant="primary"
                        style={styles.saveButton}
                        disabled={isSaving || !hasUnsavedChanges}
                    />

                </ScrollView>
            </KeyboardAvoidingView>

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
    scrollView: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
        marginTop: 20,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    unsavedBadge: {
        backgroundColor: "#FF9800" + "20",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    unsavedText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#FF9800",
    },
    formCard: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    input: {
        marginBottom: 16,
    },
    saveButton: {
        marginHorizontal: 20,
        marginBottom: 40,
    },
});
