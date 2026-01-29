import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../theme';

export type QuestionTypeLabelType = 'meaning' | 'reading' | 'kanji';

export interface QuestionTypeLabelProps {
  type: QuestionTypeLabelType;
  testID?: string;
}

const LABEL_MAP: Record<QuestionTypeLabelType, string> = {
  meaning: 'MEANING',
  reading: 'READING',
  kanji: 'KANJI',
};

export const QuestionTypeLabel: React.FC<QuestionTypeLabelProps> = ({
  type,
  testID,
}) => {
  const isReading = type === 'reading';

  return (
    <View
      style={[
        styles.container,
        isReading ? styles.containerReading : styles.containerDefault,
      ]}
      testID="question-type-label-container"
    >
      <Text
        style={[styles.label, isReading && styles.labelReading]}
        testID={testID}
      >
        {LABEL_MAP[type]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center' as const,
  },
  containerDefault: {
    backgroundColor: COLORS.neutral.white,
  },
  containerReading: {
    backgroundColor: COLORS.neutral.black,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text.tertiary,
    letterSpacing: 2,
  },
  labelReading: {
    color: COLORS.text.inverse,
  },
});
