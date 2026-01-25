import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { SubjectType, Meaning, Reading, KanjiReading } from '../api/types';

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
}

/**
 * Get the background color based on subject type.
 * Uses WaniKani-inspired colors:
 * - Pink/magenta for radicals
 * - Purple for kanji
 * - Blue for vocabulary
 */
function getSubjectColor(subjectType: SubjectType): string {
  switch (subjectType) {
    case 'radical':
      return '#00aaff'; // WaniKani blue for radicals
    case 'kanji':
      return '#e8a4c9'; // Pink for kanji
    case 'vocabulary':
    case 'kana_vocabulary':
      return '#8f5bc4'; // Purple for vocabulary
    default:
      return '#888';
  }
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
          <Text style={styles.mnemonicText} testID="lesson-card-meaning-mnemonic">
            {meaningMnemonic}
          </Text>
        </View>

        {/* Reading mnemonic section (only for kanji and vocabulary) */}
        {hasReading && readingMnemonic && (
          <View style={styles.section} testID="lesson-card-reading-mnemonic-section">
            <Text style={styles.sectionTitle}>Reading Mnemonic</Text>
            <Text style={styles.mnemonicText} testID="lesson-card-reading-mnemonic">
              {readingMnemonic}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Next button */}
      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor }]}
        onPress={onNext}
        activeOpacity={0.8}
        testID="lesson-card-next-button">
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characters: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subjectType: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  primaryText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  secondaryText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  mnemonicText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },
  nextButton: {
    margin: 16,
    marginTop: 0,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
