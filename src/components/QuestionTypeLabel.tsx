import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, SPACING, useTheme } from '../theme';

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
  const { colors } = useTheme();
  const isReading = type === 'reading';

  return (
    <View
      style={[
        styles.container,
        isReading
          ? styles.containerReading
          : { backgroundColor: colors.background.primary },
      ]}
      testID="question-type-label-container"
    >
      <Text
        style={[
          styles.label,
          { color: isReading ? COLORS.text.inverse : colors.text.tertiary },
        ]}
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
  containerReading: {
    backgroundColor: COLORS.neutral.black,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
