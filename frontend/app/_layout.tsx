import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from "expo-linking";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, loginWithSessionId } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Handle web session_id in URL hash on mount
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    const query = window.location.search || "";
    let sessionId: string | null = null;
    const hashMatch = hash.match(/session_id=([^&]+)/);
    const queryMatch = query.match(/session_id=([^&]+)/);
    if (hashMatch) sessionId = decodeURIComponent(hashMatch[1]);
    else if (queryMatch) sessionId = decodeURIComponent(queryMatch[1]);
    if (sessionId) {
      loginWithSessionId(sessionId).then(() => {
        window.history.replaceState(null, "", window.location.pathname);
      });
    }
  }, [loginWithSessionId]);

  useEffect(() => {
    if (loading) return;
    const inTabs = segments[0] === "(tabs)";
    if (user && !inTabs) {
      router.replace("/(tabs)/hoje");
    } else if (!user && inTabs) {
      router.replace("/");
    }
  }, [user, loading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.surface },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="sos" options={{ presentation: "modal", animation: "fade" }} />
          </Stack>
        </AuthGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
