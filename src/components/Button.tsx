import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  COLORS,
  FONT_SIZES,
  MIN_TOUCH_TARGET,
  SPACING,
  BORDER_RADIUS,
  SHADOW,
} from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  testID,
  style,
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyles[variant],
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      testID={testID}
    >
      <Text style={[styles.baseText, variantTextStyles[variant]]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    fontWeight: 'bold',
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: COLORS.neutral.gray600,
    shadowColor: SHADOW.color,
    shadowOffset: SHADOW.offset,
    shadowOpacity: SHADOW.opacity,
    shadowRadius: SHADOW.radius,
    elevation: SHADOW.elevation,
  },
  secondary: {
    backgroundColor: COLORS.neutral.gray100,
    borderWidth: 2,
    borderColor: COLORS.neutral.gray400,
  },
  danger: {
    backgroundColor: COLORS.feedback.incorrect,
    shadowColor: SHADOW.color,
    shadowOffset: SHADOW.offset,
    shadowOpacity: SHADOW.opacity,
    shadowRadius: SHADOW.radius,
    elevation: SHADOW.elevation,
  },
});

const variantTextStyles = StyleSheet.create({
  primary: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.inverse,
  },
  secondary: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
  },
  danger: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.inverse,
  },
});
