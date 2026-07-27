import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, type, shadow } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import AddCareModal from "@/src/components/AddCareModal";
import { CardSkeleton } from "@/src/components/SkeletonLoader";

type Event = { id: string; when: string; kind: string; title: string; detail: string; source: string };

const kindIcon: Record<string, keyof typeof import("@expo/vector-icons/build/Ionicons").glyphMap> = {
  pressao: "pulse-outline",
  audio: "mic-outline",
  observacao: "sparkles-outline",
  consulta: "medkit-outline",
};

export default function SaudeScreen() {
  const { authFetch, elderName } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await authFetch("/api/saude");
      if (r.ok) {
        const d = await r.json();
        setEvents(d.events);
      }
    } catch {}
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={{ padding: spacing.lg, gap: spacing.md, marginTop: spacing.md }}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="saude-screen">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Saúde de {elderName || "quem você cuida"}</Text>
            <Text style={styles.subtitle}>Tudo que a família registrou, em ordem.</Text>
          </View>
          <Pressable
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            testID="saude-add-btn"
          >
            <Ionicons name="add-circle" size={20} color={colors.onBrand} />
            <Text style={styles.addBtnText}>Registrar</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          {events.map((e, idx) => (
            <View key={e.id} style={styles.row} testID={`event-${e.id}`}>
              <View style={styles.timelineCol}>
                <View style={styles.timelineDot}>
                  <Ionicons name={kindIcon[e.kind] || "ellipse-outline"} size={14} color={colors.onBrand} />
                </View>
                {idx < events.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={[styles.card, e.source === "ia" && styles.iaCard]}>
                <Text style={styles.when}>{e.when}</Text>
                <Text style={styles.evTitle}>{e.title}</Text>
                <Text style={styles.detail}>{e.detail}</Text>
                {e.source === "whatsapp_audio" && (
                  <View style={styles.chip}><Ionicons name="logo-whatsapp" size={12} color={colors.olive} /><Text style={styles.chipText}>áudio da família</Text></View>
                )}
                {e.source === "ia" && (
                  <View style={[styles.chip, { backgroundColor: colors.amber }]}><Ionicons name="sparkles" size={12} color={colors.onAmber} /><Text style={[styles.chipText, { color: colors.onAmber }]}>observação gentil</Text></View>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <Pressable style={styles.pdfBtn} testID="pdf-button">
        <Ionicons name="document-text-outline" size={20} color={colors.onBrand} />
        <Text style={styles.pdfText}>Gerar PDF para a consulta</Text>
      </Pressable>

      <AddCareModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={load}
        initialCategory="event"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  title: { fontFamily: type.serif, fontSize: 28, color: colors.onSurface, fontWeight: "600" },
  subtitle: { fontFamily: type.sans, fontSize: 15, color: colors.onSurfaceSoft, marginTop: 4 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  addBtnText: {
    fontFamily: type.sans,
    fontSize: 13,
    fontWeight: "700",
    color: colors.onBrand,
  },
  row: { flexDirection: "row", gap: spacing.md },
  timelineCol: { alignItems: "center", width: 32 },
  timelineDot: { width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", marginTop: 6 },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
  card: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  iaCard: { backgroundColor: "#FFF3DF", borderColor: colors.amber },
  when: { fontFamily: type.sans, fontSize: 12, color: colors.onSurfaceSoft, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  evTitle: { fontFamily: type.serif, fontSize: 18, color: colors.onSurface, fontWeight: "600", marginTop: 4 },
  detail: { fontFamily: type.sans, fontSize: 15, color: colors.onSurface, marginTop: 4, lineHeight: 22 },
  chip: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginTop: spacing.sm },
  chipText: { fontFamily: type.sans, fontSize: 11, color: colors.olive, fontWeight: "700" },
  pdfBtn: {
    position: "absolute", left: spacing.lg, right: spacing.lg, bottom: 100,
    backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    ...shadow.card,
  },
  pdfText: { fontFamily: type.sans, color: colors.onBrand, fontWeight: "700", fontSize: 15 },
});
