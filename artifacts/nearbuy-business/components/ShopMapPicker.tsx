import React from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

interface Props {
  latitude: number;
  longitude: number;
  onChange: (coord: { latitude: number; longitude: number }) => void;
}

export function ShopMapPicker({ latitude, longitude, onChange }: Props) {
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={(e) => onChange(e.nativeEvent.coordinate)}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          draggable
          onDragEnd={(e) => onChange(e.nativeEvent.coordinate)}
        />
      </MapView>
    </View>
  );
}
