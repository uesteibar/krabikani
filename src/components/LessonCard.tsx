import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { SubjectType, Meaning, Reading, KanjiReading } from '../api/types';
import { MnemonicText } from './MnemonicText';
import {
  getSubjectColor,
  COLORS,
  SHADOW,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
  MIN_TOUCH_TARGET,
} from '../theme';

export interface LessonCardProps {
  /** The subject type (radical, kanji, vocabulary, kana_vocabulary) */
  subjectType: SubjectType;
  /** The characters to display (e.g., "大", "たべる") - null for some radicals */
  characters: string | null;
  /** Array of meanings for the subject */
  meanings: Meaning[];
  /** Array of readings (null for radicals) */
  readings: Reading[] | KanjiReading[] | null;
  /** Mnemonic for remembering the meaning */
  meaningMnemonic: string;
  /** Mnemonic for remembering the reading (null for radicals) */
  readingMnemonic: string | null;
  /** Callback when Next button is pressed */
  onNext: () => void;
  /** Optional callback when Back button is pressed (hides button if not provided) */
  onBack?: () => void;
}

/**
 * Get the primary meaning from the meanings array.
 */
function getPrimaryMeaning(meanings: Meaning[]): string {
  const primary = meanings.find(m => m.primary);
  return primary?.meaning ?? meanings[0]?.meaning ?? '';
}

/**
 * Get the primary reading from the readings array.
 */
function getPrimaryReading(
  readings: Reading[] | KanjiReading[] | null,
): string {
  if (!readings || readings.length === 0) return '';
  const primary = readings.find(r => r.primary);
  return primary?.reading ?? readings[0]?.reading ?? '';
}

/**
 * Get all accepted meanings (excluding non-accepted).
 */
function getAcceptedMeanings(meanings: Meaning[]): string[] {
  return meanings.filter(m => m.accepted_answer).map(m => m.meaning);
}

/**
 * Get all accepted readings.
 */
function getAcceptedReadings(
  readings: Reading[] | KanjiReading[] | null,
): string[] {
  if (!readings) return [];
  return readings.filter(r => r.accepted_answer).map(r => r.reading);
}

/**
 * LessonCard displays a single lesson item with its details.
 * Shows characters prominently, along with meanings, readings, and mnemonics.
 */
export function LessonCard({
  subjectType,
  characters,
  meanings,
  readings,
  meaningMnemonic,
  readingMnemonic,
  onNext,
  onBack,
}: LessonCardProps) {
  const backgroundColor = getSubjectColor(subjectType);
  const primaryMeaning = getPrimaryMeaning(meanings);
  const primaryReading = getPrimaryReading(readings);
  const acceptedMeanings = getAcceptedMeanings(meanings);
  const acceptedReadings = getAcceptedReadings(readings);
  const hasReading = subjectType !== 'radical';

  return (
    <View style={styles.container} testID="lesson-card">
      {/* Header with characters */}
      <View style={[styles.header, { backgroundColor }]} testID="lesson-card-header">
        <Text style={styles.characters} testID="lesson-card-characters">
          {characters ?? '?'}
        </Text>
        <Text style={styles.subjectType} testID="lesson-card-type">
          {subjectType.replace('_', ' ')}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}>
        {/* Meaning section */}
        <View style={styles.section} testID="lesson-card-meaning-section">
          <Text style={styles.sectionTitle}>Meaning</Text>
          <Text style={styles.primaryText} testID="lesson-card-primary-meaning">
            {primaryMeaning}
          </Text>
          {acceptedMeanings.length > 1 && (
            <Text style={styles.secondaryText} testID="lesson-card-other-meanings">
              Also: {acceptedMeanings.filter(m => m !== primaryMeaning).join(', ')}
            </Text>
          )}
        </View>

        {/* Reading section (only for kanji and vocabulary) */}
        {hasReading && (
          <View style={styles.section} testID="lesson-card-reading-section">
            <Text style={styles.sectionTitle}>Reading</Text>
            <Text style={styles.primaryText} testID="lesson-card-primary-reading">
              {primaryReading}
            </Text>
            {acceptedReadings.length > 1 && (
              <Text style={styles.secondaryText} testID="lesson-card-other-readings">
                Also: {acceptedReadings.filter(r => r !== primaryReading).join(', ')}
              </Text>
            )}
          </View>
        )}

        {/* Meaning mnemonic section */}
        <View style={styles.section} testID="lesson-card-meaning-mnemonic-section">
          <Text style={styles.sectionTitle}>Meaning Mnemonic</Text>
          <MnemonicText
            text={meaningMnemonic}
            style={styles.mnemonicText}
            testID="lesson-card-meaning-mnemonic"
          />
        </View>

        {/* Reading mnemonic section (only for kanji and vocabulary) */}
        {hasReading && readingMnemonic && (
          <View style={styles.section} testID="lesson-card-reading-mnemonic-section">
            <Text style={styles.sectionTitle}>Reading Mnemonic</Text>
            <MnemonicText
              text={readingMnemonic}
              style={styles.mnemonicText}
              testID="lesson-card-reading-mnemonic"
            />
          </View>
        )}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.footer} testID="lesson-card-footer">
        {onBack ? (
          <TouchableOpacity
            style={[styles.backButton, { borderColor: backgroundColor }]}
            onPress={onBack}
            activeOpacity={0.8}
            testID="lesson-card-back-button">
            <Text style={[styles.backButtonText, { color: backgroundColor }]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonSpacer} />
        )}
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor }]}
          onPress={onNext}
          activeOpacity={0.8}
          testID="lesson-card-next-button">
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characters: {
    fontSize: FONT_SIZES.display,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
    textAlign: 'center',
  },
  subjectType: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: SPACING.sm,
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  primaryText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  secondaryText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  mnemonicText: {
    fontSize: FONT_SIZES.base,
    lineHeight: FONT_SIZES.xxl,
    color: COLORS.text.primary,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  buttonSpacer: {
    flex: 1,
  },
  backButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: COLORS.background.primary,
  },
  backButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  nextButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for elevation
    shadowColor: SHADOW.color,
    shadowOffset: SHADOW.offset,
    shadowOpacity: SHADOW.opacity,
    shadowRadius: SHADOW.radius,
    elevation: SHADOW.elevation,
  },
  nextButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
});
