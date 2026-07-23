import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, radius, type, shadow } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

/**
 * Consentimento (Fase 9a).
 *
 * Porta legal antes da coleta de dados de saúde. Dois caminhos funcionam sem upload:
 *  - titular: a pessoa cuidada toca "Eu autorizo".
 *  - cuidador de fato: declaração por checkbox duplo (texto do advogado).
 * Curatela (anexo do termo) e reforço por selfie/áudio ficam para a Fase 9b (exige Storage).
 *
 * O texto do termo vem do backend (versão controlada pelo servidor).
 */

const DECL_1 =
  "Declaro ser o responsável de fato pela pessoa de quem cuido e autorizo o uso do Amparai para a organização do seu cuidado.";
const DECL_2 =
  "Assumo integral responsabilidade legal por esta declaração perante o aplicativo e terceiros, isentando o Amparai de quaisquer litígios familiares decorrentes do uso e compartilhamento destes dados na plataforma.";

export default function Consentimento() {
  const router = useRouter();
  const { authFetch, refreshOnboarding } = useAuth();

  const [term, setTerm] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Passos: "term" → "capacity" → "declare" (cuidador de fato)
  const [stage, setStage] = useState<"term" | "capacity" | "declare">("term");
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await authFetch("/api/consent/term");
        if (r.ok) {
          const d = await r.json();
          setTerm(d.text || "");
        }
      } catch {}
      setLoading(false);
    })();
  }, [authFetch]);

  const submit = async (method: "titular" | "cuidador_de_fato") => {
    setSaving(true);
    setError(null);
    try {
      const body =
        method === "cuidador_de_fato"
          ? { method, declarations: [DECL_1, DECL_2] }
          : { method, declarations: [] };
      const r = await authFetch("/api/consent", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (r.status !== 201 && !r.ok) throw new Error("falha");
      await refreshOnboarding?.();
      router.back();
    } catch {
      setError("Não consegui registrar agora. Tente de novo em um instante.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="consent-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="consent-back">
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Consentimento</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 1. Termo */}
        {stage === "term" && (
          <View style={styles.block}>
            <Text style={styles.title}>Antes de guardar dados de saúde</Text>
            <View style={styles.termCard}>
              <Text style={styles.termText}>{term}</Text>
            </View>
            <View style={styles.privacyCard}>
              <Ionicons name="lock-closed" size={18} color={colors.brand} />
              <Text style={styles.privacyText}>
                Você pode retirar este consentimento a qualquer momento, com um toque.
              </Text>
            </View>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => setStage("capacity")}
              testID="consent-continue"
            >
              <Text style={styles.primaryBtnText}>Continuar</Text>
            </Pressable>
          </View>
        )}

        {/* 2. Capacidade */}
        {stage === "capacity" && (
          <View style={styles.block}>
            <Text style={styles.title}>
              A pessoa de quem você cuida tem condições de dar este consentimento agora?
            </Text>

            <Pressable
              style={styles.choiceBtn}
              disabled={saving}
              onPress={() => submit("titular")}
              testID="consent-titular"
            >
              <Ionicons name="hand-left" size={22} color={colors.olive} />
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceTitle}>Sim, ela mesma autoriza</Text>
                <Text style={styles.choiceSub}>Ela toca “Eu autorizo” neste aparelho.</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.choiceBtn}
              disabled={saving}
              onPress={() => setStage("declare")}
              testID="consent-nao"
            >
              <Ionicons name="people" size={22} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceTitle}>Não tem condições no momento</Text>
                <Text style={styles.choiceSub}>Você assume como responsável de fato.</Text>
              </View>
            </Pressable>

            <View style={styles.noteCard}>
              <Ionicons name="information-circle" size={20} color={colors.olive} />
              <Text style={styles.noteText}>
                Tem Termo de Curatela? O anexo do documento chega em breve. Por enquanto, se
                você é o responsável de fato, use a opção acima.
              </Text>
            </View>

            {saving && <ActivityIndicator color={colors.brand} />}
            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable onPress={() => setStage("term")} style={styles.backBtn} disabled={saving}>
              <Text style={styles.backText}>Voltar</Text>
            </Pressable>
          </View>
        )}

        {/* 3. Declaração de cuidador de fato */}
        {stage === "declare" && (
          <View style={styles.block}>
            <Text style={styles.title}>Declaração de responsável de fato</Text>

            <Pressable
              style={styles.checkRow}
              onPress={() => setCheck1((v) => !v)}
              testID="consent-check1"
            >
              <Ionicons
                name={check1 ? "checkbox" : "square-outline"}
                size={24}
                color={check1 ? colors.olive : colors.onSurfaceSoft}
              />
              <Text style={styles.checkText}>{DECL_1}</Text>
            </Pressable>

            <Pressable
              style={styles.checkRow}
              onPress={() => setCheck2((v) => !v)}
              testID="consent-check2"
            >
              <Ionicons
                name={check2 ? "checkbox" : "square-outline"}
                size={24}
                color={check2 ? colors.olive : colors.onSurfaceSoft}
              />
              <Text style={styles.checkText}>{DECL_2}</Text>
            </Pressable>

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={[styles.primaryBtn, (!check1 || !check2 || saving) && styles.primaryBtnDisabled]}
              disabled={!check1 || !check2 || saving}
              onPress={() => submit("cuidador_de_fato")}
              testID="consent-declare-submit"
            >
              {saving ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <Text style={styles.primaryBtnText}>Confirmar e continuar</Text>
              )}
            </Pressable>

            <Pressable onPress={() => setStage("capacity")} style={styles.backBtn} disabled={saving}>
              <Text style={styles.backText}>Voltar</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { fontFamily: type.sans, fontSize: 16, fontWeight: "700", color: colors.onSurface },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  block: { gap: spacing.lg },

  title: { fontFamily: type.serif, fontSize: 24, lineHeight: 32, color: colors.onSurface },

  termCard: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  termText: { fontFamily: type.sans, fontSize: 15, lineHeight: 24, color: colors.onSurface },

  privacyCard: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  privacyText: { flex: 1, fontFamily: type.sans, fontSize: 14, lineHeight: 20, color: colors.onSurface },

  choiceBtn: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 64,
  },
  choiceTitle: { fontFamily: type.sans, fontSize: 16, fontWeight: "700", color: colors.onSurface },
  choiceSub: { fontFamily: type.sans, fontSize: 13, color: colors.onSurfaceSoft, marginTop: 2 },

  noteCard: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  noteText: { flex: 1, fontFamily: type.sans, fontSize: 14, lineHeight: 21, color: colors.onSurface },

  checkRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  checkText: { flex: 1, fontFamily: type.sans, fontSize: 14, lineHeight: 21, color: colors.onSurface },

  primaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontFamily: type.sans, fontSize: 17, fontWeight: "700", color: colors.onBrand },

  backBtn: { alignItems: "center", minHeight: 48, justifyContent: "center" },
  backText: { fontFamily: type.sans, fontSize: 15, color: colors.onSurfaceSoft },

  error: { fontFamily: type.sans, fontSize: 14, color: colors.clayRed },
});
