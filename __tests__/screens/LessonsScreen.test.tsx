import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import { LessonsScreen } from '../../src/screens/LessonsScreen';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { COLORS } from '../../src/theme/colors';
import * as storage from '../../src/storage';
import * as secureStorage from '../../src/storage/secureStorage';
import * as networkStatus from '../../src/utils/networkStatus';
import * as syncService from '../../src/sync';

// Mock dependencies
jest.mock('../../src/storage', () => ({
  getAvailableLessons: jest.fn(),
  getSubjectsByIds: jest.fn(),
}));

jest.mock('../../src/storage/secureStorage', () => ({
  getApiKey: jest.fn(),
}));

jest.mock('../../src/utils/networkStatus', () => ({
  isOnline: jest.fn(),
}));

jest.mock('../../src/sync', () => ({
  completeLessons: jest.fn(),
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

function renderWithNavigation(component: React.ReactElement, colorScheme?: 'light' | 'dark') {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme ?? 'light'}>
      <NavigationContainer>{component}</NavigationContainer>
    </ThemeProvider>,
  );
}

describe('LessonsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks
    (storage.getAvailableLessons as jest.Mock).mockResolvedValue([]);
    (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([]);
    (secureStorage.getApiKey as jest.Mock).mockResolvedValue('test-api-key');
    (networkStatus.isOnline as jest.Mock).mockReturnValue(true);
    (syncService.completeLessons as jest.Mock).mockResolvedValue({
      success: true,
      completedCount: 0,
      queuedCount: 0,
    });
  });

  describe('loading state', () => {
    it('should show loading state initially', async () => {
      // Make storage call hang to keep loading state
      (storage.getAvailableLessons as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );

      const { getByTestId, getByText } = renderWithNavigation(<LessonsScreen />);

      expect(getByTestId('lessons-screen-loading')).toBeTruthy();
      expect(getByText('Loading lessons...')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('should show error when no lessons available', async () => {
      (storage.getAvailableLessons as jest.Mock).mockResolvedValue([]);

      const { getByTestId, getByText } = renderWithNavigation(<LessonsScreen />);

      await waitFor(() => {
        expect(getByTestId('lessons-screen-error')).toBeTruthy();
        expect(getByText('No lessons right now. Check back after your next review.')).toBeTruthy();
      });
    });

    it('should show error when no valid subjects found', async () => {
      (storage.getAvailableLessons as jest.Mock).mockResolvedValue([
        { id: 1, subject_id: 100 },
      ]);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([]);

      const { getByTestId, getByText } = renderWithNavigation(<LessonsScreen />);

      await waitFor(() => {
        expect(getByTestId('lessons-screen-error')).toBeTruthy();
        expect(getByText("Couldn't load lesson data. Try syncing from the home screen.")).toBeTruthy();
      });
    });

    it('should show error on storage failure', async () => {
      (storage.getAvailableLessons as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      const { getByTestId, getByText } = renderWithNavigation(<LessonsScreen />);

      await waitFor(() => {
        expect(getByTestId('lessons-screen-error')).toBeTruthy();
        expect(getByText('Storage error')).toBeTruthy();
      });
    });

    it('should provide back link on error', async () => {
      (storage.getAvailableLessons as jest.Mock).mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(<LessonsScreen />);

      await waitFor(() => {
        expect(getByTestId('lessons-screen-back')).toBeTruthy();
      });
    });
  });

  describe('learning phase', () => {
    const mockAssignments = [
      { id: 1, subject_id: 100, started_at: null, unlocked_at: '2024-01-01' },
      { id: 2, subject_id: 101, started_at: null, unlocked_at: '2024-01-01' },
    ];

    const mockSubjects = [
      {
        id: 100,
        object_type: 'radical',
        characters: '一',
        meanings: JSON.stringify([{ meaning: 'Ground', primary: true, accepted_answer: true }]),
        readings: null,
        meaning_mnemonic: 'This is the ground.',
        reading_mnemonic: null,
        level: 1,
        component_subject_ids: null,
        data_updated_at: '2024-01-01',
      },
      {
        id: 101,
        object_type: 'kanji',
        characters: '大',
        meanings: JSON.stringify([{ meaning: 'Big', primary: true, accepted_answer: true }]),
        readings: JSON.stringify([{ reading: 'おお', primary: true, accepted_answer: true, type: 'onyomi' }]),
        meaning_mnemonic: 'This is big.',
        reading_mnemonic: 'Read it as oo.',
        level: 1,
        component_subject_ids: JSON.stringify([100]),
        data_updated_at: '2024-01-01',
      },
    ];

    it('should show learning phase after loading', async () => {
      (storage.getAvailableLessons as jest.Mock).mockResolvedValue(mockAssignments);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue(mockSubjects);

      const { getByTestId } = renderWithNavigation(<LessonsScreen />);

      await waitFor(() => {
        expect(getByTestId('lessons-screen')).toBeTruthy();
      });

      // The LessonBatch component should be rendered
      // We can check for the wrapper div
      await waitFor(() => {
        expect(getByTestId('lessons-screen')).toBeTruthy();
      });
    });
  });

  describe('integration', () => {
    it('should load lessons from database on mount', async () => {
      (storage.getAvailableLessons as jest.Mock).mockResolvedValue([]);

      renderWithNavigation(<LessonsScreen />);

      await waitFor(() => {
        expect(storage.getAvailableLessons).toHaveBeenCalled();
      });
    });

    it('should call getSubjectsByIds with correct subject IDs', async () => {
      const mockAssignments = [
        { id: 1, subject_id: 100 },
        { id: 2, subject_id: 101 },
      ];
      (storage.getAvailableLessons as jest.Mock).mockResolvedValue(mockAssignments);
      (storage.getSubjectsByIds as jest.Mock).mockResolvedValue([]);

      renderWithNavigation(<LessonsScreen />);

      await waitFor(() => {
        expect(storage.getSubjectsByIds).toHaveBeenCalledWith([100, 101]);
      });
    });
  });

  describe('theme-aware styles', () => {
    it('should use dark background in loading state with dark theme', async () => {
      (storage.getAvailableLessons as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );

      const { getByTestId } = renderWithNavigation(<LessonsScreen />, 'dark');

      const loadingView = getByTestId('lessons-screen-loading');
      const flatStyle = Array.isArray(loadingView.props.style)
        ? Object.assign({}, ...loadingView.props.style)
        : loadingView.props.style;
      expect(flatStyle.backgroundColor).toBe('#121212');
    });

    it('should use light background in loading state with light theme', async () => {
      (storage.getAvailableLessons as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );

      const { getByTestId } = renderWithNavigation(<LessonsScreen />, 'light');

      const loadingView = getByTestId('lessons-screen-loading');
      const flatStyle = Array.isArray(loadingView.props.style)
        ? Object.assign({}, ...loadingView.props.style)
        : loadingView.props.style;
      expect(flatStyle.backgroundColor).toBe(COLORS.background.primary);
    });

    it('should use dark theme link color for back link in dark mode', async () => {
      (storage.getAvailableLessons as jest.Mock).mockResolvedValue([]);

      const { getByTestId } = renderWithNavigation(<LessonsScreen />, 'dark');

      await waitFor(() => {
        expect(getByTestId('lessons-screen-back')).toBeTruthy();
      });

      const backLink = getByTestId('lessons-screen-back');
      const flatStyle = Array.isArray(backLink.props.style)
        ? Object.assign({}, ...backLink.props.style)
        : backLink.props.style;
      expect(flatStyle.color).toBe('#4DA3FF');
    });

    it('should use dark theme text color for loading text in dark mode', async () => {
      (storage.getAvailableLessons as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );

      const { getByText } = renderWithNavigation(<LessonsScreen />, 'dark');

      const loadingText = getByText('Loading lessons...');
      const flatStyle = Array.isArray(loadingText.props.style)
        ? Object.assign({}, ...loadingText.props.style)
        : loadingText.props.style;
      expect(flatStyle.color).toBe('#AAAAAA');
    });
  });
});
