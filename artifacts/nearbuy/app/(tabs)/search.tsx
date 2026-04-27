import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";

export default function SearchTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQ = typeof params.q === "string" ? params.q : "";
  const [query, setQuery] = useState(initialQ);
  const [submitted, setSubmitted] = useState(initialQ);

  // Results will be wired to /api/public/search in T009. For now: empty state UX.
  const results: Array<{
    id: string;
    name: string;
    shopName: string;
    distanceKm: number;
  }> = [];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 12 },
      ]}
    >
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.muted, borderColor: colors.border },
        ]}
      >
        <Feather name="search" size={20} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Que cherchez-vous ?"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
          returnKeyType="search"
          onSubmitEditing={() => setSubmitted(query.trim())}
          autoFocus={!initialQ}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={12}>
            <Feather name="x-circle" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {!submitted ? (
        <View style={styles.center}>
          <Feather name="search" size={40} color={colors.mutedForeground} />
          <Text style={[styles.hintTitle, { color: colors.foreground }]}>
            Trouvez un produit près de vous
          </Text>
          <Text style={[styles.hintBody, { color: colors.mutedForeground }]}>
            Tapez le nom d'un produit. La recherche tolère les fautes
            d'orthographe et trie par distance.
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
          <Text style={[styles.hintTitle, { color: colors.foreground }]}>
            Aucun résultat pour « {submitted} »
          </Text>
          <Text style={[styles.hintBody, { color: colors.mutedForeground }]}>
            Diffusez votre demande aux boutiques dans un rayon de 5 km — vous
            serez notifié dès qu'un vendeur l'aura en stock.
          </Text>
          <View style={{ height: 16 }} />
          <Button
            title="Diffuser ma demande"
            onPress={() => {
              // TODO: wire broadcast endpoint in next iteration
            }}
            icon={<Feather name="radio" size={18} color="#ffffff" />}
          />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View
              style={[
                styles.row,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                  {item.name}
                </Text>
                <Text
                  style={[styles.rowSub, { color: colors.mutedForeground }]}
                >
                  {item.shopName} · {item.distanceKm.toFixed(1)} km
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  hintTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  hintBody: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  list: { paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  rowTitle: { fontSize: 15, fontWeight: "700" },
  rowSub: { fontSize: 13, marginTop: 2 },
});
