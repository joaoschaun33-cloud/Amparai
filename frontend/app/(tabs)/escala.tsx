import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, type, shadow } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import AddCareModal from "@/src/components/AddCareModal";

type Shift = {
  id: string;
  date?: string;
  day: string;
  day_label: string;
  caregiver_name: string;
  caregiver_avatar: string;
  role: string;
  slot: string;
  covered: boolean;
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAY_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];

function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

type MonthGridCell = {
  dateStr: string;
  dateObj: Date;
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
};

function buildMonthGrid(year: number, month: number): MonthGridCell[] {
  const grid: MonthGridCell[] = [];
  const today = new Date();

  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Prev month padding
  const prevLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevLastDay - i;
    const d = new Date(year, month - 1, dayNum);
    grid.push({
      dateStr: formatDateISO(d),
      dateObj: d,
      dayNum,
      inMonth: false,
      isToday: isSameDay(d, today),
    });
  }

  // Current month
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const d = new Date(year, month, dayNum);
    grid.push({
      dateStr: formatDateISO(d),
      dateObj: d,
      dayNum,
      inMonth: true,
      isToday: isSameDay(d, today),
    });
  }

  // Next month padding to reach a multiple of 7
  const remaining = (7 - (grid.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remaining; dayNum++) {
    const d = new Date(year, month + 1, dayNum);
    grid.push({
      dateStr: formatDateISO(d),
      dateObj: d,
      dayNum,
      inMonth: false,
      isToday: isSameDay(d, today),
    });
  }

  return grid;
}

