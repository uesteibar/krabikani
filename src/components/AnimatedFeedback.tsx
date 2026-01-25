/**
 * AnimatedFeedback component for smooth correct/incorrect answer animations.
 * Provides subtle visual feedback animations.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';

import { COLORS } from '../theme';

// ============================================
// Types
// ============================================

export type FeedbackType = 'correct' | 'incorrect' | 'none';

export interface AnimatedFeedbackProps {
  /** The type of feedback to display */
  feedbackType: FeedbackType;
  /** Duration of the animation in milliseconds (default: 200) */
  duration?: number;
  /** Child components to wrap with animation */
  children: React.ReactNode;
  /** Additional style for the container */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

// ============================================
// Component
// ============================================

/**
 * AnimatedFeedback wraps content with subtle animation effects
 * for correct and incorrect answer feedback.
 *
 * Animations:
 * - Correct: Brief green flash with subtle pulse
 * - Incorrect: Brief red flash with subtle shake
 * - None: No animation (transparent overlay)
 */
export function AnimatedFeedback({
  feedbackType,
  duration = 200,
  children,
  style,
  testID,
}: AnimatedFeedbackProps) {
  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (feedbackType === 'none') {
      // Reset animations
      overlayOpacity.setValue(0);
      scale.setValue(1);
      translateX.setValue(0);
      return;
    }

    if (feedbackType === 'correct') {
      // Correct: Green flash with subtle pulse
      Animated.parallel([
        // Flash overlay
        Animated.sequence([
          Animated.timing(overlayOpacity, {
            toValue: 0.15,
            duration: duration * 0.4,
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: duration * 0.6,
            useNativeDriver: true,
          }),
        ]),
        // Subtle pulse
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.02,
            duration: duration * 0.4,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: duration * 0.6,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else if (feedbackType === 'incorrect') {
      // Incorrect: Red flash with subtle shake
      Animated.parallel([
        // Flash overlay
        Animated.sequence([
          Animated.timing(overlayOpacity, {
            toValue: 0.15,
            duration: duration * 0.4,
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: duration * 0.6,
            useNativeDriver: true,
          }),
        ]),
        // Subtle shake
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: -4,
            duration: duration * 0.15,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 4,
            duration: duration * 0.15,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: -2,
            duration: duration * 0.15,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 2,
            duration: duration * 0.15,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: duration * 0.4,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [feedbackType, duration, overlayOpacity, scale, translateX]);

  const overlayColor = feedbackType === 'correct'
    ? COLORS.feedback.correct
    : feedbackType === 'incorrect'
      ? COLORS.feedback.incorrect
      : 'transparent';

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Animated.View
        style={[
          styles.content,
          {
            transform: [
              { scale },
              { translateX },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: overlayColor,
            opacity: overlayOpacity,
          },
        ]}
        pointerEvents="none"
        testID={testID ? `${testID}-overlay` : undefined}
      />
    </View>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
  },
});
