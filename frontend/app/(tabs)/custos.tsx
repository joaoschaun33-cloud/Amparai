import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Linking as RNLinking } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, type, shadow } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

type Expense = { id: string; title: string; amount: number; category: string; date: string; paid_by: string; split_status: Record<string, string>; receipt_thumb?: string };

export default function CustosScreen() {
  const { authFetch } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [pendentes, setPendentes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [members, setMembers] = useState<string[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Medicamentos");
  const [dateStr, setDateStr] = useState("");
  const [receiptThumb, setReceiptThumb] = useState<string | undefined>();

  const load = useCallback(async () => {
    try {
      const r = await authFetch("/api/custos");
      if (r.ok) {
        const d = await r.json();
        setExpenses(d.expenses);
        setTotal(d.total);
        setPendentes(d.pendentes);
      }
      const rm = await authFetch("/api/members");
      if (rm.ok) {
        const md = await rm.json();
        setMembers(["Você", ...(md.members || []).map((m: any) => m.name)]);
      }
    } catch {}
    setLoading(false);
  }, [authFetch]);
  useEffect(() => { load(); }, [load]);

  const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const pickAndOcr = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6, base64: true,
    });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setOcrBusy(true);
    const b64 = res.assets[0].base64;
    setReceiptThumb(`data:image/jpeg;base64,${b64}`);
    try {
      const r = await authFetch("/api/ocr/receipt", { method: "POST", body: JSON.stringify({ image_base64: b64 }) });
      if (r.ok) {
        const d = await r.json();
        setTitle(d.title || "");
        setAmount(d.amount ? String(d.amount) : "");
        setCategory(d.category || "Outros");
        setDateStr(d.date || "");
      }
    } catch {}
    setOcrBusy(false);
    setShowAdd(true);
  };

  const saveExpense = async () => {
    const parsedAmount = parseFloat(amount.replace(",", ".")) || 0;
    const split: Record<string, string> = {};
    members.forEach((m) => (split[m] = m === "Você" ? "pago" : "pendente"));
    await authFetch("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        title: title || "Despesa",
        amount: parsedAmount,
        category,
        date: dateStr || new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        paid_by: "Você",
        split_status: split,
        receipt_thumb: receiptThumb,
      }),
    });
    setTitle(""); setAmount(""); setCategory("Medicamentos"); setDateStr(""); setReceiptThumb(undefined);
    setShowAdd(false);
    await load();
  };

  const nudge = async (name: string, expense: Expense) => {
    try {
      const r = await authFetch("/api/whatsapp/nudge", {
        method: "POST",
        body: JSON.stringify({
          to_name: name,
          to_phone: "",
          amount: expense.amount / Math.max(1, Object.keys(expense.split_status).length),
          expense_title: expense.title,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        RNLinking.openURL(d.url);
      }
    } catch {}
  };

  if (loading) return <View style={styles.container}><ActivityIndicator color={colors.brand} style={{ marginTop: 80 }} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="custos-screen">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}>
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
              {e.receipt_thumb ? (
                <Image source={{ uri: e.receipt_thumb }} style={styles.expenseThumb} contentFit="cover" />
              ) : (
                <View style={styles.expenseIcon}><Ionicons name="receipt-outline" size={20} color={colors.brand} /></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.expenseTitle}>{e.title}</Text>
                <Text style={styles.expenseSub}>{e.category} · {e.date} · pago por {e.paid_by}</Text>
              </View>
              <Text style={styles.expenseAmount}>{formatBRL(e.amount)}</Text>
            </View>
            <View style={styles.splitRow}>
              {Object.entries(e.split_status).map(([name, status]) => (
                <View key={name} style={styles.splitItem}>
                  <View style={[styles.splitChip, status === "pago" ? styles.splitPago : styles.splitPendente]}>
                    <Ionicons name={status === "pago" ? "checkmark-circle" : "time-outline"} size={12} color={status === "pago" ? colors.onOlive : colors.onAmber} />
                    <Text style={[styles.splitText, { color: status === "pago" ? colors.onOlive : colors.onAmber }]}>{name} · {status}</Text>
                  </View>
                  {status === "pendente" && (
                    <Pressable onPress={() => nudge(name, e)} testID={`nudge-${e.id}-${name}`} hitSlop={8}>
                      <View style={styles.nudgeBtn}>
                        <Ionicons name="logo-whatsapp" size={14} color={colors.olive} />
                        <Text style={styles.nudgeText}>Cobrar gentil</Text>
                      </View>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.floatingWrap}>
        <Pressable style={[styles.ctaBtn, { backgroundColor: colors.olive }]} onPress={pickAndOcr} testID="ocr-button">
          {ocrBusy ? <ActivityIndicator color={colors.onOlive} /> : <Ionicons name="camera-outline" size={20} color={colors.onOlive} />}
          <Text style={[styles.ctaText, { color: colors.onOlive }]}>Escanear recibo</Text>
        </Pressable>
        <Pressable style={styles.ctaBtn} onPress={() => setShowAdd(true)} testID="add-expense-button">
          <Ionicons name="add" size={20} color={colors.onBrand} />
          <Text style={styles.ctaText}>Adicionar</Text>
        </Pressable>
      </View>

      <Modal transparent visible={showAdd} animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{receiptThumb ? "Confirme o recibo" : "Nova despesa"}</Text>
            {receiptThumb && (
              <Image source={{ uri: receiptThumb }} style={styles.previewImg} contentFit="cover" />
            )}
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Descrição" placeholderTextColor={colors.onSurfaceSoft} testID="expense-title-input" />
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="Valor (ex: 187,40)" placeholderTextColor={colors.onSurfaceSoft} keyboardType="decimal-pad" testID="expense-amount-input" />
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <TextInput style={[styles.input, { flex: 1 }]} value={category} onChangeText={setCategory} placeholder="Categoria" placeholderTextColor={colors.onSurfaceSoft} />
              <TextInput style={[styles.input, { flex: 1 }]} value={dateStr} onChangeText={setDateStr} placeholder="Data (DD/MM)" placeholderTextColor={colors.onSurfaceSoft} />
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowAdd(false)} style={styles.btnGhost}><Text style={styles.btnGhostText}>Cancelar</Text></Pressable>
              <Pressable onPress={saveExpense} style={styles.btnPrimary} testID="save-expense"><Text style={styles.btnPrimaryText}>Salvar</Text></Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  expenseThumb: { width: 44, height: 44, borderRadius: radius.sm },
  expenseIcon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  expenseTitle: { fontFamily: type.sans, fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  expenseSub: { fontFamily: type.sans, fontSize: 12, color: colors.onSurfaceSoft, marginTop: 2 },
  expenseAmount: { fontFamily: type.serif, fontSize: 18, color: colors.onSurface, fontWeight: "700" },
  splitRow: { marginTop: spacing.md, gap: spacing.sm },
  splitItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  splitChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  splitPago: { backgroundColor: colors.olive },
  splitPendente: { backgroundColor: colors.amber },
  splitText: { fontFamily: type.sans, fontSize: 11, fontWeight: "700" },
  nudgeBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.olive },
  nudgeText: { fontFamily: type.sans, fontSize: 11, color: colors.olive, fontWeight: "700" },
  floatingWrap: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: 100, flexDirection: "row", gap: spacing.sm },
  ctaBtn: { flex: 1, backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, ...shadow.card },
  ctaText: { fontFamily: type.sans, color: colors.onBrand, fontWeight: "700", fontSize: 14 },

  modalBg: { flex: 1, backgroundColor: "rgba(62,47,37,0.55)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  modalTitle: { fontFamily: type.serif, fontSize: 22, color: colors.onSurface, fontWeight: "600" },
  previewImg: { width: "100%", height: 160, borderRadius: radius.md },
  input: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontFamily: type.sans, fontSize: 15, color: colors.onSurface },
  modalActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  btnGhost: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  btnGhostText: { fontFamily: type.sans, fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  btnPrimary: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: radius.pill, backgroundColor: colors.brand },
  btnPrimaryText: { fontFamily: type.sans, fontSize: 15, color: colors.onBrand, fontWeight: "700" },
});
