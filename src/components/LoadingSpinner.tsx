import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { COLORS, SPACING, FONT_SIZES } from '../theme';

export interface LoadingSpinnerProps {
  /** Optional message to display below the spinner */
  message?: string;
  /** Size of the spinner (default: 'large') */
  size?: 'small' | 'large';
  /** Custom color for the spinner (defaults to theme color) */
  color?: string;
  /** Test ID for testing */
  testID?: string;
}

/**
 * A reusable loading spinner component with optional message.
 * Provides consistent loading state UI across the app.
 */
export function LoadingSpinner({
  message,
  size = 'large',
  color = COLORS.subject.vocabulary,
  testID = 'loading-spinner',
}: LoadingSpinnerProps) {
  return (
    <View style={styles.container} testID={testID}>
      <ActivityIndicator size={size} color={color} testID={`${testID}-activity`} />
      {message && (
        <Text style={styles.message} testID={`${testID}-message`}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  message: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});
