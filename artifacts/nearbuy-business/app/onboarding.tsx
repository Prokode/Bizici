import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, TextInput, ScrollView, Platform, KeyboardAvoidingView } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { router } from "expo-router";
import { ShopMapPicker } from "@/components/ShopMapPicker";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUpsertShop } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetShopQueryKey } from "@workspace/api-client-react";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [marketName, setMarketName] = useState("");
  const [stallInfo, setStallInfo] = useState("");
  
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  const upsertShop = useUpsertShop();

  useEffect(() => {
    if (step === 2) {
      (async () => {
        setLocationLoading(true);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          // Default to a generic location if denied
          setLocation({ latitude: 37.7749, longitude: -122.4194 });
          setLocationLoading(false);
          return;
        }

        let loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        setLocationLoading(false);
      })();
    }
  }, [step]);

  const handleSave = async () => {
    if (!location) return;
    
    upsertShop.mutate(
      {
        data: {
          name,
          marketName: marketName || null,
          stallInfo: stallInfo || null,
          latitude: location.latitude,
          longitude: location.longitude,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetShopQueryKey() });
          router.replace("/(tabs)");
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {step === 1 ? (
        <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
            Set up your shop
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
            Let customers nearby know what you're selling.
          </Text>
          
          <Input
            label="Shop Name *"
            placeholder="e.g. Maria's Fresh Produce"
            value={name}
            onChangeText={setName}
          />
          
          <Input
            label="Market Name (Optional)"
            placeholder="e.g. Central Market"
            value={marketName}
            onChangeText={setMarketName}
          />
          
          <Input
            label="Stall Info (Optional)"
            placeholder="e.g. Aisle B, #4"
            value={stallInfo}
            onChangeText={setStallInfo}
          />
          
          <View style={{ flex: 1 }} />
          
          <Button
            title="Next"
            size="lg"
            disabled={!name.trim()}
            onPress={() => setStep(2)}
            style={{ marginTop: 24 }}
          />
        </KeyboardAwareScrollViewCompat>
      ) : (
        <View style={styles.mapContainer}>
          {location && (
            <ShopMapPicker
              latitude={location.latitude}
              longitude={location.longitude}
              onChange={setLocation}
            />
          )}
          
          <View style={[styles.mapOverlay, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <Card style={[styles.mapCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.mapTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
                Pin your location
              </Text>
              <Text style={[styles.mapDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
                Drag the pin to your exact spot so customers can find you.
              </Text>
              <Button
                title="Confirm Location"
                size="lg"
                loading={upsertShop.isPending || locationLoading}
                disabled={!location}
                onPress={handleSave}
              />
              <Button
                title="Back"
                variant="ghost"
                onPress={() => setStep(1)}
                style={{ marginTop: 8 }}
              />
            </Card>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  categoryBtn: {
    marginBottom: 8,
  },
  mapContainer: {
    flex: 1,
  },
  webMapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mapOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  mapCard: {
    padding: 16,
    borderRadius: 16,
  },
  mapTitle: {
    fontSize: 20,
    marginBottom: 4,
  },
  mapDesc: {
    fontSize: 14,
    marginBottom: 16,
  },
});