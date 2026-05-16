import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import DeviceInfo from "react-native-device-info";
import SpInAppUpdates, {
  IAUUpdateKind,
  type StartUpdateOptions,
} from "sp-react-native-in-app-updates";

// ─── Constants ───────────────────────────────────────────────────────────────
const DISMISS_KEY = "app_update_dismissed";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const ANDROID_PACKAGE = Constants.expoConfig?.android?.package || "com.YDF";
const IOS_BUNDLE_ID = Constants.expoConfig?.ios?.bundleIdentifier || "com.YDF";

// Initialize the in-app updates instance
const inAppUpdates = new SpInAppUpdates(false); // false = don't show debug logs

// ─── Types ───────────────────────────────────────────────────────────────────
export type UpdateType = "store" | null;

export interface AppUpdateState {
  /** Whether a store update is available */
  isUpdateAvailable: boolean;
  /** Whether we're currently checking for updates */
  isChecking: boolean;
  /** Store version available (if any) */
  storeVersion: string | null;
  /** Current app version string */
  appVersion: string;
  /** Error message if update check failed */
  error: string | null;
  /** Manually trigger an update check */
  checkForUpdate: () => Promise<"available" | "up-to-date" | "error">;
  /** Apply the update — starts Google Play's native update flow */
  applyUpdate: () => Promise<void>;
  /** Dismiss the update prompt (won't show again for 24hrs) */
  dismissUpdate: () => Promise<void>;
  /** Whether the modal should be shown */
  showModal: boolean;
  /** Set modal visibility directly */
  setShowModal: (show: boolean) => void;
  /** Update type (always "store" when available) */
  updateType: UpdateType;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAppUpdate(autoCheck: boolean = true): AppUpdateState {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [storeVersion, setStoreVersion] = useState<string | null>(null);
  const [updateType, setUpdateType] = useState<UpdateType>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const hasCheckedRef = useRef(false);

  const appVersion = Platform.OS === "android" 
    ? DeviceInfo.getBuildNumber() 
    : Constants.expoConfig?.version || "1.0.0";

  // ── Check if update was recently dismissed ─────────────────────────────
  const wasDismissedRecently = useCallback(async (): Promise<boolean> => {
    try {
      const raw = await AsyncStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      const { timestamp, dismissedVersion } = JSON.parse(raw);
      // Only suppress if same store version was dismissed within 24hrs
      if (dismissedVersion === storeVersion && Date.now() - timestamp < DISMISS_DURATION_MS) {
        return true;
      }
      await AsyncStorage.removeItem(DISMISS_KEY);
      return false;
    } catch {
      return false;
    }
  }, [storeVersion]);

  // ── Core update check using sp-react-native-in-app-updates ─────────────
  const checkForUpdate = useCallback(async (): Promise<"available" | "up-to-date" | "error"> => {
    setIsChecking(true);
    setError(null);

    try {
      const result = await inAppUpdates.checkNeedsUpdate();

      console.log("[useAppUpdate] Check result:", JSON.stringify(result));

      if (result.shouldUpdate) {
        console.log("[useAppUpdate] Update available! Store version:", result.storeVersion);
        setIsUpdateAvailable(true);
        setStoreVersion(result.storeVersion || null);
        setUpdateType("store");

        // Check if dismissed recently before showing modal
        const dismissed = await wasDismissedRecently();
        if (!dismissed) {
          setShowModal(true);
        }

        setIsChecking(false);
        return "available";
      } else {
        console.log("[useAppUpdate] App is up to date");
        setIsUpdateAvailable(false);
        setUpdateType(null);
        setIsChecking(false);
        return "up-to-date";
      }
    } catch (checkError: any) {
      console.error("[useAppUpdate] Error checking for update:", checkError);
      setError(checkError?.message || "Could not check for updates. Please try again.");
      setIsChecking(false);
      return "error";
    }
  }, [wasDismissedRecently]);

  // ── Apply update — starts Google Play's native update flow ─────────────
  const applyUpdate = useCallback(async () => {
    try {
      setShowModal(false);

      if (Platform.OS === "android") {
        // Use Google Play's native In-App Update dialog
        // IAUUpdateKind.IMMEDIATE = full screen blocking update (like Zomato)
        // IAUUpdateKind.FLEXIBLE = background download with banner
        const updateOptions: StartUpdateOptions = {
          updateType: IAUUpdateKind.IMMEDIATE,
        };

        await inAppUpdates.startUpdate(updateOptions);
      } else {
        // iOS: Open App Store page
        openStorePage();
      }
    } catch (updateError: any) {
      console.error("[useAppUpdate] Error starting update:", updateError);
      // Fallback: open Play Store directly
      openStorePage();
    }
  }, []);

  // ── Dismiss update ─────────────────────────────────────────────────────
  const dismissUpdate = useCallback(async () => {
    setShowModal(false);
    try {
      await AsyncStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          dismissedVersion: storeVersion,
        })
      );
    } catch {
      // Silent fail
    }
  }, [storeVersion]);

  // ── Auto-check on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (autoCheck && !hasCheckedRef.current) {
      hasCheckedRef.current = true;
      // Small delay so the dashboard loads first
      const timer = setTimeout(() => {
        checkForUpdate();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [autoCheck, checkForUpdate]);

  // ── Re-check when app comes back to foreground ─────────────────────────
  useEffect(() => {
    if (!autoCheck) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkForUpdate();
      }
    });

    return () => subscription.remove();
  }, [autoCheck, checkForUpdate]);

  return {
    isUpdateAvailable,
    isChecking,
    storeVersion,
    updateType,
    appVersion,
    error,
    checkForUpdate,
    applyUpdate,
    dismissUpdate,
    showModal,
    setShowModal,
  };
}

// ─── Utility: Open store page ────────────────────────────────────────────────
export function openStorePage() {
  if (Platform.OS === "android") {
    Linking.openURL(`market://details?id=${ANDROID_PACKAGE}`).catch(() => {
      Linking.openURL(`https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`);
    });
  } else if (Platform.OS === "ios") {
    Linking.openURL(`https://apps.apple.com/app/${IOS_BUNDLE_ID}`);
  }
}
