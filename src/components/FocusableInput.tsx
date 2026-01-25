/**
 * FocusableInput component with high contrast and clear focus states.
 * Enhanced TextInput with visual feedback when focused.
 */

import React, { useState, forwardRef, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';

import { COLORS, BORDER_RADIUS, SPACING, FONT_SIZES } from '../theme';

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
      focusColor = COLORS.subject.kanji,
      unfocusColor = COLORS.border.medium,
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

    const borderColor = isFocused ? focusColor : unfocusColor;
    const borderWidth = isFocused ? 3 : 2;

    return (
      <View
        style={[
          styles.container,
          isFocused && showGlow && [
            styles.focusedContainer,
            { shadowColor: focusColor },
          ],
          containerStyle,
        ]}
        testID={containerTestID}
      >
        <TextInput
          ref={ref}
          style={[
            styles.input,
            {
              borderColor,
              borderWidth,
            },
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={COLORS.text.placeholder}
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
    backgroundColor: COLORS.background.input,
    color: COLORS.text.primary,
  },
});
