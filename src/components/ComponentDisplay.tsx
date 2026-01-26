import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, type ViewStyle } from 'react-native';

import { RadicalImage } from './RadicalImage';
import {
  SUBJECT_COLORS,
  COLORS,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
} from '../theme';

export interface ComponentDisplayProps {
  /** The subject type (radical or kanji) */
  subjectType: 'radical' | 'kanji';
  /** Characters to display (null for image-only radicals) */
  characters: string | null;
  /** Primary meaning of the component */
  meaning: string;
  /** JSON string of character images (for radicals without Unicode characters) */
  characterImages?: string | null;
  /** Additional text to display instead of meaning (e.g., reading for vocabulary components) */
  displayText?: string;
  /** Callback when the component is pressed */
  onPress?: () => void;
  /** Test ID for testing */
  testID?: string;
  /** Additional style for the container */
  style?: ViewStyle;
}

/**
 * ComponentDisplay renders a single radical or kanji component item
 * with its character (or image) and meaning/reading.
 * Used on incorrect answer screens to show component radicals/kanji.
 */
export function ComponentDisplay({
  subjectType,
  characters,
  meaning,
  characterImages,
  displayText,
  onPress,
  testID,
  style,
}: ComponentDisplayProps) {
  const backgroundColor = SUBJECT_COLORS[subjectType];
  const textToDisplay = displayText ?? meaning;

  // Use RadicalImage for radicals without Unicode characters
  // When characters is null, always use RadicalImage which gracefully falls back to meaning text
  const shouldShowImage = characters === null;

  const content = (
    <>
      {shouldShowImage ? (
        <RadicalImage
          characterImages={characterImages ?? null}
          fallbackText={meaning}
          size={FONT_SIZES.xxl}
          testID={testID ? `${testID}-image` : undefined}
        />
      ) : (
        <Text
          style={styles.character}
          testID={testID ? `${testID}-character` : undefined}
        >
          {characters}
        </Text>
      )}
      <Text
        style={styles.text}
        testID={testID ? `${testID}-text` : undefined}
        numberOfLines={2}
      >
        {textToDisplay}
      </Text>
    </>
  );

  // If onPress is provided, wrap in TouchableOpacity for tappable navigation
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor }, style]}
        testID={testID}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor }, style]}
      testID={testID}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minWidth: 60,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  character: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
  text: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});
