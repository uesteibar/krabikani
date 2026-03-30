import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  BORDER_RADIUS,
  FONT_SIZES,
  SPACING,
  SHADOW,
} from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';

export interface SessionResultsProps {
  correct: number;
  total: number;
  onDone: () => void;
  testID?: string;
}

export function SessionResults({
  correct,
  total,
  onDone,
  testID = 'session-results',
}: SessionResultsProps) {
  const { colors } = useTheme();

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  const dynamicStyles = useMemo(
    () => ({
      container: {
        backgroundColor: colors.background.primary,
      },
      card: {
        backgroundColor: colors.background.secondary,
      },
      percentage: {
        color: colors.text.primary,
      },
      label: {
        color: colors.text.tertiary,
      },
      value: {
        color: colors.text.primary,
      },
      divider: {
        backgroundColor: colors.border.light,
      },
    }),
    [colors],
  );

  return (
    <View style={[styles.container, dynamicStyles.container]} testID={testID}>
      <View style={[styles.card, dynamicStyles.card]}>
        <Text style={[styles.percentage, dynamicStyles.percentage]} testID={`${testID}-percentage`}>
          {percentage}%
        </Text>

        <View style={[styles.divider, dynamicStyles.divider]} />

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, dynamicStyles.value]} testID={`${testID}-correct`}>
              {correct}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.label]}>Correct</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, dynamicStyles.value]} testID={`${testID}-total`}>
              {total}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.label]}>Total</Text>
          </View>
        </View>
      </View>

      <Button
        label="Done"
        onPress={onDone}
        variant="primary"
        style={styles.doneButton}
        testID={`${testID}-done`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  card: {
    width: '100%',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xxl,
    alignItems: 'center',
    shadowColor: SHADOW.color,
    shadowOffset: SHADOW.offset,
    shadowOpacity: SHADOW.opacity,
    shadowRadius: SHADOW.radius,
    elevation: SHADOW.elevation,
  },
  percentage: {
    fontSize: FONT_SIZES.display,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.xs,
  },
  doneButton: {
    width: '100%',
    marginTop: SPACING.xxl,
  },
});
