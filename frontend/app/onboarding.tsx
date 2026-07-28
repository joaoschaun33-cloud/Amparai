import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, radius, type, shadow } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

/**
 * Onboarding — primeiro acesso.
 *
 * Três momentos, um único formulário:
 *  1. Acolhimento  — nomeia a solidão do cuidado e derruba a objeção "minha mãe vai ter
 *                    que aprender a usar isso?".
 *  2. Ela          — o único campo obrigatório do app: como a família a chama.
 *  3. A promessa   — mostra (rotulado como exemplo) como será o dia a dia, para que a
 *                    conta nova não caia num app vazio sem entender o valor.
 *
 * Nenhum dado de exemplo é gravado no banco: o exemplo da etapa 3 é apenas ilustração.
 */
export default function Onboarding() {
  const router = useRouter();
  const { user, authFetch, refreshOnboarding, track } = useAuth();
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { track("onboarding_iniciado"); }, [track]);

  const firstName = (user?.name || "").split(" ")[0];
  const shownName = nickname.trim() || "ela";

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await authFetch("/api/elder", {
        method: "PUT",
        body: JSON.stringify({ name: nickname.trim() }),
      });
      if (!r.ok) throw new Error("falha ao salvar");
      track("onboarding_concluido");
      await refreshOnboarding?.();
      router.replace("/(tabs)/hoje");
    } catch {
      setError("Não consegui salvar agora. Tente de novo em um instante.");
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="onboarding-screen">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ---------- 1. Acolhimento ---------- */}
          {step === 0 && (
            <View style={styles.block} testID="onboarding-step-welcome">
              <View style={styles.logoMark}>
                <Ionicons name="heart" size={22} color={colors.onBrand} />
              </View>

              <Text style={styles.title}>
                {firstName ? `Que bom ter você aqui, ${firstName}.` : "Que bom ter você aqui."}
              </Text>

              <Text style={styles.body}>
                Cuidar de quem cuidou da gente é um dos maiores atos de amor. E um dos mais
                solitários.
              </Text>
              <Text style={styles.body}>
                A partir de agora, vocês fazem isso juntos — num lugar calmo, sem planilha e
                sem cobrança.
              </Text>

              <View style={styles.noteCard}>
                <Ionicons name="information-circle" size={20} color={colors.olive} />
                <Text style={styles.noteText}>
                  A sua mãe não precisa instalar nem aprender nada. O app é de vocês.
                </Text>
              </View>

              <Pressable
                style={styles.primaryBtn}
                onPress={() => setStep(1)}
                testID="onboarding-start"
              >
                <Text style={styles.primaryBtnText}>Começar</Text>
              </Pressable>
            </View>
          )}

          {/* ---------- 2. Ela ---------- */}
          {step === 1 && (
            <View style={styles.block} testID="onboarding-step-name">
              <Text style={styles.title}>Quem vocês cuidam?</Text>

              <Text style={styles.label}>Como vocês chamam ela?</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="Mãe, Dona Maria, Vó Ana…"
                placeholderTextColor={colors.onSurfaceSoft}
                autoFocus
                returnKeyType="done"
                maxLength={40}
                testID="onboarding-nickname"
              />
              <Text style={styles.help}>
                É assim que o Amparai vai falar dela com vocês.
              </Text>

              <View style={styles.privacyCard}>
                <Ionicons name="lock-closed" size={18} color={colors.brand} />
                <Text style={styles.privacyText}>
                  O que você guardar aqui é da sua família. Ninguém mais vê.
                </Text>
              </View>

              <Pressable
                style={[styles.primaryBtn, !nickname.trim() && styles.primaryBtnDisabled]}
                disabled={!nickname.trim()}
                onPress={() => setStep(2)}
                testID="onboarding-continue"
              >
                <Text style={styles.primaryBtnText}>Continuar</Text>
              </Pressable>

              <Pressable onPress={() => setStep(0)} style={styles.backBtn}>
                <Text style={styles.backText}>Voltar</Text>
              </Pressable>
            </View>
          )}

          {/* ---------- 3. A promessa ---------- */}
          {step === 2 && (
            <View style={styles.block} testID="onboarding-step-promise">
              <Text style={styles.title}>É assim que vai ser.</Text>
              <Text style={styles.body}>
                Todo dia, em três segundos, você vai saber que está tudo bem — sem abrir
                planilha e sem cobrar ninguém.
              </Text>

              {/* Ilustração — NÃO é dado real, e está rotulada como exemplo. */}
              <View style={styles.exampleWrap}>
                <Text style={styles.exampleTag}>exemplo</Text>
                <View style={styles.statusCard}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={22} color={colors.onOlive} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>Tudo bem com {shownName}</Text>
                    <Text style={styles.statusSub}>Última confirmação: 20h</Text>
                  </View>
                </View>
              </View>

              <View style={styles.noteCard}>
                <Ionicons name="call" size={20} color={colors.brand} />
                <Text style={styles.noteText}>
                  E se acontecer algo, o botão de emergência está sempre aqui — a um toque.
                </Text>
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                disabled={saving}
                onPress={finish}
                testID="onboarding-finish"
              >
                {saving ? (
                  <ActivityIndicator color={colors.onBrand} />
                ) : (
                  <Text style={styles.primaryBtnText}>Entrar no Amparai</Text>
                )}
              </Pressable>

              <Pressable onPress={() => setStep(1)} style={styles.backBtn} disabled={saving}>
                <Text style={styles.backText}>Voltar</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl, flexGrow: 1, justifyContent: "center" },
  block: { gap: spacing.lg },

  logoMark: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },

  title: {
    fontFamily: type.serif,
    fontSize: 30,
    lineHeight: 38,
    color: colors.onSurface,
  },
  body: {
    fontFamily: type.sans,
    fontSize: 17,
    lineHeight: 26,
    color: colors.onSurfaceSoft,
  },

  label: {
    fontFamily: type.sans,
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  input: {
    fontFamily: type.sans,
    fontSize: 18,
    color: colors.onSurface,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  help: {
    fontFamily: type.sans,
    fontSize: 14,
    color: colors.onSurfaceSoft,
  },

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
  noteText: {
    flex: 1,
    fontFamily: type.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
  },

  privacyCard: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  privacyText: {
    flex: 1,
    fontFamily: type.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },

  exampleWrap: { gap: spacing.sm },
  exampleTag: {
    fontFamily: type.sans,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.onSurfaceSoft,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.olive,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadow.card,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    fontFamily: type.serif,
    fontSize: 20,
    color: colors.onOlive,
  },
  statusSub: {
    fontFamily: type.sans,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },

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
  primaryBtnText: {
    fontFamily: type.sans,
    fontSize: 17,
    fontWeight: "700",
    color: colors.onBrand,
  },

  backBtn: { alignItems: "center", minHeight: 48, justifyContent: "center" },
  backText: { fontFamily: type.sans, fontSize: 15, color: colors.onSurfaceSoft },

  error: {
    fontFamily: type.sans,
    fontSize: 14,
    color: colors.clayRed,
  },
});
