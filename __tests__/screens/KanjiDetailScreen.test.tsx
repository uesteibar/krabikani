import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { KanjiDetailScreen } from '../../src/screens/KanjiDetailScreen';
import { ThemeProvider } from '../../src/theme';
import * as database from '../../src/storage/database';
import type { RootStackParamList } from '../../src/navigation/types';
import type {
  DatabaseSubject,
  DatabaseAssignment,
} from '../../src/storage/database';

jest.mock('../../src/storage/database');

const mockDatabase = database as jest.Mocked<typeof database>;

const Stack = createNativeStackNavigator<RootStackParamList>();

function renderWithNavigation(subjectId: number) {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="KanjiDetail"
            component={KanjiDetailScreen}
            initialParams={{ subjectId }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>,
  );
}

function createMockKanji(
  overrides: Partial<DatabaseSubject> = {},
): DatabaseSubject {
  return {
    id: 1,
    object_type: 'kanji',
    characters: '大',
    meanings: JSON.stringify([
      { meaning: 'Big', primary: true, accepted_answer: true },
      { meaning: 'Large', primary: false, accepted_answer: true },
    ]),
    readings: JSON.stringify([
      {
        reading: 'おお',
        primary: true,
        accepted_answer: true,
        type: 'kunyomi',
      },
      {
        reading: 'だい',
        primary: false,
        accepted_answer: true,
        type: 'onyomi',
      },
      {
        reading: 'たい',
        primary: false,
        accepted_answer: true,
        type: 'onyomi',
      },
    ]),
    meaning_mnemonic: 'Picture a big person spreading their arms wide.',
    reading_mnemonic: 'When you see something big, you say "Oh!" (おお)',
    level: 1,
    component_subject_ids: JSON.stringify([10, 11]),
    character_images: null,
    data_updated_at: '2024-01-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockRadical(
  overrides: Partial<DatabaseSubject> = {},
): DatabaseSubject {
  return {
    id: 10,
    object_type: 'radical',
    characters: '一',
    meanings: JSON.stringify([
      { meaning: 'One', primary: true, accepted_answer: true },
    ]),
    readings: null,
    meaning_mnemonic: 'A single horizontal line.',
    reading_mnemonic: null,
    level: 1,
    component_subject_ids: null,
    character_images: null,
    data_updated_at: '2024-01-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockAssignment(
  overrides: Partial<DatabaseAssignment> = {},
): DatabaseAssignment {
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

describe('KanjiDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state while fetching kanji', async () => {
      mockDatabase.getSubjectById.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const { getByTestId } = renderWithNavigation(1);

      expect(getByTestId('kanji-detail-loading')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should show error when kanji is not found', async () => {
      mockDatabase.getSubjectById.mockResolvedValue(null);

      const { getByTestId, getByText } = renderWithNavigation(999);

      await waitFor(() => {
        expect(getByTestId('kanji-detail-error')).toBeTruthy();
      });

      expect(getByText('Kanji not found')).toBeTruthy();
      expect(getByTestId('kanji-detail-back-button')).toBeTruthy();
    });

    it('should show error when subject is not a kanji', async () => {
      const mockRadical = createMockRadical();
      mockDatabase.getSubjectById.mockResolvedValue(mockRadical);

      const { getByTestId, getByText } = renderWithNavigation(10);

      await waitFor(() => {
        expect(getByTestId('kanji-detail-error')).toBeTruthy();
      });

      expect(getByText('This is not a kanji')).toBeTruthy();
    });

    it('should show error when database throws an error', async () => {
      mockDatabase.getSubjectById.mockRejectedValue(
        new Error('Database error'),
      );

      const { getByTestId, getByText } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('kanji-detail-error')).toBeTruthy();
      });

      expect(getByText('Database error')).toBeTruthy();
    });
  });

  describe('Kanji Display', () => {
    it('should display kanji character and header', async () => {
      const mockKanji = createMockKanji();
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('kanji-detail-screen')).toBeTruthy();
      });

      expect(getByTestId('kanji-detail-character')).toBeTruthy();
      expect(getByTestId('kanji-detail-character').props.children).toBe('大');
      expect(getByTestId('kanji-detail-header')).toBeTruthy();
    });

    it('should display all meanings with primary marked', async () => {
      const mockKanji = createMockKanji();
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('kanji-detail-meanings-section')).toBeTruthy();
      });

      // Check that meaning elements are rendered with correct testIDs
      expect(getByTestId('kanji-detail-meaning-0')).toBeTruthy();
      expect(getByTestId('kanji-detail-meaning-1')).toBeTruthy();
    });
  });

  describe('Readings Display', () => {
    it('should display readings grouped by type', async () => {
      const mockKanji = createMockKanji({
        readings: JSON.stringify([
          {
            reading: 'おお',
            primary: true,
            accepted_answer: true,
            type: 'kunyomi',
          },
          {
            reading: 'だい',
            primary: false,
            accepted_answer: true,
            type: 'onyomi',
          },
        ]),
      });
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId, getByText } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('kanji-detail-readings-section')).toBeTruthy();
      });

      expect(getByTestId('kanji-detail-onyomi')).toBeTruthy();
      expect(getByTestId('kanji-detail-kunyomi')).toBeTruthy();
      expect(getByText('おお')).toBeTruthy();
      expect(getByText('だい')).toBeTruthy();
    });

    it('should display nanori readings when available', async () => {
      const mockKanji = createMockKanji({
        readings: JSON.stringify([
          {
            reading: 'おお',
            primary: true,
            accepted_answer: true,
            type: 'kunyomi',
          },
          {
            reading: 'まさる',
            primary: false,
            accepted_answer: false,
            type: 'nanori',
          },
        ]),
      });
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId, getByText } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('kanji-detail-nanori')).toBeTruthy();
      });

      expect(getByText('まさる')).toBeTruthy();
    });
  });

  describe('Component Radicals', () => {
    it('should fetch and display component radicals', async () => {
      const mockKanji = createMockKanji({
        component_subject_ids: JSON.stringify([10, 11]),
      });
      const mockRadical1 = createMockRadical({
        id: 10,
        characters: '一',
        meanings: JSON.stringify([
          { meaning: 'One', primary: true, accepted_answer: true },
        ]),
      });
      const mockRadical2 = createMockRadical({
        id: 11,
        characters: '丨',
        meanings: JSON.stringify([
          { meaning: 'Stick', primary: true, accepted_answer: true },
        ]),
      });

      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([
        mockRadical1,
        mockRadical2,
      ]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('kanji-detail-radicals-section')).toBeTruthy();
      });

      expect(mockDatabase.getSubjectsByIds).toHaveBeenCalledWith([10, 11]);
      expect(getByTestId('kanji-detail-radical-10')).toBeTruthy();
      expect(getByTestId('kanji-detail-radical-11')).toBeTruthy();
    });

    it('should display radical image when no characters available', async () => {
      const mockKanji = createMockKanji({
        component_subject_ids: JSON.stringify([10]),
      });
      const mockRadical = createMockRadical({
        id: 10,
        characters: null,
        character_images: JSON.stringify([
          { url: 'https://example.com/image.png', content_type: 'image/png' },
        ]),
      });

      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([mockRadical]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('kanji-detail-radicals-section')).toBeTruthy();
      });

      expect(getByTestId('kanji-detail-radical-image-10')).toBeTruthy();
    });

    it('should not show radicals section when no component_subject_ids', async () => {
      const mockKanji = createMockKanji({ component_subject_ids: null });
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);

      const { getByTestId, queryByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('kanji-detail-screen')).toBeTruthy();
      });

      expect(queryByTestId('kanji-detail-radicals-section')).toBeNull();
      expect(mockDatabase.getSubjectsByIds).not.toHaveBeenCalled();
    });
  });

  describe('Mnemonics Display', () => {
    it('should display meaning mnemonic', async () => {
      const mockKanji = createMockKanji({
        meaning_mnemonic: 'Test meaning mnemonic',
      });
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(
          getByTestId('kanji-detail-meaning-mnemonic-section'),
        ).toBeTruthy();
      });

      expect(getByTestId('kanji-detail-meaning-mnemonic')).toBeTruthy();
    });

    it('should display reading mnemonic when available', async () => {
      const mockKanji = createMockKanji({
        reading_mnemonic: 'Test reading mnemonic',
      });
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(
          getByTestId('kanji-detail-reading-mnemonic-section'),
        ).toBeTruthy();
      });

      expect(getByTestId('kanji-detail-reading-mnemonic')).toBeTruthy();
    });

    it('should not display reading mnemonic section when null', async () => {
      const mockKanji = createMockKanji({ reading_mnemonic: null });
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId, queryByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('kanji-detail-screen')).toBeTruthy();
      });

      expect(queryByTestId('kanji-detail-reading-mnemonic-section')).toBeNull();
    });
  });

  describe('SRS Badge', () => {
    it('should display SRS level badge when assignment exists', async () => {
      const mockKanji = createMockKanji();
      const mockAssignment = createMockAssignment({ srs_stage: 5 });
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(mockAssignment);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('kanji-detail-srs-badge')).toBeTruthy();
      });
    });

    it('should not display SRS badge when no assignment', async () => {
      const mockKanji = createMockKanji();
      mockDatabase.getSubjectById.mockResolvedValue(mockKanji);
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      const { getByTestId, queryByTestId } = renderWithNavigation(1);

      await waitFor(() => {
        expect(getByTestId('kanji-detail-screen')).toBeTruthy();
      });

      expect(queryByTestId('kanji-detail-srs-badge')).toBeNull();
    });
  });

  describe('Navigation', () => {
    it('should fetch correct subject ID from route params', async () => {
      mockDatabase.getSubjectById.mockResolvedValue(
        createMockKanji({ id: 42 }),
      );
      mockDatabase.getAssignmentBySubjectId.mockResolvedValue(null);
      mockDatabase.getSubjectsByIds.mockResolvedValue([]);

      renderWithNavigation(42);

      await waitFor(() => {
        expect(mockDatabase.getSubjectById).toHaveBeenCalledWith(42);
      });
    });
  });
});
