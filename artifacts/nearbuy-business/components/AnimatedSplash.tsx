import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
} from "react-native";

const PIN_SIZE = 240;
const BAG_SIZE = 96;
const BAG_TOP = PIN_SIZE * 0.42 - BAG_SIZE / 2;

type Props = {
  onFinish: () => void;
};

export function AnimatedSplash({ onFinish }: Props) {
  const screenH = Dimensions.get("window").height;
  const translateY = useRef(new Animated.Value(-(screenH / 2 + PIN_SIZE))).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 55,
        friction: 7,
      }),
      Animated.timing(rotate, {
        toValue: 3,
        duration: 2200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(250),
      Animated.timing(fade, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, [translateY, rotate, fade, onFinish]);

  const rotateInterp = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { opacity: fade }]}
    >
      <Animated.View
        style={[styles.pinContainer, { transform: [{ translateY }] }]}
      >
        <Image
          source={require("../assets/images/pin-frame.png")}
          style={styles.pinFrame}
          resizeMode="contain"
        />
        <Animated.Image
          source={require("../assets/images/bag-nb.png")}
          resizeMode="contain"
          style={[
            styles.bag,
            { transform: [{ rotate: rotateInterp }] },
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  pinContainer: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    position: "relative",
  },
  pinFrame: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    position: "absolute",
    top: 0,
    left: 0,
  },
  bag: {
    width: BAG_SIZE,
    height: BAG_SIZE,
    position: "absolute",
    top: BAG_TOP,
    left: (PIN_SIZE - BAG_SIZE) / 2,
  },
});
