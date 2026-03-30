import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import { IntuitionPracticeScreen } from '../../src/screens/IntuitionPracticeScreen';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import * as storage from '../../src/storage';

jest.mock('../../src/storage', () => ({
  getLearnedKanjiCharacters: jest.fn(),
  getWaniKaniVocabCharacters: jest.fn(),
  getIntuitionPracticeItems: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
  };
});

function renderWithProviders(component: React.ReactElement) {
  return render(
    <ThemeProvider forcedColorScheme="light">
      <NavigationContainer>{component}</NavigationContainer>
    </ThemeProvider>,
  );
}

const sampleItems = [
  {
    characters: '大人',
    readings: ['おとな'],
    meanings: ['adult'],
  },
  {
    characters: '人口',
    readings: ['じんこう'],
    meanings: ['population'],
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('IntuitionPracticeScreen', () => {
  it('shows loading state initially', () => {
    (storage.getLearnedKanjiCharacters as jest.Mock).mockReturnValue(
      new Promise(() => {}),
    );

    const { getByTestId } = renderWithProviders(<IntuitionPracticeScreen />);
    expect(getByTestId('intuition-practice-loading')).toBeTruthy();
  });

  it('shows empty state when no learned kanji', async () => {
    (storage.getLearnedKanjiCharacters as jest.Mock).mockResolvedValue(
      new Set(),
    );

    const { getByTestId } = renderWithProviders(<IntuitionPracticeScreen />);

    await waitFor(() => {
      expect(getByTestId('intuition-practice-empty')).toBeTruthy();
    });

    expect(storage.getWaniKaniVocabCharacters).not.toHaveBeenCalled();
  });

  it('shows empty state when no matching dictionary vocab', async () => {
    (storage.getLearnedKanjiCharacters as jest.Mock).mockResolvedValue(
      new Set(['大', '人']),
    );
    (storage.getWaniKaniVocabCharacters as jest.Mock).mockResolvedValue(
      new Set(),
    );
    (storage.getIntuitionPracticeItems as jest.Mock).mockResolvedValue([]);

    const { getByTestId, getByText } = renderWithProviders(
      <IntuitionPracticeScreen />,
    );

    await waitFor(() => {
      expect(getByTestId('intuition-practice-empty')).toBeTruthy();
    });

    expect(getByText('Learn more kanji to unlock this mode')).toBeTruthy();
  });

  it('renders FlipCardEngine with loaded items', async () => {
    (storage.getLearnedKanjiCharacters as jest.Mock).mockResolvedValue(
      new Set(['大', '人', '口']),
    );
    (storage.getWaniKaniVocabCharacters as jest.Mock).mockResolvedValue(
      new Set(),
    );
    (storage.getIntuitionPracticeItems as jest.Mock).mockResolvedValue(
      sampleItems,
    );

    const { getByTestId } = renderWithProviders(<IntuitionPracticeScreen />);

    await waitFor(() => {
      expect(getByTestId('intuition-practice-engine')).toBeTruthy();
    });
  });

  it('shows JMdict attribution during practice', async () => {
    (storage.getLearnedKanjiCharacters as jest.Mock).mockResolvedValue(
      new Set(['大', '人']),
    );
    (storage.getWaniKaniVocabCharacters as jest.Mock).mockResolvedValue(
      new Set(),
    );
    (storage.getIntuitionPracticeItems as jest.Mock).mockResolvedValue(
      sampleItems,
    );

    const { getByTestId } = renderWithProviders(<IntuitionPracticeScreen />);

    await waitFor(() => {
      expect(getByTestId('intuition-practice-attribution')).toBeTruthy();
    });
  });

  it('shows session results after completing all cards', async () => {
    (storage.getLearnedKanjiCharacters as jest.Mock).mockResolvedValue(
      new Set(['大', '人']),
    );
    (storage.getWaniKaniVocabCharacters as jest.Mock).mockResolvedValue(
      new Set(),
    );
    (storage.getIntuitionPracticeItems as jest.Mock).mockResolvedValue([
      sampleItems[0],
    ]);

    const { getByTestId } = renderWithProviders(<IntuitionPracticeScreen />);

    await waitFor(() => {
      expect(getByTestId('intuition-practice-engine')).toBeTruthy();
    });

    // Reveal the card
    fireEvent.press(getByTestId('intuition-practice-engine-card-reveal'));

    // Grade correct
    fireEvent.press(getByTestId('intuition-practice-engine-card-correct'));

    await waitFor(() => {
      expect(getByTestId('intuition-practice-results')).toBeTruthy();
    });

    expect(getByTestId('intuition-practice-results-correct').children).toContain('1');
    expect(getByTestId('intuition-practice-results-total').children).toContain('1');
  });

  it('navigates home when Done is pressed on results', async () => {
    (storage.getLearnedKanjiCharacters as jest.Mock).mockResolvedValue(
      new Set(['大', '人']),
    );
    (storage.getWaniKaniVocabCharacters as jest.Mock).mockResolvedValue(
      new Set(),
    );
    (storage.getIntuitionPracticeItems as jest.Mock).mockResolvedValue([
      sampleItems[0],
    ]);

    const { getByTestId } = renderWithProviders(<IntuitionPracticeScreen />);

    await waitFor(() => {
      expect(getByTestId('intuition-practice-engine')).toBeTruthy();
    });

    // Complete the session via Finish button
    fireEvent.press(getByTestId('intuition-practice-engine-finish'));

    await waitFor(() => {
      expect(getByTestId('intuition-practice-results')).toBeTruthy();
    });

    fireEvent.press(getByTestId('intuition-practice-results-done'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('passes correct limit to getIntuitionPracticeItems', async () => {
    (storage.getLearnedKanjiCharacters as jest.Mock).mockResolvedValue(
      new Set(['大']),
    );
    (storage.getWaniKaniVocabCharacters as jest.Mock).mockResolvedValue(
      new Set(['大人']),
    );
    (storage.getIntuitionPracticeItems as jest.Mock).mockResolvedValue([]);

    renderWithProviders(<IntuitionPracticeScreen />);

    await waitFor(() => {
      expect(storage.getIntuitionPracticeItems).toHaveBeenCalledWith(
        new Set(['大']),
        new Set(['大人']),
        20,
      );
    });
  });
});
