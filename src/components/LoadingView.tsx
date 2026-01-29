import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { COLORS, SPACING, FONT_SIZES } from '../theme';

export interface LoadingViewProps {
  message?: string;
  testID?: string;
}

export function LoadingView({
  message = 'Loading...',
  testID = 'loading-view',
}: LoadingViewProps) {
  return (
    <View style={styles.container} testID={testID}>
      <ActivityIndicator
        size="large"
        color={COLORS.subject.vocabulary}
        testID={`${testID}-activity`}
      />
      <Text style={styles.message} testID={`${testID}-message`}>
        {message}
      </Text>
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
