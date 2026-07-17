import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

// Push notification foreground handler (module scope, native-only)
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Android channel at module scope
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Push notification tap handlers (native only)
  useEffect(() => {
    if (Platform.OS === "web") return;

    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data || {}) as any;
      const url = data.deeplink || data.action_url;
      if (!url) return;
      if (typeof url === "string" && url.startsWith("http")) Linking.openURL(url);
      else if (typeof url === "string") router.push(url as any);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = (response.notification.request.content.data || {}) as any;
      const url = data.deeplink || data.action_url;
      if (!url) return;
      if (typeof url === "string" && url.startsWith("http")) Linking.openURL(url);
      else if (typeof url === "string") router.push(url as any);
    });

    return () => { tapSub.remove(); };
  }, [router]);

  useEffect(() => {
    if (loading) return;
    const first = segments[0];
    const isPublic = first === "pulseira" || first === "convite" || first === "pagamento";
    const inTabs = first === "(tabs)";
    if (isPublic) return;
    if (user && !inTabs && first !== "clinico" && first !== "circulo" && first !== "sos" && first !== "localizacao") {
      router.replace("/(tabs)/hoje");
    } else if (!user && (inTabs || first === "clinico" || first === "circulo" || first === "sos" || first === "localizacao")) {
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
            <Stack.Screen name="clinico" />
            <Stack.Screen name="circulo" />
            <Stack.Screen name="localizacao" />
            <Stack.Screen name="pulseira/[id]" />
            <Stack.Screen name="convite/[code]" />
            <Stack.Screen name="pagamento" />
          </Stack>
        </AuthGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
