import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getDonorKycStatus, getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProviderProfileScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [providerData, setProviderData] = useState({
    fullName: "Provider",
    username: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    kycStatus: "New",
    profilePhoto: null as string | null,
    roles: [] as string[],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const authDataString = await AsyncStorage.getItem("authData");
        if (!authDataString) return;
        const authData = JSON.parse(authDataString);
        const token = authData?.token;
        if (!token) return;

        const response = await getUserProfile(token);
        if (response.success && response.data?.user) {
          const user = response.data.user;

          // Parse phone — strip country code
          let phone = user.phone1 || user.phone || "";
          if (phone === "N/A") phone = "";
          if (phone.startsWith('+91')) phone = phone.substring(3);
          else if (phone.startsWith('91') && phone.length === 12) phone = phone.substring(2);

          setProviderData(prev => ({
            ...prev,
            fullName: user.fullname || `${user.firstname || ""} ${user.lastname || ""}`.trim() || prev.fullName,
            username: user.username || "",
            email: user.email || prev.email,
            phone,
            city: user.city?.trim() || "",
            address: user.address?.trim() || "",
            profilePhoto: user.profileimageurl || null,
            roles: user.roles || [],
          }));
        }

        try {
          const kycResponse = await getDonorKycStatus(token);
          if (kycResponse.success && kycResponse.data) {
            const kycData = kycResponse.data.data ?? kycResponse.data;
            setProviderData(prev => ({ ...prev, kycStatus: kycData.status || "New" }));
          }
        } catch (_) { }
      } catch (error) {
        console.error("Error fetching provider profile:", error);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try { await AsyncStorage.removeItem("authData"); } catch (_) { }
            router.replace("/(auth)/welcome");
          },
        },
      ]
    );
  };

  const kycConfig: Record<string, {
    gradColors: readonly [string, string];
    icon: keyof typeof Ionicons.glyphMap;
    bg: string; border: string; label: string;
  }> = {
    approved: { gradColors: ['#10B981', '#059669'], icon: 'shield-checkmark', bg: '#D1FAE5', border: '#10B981', label: 'Verified' },
    verified: { gradColors: ['#10B981', '#059669'], icon: 'shield-checkmark', bg: '#D1FAE5', border: '#10B981', label: 'Verified' },
    pending: { gradColors: ['#F59E0B', '#D97706'], icon: 'time-outline', bg: '#FEF3C7', border: '#F59E0B', label: 'Under Review' },
    "under review": { gradColors: ['#3B82F6', '#2563EB'], icon: 'time-outline', bg: '#DBEAFE', border: '#3B82F6', label: 'Under Review' },
    rejected: { gradColors: ['#EF4444', '#B91C1C'], icon: 'alert-circle', bg: '#FEE2E2', border: '#EF4444', label: 'Rejected' },
    new: { gradColors: ['#6B7280', '#4B5563'], icon: 'ellipse-outline', bg: '#F3F4F6', border: '#9CA3AF', label: 'Not Submitted' },
  };
  const kyc = kycConfig[providerData.kycStatus.toLowerCase()] ?? kycConfig['new'];

  const heroScale = scrollY.interpolate({ inputRange: [0, 120], outputRange: [1, 0.94], extrapolate: 'clamp' });
  const heroOpacity = scrollY.interpolate({ inputRange: [0, 120], outputRange: [1, 0.85], extrapolate: 'clamp' });

  const initials = providerData.fullName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "P";

  // ── Sub-components ──────────────────────────────────────────────
  const InfoRow = ({ icon, label, value, color, isLast = false }: any) => {
    if (!value) return null;
    return (
      <View style={[
        styles.infoRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#f3f4f6' }
      ]}>
        <View style={[styles.infoIcon, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={styles.infoText}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
        </View>
      </View>
    );
  };

  const ActionItem = ({ icon, label, onPress, color, isLast = false }: any) => (
    <TouchableOpacity
      style={[
        styles.actionItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#f3f4f6' }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color: label === 'Logout' ? color : colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.shadow : '#f4f6fb' }]}>
      <ReviewerHeader
        title="Profile"
        subtitle="Manage your account"
        rightElement={
          <TouchableOpacity
            onPress={() => router.push("/(dashboard)/provider/settings")}
            style={[styles.settingsBtn, { backgroundColor: isDark ? colors.card : "rgba(255,255,255,0.95)" }]}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <Animated.ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* ── Hero Card ── */}
        <Animated.View style={[
          styles.heroWrap,
          { opacity: heroOpacity, transform: [{ scale: heroScale }] }
        ]}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Decorative blobs */}
            <View style={styles.blob1} />
            <View style={styles.blob2} />

            {/* Avatar */}
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={() => router.push("/(dashboard)/provider/edit-profile")}
              activeOpacity={0.85}
            >
              {providerData.profilePhoto ? (
                <Image source={{
                  uri: providerData.profilePhoto.includes('?')
                    ? `${providerData.profilePhoto}&t=${Date.now()}`
                    : `${providerData.profilePhoto}?t=${Date.now()}`
                }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={13} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* Name & meta */}
            <Text style={styles.heroName}>{providerData.fullName}</Text>
            {providerData.username ? (
              <Text style={styles.heroUsername}>@{providerData.username}</Text>
            ) : null}
            {providerData.email ? (
              <Text style={styles.heroEmail}>{providerData.email}</Text>
            ) : null}
            {(providerData.city) ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.75)" />
                <Text style={styles.locationText}>{providerData.city}</Text>
              </View>
            ) : null}



            {/* KYC badge */}
            <View style={[styles.kycBadge, { backgroundColor: kyc.bg, borderColor: kyc.border }]}>
              <Ionicons name={kyc.icon} size={14} color={kyc.border} />
              <Text style={[styles.kycText, { color: kyc.border }]}>KYC: {kyc.label}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Contact Details ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Details</Text>

          </View>
          <View style={[styles.card, { backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? colors.border : '#eee' }]}>
            <InfoRow icon="mail-outline" label="Email Address" value={providerData.email} color="#667eea" />
            <InfoRow icon="call-outline" label="Phone Number" value={providerData.phone ? `+91 ${providerData.phone}` : ""} color="#10B981" />
            <InfoRow icon="location-outline" label="City" value={providerData.city} color="#F59E0B" />
            <InfoRow icon="home-outline" label="Address" value={providerData.address} color="#8B5CF6" isLast />
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 20 }]}>Quick Actions</Text>
          <View style={[styles.card, {
            backgroundColor: isDark ? colors.card : '#fff',
            borderColor: isDark ? colors.border : '#eee',
            padding: 0, overflow: 'hidden'
          }]}>
            <ActionItem icon="create-outline" label="Edit Profile" onPress={() => router.push("/(dashboard)/provider/edit-profile")} color="#667eea" />
            <ActionItem icon="help-circle-outline" label="Help & Support" onPress={() => router.push("/(dashboard)/provider/help-support")} color="#8B5CF6" />
            <ActionItem icon="document-text-outline" label="Terms & Conditions" onPress={() => router.push("/(dashboard)/provider/terms-conditions")} color="#795548" />
            <ActionItem icon="information-circle-outline" label="About" onPress={() => router.push("/(dashboard)/provider/about")} color="#0EA5E9" />
            <ActionItem icon="log-out-outline" label="Logout" onPress={handleLogout} color="#EF4444" isLast />
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  settingsBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },

  /* Hero */
  heroWrap: {
    marginHorizontal: 16, marginTop: 16, marginBottom: 16,
    borderRadius: 28, overflow: 'hidden',
    shadowColor: '#667eea', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 10,
  },
  heroGradient: { paddingTop: 36, paddingBottom: 28, paddingHorizontal: 24, alignItems: 'center' },
  blob1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -70, right: -50,
  },
  blob2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.07)', bottom: -40, left: -30,
  },

  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: '#fff' },
  avatarFallback: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#fff',
  },
  avatarInitials: { fontSize: 34, fontWeight: '800', color: '#fff' },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#667eea',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fff',
  },

  heroName: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 3 },
  heroUsername: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 4 },
  heroEmail: { fontSize: 14, color: 'rgba(255,255,255,0.88)', fontWeight: '500', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  locationText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  rolesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  rolePillText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  kycBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 16,
    borderRadius: 999, borderWidth: 1.5,
  },
  kycText: { fontSize: 13, fontWeight: '700' },

  /* Section */
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 14, fontWeight: '700', color: '#667eea' },

  /* Card */
  card: {
    borderRadius: 20, padding: 8, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },

  /* Info row */
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 12 },
  infoIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '700' },

  /* Action item */
  actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  actionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  actionLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
});