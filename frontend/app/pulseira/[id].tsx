import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Linking as RNLinking } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { colors, spacing, radius, type, shadow } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

type PublicElder = {
  elder: { name: string; age: number; photo_url: string };
  blood_type?: string;
  allergies: string[];
  conditions: string[];
  emergency_contacts: { name: string; phone: string; relation: string }[];
};

export default function PulseiraPublic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<PublicElder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [finderName, setFinderName] = useState("");
  const [finderPhone, setFinderPhone] = useState("");
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${BACKEND}/api/pulseira/${id}`);
        if (r.ok) setData(await r.json());
        else setNotFound(true);
      } catch { setNotFound(true); }
    })();
  }, [id]);

  const sendScan = async () => {
    setSending(true);
    try {
      await fetch(`${BACKEND}/api/pulseira/${id}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finder_name: finderName, finder_phone: finderPhone, note, address }),
      });
      setSent(true);
    } catch {}
    setSending(false);
  };

  const callContact = (phone: string) => RNLinking.openURL(`tel:${phone.replace(/\D/g, "")}`);

  if (notFound) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ padding: spacing.xl, alignItems: "center", gap: spacing.md, marginTop: spacing.xxl }}>
          <Ionicons name="alert-circle" size={48} color={colors.onSurfaceSoft} />
          <Text style={styles.title}>Pulseira não encontrada</Text>
          <Text style={styles.subtitle}>Confira o código na pulseira e tente de novo.</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!data) {
    return <View style={styles.container}><ActivityIndicator color={colors.brand} style={{ marginTop: 100 }} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} testID="pulseira-public">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
          <View style={styles.brandRow}>
            <View style={styles.logo}><Ionicons name="heart" size={16} color={colors.onBrand} /></View>
            <Text style={styles.brand}>Amparai</Text>
          </View>

          <View style={styles.heroCard}>
            <Image source={{ uri: data.elder.photo_url }} style={styles.avatar} contentFit="cover" />
            <Text style={styles.name}>Esta é {data.elder.name}</Text>
            <Text style={styles.age}>{data.elder.age} anos</Text>
            <Text style={styles.thanks}>Obrigada por ter parado para ajudar. 💛</Text>
          </View>

          {(data.blood_type || data.allergies.length > 0 || data.conditions.length > 0) && (
            <View style={styles.clinicalCard}>
              <View style={styles.clinicalHead}>
                <Ionicons name="medkit" size={20} color={colors.brand} />
                <Text style={styles.clinicalTitle}>Informações médicas</Text>
              </View>
              {data.blood_type && <Text style={styles.clinicalLine}>Tipo sanguíneo: <Text style={styles.bold}>{data.blood_type}</Text></Text>}
              {data.allergies.length > 0 && <Text style={styles.clinicalLine}>Alergias: <Text style={styles.bold}>{data.allergies.join(", ")}</Text></Text>}
              {data.conditions.length > 0 && <Text style={styles.clinicalLine}>Condições: <Text style={styles.bold}>{data.conditions.join(", ")}</Text></Text>}
            </View>
          )}

          {data.emergency_contacts.length > 0 && (
            <View style={styles.contactsCard}>
              <Text style={styles.sectionTitle}>Ligue para a família</Text>
              {data.emergency_contacts.map((c, idx) => (
                <Pressable key={idx} style={styles.contactRow} onPress={() => callContact(c.phone)} testID={`call-${idx}`}>
                  <View style={styles.callIcon}><Ionicons name="call" size={20} color={colors.onBrand} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{c.name}</Text>
                    <Text style={styles.contactSub}>{c.relation} · {c.phone}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {sent ? (
            <View style={styles.sentCard}>
              <Ionicons name="checkmark-circle" size={48} color={colors.olive} />
              <Text style={styles.sentTitle}>A família foi avisada</Text>
              <Text style={styles.sentSub}>Obrigada de coração por ter cuidado. 💛</Text>
            </View>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Avisar a família onde ela está</Text>
              <TextInput style={styles.input} placeholder="Seu nome" placeholderTextColor={colors.onSurfaceSoft} value={finderName} onChangeText={setFinderName} testID="finder-name" />
              <TextInput style={styles.input} placeholder="Seu telefone (pra família ligar de volta)" placeholderTextColor={colors.onSurfaceSoft} value={finderPhone} onChangeText={setFinderPhone} keyboardType="phone-pad" testID="finder-phone" />
              <TextInput style={styles.input} placeholder="Onde ela está (rua, ponto de referência)" placeholderTextColor={colors.onSurfaceSoft} value={address} onChangeText={setAddress} testID="finder-address" />
              <TextInput style={[styles.input, { minHeight: 70 }]} placeholder="Como ela está / observações" placeholderTextColor={colors.onSurfaceSoft} value={note} onChangeText={setNote} multiline testID="finder-note" />
              <Pressable style={styles.sendBtn} onPress={sendScan} disabled={sending} testID="send-scan">
                {sending ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.sendText}>Avisar a família</Text>}
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
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  logo: { width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  brand: { fontFamily: type.serif, fontSize: 18, color: colors.onSurface, fontWeight: "700" },
  title: { fontFamily: type.serif, fontSize: 24, color: colors.onSurface, fontWeight: "600", textAlign: "center" },
  subtitle: { fontFamily: type.sans, fontSize: 15, color: colors.onSurfaceSoft, textAlign: "center" },
  heroCard: { alignItems: "center", padding: spacing.xl, backgroundColor: colors.olive, borderRadius: radius.lg, gap: spacing.sm, ...shadow.card },
  avatar: { width: 100, height: 100, borderRadius: radius.pill, borderWidth: 4, borderColor: colors.surface },
  name: { fontFamily: type.serif, fontSize: 24, color: colors.onOlive, fontWeight: "700", marginTop: spacing.sm },
  age: { fontFamily: type.sans, fontSize: 14, color: "rgba(255,255,255,0.9)" },
  thanks: { fontFamily: type.serif, fontSize: 15, color: colors.onOlive, fontStyle: "italic", marginTop: spacing.sm, textAlign: "center" },
  clinicalCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.lg, gap: spacing.sm },
  clinicalHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  clinicalTitle: { fontFamily: type.serif, fontSize: 18, color: colors.onSurface, fontWeight: "600" },
  clinicalLine: { fontFamily: type.sans, fontSize: 15, color: colors.onSurface, lineHeight: 22 },
  bold: { fontWeight: "700", color: colors.brand },
  contactsCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.md, gap: spacing.sm },
  sectionTitle: { fontFamily: type.serif, fontSize: 18, color: colors.onSurface, fontWeight: "600", marginBottom: spacing.sm },
  contactRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  callIcon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.olive, alignItems: "center", justifyContent: "center" },
  contactName: { fontFamily: type.sans, fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  contactSub: { fontFamily: type.sans, fontSize: 13, color: colors.onSurfaceSoft, marginTop: 2 },
  formCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.md, gap: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontFamily: type.sans, fontSize: 15, color: colors.onSurface },
  sendBtn: { backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: 14, alignItems: "center" },
  sendText: { fontFamily: type.sans, fontSize: 15, color: colors.onBrand, fontWeight: "700" },
  sentCard: { alignItems: "center", padding: spacing.xl, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.olive, marginTop: spacing.md, gap: spacing.sm },
  sentTitle: { fontFamily: type.serif, fontSize: 20, color: colors.onSurface, fontWeight: "600" },
  sentSub: { fontFamily: type.sans, fontSize: 14, color: colors.onSurfaceSoft, textAlign: "center" },
});
