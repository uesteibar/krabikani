import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Meaning, Reading, KanjiReading, SubjectType } from '../api/types';
import { MnemonicText } from './MnemonicText';
import { ComponentDisplay } from './ComponentDisplay';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../theme';
import type { ReviewComponentRadical, ReviewComponentKanji } from './ReviewSession';

export interface ItemDetailsProps {
  /** The subject type of the item */
  subjectType: SubjectType;
  /** Array of meanings for the subject */
  meanings: Meaning[];
  /** Array of readings (null for radicals) */
  readings: Reading[] | KanjiReading[] | null;
  /** Mnemonic for remembering the meaning */
  meaningMnemonic: string;
  /** Mnemonic for remembering the reading (null for radicals) */
  readingMnemonic: string | null;
  /** Component radicals for kanji items (optional) */
  componentRadicals?: ReviewComponentRadical[];
  /** Component kanji for vocabulary items (optional) */
  componentKanji?: ReviewComponentKanji[];
  /** Test ID for the component */
  testID?: string;
}

/**
 * Format reading type for display
 */
function formatReadingType(type: string): string {
  switch (type) {
    case 'onyomi':
      return "On'yomi";
    case 'kunyomi':
      return "Kun'yomi";
    case 'nanori':
      return 'Nanori';
    default:
      return type;
  }
}

/**
 * Group kanji readings by type
 */
function groupReadingsByType(readings: KanjiReading[]): Record<string, KanjiReading[]> {
  const groups: Record<string, KanjiReading[]> = {};
  for (const reading of readings) {
    if (!groups[reading.type]) {
      groups[reading.type] = [];
    }
    groups[reading.type].push(reading);
  }
  return groups;
}

/**
 * ItemDetails displays full item information in organized sections.
 *
 * Sections included:
 * - Meanings: all meanings with primary bolded
 * - Readings: all readings with types (on'yomi, kun'yomi for kanji)
 * - Meaning Mnemonic: formatted mnemonic text
 * - Reading Mnemonic: if applicable (kanji, vocabulary)
 * - Components: radicals (for kanji) or kanji (for vocabulary)
 */