export default function EscalaScreen() {
  const { authFetch, elderName } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [contribution, setContribution] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const todayObj = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateISO(todayObj), [todayObj]);

  const [currentYear, setCurrentYear] = useState(todayObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayObj.getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [isGridExpanded, setIsGridExpanded] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  const monthGrid = useMemo(
    () => buildMonthGrid(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  // Agenda items: 7 days window centered around today / selected date
  const agendaDays = useMemo(() => {
    const base = selectedDateStr ? new Date(selectedDateStr + "T00:00:00") : todayObj;
    const days: { dateStr: string; dateObj: Date; isToday: boolean; label: string }[] = [];
    const fullDayNames = [
      "DOMINGO", "SEGUNDA-FEIRA", "TERÇA-FEIRA", "QUARTA-FEIRA",
      "QUINTA-FEIRA", "SEXTA-FEIRA", "SÁBADO"
    ];

    for (let i = -1; i <= 5; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dateStr = formatDateISO(d);
      const isToday = isSameDay(d, todayObj);
      const label = `${fullDayNames[d.getDay()]}, ${d.getDate()} DE ${MONTH_NAMES[d.getMonth()].toUpperCase()}${isToday ? " • HOJE" : ""}`;
      days.push({ dateStr, dateObj: d, isToday, label });
    }
    return days;
  }, [selectedDateStr, todayObj]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 80 }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="escala-screen">
      {/* Google Calendar Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.monthToggle}
          onPress={() => setIsGridExpanded((prev) => !prev)}
          testID="toggle-month-grid"
        >
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </Text>
          <Ionicons
            name={isGridExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.brand}
          />
        </Pressable>

        <View style={styles.headerRight}>
          <Pressable
            style={styles.todayChip}
            onPress={() => {
              setCurrentYear(todayObj.getFullYear());
              setCurrentMonth(todayObj.getMonth());
              setSelectedDateStr(todayStr);
            }}
            testID="go-to-today-btn"
          >
            <Text style={styles.todayChipText}>Hoje</Text>
          </Pressable>

          <Pressable
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            testID="escala-add-btn"
          >
            <Ionicons name="add" size={20} color={colors.onBrand} />
            <Text style={styles.addBtnText}>Plantão</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Expandable Google Calendar Month Grid */}
        {isGridExpanded && (
          <View style={styles.gridContainer} testID="month-grid-view">
            {/* Weekday Labels */}
            <View style={styles.weekdayRow}>
              {WEEKDAY_SHORT.map((day, idx) => (
                <Text key={idx} style={styles.weekdayText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Grid Days */}
            <View style={styles.gridMatrix}>
              {monthGrid.map((cell) => {
                const isSelected = cell.dateStr === selectedDateStr;
                const hasShift = shifts.some(
                  (s) =>
                    s.date === cell.dateStr ||
                    (cell.isToday && (s.day === "hoje" || s.day_label?.toLowerCase().includes("hoje")))
                );

                return (
                  <Pressable
                    key={cell.dateStr}
                    style={[
                      styles.cell,
                      isSelected && styles.cellSelected,
                    ]}
                    onPress={() => {
                      setSelectedDateStr(cell.dateStr);
                      setIsGridExpanded(false);
                    }}
                  >
                    <View
                      style={[
                        styles.cellNumWrap,
                        cell.isToday && styles.cellTodayWrap,
                        isSelected && styles.cellSelectedWrap,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellNum,
                          !cell.inMonth && styles.cellNumOut,
                          cell.isToday && styles.cellNumToday,
                          isSelected && styles.cellNumSelected,
                        ]}
                      >
                        {cell.dayNum}
                      </Text>
                    </View>
                    {hasShift && (
                      <View
                        style={[
                          styles.eventDot,
                          isSelected && styles.eventDotSelected,
                        ]}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Google Agenda Stream */}
        <View style={styles.agendaContainer}>
          <Text style={styles.subtext}>
            Escala de cuidado para {elderName || "quem você cuida"}
          </Text>

          {agendaDays.map((day) => {
            const dayShifts = shifts.filter((s) => {
              if (s.date) return s.date === day.dateStr;
              if (
                day.isToday &&
                (s.day === "hoje" || s.day_label?.toLowerCase().includes("hoje"))
              )
                return true;
              return false;
            });

            return (
              <View key={day.dateStr} style={styles.agendaDayGroup}>
                <View style={styles.agendaDayHeader}>
                  <Text
                    style={[
                      styles.agendaDayTitle,
                      day.isToday && styles.agendaDayTitleToday,
                    ]}
                  >
                    {day.label}
                  </Text>
                </View>

                {dayShifts.length > 0 ? (
                  dayShifts.map((s) => (
                    <View
                      key={s.id}
                      style={[
                        styles.eventCard,
                        s.covered ? styles.eventCardCovered : styles.eventCardGap,
                      ]}
                      testID={`agenda-event-${s.id}`}
                    >
                      <View style={styles.eventTimeCol}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={s.covered ? colors.brand : colors.amber}
                        />
                        <Text style={styles.eventSlotText}>{s.slot}</Text>
                      </View>

                      <View style={styles.eventBody}>
                        {s.covered ? (
                          <View style={styles.personRow}>
                            <View style={styles.avatar}>
                              <Text style={styles.avatarText}>
                                {s.caregiver_avatar}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.personName}>{s.caregiver_name}</Text>
                              <Text style={styles.personRole}>{s.role}</Text>
                            </View>
                            <View style={styles.coveredBadge}>
                              <Text style={styles.coveredBadgeText}>Confirmado</Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.gapRow}>
                            <Text style={styles.gapText}>
                              Plantão sem ninguém escalado
                            </Text>
                            <Pressable
                              style={styles.assumirBtn}
                              onPress={() => setModalVisible(true)}
                              testID={`assumir-${s.id}`}
                            >
                              <Text style={styles.assumirText}>Assumir</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyDayRow}>
                    <Text style={styles.emptyDayText}>Sem plantão agendado</Text>
                    <Pressable
                      style={styles.quickAddBtn}
                      onPress={() => setModalVisible(true)}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={colors.brand} />
                      <Text style={styles.quickAddText}>Agendar</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          {/* Reconhecimento do Mês */}
          <Text style={styles.sectionTitle}>Reconhecimento do Mês</Text>
          <Text style={styles.recogSub}>Um obrigado a quem esteve presente.</Text>
          <View style={styles.recogWrap}>
            {Object.keys(contribution).length > 0 ? (
              Object.entries(contribution).map(([name, count]) => (
                <View key={name} style={styles.recogItem}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{name[0]}</Text>
                  </View>
                  <View>
                    <Text style={styles.recogName}>{name}</Text>
                    <Text style={styles.recogRole}>
                      {count} {count === 1 ? "dia" : "dias"} de plantão
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ fontFamily: type.sans, fontSize: 13, color: colors.onSurfaceSoft }}>
                Nenhum plantão registrado este mês.
              </Text>
            )}
          </View>
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
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  monthToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  monthTitle: {
    fontFamily: type.serif,
    fontSize: 22,
    fontWeight: "700",
    color: colors.onSurface,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  todayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayChipText: {
    fontFamily: type.sans,
    fontSize: 12,
    fontWeight: "700",
    color: colors.brand,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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

  /* Month Grid */
  gridContainer: {
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.xs,
  },
  weekdayText: {
    fontFamily: type.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.onSurfaceSoft,
    width: 38,
    textAlign: "center",
  },
  gridMatrix: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  cell: {
    width: 38,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
    borderRadius: radius.sm,
  },
  cellSelected: {
    backgroundColor: "rgba(46, 125, 96, 0.12)",
  },
  cellNumWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cellTodayWrap: {
    backgroundColor: colors.brand,
  },
  cellSelectedWrap: {
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  cellNum: {
    fontFamily: type.sans,
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurface,
  },
  cellNumOut: {
    color: colors.border,
  },
  cellNumToday: {
    color: colors.onBrand,
    fontWeight: "700",
  },
  cellNumSelected: {
    color: colors.brand,
    fontWeight: "700",
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.olive,
    marginTop: 2,
  },
  eventDotSelected: {
    backgroundColor: colors.brand,
  },

  /* Agenda Stream */
  agendaContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  subtext: {
    fontFamily: type.sans,
    fontSize: 14,
    color: colors.onSurfaceSoft,
    marginBottom: spacing.lg,
  },
  agendaDayGroup: {
    marginBottom: spacing.xl,
  },
  agendaDayHeader: {
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: 6,
    marginBottom: spacing.sm,
  },
  agendaDayTitle: {
    fontFamily: type.sans,
    fontSize: 12,
    fontWeight: "800",
    color: colors.onSurfaceSoft,
    letterSpacing: 0.8,
  },
  agendaDayTitleToday: {
    color: colors.brand,
  },

  /* Event Cards (Google Agenda Style) */
  eventCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    ...shadow.sm,
  },
  eventCardCovered: {
    borderLeftColor: colors.brand,
  },
  eventCardGap: {
    borderLeftColor: colors.amber,
    backgroundColor: colors.amber,
  },
  eventTimeCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.xs,
  },
  eventSlotText: {
    fontFamily: type.sans,
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceSoft,
  },
  eventBody: {
    marginTop: 2,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.onBrand,
    fontFamily: type.sans,
    fontWeight: "700",
    fontSize: 15,
  },
  personName: {
    fontFamily: type.sans,
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
  },
  personRole: {
    fontFamily: type.sans,
    fontSize: 12,
    color: colors.onSurfaceSoft,
  },
  coveredBadge: {
    backgroundColor: "rgba(46, 125, 96, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  coveredBadgeText: {
    fontFamily: type.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand,
  },
  gapRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gapText: {
    fontFamily: type.serif,
    fontSize: 14,
    color: colors.onAmber,
    fontStyle: "italic",
  },
  assumirBtn: {
    backgroundColor: colors.onAmber,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  assumirText: {
    color: colors.amber,
    fontFamily: type.sans,
    fontWeight: "800",
    fontSize: 12,
  },

  emptyDayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  emptyDayText: {
    fontFamily: type.sans,
    fontSize: 13,
    color: colors.onSurfaceSoft,
    fontStyle: "italic",
  },
  quickAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quickAddText: {
    fontFamily: type.sans,
    fontSize: 12,
    fontWeight: "700",
    color: colors.brand,
  },

  /* Recognition */
  sectionTitle: {
    fontFamily: type.serif,
    fontSize: 22,
    color: colors.onSurface,
    fontWeight: "600",
    marginTop: spacing.xl,
  },
  recogSub: {
    fontFamily: type.sans,
    fontSize: 13,
    color: colors.onSurfaceSoft,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  recogWrap: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  recogItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  recogName: {
    fontFamily: type.sans,
    fontSize: 15,
    fontWeight: "600",
    color: colors.onSurface,
  },
  recogRole: {
    fontFamily: type.sans,
    fontSize: 12,
    color: colors.onSurfaceSoft,
  },
});
