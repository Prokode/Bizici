import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Stop,
  Circle,
} from "react-native-svg";

const PIN_W = 240;
const PIN_H = 312;
const BAG_SIZE = 100;

const INNER_CX = 50;
const INNER_CY = 48;
const INNER_R = 32;

const BAG_LEFT = (INNER_CX / 100) * PIN_W - BAG_SIZE / 2;
const BAG_TOP = (INNER_CY / 130) * PIN_H - BAG_SIZE / 2;

type Props = {
  onFinish: () => void;
};

export function AnimatedSplash({ onFinish }: Props) {
  const screenH = Dimensions.get("window").height;
  const translateY = useRef(
    new Animated.Value(-(screenH / 2 + PIN_H)),
  ).current;
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
        style={[
          styles.pinContainer,
          { transform: [{ translateY }] },
        ]}
      >
        <Svg
          width={PIN_W}
          height={PIN_H}
          viewBox="0 0 100 130"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <LinearGradient id="pinGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FF6B35" />
              <Stop offset="1" stopColor="#FF3D7F" />
            </LinearGradient>
          </Defs>
          <Path
            d="M 50 8
               C 26.8 8 8 26.8 8 50
               C 8 78 50 122 50 122
               C 50 122 92 78 92 50
               C 92 26.8 73.2 8 50 8 Z"
            stroke="url(#pinGrad)"
            strokeWidth={5}
            fill="none"
            strokeLinejoin="round"
          />
          <Circle
            cx={INNER_CX}
            cy={INNER_CY}
            r={INNER_R}
            stroke="url(#pinGrad)"
            strokeWidth={3.5}
            fill="none"
          />
        </Svg>
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
    width: PIN_W,
    height: PIN_H,
    position: "relative",
  },
  bag: {
    width: BAG_SIZE,
    height: BAG_SIZE,
    position: "absolute",
    top: BAG_TOP,
    left: BAG_LEFT,
  },
});
