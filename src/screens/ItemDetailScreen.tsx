import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import type { Meaning, Reading, KanjiReading, SubjectType } from '../api/types';
import { ItemDetails, RadicalImage, type ReviewComponentRadical, type ReviewComponentKanji } from '../components';
import { getSubjectById, getSubjectsByIds, type DatabaseSubject } from '../storage';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  getSubjectColor,
} from '../theme';

type ItemDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ItemDetail'
>;

type ItemDetailScreenRouteProp = NativeStackScreenProps<
  RootStackParamList,
  'ItemDetail'
>['route'];

type DetailPhase = 'loading' | 'loaded' | 'error';

interface ItemDetailData {
  subject: DatabaseSubject;
  subjectType: SubjectType;
  meanings: Meaning[];
  readings: Reading[] | KanjiReading[] | null;
  componentRadicals?: ReviewComponentRadical[];
  componentKanji?: ReviewComponentKanji[];
}

/**
 * Format subject type for display
 */
function formatSubjectType(type: SubjectType): string {
  switch (type) {
    case 'radical':
      return 'Radical';
    case 'kanji':
      return 'Kanji';
    case 'vocabulary':
      return 'Vocabulary';
    case 'kana_vocabulary':
      return 'Vocabulary';
    default:
      return type;
  }
}

/**
 * ItemDetailScreen displays full details for a radical, kanji, or vocabulary item.
 *
 * Features:
 * - Header with character and subject type badge
 * - Meanings, readings, and mnemonics via ItemDetails component
 * - Component radicals (for kanji) or component kanji (for vocabulary)
 * - Loading and error states
 */
export function ItemDetailScreen() {
  const navigation = useNavigation<ItemDetailScreenNavigationProp>();
  const route = useRoute<ItemDetailScreenRouteProp>();
  const { subjectId } = route.params;

  const [phase, setPhase] = useState<DetailPhase>('loading');
  const [data, setData] = useState<ItemDetailData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSubjectData = useCallback(async () => {
    try {
      setPhase('loading');
      setErrorMessage(null);

      // Fetch the main subject
      const subject = await getSubjectById(subjectId);

      if (!subject) {
        setErrorMessage('Subject not found');
        setPhase('error');
        return;
      }

      const subjectType = subject.object_type as SubjectType;
      const meanings: Meaning[] = JSON.parse(subject.meanings);
      const readings: Reading[] | KanjiReading[] | null = subject.readings
        ? JSON.parse(subject.readings)
        : null;

      // Fetch component subjects if applicable
      let componentRadicals: ReviewComponentRadical[] | undefined;
      let componentKanji: ReviewComponentKanji[] | undefined;

      const componentIds: number[] = subject.component_subject_ids
        ? JSON.parse(subject.component_subject_ids)
        : [];

      if (componentIds.length > 0) {
        const componentSubjects = await getSubjectsByIds(componentIds);

        if (subjectType === 'kanji') {
          // For kanji, components are radicals
          componentRadicals = componentSubjects
            .filter(s => s.object_type === 'radical')
            .map(s => {
              const compMeanings: Meaning[] = JSON.parse(s.meanings);
              const primaryMeaning = compMeanings.find(m => m.primary)?.meaning ?? compMeanings[0]?.meaning ?? '';
              return {
                id: s.id,
                characters: s.characters,
                meaning: primaryMeaning,
                characterImages: s.character_images,
              };
            });
        } else if (subjectType === 'vocabulary' || subjectType === 'kana_vocabulary') {
          // For vocabulary, components are kanji
          componentKanji = componentSubjects
            .filter(s => s.object_type === 'kanji')
            .map(s => {
              const compMeanings: Meaning[] = JSON.parse(s.meanings);
              const compReadings: KanjiReading[] = s.readings ? JSON.parse(s.readings) : [];
              const primaryMeaning = compMeanings.find(m => m.primary)?.meaning ?? compMeanings[0]?.meaning ?? '';
              const primaryReading = compReadings.find(r => r.primary)?.reading ?? compReadings[0]?.reading ?? '';
              return {
                id: s.id,
                characters: s.characters ?? '',
                meaning: primaryMeaning,
                reading: primaryReading,
              };
            });
        }
      }

      setData({
        subject,
        subjectType,
        meanings,
        readings,
        componentRadicals,
        componentKanji,
      });
      setPhase('loaded');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load subject');
      setPhase('error');
    }
  }, [subjectId]);

  useEffect(() => {
    loadSubjectData();
  }, [loadSubjectData]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  // Loading state
  if (phase === 'loading') {
    return (
      <View style={styles.centerContainer} testID="item-detail-loading">
        <ActivityIndicator size="large" color={COLORS.text.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Error state
  if (phase === 'error' || !data) {
    return (
      <View style={styles.centerContainer} testID="item-detail-error">
        <Text style={styles.errorText}>{errorMessage ?? 'An error occurred'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          testID="item-detail-back-button"
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { subject, subjectType, meanings, readings, componentRadicals, componentKanji } = data;
  const subjectColor = getSubjectColor(subjectType);
  const primaryMeaning = meanings.find(m => m.primary)?.meaning ?? meanings[0]?.meaning ?? '';

  return (
    <ScrollView style={styles.container} testID="item-detail-screen">
      {/* Header with character and subject type */}
      <View style={[styles.header, { backgroundColor: subjectColor }]} testID="item-detail-header">
        {subject.characters ? (
          <Text style={styles.characterText} testID="item-detail-character">
            {subject.characters}
          </Text>
        ) : (
          <RadicalImage
            characterImages={subject.character_images}
            fallbackText={primaryMeaning.charAt(0).toUpperCase()}
            size={72}
            testID="item-detail-radical-image"
          />
        )}
        <View style={styles.subjectTypeBadge} testID="item-detail-type-badge">
          <Text style={styles.subjectTypeText}>{formatSubjectType(subjectType)}</Text>
        </View>
      </View>

      {/* Item details section */}
      <View style={styles.detailsContainer}>
        <ItemDetails
          subjectType={subjectType}
          meanings={meanings}
          readings={readings}
          meaningMnemonic={subject.meaning_mnemonic}
          readingMnemonic={subject.reading_mnemonic}
          componentRadicals={componentRadicals}
          componentKanji={componentKanji}
          testID="item-detail-details"
        />
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
  },
  characterText: {
    fontSize: FONT_SIZES.display,
    color: COLORS.text.inverse,
    fontWeight: 'bold',
  },
  subjectTypeBadge: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.full,
  },
  subjectTypeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.inverse,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailsContainer: {
    padding: SPACING.lg,
  },
});
