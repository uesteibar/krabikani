import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  SharedValue,
} from 'react-native-reanimated';

import {
  DASHBOARD_COLORS,
  COLORS,
  SHADOW,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
  MIN_TOUCH_TARGET,
} from '../theme';

// Animation timing constants
const STAGGER_DELAY = 100; // 100ms between each element
const FADE_DURATION = 300;
const SLIDE_DISTANCE = 20; // pixels to slide up

// Confetti configuration
const CONFETTI_COUNT = 12;
const CONFETTI_COLORS = [
  '#FFD700', // Gold
  '#FF6B6B', // Coral
  '#4ECDC4', // Teal
  '#45B7D1', // Sky blue
  '#96CEB4', // Sage
  '#FFEAA7', // Cream
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
];

export interface ReviewCompletionProps {
  /** Number of items reviewed in this session */
  itemsReviewed: number;
  /** Number of incorrect answers */
  incorrectCount: number;
  /** Whether the reviews were synced online or queued offline */
  syncedOnline: boolean;
  /** Callback when user wants to return to dashboard */
  onReturnToDashboard: () => void;
}

/**
 * Confetti particle component for celebration effect.
 */
interface ConfettiParticleProps {
  index: number;
  progress: SharedValue<number>;
  startX: number;
  startY: number;
  color: string;
}

