import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, useTheme } from '../theme';

export interface ExpandableDetailsProps {
  /** Unique key to reset expanded state (e.g., item ID or question key) */
  resetKey?: string;
  /** Children to render in the expandable content area */
  children: React.ReactNode;
  /** Test ID for the component */
  testID?: string;
}

// Animation timing constants
const CHEVRON_ROTATION_DURATION = 200;
const CONTENT_HEIGHT_DURATION = 250;

/**
 * Expandable details component with animated chevron and height reveal.
 *
 * Features:
 * - Toggle button with "Show full details" / "Hide details" text
 * - Chevron icon rotates 180° smoothly on toggle
 * - Content reveals with height animation
 * - Default state is collapsed
 * - Resets to collapsed when resetKey changes
 */
export function ExpandableDetails({
  resetKey,
  children,
  testID,
}: ExpandableDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  // Shared values for animation
  const chevronRotation = useSharedValue(0);
  const heightProgress = useSharedValue(0);

  // Reset expanded state when resetKey changes
  useEffect(() => {
    setIsExpanded(false);
    chevronRotation.value = 0;
    heightProgress.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Handle toggle press
  const handleToggle = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    // Animate chevron rotation (0 → 180 when expanding, 180 → 0 when collapsing)
    chevronRotation.value = withTiming(newExpanded ? 180 : 0, {
      duration: CHEVRON_ROTATION_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    // Animate content height
    heightProgress.value = withTiming(newExpanded ? 1 : 0, {
      duration: CONTENT_HEIGHT_DURATION,
      easing: Easing.out(Easing.poly(4)), // ease-out-quart
    });
  }, [isExpanded, chevronRotation, heightProgress]);

  // Measure content height
  const handleContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height > 0 && height !== contentHeight) {
        setContentHeight(height);
      }
    },
    [contentHeight],
  );

  // Animated styles
  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => {
    const height = contentHeight * heightProgress.value;
    const opacity = heightProgress.value;

    return {
      height,
      opacity,
      overflow: 'hidden' as const,
    };
  });

  const { colors } = useTheme();

  return (
    <View style={styles.container} testID={testID ?? 'expandable-details'}>
      {/* Toggle button */}
      <TouchableOpacity
        style={[styles.toggleButton, { backgroundColor: colors.background.secondary }]}
        onPress={handleToggle}
        activeOpacity={0.7}
        testID={testID ? `${testID}-toggle` : 'expandable-details-toggle'}
      >
        <Text style={[styles.toggleText, { color: colors.text.secondary }]}>
          {isExpanded ? 'Hide details' : 'Show full details'}
        </Text>
        <Animated.View
          style={chevronAnimatedStyle}
          testID={testID ? `${testID}-chevron` : 'expandable-details-chevron'}
        >
          <MaterialDesignIcons
            name="chevron-down"
            size={FONT_SIZES.base}
            color={colors.text.secondary}
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Animated content container */}
      <Animated.View
        style={[styles.contentContainer, contentAnimatedStyle]}
        testID={testID ? `${testID}-content` : 'expandable-details-content'}
      >
        {/* Hidden measurement view */}
        <View style={styles.measureContainer} onLayout={handleContentLayout}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  toggleText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },

  contentContainer: {
    marginTop: SPACING.md,
  },
  measureContainer: {
    position: 'absolute',
    width: '100%',
  },
});
