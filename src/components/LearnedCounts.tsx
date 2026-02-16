import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

import {
  SUBJECT_COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../theme';
import { useTheme } from '../theme/ThemeContext';

export interface LearnedCountsProps {
  kanjiCount: number;
  vocabularyCount: number;
}

interface AnimatedCounterProps {
  label: string;
  targetCount: number;
  color: string;
  testID?: string;
}

/**
 * Animated counter that counts from 0 to target value.
 * Animates over 500ms with ease-out timing.
 */
function AnimatedCounter({
  label,
  targetCount,
  color,
  testID,
}: AnimatedCounterProps) {
  const { colors } = useTheme();
  const [displayCount, setDisplayCount] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const animatedProgress = useSharedValue(0);

  const dynamicStyles = useMemo(
    () => ({
      countBadge: {
        backgroundColor: colors.background.secondary,
      },
      labelText: {
        color: colors.text.secondary,
      },
    }),
    [colors],
  );

  // Check reduced motion setting
  useEffect(() => {
    const checkReducedMotion = async () => {
      const isReduced = await AccessibilityInfo.isReduceMotionEnabled();
      setReducedMotion(isReduced);
      if (isReduced) {
        setDisplayCount(targetCount);
      }
    };
    checkReducedMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isReduced: boolean) => {
        setReducedMotion(isReduced);
        if (isReduced) {
          setDisplayCount(targetCount);
        }
      },
    );

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate count when target changes
  useEffect(() => {
    if (reducedMotion) {
      setDisplayCount(targetCount);
      return;
    }

    // Reset to 0 and animate to target
    animatedProgress.value = 0;
    setDisplayCount(0);

    const updateDisplayCount = (progress: number) => {
      const count = Math.round(progress * targetCount);
      setDisplayCount(count);
    };

    // Animate progress from 0 to 1
    animatedProgress.value = withTiming(
      1,
      {
        duration: 500,
        easing: Easing.out(Easing.ease),
      },
      finished => {
        if (finished) {
          runOnJS(setDisplayCount)(targetCount);
        }
      },
    );

    // Update display count during animation
    const interval = setInterval(() => {
      const progress = animatedProgress.value;
      updateDisplayCount(progress);
      if (progress >= 1) {
        clearInterval(interval);
        setDisplayCount(targetCount);
      }
    }, 16); // ~60fps

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCount, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: 200 }),
  }));

  return (
    <View style={styles.counterContainer} testID={testID}>
      <Animated.View
        style={[styles.countBadge, dynamicStyles.countBadge, animatedStyle]}
      >
        <View style={[styles.colorDot, { backgroundColor: color }]} />
        <Text style={[styles.labelText, dynamicStyles.labelText]}>{label}</Text>
        <Text
          style={[styles.countText, { color }]}
          testID={testID ? `${testID}-value` : undefined}
        >
          {displayCount}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * Displays learned kanji and vocabulary counts with animated counting effect.
 * Counts animate from 0 to actual number over 500ms with ease-out timing.
 */
export function LearnedCounts({
  kanjiCount,
  vocabularyCount,
}: LearnedCountsProps) {
  return (
    <View style={styles.container} testID="learned-counts">
      <AnimatedCounter
        label="Kanji Learned:"
        targetCount={kanjiCount}
        color={SUBJECT_COLORS.kanji}
        testID="kanji-learned"
      />
      <AnimatedCounter
        label="Vocabulary Learned:"
        targetCount={vocabularyCount}
        color={SUBJECT_COLORS.vocabulary}
        testID="vocabulary-learned"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  counterContainer: {
    alignItems: 'center',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelText: {
    fontSize: FONT_SIZES.sm,
  },
  countText: {
    fontSize: FONT_SIZES.base,
    fontWeight: 'bold',
  },
});
