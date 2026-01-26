import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  useTheme,
  SUBJECT_COLORS,
  TEXT_STYLES,
} from '../theme';
import { searchSubjects, type SearchResult, type SubjectType } from '../storage';
import { romajiToHiragana } from '../utils/romajiToHiragana';
import type { RootStackParamList } from '../navigation/types';

interface Meaning {
  meaning: string;
  primary: boolean;
  accepted_answer: boolean;
}

function getPrimaryMeaning(meaningsJson: string): string {
  try {
    const meanings: Meaning[] = JSON.parse(meaningsJson);
    const primary = meanings.find(m => m.primary);
    return primary?.meaning ?? meanings[0]?.meaning ?? '';
  } catch {
    return '';
  }
}

function getSubjectTypeLabel(type: SubjectType): string {
  switch (type) {
    case 'radical':
      return 'Radical';
    case 'kanji':
      return 'Kanji';
    case 'vocabulary':
    case 'kana_vocabulary':
      return 'Vocabulary';
    default:
      return '';
  }
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function SearchScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus the input when screen opens
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length === 0) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    try {
      const hiraganaQuery = romajiToHiragana(searchQuery);
      const searchResults = await searchSubjects(searchQuery, hiraganaQuery, 100);
      setResults(searchResults);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    }
  }, []);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer (300ms)
    debounceTimerRef.current = setTimeout(() => {
      performSearch(text);
    }, 300);
  }, [performSearch]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const dynamicStyles = useMemo(
    () => ({
      container: {
        backgroundColor: theme.colors.background.primary,
      },
      input: {
        borderColor: theme.colors.text.tertiary,
        backgroundColor: theme.colors.background.secondary,
        color: theme.colors.text.primary,
      },
      emptyStateText: {
        color: theme.colors.text.secondary,
      },
      resultsCountText: {
        color: theme.colors.text.secondary,
      },
      resultItemBorder: {
        borderBottomColor: theme.colors.border.light,
      },
      resultMeaningText: {
        color: theme.colors.text.primary,
      },
    }),
    [theme],
  );

  const handleResultPress = useCallback((item: SearchResult) => {
    switch (item.object_type) {
      case 'radical':
        navigation.navigate('RadicalDetail', { subjectId: item.id });
        break;
      case 'kanji':
        navigation.navigate('KanjiDetail', { subjectId: item.id });
        break;
      case 'vocabulary':
      case 'kana_vocabulary':
        navigation.navigate('VocabularyDetail', { subjectId: item.id });
        break;
    }
  }, [navigation]);

  const renderResultItem = useCallback(({ item }: { item: SearchResult }) => {
    const primaryMeaning = getPrimaryMeaning(item.meanings);
    const typeLabel = getSubjectTypeLabel(item.object_type);
    const badgeColor = SUBJECT_COLORS[item.object_type];

    return (
      <TouchableOpacity
        style={[styles.resultItem, dynamicStyles.resultItemBorder]}
        testID={`search-result-${item.id}`}
        onPress={() => handleResultPress(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.resultCharacter, TEXT_STYLES.japaneseDisplay]}>
          {item.characters ?? '?'}
        </Text>
        <View style={styles.resultInfo}>
          <Text style={[styles.resultMeaning, dynamicStyles.resultMeaningText]} numberOfLines={1}>
            {primaryMeaning}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: badgeColor }]}>
            <Text style={styles.typeBadgeText}>{typeLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [dynamicStyles, handleResultPress]);

  const keyExtractor = useCallback((item: SearchResult) => item.id.toString(), []);

  const showEmptyState = query.trim().length === 0 && !hasSearched;
  const showNoResults = hasSearched && results.length === 0 && query.trim().length > 0;
  const showResults = results.length > 0;

  return (
    <View style={[styles.container, dynamicStyles.container]} testID="search-screen">
      <View style={styles.searchContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, dynamicStyles.input]}
          placeholder="Search radicals, kanji, vocabulary..."
          placeholderTextColor={theme.colors.text.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          value={query}
          onChangeText={handleQueryChange}
          testID="search-input"
        />
      </View>

      {showEmptyState && (
        <View style={styles.emptyStateContainer} testID="empty-state">
          <Text style={[styles.emptyStateText, dynamicStyles.emptyStateText]}>
            Enter a search term to find learned items
          </Text>
        </View>
      )}

      {showNoResults && (
        <View style={styles.emptyStateContainer} testID="no-results">
          <Text style={[styles.emptyStateText, dynamicStyles.emptyStateText]}>
            No results found
          </Text>
        </View>
      )}

      {showResults && (
        <View style={styles.resultsContainer}>
          <Text style={[styles.resultsCount, dynamicStyles.resultsCountText]} testID="results-count">
            {results.length} {results.length === 1 ? 'result' : 'results'}
          </Text>
          <FlatList
            data={results}
            renderItem={renderResultItem}
            keyExtractor={keyExtractor}
            style={styles.resultsList}
            testID="results-list"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.base,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
    lineHeight: FONT_SIZES.xl,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  resultsCount: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  resultCharacter: {
    fontSize: FONT_SIZES.xxxl,
    width: 56,
    textAlign: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultMeaning: {
    fontSize: FONT_SIZES.base,
    flex: 1,
    marginRight: SPACING.sm,
  },
  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  typeBadgeText: {
    color: COLORS.neutral.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
});
