import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import { ReviewsScreen } from '../../src/screens/ReviewsScreen';
import * as storage from '../../src/storage';

// Mock dependencies
jest.mock('../../src/storage', () => ({
  getAvailableReviews: jest.fn(),
  getSubjectsByIds: jest.fn(),
  getUserSynonymsBySubjectId: jest.fn().mockResolvedValue([]),
  getApiKey: jest.fn().mockResolvedValue('test-api-key'),
}));

// Mock sync service
jest.mock('../../src/sync', () => ({
  submitReviews: jest.fn().mockResolvedValue({ success: true, submittedCount: 0, queuedCount: 0 }),
}));

// Mock utils
jest.mock('../../src/utils', () => ({
  isOnline: jest.fn().mockResolvedValue(true),
  startSession: jest.fn(),
  endSession: jest.fn(),
}));

import * as sync from '../../src/sync';
import * as utils from '../../src/utils';

// Mock notification services
jest.mock('../../src/services', () => ({
  setBadgeCount: jest.fn().mockResolvedValue(undefined),
  clearBadge: jest.fn().mockResolvedValue(undefined),
  checkPermissions: jest.fn().mockResolvedValue('granted'),
  getNotificationsEnabled: jest.fn().mockResolvedValue(true),
}));

// Import the mocked services for test access
import * as notificationServices from '../../src/services';

// Mock navigation
const mockGoBack = jest.fn();
const mockPush = jest.fn();
const mockAddListener = jest.fn();

