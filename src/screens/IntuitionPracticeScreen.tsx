import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import type { DictionaryVocab } from '../types/dictionary';
import type { FlipCardSessionResult } from '../components/quiz/FlipCardEngine';
import { FlipCardEngine } from '../components/quiz/FlipCardEngine';
import { SessionResults } from '../components/SessionResults';
import { LoadingView } from '../components';
import {
  getLearnedKanjiCharacters,
  getWaniKaniVocabCharacters,
  getIntuitionPracticeItems,
} from '../storage';
import { useTheme } from '../theme';
import { SPACING, FONT_SIZES } from '../theme';

type IntuitionPracticeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'IntuitionPractice'
>;

const SESSION_SIZE = 20;

export function IntuitionPracticeScreen() {
  const navigation = useNavigation<IntuitionPracticeNavigationProp>();
  const { colors } = useTheme();

  const [phase, setPhase] = useState<
    'loading' | 'practicing' | 'results' | 'empty'
  >('loading');
  const [items, setItems] = useState<DictionaryVocab[]>([]);
  const [result, setResult] = useState<FlipCardSessionResult | null>(null);

  useEffect(() => {
    const loadItems = async () => {
      const learnedKanji = await getLearnedKanjiCharacters();
      if (learnedKanji.size === 0) {
        setPhase('empty');
        return;
      }

      const excludeCharacters = await getWaniKaniVocabCharacters();
      const candidates = await getIntuitionPracticeItems(
        learnedKanji,
        excludeCharacters,
        SESSION_SIZE,
      );

      if (candidates.length === 0) {
        setPhase('empty');
        return;
      }

      setItems(candidates);
      setPhase('practicing');
    };

    loadItems();
  }, []);

  const handleComplete = useCallback((sessionResult: FlipCardSessionResult) => {
    setResult(sessionResult);
    setPhase('results');
  }, []);

  const handleDone = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  const dynamicStyles = useMemo(
    () => ({
      emptyTitle: { color: colors.text.primary },
      emptyMessage: { color: colors.text.secondary },
      attribution: { color: colors.text.tertiary },
    }),
    [colors],
  );

  if (phase === 'loading') {
    return (
      <LoadingView
        message="Loading vocabulary..."
        testID="intuition-practice-loading"
      />
    );
  }

  if (phase === 'empty') {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: colors.background.primary }]}
        testID="intuition-practice-empty"
      >
        <Text style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>
          No Vocabulary Available
        </Text>
        <Text style={[styles.emptyMessage, dynamicStyles.emptyMessage]}>
          Learn more kanji to unlock this mode
        </Text>
      </View>
    );
  }

  if (phase === 'results' && result) {
    return (
      <SessionResults
        correct={result.correct}
        total={result.total}
        onDone={handleDone}
        testID="intuition-practice-results"
      />
    );
  }

  return (
    <View style={styles.container} testID="intuition-practice-screen">
      <FlipCardEngine
        items={items}
        onComplete={handleComplete}
        testID="intuition-practice-engine"
      />
      <Text
        style={[styles.attribution, dynamicStyles.attribution]}
        testID="intuition-practice-attribution"
      >
        Dictionary data from JMdict by EDRDG, CC-BY-SA
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
  },
  emptyMessage: {
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
    lineHeight: FONT_SIZES.xxl,
  },
  attribution: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
});
