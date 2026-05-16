import { useTheme } from "@/context/ThemeContext";
import type { UpdateType } from "@/utils/useAppUpdate";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface AppUpdateModalProps {
  visible: boolean;
  appVersion: string;
  storeVersion?: string | null;
  updateType: UpdateType;
  onUpdate: () => void;
  onDismiss: () => void;
}

export default function AppUpdateModal({
  visible,
  appVersion,
  storeVersion,
  updateType,
  onUpdate,
  onDismiss,
}: AppUpdateModalProps) {
  const { isDark, colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the icon
  useEffect(() => {
    if (visible) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [visible, pulseAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <MotiView
          from={{ opacity: 0, scale: 0.9, translateY: 40 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 18, stiffness: 120 }}
          style={[
            styles.modalCard,
            { backgroundColor: isDark ? "#1E1E2E" : "#FFFFFF" },
          ]}
        >
          {/* ─── Gradient Header ───────────────────────────────────── */}
          <LinearGradient
            colors={isDark
              ? ["#4F46E5", "#7C3AED", "#A855F7"]
              : ["#6366F1", "#8B5CF6", "#A78BFA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            {/* Decorative circles */}
            <View style={[styles.decorCircle, styles.decorCircle1]} />
            <View style={[styles.decorCircle, styles.decorCircle2]} />
            <View style={[styles.decorCircle, styles.decorCircle3]} />

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={styles.iconContainer}>
                <Ionicons name="rocket" size={36} color="#fff" />
              </View>
            </Animated.View>

            <Text style={styles.headerTitle}>Update Available!</Text>
            <Text style={styles.headerSubtitle}>
              A new version is ready for you
            </Text>
          </LinearGradient>

          {/* ─── Content ───────────────────────────────────────────── */}
          <View style={styles.content}>
            {/* Version Badges */}
            <View style={styles.versionRow}>
              <View style={[
                styles.versionBadge,
                { backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)" }
              ]}>
                <Text style={[styles.versionLabel, { color: isDark ? "#FCA5A5" : "#B91C1C" }]}>
                  Current
                </Text>
                <Text style={[styles.versionValue, { color: isDark ? "#FCA5A5" : "#DC2626" }]}>
                  v{appVersion}
                </Text>
              </View>

              <Ionicons name="arrow-forward" size={18} color={colors.textSecondary} />

              <View style={[
                styles.versionBadge,
                { backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)" }
              ]}>
                <Text style={[styles.versionLabel, { color: isDark ? "#6EE7B7" : "#047857" }]}>
                  Latest
                </Text>
                <Text style={[styles.versionValue, { color: isDark ? "#6EE7B7" : "#059669" }]}>
                  v{storeVersion || "New"}
                </Text>
              </View>
            </View>

            {/* What's New Section */}
            <View style={styles.whatsNewSection}>
              <Text style={[styles.whatsNewTitle, { color: colors.text }]}>
                What's New
              </Text>
              <View style={styles.featureList}>
                {[
                  { icon: "sparkles", text: "Performance improvements", color: "#F59E0B" },
                  { icon: "bug", text: "Bug fixes & stability", color: "#10B981" },
                  { icon: "shield-checkmark", text: "Security enhancements", color: "#3B82F6" },
                ].map((item, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <View style={[styles.featureDot, { backgroundColor: item.color + "20" }]}>
                      <Ionicons name={item.icon as any} size={14} color={item.color} />
                    </View>
                    <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ─── Action Buttons ─────────────────────────────────── */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.laterButton,
                  { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6" }
                ]}
                onPress={onDismiss}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.laterText,
                  { color: isDark ? "rgba(255,255,255,0.6)" : "#6B7280" }
                ]}>
                  Later
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.updateButton}
                onPress={onUpdate}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#6366F1", "#8B5CF6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.updateButtonGradient}
                >
                  <Ionicons name="storefront-outline" size={18} color="#fff" />
                  <Text style={styles.updateText}>Update Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </MotiView>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
  },

  // ── Header ───────────────────────────────────────────────
  headerGradient: {
    paddingTop: 36,
    paddingBottom: 30,
    alignItems: "center",
    overflow: "hidden",
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  decorCircle1: {
    width: 120,
    height: 120,
    top: -30,
    right: -20,
  },
  decorCircle2: {
    width: 80,
    height: 80,
    bottom: -20,
    left: -15,
  },
  decorCircle3: {
    width: 50,
    height: 50,
    top: 20,
    left: 40,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },

  // ── Content ──────────────────────────────────────────────
  content: {
    padding: 24,
  },

  // ── Version Badges ───────────────────────────────────────
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  versionBadge: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 4,
  },
  versionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  versionValue: {
    fontSize: 16,
    fontWeight: "800",
  },

  // ── What's New ───────────────────────────────────────────
  whatsNewSection: {
    marginBottom: 24,
  },
  whatsNewTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  featureList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureDot: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 14,
    fontWeight: "500",
  },

  // ── Buttons ──────────────────────────────────────────────
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  laterButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  laterText: {
    fontSize: 15,
    fontWeight: "600",
  },
  updateButton: {
    flex: 1.6,
    borderRadius: 14,
    overflow: "hidden",
  },
  updateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    gap: 8,
  },
  updateText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
