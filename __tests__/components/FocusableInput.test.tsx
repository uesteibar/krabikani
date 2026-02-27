import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { FocusableInput } from '../../src/components/FocusableInput';
import { COLORS } from '../../src/theme';
import { ThemeProvider } from '../../src/theme/ThemeContext';

// Helper to wrap components with ThemeProvider
const renderWithTheme = (component: React.ReactElement, colorScheme: 'light' | 'dark' = 'light') => {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme}>
      {component}
    </ThemeProvider>,
  );
};

describe('FocusableInput', () => {
  describe('rendering', () => {
    it('renders correctly', () => {
      const { getByTestId } = renderWithTheme(
        <FocusableInput testID="input" />,
      );

      expect(getByTestId('input')).toBeTruthy();
    });

    it('renders with placeholder', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <FocusableInput placeholder="Enter text..." />,
      );

      expect(getByPlaceholderText('Enter text...')).toBeTruthy();
    });

    it('renders with containerTestID', () => {
      const { getByTestId } = renderWithTheme(
        <FocusableInput containerTestID="container" testID="input" />,
      );

      expect(getByTestId('container')).toBeTruthy();
      expect(getByTestId('input')).toBeTruthy();
    });
  });

  describe('focus state', () => {
    it('changes border color on focus', () => {
      const focusColor = '#FF0000';
      const unfocusColor = '#CCCCCC';

      const { getByTestId } = renderWithTheme(
        <FocusableInput
          testID="input"
          focusColor={focusColor}
          unfocusColor={unfocusColor}
        />,
      );

      const input = getByTestId('input');

      // Initially unfocused
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderColor: unfocusColor,
            borderWidth: 2,
          }),
        ]),
      );

      // Focus the input
      fireEvent(input, 'focus');

      // Should have focus color and thicker border
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderColor: focusColor,
            borderWidth: 3,
          }),
        ]),
      );
    });

    it('reverts border color on blur', () => {
      const focusColor = '#FF0000';
      const unfocusColor = '#CCCCCC';

      const { getByTestId } = renderWithTheme(
        <FocusableInput
          testID="input"
          focusColor={focusColor}
          unfocusColor={unfocusColor}
        />,
      );

      const input = getByTestId('input');

      // Focus then blur
      fireEvent(input, 'focus');
      fireEvent(input, 'blur');

      // Should be back to unfocused state
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderColor: unfocusColor,
            borderWidth: 2,
          }),
        ]),
      );
    });
  });

  describe('glow effect', () => {
    // Helper to recursively find shadowColor in nested style array
    function findShadowColor(style: any, color: string): boolean {
      if (!style) return false;
      if (Array.isArray(style)) {
        return style.some(s => findShadowColor(s, color));
      }
      if (typeof style === 'object' && style.shadowColor === color) {
        return true;
      }
      return false;
    }

    it('applies glow effect on focus when showGlow is true', () => {
      const focusColor = '#FF0000';

      const { getByTestId } = renderWithTheme(
        <FocusableInput
          testID="input"
          containerTestID="container"
          focusColor={focusColor}
          showGlow={true}
        />,
      );

      const input = getByTestId('input');
      const container = getByTestId('container');

      // Focus the input
      fireEvent(input, 'focus');

      // Container should have shadow styles (nested array structure)
      const containerStyle = container.props.style;
      expect(findShadowColor(containerStyle, focusColor)).toBeTruthy();
    });

    it('does not apply glow effect when showGlow is false', () => {
      const focusColor = '#FF0000';

      const { getByTestId } = renderWithTheme(
        <FocusableInput
          testID="input"
          containerTestID="container"
          focusColor={focusColor}
          showGlow={false}
        />,
      );

      const input = getByTestId('input');
      const container = getByTestId('container');

      // Focus the input
      fireEvent(input, 'focus');

      // Container should not have the focused shadow styles
      const containerStyle = container.props.style;
      expect(findShadowColor(containerStyle, focusColor)).toBeFalsy();
    });
  });

  describe('default values', () => {
    it('uses default focusColor', () => {
      const { getByTestId } = renderWithTheme(
        <FocusableInput testID="input" />,
      );

      const input = getByTestId('input');

      // Focus the input
      fireEvent(input, 'focus');

      // Should use default kanji color
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderColor: COLORS.subject.kanji,
          }),
        ]),
      );
    });

    it('uses default unfocusColor', () => {
      const { getByTestId } = renderWithTheme(
        <FocusableInput testID="input" />,
      );

      const input = getByTestId('input');

      // Initially unfocused - should use default border.medium
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderColor: COLORS.border.medium,
          }),
        ]),
      );
    });
  });

  describe('text input props', () => {
    it('passes through value prop', () => {
      const { getByTestId } = renderWithTheme(
        <FocusableInput testID="input" value="test value" />,
      );

      const input = getByTestId('input');
      expect(input.props.value).toBe('test value');
    });

    it('passes through editable prop', () => {
      const { getByTestId } = renderWithTheme(
        <FocusableInput testID="input" editable={false} />,
      );

      const input = getByTestId('input');
      expect(input.props.editable).toBe(false);
    });

    it('handles onChangeText', () => {
      const onChangeText = jest.fn();

      const { getByTestId } = renderWithTheme(
        <FocusableInput testID="input" onChangeText={onChangeText} />,
      );

      const input = getByTestId('input');
      fireEvent.changeText(input, 'new text');

      expect(onChangeText).toHaveBeenCalledWith('new text');
    });

    it('sets placeholderTextColor', () => {
      const { getByTestId } = renderWithTheme(
        <FocusableInput testID="input" placeholder="test" />,
      );

      const input = getByTestId('input');
      expect(input.props.placeholderTextColor).toBe(COLORS.text.placeholder);
    });
  });

  describe('container style', () => {
    it('applies containerStyle prop', () => {
      const customStyle = { marginTop: 20 };

      const { getByTestId } = renderWithTheme(
        <FocusableInput
          testID="input"
          containerTestID="container"
          containerStyle={customStyle}
        />,
      );

      const container = getByTestId('container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining(customStyle),
        ]),
      );
    });
  });

  describe('theme colors', () => {
    it('uses theme.colors.text.primary for text color in light mode', () => {
      const { getByTestId } = render(
        <ThemeProvider forcedColorScheme="light">
          <FocusableInput testID="input" />
        </ThemeProvider>,
      );

      const input = getByTestId('input');
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#333333', // Light mode text.primary
          }),
        ]),
      );
    });

    it('uses theme.colors.text.primary for text color in dark mode', () => {
      const { getByTestId } = render(
        <ThemeProvider forcedColorScheme="dark">
          <FocusableInput testID="input" />
        </ThemeProvider>,
      );

      const input = getByTestId('input');
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#E0E0E0', // Dark mode text.primary
          }),
        ]),
      );
    });

    it('uses theme.colors.background.input for background color in light mode', () => {
      const { getByTestId } = render(
        <ThemeProvider forcedColorScheme="light">
          <FocusableInput testID="input" />
        </ThemeProvider>,
      );

      const input = getByTestId('input');
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#FAFAFA', // Light mode background.input
          }),
        ]),
      );
    });

    it('uses theme.colors.background.input for background color in dark mode', () => {
      const { getByTestId } = render(
        <ThemeProvider forcedColorScheme="dark">
          <FocusableInput testID="input" />
        </ThemeProvider>,
      );

      const input = getByTestId('input');
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#2A2A2A', // Dark mode background.input
          }),
        ]),
      );
    });

    it('uses theme.colors.text.placeholder for placeholder text in light mode', () => {
      const { getByTestId } = render(
        <ThemeProvider forcedColorScheme="light">
          <FocusableInput testID="input" placeholder="test" />
        </ThemeProvider>,
      );

      const input = getByTestId('input');
      expect(input.props.placeholderTextColor).toBe('#999999'); // Light mode text.placeholder
    });

    it('uses theme.colors.text.placeholder for placeholder text in dark mode', () => {
      const { getByTestId } = render(
        <ThemeProvider forcedColorScheme="dark">
          <FocusableInput testID="input" placeholder="test" />
        </ThemeProvider>,
      );

      const input = getByTestId('input');
      expect(input.props.placeholderTextColor).toBe('#666666'); // Dark mode text.placeholder
    });
  });
});
