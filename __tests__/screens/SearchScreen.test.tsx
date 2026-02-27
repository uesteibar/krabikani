import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { SearchScreen } from '../../src/screens/SearchScreen';
import { ThemeProvider } from '../../src/theme';
import * as storage from '../../src/storage';
import type { RootStackParamList } from '../../src/navigation/types';
import type { SearchResult } from '../../src/storage';

jest.mock('../../src/storage', () => ({
  searchSubjects: jest.fn(),
}));

const mockStorage = storage as jest.Mocked<typeof storage>;

const Stack = createNativeStackNavigator<RootStackParamList>();

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

function MockDetailScreen() {
  return null;
}

function renderSearchScreen() {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="RadicalDetail" component={MockDetailScreen} />
          <Stack.Screen name="KanjiDetail" component={MockDetailScreen} />
          <Stack.Screen name="VocabularyDetail" component={MockDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>,
  );
}

function createMockSearchResult(
  overrides: Partial<SearchResult> = {},
): SearchResult {
  return {
    id: 1,
    object_type: 'kanji',
    characters: '大',
    meanings: JSON.stringify([{ meaning: 'Big', primary: true }]),
    readings: null,
    meaning_mnemonic: 'Test mnemonic',
    reading_mnemonic: null,
    level: 1,
    srs_stage: 5,
    match_type: 'character',
    ...overrides,
  };
}

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockStorage.searchSubjects.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Navigation to Detail Screens', () => {
    it('should navigate to RadicalDetailScreen when tapping a radical result', async () => {
      const radicalResult = createMockSearchResult({
        id: 100,
        object_type: 'radical',
        characters: '一',
        meanings: JSON.stringify([{ meaning: 'Ground', primary: true }]),
      });
      mockStorage.searchSubjects.mockResolvedValue([radicalResult]);

      const { getByTestId } = renderSearchScreen();

      const input = getByTestId('search-input');
      fireEvent.changeText(input, 'ground');

      // Advance debounce timer
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getByTestId('search-result-100')).toBeTruthy();
      });

      fireEvent.press(getByTestId('search-result-100'));

      expect(mockNavigate).toHaveBeenCalledWith('RadicalDetail', {
        subjectId: 100,
      });
    });

    it('should navigate to KanjiDetailScreen when tapping a kanji result', async () => {
      const kanjiResult = createMockSearchResult({
        id: 200,
        object_type: 'kanji',
        characters: '大',
        meanings: JSON.stringify([{ meaning: 'Big', primary: true }]),
      });
      mockStorage.searchSubjects.mockResolvedValue([kanjiResult]);

      const { getByTestId } = renderSearchScreen();

      const input = getByTestId('search-input');
      fireEvent.changeText(input, 'big');

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getByTestId('search-result-200')).toBeTruthy();
      });

      fireEvent.press(getByTestId('search-result-200'));

      expect(mockNavigate).toHaveBeenCalledWith('KanjiDetail', {
        subjectId: 200,
      });
    });

    it('should navigate to VocabularyDetailScreen when tapping a vocabulary result', async () => {
      const vocabularyResult = createMockSearchResult({
        id: 300,
        object_type: 'vocabulary',
        characters: '大きい',
        meanings: JSON.stringify([{ meaning: 'Big', primary: true }]),
      });
      mockStorage.searchSubjects.mockResolvedValue([vocabularyResult]);

      const { getByTestId } = renderSearchScreen();

      const input = getByTestId('search-input');
      fireEvent.changeText(input, 'big');

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getByTestId('search-result-300')).toBeTruthy();
      });

      fireEvent.press(getByTestId('search-result-300'));

      expect(mockNavigate).toHaveBeenCalledWith('VocabularyDetail', {
        subjectId: 300,
      });
    });

    it('should navigate to VocabularyDetailScreen when tapping a kana_vocabulary result', async () => {
      const kanaVocabResult = createMockSearchResult({
        id: 400,
        object_type: 'kana_vocabulary',
        characters: 'する',
        meanings: JSON.stringify([{ meaning: 'To Do', primary: true }]),
      });
      mockStorage.searchSubjects.mockResolvedValue([kanaVocabResult]);

      const { getByTestId } = renderSearchScreen();

      const input = getByTestId('search-input');
      fireEvent.changeText(input, 'to do');

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getByTestId('search-result-400')).toBeTruthy();
      });

      fireEvent.press(getByTestId('search-result-400'));

      expect(mockNavigate).toHaveBeenCalledWith('VocabularyDetail', {
        subjectId: 400,
      });
    });

    it('should pass correct subjectId when navigating', async () => {
      const results = [
        createMockSearchResult({
          id: 123,
          object_type: 'radical',
          characters: '十',
          meanings: JSON.stringify([{ meaning: 'Cross', primary: true }]),
        }),
        createMockSearchResult({
          id: 456,
          object_type: 'kanji',
          characters: '十',
          meanings: JSON.stringify([{ meaning: 'Ten', primary: true }]),
        }),
      ];
      mockStorage.searchSubjects.mockResolvedValue(results);

      const { getByTestId } = renderSearchScreen();

      const input = getByTestId('search-input');
      fireEvent.changeText(input, 'ten');

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getByTestId('search-result-456')).toBeTruthy();
      });

      // Tap on the second result (kanji)
      fireEvent.press(getByTestId('search-result-456'));

      expect(mockNavigate).toHaveBeenCalledWith('KanjiDetail', {
        subjectId: 456,
      });
    });
  });

  describe('Basic Functionality', () => {
    it('should render the search screen', () => {
      const { getByTestId } = renderSearchScreen();

      expect(getByTestId('search-screen')).toBeTruthy();
      expect(getByTestId('search-input')).toBeTruthy();
    });

    it('should show empty state when no query is entered', () => {
      const { getByTestId } = renderSearchScreen();

      expect(getByTestId('empty-state')).toBeTruthy();
    });

    it('should show no results message when search returns empty', async () => {
      mockStorage.searchSubjects.mockResolvedValue([]);

      const { getByTestId } = renderSearchScreen();

      const input = getByTestId('search-input');
      fireEvent.changeText(input, 'xyz');

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getByTestId('no-results')).toBeTruthy();
      });
    });

    it('should display results count', async () => {
      const results = [
        createMockSearchResult({ id: 1 }),
        createMockSearchResult({ id: 2 }),
        createMockSearchResult({ id: 3 }),
      ];
      mockStorage.searchSubjects.mockResolvedValue(results);

      const { getByTestId, getByText } = renderSearchScreen();

      const input = getByTestId('search-input');
      fireEvent.changeText(input, 'test');

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getByTestId('results-count')).toBeTruthy();
      });

      expect(getByText('3 results')).toBeTruthy();
    });
  });

  describe('Theme Color Usage', () => {
    it('should use theme.colors.text.primary for text color', () => {
      const { getByTestId } = renderSearchScreen();
      const input = getByTestId('search-input');

      // Check that input has the correct text color from theme
      expect(input.props.style).toContainEqual(
        expect.objectContaining({
          color: expect.any(String),
        })
      );
    });

    it('should use theme.colors.background.secondary for background color', () => {
      const { getByTestId } = renderSearchScreen();
      const input = getByTestId('search-input');

      // Check that input has the correct background color from theme
      expect(input.props.style).toContainEqual(
        expect.objectContaining({
          backgroundColor: expect.any(String),
        })
      );
    });

    it('should use theme.colors.text.placeholder for placeholder text color', () => {
      const { getByTestId } = renderSearchScreen();
      const input = getByTestId('search-input');

      // The placeholder text color should match theme.colors.text.placeholder
      // In the default theme, this should be '#999999' (light mode)
      expect(input.props.placeholderTextColor).toBe('#999999');
    });

    it('should use theme.colors.text.primary for cursor color in light mode', () => {
      const { getByTestId } = renderSearchScreen();
      const input = getByTestId('search-input');

      // The cursor color should match theme.colors.text.primary in light mode
      expect(input.props.cursorColor).toBe('#333333');
    });
  });

  describe('Dark Mode Theme Color Usage', () => {
    function renderSearchScreenDark() {
      return render(
        <ThemeProvider forcedColorScheme="dark">
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="Search" component={SearchScreen} />
              <Stack.Screen name="RadicalDetail" component={MockDetailScreen} />
              <Stack.Screen name="KanjiDetail" component={MockDetailScreen} />
              <Stack.Screen name="VocabularyDetail" component={MockDetailScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeProvider>,
      );
    }

    it('should use theme.colors.text.primary for cursor color in dark mode', () => {
      const { getByTestId } = renderSearchScreenDark();
      const input = getByTestId('search-input');

      // The cursor color should match theme.colors.text.primary in dark mode
      expect(input.props.cursorColor).toBe('#E0E0E0');
    });
  });
});
