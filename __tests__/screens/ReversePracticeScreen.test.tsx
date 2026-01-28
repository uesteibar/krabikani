import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import { ReversePracticeScreen } from '../../src/screens/ReversePracticeScreen';
import * as storage from '../../src/storage';

// Mock dependencies
jest.mock('../../src/storage', () => ({
  getReversePracticeItems: jest.fn(),
  getReversePracticeItemCount: jest.fn(),
  getSubjectsByIds: jest.fn(),
  getUserSynonymsBySubjectId: jest.fn().mockResolvedValue([]),
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockPush = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockGoBack,
      push: mockPush,
    }),
  };
});

// Mock Math.random for deterministic tests
const mockRandom = jest.spyOn(Math, 'random');

function renderWithNavigation(component: React.ReactElement) {
  return render(<NavigationContainer>{component}</NavigationContainer>);
}

// Sample data
const sampleVocabularyAssignments = [
  {
    id: 1001,
    subject_id: 1,
    srs_stage: 5,
    available_at: null,
    started_at: '2026-01-01T00:00:00.000Z',
    unlocked_at: '2026-01-01T00:00:00.000Z',
    data_updated_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 1002,
    subject_id: 2,
    srs_stage: 6,
    available_at: null,
    started_at: '2026-01-01T00:00:00.000Z',
    unlocked_at: '2026-01-01T00:00:00.000Z',
    data_updated_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

const sampleVocabularySubject = {
  id: 1,
  object_type: 'vocabulary',
  characters: '大人',
  meanings: JSON.stringify([
    { meaning: 'Adult', primary: true, accepted_answer: true },
  ]),
  readings: JSON.stringify([
    { reading: 'おとな', primary: true, accepted_answer: true },
  ]),
  meaning_mnemonic: 'This is the meaning mnemonic for adult.',
  reading_mnemonic: 'This is the reading mnemonic for adult.',
  level: 5,
  component_subject_ids: JSON.stringify([100]),
  character_images: null,
  auxiliary_meanings: null,
  data_updated_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
};

const sampleKanaVocabularySubject = {
  id: 2,
  object_type: 'kana_vocabulary',
  characters: 'こんにちは',
  meanings: JSON.stringify([
    { meaning: 'Hello', primary: true, accepted_answer: true },
  ]),
  readings: JSON.stringify([
    { reading: 'こんにちは', primary: true, accepted_answer: true },
  ]),
  meaning_mnemonic: 'This is the meaning mnemonic for hello.',
  reading_mnemonic: null,
  level: 1,
  component_subject_ids: null,
  character_images: null,
  auxiliary_meanings: null,
  data_updated_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
};

const sampleKanjiComponent = {
  id: 100,
  object_type: 'kanji',
  characters: '大',
  meanings: JSON.stringify([
    { meaning: 'Big', primary: true, accepted_answer: true },
  ]),
  readings: JSON.stringify([
    { reading: 'おお', primary: true, accepted_answer: true, type: 'kunyomi' },
  ]),
  meaning_mnemonic: 'Kanji mnemonic',
  reading_mnemonic: 'Kanji reading mnemonic',
  level: 1,
  component_subject_ids: null,
  character_images: null,
  auxiliary_meanings: null,
  data_updated_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('ReversePracticeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRandom.mockImplementation(() => 0.1);
    (storage.getReversePracticeItems as jest.Mock).mockResolvedValue([]);
    (storage.getReversePracticeItemCount as jest.Mock).mockResolvedValue(0);
    (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    mockRandom.mockRestore();
  });

  describe('empty state', () => {
    it('should show empty state when no vocabulary items exist', async () => {
      (storage.getReversePracticeItemCount as jest.Mock).mockResolvedValue(0);

      const { findByTestId } = renderWithNavigation(<ReversePracticeScreen />);

      const emptyScreen = await findByTestId('reverse-practice-screen-empty');
      expect(emptyScreen).toBeTruthy();
    });

    it('should show empty state message about vocabulary and Guru level', async () => {
      (storage.getReversePracticeItemCount as jest.Mock).mockResolvedValue(0);

      const { findByText } = renderWithNavigation(<ReversePracticeScreen />);

      const title = await findByText('No Vocabulary Items');
      expect(title).toBeTruthy();

      const message = await findByText(/Guru level/);
      expect(message).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('should show loading state initially when items exist', async () => {
      // Make storage calls hang
      (storage.getReversePracticeItemCount as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );

      const { getByTestId } = renderWithNavigation(<ReversePracticeScreen />);
      expect(getByTestId('reverse-practice-screen-loading')).toBeTruthy();
    });

    it('should show loading text mentioning vocabulary', async () => {
      (storage.getReversePracticeItemCount as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );

      const { getByText } = renderWithNavigation(<ReversePracticeScreen />);
      expect(getByText(/vocabulary/i)).toBeTruthy();
    });
  });

  describe('practice session', () => {
    beforeEach(() => {
      (storage.getReversePracticeItemCount as jest.Mock).mockResolvedValue(2);
      (storage.getReversePracticeItems as jest.Mock).mockResolvedValue(
        sampleVocabularyAssignments,
      );
      (storage.getSubjectsByIds as jest.Mock).mockImplementation(
        async (ids: number[]) => {
          const allSubjects = [
            sampleVocabularySubject,
            sampleKanaVocabularySubject,
            sampleKanjiComponent,
          ];
          return allSubjects.filter(s => ids.includes(s.id));
        },
      );
    });

    it('should show practice session when items are loaded', async () => {
      const { findByTestId } = renderWithNavigation(<ReversePracticeScreen />);

      const session = await findByTestId('reverse-practice-session');
      expect(session).toBeTruthy();
    });

    it('should show item count in practice session', async () => {
      const { findByText } = renderWithNavigation(<ReversePracticeScreen />);

      const countText = await findByText(/2 vocabulary items? loaded/);
      expect(countText).toBeTruthy();
    });

    it('should load only vocabulary and kana_vocabulary subjects', async () => {
      renderWithNavigation(<ReversePracticeScreen />);

      await waitFor(() => {
        expect(storage.getReversePracticeItems).toHaveBeenCalled();
      });
    });

    it('should load component kanji for vocabulary items', async () => {
      const { findByTestId } = renderWithNavigation(<ReversePracticeScreen />);

      await findByTestId('reverse-practice-session');

      // Should have called getSubjectsByIds twice: once for subjects, once for components
      expect(storage.getSubjectsByIds).toHaveBeenCalledTimes(2);
      // Second call should include kanji component IDs
      expect(storage.getSubjectsByIds).toHaveBeenCalledWith([100]);
    });

    it('should load user synonyms for items', async () => {
      const { findByTestId } = renderWithNavigation(<ReversePracticeScreen />);

      await findByTestId('reverse-practice-session');

      // Should have called getUserSynonymsBySubjectId for each subject
      expect(storage.getUserSynonymsBySubjectId).toHaveBeenCalledWith(1);
      expect(storage.getUserSynonymsBySubjectId).toHaveBeenCalledWith(2);
    });
  });

  describe('data loading edge cases', () => {
    it('should show empty state when count > 0 but no items are returned', async () => {
      (storage.getReversePracticeItemCount as jest.Mock).mockResolvedValue(5);
      (storage.getReversePracticeItems as jest.Mock).mockResolvedValue([]);

      const { findByTestId } = renderWithNavigation(<ReversePracticeScreen />);

      const emptyScreen = await findByTestId('reverse-practice-screen-empty');
      expect(emptyScreen).toBeTruthy();
    });

    it('should handle items where subject is not found', async () => {
      (storage.getReversePracticeItemCount as jest.Mock).mockResolvedValue(1);
      (storage.getReversePracticeItems as jest.Mock).mockResolvedValue([
        sampleVocabularyAssignments[0],
      ]);
      // Return empty - subject not found
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([]);

      const { findByTestId } = renderWithNavigation(<ReversePracticeScreen />);

      // Should show empty state since no valid items
      const emptyScreen = await findByTestId('reverse-practice-screen-empty');
      expect(emptyScreen).toBeTruthy();
    });

    it('should handle single item correctly', async () => {
      (storage.getReversePracticeItemCount as jest.Mock).mockResolvedValue(1);
      (storage.getReversePracticeItems as jest.Mock).mockResolvedValue([
        sampleVocabularyAssignments[0],
      ]);
      (storage.getSubjectsByIds as jest.Mock).mockImplementation(
        async (ids: number[]) => {
          if (ids.includes(1)) return [sampleVocabularySubject];
          if (ids.includes(100)) return [sampleKanjiComponent];
          return [];
        },
      );

      const { findByText } = renderWithNavigation(<ReversePracticeScreen />);

      const countText = await findByText(/1 vocabulary item loaded/);
      expect(countText).toBeTruthy();
    });
  });
});
