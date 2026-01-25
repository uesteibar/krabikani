import React, { useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
  interpolateColor,
  SharedValue,
} from 'react-native-reanimated';

import {
  getSrsLevelInfo,
  SrsLevelKey,
  SRS_LEVELS,
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../theme';

export interface AnimatedSrsLevelBadgeProps {
  /** Current SRS stage (1-9) */
  stage: number;
  /** Previous SRS stage for animation (optional - only animate if different level) */
  fromStage?: number;
  /** Whether to show the level-up animation */
  animateLevelUp?: boolean;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  testID?: string;
}

/**
 * Icons for each SRS level - bar style progression with flame for burned.
 */
const LEVEL_ICONS: Record<SrsLevelKey, string> = {
  apprentice: '▁',
  guru: '▃',
  master: '▅',
  enlightened: '▇',
  burned: '🔥',
};

// Default fallback color for invalid stages
const DEFAULT_COLOR = SRS_LEVELS.apprentice.color;

// Animation timing constants
const INITIAL_DISPLAY_DURATION = 200;
const SCALE_UP_DURATION = 150;
const CROSSFADE_DURATION = 300;
const SCALE_DOWN_DURATION = 150;

// Particle configuration
const PARTICLE_COUNT = 8;
const PARTICLE_COLORS = ['#FFD700', '#FFA500', '#FF6347', '#ADFF2F', '#00CED1'];

interface ParticleProps {
  index: number;
  visible: SharedValue<number>;
  startX: number;
  startY: number;
  color: string;
}

function Particle({ index, visible, startX, startY, color }: ParticleProps) {
  const angle = (index / PARTICLE_COUNT) * 2 * Math.PI;
  const distance = 30 + Math.random() * 20;
  const endX = startX + Math.cos(angle) * distance;
  const endY = startY + Math.sin(angle) * distance;

  const animatedStyle = useAnimatedStyle(() => {
    const progress = visible.value;
    const x = startX + (endX - startX) * progress;
    const y = startY + (endY - startY) * progress;
    const scaleVal = progress < 0.5 ? progress * 2 : 2 - progress * 2;
    const opacity = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;

    return {
      transform: [
        { translateX: x - 4 },
        { translateY: y - 4 },
        { scale: scaleVal * 0.8 },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

/**
 * Animated SRS level badge that shows level-up transitions.
 *
 * Level-up animation sequence (total ~500ms):
 * 1. OLD level shown for 200ms
 * 2. Badge scales 1.0 → 1.15 with glow effect
 * 3. Cross-fade to new level (300ms)
 * 4. Particle burst
 * 5. Scale back 1.15 → 1.0
 */
export function AnimatedSrsLevelBadge({
  stage,
  fromStage,
  animateLevelUp = false,
  onAnimationComplete,
  testID,
}: AnimatedSrsLevelBadgeProps) {
  const currentLevelInfo = getSrsLevelInfo(stage);
  const previousLevelInfo = fromStage ? getSrsLevelInfo(fromStage) : null;

  // Check if the level actually changed (not just the stage within the same level)
  const levelActuallyChanged =
    previousLevelInfo &&
    currentLevelInfo &&
    previousLevelInfo.key !== currentLevelInfo.key;

  const shouldAnimate = animateLevelUp && levelActuallyChanged;

  // Get colors for animation (use defaults for invalid stages to satisfy hooks)
  const currentColor = currentLevelInfo?.color ?? DEFAULT_COLOR;
  const previousColor = previousLevelInfo?.color ?? currentColor;

  // Shared values for animation
  const scale = useSharedValue(1);
  const crossfadeProgress = useSharedValue(shouldAnimate ? 0 : 1);
  const glowOpacity = useSharedValue(0);
  const particleProgress = useSharedValue(0);

  // Animation complete callback
  const handleAnimationComplete = useCallback(() => {
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  // Animated styles - must be called unconditionally before any early returns
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    shadowOpacity: glowOpacity.value,
  }));

  const oldLevelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - crossfadeProgress.value,
  }));

  const newLevelAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      crossfadeProgress.value,
      [0, 1],
      [previousColor, currentColor],
    );

    return {
      opacity: crossfadeProgress.value,
      backgroundColor,
    };
  });

  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      crossfadeProgress.value,
      [0, 1],
      [previousColor, currentColor],
    );

    return { backgroundColor };
  });

  // Generate particles for burst effect (must be before early return)
  const particles = useMemo(() =>
    shouldAnimate
      ? Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
          id: i,
          color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        }))
      : [],
    [shouldAnimate],
  );

  // Run the level-up animation
  useEffect(() => {
    if (!shouldAnimate) {
      // Reset to final state immediately
      scale.value = 1;
      crossfadeProgress.value = 1;
      glowOpacity.value = 0;
      particleProgress.value = 0;
      return;
    }

    // Animation sequence
    // 1. Show old level for 200ms (already showing at crossfadeProgress = 0)
    // 2. Scale up to 1.15 with glow
    scale.value = withDelay(
      INITIAL_DISPLAY_DURATION,
      withSequence(
        withTiming(1.15, {
          duration: SCALE_UP_DURATION,
          easing: Easing.out(Easing.cubic),
        }),
        // Hold scaled up during crossfade
        withDelay(
          CROSSFADE_DURATION,
          withTiming(1, {
            duration: SCALE_DOWN_DURATION,
            easing: Easing.out(Easing.cubic),
          }),
        ),
      ),
    );

    // Glow effect
    glowOpacity.value = withDelay(
      INITIAL_DISPLAY_DURATION,
      withSequence(
        withTiming(0.6, {
          duration: SCALE_UP_DURATION,
          easing: Easing.out(Easing.cubic),
        }),
        withDelay(
          CROSSFADE_DURATION,
          withTiming(0, {
            duration: SCALE_DOWN_DURATION,
            easing: Easing.out(Easing.cubic),
          }),
        ),
      ),
    );

    // 3. Cross-fade to new level
    crossfadeProgress.value = withDelay(
      INITIAL_DISPLAY_DURATION + SCALE_UP_DURATION * 0.5,
      withTiming(1, {
        duration: CROSSFADE_DURATION,
        easing: Easing.inOut(Easing.cubic),
      }),
    );

    // 4. Particle burst
    particleProgress.value = withDelay(
      INITIAL_DISPLAY_DURATION + SCALE_UP_DURATION,
      withTiming(1, {
        duration: CROSSFADE_DURATION,
        easing: Easing.out(Easing.cubic),
      }, (finished) => {
        if (finished) {
          runOnJS(handleAnimationComplete)();
        }
      }),
    );
  }, [
    shouldAnimate,
    scale,
    crossfadeProgress,
    glowOpacity,
    particleProgress,
    handleAnimationComplete,
  ]);

  // Don't render for invalid stages (after all hooks are called)
  if (!currentLevelInfo) {
    return null;
  }

  const currentIcon = LEVEL_ICONS[currentLevelInfo.key];
  const previousIcon = previousLevelInfo ? LEVEL_ICONS[previousLevelInfo.key] : currentIcon;

  return (
    <View style={styles.wrapper}>
      {/* Particles */}
      {particles.map(({ id, color }) => (
        <Particle
          key={id}
          index={id}
          visible={particleProgress}
          startX={40}
          startY={12}
          color={color}
        />
      ))}

      <Animated.View
        style={[containerAnimatedStyle]}
        testID={testID ?? 'animated-srs-level-badge'}
      >
        {/* Glow effect layer */}
        <Animated.View
          style={[
            styles.glowLayer,
            glowAnimatedStyle,
            { backgroundColor: currentLevelInfo.color },
          ]}
        />

        {/* Main badge container with animated background */}
        <Animated.View style={[styles.container, backgroundAnimatedStyle]}>
          {/* Old level content (fades out) */}
          {shouldAnimate && previousLevelInfo && (
            <Animated.View style={[styles.levelContent, oldLevelAnimatedStyle]}>
              <Text style={styles.icon} testID="srs-level-icon-old">
                {previousIcon}
              </Text>
              <Text style={styles.name} testID="srs-level-name-old">
                {previousLevelInfo.name}
              </Text>
            </Animated.View>
          )}

          {/* New level content (fades in or always visible) */}
          <Animated.View
            style={[
              styles.levelContent,
              shouldAnimate ? [styles.levelContentAbsolute, newLevelAnimatedStyle] : null,
            ]}
          >
            <Text style={styles.icon} testID="srs-level-icon">
              {currentIcon}
            </Text>
            <Text style={styles.name} testID="srs-level-name">
              {currentLevelInfo.name}
            </Text>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
    position: 'relative',
    overflow: 'hidden',
  },
  levelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  levelContentAbsolute: {
    position: 'absolute',
    left: SPACING.sm,
    right: SPACING.sm,
  },
  glowLayer: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: BORDER_RADIUS.md + 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.inverse,
  },
  name: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
