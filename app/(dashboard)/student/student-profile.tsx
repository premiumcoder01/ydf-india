import { AppHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Mock data for profile completion calculation
const MANDATORY_DOCUMENTS = [
  { name: "Aadhar Card", key: "aadhar" },
  { name: "PAN Card", key: "pan" },
  { name: "Mark Sheets", key: "marksheets" },
];

const INITIAL_DOCUMENTS = [
  { id: 1, name: "Aadhar Card", status: "verified", mandatory: true },
  { id: 2, name: "PAN Card", status: "pending", mandatory: true },
  { id: 3, name: "Mark Sheets", status: "verified", mandatory: true },
];

export default function StudentProfileScreen() {
  const { isDark, colors } = useTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "Student",
    email: "",
  });
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data - in real app, this would come from API/context
  const academicInfo = {
    gpa: "3.75",
    year: "Senior",
  };
  const documents = INITIAL_DOCUMENTS;

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        // Get auth token from AsyncStorage
        const authDataString = await AsyncStorage.getItem("authData");
        if (!authDataString) {
          console.log("No auth data found");
          setLoading(false);
          return;
        }

        const authData = JSON.parse(authDataString);
        const token = authData?.token;

        if (!token) {
          console.log("No token found in auth data");
          setLoading(false);
          return;
        }

        // Call getUserProfile API
        const response = await getUserProfile(token);
        console.log("response", response);

        // Response structure: { success: true, data: { success: true, user: {...} } }
        if (response.success && response.data?.user) {
          const user = response.data.user;

          // Update student name (use fullname if available, otherwise firstname + lastname)
          const name = user.fullname ||
            `${user.firstname || ""} ${user.lastname || ""}`.trim() ||
            "Student";
          setPersonalInfo({
            fullName: name,
            email: user.email || "",
          });

          // Update profile photo URL if available
          if (user.profileimageurl) {
            setProfilePhotoUrl(user.profileimageurl);
          }
        } else {
          console.log("Failed to fetch user profile:", response.error || response.message);
          // Fallback to authData user info if API fails
          if (authData?.user) {
            const user = authData.user;
            const name = user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Student";
            setPersonalInfo({
              fullName: name,
              email: user.email || "",
            });
            if (user.profileimageurl) {
              setProfilePhotoUrl(user.profileimageurl);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Fallback to authData user info on error
        try {
          const authDataString = await AsyncStorage.getItem("authData");
          if (authDataString) {
            const authData = JSON.parse(authDataString);
            if (authData?.user) {
              const user = authData.user;
              const name = user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Student";
              setPersonalInfo({
                fullName: name,
                email: user.email || "",
              });
              if (user.profileimageurl) {
                setProfilePhotoUrl(user.profileimageurl);
              }
            }
          }
        } catch (fallbackError) {
          console.error("Error in fallback:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Calculate profile completion
  const calculateProfileCompletion = useMemo(() => {
    const personalScore = 25;
    const academicScore = 25;
    const mandatoryComplete = documents.filter(
      (d) => d.mandatory === true && d.status === "verified"
    ).length;
    const documentsScore = (mandatoryComplete / MANDATORY_DOCUMENTS.length) * 50;
    return Math.round(personalScore + academicScore + documentsScore);
  }, [documents]);

  // Logout Handler
  const handleLogout = async () => {
    try {
      setShowLogoutModal(false);
      await AsyncStorage.removeItem("authData");
      router.replace("/(auth)/welcome");
    } catch (error) {
      console.error("Error during logout:", error);
      router.replace("/(auth)/welcome");
    }
  };

  // Navigation sections with better design
  const profileSections = [
    {
      id: "personal",
      title: "Personal",
      subtitle: "Information",
      icon: "person",
      color: "#4CAF50",
      route: "/(dashboard)/student/student-profile-personal",
    },
    {
      id: "academic",
      title: "Academic",
      subtitle: "Details",
      icon: "school",
      color: "#2196F3",
      route: "/(dashboard)/student/student-profile-academic",
    },
    {
      id: "financial",
      title: "Financial",
      subtitle: "Details",
      icon: "cash",
      color: "#4CAF50",
      route: "/(dashboard)/student/student-profile-financial",
    },
    {
      id: "documents",
      title: "Documents",
      subtitle: "Management",
      icon: "document-text",
      color: "#FF9800",
      route: "/(dashboard)/student/student-document-upload",
    },
    {
      id: "settings",
      title: "Settings",
      subtitle: "& Security",
      icon: "settings",
      color: "#9C27B0",
      route: "/(dashboard)/student/student-profile-settings",
    },
    {
      id: "about",
      title: "About",
      subtitle: "& Support",
      icon: "information-circle",
      color: "#607D8B",
      route: "/(dashboard)/student/student-profile-about",
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#121212", "#121212", "#1e1e1e"] : ["#f8f9fa", "#ffffff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.4, 1]}
      />

      <AppHeader title="My Profile" onBack={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageWrapper}>
            {profilePhotoUrl ? (
              <Image
                source={{ uri: profilePhotoUrl }}
                style={[styles.profileImage, { borderColor: isDark ? colors.card : "#fff" }]}
              />
            ) : (
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=200&q=60",
                }}
                style={[styles.profileImage, { borderColor: isDark ? colors.card : "#fff" }]}
              />
            )}
            <TouchableOpacity style={[styles.editPhotoButton, { borderColor: isDark ? colors.card : "#fff" }]}>
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>{personalInfo.fullName}</Text>
          {personalInfo.email ? (
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{personalInfo.email}</Text>
          ) : null}


          {/* <View style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionLabel}>Profile Complete</Text>
              <Text style={styles.completionPercent}>{calculateProfileCompletion}%</Text>
            </View>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={
                  calculateProfileCompletion >= 80
                    ? ["#4CAF50", "#45a049"]
                    : calculateProfileCompletion >= 50
                    ? ["#FF9800", "#fb8c00"]
                    : ["#F44336", "#e53935"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressFill,
                  { width: `${calculateProfileCompletion}%` },
                ]}
              />
            </View>
          </View> */}


          {/* <View style={styles.quickStats}>
            <View style={styles.statBox}>
              <Ionicons name="trophy" size={20} color="#FF9800" />
              <Text style={styles.statValue}>{academicInfo.gpa}</Text>
              <Text style={styles.statLabel}>GPA</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.statValue}>
                {documents.filter((d) => d.status === "verified").length}
              </Text>
              <Text style={styles.statLabel}>Verified</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="calendar" size={20} color="#2196F3" />
              <Text style={styles.statValue}>{academicInfo.year}</Text>
              <Text style={styles.statLabel}>Year</Text>
            </View>
          </View> */}
        </View>

        {/* Profile Sections Grid */}
        <View style={styles.sectionsWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Access</Text>
          <View style={styles.gridContainer}>
            {profileSections.map((section, index) => (
              <TouchableOpacity
                key={section.id}
                style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(section.route as any)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconWrapper,
                    { backgroundColor: section.color + "15" },
                  ]}
                >
                  <Ionicons
                    name={section.icon as any}
                    size={32}
                    color={section.color}
                  />
                </View>
                <Text style={[styles.gridItemTitle, { color: colors.text }]}>{section.title}</Text>
                <Text style={[styles.gridItemSubtitle, { color: colors.textSecondary }]}>{section.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: isDark ? "rgba(244, 67, 54, 0.4)" : "rgba(244, 67, 54, 0.2)" }]}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#F44336" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Logout Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalIconContainer}>
              <View style={[styles.modalIconCircle, { backgroundColor: "#FF9800" + (isDark ? "30" : "15") }]}>
                <Ionicons name="log-out-outline" size={32} color="#FF9800" />
              </View>
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Logout Confirmation</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Are you sure you want to logout? You can log back in anytime with
              your credentials.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { backgroundColor: isDark ? "#333" : "#f5f5f5" }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={[styles.modalButtonCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: isDark ? colors.primary : "#333" }]}
                onPress={handleLogout}
              >
                <Text style={styles.modalButtonConfirmText}>Logout</Text>
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
  scrollContent: {
    paddingBottom: 20,
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  profileImageWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  editPhotoButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#4CAF50",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profileName: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  profileEmail: {
    fontSize: 15,
    marginBottom: 20,
  },
  completionCard: {
    width: "100%",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
  },
  completionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  completionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  completionPercent: {
    fontSize: 20,
    fontWeight: "700",
  },
  progressBar: {
    width: "100%",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  quickStats: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  sectionsWrapper: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridItem: {
    width: "47%",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    minHeight: 140,
    justifyContent: "center",
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  gridItemTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  gridItemSubtitle: {
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F44336",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  modalIconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancel: {
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonConfirm: {
    backgroundColor: "#333",
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
