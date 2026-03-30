import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { ThemeProvider } from '../../../src/theme/ThemeContext';
import { FlipCard } from '../../../src/components/quiz/FlipCard';
import type { DictionaryVocab } from '../../../src/types/dictionary';

const mockItem: DictionaryVocab = {
  characters: '大人',
  readings: ['おとな', 'たいじん'],
  meanings: ['adult', 'grown-up'],
};

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider forcedColorScheme="light">{ui}</ThemeProvider>,
  );
}

describe('FlipCard', () => {
  it('renders front face with characters', () => {
    const { getByTestId } = renderWithTheme(
      <FlipCard item={mockItem} onGrade={jest.fn()} />,
    );

    expect(getByTestId('flip-card-characters')).toHaveTextContent('大人');
    expect(getByTestId('flip-card-reveal')).toBeTruthy();
  });

  it('shows Reveal button on front face', () => {
    const { getByTestId } = renderWithTheme(
      <FlipCard item={mockItem} onGrade={jest.fn()} />,
    );

    expect(getByTestId('flip-card-reveal')).toBeTruthy();
  });

  it('renders back face with meaning and reading', () => {
    const { getByTestId } = renderWithTheme(
      <FlipCard item={mockItem} onGrade={jest.fn()} />,
    );

    expect(getByTestId('flip-card-meaning')).toHaveTextContent('adult, grown-up');
    expect(getByTestId('flip-card-reading')).toHaveTextContent('おとな, たいじん');
  });

  it('shows Correct and Wrong buttons on back face', () => {
    const { getByTestId } = renderWithTheme(
      <FlipCard item={mockItem} onGrade={jest.fn()} />,
    );

    expect(getByTestId('flip-card-correct')).toBeTruthy();
    expect(getByTestId('flip-card-wrong')).toBeTruthy();
  });

  it('calls onGrade(true) when Correct is tapped', () => {
    const onGrade = jest.fn();
    const { getByTestId } = renderWithTheme(
      <FlipCard item={mockItem} onGrade={onGrade} />,
    );

    fireEvent.press(getByTestId('flip-card-correct'));
    expect(onGrade).toHaveBeenCalledWith(true);
  });

  it('calls onGrade(false) when Wrong is tapped', () => {
    const onGrade = jest.fn();
    const { getByTestId } = renderWithTheme(
      <FlipCard item={mockItem} onGrade={onGrade} />,
    );

    fireEvent.press(getByTestId('flip-card-wrong'));
    expect(onGrade).toHaveBeenCalledWith(false);
  });

  it('triggers flip animation when Reveal is tapped', () => {
    const withTiming = require('react-native-reanimated').withTiming;
    const { getByTestId } = renderWithTheme(
      <FlipCard item={mockItem} onGrade={jest.fn()} />,
    );

    fireEvent.press(getByTestId('flip-card-reveal'));
    expect(withTiming).toHaveBeenCalledWith(1, expect.objectContaining({
      duration: 400,
    }));
  });

  it('accepts custom testID', () => {
    const { getByTestId } = renderWithTheme(
      <FlipCard item={mockItem} onGrade={jest.fn()} testID="custom" />,
    );

    expect(getByTestId('custom')).toBeTruthy();
    expect(getByTestId('custom-front')).toBeTruthy();
    expect(getByTestId('custom-back')).toBeTruthy();
  });
});
