import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, type, shadow } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import AddCareModal from "@/src/components/AddCareModal";

type Shift = { id: string; date?: string; day: string; day_label: string; caregiver_name: string; caregiver_avatar: string; role: string; slot: string; covered: boolean };

type DayItem = {
  dateStr: string;
  dayName: string;
  dayNum: string;
  isToday: boolean;
  fullLabel: string;
};

function generateCalendarDays(): DayItem[] {
  const days: DayItem[] = [];
  const today = new Date();
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const fullDayNames = [
    "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
    "Quinta-feira", "Sexta-feira", "Sábado"
  ];

  for (let i = -2; i <= 11; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    const isToday = i === 0;
    const dayName = dayNames[d.getDay()];
    const dayNum = String(d.getDate());
    const fullLabel = `${fullDayNames[d.getDay()]}, ${d.getDate()} de ${monthNames[d.getMonth()]}`;

    days.push({ dateStr, dayName, dayNum, isToday, fullLabel });
  }
  return days;
}

export default function EscalaScreen() {
  const { authFetch, elderName } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [contribution, setContribution] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const calendarDays = useMemo(() => generateCalendarDays(), []);
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  const load = useCallback(async () => {
    try {
      const r = await authFetch("/api/escala");
      if (r.ok) {
        const d = await r.json();
        setShifts(d.shifts);
        setContribution(d.contribution);
      }
    } catch {}
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const activeDay = useMemo(
    () => calendarDays.find((d) => d.dateStr === selectedDateStr) || calendarDays[2],
    [calendarDays, selectedDateStr]
  );

  const activeShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (s.date) return s.date === selectedDateStr;
      if (selectedDateStr === todayStr && (s.day_label?.toLowerCase().includes("hoje") || s.day === "hoje")) return true;
      return s.day_label?.toLowerCase().includes(activeDay.dayName.toLowerCase());
    });
  }, [shifts, selectedDateStr, todayStr, activeDay]);

  if (loading) {
    return <View style={styles.container}><ActivityIndicator color={colors.brand} style={{ marginTop: 80 }} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="escala-screen">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Escala da família</Text>
            <Text style={styles.subtitle}>Quem está com {elderName || "quem você cuida"}, em que dia.</Text>
          </View>
          <Pressable
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            testID="escala-add-btn"
          >
            <Ionicons name="add-circle" size={20} color={colors.onBrand} />
            <Text style={styles.addBtnText}>Plantão</Text>
          </Pressable>
        </View>

        {/* Interactive Calendar Strip */}
        <Text style={styles.calendarTitle}>Calendário de Plantões</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarStrip}
        >
          {calendarDays.map((day) => {
            const isSelected = day.dateStr === selectedDateStr;
            const hasShift = shifts.some(
              (s) => s.date === day.dateStr || (day.isToday && (s.day === "hoje" || s.day_label?.toLowerCase().includes("hoje")))
            );

            return (
              <Pressable
                key={day.dateStr}
                style={[
                  styles.dayChip,
                  day.isToday && styles.dayChipToday,
                  isSelected && styles.dayChipSelected,
                ]}
                onPress={() => setSelectedDateStr(day.dateStr)}
                testID={`cal-day-${day.dateStr}`}
              >
                <Text style={[styles.dayChipName, isSelected && styles.dayChipTextSelected]}>
                  {day.isToday ? "Hoje" : day.dayName}
                </Text>
                <Text style={[styles.dayChipNum, isSelected && styles.dayChipTextSelected]}>
                  {day.dayNum}
                </Text>
                {hasShift && (
                  <View style={[styles.hasShiftDot, isSelected && styles.hasShiftDotSelected]} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Shift Details for Selected Day */}
        <View style={styles.selectedDayHeader}>
          <Text style={styles.selectedDayTitle}>{activeDay.fullLabel}</Text>
        </View>

        <View style={{ marginTop: spacing.md }}>
          {activeShifts.length > 0 ? (
            activeShifts.map((s) => (
              <View
                key={s.id}
                style={[styles.shiftCard, !s.covered && styles.shiftGap]}
                testID={`escala-shift-${s.id}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.day, !s.covered && { color: colors.onAmber }]}>{s.day_label}</Text>
                  <Text style={[styles.slot, !s.covered && { color: colors.onAmber }]}>{s.slot}</Text>
                  {s.covered ? (
                    <View style={styles.personRow}>
                      <View style={styles.avatar}><Text style={styles.avatarText}>{s.caregiver_avatar}</Text></View>
                      <View>
                        <Text style={styles.name}>{s.caregiver_name}</Text>
                        <Text style={styles.role}>{s.role}</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.gapText}>Está sem ninguém — quer assumir ou pedir troca?</Text>
                  )}
                </View>
                {!s.covered && (
                  <Pressable style={styles.assumirBtn} testID={`assumir-${s.id}`}>
                    <Text style={styles.assumirText}>Assumir</Text>
                  </Pressable>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={32} color={colors.onSurfaceSoft} />
              <Text style={styles.emptyTitle}>Sem plantão cadastrado para este dia</Text>
              <Text style={styles.emptySub}>Você pode agendar um responsável para este turno.</Text>
              <Pressable
                style={styles.emptyAddBtn}
                onPress={() => setModalVisible(true)}
                testID="empty-add-shift-btn"
              >
                <Ionicons name="add-circle" size={18} color={colors.onBrand} />
                <Text style={styles.emptyAddBtnText}>Agendar Plantão</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Reconhecimento do mês</Text>
        <Text style={styles.recogSub}>Um obrigado a quem tem estado presente.</Text>
        <View style={styles.recogWrap}>
          {Object.entries(contribution).map(([name, count]) => (
            <View key={name} style={styles.recogItem}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{name[0]}</Text></View>
              <View>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.role}>{count} {count === 1 ? "dia" : "dias"} de cuidado</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <AddCareModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={load}
        initialCategory="shift"
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
  shiftCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.md,
  },
  shiftGap: { backgroundColor: colors.amber, borderColor: colors.amber },
  day: { fontFamily: type.sans, fontSize: 12, color: colors.onSurfaceSoft, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  slot: { fontFamily: type.sans, fontSize: 13, color: colors.onSurfaceSoft, marginTop: 2 },
  personRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.onBrand, fontFamily: type.sans, fontWeight: "700", fontSize: 16 },
  name: { fontFamily: type.sans, fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  role: { fontFamily: type.sans, fontSize: 12, color: colors.onSurfaceSoft },
  gapText: { fontFamily: type.serif, fontSize: 15, color: colors.onAmber, marginTop: spacing.sm, fontStyle: "italic" },
  assumirBtn: { backgroundColor: colors.onAmber, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.pill },
  assumirText: { color: colors.amber, fontFamily: type.sans, fontWeight: "800", fontSize: 13 },
  sectionTitle: { fontFamily: type.serif, fontSize: 22, color: colors.onSurface, fontWeight: "600", marginTop: spacing.xxl },
  recogSub: { fontFamily: type.sans, fontSize: 14, color: colors.onSurfaceSoft, marginTop: 2, marginBottom: spacing.md },
  recogWrap: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
  recogItem: { flexDirection: "row", alignItems: "center", gap: spacing.md },

  calendarTitle: {
    fontFamily: type.serif,
    fontSize: 20,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  calendarStrip: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  dayChip: {
    width: 56,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  dayChipToday: {
    borderColor: colors.brand,
  },
  dayChipSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  dayChipName: {
    fontFamily: type.sans,
    fontSize: 11,
    fontWeight: "600",
    color: colors.onSurfaceSoft,
    textTransform: "uppercase",
  },
  dayChipNum: {
    fontFamily: type.sans,
    fontSize: 17,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: 2,
  },
  dayChipTextSelected: {
    color: colors.onBrand,
  },
  hasShiftDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.olive,
    marginTop: 4,
  },
  hasShiftDotSelected: {
    backgroundColor: colors.onBrand,
  },

  selectedDayHeader: {
    marginTop: spacing.lg,
    marginBottom: 4,
  },
  selectedDayTitle: {
    fontFamily: type.sans,
    fontSize: 14,
    fontWeight: "700",
    color: colors.brand,
  },

  emptyCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.sm,
  },
  emptyTitle: {
    fontFamily: type.serif,
    fontSize: 16,
    fontWeight: "600",
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  emptySub: {
    fontFamily: type.sans,
    fontSize: 13,
    color: colors.onSurfaceSoft,
    marginTop: 2,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  emptyAddBtnText: {
    fontFamily: type.sans,
    fontSize: 13,
    fontWeight: "700",
    color: colors.onBrand,
  },
});
