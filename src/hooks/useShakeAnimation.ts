import { useCallback, useRef } from 'react';
import { Animated } from 'react-native';

export function useShakeAnimation() {
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const triggerShake = useCallback(() => {
    shakeAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnimation]);

  const shakeStyle = { transform: [{ translateX: shakeAnimation }] };

  return { shakeStyle, triggerShake };
}
