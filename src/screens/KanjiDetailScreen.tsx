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
import type { Meaning, KanjiReading } from '../api/types';
import { RadicalImage, MnemonicText, SrsLevelBadge } from '../components';
import {
  getSubjectById,
  getSubjectsByIds,
  getAssignmentBySubjectId,
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

type KanjiDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'KanjiDetail'
>;

type KanjiDetailScreenRouteProp = NativeStackScreenProps<
  RootStackParamList,
  'KanjiDetail'
>['route'];

type DetailPhase = 'loading' | 'loaded' | 'error';

interface ComponentRadical {
  id: number;
  characters: string | null;
  meaning: string;
  characterImages: string | null;
}

interface KanjiDetailData {
  subject: DatabaseSubject;
  assignment: DatabaseAssignment | null;
  meanings: Meaning[];
  readings: KanjiReading[];
  componentRadicals: ComponentRadical[];
  meaningHint: string | null;
  readingHint: string | null;
}

/**
 * Groups readings by type (onyomi, kunyomi, nanori).
 */
function groupReadingsByType(readings: KanjiReading[]): {
  onyomi: KanjiReading[];
  kunyomi: KanjiReading[];
  nanori: KanjiReading[];
} {
  return {
    onyomi: readings.filter(r => r.type === 'onyomi'),
    kunyomi: readings.filter(r => r.type === 'kunyomi'),
    nanori: readings.filter(r => r.type === 'nanori'),
  };
}

/**
 * KanjiDetailScreen displays full details for a kanji item.
 *
 * Features:
 * - Header with character and SRS badge
 * - All meanings with primary bolded
 * - Readings grouped by type (on'yomi, kun'yomi, nanori)
 * - Meaning mnemonic and reading mnemonic
 * - Component radicals
 * - Meaning hint and reading hint if available
 * - Loading and error states
 */
export function KanjiDetailScreen() {
  const navigation = useNavigation<KanjiDetailScreenNavigationProp>();
  const route = useRoute<KanjiDetailScreenRouteProp>();
  const theme = useTheme();
  const { subjectId } = route.params;

  const [phase, setPhase] = useState<DetailPhase>('loading');
  const [data, setData] = useState<KanjiDetailData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadKanjiData = useCallback(async () => {
    try {
      setPhase('loading');
      setErrorMessage(null);

      // Fetch the subject
      const subject = await getSubjectById(subjectId);

      if (!subject) {
        setErrorMessage('Kanji not found');
        setPhase('error');
        return;
      }

      if (subject.object_type !== 'kanji') {
        setErrorMessage('This is not a kanji');
        setPhase('error');
        return;
      }

      // Fetch assignment for SRS level
      const assignment = await getAssignmentBySubjectId(subjectId);

      // Parse meanings
      const meanings: Meaning[] = JSON.parse(subject.meanings);

      // Parse readings
      const readings: KanjiReading[] = subject.readings
        ? JSON.parse(subject.readings)
        : [];

      // Parse component subject IDs and fetch radical data
      const componentSubjectIds: number[] = subject.component_subject_ids
        ? JSON.parse(subject.component_subject_ids)
        : [];

      let componentRadicals: ComponentRadical[] = [];
      if (componentSubjectIds.length > 0) {
        const radicalSubjects = await getSubjectsByIds(componentSubjectIds);
        componentRadicals = radicalSubjects
          .filter(s => s.object_type === 'radical')
          .map(s => {
            const radicalMeanings: Meaning[] = JSON.parse(s.meanings);
            const primaryMeaning =
              radicalMeanings.find(m => m.primary)?.meaning ??
              radicalMeanings[0]?.meaning ??
              '';
            return {
              id: s.id,
              characters: s.characters,
              meaning: primaryMeaning,
              characterImages: s.character_images,
            };
          });
      }

      // Parse hints from the subject data
      // Note: KanjiData has meaning_hint and reading_hint but our database
      // stores the full subject data which we need to extract from
      // For now, we don't have hints in the database schema, so they'll be null
      // In a full implementation, these would come from the API data
      const meaningHint: string | null = null;
      const readingHint: string | null = null;

      setData({
        subject,
        assignment,
        meanings,
        readings,
        componentRadicals,
        meaningHint,
        readingHint,
      });
      setPhase('loaded');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load kanji',
      );
      setPhase('error');
    }
  }, [subjectId]);

  useEffect(() => {
    loadKanjiData();
  }, [loadKanjiData]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleRadicalPress = (radicalSubjectId: number) => {
    navigation.push('RadicalDetail', { subjectId: radicalSubjectId });
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
      radicalItemBorder: {
        borderColor: theme.colors.border.light,
      },
      hintTextColor: {
        color: theme.colors.text.secondary,
      },
    }),
    [theme],
  );

  // Loading state
  if (phase === 'loading') {
    return (
      <View
        style={[styles.centerContainer, dynamicStyles.centerContainer]}
        testID="kanji-detail-loading"
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
        testID="kanji-detail-error"
      >
        <Text style={styles.errorText}>
          {errorMessage ?? 'An error occurred'}
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          testID="kanji-detail-back-button"
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
    readings,
    componentRadicals,
    meaningHint,
    readingHint,
  } = data;

  const groupedReadings = groupReadingsByType(readings);

  return (
    <ScrollView
      style={[styles.container, dynamicStyles.container]}
      testID="kanji-detail-screen"
    >
      {/* Header with character and SRS badge */}
      <View style={styles.header} testID="kanji-detail-header">
        <Text style={styles.characterText} testID="kanji-detail-character">
          {subject.characters ?? '?'}
        </Text>
        {assignment && (
          <View
            style={styles.srsBadgeContainer}
            testID="kanji-detail-srs-badge"
          >
            <SrsLevelBadge stage={assignment.srs_stage} />
          </View>
        )}
      </View>

      {/* Details section */}
      <View style={[styles.detailsContainer, dynamicStyles.sectionBackground]}>
        {/* Meanings Section */}
        <View style={styles.section} testID="kanji-detail-meanings-section">
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitleColor]}>
            Meanings
          </Text>
          <View style={styles.meaningsList}>
            {meanings.map((meaning, index) => (
              <Text
                key={index}
                style={[
                  styles.meaningText,
                  dynamicStyles.meaningTextColor,
                  meaning.primary && styles.primaryMeaning,
                ]}
                testID={`kanji-detail-meaning-${index}`}
              >
                {meaning.meaning}
              </Text>
            ))}
          </View>
        </View>

        <View style={[styles.divider, dynamicStyles.dividerColor]} />

        {/* Readings Section */}
        <View style={styles.section} testID="kanji-detail-readings-section">
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitleColor]}>
            Readings
          </Text>

          {/* On'yomi */}
          {groupedReadings.onyomi.length > 0 && (
            <View style={styles.readingGroup} testID="kanji-detail-onyomi">
              <Text
                style={[styles.readingTypeLabel, dynamicStyles.hintTextColor]}
              >
                On'yomi
              </Text>
              <View style={styles.readingsList}>
                {groupedReadings.onyomi.map((reading, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && (
                      <Text
                        style={[
                          styles.readingSeparator,
                          dynamicStyles.hintTextColor,
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
                      testID={`kanji-detail-onyomi-${index}`}
                    >
                      {reading.reading}
                    </Text>
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}

          {/* Kun'yomi */}
          {groupedReadings.kunyomi.length > 0 && (
            <View style={styles.readingGroup} testID="kanji-detail-kunyomi">
              <Text
                style={[styles.readingTypeLabel, dynamicStyles.hintTextColor]}
              >
                Kun'yomi
              </Text>
              <View style={styles.readingsList}>
                {groupedReadings.kunyomi.map((reading, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && (
                      <Text
                        style={[
                          styles.readingSeparator,
                          dynamicStyles.hintTextColor,
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
                      testID={`kanji-detail-kunyomi-${index}`}
                    >
                      {reading.reading}
                    </Text>
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}

          {/* Nanori */}
          {groupedReadings.nanori.length > 0 && (
            <View style={styles.readingGroup} testID="kanji-detail-nanori">
              <Text
                style={[styles.readingTypeLabel, dynamicStyles.hintTextColor]}
              >
                Nanori
              </Text>
              <View style={styles.readingsList}>
                {groupedReadings.nanori.map((reading, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && (
                      <Text
                        style={[
                          styles.readingSeparator,
                          dynamicStyles.hintTextColor,
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
                      testID={`kanji-detail-nanori-${index}`}
                    >
                      {reading.reading}
                    </Text>
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={[styles.divider, dynamicStyles.dividerColor]} />

        {/* Component Radicals Section */}
        {componentRadicals.length > 0 && (
          <>
            <View style={styles.section} testID="kanji-detail-radicals-section">
              <Text
                style={[styles.sectionTitle, dynamicStyles.sectionTitleColor]}
              >
                Component Radicals
              </Text>
              <View style={styles.radicalsGrid}>
                {componentRadicals.map(radical => (
                  <TouchableOpacity
                    key={radical.id}
                    style={[
                      styles.radicalItem,
                      dynamicStyles.radicalItemBorder,
                    ]}
                    onPress={() => handleRadicalPress(radical.id)}
                    activeOpacity={0.7}
                    testID={`kanji-detail-radical-${radical.id}`}
                  >
                    {radical.characters ? (
                      <Text style={styles.radicalCharacter}>
                        {radical.characters}
                      </Text>
                    ) : (
                      <RadicalImage
                        characterImages={radical.characterImages}
                        fallbackText={radical.meaning.charAt(0).toUpperCase()}
                        size={24}
                        testID={`kanji-detail-radical-image-${radical.id}`}
                      />
                    )}
                    <Text style={styles.radicalMeaning} numberOfLines={1}>
                      {radical.meaning}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={[styles.divider, dynamicStyles.dividerColor]} />
          </>
        )}

        {/* Meaning Mnemonic Section */}
        <View
          style={styles.section}
          testID="kanji-detail-meaning-mnemonic-section"
        >
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitleColor]}>
            Meaning Mnemonic
          </Text>
          <MnemonicText
            text={subject.meaning_mnemonic}
            style={{ ...styles.mnemonicText, color: theme.colors.text.primary }}
            testID="kanji-detail-meaning-mnemonic"
          />
          {meaningHint && (
            <Text
              style={[styles.hintText, dynamicStyles.hintTextColor]}
              testID="kanji-detail-meaning-hint"
            >
              Hint: {meaningHint}
            </Text>
          )}
        </View>

        {/* Reading Mnemonic Section */}
        {subject.reading_mnemonic && (
          <>
            <View style={[styles.divider, dynamicStyles.dividerColor]} />
            <View
              style={styles.section}
              testID="kanji-detail-reading-mnemonic-section"
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
                testID="kanji-detail-reading-mnemonic"
              />
              {readingHint && (
                <Text
                  style={[styles.hintText, dynamicStyles.hintTextColor]}
                  testID="kanji-detail-reading-hint"
                >
                  Hint: {readingHint}
                </Text>
              )}
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
    backgroundColor: SUBJECT_COLORS.kanji,
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
  readingGroup: {
    marginBottom: SPACING.md,
  },
  readingTypeLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
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
  radicalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  radicalItem: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: SUBJECT_COLORS.radical,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 60,
  },
  radicalCharacter: {
    fontSize: FONT_SIZES.xxl,
    color: COLORS.text.inverse,
    ...TEXT_STYLES.japaneseDisplay,
  },
  radicalMeaning: {
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
  hintText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
  },
});
