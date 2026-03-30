import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SPACING, FONT_SIZES } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../Button';
import { FlipCard } from './FlipCard';
import type { DictionaryVocab } from '../../types/dictionary';

export interface FlipCardSessionResult {
  correct: number;
  total: number;
}

export interface FlipCardEngineProps {
  items: DictionaryVocab[];
  onComplete: (result: FlipCardSessionResult) => void;
  testID?: string;
}

export function FlipCardEngine({
  items,
  onComplete,
  testID = 'flip-card-engine',
}: FlipCardEngineProps) {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  const dynamicStyles = useMemo(
    () => ({
      progress: {
        color: colors.text.secondary,
      },
    }),
    [colors],
  );

  const handleGrade = useCallback(
    (isCorrect: boolean) => {
      const newCorrect = isCorrect ? correct + 1 : correct;
      const newTotal = total + 1;

      if (currentIndex + 1 >= items.length) {
        onComplete({ correct: newCorrect, total: newTotal });
        return;
      }

      setCorrect(newCorrect);
      setTotal(newTotal);
      setCurrentIndex(prev => prev + 1);
    },
    [correct, total, currentIndex, items.length, onComplete],
  );

  const handleFinish = useCallback(() => {
    onComplete({ correct, total });
  }, [correct, total, onComplete]);

  const currentItem = items[currentIndex];

  if (!currentItem) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={[styles.progress, dynamicStyles.progress]} testID={`${testID}-progress`}>
          {currentIndex + 1} / {items.length}
        </Text>
        <Button
          label="Finish"
          onPress={handleFinish}
          variant="secondary"
          testID={`${testID}-finish`}
        />
      </View>

      <FlipCard
        key={currentIndex}
        item={currentItem}
        onGrade={handleGrade}
        testID={`${testID}-card`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  progress: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
});
