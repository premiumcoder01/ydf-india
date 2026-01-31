import { Button } from "@/components";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";

export default function WelcomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo/Title Section */}
        <Animated.View
          style={[
            styles.titleSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/appImages/new.png")}
              resizeMode="contain"
              style={styles.logoImage}
            />
          </View>

          <View style={styles.brandTextContainer}>
            <Text style={styles.brandTitle}>Welcome</Text>
            <Text style={styles.brandSubtitle}>
              Empowering Dreams, Building Futures
            </Text>
          </View>
        </Animated.View>

        {/* Bottom Section with Buttons */}
        <Animated.View
          style={[
            styles.bottomSection,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeText}>
              Sign in or create an account to continue
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Link href="/(auth)/sign-in" asChild>
              <Button
                title="Sign in"
                onPress={() => { }}
                variant="primary"
                style={styles.signInButton}
                forceLight={true}
              />
            </Link>

            <Link href="/(auth)/sign-up" asChild>
              <Button
                title="Create account"
                onPress={() => { }}
                variant="secondary"
                style={styles.createAccountButton}
                forceLight={true}
              />
            </Link>
          </View>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{" "}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {" "}and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 28,
  },
  titleSection: {
    alignItems: "center",
    gap: 24,
    paddingTop: 20,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  logoImage: {
    width: 240,
    height: 240,
  },
  brandTextContainer: {
    alignItems: "center",
    gap: 8,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  brandSubtitle: {
    fontSize: 15,
    color: "#666",
    letterSpacing: 0.3,
    textAlign: "center",
    fontWeight: "500",
    maxWidth: 280,
    lineHeight: 22,
  },
  bottomSection: {
    gap: 24,
  },
  welcomeTextContainer: {
    alignItems: "center",
    gap: 12,
  },
  welcomeText: {
    fontSize: 16,
    color: "#2d2d2d",
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  decorativeLine: {
    width: 60,
    height: 3,
    backgroundColor: "#f2c44d",
    borderRadius: 2,
  },
  buttonContainer: {
    gap: 16,
    paddingHorizontal: 4,
  },
  signInButton: {
    backgroundColor: "#333",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  createAccountButton: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(51, 51, 51, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  termsContainer: {
    paddingHorizontal: 8,

  },
  termsText: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "400",
  },
  termsLink: {
    color: "#1a1a1a",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});