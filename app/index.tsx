
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, View } from "react-native";

// Helper function to get dashboard route based on role
const getDashboardRoute = (roleKey: string): string => {
  const routeMap: Record<string, string> = {
    student: "/(dashboard)/student-dashboard",
    "application-reviewer": "/(dashboard)/application-reviewer",
    "scholarship-provider": "/(dashboard)/scholarship-provider",
  };
  return routeMap[roleKey] || "/(auth)/welcome";
};

// Function to get auth state from AsyncStorage
const getAuthState = async (): Promise<{ isLoggedIn: boolean; userRole?: string }> => {
  try {
    const authDataString = await AsyncStorage.getItem("authData");
    if (authDataString) {
      const authData = JSON.parse(authDataString);
      // Check if authData has a userRole (meaning user has completed signup and selected a role)
      if (authData?.userRole) {
        return {
          isLoggedIn: true,
          userRole: authData.userRole,
        };
      }
    }
    return { isLoggedIn: false };
  } catch (error) {
    console.error("Error getting auth state:", error);
    return { isLoggedIn: false };
  }
};

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Hide native splash immediately so we only use the Custom Loader
        await SplashScreen.hideAsync();

        // Start checking auth logic
        const authPromise = getAuthState();
        
        // Wait for both Auth Check AND a minimum of 2.5 seconds for the Custom Loader
        // This ensures the loader is visible long enough to be seen/felt by the user
        const [authState] = await Promise.all([
          authPromise,
          new Promise(resolve => setTimeout(resolve, 2500))
        ]);
        
        if (authState.isLoggedIn && authState.userRole) {
          // User is logged in, route to their dashboard
          const dashboardRoute = getDashboardRoute(authState.userRole);
          setInitialRoute(dashboardRoute);
        } else {
          // User is not logged in, route to welcome/sign-in
          setInitialRoute("/(auth)/welcome");
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        setInitialRoute("/(auth)/welcome");
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={["#fff", "#fff", "#f2c44d"]}
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          locations={[0, 0.3, 1]}
        >
          <Image
            source={require("@/assets/appImages/new.png")}
            resizeMode="contain"
            style={{ width: 250, height: 250, marginBottom: 20 }}
          />
          <ActivityIndicator size="large" color="#333" />
        </LinearGradient>
      </View>
    );
  }

  // Redirect to the appropriate route
  if (initialRoute) {
    return <Redirect href={initialRoute as any} />;
  }

  // Fallback
  return <Redirect href="/(auth)/welcome" />;
}


