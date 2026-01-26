import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { VocabularyDetailScreen } from '../../src/screens/VocabularyDetailScreen';
import { ThemeProvider } from '../../src/theme';
import * as database from '../../src/storage/database';
import type { RootStackParamList } from '../../src/navigation/types';
import type { DatabaseSubject, DatabaseAssignment } from '../../src/storage/database';

jest.mock('../../src/storage/database');

const mockDatabase = database as jest.Mocked<typeof database>;

const Stack = createNativeStackNavigator<RootStackParamList>();

function renderWithNavigation(subjectId: number) {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="VocabularyDetail"
            component={VocabularyDetailScreen}
            initialParams={{ subjectId }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>,
  );
}

function createMockVocabulary(overrides: Partial<DatabaseSubject> = {}): DatabaseSubject {
  return {
    id: 1,
    object_type: 'vocabulary',
    characters: '大きい',
    meanings: JSON.stringify([
      { meaning: 'Big', primary: true, accepted_answer: true },
      { meaning: 'Large', primary: false, accepted_answer: true },
    ]),
    readings: JSON.stringify([
      { reading: 'おおきい', primary: true, accepted_answer: true },
    ]),
    meaning_mnemonic: 'Something big and large.',
    reading_mnemonic: 'You say "oh key" when you see something big.',
    level: 1,
    component_subject_ids: JSON.stringify([10]),
    character_images: null,
    data_updated_at: '2024-01-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockKanaVocabulary(overrides: Partial<DatabaseSubject> = {}): DatabaseSubject {
  return {
    id: 2,
    object_type: 'kana_vocabulary',
    characters: 'する',
    meanings: JSON.stringify([
      { meaning: 'To Do', primary: true, accepted_answer: true },
    ]),
    readings: JSON.stringify([
      { reading: 'する', primary: true, accepted_answer: true },
    ]),
    meaning_mnemonic: 'This is a kana-only word.',
    reading_mnemonic: null,
    level: 1,
    component_subject_ids: null,
    character_images: null,
    data_updated_at: '2024-01-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockKanji(overrides: Partial<DatabaseSubject> = {}): DatabaseSubject {
  return {
    id: 10,
    object_type: 'kanji',
    characters: '大',
    meanings: JSON.stringify([{ meaning: 'Big', primary: true, accepted_answer: true }]),
    readings: JSON.stringify([
      { reading: 'おお', primary: true, accepted_answer: true, type: 'kunyomi' },
    ]),
    meaning_mnemonic: 'A big person spreading their arms.',
    reading_mnemonic: 'Oh!',
    level: 1,
    component_subject_ids: null,
    character_images: null,
    data_updated_at: '2024-01-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockAssignment(overrides: Partial<DatabaseAssignment> = {}): DatabaseAssignment {
  return {
    id: 100,
    subject_id: 1,
    srs_stage: 5,
    available_at: '2024-01-01T00:00:00.000Z',
    started_at: '2024-01-01T00:00:00.000Z',
    unlocked_at: '2024-01-01T00:00:00.000Z',
    data_updated_at: '2024-01-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('VocabularyDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state while fetching vocabulary', async () => {
      mockDatabase.getSubjectById.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const { getByTestId } = renderWithNavigation(1);

      expect(getByTestId('vocabulary-detail-loading')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should show error when vocabulary is not found', async () => {
      mockDatabase.getSubjectById.mockResolvedValue(null);

      const { getByTestId, getByText } = renderWithNavigation(999);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-error')).toBeTruthy();
      });

      expect(getByText('Vocabulary not found')).toBeTruthy();
      expect(getByTestId('vocabulary-detail-back-button')).toBeTruthy();
    });

    it('should show error when subject is not a vocabulary item', async () => {
      const mockRadical: DatabaseSubject = {
        id: 1,
        object_type: 'radical',
        characters: '一',
        meanings: JSON.stringify([{ meaning: 'One', primary: true }]),
        readings: null,
        meaning_mnemonic: 'A line.',
        reading_mnemonic: null,
        level: 1,
        component_subject_ids: null,
        character_images: null,
        data_updated_at: '2024-01-01T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
      };
      mockDatabase.getSubjectById.mockResolvedValue(mockRadical);

      const { getByTestId, getByText } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-error')).toBeTruthy();
      });

      expect(getByText('This is not a vocabulary item')).toBeTruthy();
    });

    it('should show error when database throws an error', async () => {
      mockDatabase.getSubjectById.mockRejectedValue(new Error('Database error'));

      const { getByTestId, getByText } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-error')).toBeTruthy();
      });

      expect(getByText('Database error')).toBeTruthy();
    });
  });

  describe('Vocabulary Display', () => {
    it('should display vocabulary characters and header', async () => {
      const mockVocabulary = createMockVocabulary();
      mockDatabase.getSubjectById.mockResolvedValue(mockVocabulary);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-screen')).toBeTruthy();
      });

      expect(getByTestId('vocabulary-detail-character')).toBeTruthy();
      expect(getByTestId('vocabulary-detail-character').props.children).toBe('大きい');
      expect(getByTestId('vocabulary-detail-type-badge')).toBeTruthy();
      expect(getByTestId('vocabulary-detail-header')).toBeTruthy();
    });

    it('should display all meanings with primary marked', async () => {
      const mockVocabulary = createMockVocabulary();
      mockDatabase.getSubjectById.mockResolvedValue(mockVocabulary);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-meanings-section')).toBeTruthy();
      });

      expect(getByTestId('vocabulary-detail-meaning-0')).toBeTruthy();
      expect(getByTestId('vocabulary-detail-meaning-1')).toBeTruthy();
    });

    it('should display readings', async () => {
      const mockVocabulary = createMockVocabulary({
        readings: JSON.stringify([
          { reading: 'おおきい', primary: true, accepted_answer: true },
          { reading: 'おおきな', primary: false, accepted_answer: true },
        ]),
      });
      mockDatabase.getSubjectById.mockResolvedValue(mockVocabulary);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-readings-section')).toBeTruthy();
      });

      // Use testID queries since text contains nested Text elements for "(primary)" label
      expect(getByTestId('vocabulary-detail-reading-0')).toBeTruthy();
      expect(getByTestId('vocabulary-detail-reading-1')).toBeTruthy();
    });
  });

  describe('Kana Vocabulary', () => {
    it('should display kana vocabulary with correct type badge', async () => {
      const mockKanaVocab = createMockKanaVocabulary();
      mockDatabase.getSubjectById.mockResolvedValue(mockKanaVocab);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);

      const { getByTestId, getByText } = renderWithNavigation(2);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-screen')).toBeTruthy();
      });

      expect(getByText('Kana Vocabulary')).toBeTruthy();
    });

    it('should not show reading mnemonic for kana vocabulary without one', async () => {
      const mockKanaVocab = createMockKanaVocabulary({ reading_mnemonic: null });
      mockDatabase.getSubjectById.mockResolvedValue(mockKanaVocab);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);

      const { getByTestId, queryByTestId } = renderWithNavigation(2);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-screen')).toBeTruthy();
      });

      expect(queryByTestId('vocabulary-detail-reading-mnemonic-section')).toBeNull();
    });

    it('should not fetch component kanji for kana vocabulary', async () => {
      const mockKanaVocab = createMockKanaVocabulary();
      mockDatabase.getSubjectById.mockResolvedValue(mockKanaVocab);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);

      renderWithNavigation(2);

      await waitFor(() => {
        expect(mockDatabase.getSubjectById).toHaveBeenCalledWith(2);
      });

      expect(mockDatabase.getSubjectsByIds).not.toHaveBeenCalled();
    });
  });

  describe('Component Kanji', () => {
    it('should fetch and display component kanji', async () => {
      const mockVocabulary = createMockVocabulary({
        component_subject_ids: JSON.stringify([10]),
      });
      const mockKanji = createMockKanji({
        id: 10,
        characters: '大',
        meanings: JSON.stringify([{ meaning: 'Big', primary: true, accepted_answer: true }]),
      });

      mockDatabase.getSubjectById.mockResolvedValue(mockVocabulary);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([mockKanji]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-kanji-section')).toBeTruthy();
      });

      expect(mockDatabase.getSubjectsByIds).toHaveBeenCalledWith([10]);
      expect(getByTestId('vocabulary-detail-kanji-10')).toBeTruthy();
    });

    it('should not show kanji section when no component_subject_ids', async () => {
      const mockVocabulary = createMockVocabulary({ component_subject_ids: null });
      mockDatabase.getSubjectById.mockResolvedValue(mockVocabulary);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);

      const { getByTestId, queryByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-screen')).toBeTruthy();
      });

      expect(queryByTestId('vocabulary-detail-kanji-section')).toBeNull();
    });
  });

  describe('Mnemonics Display', () => {
    it('should display meaning mnemonic', async () => {
      const mockVocabulary = createMockVocabulary({
        meaning_mnemonic: 'Test meaning mnemonic',
      });
      mockDatabase.getSubjectById.mockResolvedValue(mockVocabulary);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-meaning-mnemonic-section')).toBeTruthy();
      });

      expect(getByTestId('vocabulary-detail-meaning-mnemonic')).toBeTruthy();
    });

    it('should display reading mnemonic when available', async () => {
      const mockVocabulary = createMockVocabulary({
        reading_mnemonic: 'Test reading mnemonic',
      });
      mockDatabase.getSubjectById.mockResolvedValue(mockVocabulary);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-reading-mnemonic-section')).toBeTruthy();
      });

      expect(getByTestId('vocabulary-detail-reading-mnemonic')).toBeTruthy();
    });

    it('should not display reading mnemonic section when null', async () => {
      const mockVocabulary = createMockVocabulary({ reading_mnemonic: null });
      mockDatabase.getSubjectById.mockResolvedValue(mockVocabulary);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId, queryByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-screen')).toBeTruthy();
      });

      expect(queryByTestId('vocabulary-detail-reading-mnemonic-section')).toBeNull();
    });
  });

  describe('SRS Badge', () => {
    it('should display SRS level badge when assignment exists', async () => {
      const mockVocabulary = createMockVocabulary();
      const mockAssignment = createMockAssignment({ srs_stage: 5 });
      mockDatabase.getSubjectById.mockResolvedValue(mockVocabulary);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(mockAssignment);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-srs-badge')).toBeTruthy();
      });
    });

    it('should not display SRS badge when no assignment', async () => {
      const mockVocabulary = createMockVocabulary();
      mockDatabase.getSubjectById.mockResolvedValue(mockVocabulary);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId, queryByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('vocabulary-detail-screen')).toBeTruthy();
      });

      expect(queryByTestId('vocabulary-detail-srs-badge')).toBeNull();
    });
  });

  describe('Navigation', () => {
    it('should fetch correct subject ID from route params', async () => {
      mockDatabase.getSubjectById.mockResolvedValue(createMockVocabulary({ id: 42 }));
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      renderWithNavigation(42);

      await waitFor(() => {
        expect(mockDatabase.getSubjectById).toHaveBeenCalledWith(42);
      });
    });
  });
});
