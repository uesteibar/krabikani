import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { SubjectType, Meaning, Reading, KanjiReading } from '../api/types';
import { MnemonicText } from './MnemonicText';
import { RadicalImage } from './RadicalImage';
import {
  getSubjectColor,
  SUBJECT_COLORS,
  COLORS,
  SHADOW,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
  MIN_TOUCH_TARGET,
  TEXT_STYLES,
} from '../theme';
import { useTheme } from '../theme/ThemeContext';

/** Data for a component radical */
export interface ComponentRadical {
  /** Subject ID */
  id: number;
  /** Radical characters (null for image-only radicals) */
  characters: string | null;
  /** Primary meaning of the radical */
  meaning: string;
  /** JSON string of character images (for radicals without Unicode characters) */
  characterImages?: string | null;
}

/** Data for a component kanji (used in vocabulary lesson cards) */
export interface ComponentKanji {
  /** Subject ID */
  id: number;
  /** Kanji character */
  characters: string;
  /** Primary meaning of the kanji */
  meaning: string;
}

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
  /** JSON string of character images (for radicals without Unicode characters) */
  characterImages?: string | null;
  /** Component radicals for kanji items */
  componentRadicals?: ComponentRadical[];
  /** Component kanji for vocabulary items */
  componentKanji?: ComponentKanji[];
  /** Callback when Next button is pressed */
  onNext: () => void;
  /** Optional callback when Back button is pressed (hides button if not provided) */
  onBack?: () => void;
  /** Callback when a component radical is pressed (for navigation to item detail) */
  onComponentPress?: (subjectId: number) => void;
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
  characterImages,
  componentRadicals,
  componentKanji,
  onNext,
  onBack,
  onComponentPress,
}: LessonCardProps) {
  const { colors } = useTheme();
  const backgroundColor = getSubjectColor(subjectType);
  const primaryMeaning = getPrimaryMeaning(meanings);
  const primaryReading = getPrimaryReading(readings);
  const acceptedMeanings = getAcceptedMeanings(meanings);
  const acceptedReadings = getAcceptedReadings(readings);
  const hasReading = subjectType !== 'radical';

  const dynamicStyles = useMemo(
    () => ({
      container: {
        backgroundColor: colors.background.primary,
      },
      componentsContainer: {
        backgroundColor: colors.componentSection.background,
        borderBottomColor: colors.componentSection.border,
      },
      componentsTitle: {
        color: colors.text.secondary,
      },
      sectionTitle: {
        color: colors.text.secondary,
      },
      primaryText: {
        color: colors.text.primary,
      },
      secondaryText: {
        color: colors.text.secondary,
      },
      mnemonicText: {
        color: colors.text.primary,
      },
      backButton: {
        backgroundColor: colors.background.primary,
      },
    }),
    [colors],
  );

  // Determine if we should show an image instead of text
  const shouldShowImage = characters === null && characterImages;

  return (
    <View style={[styles.container, dynamicStyles.container]} testID="lesson-card">
      {/* Header with characters */}
      <View
        style={[styles.header, { backgroundColor }]}
        testID="lesson-card-header"
      >
        {shouldShowImage ? (
          <RadicalImage
            characterImages={characterImages}
            fallbackText={primaryMeaning || '?'}
            size={FONT_SIZES.display}
            testID="lesson-card-characters"
          />
        ) : (
          <Text style={styles.characters} testID="lesson-card-characters">
            {characters ?? '?'}
          </Text>
        )}
        <Text style={styles.subjectType} testID="lesson-card-type">
          {subjectType.replace('_', ' ')}
        </Text>
      </View>

      {/* Component radicals display for kanji (below character block) */}
      {subjectType === 'kanji' &&
        componentRadicals &&
        componentRadicals.length > 0 && (
          <View
            style={[styles.componentsContainer, dynamicStyles.componentsContainer]}
            testID="lesson-card-components"
          >
            <Text style={[styles.componentsTitle, dynamicStyles.componentsTitle]}>Made up of:</Text>
            <View style={styles.componentsRow}>
              {componentRadicals.map(radical => {
                const componentContent = (
                  <>
                    {radical.characters === null ? (
                      <RadicalImage
                        characterImages={radical.characterImages ?? null}
                        fallbackText={radical.meaning}
                        size={FONT_SIZES.xxl}
                        testID={`lesson-card-component-${radical.id}-image`}
                      />
                    ) : (
                      <Text style={styles.componentCharacter}>
                        {radical.characters}
                      </Text>
                    )}
                    <Text style={styles.componentMeaning}>
                      {radical.meaning}
                    </Text>
                  </>
                );

                if (onComponentPress) {
                  return (
                    <TouchableOpacity
                      key={radical.id}
                      style={styles.componentItem}
                      testID={`lesson-card-component-${radical.id}`}
                      onPress={() => onComponentPress(radical.id)}
                      activeOpacity={0.7}
                    >
                      {componentContent}
                    </TouchableOpacity>
                  );
                }

                return (
                  <View
                    key={radical.id}
                    style={styles.componentItem}
                    testID={`lesson-card-component-${radical.id}`}
                  >
                    {componentContent}
                  </View>
                );
              })}
            </View>
          </View>
        )}

      {/* Component kanji display for vocabulary (below character block) */}
      {(subjectType === 'vocabulary' || subjectType === 'kana_vocabulary') &&
        componentKanji &&
        componentKanji.length > 0 && (
          <View
            style={[styles.componentsContainer, dynamicStyles.componentsContainer]}
            testID="lesson-card-components"
          >
            <Text style={[styles.componentsTitle, dynamicStyles.componentsTitle]}>Made up of:</Text>
            <View style={styles.componentsRow}>
              {componentKanji.map(kanji => {
                const componentContent = (
                  <>
                    <Text style={styles.componentCharacter}>
                      {kanji.characters}
                    </Text>
                    <Text style={styles.componentMeaning}>
                      {kanji.meaning}
                    </Text>
                  </>
                );

                if (onComponentPress) {
                  return (
                    <TouchableOpacity
                      key={kanji.id}
                      style={[
                        styles.componentItem,
                        { backgroundColor: SUBJECT_COLORS.kanji },
                      ]}
                      testID={`lesson-card-component-${kanji.id}`}
                      onPress={() => onComponentPress(kanji.id)}
                      activeOpacity={0.7}
                    >
                      {componentContent}
                    </TouchableOpacity>
                  );
                }

                return (
                  <View
                    key={kanji.id}
                    style={[
                      styles.componentItem,
                      { backgroundColor: SUBJECT_COLORS.kanji },
                    ]}
                    testID={`lesson-card-component-${kanji.id}`}
                  >
                    {componentContent}
                  </View>
                );
              })}
            </View>
          </View>
        )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Meaning section */}
        <View style={styles.section} testID="lesson-card-meaning-section">
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Meaning</Text>
          <Text style={[styles.primaryText, dynamicStyles.primaryText]} testID="lesson-card-primary-meaning">
            {primaryMeaning}
          </Text>
          {acceptedMeanings.length > 1 && (
            <Text
              style={[styles.secondaryText, dynamicStyles.secondaryText]}
              testID="lesson-card-other-meanings"
            >
              Also:{' '}
              {acceptedMeanings.filter(m => m !== primaryMeaning).join(', ')}
            </Text>
          )}
        </View>

        {/* Reading section (only for kanji and vocabulary) */}
        {hasReading && (
          <View style={styles.section} testID="lesson-card-reading-section">
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Reading</Text>
            <Text
              style={[styles.primaryText, dynamicStyles.primaryText]}
              testID="lesson-card-primary-reading"
            >
              {primaryReading}
            </Text>
            {acceptedReadings.length > 1 && (
              <Text
                style={[styles.secondaryText, dynamicStyles.secondaryText]}
                testID="lesson-card-other-readings"
              >
                Also:{' '}
                {acceptedReadings.filter(r => r !== primaryReading).join(', ')}
              </Text>
            )}
          </View>
        )}

        {/* Meaning mnemonic section */}
        <View
          style={styles.section}
          testID="lesson-card-meaning-mnemonic-section"
        >
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Meaning Mnemonic</Text>
          <MnemonicText
            text={meaningMnemonic}
            style={{ ...styles.mnemonicText, ...dynamicStyles.mnemonicText }}
            testID="lesson-card-meaning-mnemonic"
          />
        </View>

        {/* Reading mnemonic section (only for kanji and vocabulary) */}
        {hasReading && readingMnemonic && (
          <View
            style={styles.section}
            testID="lesson-card-reading-mnemonic-section"
          >
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Reading Mnemonic</Text>
            <MnemonicText
              text={readingMnemonic}
              style={{ ...styles.mnemonicText, ...dynamicStyles.mnemonicText }}
              testID="lesson-card-reading-mnemonic"
            />
          </View>
        )}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.footer} testID="lesson-card-footer">
        {onBack ? (
          <TouchableOpacity
            style={[styles.backButton, dynamicStyles.backButton, { borderColor: backgroundColor }]}
            onPress={onBack}
            activeOpacity={0.8}
            testID="lesson-card-back-button"
          >
            <Text style={[styles.backButtonText, { color: backgroundColor }]}>
              Back
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonSpacer} />
        )}
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor }]}
          onPress={onNext}
          activeOpacity={0.8}
          testID="lesson-card-next-button"
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characters: {
    fontSize: FONT_SIZES.display,
    ...TEXT_STYLES.japaneseDisplay,
    color: COLORS.text.inverse,
    textAlign: 'center',
  },
  subjectType: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: SPACING.sm,
    textTransform: 'capitalize',
  },
  componentsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  componentsTitle: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.sm,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  componentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  componentItem: {
    alignItems: 'center',
    minWidth: 60,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: SUBJECT_COLORS.radical,
    borderRadius: BORDER_RADIUS.md,
  },
  componentCharacter: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
  componentMeaning: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: SPACING.xs,
    textAlign: 'center',
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
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  primaryText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
  },
  secondaryText: {
    fontSize: FONT_SIZES.base,
    marginTop: SPACING.xs,
  },
  mnemonicText: {
    fontSize: FONT_SIZES.base,
    lineHeight: FONT_SIZES.xxl,
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
