import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface ToastProps {
  message: string;
  type?: "error" | "success" | "info";
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = "error",
  visible,
  onHide,
  duration = 3000,
}: ToastProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        // Slide out
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Reset position when hidden
      slideAnim.setValue(-100);
    }
  }, [visible, duration]);

  if (!visible) return null;

  const getToastStyles = () => {
    switch (type) {
      case "success":
        return {
          backgroundColor: "#10B981",
          icon: "checkmark-circle" as const,
        };
      case "info":
        return {
          backgroundColor: "#3B82F6",
          icon: "information-circle" as const,
        };
      default:
        return {
          backgroundColor: "#EF4444",
          icon: "alert-circle" as const,
        };
    }
  };

  const toastStyle = getToastStyles();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.toast, { backgroundColor: toastStyle.backgroundColor }]}>
        <Ionicons name={toastStyle.icon} size={20} color="#FFFFFF" />
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 20,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 12,
  },
  message: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

