import React from 'react';
import { render } from '@testing-library/react-native';

import { QuestionTypeLabel } from '../../src/components/QuestionTypeLabel';
import { COLORS, ThemeProvider } from '../../src/theme';

function flattenStyle(style: unknown) {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.flat(Infinity).filter(Boolean));
  }
  return style;
}

function renderWithTheme(ui: React.ReactElement, dark = false) {
  return render(
    <ThemeProvider forcedColorScheme={dark ? 'dark' : 'light'}>
      {ui}
    </ThemeProvider>,
  );
}

describe('QuestionTypeLabel', () => {
  it('renders MEANING text for meaning type', () => {
    const { getByText } = renderWithTheme(<QuestionTypeLabel type="meaning" />);
    expect(getByText('MEANING')).toBeTruthy();
  });

  it('renders READING text for reading type', () => {
    const { getByText } = renderWithTheme(<QuestionTypeLabel type="reading" />);
    expect(getByText('READING')).toBeTruthy();
  });

  it('renders KANJI text for kanji type', () => {
    const { getByText } = renderWithTheme(<QuestionTypeLabel type="kanji" />);
    expect(getByText('KANJI')).toBeTruthy();
  });

  it('uses light background for meaning type in light mode', () => {
    const { getByTestId } = renderWithTheme(<QuestionTypeLabel type="meaning" />);
    const container = getByTestId('question-type-label-container');
    const style = flattenStyle(container.props.style);
    expect(style.backgroundColor).toBe(COLORS.background.primary); // #FFFFFF
  });

  it('uses black background for reading type', () => {
    const { getByTestId } = renderWithTheme(<QuestionTypeLabel type="reading" />);
    const container = getByTestId('question-type-label-container');
    const style = flattenStyle(container.props.style);
    expect(style.backgroundColor).toBe(COLORS.neutral.black);
  });

  it('uses dark background for meaning type in dark mode', () => {
    const { getByTestId } = renderWithTheme(<QuestionTypeLabel type="meaning" />, true);
    const container = getByTestId('question-type-label-container');
    const style = flattenStyle(container.props.style);
    expect(style.backgroundColor).toBe('#121212'); // dark mode primary
  });

  it('uses white background for kanji type in light mode', () => {
    const { getByTestId } = renderWithTheme(<QuestionTypeLabel type="kanji" />);
    const container = getByTestId('question-type-label-container');
    const style = flattenStyle(container.props.style);
    expect(style.backgroundColor).toBe(COLORS.background.primary);
  });

  it('uses inverse text color for reading type', () => {
    const { getByText } = renderWithTheme(<QuestionTypeLabel type="reading" />);
    const label = getByText('READING');
    const style = flattenStyle(label.props.style);
    expect(style.color).toBe(COLORS.text.inverse);
  });

  it('uses tertiary text color for meaning type', () => {
    const { getByText } = renderWithTheme(<QuestionTypeLabel type="meaning" />);
    const label = getByText('MEANING');
    const style = flattenStyle(label.props.style);
    expect(style.color).toBe(COLORS.text.tertiary);
  });

  it('uses tertiary text color for kanji type', () => {
    const { getByText } = renderWithTheme(<QuestionTypeLabel type="kanji" />);
    const label = getByText('KANJI');
    const style = flattenStyle(label.props.style);
    expect(style.color).toBe(COLORS.text.tertiary);
  });

  it('forwards testID to the text element', () => {
    const { getByTestId } = renderWithTheme(
      <QuestionTypeLabel type="meaning" testID="question-label" />,
    );
    expect(getByTestId('question-label')).toBeTruthy();
  });
});
