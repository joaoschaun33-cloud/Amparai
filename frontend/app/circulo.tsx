import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { colors, spacing, radius, type, shadow } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

type Member = { id: string; name: string; role: string; phone?: string; email?: string; avatar: string };
type Invite = { code: string; name: string; role: string; invite_url: string };

const ROLES: { key: string; label: string; desc: string }[] = [
  { key: "coordenador", label: "Coordenador(a)", desc: "vê tudo, decide, cobra" },
  { key: "irmao", label: "Irmão / irmã", desc: "escala e custos" },
  { key: "cuidador", label: "Cuidador(a)", desc: "só remédios e escala" },
  { key: "profissional", label: "Profissional de saúde", desc: "só dados clínicos" },
];

export default function CirculoScreen() {
  const { authFetch, user } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("irmao");
  const [phone, setPhone] = useState("");
  const [invite, setInvite] = useState<Invite | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await authFetch("/api/members");
      if (r.ok) {
        const d = await r.json();
        setMembers(d.members || []);
      }
    } catch {}
    setLoading(false);
  }, [authFetch]);
  useEffect(() => { load(); }, [load]);

  const addMember = async () => {
    if (!name.trim()) return;
    try {
      await authFetch("/api/members", { method: "POST", body: JSON.stringify({ name: name.trim(), role, phone: phone.trim() || null }) });
      const inv = await authFetch("/api/invitations", { method: "POST", body: JSON.stringify({ name: name.trim(), role }) });
      if (inv.ok) setInvite(await inv.json());
      setName(""); setPhone("");
      setShowAdd(false);
      await load();
    } catch {}
  };

  const removeMember = async (id: string) => {
    await authFetch(`/api/members/${id}`, { method: "DELETE" });
    await load();
  };

  const shareInvite = async () => {
    if (!invite) return;
    const link = `${BACKEND}/convite/${invite.code}`;
    const msg = `Oi ${invite.name}! ${user?.name?.split(" ")[0] || ""} te convidou pro círculo de cuidado da mamãe no Amparai 💛\n\nCódigo: ${invite.code}\n${link}`;
    try {
      await Share.share({ message: msg });
    } catch {}
  };

  const copyCode = async () => {
    if (invite) await Clipboard.setStringAsync(invite.code);
  };

  if (loading) return <View style={styles.container}><ActivityIndicator color={colors.brand} style={{ marginTop: 80 }} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="circulo-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="circulo-back">
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Círculo de cuidado</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Text style={styles.title}>Quem cuida com você</Text>
        <Text style={styles.subtitle}>Cada pessoa vê só o que precisa ver.</Text>

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <View style={styles.selfCard}>
            <View style={styles.selfAvatar}><Text style={styles.selfAvatarText}>{(user?.name || "?")[0]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{user?.name} (você)</Text>
              <Text style={styles.memberRole}>Coordenador(a) · vê tudo</Text>
            </View>
            <Ionicons name="shield-checkmark" size={22} color={colors.olive} />
          </View>

          {members.map((m) => {
            const roleLabel = ROLES.find((r) => r.key === m.role)?.label || m.role;
            const roleDesc = ROLES.find((r) => r.key === m.role)?.desc || "";
            return (
              <View key={m.id} style={styles.memberCard} testID={`member-${m.id}`}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{m.avatar}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberRole}>{roleLabel} · {roleDesc}</Text>
                  {m.phone && <Text style={styles.memberPhone}>{m.phone}</Text>}
                </View>
                <Pressable onPress={() => removeMember(m.id)} hitSlop={12} testID={`remove-member-${m.id}`}>
                  <Ionicons name="close-circle-outline" size={22} color={colors.onSurfaceSoft} />
                </Pressable>
              </View>
            );
          })}

          {members.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={32} color={colors.onSurfaceSoft} />
              <Text style={styles.emptyTitle}>Convide sua família</Text>
              <Text style={styles.emptySub}>O cuidado fica mais leve quando é dividido.</Text>
            </View>
          )}
        </View>

        <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)} testID="add-member-button">
          <Ionicons name="person-add" size={20} color={colors.onBrand} />
          <Text style={styles.addText}>Convidar alguém</Text>
        </Pressable>
      </ScrollView>

      {/* Add member modal */}
      <Modal transparent visible={showAdd} animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Convidar para o círculo</Text>

            <TextInput
              testID="member-name-input"
              placeholder="Nome (ex: Bruno)"
              placeholderTextColor={colors.onSurfaceSoft}
              value={name} onChangeText={setName}
              style={styles.input}
            />
            <TextInput
              testID="member-phone-input"
              placeholder="Telefone (opcional, para WhatsApp)"
              placeholderTextColor={colors.onSurfaceSoft}
              value={phone} onChangeText={setPhone} keyboardType="phone-pad"
              style={styles.input}
            />

            <Text style={styles.roleLabel}>Papel no círculo</Text>
            {ROLES.map((r) => (
              <Pressable
                key={r.key}
                testID={`role-${r.key}`}
                onPress={() => setRole(r.key)}
                style={[styles.roleRow, role === r.key && styles.roleRowActive]}
              >
                <View style={[styles.radio, role === r.key && styles.radioActive]}>
                  {role === r.key && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleName}>{r.label}</Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                </View>
              </Pressable>
            ))}

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowAdd(false)} style={styles.btnGhost}><Text style={styles.btnGhostText}>Cancelar</Text></Pressable>
              <Pressable onPress={addMember} style={styles.btnPrimary} testID="confirm-invite"><Text style={styles.btnPrimaryText}>Convidar</Text></Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Invite created */}
      <Modal transparent visible={invite !== null} animationType="fade" onRequestClose={() => setInvite(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.inviteHero}>
              <Ionicons name="mail-open" size={40} color={colors.brand} />
            </View>
            <Text style={styles.modalTitle}>Convite pronto</Text>
            <Text style={styles.inviteSub}>{invite?.name} vai receber o código abaixo para entrar no círculo.</Text>

            <Pressable onPress={copyCode} style={styles.codeBox} testID="invite-code">
              <Text style={styles.codeText}>{invite?.code}</Text>
              <Ionicons name="copy-outline" size={20} color={colors.onSurfaceSoft} />
            </Pressable>

            <Pressable style={[styles.btnPrimary, { marginTop: spacing.md }]} onPress={shareInvite} testID="share-invite">
              <Text style={styles.btnPrimaryText}>Compartilhar convite</Text>
            </Pressable>
            <Pressable style={[styles.btnGhost, { marginTop: spacing.sm }]} onPress={() => setInvite(null)}>
              <Text style={styles.btnGhostText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surfaceSecondary },
  headerTitle: { fontFamily: type.serif, fontSize: 18, color: colors.onSurface, fontWeight: "600" },
  title: { fontFamily: type.serif, fontSize: 28, color: colors.onSurface, fontWeight: "600" },
  subtitle: { fontFamily: type.sans, fontSize: 15, color: colors.onSurfaceSoft, marginTop: 4 },
  selfCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.olive, padding: spacing.md, borderRadius: radius.md, ...shadow.card },
  selfAvatar: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  selfAvatarText: { color: colors.onOlive, fontFamily: type.sans, fontWeight: "800", fontSize: 20 },
  memberCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  emptyCard: { alignItems: "center", padding: spacing.xl, gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed" },
  emptyTitle: { fontFamily: type.serif, fontSize: 18, color: colors.onSurface, fontWeight: "600" },
  emptySub: { fontFamily: type.sans, fontSize: 14, color: colors.onSurfaceSoft, textAlign: "center" },
  avatar: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.onBrand, fontFamily: type.sans, fontWeight: "800", fontSize: 20 },
  memberName: { fontFamily: type.sans, fontSize: 16, color: colors.onSurface, fontWeight: "600" },
  memberRole: { fontFamily: type.sans, fontSize: 13, color: colors.onSurfaceSoft, marginTop: 2 },
  memberPhone: { fontFamily: type.sans, fontSize: 12, color: colors.brand, marginTop: 2 },

  addBtn: { marginTop: spacing.xl, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.brand, paddingVertical: 14, borderRadius: radius.pill, ...shadow.card },
  addText: { fontFamily: type.sans, color: colors.onBrand, fontWeight: "700", fontSize: 15 },

  modalBg: { flex: 1, backgroundColor: "rgba(62,47,37,0.55)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, gap: spacing.sm, maxHeight: "90%" },
  modalTitle: { fontFamily: type.serif, fontSize: 22, color: colors.onSurface, fontWeight: "600" },
  input: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontFamily: type.sans, fontSize: 15, color: colors.onSurface },
  roleLabel: { fontFamily: type.sans, fontSize: 13, color: colors.onSurfaceSoft, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.sm },
  roleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  roleRowActive: { borderColor: colors.brand, backgroundColor: "#FFF3EA" },
  radio: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.brand },
  radioInner: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.brand },
  roleName: { fontFamily: type.sans, fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  roleDesc: { fontFamily: type.sans, fontSize: 12, color: colors.onSurfaceSoft, marginTop: 2 },
  modalActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  btnGhost: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  btnGhostText: { fontFamily: type.sans, fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  btnPrimary: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: radius.pill, backgroundColor: colors.brand },
  btnPrimaryText: { fontFamily: type.sans, fontSize: 15, color: colors.onBrand, fontWeight: "700" },

  inviteHero: { alignSelf: "center", width: 80, height: 80, borderRadius: radius.pill, backgroundColor: "#FFF3EA", alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  inviteSub: { fontFamily: type.sans, fontSize: 15, color: colors.onSurfaceSoft, textAlign: "center" },
  codeBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderWidth: 2, borderColor: colors.brand, borderStyle: "dashed", borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.md },
  codeText: { fontFamily: type.serif, fontSize: 32, color: colors.brand, fontWeight: "700", letterSpacing: 4 },
});
