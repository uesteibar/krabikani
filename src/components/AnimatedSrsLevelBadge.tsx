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
  SharedValue,
} from 'react-native-reanimated';

import { getSrsLevelInfo, SRS_LEVELS, FONT_SIZES } from '../theme';

export interface AnimatedSrsLevelBadgeProps {
  /** Current SRS stage (1-9) */
  stage: number;
  /** Previous SRS stage for animation (optional - only animate if different level) */
  fromStage?: number;
  /** Whether to show the level-up animation */
  animateLevelUp?: boolean;
  /** Whether to show the level-down animation */
  animateLevelDown?: boolean;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  testID?: string;
}

// Default fallback color for invalid stages
const DEFAULT_COLOR = SRS_LEVELS.apprentice.color;

// Animation timing constants - Level Up
const INITIAL_DISPLAY_DURATION = 200;
const SCALE_UP_DURATION = 150;
const CROSSFADE_DURATION = 300;
const SCALE_DOWN_DURATION = 150;

// Animation timing constants - Level Down
const LEVEL_DOWN_INITIAL_DISPLAY = 200;
const LEVEL_DOWN_SHAKE_DURATION = 50; // Duration per shake oscillation
const LEVEL_DOWN_SHAKE_COUNT = 3; // Number of full shake cycles
const LEVEL_DOWN_CROSSFADE_DURATION = 250;

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
      style={[styles.particle, { backgroundColor: color }, animatedStyle]}
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
  animateLevelDown = false,
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

  const shouldAnimateLevelUp = animateLevelUp && levelActuallyChanged;
  const shouldAnimateLevelDown = animateLevelDown && levelActuallyChanged;

  // Determine if any animation should play
  const shouldAnimate = shouldAnimateLevelUp || shouldAnimateLevelDown;

  // Shared values for animation
  const scale = useSharedValue(1);
  const crossfadeProgress = useSharedValue(shouldAnimate ? 0 : 1);
  const particleProgress = useSharedValue(0);
  // Level-down specific shared values
  const shakeOffset = useSharedValue(0);

  // Animation complete callback
  const handleAnimationComplete = useCallback(() => {
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  // Animated styles - must be called unconditionally before any early returns
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shakeOffset.value }],
  }));

  const oldLevelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - crossfadeProgress.value,
  }));

  const newLevelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: crossfadeProgress.value,
  }));

  // Generate particles for burst effect (only for level-up, must be before early return)
  const particles = useMemo(
    () =>
      shouldAnimateLevelUp
        ? Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
            id: i,
            color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
          }))
        : [],
    [shouldAnimateLevelUp],
  );

  // Run the level-up animation
  useEffect(() => {
    if (!shouldAnimateLevelUp) {
      return;
    }

    // Reset level-down values
    shakeOffset.value = 0;

    // Animation sequence
    // 1. Show old level for 200ms (already showing at crossfadeProgress = 0)
    // 2. Scale up to 1.15
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
      withTiming(
        1,
        {
          duration: CROSSFADE_DURATION,
          easing: Easing.out(Easing.cubic),
        },
        finished => {
          if (finished) {
            runOnJS(handleAnimationComplete)();
          }
        },
      ),
    );
  }, [
    shouldAnimateLevelUp,
    scale,
    crossfadeProgress,
    particleProgress,
    shakeOffset,
    handleAnimationComplete,
  ]);

  // Run the level-down animation
  useEffect(() => {
    if (!shouldAnimateLevelDown) {
      return;
    }

    // Reset level-up values
    scale.value = 1;
    particleProgress.value = 0;

    // Total shake duration
    const totalShakeDuration =
      LEVEL_DOWN_SHAKE_DURATION * LEVEL_DOWN_SHAKE_COUNT * 2;

    // 1. Show old level for initial display period, then shake
    // Shake: oscillate left-right 3 times (each cycle = left + right)
    shakeOffset.value = withDelay(
      LEVEL_DOWN_INITIAL_DISPLAY,
      withSequence(
        // Shake cycle 1
        withTiming(8, {
          duration: LEVEL_DOWN_SHAKE_DURATION,
          easing: Easing.linear,
        }),
        withTiming(-8, {
          duration: LEVEL_DOWN_SHAKE_DURATION,
          easing: Easing.linear,
        }),
        // Shake cycle 2
        withTiming(8, {
          duration: LEVEL_DOWN_SHAKE_DURATION,
          easing: Easing.linear,
        }),
        withTiming(-8, {
          duration: LEVEL_DOWN_SHAKE_DURATION,
          easing: Easing.linear,
        }),
        // Shake cycle 3
        withTiming(6, {
          duration: LEVEL_DOWN_SHAKE_DURATION,
          easing: Easing.linear,
        }),
        withTiming(0, {
          duration: LEVEL_DOWN_SHAKE_DURATION,
          easing: Easing.out(Easing.cubic),
        }),
      ),
    );

    // 2. Cross-fade to new level after shake completes
    crossfadeProgress.value = withDelay(
      LEVEL_DOWN_INITIAL_DISPLAY + totalShakeDuration,
      withTiming(
        1,
        {
          duration: LEVEL_DOWN_CROSSFADE_DURATION,
          easing: Easing.out(Easing.poly(4)),
        },
        finished => {
          if (finished) {
            runOnJS(handleAnimationComplete)();
          }
        },
      ),
    );
  }, [
    shouldAnimateLevelDown,
    shakeOffset,
    crossfadeProgress,
    scale,
    particleProgress,
    handleAnimationComplete,
  ]);

  // Reset to final state when not animating
  useEffect(() => {
    if (!shouldAnimate) {
      scale.value = 1;
      crossfadeProgress.value = 1;
      particleProgress.value = 0;
      shakeOffset.value = 0;
    }
  }, [shouldAnimate, scale, crossfadeProgress, particleProgress, shakeOffset]);

  // Don't render for invalid stages (after all hooks are called)
  if (!currentLevelInfo) {
    return null;
  }

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
        style={[styles.container, containerAnimatedStyle]}
        testID={testID ?? 'animated-srs-level-badge'}
      >
        {/* During animation, render both texts right-aligned with crossfade */}
        {shouldAnimate && previousLevelInfo ? (
          <View style={styles.animationContainer}>
            {/* Old level content (fades out) */}
            <Animated.Text
              style={[styles.name, oldLevelAnimatedStyle]}
              testID="srs-level-name-old"
            >
              {previousLevelInfo.name}
            </Animated.Text>
            {/* New level content (fades in) - positioned absolutely, right-aligned */}
            <Animated.Text
              style={[styles.name, styles.nameAbsolute, newLevelAnimatedStyle]}
              testID="srs-level-name"
            >
              {currentLevelInfo.name}
            </Animated.Text>
          </View>
        ) : (
          <Text style={styles.name} testID="srs-level-name">
            {currentLevelInfo.name}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  container: {
    alignItems: 'flex-end',
  },
  animationContainer: {
    position: 'relative',
    alignItems: 'flex-end',
    // Min width to fit "ENLIGHTENED" (longest level name) without wrapping
    minWidth: 80,
  },
  name: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
  },
  nameAbsolute: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