export function ItemDetails({
  subjectType,
  meanings,
  readings,
  meaningMnemonic,
  readingMnemonic,
  componentRadicals,
  componentKanji,
  testID,
}: ItemDetailsProps) {
  const hasReadings = readings && readings.length > 0;
  const hasComponents =
    (componentRadicals && componentRadicals.length > 0) ||
    (componentKanji && componentKanji.length > 0);

  return (
    <View style={styles.container} testID={testID ?? 'item-details'}>
      {/* Meanings Section */}
      <View style={styles.section} testID={testID ? `${testID}-meanings` : 'item-details-meanings'}>
        <Text style={styles.sectionTitle}>Meanings</Text>
        <View style={styles.meaningsList}>
          {meanings.map((meaning, index) => (
            <Text
              key={index}
              style={[
                styles.meaningText,
                meaning.primary && styles.primaryMeaning,
              ]}
              testID={testID ? `${testID}-meaning-${index}` : `item-details-meaning-${index}`}
            >
              {meaning.meaning}
              {meaning.primary && <Text style={styles.primaryLabel}> (primary)</Text>}
            </Text>
          ))}
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Readings Section */}
      {hasReadings && (
        <>
          <View style={styles.section} testID={testID ? `${testID}-readings` : 'item-details-readings'}>
            <Text style={styles.sectionTitle}>Readings</Text>
            {subjectType === 'kanji' ? (
              // Kanji readings grouped by type
              renderKanjiReadings(readings as KanjiReading[], testID)
            ) : (
              // Vocabulary readings (simple list)
              <View style={styles.readingsList}>
                {(readings as Reading[]).map((reading, index) => (
                  <Text
                    key={index}
                    style={[
                      styles.readingText,
                      reading.primary && styles.primaryReading,
                    ]}
                    testID={testID ? `${testID}-reading-${index}` : `item-details-reading-${index}`}
                  >
                    {reading.reading}
                    {reading.primary && <Text style={styles.primaryLabel}> (primary)</Text>}
                  </Text>
                ))}
              </View>
            )}
          </View>
          <View style={styles.divider} />
        </>
      )}

      {/* Meaning Mnemonic Section */}
      <View style={styles.section} testID={testID ? `${testID}-meaning-mnemonic` : 'item-details-meaning-mnemonic'}>
        <Text style={styles.sectionTitle}>Meaning Mnemonic</Text>
        <MnemonicText
          text={meaningMnemonic}
          style={styles.mnemonicText}
          testID={testID ? `${testID}-meaning-mnemonic-text` : 'item-details-meaning-mnemonic-text'}
        />
      </View>

      {/* Reading Mnemonic Section (if applicable) */}
      {readingMnemonic && (
        <>
          <View style={styles.divider} />
          <View style={styles.section} testID={testID ? `${testID}-reading-mnemonic` : 'item-details-reading-mnemonic'}>
            <Text style={styles.sectionTitle}>Reading Mnemonic</Text>
            <MnemonicText
              text={readingMnemonic}
              style={styles.mnemonicText}
              testID={testID ? `${testID}-reading-mnemonic-text` : 'item-details-reading-mnemonic-text'}
            />
          </View>
        </>
      )}

      {/* Components Section */}
      {hasComponents && (
        <>
          <View style={styles.divider} />
          <View style={styles.section} testID={testID ? `${testID}-components` : 'item-details-components'}>
            <Text style={styles.sectionTitle}>
              {subjectType === 'kanji' ? 'Component Radicals' : 'Component Kanji'}
            </Text>
            <View style={styles.componentsRow}>
              {componentRadicals?.map(radical => (
                <ComponentDisplay
                  key={radical.id}
                  subjectType="radical"
                  characters={radical.characters}
                  meaning={radical.meaning}
                  characterImages={radical.characterImages}
                  testID={testID ? `${testID}-component-${radical.id}` : `item-details-component-${radical.id}`}
                />
              ))}
              {componentKanji?.map(kanji => (
                <ComponentDisplay
                  key={kanji.id}
                  subjectType="kanji"
                  characters={kanji.characters}
                  meaning={kanji.meaning}
                  testID={testID ? `${testID}-component-${kanji.id}` : `item-details-component-${kanji.id}`}
                />
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

/**
 * Render kanji readings grouped by type
 */
function renderKanjiReadings(readings: KanjiReading[], testID?: string) {
  const groupedReadings = groupReadingsByType(readings);
  const types = ['onyomi', 'kunyomi', 'nanori'] as const;

  return (
    <View style={styles.kanjiReadingsContainer}>
      {types.map(type => {
        const typeReadings = groupedReadings[type];
        if (!typeReadings || typeReadings.length === 0) return null;

        return (
          <View
            key={type}
            style={styles.readingTypeGroup}
            testID={testID ? `${testID}-readings-${type}` : `item-details-readings-${type}`}
          >
            <Text style={styles.readingTypeLabel}>{formatReadingType(type)}</Text>
            <View style={styles.readingsList}>
              {typeReadings.map((reading, index) => (
                <Text
                  key={index}
                  style={[
                    styles.readingText,
                    reading.primary && styles.primaryReading,
                  ]}
                  testID={testID ? `${testID}-reading-${type}-${index}` : `item-details-reading-${type}-${index}`}
                >
                  {reading.reading}
                  {reading.primary && <Text style={styles.primaryLabel}> (primary)</Text>}
                </Text>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  section: {
    paddingVertical: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: SPACING.xs,
  },
  meaningsList: {
    gap: SPACING.xs,
  },
  meaningText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.primary,
  },
  primaryMeaning: {
    fontWeight: 'bold',
  },
  primaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
    fontWeight: 'normal',
  },
  readingsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  readingText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.primary,
  },
  primaryReading: {
    fontWeight: 'bold',
  },
  kanjiReadingsContainer: {
    gap: SPACING.md,
  },
  readingTypeGroup: {
    gap: SPACING.xs,
  },
  readingTypeLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  mnemonicText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.primary,
    lineHeight: FONT_SIZES.xxl,
  },
  componentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
});
