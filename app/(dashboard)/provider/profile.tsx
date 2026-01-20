import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getDonorKycStatus, getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Animated, Dimensions, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { width } = Dimensions.get('window');

export default function ProviderProfileScreen() {
  const { isDark, colors } = useTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const scrollY = new Animated.Value(0);
  const [loading, setLoading] = useState(true);

  const [providerData, setProviderData] = useState({
    name: "Provider",
    email: "",
    contact: "",
    organization: "Organization",
    kycStatus: "New", // Default to "New"
    profilePhoto: null as string | null,
    bankInfo: { account: "**** 4321", ifsc: "HDFC0001234" },
  });

  // Fetch provider profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const authDataString = await AsyncStorage.getItem("authData");
        if (!authDataString) {
          setLoading(false);
          return;
        }

        const authData = JSON.parse(authDataString);
        const token = authData?.token;

        if (!token) {
          setLoading(false);
          return;
        }

        // Fetch User Profile
        const response = await getUserProfile(token);
        if (response.success && response.data?.user) {
          const user = response.data.user;
          setProviderData(prev => ({
            ...prev,
            organization: user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim() || prev.organization,
            email: user.email || prev.email,
            contact: user.phone || user.phone1 || prev.contact,
            profilePhoto: user.profileimageurl || null,
          }));
        }

        // Fetch KYC Status
        try {
          const kycResponse = await getDonorKycStatus(token);
          if (kycResponse.success && kycResponse.data) {
            const kycData = kycResponse.data.data ? kycResponse.data.data : kycResponse.data;
            const rawStatus = kycData.status || "New";
            setProviderData(prev => ({ ...prev, kycStatus: rawStatus }));
          }
        } catch (kycError) {
          console.error("Error fetching KYC status:", kycError);
        }

      } catch (error) {
        console.error("Error fetching provider profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleEditProfile = () => router.push("/(dashboard)/provider/edit-profile");
  const handleLogout = () => setShowLogoutModal(true);
  const confirmLogout = async () => {
    try {
      setShowLogoutModal(false);

      // Clear authData from AsyncStorage
      await AsyncStorage.removeItem("authData");

      // Navigate to welcome screen
      router.replace("/(auth)/welcome");
    } catch (error) {
      console.error("Error during logout:", error);
      // Even if there's an error, try to navigate to welcome screen
      router.replace("/(auth)/welcome");
    }
  };
  const cancelLogout = () => setShowLogoutModal(false);

  /* 
   * Updated kycConfig to handle API statuses. 
   * Maps colloquial statuses to display config.
   */
  const kycConfig: Record<string, {
    gradient: readonly [string, string];
    icon: keyof typeof Ionicons.glyphMap;
    bg: string;
    border: string;
    label: string;
  }> = {
    approved: {
      gradient: ['#10B981', '#059669'],
      icon: 'shield-checkmark',
      bg: '#D1FAE5',
      border: '#10B981',
      label: 'Verified'
    },
    verified: { // Fallback/Legacy
      gradient: ['#10B981', '#059669'],
      icon: 'shield-checkmark',
      bg: '#D1FAE5',
      border: '#10B981',
      label: 'Verified'
    },
    pending: {
      gradient: ['#F59E0B', '#D97706'],
      icon: 'time',
      bg: '#FEF3C7',
      border: '#F59E0B',
      label: 'Under Review'
    },
    "under review": { // Legacy
      gradient: ['#3B82F6', '#2563EB'],
      icon: 'time',
      bg: '#DBEAFE',
      border: '#3B82F6',
      label: 'Under Review'
    },
    rejected: {
      gradient: ['#EF4444', '#B91C1C'],
      icon: 'alert-circle',
      bg: '#FEE2E2',
      border: '#EF4444',
      label: 'Rejected'
    },
    new: {
      gradient: ['#6B7280', '#4B5563'],
      icon: 'ellipse-outline',
      bg: '#F3F4F6',
      border: '#9CA3AF',
      label: 'Not Submitted'
    }
  };

  // Helper to safely get config
  const getKycConfig = (status: string) => {
    const normalized = status.toLowerCase();
    return kycConfig[normalized] || kycConfig['new'];
  };

  const currentKyc = getKycConfig(providerData.kycStatus);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  const ActionButton = ({ icon, label, onPress, color, isLogout = false }: any) => (
    <TouchableOpacity
      style={[styles.modernActionItem, { borderBottomColor: isDark ? colors.border : '#f5f5f5' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.modernActionIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.modernActionText, { color: colors.text }, isLogout && { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Profile"
        subtitle="Manage your account"
        rightElement={
          <TouchableOpacity
            onPress={() => router.push("/(dashboard)/provider/settings")}
            style={[styles.settingsBtn, { backgroundColor: isDark ? colors.card : "rgba(255, 255, 255, 0.9)" }]}
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Premium Profile Header with Gradient */}
        <Animated.View
          style={[
            styles.profileHeader,
            {
              opacity: headerOpacity,
              transform: [{ scale: headerScale }]
            }
          ]}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            <View style={styles.avatarContainer}>
              {providerData.profilePhoto ? (
                <Image source={{ uri: providerData.profilePhoto }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? colors.background : "#fff", borderColor: isDark ? colors.background : "#fff" }]}>
                  <Ionicons name="business" size={48} color={isDark ? colors.primary : "#667eea"} />
                </View>
              )}
              <View style={styles.editAvatarBadge}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </View>

            <Text style={styles.name}>{providerData.organization}</Text>
            <Text style={styles.email}>{providerData.email}</Text>
            <Text style={styles.contact}>{providerData.contact}</Text>

            <View style={[styles.premiumBadge, { backgroundColor: currentKyc.bg, borderColor: currentKyc.border }]}>
              <Ionicons name={currentKyc.icon} size={16} color={currentKyc.border} />
              <Text style={[styles.badgeText, { color: currentKyc.border }]}>
                KYC: {currentKyc.label}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>



        {/* Organization Details - Modern Card */}
        <View style={styles.modernSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Organization Details</Text>
          </View>

          <View style={[styles.modernCard, { backgroundColor: isDark ? colors.card : "#fff", borderColor: colors.border }]}>
            <InfoRow icon="business-outline" label="Organization" value={providerData.organization} color="#2196F3" />
            <InfoRow icon="mail-outline" label="Email Address" value={providerData.email} color="#4CAF50" />
            <InfoRow icon="call-outline" label="Contact Number" value={providerData.contact} color="#FF9800" />
          </View>
        </View>

        {/* Bank Information - Secure Card */}
        {/* <View style={styles.modernSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bank Information</Text>
            <View style={[styles.secureLabel, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#D1FAE5' }]}>
              <Ionicons name="lock-closed" size={12} color="#10B981" />
              <Text style={styles.secureLabelText}>Secured</Text>
            </View>
          </View>

          <View style={[styles.modernCard, { backgroundColor: isDark ? colors.card : "#fff", borderColor: colors.border }]}>
            <InfoRow icon="card-outline" label="Account Number" value={providerData.bankInfo.account} color="#9C27B0" />
            <InfoRow icon="key-outline" label="IFSC Code" value={providerData.bankInfo.ifsc} color="#00BFA5" isLast />
          </View>
        </View> */}

        {/* Quick Actions - Modern Grid */}
        <View style={styles.modernSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={[styles.modernActionsCard, { backgroundColor: isDark ? colors.card : "#fff", borderColor: colors.border, marginTop: 15 }]}>
            <ActionButton icon="create-outline" label="Edit Profile" onPress={handleEditProfile} color="#2196F3" />
            <ActionButton icon="help-circle-outline" label="Help & Support" onPress={() => router.push("/(dashboard)/provider/help-support")} color="#673AB7" />
            <ActionButton icon="document-text-outline" label="Terms & Conditions" onPress={() => router.push("/(dashboard)/provider/terms-conditions")} color="#795548" />
            <ActionButton icon="information-circle-outline" label="About" onPress={() => router.push("/(dashboard)/provider/about")} color="#0091EA" />
            <ActionButton icon="log-out-outline" label="Logout" onPress={handleLogout} color="#F44336" isLogout />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* Premium Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={cancelLogout}>
        <BlurView intensity={isDark ? 40 : 80} style={styles.modalOverlay}>
          <View style={[styles.modernModalContent, { backgroundColor: isDark ? colors.card : "#fff" }]}>
            <View style={styles.modernModalIcon}>
              <LinearGradient
                colors={['#FF6B6B', '#F44336']}
                style={styles.modalIconGradient}
              >
                <Ionicons name="log-out-outline" size={40} color="#fff" />
              </LinearGradient>
            </View>

            <Text style={[styles.modernModalTitle, { color: colors.text }]}>Confirm Logout</Text>
            <Text style={[styles.modernModalMessage, { color: colors.textSecondary }]}>
              Are you sure you want to logout? You'll need to sign in again to access your account.
            </Text>

            <View style={styles.modernModalButtons}>
              <TouchableOpacity
                style={[styles.modernModalButton, styles.modernCancelButton, { backgroundColor: isDark ? colors.background : '#f5f5f5' }]}
                onPress={cancelLogout}
                activeOpacity={0.8}
              >
                <Text style={[styles.modernCancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modernModalButton, styles.modernLogoutButton]}
                onPress={confirmLogout}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#F44336']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.logoutButtonGradient}
                >
                  <Text style={styles.modernLogoutButtonText}>Logout</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

const InfoRow = ({ icon, label, value, color, isLast = false }: any) => {
  const { isDark, colors } = useTheme();
  return (
    <View style={[styles.infoRow, !isLast && [styles.infoRowBorder, { borderBottomColor: isDark ? colors.border : '#f5f5f5' }]]}>
      <View style={[styles.infoIconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.infoTextContainer}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  gradientBackground: {
    padding: 32,
    alignItems: "center",
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: '#fff',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    marginBottom: 4,
  },
  contact: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 16,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    gap: 6,
  },
  badgeText: {
    fontWeight: "700",
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  modernSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#333",
  },
  editLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  secureLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  secureLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  modernCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "700",
  },
  modernActionsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  modernActionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  modernActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  modernActionText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modernModalContent: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  modernModalIcon: {
    marginBottom: 20,
  },
  modalIconGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  modernModalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#333",
    marginBottom: 12,
  },
  modernModalMessage: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  modernModalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modernModalButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modernCancelButton: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernLogoutButton: {
    overflow: 'hidden',
  },
  logoutButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernCancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
  },
  modernLogoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});