function ConfettiParticle({
  index,
  progress,
  startX,
  startY,
  color,
}: ConfettiParticleProps) {
  // Each particle has a unique trajectory
  const angle = (index / CONFETTI_COUNT) * 2 * Math.PI + Math.random() * 0.5;
  const distance = 60 + Math.random() * 40;
  const endX = startX + Math.cos(angle) * distance;
  const endY = startY + Math.sin(angle) * distance - 30; // Bias upward

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    // Ease out trajectory
    const easeOut = 1 - Math.pow(1 - p, 3);
    const x = startX + (endX - startX) * easeOut;
    const y = startY + (endY - startY) * easeOut + p * p * 50; // Gravity effect
    // Scale up then down
    const scale = p < 0.3 ? p / 0.3 : p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    // Fade out at the end
    const opacity = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    // Rotation for visual interest
    const rotation = p * 360 * (index % 2 === 0 ? 1 : -1);

    return {
      transform: [
        { translateX: x - 5 },
        { translateY: y - 5 },
        { scale: scale * 0.8 },
        { rotate: `${rotation}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[styles.confettiParticle, { backgroundColor: color }, animatedStyle]}
      testID={`confetti-particle-${index}`}
    />
  );
}

/**
 * ReviewCompletion shows a summary after completing a review session.
 * Displays the number of items reviewed, incorrect count, sync status,
 * and offers to return to dashboard.
 *
 * Features staggered entrance animations and confetti burst for perfect sessions.
 */
export function ReviewCompletion({
  itemsReviewed,
  incorrectCount,
  syncedOnline,
  onReturnToDashboard,
}: ReviewCompletionProps) {
  // Track reduced motion preference
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Check initial reduced motion setting
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    // Listen for changes to reduced motion setting
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Animation shared values
  const iconScale = useSharedValue(reduceMotion ? 1 : 0);
  const checkmarkProgress = useSharedValue(reduceMotion ? 1 : 0);

  // Staggered entrance animations
  const titleOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const titleTranslateY = useSharedValue(reduceMotion ? 0 : SLIDE_DISTANCE);
  const countOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const countTranslateY = useSharedValue(reduceMotion ? 0 : SLIDE_DISTANCE);
  const incorrectOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const incorrectTranslateY = useSharedValue(reduceMotion ? 0 : SLIDE_DISTANCE);
  const syncOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const syncTranslateY = useSharedValue(reduceMotion ? 0 : SLIDE_DISTANCE);
  const buttonOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const buttonTranslateY = useSharedValue(reduceMotion ? 0 : SLIDE_DISTANCE);

  // Confetti animation (only for perfect sessions)
  const confettiProgress = useSharedValue(0);
  const showConfetti = incorrectCount === 0 && !reduceMotion;

  // Generate confetti particles
  const confettiParticles = useMemo(
    () =>
      showConfetti
        ? Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
            id: i,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          }))
        : [],
    [showConfetti],
  );

  // Start animations on mount
  useEffect(() => {
    if (reduceMotion) {
      // Skip animations for reduced motion
      iconScale.value = 1;
      checkmarkProgress.value = 1;
      titleOpacity.value = 1;
      titleTranslateY.value = 0;
      countOpacity.value = 1;
      countTranslateY.value = 0;
      incorrectOpacity.value = 1;
      incorrectTranslateY.value = 0;
      syncOpacity.value = 1;
      syncTranslateY.value = 0;
      buttonOpacity.value = 1;
      buttonTranslateY.value = 0;
      return;
    }

    // Element 1: Icon (delay 0ms)
    iconScale.value = withSequence(
      withTiming(1.15, { duration: 300, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }),
    );

    // Checkmark stroke animation
    checkmarkProgress.value = withDelay(
      100,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
    );

    // Confetti burst (if perfect session) - starts after icon animation
    if (showConfetti) {
      confettiProgress.value = withDelay(
        400,
        withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
      );
    }

    // Element 2: Title (delay 100ms)
    titleOpacity.value = withDelay(
      STAGGER_DELAY,
      withTiming(1, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }),
    );
    titleTranslateY.value = withDelay(
      STAGGER_DELAY,
      withTiming(0, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }),
    );

    // Element 3: Items count (delay 200ms)
    countOpacity.value = withDelay(
      STAGGER_DELAY * 2,
      withTiming(1, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }),
    );
    countTranslateY.value = withDelay(
      STAGGER_DELAY * 2,
      withTiming(0, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }),
    );

    // Element 4: Incorrect count (delay 300ms)
    incorrectOpacity.value = withDelay(
      STAGGER_DELAY * 3,
      withTiming(1, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }),
    );
    incorrectTranslateY.value = withDelay(
      STAGGER_DELAY * 3,
      withTiming(0, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }),
    );

    // Element 5: Sync status (delay 400ms)
    syncOpacity.value = withDelay(
      STAGGER_DELAY * 4,
      withTiming(1, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }),
    );
    syncTranslateY.value = withDelay(
      STAGGER_DELAY * 4,
      withTiming(0, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }),
    );

    // Element 6: Button (delay 500ms)
    buttonOpacity.value = withDelay(
      STAGGER_DELAY * 5,
      withTiming(1, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }),
    );
    buttonTranslateY.value = withDelay(
      STAGGER_DELAY * 5,
      withTiming(0, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }),
    );
  }, [
    reduceMotion,
    showConfetti,
    iconScale,
    checkmarkProgress,
    confettiProgress,
    titleOpacity,
    titleTranslateY,
    countOpacity,
    countTranslateY,
    incorrectOpacity,
    incorrectTranslateY,
    syncOpacity,
    syncTranslateY,
    buttonOpacity,
    buttonTranslateY,
  ]);

  // Animated styles for the icon container
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  // Animated style for checkmark
  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkmarkProgress.value,
  }));

  // Animated styles for staggered elements
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const countAnimatedStyle = useAnimatedStyle(() => ({
    opacity: countOpacity.value,
    transform: [{ translateY: countTranslateY.value }],
  }));

  const incorrectAnimatedStyle = useAnimatedStyle(() => ({
    opacity: incorrectOpacity.value,
    transform: [{ translateY: incorrectTranslateY.value }],
  }));

  const syncAnimatedStyle = useAnimatedStyle(() => ({
    opacity: syncOpacity.value,
    transform: [{ translateY: syncTranslateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const hasIncorrect = incorrectCount > 0;

  return (
    <View style={styles.container} testID="review-completion">
      {/* Confetti particles (only for perfect sessions) */}
      {confettiParticles.map(({ id, color }) => (
        <ConfettiParticle
          key={id}
          index={id}
          progress={confettiProgress}
          startX={40} // Center of icon
          startY={40} // Center of icon
          color={color}
        />
      ))}

      {/* Animated success icon */}
      <Animated.View
        style={[styles.iconContainer, iconAnimatedStyle]}
        testID="review-completion-icon"
      >
        <Animated.Text style={[styles.icon, checkmarkAnimatedStyle]}>
          ✓
        </Animated.Text>
      </Animated.View>

      {/* Title */}
      <Animated.Text
        style={[styles.title, titleAnimatedStyle]}
        testID="review-completion-title"
      >
        Reviews Complete!
      </Animated.Text>

      {/* Items reviewed count - large 64px */}
      <Animated.View style={[styles.summaryContainer, countAnimatedStyle]}>
        <Text style={styles.summaryNumber} testID="review-completion-count">
          {itemsReviewed}
        </Text>
        <Text style={styles.summaryLabel} testID="review-completion-label">
          {itemsReviewed === 1 ? 'item reviewed' : 'items reviewed'}
        </Text>
      </Animated.View>

      {/* Incorrect count - only show if > 0, with red tint */}
      {hasIncorrect && (
        <Animated.View
          style={[styles.incorrectContainer, incorrectAnimatedStyle]}
          testID="review-completion-incorrect"
        >
          <Text style={styles.incorrectCount}>{incorrectCount}</Text>
          <Text style={styles.incorrectLabel}>
            {incorrectCount === 1 ? 'incorrect answer' : 'incorrect answers'}
          </Text>
        </Animated.View>
      )}

      {/* Sync status badge */}
      <Animated.View
        style={[
          styles.syncStatusContainer,
          syncedOnline ? styles.syncStatusOnline : styles.syncStatusOffline,
          syncAnimatedStyle,
        ]}
        testID="review-completion-sync-status"
      >
        <Text
          style={[
            styles.syncStatusText,
            syncedOnline
              ? styles.syncStatusTextOnline
              : styles.syncStatusTextOffline,
          ]}
        >
          {syncedOnline ? 'Synced' : 'Queued'}
        </Text>
      </Animated.View>

      {/* Return to Dashboard button */}
      <Animated.View style={[styles.actionsContainer, buttonAnimatedStyle]}>
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={onReturnToDashboard}
          activeOpacity={0.8}
          testID="review-completion-dashboard"
        >
          <Text style={styles.dashboardButtonText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: DASHBOARD_COLORS.reviews,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
    shadowColor: SHADOW.color,
    shadowOffset: SHADOW.offset,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 40,
    color: COLORS.text.inverse,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: SPACING.xxl,
    textAlign: 'center',
  },
  summaryContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  summaryNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: DASHBOARD_COLORS.reviews,
    lineHeight: 72,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  incorrectContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  incorrectCount: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.feedback.incorrect,
  },
  incorrectLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.feedback.incorrect,
    marginTop: SPACING.xs,
  },
  syncStatusContainer: {
    marginBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  syncStatusOnline: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)', // Green with low opacity
  },
  syncStatusOffline: {
    backgroundColor: 'rgba(230, 126, 34, 0.15)', // Amber with low opacity
  },
  syncStatusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  syncStatusTextOnline: {
    color: COLORS.feedback.correct,
  },
  syncStatusTextOffline: {
    color: COLORS.feedback.warning,
  },
  actionsContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  dashboardButton: {
    backgroundColor: DASHBOARD_COLORS.reviews,
    paddingVertical: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SHADOW.color,
    shadowOffset: SHADOW.offset,
    shadowOpacity: SHADOW.opacity,
    shadowRadius: SHADOW.radius,
    elevation: SHADOW.elevation,
  },
  dashboardButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
  confettiParticle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