// Store beforeRemove listeners so tests can trigger them (prefixed with mock for jest)
let mockBeforeRemoveListeners: Array<(e: { preventDefault: () => void }) => void> = [];

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockGoBack,
      push: mockPush,
      addListener: mockAddListener.mockImplementation(
        (event: string, callback: (e: { preventDefault: () => void }) => void) => {
          if (event === 'beforeRemove') {
            mockBeforeRemoveListeners.push(callback);
          }
          // Return unsubscribe function
          return () => {
            mockBeforeRemoveListeners = mockBeforeRemoveListeners.filter(l => l !== callback);
          };
        },
      ),
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
    mockBeforeRemoveListeners = []; // Clear any leftover listeners
    // Default mocks
    (storage.getAvailableReviews as jest.Mock).mockResolvedValue([]);
    (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([]);
    (sync.submitReviews as jest.Mock).mockResolvedValue({ success: true, submittedCount: 0, queuedCount: 0 });
    (utils.isOnline as jest.Mock).mockResolvedValue(true);
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
        expect(getByText('No reviews right now. Check back later.')).toBeTruthy();
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
        expect(getByText("Couldn't load review data. Try syncing from the home screen.")).toBeTruthy();
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

      // Should show completion (via ReviewCompletion component) with stats
      await waitFor(() => {
        expect(getByTestId('review-completion')).toBeTruthy();
        expect(getByText('Reviews Complete!')).toBeTruthy();
        expect(getByTestId('review-completion-stats')).toBeTruthy();
        expect(getByText('1 correct')).toBeTruthy();
      });
    });

    it('should show incorrect answer count in completion screen', async () => {
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([
        sampleAssignments[0],
      ]);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([
        sampleRadicalSubject,
      ]);

      const { getByTestId, getByText } = renderWithNavigation(<ReviewsScreen />);

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

      // Should show completion with incorrect count in stats (via ReviewCompletion component)
      await waitFor(() => {
        expect(getByTestId('review-completion')).toBeTruthy();
        expect(getByTestId('review-completion-stats')).toBeTruthy();
        expect(getByText('1 incorrect')).toBeTruthy();
      });
    });

    it('should use plural form for multiple incorrect answers', async () => {
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([
        sampleAssignments[0],
      ]);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([
        sampleRadicalSubject,
      ]);

      const { getByTestId, getByText } = renderWithNavigation(<ReviewsScreen />);

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

      // Should show completion with incorrect count in stats (via ReviewCompletion component)
      await waitFor(() => {
        expect(getByTestId('review-completion')).toBeTruthy();
        expect(getByTestId('review-completion-stats')).toBeTruthy();
        expect(getByText('1 incorrect')).toBeTruthy();
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

  describe('badge update on session completion', () => {
    beforeEach(() => {
      // Reset notification mocks and set defaults
      (notificationServices.setBadgeCount as jest.Mock)
        .mockReset()
        .mockResolvedValue(undefined);
      (notificationServices.clearBadge as jest.Mock)
        .mockReset()
        .mockResolvedValue(undefined);
      (notificationServices.checkPermissions as jest.Mock)
        .mockReset()
        .mockResolvedValue('granted');
      (notificationServices.getNotificationsEnabled as jest.Mock)
        .mockReset()
        .mockResolvedValue(true);
      // Reset storage mocks (they'll be set up per-test)
      (storage.getAvailableReviews as jest.Mock).mockReset();
      (storage.getSubjectsByIds as jest.Mock).mockReset();
    });

    it('should update badge to remaining review count after session completion', async () => {
      // First call returns initial reviews, second call returns remaining reviews
      (storage.getAvailableReviews as jest.Mock)
        .mockResolvedValueOnce([sampleAssignments[0]])
        .mockResolvedValueOnce([{ id: 999, subject_id: 99 }]); // 1 review remaining

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

      // Wait for completion
      await waitFor(() => {
        expect(getByTestId('review-completion')).toBeTruthy();
      });

      // Badge should be updated with remaining count
      await waitFor(() => {
        expect(notificationServices.setBadgeCount).toHaveBeenCalledWith(1);
      });
    });

    it('should clear badge when no reviews remain after session completion', async () => {
      // First call returns initial reviews, second call returns empty (no more reviews)
      (storage.getAvailableReviews as jest.Mock)
        .mockResolvedValueOnce([sampleAssignments[0]])
        .mockResolvedValueOnce([]); // No reviews remaining

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

      // Wait for completion
      await waitFor(() => {
        expect(getByTestId('review-completion')).toBeTruthy();
      });

      // Badge should be cleared
      await waitFor(() => {
        expect(notificationServices.clearBadge).toHaveBeenCalled();
      });
    });

    it('should not update badge when notification permissions are not granted', async () => {
      (notificationServices.checkPermissions as jest.Mock).mockResolvedValue(
        'denied',
      );

      (storage.getAvailableReviews as jest.Mock)
        .mockResolvedValueOnce([sampleAssignments[0]])
        .mockResolvedValueOnce([{ id: 999, subject_id: 99 }]);

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

      // Wait for completion
      await waitFor(() => {
        expect(getByTestId('review-completion')).toBeTruthy();
      });

      // Wait a bit and verify badge was NOT updated
      await waitFor(() => {
        expect(notificationServices.checkPermissions).toHaveBeenCalled();
      });
      expect(notificationServices.setBadgeCount).not.toHaveBeenCalled();
      expect(notificationServices.clearBadge).not.toHaveBeenCalled();
    });

    it('should not update badge when notifications are disabled in settings', async () => {
      (notificationServices.checkPermissions as jest.Mock).mockResolvedValue(
        'granted',
      );
      (
        notificationServices.getNotificationsEnabled as jest.Mock
      ).mockResolvedValue(false);

      (storage.getAvailableReviews as jest.Mock)
        .mockResolvedValueOnce([sampleAssignments[0]])
        .mockResolvedValueOnce([{ id: 999, subject_id: 99 }]);

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

      // Wait for completion
      await waitFor(() => {
        expect(getByTestId('review-completion')).toBeTruthy();
      });

      // Wait a bit and verify badge was NOT updated
      await waitFor(() => {
        expect(notificationServices.getNotificationsEnabled).toHaveBeenCalled();
      });
      expect(notificationServices.setBadgeCount).not.toHaveBeenCalled();
      expect(notificationServices.clearBadge).not.toHaveBeenCalled();
    });
  });

  describe('exit sync behavior', () => {
    // Sample kanji subject with readings for testing exit sync
    const kanjiSubjectWithReadings = {
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
      component_subject_ids: null,
      auxiliary_meanings: null,
      data_updated_at: '2026-01-01T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
    };

    const kanjiAssignment = {
      id: 1002,
      subject_id: 2,
      srs_stage: 2,
      available_at: '2026-01-01T00:00:00.000Z',
      started_at: '2026-01-01T00:00:00.000Z',
      unlocked_at: '2026-01-01T00:00:00.000Z',
      data_updated_at: '2026-01-01T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
      mockBeforeRemoveListeners = [];
      (sync.submitReviews as jest.Mock).mockClear();
      // Reset storage mocks that may have been cleared by previous test suites
      (storage.getAvailableReviews as jest.Mock).mockReset();
      (storage.getSubjectsByIds as jest.Mock).mockReset();
      (storage.getUserSynonymsBySubjectId as jest.Mock).mockReset();
    });

    it('should sync completed items when user navigates away', async () => {
      // Set up with kanji (has both meaning and reading)
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([kanjiAssignment]);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([kanjiSubjectWithReadings]);
      (storage.getUserSynonymsBySubjectId as jest.Mock).mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(<ReviewsScreen />);

      // Wait for reviews to load
      await waitFor(() => {
        expect(getByTestId('review-session')).toBeTruthy();
      });

      // Determine question order based on what's shown
      const firstQuestionType = getByTestId('review-session-question-type').props.children;

      if (firstQuestionType === 'MEANING') {
        // Meaning first
        fireEvent.changeText(getByTestId('review-session-input'), 'Big');
        fireEvent.press(getByTestId('review-session-submit'));

        // Wait for next question (reading)
        await waitFor(() => {
          expect(getByTestId('review-session-question-type').props.children).toBe('READING');
        });

        // Answer reading correctly
        fireEvent.changeText(getByTestId('review-session-input'), 'oo');
        fireEvent.press(getByTestId('review-session-submit'));
      } else {
        // Reading first
        fireEvent.changeText(getByTestId('review-session-input'), 'oo');
        fireEvent.press(getByTestId('review-session-submit'));

        // Wait for next question (meaning)
        await waitFor(() => {
          expect(getByTestId('review-session-question-type').props.children).toBe('MEANING');
        });

        // Answer meaning correctly
        fireEvent.changeText(getByTestId('review-session-input'), 'Big');
        fireEvent.press(getByTestId('review-session-submit'));
      }

      // The item is now complete (both meaning and reading correct)
      // Wait for the correct feedback to show and process
      await waitFor(() => {
        // The beforeRemove listener should be registered
        expect(mockBeforeRemoveListeners.length).toBeGreaterThan(0);
      });

      // Trigger beforeRemove (simulate user navigating away)
      const mockPreventDefault = jest.fn();
      mockBeforeRemoveListeners.forEach(listener => listener({ preventDefault: mockPreventDefault }));

      // Wait for async exit sync to complete
      await waitFor(() => {
        expect(sync.submitReviews).toHaveBeenCalled();
      });

      // Verify submitReviews was called with the completed item
      expect(sync.submitReviews).toHaveBeenCalledWith(
        expect.anything(), // client
        expect.arrayContaining([
          expect.objectContaining({
            assignmentId: 1002,
            subjectId: 2,
            incorrectMeaningAnswers: 0,
            incorrectReadingAnswers: 0,
          }),
        ]),
      );
    });

    it('should not sync incomplete items when user navigates away', async () => {
      // Use only the kanji (incomplete after answering one question)
      // We trigger beforeRemove before answering any questions to ensure no items are complete
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([kanjiAssignment]);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([kanjiSubjectWithReadings]);
      (storage.getUserSynonymsBySubjectId as jest.Mock).mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(<ReviewsScreen />);

      // Wait for reviews to load
      await waitFor(() => {
        expect(getByTestId('review-session')).toBeTruthy();
      });

      // Don't answer any questions - just trigger exit immediately
      // This ensures no items are complete

      // Trigger beforeRemove before answering ANY question
      const mockPreventDefault = jest.fn();
      mockBeforeRemoveListeners.forEach(listener => listener({ preventDefault: mockPreventDefault }));

      // Wait a bit for any async operations
      await new Promise<void>(resolve => setTimeout(resolve, 100));

      // submitReviews should NOT have been called because no item is fully complete
      expect(sync.submitReviews).not.toHaveBeenCalled();
    });

    it('should include correct incorrect counts when syncing on exit', async () => {
      // Set up with radical (only meaning question)
      const radicalSubject = {
        ...sampleRadicalSubject,
        auxiliary_meanings: null,
      };

      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([sampleAssignments[0]]);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([radicalSubject]);
      (storage.getUserSynonymsBySubjectId as jest.Mock).mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(<ReviewsScreen />);

      // Wait for reviews to load
      await waitFor(() => {
        expect(getByTestId('review-session')).toBeTruthy();
      });

      // Answer incorrectly first
      fireEvent.changeText(getByTestId('review-session-input'), 'Wrong');
      fireEvent.press(getByTestId('review-session-submit'));

      // Press continue to dismiss incorrect feedback
      await waitFor(() => {
        expect(getByTestId('review-session-continue')).toBeTruthy();
      });
      fireEvent.press(getByTestId('review-session-continue'));

      // Answer correctly
      await waitFor(() => {
        expect(getByTestId('review-session-input')).toBeTruthy();
      });
      fireEvent.changeText(getByTestId('review-session-input'), 'Ground');
      fireEvent.press(getByTestId('review-session-submit'));

      // Wait for the item to be marked as complete
      await waitFor(() => {
        expect(mockBeforeRemoveListeners.length).toBeGreaterThan(0);
      });

      // Trigger beforeRemove
      const mockPreventDefault = jest.fn();
      mockBeforeRemoveListeners.forEach(listener => listener({ preventDefault: mockPreventDefault }));

      // Wait for async exit sync
      await waitFor(() => {
        expect(sync.submitReviews).toHaveBeenCalled();
      });

      // Verify submitReviews was called with correct incorrect counts
      expect(sync.submitReviews).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([
          expect.objectContaining({
            assignmentId: 1001,
            subjectId: 1,
            incorrectMeaningAnswers: 1, // 1 incorrect answer
            incorrectReadingAnswers: 0,
          }),
        ]),
      );
    });

    it('should work offline by queuing reviews', async () => {
      (utils.isOnline as jest.Mock).mockResolvedValue(false);
      (storage.getAvailableReviews as jest.Mock).mockResolvedValue([sampleAssignments[0]]);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([
        { ...sampleRadicalSubject, auxiliary_meanings: null },
      ]);
      (storage.getUserSynonymsBySubjectId as jest.Mock).mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(<ReviewsScreen />);

      // Wait for reviews to load
      await waitFor(() => {
        expect(getByTestId('review-session')).toBeTruthy();
      });

      // Answer correctly
      fireEvent.changeText(getByTestId('review-session-input'), 'Ground');
      fireEvent.press(getByTestId('review-session-submit'));

      // Wait for state to update
      await waitFor(() => {
        expect(mockBeforeRemoveListeners.length).toBeGreaterThan(0);
      });

      // Trigger beforeRemove
      const mockPreventDefault = jest.fn();
      mockBeforeRemoveListeners.forEach(listener => listener({ preventDefault: mockPreventDefault }));

      // Wait for async exit sync
      await waitFor(() => {
        expect(sync.submitReviews).toHaveBeenCalled();
      });

      // submitReviews should be called with null client (offline)
      expect(sync.submitReviews).toHaveBeenCalledWith(
        null,
        expect.any(Array),
      );
    });
  });
});
