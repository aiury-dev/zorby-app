import React, { useMemo, useRef } from "react";
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Props = PressableProps & {
  scaleValue?: number;
  containerStyle?: StyleProp<ViewStyle>;
};

export function PressableScale({
  children,
  scaleValue = 0.96,
  onPressIn,
  onPressOut,
  containerStyle,
  style,
  ...props
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animatedStyle = useMemo(
    () => [{ transform: [{ scale }] }, containerStyle],
    [containerStyle, scale],
  );

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...props}
        style={style}
        onPressIn={(event) => {
          Animated.spring(scale, {
            toValue: scaleValue,
            tension: 300,
            friction: 20,
            useNativeDriver: true,
          }).start();
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          Animated.spring(scale, {
            toValue: 1,
            tension: 300,
            friction: 20,
            useNativeDriver: true,
          }).start();
          onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
