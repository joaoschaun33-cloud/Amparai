import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, type, shadow } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

type Expense = { id: string; title: string; amount: number; category: string; date: string; paid_by: string; split_status: Record<string, string> };

export default function CustosScreen() {
  const { authFetch } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [pendentes, setPendentes] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await authFetch("/api/custos");
      if (r.ok) {
        const d = await r.json();
        setExpenses(d.expenses);
        setTotal(d.total);
        setPendentes(d.pendentes);
      }
    } catch {}
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.container}><ActivityIndicator color={colors.brand} style={{ marginTop: 80 }} /></View>;

  const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="custos-screen">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }}>
        <Text style={styles.title}>Custos deste mês</Text>
        <Text style={styles.subtitle}>Dividido entre o círculo, com carinho.</Text>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total do mês</Text>
          <Text style={styles.totalValue}>{formatBRL(total)}</Text>
          <Text style={styles.totalSub}>
            {pendentes === 0 ? "Todos em dia — obrigado a todos ✨" : `${pendentes} pagamento${pendentes > 1 ? "s" : ""} pendente${pendentes > 1 ? "s" : ""}`}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Despesas</Text>
        {expenses.map((e) => (
          <View key={e.id} style={styles.expenseCard} testID={`expense-${e.id}`}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <View style={styles.expenseIcon}>
                <Ionicons name="receipt-outline" size={20} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.expenseTitle}>{e.title}</Text>
                <Text style={styles.expenseSub}>{e.category} · {e.date} · pago por {e.paid_by}</Text>
              </View>
              <Text style={styles.expenseAmount}>{formatBRL(e.amount)}</Text>
            </View>
            <View style={styles.splitRow}>
              {Object.entries(e.split_status).map(([name, status]) => (
                <View
                  key={name}
                  style={[
                    styles.splitChip,
                    status === "pago" ? styles.splitPago : styles.splitPendente,
                  ]}
                >
                  <Ionicons
                    name={status === "pago" ? "checkmark-circle" : "time-outline"}
                    size={12}
                    color={status === "pago" ? colors.onOlive : colors.onAmber}
                  />
                  <Text style={[styles.splitText, { color: status === "pago" ? colors.onOlive : colors.onAmber }]}>
                    {name} · {status}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Pressable style={styles.addBtn} testID="add-expense-button">
        <Ionicons name="add" size={22} color={colors.onBrand} />
        <Text style={styles.addText}>Adicionar despesa</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  title: { fontFamily: type.serif, fontSize: 28, color: colors.onSurface, fontWeight: "600" },
  subtitle: { fontFamily: type.sans, fontSize: 15, color: colors.onSurfaceSoft, marginTop: 4 },
  totalCard: { backgroundColor: colors.brand, borderRadius: radius.lg, padding: spacing.xl, marginTop: spacing.lg, ...shadow.card },
  totalLabel: { fontFamily: type.sans, fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  totalValue: { fontFamily: type.serif, fontSize: 40, color: colors.onBrand, fontWeight: "700", marginTop: 4 },
  totalSub: { fontFamily: type.sans, fontSize: 14, color: "rgba(255,255,255,0.9)", marginTop: spacing.sm },
  sectionTitle: { fontFamily: type.serif, fontSize: 22, color: colors.onSurface, fontWeight: "600", marginTop: spacing.xl, marginBottom: spacing.md },
  expenseCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  expenseIcon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  expenseTitle: { fontFamily: type.sans, fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  expenseSub: { fontFamily: type.sans, fontSize: 12, color: colors.onSurfaceSoft, marginTop: 2 },
  expenseAmount: { fontFamily: type.serif, fontSize: 18, color: colors.onSurface, fontWeight: "700" },
  splitRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  splitChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  splitPago: { backgroundColor: colors.olive },
  splitPendente: { backgroundColor: colors.amber },
  splitText: { fontFamily: type.sans, fontSize: 11, fontWeight: "700" },
  addBtn: {
    position: "absolute", left: spacing.lg, right: spacing.lg, bottom: 100,
    backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    ...shadow.card,
  },
  addText: { fontFamily: type.sans, color: colors.onBrand, fontWeight: "700", fontSize: 15 },
});
