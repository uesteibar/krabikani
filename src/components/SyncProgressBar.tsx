import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

import { COLORS, PROGRESS_COLORS } from '../theme';

export interface SyncProgressBarProps {
  /** Whether sync is in progress */
  isSyncing: boolean;
  /** Optional test ID */
  testID?: string;
}

const BAR_HEIGHT = 3;

/**
 * A subtle animated progress bar shown at the top of the screen during sync.
 * Uses an indeterminate animation pattern.
 */
export function SyncProgressBar({
  isSyncing,
  testID = 'sync-progress-bar',
}: SyncProgressBarProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isSyncing) {
      // Animate from 0 to 100% repeatedly
      progress.value = 0;
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 0 }),
        ),
        -1, // Infinite repeat
        false,
      );
    } else {
      cancelAnimation(progress);
      progress.value = 0;
    }

    return () => {
      cancelAnimation(progress);
    };
  }, [isSyncing, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (!isSyncing) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      <Animated.View style={[styles.progressFill, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: BAR_HEIGHT,
    backgroundColor: PROGRESS_COLORS.background,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.subject.vocabulary,
  },
});
