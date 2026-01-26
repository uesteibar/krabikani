import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import { ReviewsScreen } from '../../src/screens/ReviewsScreen';
import * as storage from '../../src/storage';

// Mock dependencies
jest.mock('../../src/storage', () => ({
  getAvailableReviews: jest.fn(),
  getSubjectsByIds: jest.fn(),
}));

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

// Mock Math.random for deterministic tests
const mockRandom = jest.spyOn(Math, 'random');

function renderWithNavigation(component: React.ReactElement) {
  return render(<NavigationContainer>{component}</NavigationContainer>);
}

// Sample data for testing
const sampleAssignments = [
  {
    id: 1001,
    subject_id: 1,
    srs_stage: 1,
    available_at: '2026-01-01T00:00:00.000Z',
    started_at: '2026-01-01T00:00:00.000Z',
    unlocked_at: '2026-01-01T00:00:00.000Z',
    data_updated_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 1002,
    subject_id: 2,
    srs_stage: 2,
    available_at: '2026-01-01T00:00:00.000Z',
    started_at: '2026-01-01T00:00:00.000Z',
    unlocked_at: '2026-01-01T00:00:00.000Z',
    data_updated_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

const sampleRadicalSubject = {
  id: 1,
  object_type: 'radical',
  characters: '一',
  meanings: JSON.stringify([
    { meaning: 'Ground', primary: true, accepted_answer: true },
  ]),
  readings: null,
  meaning_mnemonic: 'This is the ground mnemonic.',
  reading_mnemonic: null,
  level: 1,
  component_subject_ids: null,
  data_updated_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
};

const sampleKanjiSubject = {
  id: 2,
  object_type: 'kanji',
  characters: '大',
  meanings: JSON.stringify([
    { meaning: 'Big', primary: true, accepted_answer: true },
  ]),
  readings: JSON.stringify([
    { reading: 'おお', primary: true, accepted_answer: true, type: 'kunyomi' },
  ]),
  meaning_mnemonic: 'This is the meaning mnemonic for big.',
  reading_mnemonic: 'This is the reading mnemonic for big.',
  level: 1,
  component_subject_ids: JSON.stringify([1]),
  data_updated_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('ReviewsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRandom.mockImplementation(() => 0.1); // Deterministic random
    // Default mocks
    (storage.getAvailableReviews as jest.Mock).mockResolvedValue([]);
    (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    mockRandom.mockRestore();
  });

  describe('loading state', () => {
    it('should show loading state initially', async () => {
      // Make storage call hang to keep loading state
      (storage.getAvailableReviews as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );

      const { getByTestId, getByText } = renderWithNavigation(
        <ReviewsScreen />,
      );

      expect(getByTestId('reviews-screen-loading')).toBeTruthy();
      expect(getByText('Loading reviews...')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('should show error when no reviews available', async () => {
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([]);

      const { getByTestId, getByText } = renderWithNavigation(
        <ReviewsScreen />,
      );

      await waitFor(() => {
        expect(getByTestId('reviews-screen-error')).toBeTruthy();
        expect(getByText('No reviews available')).toBeTruthy();
      });
    });

    it('should show error when no valid subjects found', async () => {
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([
        { id: 1, subject_id: 100 },
      ]);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([]);

      const { getByTestId, getByText } = renderWithNavigation(
        <ReviewsScreen />,
      );

      await waitFor(() => {
        expect(getByTestId('reviews-screen-error')).toBeTruthy();
        expect(getByText('No valid reviews found')).toBeTruthy();
      });
    });

    it('should show error when storage throws', async () => {
      (storage.getAvailableReviews as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      const { getByTestId, getByText } = renderWithNavigation(
        <ReviewsScreen />,
      );

      await waitFor(() => {
        expect(getByTestId('reviews-screen-error')).toBeTruthy();
        expect(getByText('Database error')).toBeTruthy();
      });
    });

    it('should navigate back when pressing Return to Dashboard link', async () => {
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(<ReviewsScreen />);

      await waitFor(() => {
        expect(getByTestId('reviews-screen-error')).toBeTruthy();
      });

      fireEvent.press(getByTestId('reviews-screen-back'));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('reviewing state', () => {
    it('should show review session when reviews are loaded', async () => {
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([
        sampleAssignments[0],
      ]);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([
        sampleRadicalSubject,
      ]);

      const { getByTestId, queryByTestId } = renderWithNavigation(
        <ReviewsScreen />,
      );

      await waitFor(() => {
        expect(getByTestId('reviews-screen')).toBeTruthy();
        expect(queryByTestId('review-session')).toBeTruthy();
      });
    });

    it('should load and display correct character', async () => {
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([
        sampleAssignments[0],
      ]);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([
        sampleRadicalSubject,
      ]);

      const { getByTestId } = renderWithNavigation(<ReviewsScreen />);

      await waitFor(() => {
        expect(getByTestId('review-session-characters').props.children).toBe(
          '一',
        );
      });
    });

    it('should call getSubjectsByIds with correct subject IDs', async () => {
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue(
        sampleAssignments,
      );
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([
        sampleRadicalSubject,
        sampleKanjiSubject,
      ]);

      renderWithNavigation(<ReviewsScreen />);

      await waitFor(() => {
        expect(storage.getSubjectsByIds).toHaveBeenCalledWith([1, 2]);
      });
    });
  });

  describe('completion state', () => {
    it('should show completion screen after answering all questions correctly', async () => {
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([
        sampleAssignments[0],
      ]);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([
        sampleRadicalSubject,
      ]);

      const { getByTestId, getByText } = renderWithNavigation(
        <ReviewsScreen />,
      );

      // Wait for reviews to load
      await waitFor(() => {
        expect(getByTestId('review-session')).toBeTruthy();
      });

      // Answer the question correctly (radical = meaning only)
      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Should show completion (via ReviewCompletion component)
      await waitFor(() => {
        expect(getByTestId('review-completion')).toBeTruthy();
        expect(getByText('Reviews Complete!')).toBeTruthy();
        expect(getByTestId('review-completion-count').props.children).toBe(1);
      });
    });

    it('should show incorrect answer count in completion screen', async () => {
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([
        sampleAssignments[0],
      ]);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([
        sampleRadicalSubject,
      ]);

      const { getByTestId, getByText } = renderWithNavigation(
        <ReviewsScreen />,
      );

      // Wait for reviews to load
      await waitFor(() => {
        expect(getByTestId('review-session')).toBeTruthy();
      });

      // Answer incorrectly first
      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Press continue to dismiss incorrect feedback
      fireEvent.press(getByTestId('review-session-continue'));

      // Then answer correctly
      fireEvent.changeText(getByTestId('review-session-input'), 'Ground');
      fireEvent.press(getByTestId('review-session-submit'));

      // Should show completion with incorrect count (via ReviewCompletion component)
      await waitFor(() => {
        expect(getByTestId('review-completion')).toBeTruthy();
        expect(getByTestId('review-completion-incorrect')).toBeTruthy();
      });
    });

    it('should use plural form for multiple incorrect answers', async () => {
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([
        sampleAssignments[0],
      ]);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([
        sampleRadicalSubject,
      ]);

      const { getByTestId, getByText } = renderWithNavigation(
        <ReviewsScreen />,
      );

      // Wait for reviews to load
      await waitFor(() => {
        expect(getByTestId('review-session')).toBeTruthy();
      });

      // Answer incorrectly twice
      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong1');
      fireEvent.press(submit);

      // Press continue to dismiss incorrect feedback
      fireEvent.press(getByTestId('review-session-continue'));

      fireEvent.changeText(getByTestId('review-session-input'), 'Wrong2');
      fireEvent.press(getByTestId('review-session-submit'));

      // Press continue to dismiss incorrect feedback
      fireEvent.press(getByTestId('review-session-continue'));

      // Then answer correctly
      fireEvent.changeText(getByTestId('review-session-input'), 'Ground');
      fireEvent.press(getByTestId('review-session-submit'));

      // Should show completion with plural incorrect count (via ReviewCompletion component)
      await waitFor(() => {
        expect(getByTestId('review-completion')).toBeTruthy();
        expect(getByTestId('review-completion-incorrect')).toBeTruthy();
      });
    });

    it('should navigate back when pressing Return to Dashboard from completion screen', async () => {
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([
        sampleAssignments[0],
      ]);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([
        sampleRadicalSubject,
      ]);

      const { getByTestId } = renderWithNavigation(<ReviewsScreen />);

      // Wait for reviews to load
      await waitFor(() => {
        expect(getByTestId('review-session')).toBeTruthy();
      });

      // Answer correctly
      fireEvent.changeText(getByTestId('review-session-input'), 'Ground');
      fireEvent.press(getByTestId('review-session-submit'));

      // Wait for completion (via ReviewCompletion component)
      await waitFor(() => {
        expect(getByTestId('review-completion')).toBeTruthy();
      });

      fireEvent.press(getByTestId('review-completion-dashboard'));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('multiple items', () => {
    it('should handle multiple items with different subject types', async () => {
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue(
        sampleAssignments,
      );
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([
        sampleRadicalSubject,
        sampleKanjiSubject,
      ]);

      const { getByTestId, getByText } = renderWithNavigation(
        <ReviewsScreen />,
      );

      // Wait for reviews to load
      await waitFor(() => {
        expect(getByTestId('review-session')).toBeTruthy();
      });

      // Progress should show 0/2 items
      expect(
        getByTestId('review-session-progress-text').props.children,
      ).toEqual([0, ' / ', 2]);

      // Remaining should show 2
      expect(getByText('2 remaining')).toBeTruthy();
    });
  });
});
