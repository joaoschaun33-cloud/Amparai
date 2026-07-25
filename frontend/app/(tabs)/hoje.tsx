import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, radius, type, shadow } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

type HojeData = {
  greeting: string;
  elder: { name: string; photo_url: string; age: number; last_confirmation: string; status: string };
  medications: { total: number; taken: number; items: { id: string; name: string; dosage: string; time: string; taken: boolean; period: string }[] };
  shifts: { id: string; day_label: string; caregiver_name: string; caregiver_avatar: string; role: string; slot: string; covered: boolean }[];
  appointments: { id: string; title: string; when: string; doctor: string; place: string }[];
};

export default function HojeScreen() {
  const { authFetch, user, logout, elderName } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<HojeData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [onboarding, setOnboarding] = useState<{ steps: { consent: boolean; clinical: boolean; circle: boolean }; completed: number; total: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await authFetch("/api/hoje");
      if (r.ok) setData(await r.json());
    } catch {}
  }, [authFetch]);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const r = await authFetch("/api/summary/weekly");
      if (r.ok) {
        const d = await r.json();
        setSummary(d.summary);
      }
    } catch {}
    setLoadingSummary(false);
  }, [authFetch]);

  const loadOnboarding = useCallback(async () => {
    try {
      const r = await authFetch("/api/onboarding/status");
      if (r.ok) setOnboarding(await r.json());
    } catch {}
  }, [authFetch]);

  useEffect(() => { load(); loadSummary(); loadOnboarding(); }, [load, loadSummary, loadOnboarding]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), loadSummary(), loadOnboarding()]);
    setRefreshing(false);
  };

  const toggleMed = async (id: string) => {
    // optimistic
    setData((prev) => {
      if (!prev) return prev;
      const items = prev.medications.items.map((m) => m.id === id ? { ...m, taken: !m.taken } : m);
      const taken = items.filter((m) => m.taken).length;
      return { ...prev, medications: { ...prev.medications, items, taken } };
    });
    await authFetch(`/api/medications/${id}/toggle`, { method: "POST" });
  };

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "";

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="hoje-screen">
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.hello}>Olá, {firstName}</Text>
            <Text style={styles.date}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</Text>
          </View>
          <Pressable onPress={logout} testID="logout-button" hitSlop={12}>
            <Ionicons name="log-out-outline" size={22} color={colors.onSurfaceSoft} />
          </Pressable>
        </View>

        {/* Status Card — só afirma "tudo bem" quando existe confirmação de verdade.
            Numa conta nova, sem nenhum registro, afirmar isso seria mentir sobre a
            saúde de alguém — exatamente o oposto do que este produto promete. */}
        {data.elder.last_confirmation ? (
          <View style={styles.statusCard} testID="status-card">
            {data.elder.photo_url ? (
              <Image source={{ uri: data.elder.photo_url }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Ionicons name="person" size={24} color={colors.onOlive} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.statusBadge}>
                <View style={styles.dot} />
                <Text style={styles.statusBadgeText}>Tudo bem</Text>
              </View>
              <Text style={styles.statusTitle}>Tudo bem com {data.elder.name}</Text>
              <Text style={styles.statusSub}>Última confirmação às {data.elder.last_confirmation}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.onboardCard} testID="status-card-empty">
            <Text style={styles.onboardTitle}>O cuidado de {data.elder.name} começa aqui.</Text>
            <Text style={styles.onboardSub}>
              Assim que houver o primeiro registro do dia, você vai saber aqui — em três
              segundos — que está tudo bem.
            </Text>
          </View>
        )}

        {/* Quick shortcuts */}
        <View style={styles.shortcutRow}>
          <Pressable style={styles.shortcut} onPress={() => router.push("/clinico")} testID="shortcut-clinico">
            <View style={[styles.shortIcon, { backgroundColor: colors.olive }]}>
              <Ionicons name="medkit" size={20} color={colors.onOlive} />
            </View>
            <Text style={styles.shortLabel}>Dados clínicos</Text>
          </Pressable>
          <Pressable style={styles.shortcut} onPress={() => router.push("/circulo")} testID="shortcut-circulo">
            <View style={[styles.shortIcon, { backgroundColor: colors.brand }]}>
              <Ionicons name="people" size={20} color={colors.onBrand} />
            </View>
            <Text style={styles.shortLabel}>Círculo</Text>
          </Pressable>
        </View>

        {/* Onboarding checklist — only when incomplete */}
        {onboarding && onboarding.completed < onboarding.total && (
          <View style={styles.onboardCard} testID="onboarding-checklist">
            <View style={styles.onboardHeader}>
              <View>
                <Text style={styles.onboardTitle}>Primeiros passos</Text>
                <Text style={styles.onboardSub}>{onboarding.completed} de {onboarding.total} completos</Text>
              </View>
              <View style={styles.progressPill}>
                <Text style={styles.progressText}>{Math.round((onboarding.completed / onboarding.total) * 100)}%</Text>
              </View>
            </View>
            {/* Consentimento agora existe de verdade (Fase 9a): leva à tela real de termo
                + base legal, e o "done" reflete o registro de consentimento no backend. */}
            <ChecklistItem
              done={onboarding.steps.consent}
              label="Autorizar o uso dos dados de saúde"
              onPress={() => router.push("/consentimento")}
              testID="step-consent"
            />
            <ChecklistItem
              done={onboarding.steps.clinical}
              label="Preencher os dados clínicos"
              onPress={() => router.push("/clinico")}
              testID="step-clinical"
            />
            <ChecklistItem
              done={onboarding.steps.circle}
              label="Convidar a família para o círculo"
              onPress={() => router.push("/circulo")}
              testID="step-circle"
            />
          </View>
        )}

        {/* Medications */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Remédios de hoje</Text>
          <Text style={styles.sectionCount}>{data.medications.taken} de {data.medications.total} ✓</Text>
        </View>
        <View style={styles.card}>
          {data.medications.items.map((m, idx) => (
            <Pressable
              key={m.id}
              testID={`medication-${m.id}`}
              onPress={() => toggleMed(m.id)}
              style={[styles.medRow, idx > 0 && styles.divider]}
            >
              <View style={[styles.medCheck, m.taken && styles.medCheckDone]}>
                {m.taken && <Ionicons name="checkmark" size={16} color={colors.onOlive} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.medName, m.taken && { textDecorationLine: "line-through", color: colors.onSurfaceSoft }]}>
                  {m.name} <Text style={styles.medDose}>{m.dosage}</Text>
                </Text>
                <Text style={styles.medTime}>{m.time} · {m.period === "manha" ? "manhã" : m.period}</Text>
              </View>
              {!m.taken && (
                <View style={styles.medPending}>
                  <Text style={styles.medPendingText}>Aguardando</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Shifts */}
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Plantão</Text></View>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          {data.shifts.slice(0, 2).map((s) => (
            <View key={s.id} style={[styles.shiftCard, { flex: 1 }]} testID={`shift-${s.id}`}>
              <Text style={styles.shiftDay}>{s.day_label}</Text>
              <View style={styles.shiftPersonRow}>
                <View style={styles.shiftAvatar}>
                  <Text style={styles.shiftAvatarText}>{s.caregiver_avatar || "?"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shiftName} numberOfLines={1}>{s.caregiver_name || "Sem cobertura"}</Text>
                  <Text style={styles.shiftRole}>{s.role || "quer assumir?"}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Appointments */}
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Próximos compromissos</Text></View>
        <View style={styles.card}>
          {data.appointments.map((a, idx) => (
            <View key={a.id} style={[styles.apptRow, idx > 0 && styles.divider]}>
              <View style={styles.apptIcon}>
                <Ionicons name="calendar" size={18} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.apptTitle}>{a.title}</Text>
                <Text style={styles.apptSub}>{a.when} · {a.doctor} · {a.place}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Weekly summary */}
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Como foi a semana de {elderName || "quem você cuida"}</Text></View>
        <View style={styles.summaryCard} testID="weekly-summary">
          <View style={styles.summaryIcon}>
            <Ionicons name="sparkles" size={16} color={colors.onAmber} />
          </View>
          {loadingSummary ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.md }} />
          ) : (
            <Text style={styles.summaryText}>{summary}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChecklistItem({ done, label, onPress, testID }: { done: boolean; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable style={styles.checkRow} onPress={onPress} testID={testID}>
      <View style={[styles.checkBox, done && styles.checkBoxDone]}>
        {done && <Ionicons name="checkmark" size={14} color={colors.onOlive} />}
      </View>
      <Text style={[styles.checkLabel, done && styles.checkLabelDone]}>{label}</Text>
      {!done && <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceSoft} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: spacing.lg },
  hello: { fontFamily: type.serif, fontSize: 28, color: colors.onSurface, fontWeight: "600" },
  date: { fontFamily: type.sans, fontSize: 13, color: colors.onSurfaceSoft, marginTop: 2, textTransform: "capitalize" },

  statusCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.olive, padding: spacing.lg, borderRadius: radius.lg,
    ...shadow.card,
  },
  avatar: { width: 72, height: 72, borderRadius: radius.pill, borderWidth: 3, borderColor: colors.surfaceSecondary },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: "#B8D48A" },
  statusBadgeText: { fontFamily: type.sans, color: colors.onOlive, fontSize: 12, fontWeight: "700" },
  statusTitle: { fontFamily: type.serif, fontSize: 20, color: colors.onOlive, fontWeight: "600" },
  statusSub: { fontFamily: type.sans, fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 2 },

  shortcutRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  shortcut: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  shortIcon: { width: 36, height: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  shortLabel: { fontFamily: type.sans, fontSize: 14, color: colors.onSurface, fontWeight: "600", flex: 1 },

  onboardCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.amber, padding: spacing.lg, marginTop: spacing.lg, gap: spacing.sm },
  onboardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  onboardTitle: { fontFamily: type.serif, fontSize: 18, color: colors.onSurface, fontWeight: "600" },
  onboardSub: { fontFamily: type.sans, fontSize: 12, color: colors.onSurfaceSoft, marginTop: 2 },
  progressPill: { backgroundColor: colors.amber, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
  progressText: { fontFamily: type.sans, fontSize: 13, fontWeight: "800", color: colors.onAmber },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 8 },
  checkBox: { width: 24, height: 24, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkBoxDone: { backgroundColor: colors.olive, borderColor: colors.olive },
  checkLabel: { flex: 1, fontFamily: type.sans, fontSize: 14, color: colors.onSurface },
  checkLabelDone: { color: colors.onSurfaceSoft, textDecorationLine: "line-through" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { fontFamily: type.serif, fontSize: 20, color: colors.onSurface, fontWeight: "600" },
  sectionCount: { fontFamily: type.sans, fontSize: 14, color: colors.olive, fontWeight: "700" },

  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  medRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  medCheck: { width: 28, height: 28, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.olive, alignItems: "center", justifyContent: "center" },
  medCheckDone: { backgroundColor: colors.olive },
  medName: { fontFamily: type.sans, fontSize: 16, color: colors.onSurface, fontWeight: "600" },
  medDose: { fontWeight: "400", color: colors.onSurfaceSoft },
  medTime: { fontFamily: type.sans, fontSize: 13, color: colors.onSurfaceSoft, marginTop: 2 },
  medPending: { backgroundColor: colors.amber, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  medPendingText: { fontFamily: type.sans, fontSize: 11, color: colors.onAmber, fontWeight: "700" },

  shiftCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  shiftDay: { fontFamily: type.sans, fontSize: 12, color: colors.onSurfaceSoft, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  shiftPersonRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  shiftAvatar: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  shiftAvatarText: { color: colors.onBrand, fontFamily: type.sans, fontWeight: "700" },
  shiftName: { fontFamily: type.sans, fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  shiftRole: { fontFamily: type.sans, fontSize: 12, color: colors.onSurfaceSoft },

  apptRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  apptIcon: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  apptTitle: { fontFamily: type.sans, fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  apptSub: { fontFamily: type.sans, fontSize: 13, color: colors.onSurfaceSoft, marginTop: 2 },

  summaryCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, position: "relative" },
  summaryIcon: { position: "absolute", top: -10, left: 16, width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.amber, alignItems: "center", justifyContent: "center" },
  summaryText: { fontFamily: type.serif, fontSize: 16, lineHeight: 24, color: colors.onSurface, fontStyle: "italic" },
});
