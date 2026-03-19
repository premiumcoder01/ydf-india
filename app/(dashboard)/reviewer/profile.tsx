import { useTheme } from "@/context/ThemeContext";
import { getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReviewerHeader } from "../../../components";

export default function ReviewerProfileScreen() {
  const { isDark, colors } = useTheme();
  const inset = useSafeAreaInsets();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Reviewer data state
  const [reviewerData, setReviewerData] = useState({
    name: "Reviewer",
    email: "",
    role: "Reviewer",
    phone: "",
    gender: "",
    state: "",
    profilePhoto: null as string | null,
  });

  // Fetch reviewer profile whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
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

          const response = await getUserProfile(token);

          if (response.success && response.data?.user) {
            const user = response.data.user;
            // Parse custom map
            let customMap: any = {};
            try {
              if (user.customfields_map && typeof user.customfields_map === 'string') {
                customMap = JSON.parse(user.customfields_map);
              } else if (user.customfields && Array.isArray(user.customfields)) {
                user.customfields.forEach((field: any) => {
                  customMap[field.shortname] = field.value;
                });
              }
            } catch (e) {
              console.log("Error parsing custom fields", e);
            }

            setReviewerData(prev => ({
              ...prev,
              name: user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Reviewer",
              email: user.email || prev.email,
              profilePhoto: user.profileimageurl || null,
              role: (user.roles && user.roles.length > 0) ? user.roles.join(", ") : "Reviewer",
              phone: customMap.phone_number || user.phone1 || "N/A",
              gender: customMap.Gender || "N/A",
              state: customMap.State || "N/A",
            }));
          } else if (authData?.user) {
            const user = authData.user;
            setReviewerData(prev => ({
              ...prev,
              name: user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Reviewer",
              email: user.email || prev.email,
              profilePhoto: user.profileimageurl || null,
            }));
          }
        } catch (error) {
          console.error("Error fetching reviewer profile:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    }, [])
  );

  const handleEditProfile = () => {
    router.push("/(dashboard)/reviewer/edit-profile");
  };

  const handleChangePassword = () => {
    router.push("/(dashboard)/reviewer/change-password");
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

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

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReviewerHeader
        title="Profile"
        subtitle="Manage your account"
        rightElement={
          <TouchableOpacity
            onPress={() => router.push("/(dashboard)/reviewer/settings")}
            style={[styles.settingsBtn, { backgroundColor: isDark ? colors.card : "#f5f5f5" }]}
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: inset.bottom + 20 }}>
        {/* Profile Header */}
        <LinearGradient
          colors={isDark ? ['#1E293B', '#0F172A'] : ['#6366F1', '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.profileHeader, { borderWidth: 0, marginBottom: 24, elevation: 4, padding: 24, borderRadius: 20, alignItems: 'center' }]}
        >
          <View style={styles.avatarContainer}>
            {reviewerData.profilePhoto ? (
              <Image source={{
                uri: reviewerData.profilePhoto.includes('?')
                  ? `${reviewerData.profilePhoto}&t=${Date.now()}`
                  : `${reviewerData.profilePhoto}?t=${Date.now()}`
              }} style={[styles.avatar, { borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' }]} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }]}>
                <Ionicons name="person" size={40} color="#fff" />
              </View>
            )}
          </View>

          <Text style={[styles.name, { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 }]}>{reviewerData.name}</Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 2 }}>
            <Text style={[styles.role, { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }]}>{reviewerData.role}</Text>
          </View>
          <Text style={[styles.organization, { color: 'rgba(255,255,255,0.75)', marginTop: 8, fontSize: 13 }]}>{reviewerData.state}</Text>
        </LinearGradient>



        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }]}>Personal Information</Text>

          <View style={[styles.infoCard, { backgroundColor: isDark ? colors.card : "#fff", borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#eee', borderWidth: 1, elevation: 1, padding: 16, borderRadius: 16 }]}>
            <View style={[styles.infoRow, { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', paddingVertical: 12 }]}>
              <View style={[styles.infoIcon, { backgroundColor: '#3B82F615', width: 38, height: 38, borderRadius: 12 }]}>
                <Ionicons name="mail" size={18} color="#3B82F6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: 11 }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text, fontWeight: '700', fontSize: 14 }]}>{reviewerData.email}</Text>
              </View>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', paddingVertical: 12 }]}>
              <View style={[styles.infoIcon, { backgroundColor: '#10B98115', width: 38, height: 38, borderRadius: 12 }]}>
                <Ionicons name="call" size={18} color="#10B981" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: 11 }]}>Phone</Text>
                <Text style={[styles.infoValue, { color: colors.text, fontWeight: '700', fontSize: 14 }]}>{reviewerData.phone}</Text>
              </View>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', paddingVertical: 12 }]}>
              <View style={[styles.infoIcon, { backgroundColor: '#F59E0B15', width: 38, height: 38, borderRadius: 12 }]}>
                <Ionicons name="person" size={18} color="#F59E0B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: 11 }]}>Gender</Text>
                <Text style={[styles.infoValue, { color: colors.text, fontWeight: '700', fontSize: 14 }]}>{reviewerData.gender}</Text>
              </View>
            </View>

            <View style={[styles.infoRow, { paddingVertical: 12 }]}>
              <View style={[styles.infoIcon, { backgroundColor: '#8B5CF615', width: 38, height: 38, borderRadius: 12 }]}>
                <Ionicons name="location" size={18} color="#8B5CF6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: 11 }]}>State</Text>
                <Text style={[styles.infoValue, { color: colors.text, fontWeight: '700', fontSize: 14 }]}>{reviewerData.state}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }]}>Account Actions</Text>

          <View style={[styles.actionsCard, { backgroundColor: isDark ? colors.card : "#fff", borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#eee', borderWidth: 1, elevation: 1, borderRadius: 16, overflow: 'hidden' }]}>
            <TouchableOpacity style={[styles.actionItem, { paddingVertical: 14 }]} onPress={handleEditProfile} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: '#3B82F615', width: 36, height: 36, borderRadius: 10 }]}>
                <Ionicons name="create" size={18} color="#3B82F6" />
              </View>
              <Text style={[styles.actionText, { color: colors.text, fontWeight: '600', fontSize: 14 }]}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', marginLeft: 64 }]} />

            <TouchableOpacity style={[styles.actionItem, { paddingVertical: 14 }]} onPress={handleChangePassword} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: '#F59E0B15', width: 36, height: 36, borderRadius: 10 }]}>
                <Ionicons name="lock-closed" size={18} color="#F59E0B" />
              </View>
              <Text style={[styles.actionText, { color: colors.text, fontWeight: '600', fontSize: 14 }]}>Change Password</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', marginLeft: 64 }]} />

            <TouchableOpacity style={[styles.actionItem, { paddingVertical: 14 }]} onPress={handleLogout} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: '#EF444415', width: 36, height: 36, borderRadius: 10 }]}>
                <Ionicons name="log-out" size={18} color="#EF4444" />
              </View>
              <Text style={[styles.actionText, { color: "#EF4444", fontWeight: '700', fontSize: 14 }]}>Logout</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.card : "#fff" }]}>
            <View style={styles.modalIcon}>
              <Ionicons name="log-out-outline" size={48} color="#F44336" />
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Logout</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              Are you sure you want to logout from your account?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: isDark ? colors.background : "#f5f5f5" }]}
                onPress={cancelLogout}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.logoutButton]}
                onPress={confirmLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#e0e0e0",
  },
  editPhotoBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: "#2196F3",
    fontWeight: "600",
    marginBottom: 4,
  },
  organization: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },

  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  actionsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 76,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFEBEE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
  },
  logoutButton: {
    backgroundColor: "#F44336",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
