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
import type { Meaning } from '../api/types';
import { RadicalImage, MnemonicText, SrsLevelBadge } from '../components';
import {
  getSubjectById,
  getAssignmentBySubjectId,
  getKanjiUsingRadical,
  getUserSynonymsBySubjectId,
  type DatabaseSubject,
  type DatabaseAssignment,
  type KanjiUsingRadical,
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

type RadicalDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'RadicalDetail'
>;

type RadicalDetailScreenRouteProp = NativeStackScreenProps<
  RootStackParamList,
  'RadicalDetail'
>['route'];

type DetailPhase = 'loading' | 'loaded' | 'error';

interface RadicalDetailData {
  subject: DatabaseSubject;
  assignment: DatabaseAssignment | null;
  meanings: Meaning[];
  userSynonyms: string[];
  kanjiUsingRadical: KanjiUsingRadical[];
}

/**
 * RadicalDetailScreen displays full details for a radical item.
 *
 * Features:
 * - Header with character (or image for image-only radicals) and SRS badge
 * - All meanings with primary bolded
 * - Meaning mnemonic
 * - "Used in Kanji" section showing kanji that use this radical
 * - Loading and error states
 */
export function RadicalDetailScreen() {
  const navigation = useNavigation<RadicalDetailScreenNavigationProp>();
  const route = useRoute<RadicalDetailScreenRouteProp>();
  const theme = useTheme();
  const { subjectId } = route.params;

  const [phase, setPhase] = useState<DetailPhase>('loading');
  const [data, setData] = useState<RadicalDetailData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRadicalData = useCallback(async () => {
    try {
      setPhase('loading');
      setErrorMessage(null);

      // Fetch the subject
      const subject = await getSubjectById(subjectId);

      if (!subject) {
        setErrorMessage('Radical not found');
        setPhase('error');
        return;
      }

      if (subject.object_type !== 'radical') {
        setErrorMessage('This is not a radical');
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

      // Fetch kanji that use this radical
      const kanjiUsingRadical = await getKanjiUsingRadical(subjectId);

      setData({
        subject,
        assignment,
        meanings,
        userSynonyms,
        kanjiUsingRadical,
      });
      setPhase('loaded');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load radical',
      );
      setPhase('error');
    }
  }, [subjectId]);

  useEffect(() => {
    loadRadicalData();
  }, [loadRadicalData]);

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
    }),
    [theme],
  );

  // Loading state
  if (phase === 'loading') {
    return (
      <View
        style={[styles.centerContainer, dynamicStyles.centerContainer]}
        testID="radical-detail-loading"
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
        testID="radical-detail-error"
      >
        <Text style={styles.errorText}>
          {errorMessage ?? 'An error occurred'}
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          testID="radical-detail-back-button"
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { subject, assignment, meanings, userSynonyms, kanjiUsingRadical } =
    data;
  const primaryMeaning =
    meanings.find(m => m.primary)?.meaning ?? meanings[0]?.meaning ?? '';

  return (
    <ScrollView
      style={[styles.container, dynamicStyles.container]}
      testID="radical-detail-screen"
    >
      {/* Header with character and SRS badge */}
      <View style={styles.header} testID="radical-detail-header">
        {subject.characters ? (
          <Text style={styles.characterText} testID="radical-detail-character">
            {subject.characters}
          </Text>
        ) : (
          <RadicalImage
            characterImages={subject.character_images}
            fallbackText={primaryMeaning.charAt(0).toUpperCase()}
            size={72}
            testID="radical-detail-radical-image"
          />
        )}
        {assignment && (
          <View
            style={styles.srsBadgeContainer}
            testID="radical-detail-srs-badge"
          >
            <SrsLevelBadge stage={assignment.srs_stage} />
          </View>
        )}
      </View>

      {/* Details section */}
      <View style={[styles.detailsContainer, dynamicStyles.sectionBackground]}>
        {/* Meanings Section */}
        <View style={styles.section} testID="radical-detail-meanings-section">
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
                  testID={`radical-detail-meaning-${index}`}
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
                  testID={`radical-detail-synonym-${index}`}
                >
                  {synonym}
                </Text>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={[styles.divider, dynamicStyles.dividerColor]} />

        {/* Meaning Mnemonic Section */}
        <View style={styles.section} testID="radical-detail-mnemonic-section">
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitleColor]}>
            Meaning Mnemonic
          </Text>
          <MnemonicText
            text={subject.meaning_mnemonic}
            style={{ ...styles.mnemonicText, color: theme.colors.text.primary }}
            testID="radical-detail-mnemonic"
          />
        </View>

        {/* Used in Kanji Section */}
        {kanjiUsingRadical.length > 0 && (
          <>
            <View style={[styles.divider, dynamicStyles.dividerColor]} />
            <View
              style={styles.section}
              testID="radical-detail-used-in-section"
            >
              <Text
                style={[styles.sectionTitle, dynamicStyles.sectionTitleColor]}
              >
                Used in Kanji
              </Text>
              <View style={styles.kanjiGrid}>
                {kanjiUsingRadical.map(kanji => (
                  <TouchableOpacity
                    key={kanji.id}
                    style={[styles.kanjiItem, dynamicStyles.kanjiItemBorder]}
                    onPress={() => handleKanjiPress(kanji.id)}
                    activeOpacity={0.7}
                    testID={`radical-detail-kanji-${kanji.id}`}
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
    backgroundColor: SUBJECT_COLORS.radical,
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
  mnemonicText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.primary,
    lineHeight: FONT_SIZES.xxl,
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
});
