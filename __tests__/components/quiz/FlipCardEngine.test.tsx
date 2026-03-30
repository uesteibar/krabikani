import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { ThemeProvider } from '../../../src/theme/ThemeContext';
import { FlipCardEngine } from '../../../src/components/quiz/FlipCardEngine';
import type { DictionaryVocab } from '../../../src/types/dictionary';

const mockItems: DictionaryVocab[] = [
  { characters: '大人', readings: ['おとな'], meanings: ['adult'] },
  { characters: '人気', readings: ['にんき'], meanings: ['popularity'] },
  { characters: '天気', readings: ['てんき'], meanings: ['weather'] },
];

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider forcedColorScheme="light">{ui}</ThemeProvider>,
  );
}

describe('FlipCardEngine', () => {
  it('renders the first card', () => {
    const { getByTestId } = renderWithTheme(
      <FlipCardEngine items={mockItems} onComplete={jest.fn()} />,
    );

    expect(getByTestId('flip-card-engine-card-characters')).toHaveTextContent('大人');
  });

  it('displays progress counter', () => {
    const { getByTestId } = renderWithTheme(
      <FlipCardEngine items={mockItems} onComplete={jest.fn()} />,
    );

    expect(getByTestId('flip-card-engine-progress')).toHaveTextContent('1 / 3');
  });

  it('advances to next card on grade', () => {
    const { getByTestId } = renderWithTheme(
      <FlipCardEngine items={mockItems} onComplete={jest.fn()} />,
    );

    fireEvent.press(getByTestId('flip-card-engine-card-correct'));
    expect(getByTestId('flip-card-engine-card-characters')).toHaveTextContent('人気');
    expect(getByTestId('flip-card-engine-progress')).toHaveTextContent('2 / 3');
  });

  it('tracks correct count through multiple grades', () => {
    const onComplete = jest.fn();
    const { getByTestId } = renderWithTheme(
      <FlipCardEngine items={mockItems} onComplete={onComplete} />,
    );

    // Correct
    fireEvent.press(getByTestId('flip-card-engine-card-correct'));
    // Wrong
    fireEvent.press(getByTestId('flip-card-engine-card-wrong'));
    // Correct — last card triggers onComplete
    fireEvent.press(getByTestId('flip-card-engine-card-correct'));

    expect(onComplete).toHaveBeenCalledWith({ correct: 2, total: 3 });
  });

  it('calls onComplete when all cards are exhausted', () => {
    const onComplete = jest.fn();
    const items = [mockItems[0]];
    const { getByTestId } = renderWithTheme(
      <FlipCardEngine items={items} onComplete={onComplete} />,
    );

    fireEvent.press(getByTestId('flip-card-engine-card-correct'));
    expect(onComplete).toHaveBeenCalledWith({ correct: 1, total: 1 });
  });

  it('renders Finish button', () => {
    const { getByTestId } = renderWithTheme(
      <FlipCardEngine items={mockItems} onComplete={jest.fn()} />,
    );

    expect(getByTestId('flip-card-engine-finish')).toBeTruthy();
  });

  it('calls onComplete with current score when Finish is tapped', () => {
    const onComplete = jest.fn();
    const { getByTestId } = renderWithTheme(
      <FlipCardEngine items={mockItems} onComplete={onComplete} />,
    );

    // Answer one card correctly first
    fireEvent.press(getByTestId('flip-card-engine-card-correct'));
    // Then finish early
    fireEvent.press(getByTestId('flip-card-engine-finish'));

    expect(onComplete).toHaveBeenCalledWith({ correct: 1, total: 1 });
  });

  it('calls onComplete with zero scores when Finish is tapped immediately', () => {
    const onComplete = jest.fn();
    const { getByTestId } = renderWithTheme(
      <FlipCardEngine items={mockItems} onComplete={onComplete} />,
    );

    fireEvent.press(getByTestId('flip-card-engine-finish'));
    expect(onComplete).toHaveBeenCalledWith({ correct: 0, total: 0 });
  });

  it('returns null when items array is empty', () => {
    const { queryByTestId } = renderWithTheme(
      <FlipCardEngine items={[]} onComplete={jest.fn()} />,
    );

    expect(queryByTestId('flip-card-engine')).toBeNull();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = renderWithTheme(
      <FlipCardEngine items={mockItems} onComplete={jest.fn()} testID="custom" />,
    );

    expect(getByTestId('custom')).toBeTruthy();
  });
});
