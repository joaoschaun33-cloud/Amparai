import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, radius, type } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

/**
 * Conta — direitos do titular (LGPD Art. 18).
 * - Revogar consentimento (só o Coordenador, que consentiu).
 * - Apagar a conta e os dados. Coordenador apaga a família inteira; Familiar só sai do
 *   círculo. Os logs de consentimento são retidos por 5 anos (obrigação legal).
 * Sem vermelho: a gravidade vem do texto + dupla confirmação (guarda-corpo do app).
 */
export default function ContaScreen() {
  const router = useRouter();
  const { authFetch, logout, isCoordinator, elderName } = useAuth();
  const [busy, setBusy] = useState<null | "revoke" | "delete">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revoke = async () => {
    setBusy("revoke"); setError(null);
    try {
      const r = await authFetch("/api/consent/revoke", { method: "POST" });
      if (r.ok) setRevoked(true);
      else setError("Não consegui revogar agora. Tente de novo.");
    } catch { setError("Não consegui revogar agora. Tente de novo."); }
    setBusy(null);
  };

  const del = async () => {
    setBusy("delete"); setError(null);
    try {
      const r = await authFetch("/api/account", { method: "DELETE" });
      if (r.ok) { await logout(); return; } // logout leva de volta ao login
      const d = await r.json().catch(() => ({}));
      setError(d.detail || "Não consegui apagar agora. Tente de novo.");
    } catch { setError("Não consegui apagar agora. Tente de novo."); }
    setBusy(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="conta-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="conta-back">
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Sua conta</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        {/* Consentimento — só o Coordenador consentiu, então só ele revoga */}
        {isCoordinator && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Consentimento</Text>
            <Text style={styles.cardBody}>
              Você pode retirar o consentimento para o uso dos dados de saúde a qualquer
              momento. Depois disso, o prontuário deixa de poder ser editado até um novo
              consentimento.
            </Text>
            {revoked ? (
              <View style={styles.doneRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.olive} />
                <Text style={styles.doneText}>Consentimento revogado.</Text>
              </View>
            ) : (
              <Pressable style={styles.btnGhost} onPress={revoke} disabled={busy !== null} testID="revoke-consent">
                {busy === "revoke" ? <ActivityIndicator color={colors.brand} /> : <Text style={styles.btnGhostText}>Revogar consentimento</Text>}
              </Pressable>
            )}
          </View>
        )}

        {/* Sessão */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sessão</Text>
          <Pressable style={styles.btnGhost} onPress={logout} testID="conta-logout">
            <Text style={styles.btnGhostText}>Sair desta conta</Text>
          </Pressable>
        </View>

        {/* Exclusão */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Apagar meus dados</Text>
          <Text style={styles.cardBody}>
            {isCoordinator
              ? `Isto apaga a conta e TODOS os dados do cuidado de ${elderName || "quem você cuida"} — de forma imediata e irreversível. Os registros de consentimento são mantidos por 5 anos, por obrigação legal.`
              : "Isto remove você do círculo de cuidado e apaga a sua conta. Os dados da família permanecem com o coordenador."}
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          {!confirmDelete ? (
            <Pressable style={styles.btnGhost} onPress={() => setConfirmDelete(true)} disabled={busy !== null} testID="delete-account">
              <Text style={styles.btnGhostDanger}>
                {isCoordinator ? "Apagar minha conta e os dados" : "Sair do círculo e apagar minha conta"}
              </Text>
            </Pressable>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.confirmText}>Tem certeza? Esta ação não pode ser desfeita.</Text>
              <Pressable style={styles.btnDanger} onPress={del} disabled={busy !== null} testID="confirm-delete">
                {busy === "delete" ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.btnDangerText}>Sim, apagar definitivamente</Text>}
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={() => setConfirmDelete(false)} disabled={busy !== null}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { fontFamily: type.sans, fontSize: 16, fontWeight: "700", color: colors.onSurface },
  card: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  cardTitle: { fontFamily: type.serif, fontSize: 20, color: colors.onSurface },
  cardBody: { fontFamily: type.sans, fontSize: 14, lineHeight: 21, color: colors.onSurfaceSoft },
  btnGhost: { minHeight: 52, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
  btnGhostText: { fontFamily: type.sans, fontSize: 15, fontWeight: "700", color: colors.onSurface },
  btnGhostDanger: { fontFamily: type.sans, fontSize: 15, fontWeight: "700", color: colors.brand },
  btnDanger: { minHeight: 52, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
  btnDangerText: { fontFamily: type.sans, fontSize: 15, fontWeight: "700", color: colors.onBrand },
  confirmText: { fontFamily: type.sans, fontSize: 14, color: colors.onSurface, fontWeight: "600", textAlign: "center" },
  doneRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  doneText: { fontFamily: type.sans, fontSize: 14, color: colors.onSurface },
  error: { fontFamily: type.sans, fontSize: 14, color: colors.onSurfaceSoft },
});
