import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import {
  BORDER_RADIUS,
  FONT_SIZES,
  SPACING,
  SHADOW,
} from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../Button';
import type { DictionaryVocab } from '../../types/dictionary';

export interface FlipCardProps {
  item: DictionaryVocab;
  onGrade: (correct: boolean) => void;
  testID?: string;
}

export function FlipCard({ item, onGrade, testID = 'flip-card' }: FlipCardProps) {
  const { colors } = useTheme();
  const isFlipped = useSharedValue(0);

  const dynamicStyles = useMemo(
    () => ({
      card: {
        backgroundColor: colors.background.secondary,
      },
      characters: {
        color: colors.text.primary,
      },
      label: {
        color: colors.text.tertiary,
      },
      detail: {
        color: colors.text.primary,
      },
    }),
    [colors],
  );

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    opacity: isFlipped.value === 0 ? 1 : 0,
    backfaceVisibility: 'hidden',
    transform: [
      { rotateY: `${isFlipped.value * 180}deg` },
    ],
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    opacity: isFlipped.value === 0 ? 0 : 1,
    backfaceVisibility: 'hidden',
    transform: [
      { rotateY: `${180 + isFlipped.value * 180}deg` },
    ],
  }));

  const handleReveal = () => {
    isFlipped.value = withTiming(1, {
      duration: 400,
      easing: Easing.inOut(Easing.cubic),
    });
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Front face */}
      <Animated.View
        style={[styles.card, dynamicStyles.card, styles.cardFace, frontAnimatedStyle]}
        testID={`${testID}-front`}
      >
        <Text style={[styles.characters, dynamicStyles.characters]} testID={`${testID}-characters`}>
          {item.characters}
        </Text>
        <View style={styles.buttonContainer}>
          <Button
            label="Reveal"
            onPress={handleReveal}
            variant="primary"
            testID={`${testID}-reveal`}
          />
        </View>
      </Animated.View>

      {/* Back face */}
      <Animated.View
        style={[styles.card, dynamicStyles.card, styles.cardFace, styles.backFace, backAnimatedStyle]}
        testID={`${testID}-back`}
      >
        <Text style={[styles.characters, dynamicStyles.characters]}>
          {item.characters}
        </Text>
        <View style={styles.detailsContainer}>
          <Text style={[styles.label, dynamicStyles.label]}>Meaning</Text>
          <Text style={[styles.detail, dynamicStyles.detail]} testID={`${testID}-meaning`}>
            {item.meanings.join(', ')}
          </Text>
          <Text style={[styles.label, dynamicStyles.label, styles.readingLabel]}>Reading</Text>
          <Text style={[styles.detail, dynamicStyles.detail]} testID={`${testID}-reading`}>
            {item.readings.join(', ')}
          </Text>
        </View>
        <View style={styles.gradeButtons}>
          <Button
            label="Wrong"
            onPress={() => onGrade(false)}
            variant="danger"
            style={styles.gradeButton}
            testID={`${testID}-wrong`}
          />
          <Button
            label="Correct"
            onPress={() => onGrade(true)}
            variant="primary"
            style={styles.gradeButton}
            testID={`${testID}-correct`}
          />
        </View>
      </Animated.View>
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
    justifyContent: 'center',
    shadowColor: SHADOW.color,
    shadowOffset: SHADOW.offset,
    shadowOpacity: SHADOW.opacity,
    shadowRadius: SHADOW.radius,
    elevation: SHADOW.elevation,
  },
  cardFace: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
  },
  backFace: {
    // Back face starts hidden behind front
  },
  characters: {
    fontSize: FONT_SIZES.display,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: SPACING.lg,
  },
  detailsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  readingLabel: {
    marginTop: SPACING.md,
  },
  detail: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    textAlign: 'center',
  },
  gradeButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: SPACING.md,
  },
  gradeButton: {
    flex: 1,
  },
});
