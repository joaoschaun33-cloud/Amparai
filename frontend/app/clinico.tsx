import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, radius, type, shadow } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

type Clinico = {
  blood_type?: string;
  allergies: string[];
  conditions: string[];
  surgeries: { when: string; description: string }[];
  continuous_meds: { name: string; dosage: string; notes?: string }[];
  health_plan?: { name?: string; plan?: string; card_number?: string } | null;
  emergency_contacts: { name: string; phone: string; relation: string }[];
  notes?: string;
  mobility?: string;
  cognitive?: string;
};

const MOBILITY = ["independente", "assistida", "cadeira", "acamada"];
const COGNITIVE = ["orientada", "leve", "moderada", "avancada"];
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function ClinicoScreen() {
  const { authFetch, isCoordinator } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Clinico | null>(null);
  const [elderName, setElderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSection, setEditSection] = useState<null | "allergies" | "conditions" | "meds" | "contacts" | "notes" | "surgeries" | "plan">(null);
  const [draftText, setDraftText] = useState("");
  const [draftTwo, setDraftTwo] = useState("");
  const [draftThree, setDraftThree] = useState("");

  const load = useCallback(async () => {
    try {
      const [rc, re] = await Promise.all([authFetch("/api/clinico"), authFetch("/api/elder")]);
      if (rc.ok) setData(await rc.json());
      if (re.ok) setElderName(((await re.json()).name || "").trim());
    } catch {}
    setLoading(false);
  }, [authFetch]);
  useEffect(() => { load(); }, [load]);

  const save = async (next: Clinico) => {
    if (!isCoordinator) return; // Governança: só o coordenador do cuidado edita o prontuário.
    setSaving(true);
    setData(next);
    try {
      await authFetch("/api/clinico", { method: "PUT", body: JSON.stringify(next) });
    } catch {}
    setSaving(false);
  };

  const setMobility = (v: string) => data && save({ ...data, mobility: v });
  const setCognitive = (v: string) => data && save({ ...data, cognitive: v });
  // Toque no já selecionado limpa (permite corrigir). Tipo sanguíneo é enum, não texto livre.
  const setBloodType = (v: string) => data && save({ ...data, blood_type: data.blood_type === v ? undefined : v });

  const addSimple = (kind: "allergies" | "conditions") => {
    if (!data || !draftText.trim()) return setEditSection(null);
    save({ ...data, [kind]: [...data[kind], draftText.trim()] });
    setDraftText(""); setEditSection(null);
  };
  const removeSimple = (kind: "allergies" | "conditions", idx: number) => {
    if (!data) return;
    const next = [...data[kind]];
    next.splice(idx, 1);
    save({ ...data, [kind]: next });
  };
  const addMed = () => {
    if (!data || !draftText.trim()) return setEditSection(null);
    save({ ...data, continuous_meds: [...data.continuous_meds, { name: draftText.trim(), dosage: draftTwo.trim() || "—", notes: draftThree.trim() }] });
    setDraftText(""); setDraftTwo(""); setDraftThree(""); setEditSection(null);
  };
  const removeMed = (idx: number) => {
    if (!data) return;
    const next = [...data.continuous_meds]; next.splice(idx, 1);
    save({ ...data, continuous_meds: next });
  };
  const addContact = () => {
    if (!data || !draftText.trim()) return setEditSection(null);
    save({ ...data, emergency_contacts: [...data.emergency_contacts, { name: draftText.trim(), phone: draftTwo.trim(), relation: draftThree.trim() || "família" }] });
    setDraftText(""); setDraftTwo(""); setDraftThree(""); setEditSection(null);
  };
  const removeContact = (idx: number) => {
    if (!data) return;
    const next = [...data.emergency_contacts]; next.splice(idx, 1);
    save({ ...data, emergency_contacts: next });
  };
  const addSurgery = () => {
    if (!data || !draftText.trim()) return setEditSection(null);
    save({ ...data, surgeries: [...data.surgeries, { when: draftTwo.trim() || "—", description: draftText.trim() }] });
    setDraftText(""); setDraftTwo(""); setEditSection(null);
  };
  const savePlan = () => {
    if (!data) return;
    save({ ...data, health_plan: { name: draftText.trim(), plan: draftTwo.trim(), card_number: draftThree.trim() } });
    setEditSection(null);
  };
  const saveNotes = () => {
    if (!data) return;
    save({ ...data, notes: draftText });
    setEditSection(null);
  };

  const openEdit = (kind: typeof editSection) => {
    setDraftText(""); setDraftTwo(""); setDraftThree("");
    if (kind === "plan" && data?.health_plan) {
      setDraftText(data.health_plan.name || "");
      setDraftTwo(data.health_plan.plan || "");
      setDraftThree(data.health_plan.card_number || "");
    }
    if (kind === "notes") setDraftText(data?.notes || "");
    setEditSection(kind);
  };

  if (loading || !data) {
    return <View style={styles.container}><ActivityIndicator color={colors.brand} style={{ marginTop: 80 }} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="clinico-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="clinico-back">
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Dados clínicos</Text>
        {saving ? <ActivityIndicator color={colors.brand} /> : <View style={{ width: 26 }} />}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Text style={styles.title}>{elderName || "Dados de saúde"}</Text>
        <Text style={styles.subtitle}>O que o médico precisa saber, num só lugar.</Text>

        {!isCoordinator && (
          <View style={styles.readonlyBanner} testID="clinico-readonly">
            <Ionicons name="eye-outline" size={18} color={colors.onSurfaceSoft} />
            <Text style={styles.readonlyText}>
              Você está acompanhando os dados de {elderName || "quem você cuida"}. Só o
              coordenador do cuidado pode editar o prontuário.
            </Text>
          </View>
        )}

        <View style={styles.rowCards}>
          <View style={[styles.miniCard, { backgroundColor: colors.brand }]}>
            <Text style={styles.miniLabel}>Tipo sanguíneo</Text>
            <Text style={[styles.miniValue, { color: colors.onBrand }]}>{data.blood_type || "—"}</Text>
          </View>
          <View style={[styles.miniCard, { backgroundColor: colors.olive }]}>
            <Text style={[styles.miniLabel, { color: "rgba(255,255,255,0.85)" }]}>Mobilidade</Text>
            <Text style={[styles.miniValue, { color: colors.onOlive, textTransform: "capitalize" }]}>{data.mobility || "—"}</Text>
          </View>
        </View>

        <Section title="Tipo sanguíneo">
          <View style={styles.pillsRow}>
            {BLOOD_TYPES.map((b) => (
              <Pressable
                key={b}
                testID={`blood-${b}`}
                onPress={() => setBloodType(b)}
                style={[styles.pill, data.blood_type === b && styles.pillActive]}
              >
                <Text style={[styles.pillText, data.blood_type === b && styles.pillTextActive]}>{b}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Como está a mobilidade">
          <View style={styles.pillsRow}>
            {MOBILITY.map((m) => (
              <Pressable
                key={m}
                testID={`mobility-${m}`}
                onPress={() => setMobility(m)}
                style={[styles.pill, data.mobility === m && styles.pillActive]}
              >
                <Text style={[styles.pillText, data.mobility === m && styles.pillTextActive]}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Estado cognitivo">
          <View style={styles.pillsRow}>
            {COGNITIVE.map((m) => (
              <Pressable
                key={m}
                testID={`cognitive-${m}`}
                onPress={() => setCognitive(m)}
                style={[styles.pill, data.cognitive === m && styles.pillActive]}
              >
                <Text style={[styles.pillText, data.cognitive === m && styles.pillTextActive]}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Alergias" action={isCoordinator ? { label: "Adicionar", onPress: () => openEdit("allergies") } : undefined}>
          {data.allergies.length === 0 ? <Text style={styles.empty}>Nenhuma registrada</Text> : (
            <View style={{ gap: spacing.sm }}>
              {data.allergies.map((a, idx) => (
                <View key={idx} style={styles.tagRow}>
                  <Text style={styles.tagText}>{a}</Text>
                  {isCoordinator && (
                    <Pressable onPress={() => removeSimple("allergies", idx)} testID={`del-allergy-${idx}`} hitSlop={10}>
                      <Ionicons name="close-circle" size={20} color={colors.onSurfaceSoft} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="Condições" action={isCoordinator ? { label: "Adicionar", onPress: () => openEdit("conditions") } : undefined}>
          {data.conditions.length === 0 ? <Text style={styles.empty}>Nenhuma registrada</Text> : (
            <View style={{ gap: spacing.sm }}>
              {data.conditions.map((a, idx) => (
                <View key={idx} style={styles.tagRow}>
                  <Text style={styles.tagText}>{a}</Text>
                  {isCoordinator && (
                    <Pressable onPress={() => removeSimple("conditions", idx)} testID={`del-condition-${idx}`} hitSlop={10}>
                      <Ionicons name="close-circle" size={20} color={colors.onSurfaceSoft} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="Medicações contínuas" action={isCoordinator ? { label: "Adicionar", onPress: () => openEdit("meds") } : undefined}>
          <View style={{ gap: spacing.sm }}>
            {data.continuous_meds.map((m, idx) => (
              <View key={idx} style={styles.itemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{m.name}</Text>
                  <Text style={styles.itemSub}>{m.dosage}{m.notes ? ` · ${m.notes}` : ""}</Text>
                </View>
                {isCoordinator && (
                  <Pressable onPress={() => removeMed(idx)} testID={`del-med-${idx}`} hitSlop={10}>
                    <Ionicons name="close-circle" size={20} color={colors.onSurfaceSoft} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </Section>

        <Section title="Cirurgias / procedimentos" action={isCoordinator ? { label: "Adicionar", onPress: () => openEdit("surgeries") } : undefined}>
          <View style={{ gap: spacing.sm }}>
            {data.surgeries.map((s, idx) => (
              <View key={idx} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{s.description}</Text>
                <Text style={styles.itemSub}>{s.when}</Text>
              </View>
            ))}
            {data.surgeries.length === 0 && <Text style={styles.empty}>Nenhuma registrada</Text>}
          </View>
        </Section>

        <Section title="Plano de saúde" action={isCoordinator ? { label: data.health_plan?.name ? "Editar" : "Adicionar", onPress: () => openEdit("plan") } : undefined}>
          {data.health_plan?.name ? (
            <View style={styles.itemCard}>
              <Text style={styles.itemTitle}>{data.health_plan.name}</Text>
              <Text style={styles.itemSub}>{data.health_plan.plan} · {data.health_plan.card_number}</Text>
            </View>
          ) : <Text style={styles.empty}>Sem plano cadastrado</Text>}
        </Section>

        <Section title="Contatos de emergência" action={isCoordinator ? { label: "Adicionar", onPress: () => openEdit("contacts") } : undefined}>
          <View style={{ gap: spacing.sm }}>
            {data.emergency_contacts.map((c, idx) => (
              <View key={idx} style={styles.itemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{c.name}</Text>
                  <Text style={styles.itemSub}>{c.phone} · {c.relation}</Text>
                </View>
                {isCoordinator && (
                  <Pressable onPress={() => removeContact(idx)} testID={`del-contact-${idx}`} hitSlop={10}>
                    <Ionicons name="close-circle" size={20} color={colors.onSurfaceSoft} />
                  </Pressable>
                )}
              </View>
            ))}
            {data.emergency_contacts.length === 0 && <Text style={styles.empty}>Nenhum registrado</Text>}
          </View>
        </Section>

        <Section title="Observações" action={{ label: "Editar", onPress: () => openEdit("notes") }}>
          <Text style={styles.notes}>{data.notes || "Sem observações."}</Text>
        </Section>
      </ScrollView>

      <Modal transparent visible={editSection !== null} animationType="fade" onRequestClose={() => setEditSection(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editSection === "allergies" && "Nova alergia"}
              {editSection === "conditions" && "Nova condição"}
              {editSection === "meds" && "Nova medicação"}
              {editSection === "surgeries" && "Nova cirurgia / procedimento"}
              {editSection === "contacts" && "Novo contato"}
              {editSection === "plan" && "Plano de saúde"}
              {editSection === "notes" && "Observações"}
            </Text>

            {editSection === "notes" ? (
              <TextInput
                testID="modal-input-1"
                style={[styles.input, { minHeight: 100 }]}
                value={draftText} onChangeText={setDraftText}
                multiline placeholder="Escreva livremente..."
                placeholderTextColor={colors.onSurfaceSoft}
              />
            ) : (
              <TextInput
                testID="modal-input-1"
                style={styles.input}
                value={draftText} onChangeText={setDraftText}
                placeholder={editSection === "surgeries" ? "Descrição" : editSection === "plan" ? "Operadora (ex: Unimed)" : editSection === "contacts" ? "Nome" : editSection === "meds" ? "Nome do remédio" : "Nome"}
                placeholderTextColor={colors.onSurfaceSoft}
              />
            )}
            {(editSection === "meds" || editSection === "contacts" || editSection === "plan" || editSection === "surgeries") && (
              <TextInput
                testID="modal-input-2"
                style={styles.input}
                value={draftTwo} onChangeText={setDraftTwo}
                placeholder={editSection === "meds" ? "Dosagem (ex: 50mg 1x ao dia)" : editSection === "contacts" ? "Telefone" : editSection === "plan" ? "Plano (ex: Nacional)" : "Ano (ex: 2019)"}
                placeholderTextColor={colors.onSurfaceSoft}
              />
            )}
            {(editSection === "meds" || editSection === "contacts" || editSection === "plan") && (
              <TextInput
                testID="modal-input-3"
                style={styles.input}
                value={draftThree} onChangeText={setDraftThree}
                placeholder={editSection === "meds" ? "Observação (ex: após almoço)" : editSection === "contacts" ? "Parentesco / função" : "Nº da carteirinha"}
                placeholderTextColor={colors.onSurfaceSoft}
              />
            )}

            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditSection(null)} style={styles.btnGhost}><Text style={styles.btnGhostText}>Cancelar</Text></Pressable>
              <Pressable
                testID="modal-save"
                onPress={() => {
                  if (editSection === "allergies") addSimple("allergies");
                  else if (editSection === "conditions") addSimple("conditions");
                  else if (editSection === "meds") addMed();
                  else if (editSection === "contacts") addContact();
                  else if (editSection === "surgeries") addSurgery();
                  else if (editSection === "plan") savePlan();
                  else if (editSection === "notes") saveNotes();
                }}
                style={styles.btnPrimary}
              >
                <Text style={styles.btnPrimaryText}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Section({ title, action, children }: { title: string; action?: { label: string; onPress: () => void }; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.xl }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action && (
          <Pressable onPress={action.onPress} testID={`add-${title.split(" ")[0].toLowerCase()}`}>
            <Text style={styles.sectionAction}>+ {action.label}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surfaceSecondary },
  headerTitle: { fontFamily: type.serif, fontSize: 18, color: colors.onSurface, fontWeight: "600" },
  title: { fontFamily: type.serif, fontSize: 28, color: colors.onSurface, fontWeight: "600" },
  subtitle: { fontFamily: type.sans, fontSize: 15, color: colors.onSurfaceSoft, marginTop: 4 },
  rowCards: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  miniCard: { flex: 1, borderRadius: radius.md, padding: spacing.md, ...shadow.card },
  miniLabel: { fontFamily: type.sans, fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  miniValue: { fontFamily: type.serif, fontSize: 22, fontWeight: "700", marginTop: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  sectionTitle: { fontFamily: type.serif, fontSize: 18, color: colors.onSurface, fontWeight: "600" },
  sectionAction: { fontFamily: type.sans, fontSize: 14, color: colors.brand, fontWeight: "700" },
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pillText: { fontFamily: type.sans, fontSize: 13, color: colors.onSurface, textTransform: "capitalize" },
  pillTextActive: { color: colors.onBrand, fontWeight: "700" },
  tagRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  readonlyBanner: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  readonlyText: { flex: 1, fontFamily: type.sans, fontSize: 13, lineHeight: 19, color: colors.onSurfaceSoft },
  tagText: { fontFamily: type.sans, fontSize: 15, color: colors.onSurface, flex: 1 },
  itemCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  itemTitle: { fontFamily: type.sans, fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  itemSub: { fontFamily: type.sans, fontSize: 13, color: colors.onSurfaceSoft, marginTop: 2 },
  empty: { fontFamily: type.sans, fontSize: 14, color: colors.onSurfaceSoft, fontStyle: "italic" },
  notes: { fontFamily: type.serif, fontSize: 15, color: colors.onSurface, lineHeight: 22, fontStyle: "italic" },

  modalBg: { flex: 1, backgroundColor: "rgba(62,47,37,0.55)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  modalTitle: { fontFamily: type.serif, fontSize: 20, color: colors.onSurface, fontWeight: "600" },
  input: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontFamily: type.sans, fontSize: 15, color: colors.onSurface },
  modalActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  btnGhost: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  btnGhostText: { fontFamily: type.sans, fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  btnPrimary: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: radius.pill, backgroundColor: colors.brand },
  btnPrimaryText: { fontFamily: type.sans, fontSize: 15, color: colors.onBrand, fontWeight: "700" },
});
