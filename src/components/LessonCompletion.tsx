import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
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

import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import type { SubjectType } from '../api/types';
import {
  DASHBOARD_COLORS,
  COLORS,
  SHADOW,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
  MIN_TOUCH_TARGET,
  TEXT_STYLES,
  getSubjectColor,
} from '../theme';

// Animation timing constants
const STAGGER_DELAY = 200;
const FADE_DURATION = 500;
const SLIDE_DISTANCE = 30;

// Confetti configuration (shown when quiz was perfect)
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

// Encouragement messages shown after completing lessons
const ENCOURAGEMENT_MESSAGES = [
  'Great work! Keep up the momentum.',
  'Every review brings you closer to mastery.',
  'Consistency is the key to learning.',
  'Your dedication is paying off!',
  'One step closer to fluency.',
  'Well done! Progress takes practice.',
  'Keep showing up, and the rest follows.',
  'Nice session! Small steps lead to big gains.',
];

/** A single item result for the lesson session results list */
export interface LessonResultItem {
  /** Subject ID */
  id: number;
  /** Characters to display */
  characters: string | null;
  /** Primary meaning */
  primaryMeaning: string;
  /** Primary reading (empty string if none) */
  primaryReading: string;
  /** Subject type for color accent */
  subjectType: SubjectType;
}

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
  const angle = (index / CONFETTI_COUNT) * 2 * Math.PI + Math.random() * 0.5;
  const distance = 60 + Math.random() * 40;
  const endX = startX + Math.cos(angle) * distance;
  const endY = startY + Math.sin(angle) * distance - 30;

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const easeOut = 1 - Math.pow(1 - p, 3);
    const x = startX + (endX - startX) * easeOut;
    const y = startY + (endY - startY) * easeOut + p * p * 50;
    const scale = p < 0.3 ? p / 0.3 : p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    const opacity = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
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
      style={[
        styles.confettiParticle,
        { backgroundColor: color },
        animatedStyle,
      ]}
      testID={`confetti-particle-${index}`}
    />
  );
}

export interface LessonCompletionProps {
  /** Number of items learned in this session */
  itemsLearned: number;
  /** Whether the lessons were synced online or queued offline */
  syncedOnline: boolean;
  /** Number of lessons available in the next batch (0 if none) */
  moreLessonsAvailable: number;
  /** Whether the quiz was completed without mistakes */
  perfectQuiz?: boolean;
  /** Callback when user wants to return to dashboard */
  onReturnToDashboard: () => void;
  /** Callback when user wants to continue with next batch */
  onContinueLessons?: () => void;
  /** Optional list of learned items for display */
  resultItems?: LessonResultItem[];
}

/**
 * LessonCompletion shows a summary after completing a lesson batch.
 * Features staggered entrance animations, confetti for perfect quiz,
 * encouragement messages, sync status badge, and items learned list.
 * Buttons are sticky at the bottom.
 */
