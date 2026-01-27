import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import type { Meaning, Reading } from '../api/types';
import { MnemonicText, SrsLevelBadge } from '../components';
import {
  getSubjectById,
  getSubjectsByIds,
  getAssignmentBySubjectId,
  getUserSynonymsBySubjectId,
  type DatabaseSubject,
  type DatabaseAssignment,
} from '../storage';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SUBJECT_COLORS,
  TEXT_STYLES,
  useTheme,
} from '../theme';

type VocabularyDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'VocabularyDetail'
>;

type VocabularyDetailScreenRouteProp = NativeStackScreenProps<
  RootStackParamList,
  'VocabularyDetail'
>['route'];

type DetailPhase = 'loading' | 'loaded' | 'error';

interface ContextSentence {
  ja: string;
  en: string;
}

interface ComponentKanji {
  id: number;
  characters: string;
  meaning: string;
}

interface VocabularyDetailData {
  subject: DatabaseSubject;
  assignment: DatabaseAssignment | null;
  meanings: Meaning[];
  userSynonyms: string[];
  readings: Reading[];
  componentKanji: ComponentKanji[];
  contextSentences: ContextSentence[];
  partsOfSpeech: string[];
  isKanaVocabulary: boolean;
}

/**
 * VocabularyDetailScreen displays full details for a vocabulary item.
 *
 * Features:
 * - Header with characters and SRS badge
 * - All meanings with primary bolded
 * - All readings
 * - Parts of speech
 * - Meaning mnemonic and reading mnemonic
 * - Component kanji (for vocabulary type only)
 * - Context sentences with Japanese and English
 * - Works for both vocabulary and kana_vocabulary types
 * - Loading and error states
 */
