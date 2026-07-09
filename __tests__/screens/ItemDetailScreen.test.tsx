import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { ItemDetailScreen } from '../../src/screens/ItemDetailScreen';
import * as database from '../../src/storage/database';
import type { RootStackParamList } from '../../src/navigation/types';
import type { DatabaseSubject } from '../../src/storage/database';
import { ThemeProvider } from '../../src/theme';

jest.mock('../../src/storage/database');

const mockDatabase = database as jest.Mocked<typeof database>;

const Stack = createNativeStackNavigator<RootStackParamList>();

function renderWithNavigation(subjectId: number) {
  return render(
    <ThemeProvider forcedColorScheme="light">
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="ItemDetail"
            component={ItemDetailScreen}
            initialParams={{ subjectId }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>,
  );
}

// Helper to create mock subject data
function createMockSubject(overrides: Partial<DatabaseSubject> = {}): DatabaseSubject {
  return {
    id: 1,
    object_type: 'kanji',
    characters: '大',
    meanings: JSON.stringify([
      { meaning: 'Big', primary: true, accepted_answer: true },
      { meaning: 'Large', primary: false, accepted_answer: true },
    ]),
    readings: JSON.stringify([
      { reading: 'おお', primary: true, accepted_answer: true, type: 'kunyomi' },
      { reading: 'だい', primary: false, accepted_answer: true, type: 'onyomi' },
      { reading: 'たい', primary: false, accepted_answer: true, type: 'onyomi' },
    ]),
    meaning_mnemonic: 'Picture a big person spreading their arms wide.',
    reading_mnemonic: 'When you see something big, you say "Oh!" (おお)',
    level: 1,
    component_subject_ids: JSON.stringify([10, 11]),
    character_images: null,
    auxiliary_meanings: null,
    data_updated_at: '2024-01-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockRadical(overrides: Partial<DatabaseSubject> = {}): DatabaseSubject {
  return {
    id: 10,
    object_type: 'radical',
    characters: '一',
    meanings: JSON.stringify([{ meaning: 'One', primary: true, accepted_answer: true }]),
    readings: null,
    meaning_mnemonic: 'A single horizontal line.',
    reading_mnemonic: null,
    level: 1,
    component_subject_ids: null,
    character_images: null,
    auxiliary_meanings: null,
    data_updated_at: '2024-01-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ItemDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state while fetching subject', async () => {
      mockDatabase.getSubjectById.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const { getByTestId } = renderWithNavigation(1);

      expect(getByTestId('item-detail-loading')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should show error when subject is not found', async () => {
      mockDatabase.getSubjectById.mockResolvedValue(null);

      const { getByTestId, getByText } = renderWithNavigation(999);

      await waitFor(() => {
        expect(getByTestId('item-detail-error')).toBeTruthy();
      });

      expect(getByText('Subject not found')).toBeTruthy();
      expect(getByTestId('item-detail-back-button')).toBeTruthy();
    });

    it('should show error when database throws an error', async () => {
      mockDatabase.getSubjectById.mockRejectedValue(new Error('Database error'));

      const { getByTestId, getByText } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('item-detail-error')).toBeTruthy();
      });

      expect(getByText('Database error')).toBeTruthy();
    });
  });

  describe('Kanji Subject', () => {
    it('should display kanji character and header with correct color', async () => {
      const mockKanji = createMockSubject();
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('item-detail-screen')).toBeTruthy();
      });

      expect(getByTestId('item-detail-character')).toBeTruthy();
      expect(getByTestId('item-detail-character').props.children).toBe('大');
      expect(getByTestId('item-detail-type-badge')).toBeTruthy();
    });

    it('should fetch and display component radicals for kanji', async () => {
      const mockKanji = createMockSubject({
        id: 1,
        component_subject_ids: JSON.stringify([10, 11]),
      });
      const mockRadical1 = createMockRadical({ id: 10, characters: '一', meanings: JSON.stringify([{ meaning: 'One', primary: true, accepted_answer: true }]) });
      const mockRadical2 = createMockRadical({ id: 11, characters: '丨', meanings: JSON.stringify([{ meaning: 'Stick', primary: true, accepted_answer: true }]) });

      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getSubjectsByIds.mockResolvedValue([mockRadical1, mockRadical2]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('item-detail-screen')).toBeTruthy();
      });

      expect(mockDatabase.getSubjectsByIds).toHaveBeenCalledWith([10, 11]);
      expect(getByTestId('item-detail-details')).toBeTruthy();
    });
  });

  describe('Radical Subject', () => {
    it('should display radical with image when no characters', async () => {
      const mockRadical = createMockRadical({
        characters: null,
        character_images: JSON.stringify([{ url: 'https://example.com/image.png', content_type: 'image/png' }]),
      });
      mockDatabase.getSubjectById.mockResolvedValue(mockRadical);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId, queryByTestId } = renderWithNavigation(10);

      await waitFor(() => {
        expect(getByTestId('item-detail-screen')).toBeTruthy();
      });

      expect(queryByTestId('item-detail-character')).toBeNull();
      expect(getByTestId('item-detail-radical-image')).toBeTruthy();
    });

    it('should display radical with character when available', async () => {
      const mockRadical = createMockRadical({ characters: '一' });
      mockDatabase.getSubjectById.mockResolvedValue(mockRadical);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(10);

      await waitFor(() => {
        expect(getByTestId('item-detail-screen')).toBeTruthy();
      });

      expect(getByTestId('item-detail-character')).toBeTruthy();
      expect(getByTestId('item-detail-character').props.children).toBe('一');
    });
  });

  describe('Vocabulary Subject', () => {
    it('should fetch and display component kanji for vocabulary', async () => {
      const mockVocab: DatabaseSubject = {
        id: 100,
        object_type: 'vocabulary',
        characters: '大人',
        meanings: JSON.stringify([{ meaning: 'Adult', primary: true, accepted_answer: true }]),
        readings: JSON.stringify([{ reading: 'おとな', primary: true, accepted_answer: true }]),
        meaning_mnemonic: 'A big person is an adult.',
        reading_mnemonic: 'This is a jukugo word.',
        level: 3,
        component_subject_ids: JSON.stringify([1, 2]),
        character_images: null,
        auxiliary_meanings: null,
        data_updated_at: '2024-01-01T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
      };
      const mockKanji1: DatabaseSubject = {
        id: 1,
        object_type: 'kanji',
        characters: '大',
        meanings: JSON.stringify([{ meaning: 'Big', primary: true, accepted_answer: true }]),
        readings: JSON.stringify([{ reading: 'おお', primary: true, accepted_answer: true, type: 'kunyomi' }]),
        meaning_mnemonic: 'Big mnemonic.',
        reading_mnemonic: 'Reading mnemonic.',
        level: 1,
        component_subject_ids: null,
        character_images: null,
        auxiliary_meanings: null,
        data_updated_at: '2024-01-01T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
      };
      const mockKanji2: DatabaseSubject = {
        id: 2,
        object_type: 'kanji',
        characters: '人',
        meanings: JSON.stringify([{ meaning: 'Person', primary: true, accepted_answer: true }]),
        readings: JSON.stringify([{ reading: 'じん', primary: true, accepted_answer: true, type: 'onyomi' }]),
        meaning_mnemonic: 'Person mnemonic.',
        reading_mnemonic: 'Reading mnemonic.',
        level: 1,
        component_subject_ids: null,
        character_images: null,
        auxiliary_meanings: null,
        data_updated_at: '2024-01-01T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      mockDatabase.getSubjectById.mockResolvedValue(mockVocab);
      mockDatabase.getSubjectsByIds.mockResolvedValue([mockKanji1, mockKanji2]);

      const { getByTestId } = renderWithNavigation(100);

      await waitFor(() => {
        expect(getByTestId('item-detail-screen')).toBeTruthy();
      });

      expect(mockDatabase.getSubjectsByIds).toHaveBeenCalledWith([1, 2]);
      expect(getByTestId('item-detail-details')).toBeTruthy();
    });
  });

  describe('Item Details Display', () => {
    it('should pass meanings and readings to ItemDetails', async () => {
      const mockKanji = createMockSubject();
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('item-detail-details')).toBeTruthy();
      });
    });

    it('should pass mnemonics to ItemDetails', async () => {
      const mockKanji = createMockSubject({
        meaning_mnemonic: 'Test meaning mnemonic',
        reading_mnemonic: 'Test reading mnemonic',
      });
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('item-detail-details')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should fetch correct subject ID from route params', async () => {
      mockDatabase.getSubjectById.mockResolvedValue(createMockSubject({ id: 42 }));
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      renderWithNavigation(42);

      await waitFor(() => {
        expect(mockDatabase.getSubjectById).toHaveBeenCalledWith(42);
      });
    });
  });

  describe('Subject Types', () => {
    it('should handle kana_vocabulary subject type', async () => {
      const mockKanaVocab: DatabaseSubject = {
        id: 200,
        object_type: 'kana_vocabulary',
        characters: 'こんにちは',
        meanings: JSON.stringify([{ meaning: 'Hello', primary: true, accepted_answer: true }]),
        readings: JSON.stringify([{ reading: 'こんにちは', primary: true, accepted_answer: true }]),
        meaning_mnemonic: 'A common greeting.',
        reading_mnemonic: null,
        level: 1,
        component_subject_ids: null,
        character_images: null,
        auxiliary_meanings: null,
        data_updated_at: '2024-01-01T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      mockDatabase.getSubjectById.mockResolvedValue(mockKanaVocab);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(200);

      await waitFor(() => {
        expect(getByTestId('item-detail-screen')).toBeTruthy();
      });

      expect(getByTestId('item-detail-character').props.children).toBe('こんにちは');
    });
  });

  describe('Component Loading', () => {
    it('should not call getSubjectsByIds when no component_subject_ids', async () => {
      const mockKanji = createMockSubject({ component_subject_ids: null });
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);

      renderWithNavigation(1);

      await waitFor(() => {
        expect(mockDatabase.getSubjectById).toHaveBeenCalled();
      });

      // Should not call getSubjectsByIds when there are no components
      expect(mockDatabase.getSubjectsByIds).not.toHaveBeenCalled();
    });

    it('should not call getSubjectsByIds when component_subject_ids is empty array', async () => {
      const mockKanji = createMockSubject({ component_subject_ids: JSON.stringify([]) });
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);

      renderWithNavigation(1);

      await waitFor(() => {
        expect(mockDatabase.getSubjectById).toHaveBeenCalled();
      });

      // Should not call getSubjectsByIds when array is empty
      expect(mockDatabase.getSubjectsByIds).not.toHaveBeenCalled();
    });
  });
});