export function LessonCompletion({
  itemsLearned,
  syncedOnline,
  moreLessonsAvailable,
  perfectQuiz = false,
  onReturnToDashboard,
  onContinueLessons,
  resultItems,
}: LessonCompletionProps) {
  const showContinueButton = moreLessonsAvailable > 0 && onContinueLessons;

  // Track reduced motion preference
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
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
  const encouragementOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const encouragementTranslateY = useSharedValue(
    reduceMotion ? 0 : SLIDE_DISTANCE,
  );
  const itemsListOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const itemsListTranslateY = useSharedValue(reduceMotion ? 0 : SLIDE_DISTANCE);
  const syncOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const syncTranslateY = useSharedValue(reduceMotion ? 0 : SLIDE_DISTANCE);
  const buttonOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const buttonTranslateY = useSharedValue(reduceMotion ? 0 : SLIDE_DISTANCE);

  // Confetti animation (only for perfect quiz)
  const confettiProgress = useSharedValue(0);
  const showConfetti = perfectQuiz && !reduceMotion;

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

  // Select a random encouragement message on mount
  const encouragementMessage = useMemo(() => {
    const index = Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length);
    return ENCOURAGEMENT_MESSAGES[index];
  }, []);

  // Start animations on mount
  useEffect(() => {
    if (reduceMotion) {
      iconScale.value = 1;
      checkmarkProgress.value = 1;
      titleOpacity.value = 1;
      titleTranslateY.value = 0;
      countOpacity.value = 1;
      countTranslateY.value = 0;
      encouragementOpacity.value = 1;
      encouragementTranslateY.value = 0;
      itemsListOpacity.value = 1;
      itemsListTranslateY.value = 0;
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

    checkmarkProgress.value = withDelay(
      100,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
    );

    if (showConfetti) {
      confettiProgress.value = withDelay(
        400,
        withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
      );
    }

    // Element 2: Title
    titleOpacity.value = withDelay(
      STAGGER_DELAY,
      withTiming(1, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.ease),
      }),
    );
    titleTranslateY.value = withDelay(
      STAGGER_DELAY,
      withTiming(0, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.ease),
      }),
    );

    // Element 3: Items count
    countOpacity.value = withDelay(
      STAGGER_DELAY * 2,
      withTiming(1, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.ease),
      }),
    );
    countTranslateY.value = withDelay(
      STAGGER_DELAY * 2,
      withTiming(0, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.ease),
      }),
    );

    // Element 4: Encouragement message
    encouragementOpacity.value = withDelay(
      STAGGER_DELAY * 3,
      withTiming(1, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.ease),
      }),
    );
    encouragementTranslateY.value = withDelay(
      STAGGER_DELAY * 3,
      withTiming(0, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.ease),
      }),
    );

    // Element 5: Items list
    itemsListOpacity.value = withDelay(
      STAGGER_DELAY * 4,
      withTiming(1, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.ease),
      }),
    );
    itemsListTranslateY.value = withDelay(
      STAGGER_DELAY * 4,
      withTiming(0, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.ease),
      }),
    );

    // Element 6: Sync status
    syncOpacity.value = withDelay(
      STAGGER_DELAY * 5,
      withTiming(1, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.ease),
      }),
    );
    syncTranslateY.value = withDelay(
      STAGGER_DELAY * 5,
      withTiming(0, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.ease),
      }),
    );

    // Element 7: Button(s)
    buttonOpacity.value = withDelay(
      STAGGER_DELAY * 6,
      withTiming(1, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.ease),
      }),
    );
    buttonTranslateY.value = withDelay(
      STAGGER_DELAY * 6,
      withTiming(0, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.ease),
      }),
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
    encouragementOpacity,
    encouragementTranslateY,
    itemsListOpacity,
    itemsListTranslateY,
    syncOpacity,
    syncTranslateY,
    buttonOpacity,
    buttonTranslateY,
  ]);

  // Animated styles
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkmarkProgress.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const countAnimatedStyle = useAnimatedStyle(() => ({
    opacity: countOpacity.value,
    transform: [{ translateY: countTranslateY.value }],
  }));

  const encouragementAnimatedStyle = useAnimatedStyle(() => ({
    opacity: encouragementOpacity.value,
    transform: [{ translateY: encouragementTranslateY.value }],
  }));

  const itemsListAnimatedStyle = useAnimatedStyle(() => ({
    opacity: itemsListOpacity.value,
    transform: [{ translateY: itemsListTranslateY.value }],
  }));

  const syncAnimatedStyle = useAnimatedStyle(() => ({
    opacity: syncOpacity.value,
    transform: [{ translateY: syncTranslateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  return (
    <View style={styles.rootContainer} testID="lesson-completion">
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.container}
      >
        {/* Confetti particles (only for perfect quiz) */}
        {confettiParticles.map(({ id, color }) => (
          <ConfettiParticle
            key={id}
            index={id}
            progress={confettiProgress}
            startX={40}
            startY={40}
            color={color}
          />
        ))}

        {/* Animated success icon */}
        <Animated.View
          style={[styles.iconContainer, iconAnimatedStyle]}
          testID="lesson-completion-icon"
        >
          <Animated.View style={checkmarkAnimatedStyle}>
            <MaterialDesignIcons
              name="check-circle"
              size={40}
              color={COLORS.text.inverse}
            />
          </Animated.View>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          style={[styles.title, titleAnimatedStyle]}
          testID="lesson-completion-title"
        >
          Lessons Complete!
        </Animated.Text>

        {/* Summary */}
        <Animated.View style={[styles.summaryContainer, countAnimatedStyle]}>
          <Text style={styles.summaryNumber} testID="lesson-completion-count">
            {itemsLearned}
          </Text>
          <Text style={styles.summaryLabel} testID="lesson-completion-label">
            {itemsLearned === 1 ? 'item learned' : 'items learned'}
          </Text>
        </Animated.View>

        {/* Encouragement message */}
        <Animated.Text
          style={[styles.encouragementText, encouragementAnimatedStyle]}
          testID="lesson-completion-encouragement"
        >
          {encouragementMessage}
        </Animated.Text>

        {/* Results list */}
        {resultItems && resultItems.length > 0 && (
          <Animated.View
            style={[styles.resultsSection, itemsListAnimatedStyle]}
          >
            <View
              style={styles.resultsList}
              testID="lesson-completion-results-list"
            >
              {resultItems.map(item => (
                <View
                  key={item.id}
                  style={styles.resultItem}
                  testID={`lesson-result-${item.id}`}
                >
                  <View
                    style={[
                      styles.resultAccent,
                      { backgroundColor: getSubjectColor(item.subjectType) },
                    ]}
                  />
                  <View style={styles.resultContent}>
                    <Text
                      style={[
                        styles.resultCharacter,
                        TEXT_STYLES.japaneseDisplay,
                      ]}
                    >
                      {item.characters ?? '?'}
                    </Text>
                    <View style={styles.resultDetails}>
                      <Text style={styles.resultMeaning} numberOfLines={1}>
                        {item.primaryMeaning}
                      </Text>
                      {item.primaryReading.length > 0 && (
                        <>
                          <Text style={styles.resultSeparator}>·</Text>
                          <Text style={styles.resultReading} numberOfLines={1}>
                            {item.primaryReading}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Sync status badge */}
        <Animated.View
          style={[
            styles.syncStatusContainer,
            syncedOnline ? styles.syncStatusOnline : styles.syncStatusOffline,
            syncAnimatedStyle,
          ]}
          testID="lesson-completion-sync-status"
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
      </ScrollView>

      {/* Fixed buttons at the bottom */}
      <Animated.View style={[styles.fixedButtonContainer, buttonAnimatedStyle]}>
        {showContinueButton && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onContinueLessons}
            activeOpacity={0.8}
            testID="lesson-completion-continue"
          >
            <Text style={styles.continueButtonText}>
              Continue ({moreLessonsAvailable} more)
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.dashboardButton,
            showContinueButton && styles.dashboardButtonSecondary,
          ]}
          onPress={onReturnToDashboard}
          activeOpacity={0.8}
          testID="lesson-completion-dashboard"
        >
          <Text
            style={[
              styles.dashboardButtonText,
              showContinueButton && styles.dashboardButtonTextSecondary,
            ]}
          >
            Return to Dashboard
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xxxl,
    flexGrow: 1,
  },
  fixedButtonContainer: {
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    backgroundColor: COLORS.background.primary,
    gap: SPACING.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.feedback.correct,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
    shadowColor: SHADOW.color,
    shadowOffset: SHADOW.offset,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
    color: DASHBOARD_COLORS.lessons,
    lineHeight: 72,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  encouragementText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    fontStyle: 'italic',
  },
  syncStatusContainer: {
    marginBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  syncStatusOnline: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  syncStatusOffline: {
    backgroundColor: 'rgba(230, 126, 34, 0.15)',
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
  continueButton: {
    backgroundColor: DASHBOARD_COLORS.lessons,
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
  continueButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
  dashboardButton: {
    backgroundColor: COLORS.neutral.gray600,
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
  dashboardButtonSecondary: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 2,
    borderColor: COLORS.border.medium,
  },
  dashboardButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
  dashboardButtonTextSecondary: {
    color: COLORS.text.secondary,
  },
  confettiParticle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  // Results list
  resultsSection: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  resultsList: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  resultAccent: {
    width: 5,
    alignSelf: 'stretch',
    marginLeft: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  resultContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.md,
    gap: SPACING.md,
  },
  resultCharacter: {
    fontSize: FONT_SIZES.xxl,
    color: COLORS.text.primary,
  },
  resultDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  resultMeaning: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.primary,
    flexShrink: 1,
  },
  resultSeparator: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.tertiary,
  },
  resultReading: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    flexShrink: 1,
  },
});