export function VocabularyDetailScreen() {
  const navigation = useNavigation<VocabularyDetailScreenNavigationProp>();
  const route = useRoute<VocabularyDetailScreenRouteProp>();
  const theme = useTheme();
  const { subjectId } = route.params;

  const [phase, setPhase] = useState<DetailPhase>('loading');
  const [data, setData] = useState<VocabularyDetailData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadVocabularyData = useCallback(async () => {
    try {
      setPhase('loading');
      setErrorMessage(null);

      // Fetch the subject
      const subject = await getSubjectById(subjectId);

      if (!subject) {
        setErrorMessage('Vocabulary not found');
        setPhase('error');
        return;
      }

      const isKanaVocabulary = subject.object_type === 'kana_vocabulary';
      if (subject.object_type !== 'vocabulary' && !isKanaVocabulary) {
        setErrorMessage('This is not a vocabulary item');
        setPhase('error');
        return;
      }

      // Fetch assignment for SRS level
      const assignment = await getAssignmentBySubjectId(subjectId);

      // Parse meanings
      const meanings: Meaning[] = JSON.parse(subject.meanings);

      // Fetch user synonyms
      const synonymRecords = await getUserSynonymsBySubjectId(subjectId);
      const userSynonyms = synonymRecords.map(s => s.synonym);

      // Parse readings
      const readings: Reading[] = subject.readings
        ? JSON.parse(subject.readings)
        : [];

      // Parse component subject IDs and fetch kanji data (only for regular vocabulary)
      const componentSubjectIds: number[] = subject.component_subject_ids
        ? JSON.parse(subject.component_subject_ids)
        : [];

      let componentKanji: ComponentKanji[] = [];
      if (componentSubjectIds.length > 0 && !isKanaVocabulary) {
        const kanjiSubjects = await getSubjectsByIds(componentSubjectIds);
        componentKanji = kanjiSubjects
          .filter(s => s.object_type === 'kanji')
          .map(s => {
            const kanjiMeanings: Meaning[] = JSON.parse(s.meanings);
            const primaryMeaning =
              kanjiMeanings.find(m => m.primary)?.meaning ??
              kanjiMeanings[0]?.meaning ??
              '';
            return {
              id: s.id,
              characters: s.characters ?? '',
              meaning: primaryMeaning,
            };
          });
      }

      // Note: context_sentences and parts_of_speech are stored in the original API data
      // but not currently in our database schema. For now, we'll use empty arrays.
      // In a full implementation, these would be stored in additional columns.
      const contextSentences: ContextSentence[] = [];
      const partsOfSpeech: string[] = [];

      setData({
        subject,
        assignment,
        meanings,
        userSynonyms,
        readings,
        componentKanji,
        contextSentences,
        partsOfSpeech,
        isKanaVocabulary,
      });
      setPhase('loaded');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load vocabulary',
      );
      setPhase('error');
    }
  }, [subjectId]);

  useEffect(() => {
    loadVocabularyData();
  }, [loadVocabularyData]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleKanjiPress = (kanjiSubjectId: number) => {
    navigation.push('KanjiDetail', { subjectId: kanjiSubjectId });
  };

  const dynamicStyles = useMemo(
    () => ({
      container: {
        backgroundColor: theme.colors.background.primary,
      },
      centerContainer: {
        backgroundColor: theme.colors.background.primary,
      },
      sectionBackground: {
        backgroundColor: theme.colors.background.secondary,
      },
      sectionTitleColor: {
        color: theme.colors.text.secondary,
      },
      meaningTextColor: {
        color: theme.colors.text.primary,
      },
      mnemonicTextColor: {
        color: theme.colors.text.primary,
      },
      dividerColor: {
        backgroundColor: theme.colors.border.light,
      },
      kanjiItemBorder: {
        borderColor: theme.colors.border.light,
      },
      contextSentenceColor: {
        color: theme.colors.text.secondary,
      },
      partsOfSpeechColor: {
        color: theme.colors.text.tertiary,
      },
    }),
    [theme],
  );

  // Loading state
  if (phase === 'loading') {
    return (
      <View
        style={[styles.centerContainer, dynamicStyles.centerContainer]}
        testID="vocabulary-detail-loading"
      >
        <ActivityIndicator size="large" color={theme.colors.text.primary} />
        <Text
          style={[styles.loadingText, { color: theme.colors.text.secondary }]}
        >
          Loading...
        </Text>
      </View>
    );
  }

  // Error state
  if (phase === 'error' || !data) {
    return (
      <View
        style={[styles.centerContainer, dynamicStyles.centerContainer]}
        testID="vocabulary-detail-error"
      >
        <Text style={styles.errorText}>
          {errorMessage ?? 'An error occurred'}
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          testID="vocabulary-detail-back-button"
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const {
    subject,
    assignment,
    meanings,
    userSynonyms,
    readings,
    componentKanji,
    contextSentences,
    partsOfSpeech,
    isKanaVocabulary,
  } = data;

  return (
    <ScrollView
      style={[styles.container, dynamicStyles.container]}
      testID="vocabulary-detail-screen"
    >
      {/* Header with characters and SRS badge */}
      <View style={styles.header} testID="vocabulary-detail-header">
        <Text style={styles.characterText} testID="vocabulary-detail-character">
          {subject.characters ?? '?'}
        </Text>
        {assignment && (
          <View
            style={styles.srsBadgeContainer}
            testID="vocabulary-detail-srs-badge"
          >
            <SrsLevelBadge stage={assignment.srs_stage} />
          </View>
        )}
      </View>

      {/* Details section */}
      <View style={[styles.detailsContainer, dynamicStyles.sectionBackground]}>
        {/* Parts of Speech Section */}
        {partsOfSpeech.length > 0 && (
          <>
            <View style={styles.section} testID="vocabulary-detail-pos-section">
              <View style={styles.partsOfSpeechContainer}>
                {partsOfSpeech.map((pos, index) => (
                  <Text
                    key={index}
                    style={[
                      styles.partsOfSpeechText,
                      dynamicStyles.partsOfSpeechColor,
                    ]}
                    testID={`vocabulary-detail-pos-${index}`}
                  >
                    {pos}
                  </Text>
                ))}
              </View>
            </View>
            <View style={[styles.divider, dynamicStyles.dividerColor]} />
          </>
        )}

        {/* Meanings Section */}
        <View
          style={styles.section}
          testID="vocabulary-detail-meanings-section"
        >
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitleColor]}>
            Meanings
          </Text>
          <View style={styles.meaningsList}>
            {meanings.map((meaning, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <Text
                    style={[
                      styles.meaningSeparator,
                      dynamicStyles.sectionTitleColor,
                    ]}
                  >
                    ·
                  </Text>
                )}
                <Text
                  style={[
                    styles.meaningText,
                    dynamicStyles.meaningTextColor,
                    meaning.primary && styles.primaryMeaning,
                  ]}
                  testID={`vocabulary-detail-meaning-${index}`}
                >
                  {meaning.meaning}
                </Text>
              </React.Fragment>
            ))}
            {userSynonyms.map((synonym, index) => (
              <React.Fragment key={`synonym-${index}`}>
                <Text
                  style={[
                    styles.meaningSeparator,
                    dynamicStyles.sectionTitleColor,
                  ]}
                >
                  ·
                </Text>
                <Text
                  style={[
                    styles.meaningText,
                    dynamicStyles.meaningTextColor,
                    styles.synonymText,
                  ]}
                  testID={`vocabulary-detail-synonym-${index}`}
                >
                  {synonym}
                </Text>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={[styles.divider, dynamicStyles.dividerColor]} />

        {/* Readings Section */}
        <View
          style={styles.section}
          testID="vocabulary-detail-readings-section"
        >
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitleColor]}>
            Readings
          </Text>
          <View style={styles.readingsList}>
            {readings.map((reading, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <Text
                    style={[
                      styles.readingSeparator,
                      dynamicStyles.contextSentenceColor,
                    ]}
                  >
                    ·
                  </Text>
                )}
                <Text
                  style={[
                    styles.readingText,
                    dynamicStyles.meaningTextColor,
                    reading.primary && styles.primaryReading,
                  ]}
                  testID={`vocabulary-detail-reading-${index}`}
                >
                  {reading.reading}
                </Text>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Component Kanji Section */}
        {componentKanji.length > 0 && (
          <>
            <View style={[styles.divider, dynamicStyles.dividerColor]} />
            <View
              style={styles.section}
              testID="vocabulary-detail-kanji-section"
            >
              <Text
                style={[styles.sectionTitle, dynamicStyles.sectionTitleColor]}
              >
                Component Kanji
              </Text>
              <View style={styles.kanjiGrid}>
                {componentKanji.map(kanji => (
                  <TouchableOpacity
                    key={kanji.id}
                    style={[styles.kanjiItem, dynamicStyles.kanjiItemBorder]}
                    onPress={() => handleKanjiPress(kanji.id)}
                    activeOpacity={0.7}
                    testID={`vocabulary-detail-kanji-${kanji.id}`}
                  >
                    <Text style={styles.kanjiCharacter}>
                      {kanji.characters}
                    </Text>
                    <Text style={styles.kanjiMeaning} numberOfLines={1}>
                      {kanji.meaning}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={[styles.divider, dynamicStyles.dividerColor]} />

        {/* Meaning Mnemonic Section */}
        <View
          style={styles.section}
          testID="vocabulary-detail-meaning-mnemonic-section"
        >
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitleColor]}>
            Meaning Mnemonic
          </Text>
          <MnemonicText
            text={subject.meaning_mnemonic}
            style={{ ...styles.mnemonicText, color: theme.colors.text.primary }}
            testID="vocabulary-detail-meaning-mnemonic"
          />
        </View>

        {/* Reading Mnemonic Section (only for regular vocabulary) */}
        {subject.reading_mnemonic && (
          <>
            <View style={[styles.divider, dynamicStyles.dividerColor]} />
            <View
              style={styles.section}
              testID="vocabulary-detail-reading-mnemonic-section"
            >
              <Text
                style={[styles.sectionTitle, dynamicStyles.sectionTitleColor]}
              >
                Reading Mnemonic
              </Text>
              <MnemonicText
                text={subject.reading_mnemonic}
                style={{
                  ...styles.mnemonicText,
                  color: theme.colors.text.primary,
                }}
                testID="vocabulary-detail-reading-mnemonic"
              />
            </View>
          </>
        )}

        {/* Context Sentences Section */}
        {contextSentences.length > 0 && (
          <>
            <View style={[styles.divider, dynamicStyles.dividerColor]} />
            <View
              style={styles.section}
              testID="vocabulary-detail-context-section"
            >
              <Text
                style={[styles.sectionTitle, dynamicStyles.sectionTitleColor]}
              >
                Context Sentences
              </Text>
              {contextSentences.map((sentence, index) => (
                <View
                  key={index}
                  style={styles.contextSentence}
                  testID={`vocabulary-detail-context-${index}`}
                >
                  <Text
                    style={[
                      styles.contextJapanese,
                      dynamicStyles.meaningTextColor,
                    ]}
                  >
                    {sentence.ja}
                  </Text>
                  <Text
                    style={[
                      styles.contextEnglish,
                      dynamicStyles.contextSentenceColor,
                    ]}
                  >
                    {sentence.en}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background.primary,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.secondary,
  },
  errorText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.feedback.incorrect,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  backButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.neutral.gray200,
    borderRadius: BORDER_RADIUS.md,
  },
  backButtonText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  header: {
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SUBJECT_COLORS.vocabulary,
  },
  characterText: {
    fontSize: FONT_SIZES.display,
    color: COLORS.text.inverse,
    ...TEXT_STYLES.japaneseDisplay,
  },
  srsBadgeContainer: {
    marginTop: SPACING.sm,
  },
  detailsContainer: {
    margin: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background.secondary,
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
  partsOfSpeechContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  partsOfSpeechText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    textTransform: 'lowercase',
  },
  meaningsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  meaningSeparator: {
    fontSize: FONT_SIZES.base,
  },
  meaningText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.primary,
  },
  primaryMeaning: {
    fontWeight: 'bold',
  },
  synonymText: {
    fontStyle: 'italic',
  },
  readingsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  readingText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.primary,
  },
  readingSeparator: {
    fontSize: FONT_SIZES.base,
  },
  primaryReading: {
    fontWeight: 'bold',
  },
  kanjiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  kanjiItem: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: SUBJECT_COLORS.kanji,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 60,
  },
  kanjiCharacter: {
    fontSize: FONT_SIZES.xxl,
    color: COLORS.text.inverse,
    ...TEXT_STYLES.japaneseDisplay,
  },
  kanjiMeaning: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  mnemonicText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.primary,
    lineHeight: FONT_SIZES.xxl,
  },
  contextSentence: {
    marginBottom: SPACING.md,
  },
  contextJapanese: {
    fontSize: FONT_SIZES.base,
    marginBottom: SPACING.xs,
    lineHeight: FONT_SIZES.xl,
  },
  contextEnglish: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    lineHeight: FONT_SIZES.lg,
  },
});
