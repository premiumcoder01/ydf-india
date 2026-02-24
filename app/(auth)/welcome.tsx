import { Button } from "@/components";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  const inset = useSafeAreaInsets();

  // Staggered Animation Values
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Gradient Background - Retained exactly as requested */}
      <LinearGradient
        colors={["#fff", "#fff", "#f2c44d"]}
        style={styles.background}
        locations={[0, 0.3, 1]}
      />

      {/* Subtle overlay to enhance premium look */}
      <View style={styles.overlay} />

      <View
        style={[
          styles.content,
          {
            paddingTop: Math.max(inset.top, 20),
            paddingBottom: Math.max(inset.bottom, 20),
          },
        ]}
      >
        <View style={styles.topSpacer} />

        {/* Center/Main Section */}
        <View style={styles.mainSection}>
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require("@/assets/appImages/new.png")}
              resizeMode="contain"
              style={styles.logoImage}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.brandTextContainer,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleSlide }],
              },
            ]}
          >
            <Text style={styles.brandTitle}>Welcome</Text>
            <Text style={styles.brandSubtitle}>
              Empowering Dreams, Building Futures
            </Text>
          </Animated.View>
        </View>

        {/* Bottom Section */}
        <Animated.View
          style={[
            styles.bottomSection,
            {
              opacity: buttonOpacity,
              transform: [{ translateY: buttonSlide }],
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
              By continuing, you agree to our{"\n"}
              <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
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
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  topSpacer: {
    flex: 0.5,
  },
  mainSection: {
    flex: 2.5,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  logoImage: {
    width: 220,
    height: 220,
  },
  brandTextContainer: {
    alignItems: "center",
    gap: 12,
  },
  brandTitle: {
    fontSize: 44,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -1.2,
    textAlign: "center",
  },
  brandSubtitle: {
    fontSize: 16,
    color: "#555",
    letterSpacing: 0.3,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 24,
  },
  bottomSection: {
    flex: 2,
    justifyContent: "flex-end",
    paddingBottom: 16,
    gap: 24,
  },
  welcomeTextContainer: {
    alignItems: "center",
    marginBottom: -8,
  },
  welcomeText: {
    fontSize: 12,
    color: "#777",
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  buttonContainer: {
    gap: 16,
  },
  signInButton: {
    backgroundColor: "#1A1A1A",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  createAccountButton: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(26, 26, 26, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  termsContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  termsText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "400",
  },
  termsLink: {
    color: "#111",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});