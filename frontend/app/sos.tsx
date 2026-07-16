import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Linking as RNLinking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, radius, type, shadow } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

type SosState = {
  status: string;
  last_location: string;
  last_seen: string;
  circle_notified: string[];
  call_number: string;
};

export default function SosModal() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<SosState | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await authFetch("/api/sos", { method: "POST" });
        if (r.ok) setData(await r.json());
      } catch {}
    })();
  }, [authFetch]);

  const call = () => {
    if (data?.call_number) RNLinking.openURL(`tel:${data.call_number}`);
  };

  return (
    <SafeAreaView style={styles.container} testID="sos-modal">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Modo busca</Text>
        <Pressable onPress={() => router.back()} testID="sos-close" hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.onClayRed} />
        </Pressable>
      </View>
      <Text style={styles.subtitle}>Firme, calmo, com você.</Text>

      {!data ? (
        <ActivityIndicator color={colors.onClayRed} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location" size={20} color={colors.clayRed} />
              <Text style={styles.cardTitle}>Última localização</Text>
            </View>
            <Text style={styles.cardBody}>{data.last_location}</Text>
            <Text style={styles.cardMeta}>Última vista {data.last_seen}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="people" size={20} color={colors.clayRed} />
              <Text style={styles.cardTitle}>Círculo avisado</Text>
            </View>
            <View style={styles.circleRow}>
              {data.circle_notified.map((n) => (
                <View key={n} style={styles.chip}>
                  <Text style={styles.chipText}>{n}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="scan" size={20} color={colors.clayRed} />
              <Text style={styles.cardTitle}>Pulseira QR</Text>
            </View>
            <Text style={styles.cardBody}>Ativa. Qualquer bom samaritano pode escanear e nos avisar.</Text>
          </View>

          <Pressable style={styles.callBtn} onPress={call} testID="sos-call-button">
            <Ionicons name="call" size={22} color={colors.clayRed} />
            <Text style={styles.callText}>Ligar para {data.call_number}</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.clayRed, padding: spacing.lg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  title: { fontFamily: type.serif, fontSize: 28, color: colors.onClayRed, fontWeight: "700" },
  subtitle: { fontFamily: type.sans, fontSize: 15, color: "rgba(255,255,255,0.9)", marginTop: 4, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  cardTitle: { fontFamily: type.serif, fontSize: 18, color: colors.onSurface, fontWeight: "600" },
  cardBody: { fontFamily: type.sans, fontSize: 16, color: colors.onSurface, lineHeight: 22 },
  cardMeta: { fontFamily: type.sans, fontSize: 13, color: colors.onSurfaceSoft, marginTop: 4 },
  circleRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 4 },
  chip: { backgroundColor: colors.surfaceTertiary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  chipText: { fontFamily: type.sans, fontSize: 13, color: colors.onSurface, fontWeight: "600" },
  callBtn: {
    backgroundColor: colors.surface, borderRadius: radius.pill, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    marginTop: spacing.md, ...shadow.card,
  },
  callText: { fontFamily: type.sans, color: colors.clayRed, fontWeight: "800", fontSize: 17 },
});
