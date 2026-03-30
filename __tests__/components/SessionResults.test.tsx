import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { ThemeProvider } from '../../src/theme/ThemeContext';
import { SessionResults } from '../../src/components/SessionResults';

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider forcedColorScheme="light">{ui}</ThemeProvider>,
  );
}

describe('SessionResults', () => {
  it('displays correct count', () => {
    const { getByTestId } = renderWithTheme(
      <SessionResults correct={7} total={10} onDone={jest.fn()} />,
    );

    expect(getByTestId('session-results-correct')).toHaveTextContent('7');
  });

  it('displays total count', () => {
    const { getByTestId } = renderWithTheme(
      <SessionResults correct={7} total={10} onDone={jest.fn()} />,
    );

    expect(getByTestId('session-results-total')).toHaveTextContent('10');
  });

  it('displays percentage', () => {
    const { getByTestId } = renderWithTheme(
      <SessionResults correct={7} total={10} onDone={jest.fn()} />,
    );

    expect(getByTestId('session-results-percentage')).toHaveTextContent('70%');
  });

  it('rounds percentage to nearest integer', () => {
    const { getByTestId } = renderWithTheme(
      <SessionResults correct={1} total={3} onDone={jest.fn()} />,
    );

    expect(getByTestId('session-results-percentage')).toHaveTextContent('33%');
  });

  it('shows 0% when total is 0', () => {
    const { getByTestId } = renderWithTheme(
      <SessionResults correct={0} total={0} onDone={jest.fn()} />,
    );

    expect(getByTestId('session-results-percentage')).toHaveTextContent('0%');
  });

  it('shows 100% for perfect score', () => {
    const { getByTestId } = renderWithTheme(
      <SessionResults correct={5} total={5} onDone={jest.fn()} />,
    );

    expect(getByTestId('session-results-percentage')).toHaveTextContent('100%');
  });

  it('renders Done button', () => {
    const { getByTestId } = renderWithTheme(
      <SessionResults correct={5} total={10} onDone={jest.fn()} />,
    );

    expect(getByTestId('session-results-done')).toBeTruthy();
  });

  it('calls onDone when Done button is pressed', () => {
    const onDone = jest.fn();
    const { getByTestId } = renderWithTheme(
      <SessionResults correct={5} total={10} onDone={onDone} />,
    );

    fireEvent.press(getByTestId('session-results-done'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('accepts custom testID', () => {
    const { getByTestId } = renderWithTheme(
      <SessionResults correct={5} total={10} onDone={jest.fn()} testID="custom" />,
    );

    expect(getByTestId('custom')).toBeTruthy();
  });
});
