import React from "react";
import { Tabs, useRouter } from "expo-router";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, type, radius, spacing, shadow } from "@/src/theme";

function TabIcon({ name, focused }: { name: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 44, height: 44 }}>
      <Ionicons name={name} size={24} color={focused ? colors.brand : colors.onSurfaceSoft} />
    </View>
  );
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontFamily: type.sans,
        fontSize: 11,
        color: focused ? colors.brand : colors.onSurfaceSoft,
        fontWeight: focused ? "700" : "500",
      }}
    >
      {label}
    </Text>
  );
}

function SOSButton() {
  const router = useRouter();
  return (
    <Pressable
      testID="sos-button"
      onPress={() => router.push("/sos")}
      style={({ pressed }) => [styles.sos, pressed && { transform: [{ scale: 0.96 }] }]}
    >
      <Ionicons name="alert" size={30} color={colors.onClayRed} />
      <Text style={styles.sosLabel}>SOS</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const barHeight = 62 + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.onSurfaceSoft,
          tabBarStyle: {
            backgroundColor: colors.surfaceSecondary,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: barHeight,
            paddingBottom: insets.bottom,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontFamily: type.sans, fontSize: 11 },
        }}
      >
        <Tabs.Screen
          name="hoje"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="sunny-outline" focused={focused} />,
            tabBarLabel: ({ focused }) => <TabLabel label="Hoje" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="escala"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="calendar-outline" focused={focused} />,
            tabBarLabel: ({ focused }) => <TabLabel label="Escala" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="sos-placeholder"
          options={{
            tabBarButton: () => null,
            tabBarLabel: () => null,
          }}
        />
        <Tabs.Screen
          name="saude"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="heart-outline" focused={focused} />,
            tabBarLabel: ({ focused }) => <TabLabel label="Saúde" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="custos"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="wallet-outline" focused={focused} />,
            tabBarLabel: ({ focused }) => <TabLabel label="Custos" focused={focused} />,
          }}
        />
      </Tabs>
      <View
        pointerEvents="box-none"
        style={[styles.sosWrap, { bottom: insets.bottom + 18 }]}
      >
        <SOSButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sosWrap: {
    position: "absolute",
    left: 0, right: 0, alignItems: "center",
  },
  sos: {
    width: 68, height: 68, borderRadius: radius.pill,
    backgroundColor: colors.clayRed,
    alignItems: "center", justifyContent: "center",
    borderWidth: 4, borderColor: colors.surface,
    ...shadow.card,
    shadowColor: colors.clayRed,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  sosLabel: {
    fontFamily: type.sans, fontSize: 11, fontWeight: "800", color: colors.onClayRed, marginTop: -2,
    letterSpacing: 0.5,
  },
});
