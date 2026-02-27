/**
 * FocusableInput component with high contrast and clear focus states.
 * Enhanced TextInput with visual feedback when focused.
 */

import React, { useState, forwardRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';

import { BORDER_RADIUS, SPACING, FONT_SIZES } from '../theme';
import { useTheme } from '../theme/ThemeContext';

// ============================================
// Types
// ============================================

export interface FocusableInputProps extends Omit<TextInputProps, 'style'> {
  /** Border color when focused (default: subject type color or primary) */
  focusColor?: string;
  /** Border color when not focused (default: gray) */
  unfocusColor?: string;
  /** Whether to show the glow effect when focused (default: true) */
  showGlow?: boolean;
  /** Additional container style */
  containerStyle?: StyleProp<ViewStyle>;
  /** Test ID for the container */
  containerTestID?: string;
}

// ============================================
// Component
// ============================================

/**
 * FocusableInput is an enhanced TextInput with high contrast and clear focus states.
 *
 * Features:
 * - Thicker border when focused
 * - Subtle glow/shadow effect when focused
 * - Smooth transition between states
 * - High contrast for accessibility
 */
export const FocusableInput = forwardRef<TextInput, FocusableInputProps>(
  function FocusableInput(
    {
      focusColor,
      unfocusColor,
      showGlow = true,
      containerStyle,
      containerTestID,
      onFocus: _onFocus,
      onBlur: _onBlur,
      ...textInputProps
    },
    ref,
  ) {
    const [isFocused, setIsFocused] = useState(false);
    const { colors } = useTheme();

    // Use theme colors with fallbacks for focus/unfocus colors
    const effectiveFocusColor = focusColor ?? colors.subject.kanji;
    const effectiveUnfocusColor = unfocusColor ?? colors.border.medium;

    const handleFocus = useCallback(
      () => {
        setIsFocused(true);
      },
      [],
    );

    const handleBlur = useCallback(
      () => {
        setIsFocused(false);
      },
      [],
    );

    const borderColor = isFocused ? effectiveFocusColor : effectiveUnfocusColor;
    const borderWidth = isFocused ? 3 : 2;

    // Dynamic styles based on theme
    const dynamicStyles = useMemo(
      () => ({
        input: {
          backgroundColor: colors.background.input,
          color: colors.text.primary,
        },
      }),
      [colors],
    );

    return (
      <View
        style={[
          styles.container,
          isFocused && showGlow && [
            styles.focusedContainer,
            { shadowColor: effectiveFocusColor },
          ],
          containerStyle,
        ]}
        testID={containerTestID}
      >
        <TextInput
          ref={ref}
          style={[
            styles.input,
            dynamicStyles.input,
            {
              borderColor,
              borderWidth,
            },
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.text.placeholder}
          cursorColor={colors.text.primary}
          {...textInputProps}
        />
      </View>
    );
  },
);

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.md + 2, // Slightly larger to accommodate glow
  },
  focusedContainer: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  input: {
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    fontSize: FONT_SIZES.lg,
    textAlign: 'center',
    // backgroundColor and color are now applied via dynamicStyles
  },
});
