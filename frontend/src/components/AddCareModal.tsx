import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, type, shadow } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

export type CareCategory = "medication" | "event" | "appointment" | "shift";

interface AddCareModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCategory?: CareCategory;
}

export default function AddCareModal({
  visible,
  onClose,
  onSuccess,
  initialCategory = "medication",
}: AddCareModalProps) {
  const { authFetch } = useAuth();
  const [category, setCategory] = useState<CareCategory>(initialCategory);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCategory(initialCategory);
    }
  }, [visible, initialCategory]);

  // Form states
  // 1. Remédio
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medTime, setMedTime] = useState("");

  // 2. Diário / Alimentação
  const [evtTitle, setEvtTitle] = useState("Alimentação");
  const [evtDetail, setEvtDetail] = useState("");
  const [evtTime, setEvtTime] = useState("");

  // 3. Consulta
  const [apptTitle, setApptTitle] = useState("");
  const [apptWhen, setApptWhen] = useState("");
  const [apptDoctor, setApptDoctor] = useState("");

  // 4. Plantão
  const [shiftDay, setShiftDay] = useState("Hoje");
  const [shiftSlot, setShiftSlot] = useState("Manhã (08h - 14h)");
  const [shiftCaregiver, setShiftCaregiver] = useState("");

  const resetForms = () => {
    setMedName("");
    setMedDosage("");
    setMedTime("");
    setEvtTitle("Alimentação");
    setEvtDetail("");
    setEvtTime("");
    setApptTitle("");
    setApptWhen("");
    setApptDoctor("");
    setShiftDay("Hoje");
    setShiftSlot("Manhã (08h - 14h)");
    setShiftCaregiver("");
    setError(null);
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);

    try {
      if (category === "medication") {
        if (!medName.trim() || !medDosage.trim() || !medTime.trim()) {
          throw new Error("Preencha nome, dosagem e horário do remédio.");
        }
        const r = await authFetch("/api/medications", {
          method: "POST",
          body: JSON.stringify({
            name: medName.trim(),
            dosage: medDosage.trim(),
            time: medTime.trim(),
          }),
        });
        if (!r.ok) throw new Error("Não foi possível salvar o remédio.");
      } else if (category === "event") {
        if (!evtDetail.trim()) {
          throw new Error("Descreva o que aconteceu no dia.");
        }
        const r = await authFetch("/api/health_events", {
          method: "POST",
          body: JSON.stringify({
            title: evtTitle.trim() || "Registro do dia",
            detail: evtDetail.trim(),
            when: evtTime.trim() || undefined,
            kind: evtTitle.toLowerCase().includes("alimenta") ? "alimentacao" : "registro",
          }),
        });
        if (!r.ok) throw new Error("Não foi possível salvar o diário.");
      } else if (category === "appointment") {
        if (!apptTitle.trim() || !apptWhen.trim()) {
          throw new Error("Informe o título e a data/horário do compromisso.");
        }
        const r = await authFetch("/api/appointments", {
          method: "POST",
          body: JSON.stringify({
            title: apptTitle.trim(),
            when: apptWhen.trim(),
            doctor: apptDoctor.trim() || undefined,
          }),
        });
        if (!r.ok) throw new Error("Não foi possível salvar a consulta.");
      } else if (category === "shift") {
        if (!shiftCaregiver.trim()) {
          throw new Error("Informe o nome do responsável pelo plantão.");
        }
        const r = await authFetch("/api/shifts", {
          method: "POST",
          body: JSON.stringify({
            day_label: shiftDay.trim() || "Hoje",
            slot: shiftSlot.trim(),
            caregiver_name: shiftCaregiver.trim(),
          }),
        });
        if (!r.ok) throw new Error("Não foi possível salvar o plantão.");
      }

      setSaving(false);
      resetForms();
      onSuccess();
      onClose();
    } catch (err: any) {
      setSaving(false);
      setError(err.message || "Ocorreu um erro ao salvar.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Registrar Cuidado</Text>
            <Pressable onPress={handleClose} hitSlop={12} testID="add-care-close">
              <Ionicons name="close" size={24} color={colors.onSurface} />
            </Pressable>
          </View>

          {/* Category Selector Tabs */}
          <View style={styles.categoryRow}>
            <Pressable
              style={[styles.catChip, category === "medication" && styles.catChipActive]}
              onPress={() => setCategory("medication")}
            >
              <Ionicons
                name="medkit"
                size={16}
                color={category === "medication" ? colors.onBrand : colors.onSurfaceSoft}
              />
              <Text
                style={[
                  styles.catChipText,
                  category === "medication" && styles.catChipTextActive,
                ]}
              >
                Remédio
              </Text>
            </Pressable>

            <Pressable
              style={[styles.catChip, category === "event" && styles.catChipActive]}
              onPress={() => setCategory("event")}
            >
              <Ionicons
                name="journal"
                size={16}
                color={category === "event" ? colors.onBrand : colors.onSurfaceSoft}
              />
              <Text
                style={[
                  styles.catChipText,
                  category === "event" && styles.catChipTextActive,
                ]}
              >
                Diário
              </Text>
            </Pressable>

            <Pressable
              style={[styles.catChip, category === "appointment" && styles.catChipActive]}
              onPress={() => setCategory("appointment")}
            >
              <Ionicons
                name="calendar"
                size={16}
                color={category === "appointment" ? colors.onBrand : colors.onSurfaceSoft}
              />
              <Text
                style={[
                  styles.catChipText,
                  category === "appointment" && styles.catChipTextActive,
                ]}
              >
                Consulta
              </Text>
            </Pressable>

            <Pressable
              style={[styles.catChip, category === "shift" && styles.catChipActive]}
              onPress={() => setCategory("shift")}
            >
              <Ionicons
                name="people"
                size={16}
                color={category === "shift" ? colors.onBrand : colors.onSurfaceSoft}
              />
              <Text
                style={[
                  styles.catChipText,
                  category === "shift" && styles.catChipTextActive,
                ]}
              >
                Plantão
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* 1. Remédio Form */}
            {category === "medication" && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nome do Medicamento</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Losartana, Dipirona"
                  value={medName}
                  onChangeText={setMedName}
                  placeholderTextColor={colors.onSurfaceSoft}
                />

                <Text style={styles.label}>Dosagem</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 50mg, 1 comprimido, 10 gotas"
                  value={medDosage}
                  onChangeText={setMedDosage}
                  placeholderTextColor={colors.onSurfaceSoft}
                />

                <Text style={styles.label}>Horário</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 08:00, 20:00"
                  value={medTime}
                  onChangeText={setMedTime}
                  placeholderTextColor={colors.onSurfaceSoft}
                />
              </View>
            )}

            {/* 2. Diário / Alimentação Form */}
            {category === "event" && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tipo de Registro</Text>
                <View style={styles.presetRow}>
                  {["Alimentação", "Pressão arterial", "Humor / Disposição", "Rotina"].map(
                    (preset) => (
                      <Pressable
                        key={preset}
                        style={[
                          styles.presetChip,
                          evtTitle === preset && styles.presetChipActive,
                        ]}
                        onPress={() => setEvtTitle(preset)}
                      >
                        <Text
                          style={[
                            styles.presetText,
                            evtTitle === preset && styles.presetTextActive,
                          ]}
                        >
                          {preset}
                        </Text>
                      </Pressable>
                    )
                  )}
                </View>

                <Text style={styles.label}>O que aconteceu?</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder="Ex: Almoçou muito bem, comeu peixe e salada. Esteve bem disposto à tarde."
                  value={evtDetail}
                  onChangeText={setEvtDetail}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={colors.onSurfaceSoft}
                />

                <Text style={styles.label}>Horário (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 12:30 (deixe em branco para agora)"
                  value={evtTime}
                  onChangeText={setEvtTime}
                  placeholderTextColor={colors.onSurfaceSoft}
                />
              </View>
            )}

            {/* 3. Consulta Form */}
            {category === "appointment" && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Título do Compromisso / Exame</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Consulta Cardiologista, Exame de Sangue"
                  value={apptTitle}
                  onChangeText={setApptTitle}
                  placeholderTextColor={colors.onSurfaceSoft}
                />

                <Text style={styles.label}>Data e Horário</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Quarta-feira às 14:00"
                  value={apptWhen}
                  onChangeText={setApptWhen}
                  placeholderTextColor={colors.onSurfaceSoft}
                />

                <Text style={styles.label}>Médico / Local (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Dr. Ricardo - Hospital São Luiz"
                  value={apptDoctor}
                  onChangeText={setApptDoctor}
                  placeholderTextColor={colors.onSurfaceSoft}
                />
              </View>
            )}

            {/* 4. Plantão Form */}
            {category === "shift" && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Dia do Plantão</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Hoje, Amanhã, Sábado"
                  value={shiftDay}
                  onChangeText={setShiftDay}
                  placeholderTextColor={colors.onSurfaceSoft}
                />

                <Text style={styles.label}>Turno / Horário</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Manhã (08h - 14h), Tarde, Noite"
                  value={shiftSlot}
                  onChangeText={setShiftSlot}
                  placeholderTextColor={colors.onSurfaceSoft}
                />

                <Text style={styles.label}>Nome do Responsável</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Ana, Carla, Bruno"
                  value={shiftCaregiver}
                  onChangeText={setShiftCaregiver}
                  placeholderTextColor={colors.onSurfaceSoft}
                />
              </View>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={saving}
              testID="add-care-submit"
            >
              {saving ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <Text style={styles.saveBtnText}>Salvar Registro</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: "85%",
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: type.serif,
    fontSize: 20,
    fontWeight: "700",
    color: colors.onSurface,
  },

  categoryRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  catChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
  },
  catChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  catChipText: {
    fontFamily: type.sans,
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurfaceSoft,
  },
  catChipTextActive: {
    color: colors.onBrand,
  },

  formScroll: {
    paddingBottom: spacing.xxl,
  },
  formGroup: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: type.sans,
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: type.sans,
    fontSize: 15,
    color: colors.onSurface,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginVertical: 4,
  },
  presetChip: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  presetChipActive: {
    backgroundColor: colors.olive,
    borderColor: colors.olive,
  },
  presetText: {
    fontFamily: type.sans,
    fontSize: 12,
    color: colors.onSurfaceSoft,
  },
  presetTextActive: {
    color: colors.onBrand,
    fontWeight: "700",
  },

  saveBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontFamily: type.sans,
    fontSize: 16,
    fontWeight: "700",
    color: colors.onBrand,
  },

  errorText: {
    fontFamily: type.sans,
    fontSize: 13,
    color: colors.clayRed,
    marginTop: 4,
  },
});
