import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { ThemeProvider, useTheme, useDarkMode } from '../../src/theme/ThemeContext';
import { COLORS, SUBJECT_COLORS } from '../../src/theme';

// Test component that uses the theme
function ThemeConsumer({ testID = 'consumer' }: { testID?: string }) {
  const theme = useTheme();
  return (
    <View testID={testID}>
      <Text testID="color-scheme">{theme.colorScheme}</Text>
      <Text testID="is-dark">{theme.isDark.toString()}</Text>
      <Text testID="bg-primary">{theme.colors.background.primary}</Text>
      <Text testID="text-primary">{theme.colors.text.primary}</Text>
      <Text testID="subject-kanji">{theme.colors.subject.kanji}</Text>
    </View>
  );
}

// Test component that uses useDarkMode
function DarkModeConsumer() {
  const isDark = useDarkMode();
  return <Text testID="is-dark-mode">{isDark.toString()}</Text>;
}

describe('ThemeContext', () => {
  describe('ThemeProvider', () => {
    it('provides theme context to children', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(getByTestId('consumer')).toBeTruthy();
    });

    it('defaults to light mode', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(getByTestId('color-scheme').props.children).toBe('light');
      expect(getByTestId('is-dark').props.children).toBe('false');
    });

    it('provides light mode colors by default', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(getByTestId('bg-primary').props.children).toBe(COLORS.background.primary);
      expect(getByTestId('text-primary').props.children).toBe(COLORS.text.primary);
    });

    it('always provides subject colors', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(getByTestId('subject-kanji').props.children).toBe(SUBJECT_COLORS.kanji);
    });
  });

  describe('forcedColorScheme', () => {
    it('forces light mode when specified', () => {
      const { getByTestId } = render(
        <ThemeProvider forcedColorScheme="light">
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(getByTestId('color-scheme').props.children).toBe('light');
      expect(getByTestId('is-dark').props.children).toBe('false');
    });

    it('forces dark mode when specified', () => {
      const { getByTestId } = render(
        <ThemeProvider forcedColorScheme="dark">
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(getByTestId('color-scheme').props.children).toBe('dark');
      expect(getByTestId('is-dark').props.children).toBe('true');
    });

    it('provides dark mode colors when forced to dark', () => {
      const { getByTestId } = render(
        <ThemeProvider forcedColorScheme="dark">
          <ThemeConsumer />
        </ThemeProvider>,
      );

      // Dark mode has different background color
      expect(getByTestId('bg-primary').props.children).toBe('#121212');
      expect(getByTestId('text-primary').props.children).toBe('#E0E0E0');
    });
  });

  describe('useTheme', () => {
    it('throws error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ThemeConsumer />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });

    it('returns theme object with all required properties', () => {
      let capturedTheme: ReturnType<typeof useTheme> | null = null;

      function CaptureTheme() {
        capturedTheme = useTheme();
        return null;
      }

      render(
        <ThemeProvider>
          <CaptureTheme />
        </ThemeProvider>,
      );

      expect(capturedTheme).not.toBeNull();
      expect(capturedTheme!.colorScheme).toBeDefined();
      expect(capturedTheme!.colors).toBeDefined();
      expect(capturedTheme!.dashboardColors).toBeDefined();
      expect(capturedTheme!.progressColors).toBeDefined();
      expect(capturedTheme!.shadow).toBeDefined();
      expect(capturedTheme!.isDark).toBeDefined();
    });
  });

  describe('useDarkMode', () => {
    it('throws error when used outside ThemeProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<DarkModeConsumer />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });

    it('returns false in light mode', () => {
      const { getByTestId } = render(
        <ThemeProvider forcedColorScheme="light">
          <DarkModeConsumer />
        </ThemeProvider>,
      );

      expect(getByTestId('is-dark-mode').props.children).toBe('false');
    });

    it('returns true in dark mode', () => {
      const { getByTestId } = render(
        <ThemeProvider forcedColorScheme="dark">
          <DarkModeConsumer />
        </ThemeProvider>,
      );

      expect(getByTestId('is-dark-mode').props.children).toBe('true');
    });
  });

  describe('theme structure', () => {
    it('provides consistent colors structure in light mode', () => {
      let capturedTheme: ReturnType<typeof useTheme> | null = null;

      function CaptureTheme() {
        capturedTheme = useTheme();
        return null;
      }

      render(
        <ThemeProvider forcedColorScheme="light">
          <CaptureTheme />
        </ThemeProvider>,
      );

      const colors = capturedTheme!.colors;

      // Check all color categories exist
      expect(colors.subject).toBeDefined();
      expect(colors.feedback).toBeDefined();
      expect(colors.status).toBeDefined();
      expect(colors.neutral).toBeDefined();
      expect(colors.text).toBeDefined();
      expect(colors.background).toBeDefined();
      expect(colors.border).toBeDefined();
      expect(colors.shadow).toBeDefined();
    });

    it('provides consistent colors structure in dark mode', () => {
      let capturedTheme: ReturnType<typeof useTheme> | null = null;

      function CaptureTheme() {
        capturedTheme = useTheme();
        return null;
      }

      render(
        <ThemeProvider forcedColorScheme="dark">
          <CaptureTheme />
        </ThemeProvider>,
      );

      const colors = capturedTheme!.colors;

      // Check all color categories exist
      expect(colors.subject).toBeDefined();
      expect(colors.feedback).toBeDefined();
      expect(colors.status).toBeDefined();
      expect(colors.neutral).toBeDefined();
      expect(colors.text).toBeDefined();
      expect(colors.background).toBeDefined();
      expect(colors.border).toBeDefined();
      expect(colors.shadow).toBeDefined();
    });

    it('provides shadow object with correct structure', () => {
      let capturedTheme: ReturnType<typeof useTheme> | null = null;

      function CaptureTheme() {
        capturedTheme = useTheme();
        return null;
      }

      render(
        <ThemeProvider>
          <CaptureTheme />
        </ThemeProvider>,
      );

      const shadow = capturedTheme!.shadow;

      expect(shadow.color).toBeDefined();
      expect(shadow.offset).toBeDefined();
      expect(shadow.offset.width).toBeDefined();
      expect(shadow.offset.height).toBeDefined();
      expect(shadow.opacity).toBeDefined();
      expect(shadow.radius).toBeDefined();
      expect(shadow.elevation).toBeDefined();
    });
  });
});
