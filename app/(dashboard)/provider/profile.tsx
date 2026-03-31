import { ReviewerHeader } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { getDonorKycStatus, getUserProfile } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from "expo-router";
import { MotiView } from "moti";
import React, { useCallback, useRef, useState } from "react";
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
    customFields: {} as Record<string, string>,
    annualIncome: "",
  });

  const [expanded, setExpanded] = useState<string | null>('contact');

  const stripHtml = (html: string): string => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  };

  const formatDOB = (dob: string) => {
    if (!dob || dob === "N/A") return "";
    try {
      const ts = parseInt(dob, 10);
      return new Date(ts * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) { return dob; }
  };

  useFocusEffect(
    useCallback(() => {
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

            let customFieldsMap: Record<string, string> = {};
            if (user.customfields_map) {
              try { customFieldsMap = JSON.parse(user.customfields_map); } catch (_) { }
            } else if (user.customfields) {
              user.customfields.forEach((f: any) => {
                customFieldsMap[f.shortname] = f.value;
              });
            }

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
              customFields: customFieldsMap,
              annualIncome: user.annual_income || "",
            }));
          }

          try {
            const kycResponse = await getDonorKycStatus(token);
            if (kycResponse.success && kycResponse.data) {
              const kycData = kycResponse.data.data ?? kycResponse.data;
              // If status is explicit, use it. Otherwise, if data.success is true, it means submitted -> "Pending"
              let status = kycData.status || (kycData.success ? "Pending" : "New");
              setProviderData(prev => ({ ...prev, kycStatus: status }));
            }
          } catch (_) { }
        } catch (error) {
          console.error("Error fetching provider profile:", error);
        }
      };
      fetchProfile();
    }, [])
  );

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

  const Accordion = ({ id, icon, title, color, children }: any) => {
    const isExpanded = expanded === id;
    return (
      <View style={{ marginBottom: 14 }}>
        <TouchableOpacity
          onPress={() => setExpanded(isExpanded ? null : id)}
          activeOpacity={0.85}
          style={[styles.accordionHeader, {
            backgroundColor: isDark ? colors.card : '#fff',
            borderColor: isDark ? colors.border : 'rgba(0,0,0,0.04)',
            borderBottomLeftRadius: isExpanded ? 0 : 20,
            borderBottomRightRadius: isExpanded ? 0 : 20,
          }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <LinearGradient
              colors={[`${color}25`, `${color}10`]}
              style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}
            >
              <Ionicons name={icon} size={18} color={color} />
            </LinearGradient>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{title}</Text>
          </View>
          <MotiView animate={{ rotate: isExpanded ? '180deg' : '0deg' }}>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </MotiView>
        </TouchableOpacity>

        {isExpanded && (
          <MotiView
            from={{ opacity: 0, scaleY: 0.95 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ type: 'timing', duration: 240 }}
            style={[styles.accordionContent, { backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? colors.border : 'rgba(0,0,0,0.04)' }]}
          >
            {children}
          </MotiView>
        )}
      </View>
    );
  };

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
              activeOpacity={0.85}
              disabled={true}
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

        <View style={{ paddingHorizontal: 16, marginTop: 10 }}>

          {/* 1. Contact Details */}
          <Accordion id="contact" icon="call-outline" title="Contact Details" color="#667eea">
            <View style={{ padding: 4 }}>
              <InfoRow icon="mail-outline" label="Email Address" value={providerData.email} color="#667eea" />
              <InfoRow icon="call-outline" label="Phone Number" value={providerData.phone ? `+91 ${providerData.phone}` : ""} color="#10B981" />
              <InfoRow icon="location-outline" label="City" value={providerData.city} color="#F59E0B" />
              <InfoRow icon="home-outline" label="Address" value={providerData.address} color="#8B5CF6" isLast />
            </View>
          </Accordion>

          {/* 2. Personal Profile */}
          {Object.keys(providerData.customFields).length > 0 && (
            <Accordion id="personal" icon="person-outline" title="Personal Profile" color="#10B981">
              <View style={{ padding: 4 }}>
                <InfoRow icon="person-outline" label="Gender" value={providerData.customFields['Gender']} color="#10B981" />
                <InfoRow icon="calendar-clear-outline" label="Date of Birth" value={formatDOB(providerData.customFields['DOB'])} color="#667eea" />
                <InfoRow icon="map-outline" label="State" value={providerData.customFields['State']} color="#8B5CF6" />
                <InfoRow icon="navigate-outline" label="District" value={providerData.customFields['district'] || providerData.customFields['domicile_district']} color="#F59E0B" />
                <InfoRow icon="earth-outline" label="Religion" value={providerData.customFields['Religion']} color="#3B82F6" />
                <InfoRow icon="people-outline" label="Caste" value={providerData.customFields['Caste']} color="#795548" isLast />
              </View>
            </Accordion>
          )}

          {/* 3. Academic Records */}
          {providerData.roles.includes('Student') && (
            <Accordion id="academic" icon="school-outline" title="Academic Records" color="#3B82F6">
              <View style={{ padding: 4 }}>
                <InfoRow icon="book-outline" label="10th Passing Year" value={providerData.customFields['passing_10th']} color="#667eea" />
                <InfoRow icon="ribbon-outline" label="12th Board" value={providerData.customFields['12th_board']} color="#10B981" />
                <InfoRow icon="stats-chart-outline" label="12th Marks" value={stripHtml(providerData.customFields['12th_marks'] || "")} color="#F59E0B" />
                <InfoRow icon="calendar-outline" label="12th Passing Year" value={providerData.customFields['12th_passing_year']} color="#8B5CF6" />
                <InfoRow icon="sparkles-outline" label="Percentage" value={providerData.customFields['percentage_12'] ? `${providerData.customFields['percentage_12']}%` : ""} color="#E91E63" />
                <InfoRow icon="flask-outline" label="Stream" value={providerData.customFields['stream_in_12th']} color="#3F51B5" isLast />
              </View>
            </Accordion>
          )}

          {/* 4. Financial Status */}
          {(providerData.annualIncome || providerData.customFields['Family_income']) && (
            <Accordion id="financial" icon="cash-outline" title="Financial Status" color="#F59E0B">
              <View style={{ padding: 4 }}>
                <InfoRow icon="wallet-outline" label="Family Income" value={providerData.annualIncome || providerData.customFields['Family_income']} color="#F59E0B" />
                <InfoRow icon="grid-outline" label="Category" value={providerData.customFields['category']} color="#667eea" />
                <InfoRow icon="stats-chart-outline" label="Application Status" value={providerData.customFields['appl_status']} color="#10B981" isLast />
              </View>
            </Accordion>
          )}

          {/* Quick Actions Action Grid */}
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 10, marginBottom: 15 }}>Quick Actions</Text>
          <View style={[styles.card, {
            backgroundColor: isDark ? colors.card : '#fff',
            borderColor: isDark ? colors.border : 'rgba(0,0,0,0.03)',
            padding: 0, overflow: 'hidden', marginBottom: 20
          }]}>
            <ActionItem icon="create-outline" label="Edit Profile" onPress={() => router.push("/(dashboard)/provider/edit-profile")} color="#667eea" />
            <ActionItem icon="help-circle-outline" label="Help & Support" onPress={() => router.push("/(dashboard)/provider/help-support")} color="#8B5CF6" />
            <ActionItem icon="document-text-outline" label="Terms & Conditions" onPress={() => router.push("/(dashboard)/provider/terms-conditions")} color="#795548" />
            <ActionItem icon="information-circle-outline" label="About" onPress={() => router.push("/(dashboard)/provider/about")} color="#0EA5E9" />
            <ActionItem icon="log-out-outline" label="Logout" onPress={handleLogout} color="#EF4444" isLast />
          </View>
          
          {/* Copyright Notice */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }]}>
              © {new Date().getFullYear()} Youth Dreamers Foundation. All rights reserved.
            </Text>
          </View>

          <View style={{ height: 50 }} />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  accordionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  accordionContent: {
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    borderTopWidth: 0, paddingHorizontal: 4, paddingBottom: 10,
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },

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

  /* Footer */
  footer: {
    marginTop: 15,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});