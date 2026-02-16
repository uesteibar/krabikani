import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { InstructionsScreen } from '../../src/screens/InstructionsScreen';
import { ThemeProvider } from '../../src/theme';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

function renderWithTheme(
  ui: React.ReactElement,
  colorScheme: 'light' | 'dark' = 'light',
) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <ThemeProvider forcedColorScheme={colorScheme}>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('InstructionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen', () => {
    const { getByTestId } = renderWithTheme(<InstructionsScreen />);
    expect(getByTestId('instructions-screen')).toBeTruthy();
  });

  it('renders the carousel', () => {
    const { getByTestId } = renderWithTheme(<InstructionsScreen />);
    expect(getByTestId('instructions-carousel')).toBeTruthy();
  });

  it('renders 4 instruction pages', () => {
    const { getByTestId } = renderWithTheme(<InstructionsScreen />);
    expect(getByTestId('carousel-page-0')).toBeTruthy();
    expect(getByTestId('carousel-page-1')).toBeTruthy();
    expect(getByTestId('carousel-page-2')).toBeTruthy();
    expect(getByTestId('carousel-page-3')).toBeTruthy();
  });

  it('shows step titles on each page', () => {
    const { getByText } = renderWithTheme(<InstructionsScreen />);
    expect(getByText(/Personal API Tokens/)).toBeTruthy();
    expect(getByText(/Generate a new token/)).toBeTruthy();
    expect(getByText(/check all permissions/)).toBeTruthy();
    expect(getByText(/Copy your/)).toBeTruthy();
  });

  it('shows page indicator dots', () => {
    const { getByTestId } = renderWithTheme(<InstructionsScreen />);
    expect(getByTestId('page-indicators')).toBeTruthy();
  });

  it('shows Next button on first page', () => {
    const { getByTestId } = renderWithTheme(<InstructionsScreen />);
    expect(getByTestId('next-button')).toBeTruthy();
  });

  it('shows Back button on first page (navigates to Welcome)', () => {
    const { getByTestId } = renderWithTheme(<InstructionsScreen />);
    expect(getByTestId('back-button')).toBeTruthy();
    fireEvent.press(getByTestId('back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows screenshot images', () => {
    const { getByTestId } = renderWithTheme(<InstructionsScreen />);
    expect(getByTestId('instruction-image-0')).toBeTruthy();
  });

  it('renders the Open WaniKani Settings link inside the last page', () => {
    const { getByTestId } = renderWithTheme(<InstructionsScreen />);

    // The link is rendered inside the last carousel page (always in DOM)
    expect(getByTestId('open-wanikani-button')).toBeTruthy();
  });

  it('shows Continue button on last page and navigates to ApiKeyInput', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(
      <InstructionsScreen />,
    );
    // Initially on page 0 — should show Next, not Continue
    expect(getByTestId('next-button')).toBeTruthy();
    expect(queryByTestId('continue-button')).toBeNull();

    // Simulate scrolling to the last page (index 3)
    const scrollView = getByTestId('carousel-scroll-view');
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { x: 375 * 3, y: 0 },
        layoutMeasurement: { width: 375, height: 600 },
        contentSize: { width: 375 * 4, height: 600 },
      },
    });

    // Now should show Continue instead of Next
    expect(getByTestId('continue-button')).toBeTruthy();
    expect(queryByTestId('next-button')).toBeNull();
    fireEvent.press(getByTestId('continue-button'));
    expect(mockNavigate).toHaveBeenCalledWith('ApiKeyInput');
  });

  describe('Theme-aware styling', () => {
    it('should use light button text color in light mode', () => {
      const { getByText } = renderWithTheme(<InstructionsScreen />);
      const buttonText = getByText('Next');
      const flatStyle = Array.isArray(buttonText.props.style)
        ? Object.assign({}, ...buttonText.props.style.flat())
        : buttonText.props.style;
      expect(flatStyle.color).toBe('#FFFFFF');
    });

    it('should use dark button text color in dark mode', () => {
      const { getByText } = renderWithTheme(<InstructionsScreen />, 'dark');
      const buttonText = getByText('Next');
      const flatStyle = Array.isArray(buttonText.props.style)
        ? Object.assign({}, ...buttonText.props.style.flat())
        : buttonText.props.style;
      expect(flatStyle.color).toBe('#121212');
    });
  });
});
