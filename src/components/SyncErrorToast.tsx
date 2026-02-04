import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';

import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';

export interface SyncErrorToastProps {
  /** Whether to show the toast */
  visible: boolean;
  /** Callback when the toast dismisses itself */
  onDismiss: () => void;
  /** Optional test ID */
  testID?: string;
}

const DISPLAY_DURATION = 3000;
const ANIMATION_DURATION = 300;

/**
 * A subtle error toast that auto-dismisses after a few seconds.
 * Shows a brief "Sync failed" message.
 */
export function SyncErrorToast({
  visible,
  onDismiss,
  testID = 'sync-error-toast',
}: SyncErrorToastProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Fade in, hold, fade out, then dismiss
      opacity.value = withSequence(
        withTiming(1, { duration: ANIMATION_DURATION }),
        withTiming(1, { duration: DISPLAY_DURATION }),
        withTiming(0, { duration: ANIMATION_DURATION }, finished => {
          if (finished) {
            runOnJS(onDismiss)();
          }
        }),
      );
    } else {
      opacity.value = 0;
    }
  }, [visible, opacity, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]} testID={testID}>
      <View style={styles.toast}>
        <Text style={styles.text}>Sync failed</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: SPACING.xxxl,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    backgroundColor: COLORS.feedback.incorrect,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  text: {
    color: COLORS.text.inverse,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});
