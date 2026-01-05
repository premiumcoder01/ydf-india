import { Button } from "@/components";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";

export default function WelcomeScreen() {

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
        <View style={styles.titleSection}>
          <Image
            source={require("@/assets/appImages/new.png")}
            resizeMode="contain"
            style={{ width: 200, height: 200 }}
          />
        </View>

        {/* Bottom Section with Buttons */}
        <View style={styles.bottomSection}>
          <Text style={styles.welcomeText}>
            Sign in or create an account to continue
          </Text>

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

          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
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
    paddingTop: 80,
    paddingBottom: 50,
    paddingHorizontal: 24,
  },
  titleSection: {
    alignItems: "center",
    gap: 12,
  },
  logo: {
    fontSize: 64,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 4,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  bottomSection: {
    gap: 20,
  },
  welcomeText: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "500",
  },
  buttonContainer: {
    gap: 14,
  },
  signInButton: {
    backgroundColor: "#333",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  signInText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.5,
  },
  createAccountButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  createAccountText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 17,
    letterSpacing: 0.5,
  },
  termsText: {
    fontSize: 12,
    color: "#000",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
});