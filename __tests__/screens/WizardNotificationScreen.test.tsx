import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import { WizardNotificationScreen } from '../../src/screens/WizardNotificationScreen';
import { ThemeProvider } from '../../src/theme';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../src/services/notificationService', () => ({
  requestPermissions: jest.fn().mockResolvedValue('granted'),
  setHasAskedForPermissions: jest.fn().mockResolvedValue(undefined),
  setNotificationsEnabled: jest.fn().mockResolvedValue(undefined),
}));

const notificationService =
  require('../../src/services/notificationService') as jest.Mocked<
    typeof import('../../src/services/notificationService')
  >;

function renderWithTheme(
  ui: React.ReactElement,
  colorScheme: 'light' | 'dark' = 'light',
) {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme}>{ui}</ThemeProvider>,
  );
}

describe('WizardNotificationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notificationService.requestPermissions.mockResolvedValue('granted');
    notificationService.setHasAskedForPermissions.mockResolvedValue(undefined);
    notificationService.setNotificationsEnabled.mockResolvedValue(undefined);
  });

  it('renders the screen', () => {
    const { getByTestId } = renderWithTheme(<WizardNotificationScreen />);
    expect(getByTestId('wizard-notification-screen')).toBeTruthy();
  });

  it('displays title and description', () => {
    const { getByText } = renderWithTheme(<WizardNotificationScreen />);
    expect(getByText('Stay on Top of Your Reviews')).toBeTruthy();
    expect(
      getByText(/Get reminded when you have reviews waiting/),
    ).toBeTruthy();
  });

  it('renders Enable Notifications and Maybe Later buttons', () => {
    const { getByTestId } = renderWithTheme(<WizardNotificationScreen />);
    expect(getByTestId('enable-notifications-button')).toBeTruthy();
    expect(getByTestId('maybe-later-button')).toBeTruthy();
  });

  it('navigates to WizardCompletion after enabling notifications', async () => {
    const { getByTestId } = renderWithTheme(<WizardNotificationScreen />);

    fireEvent.press(getByTestId('enable-notifications-button'));

    await waitFor(() => {
      expect(notificationService.requestPermissions).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('WizardCompletion');
    });
  });

  it('enables notifications when permissions are granted', async () => {
    notificationService.requestPermissions.mockResolvedValue('granted');

    const { getByTestId } = renderWithTheme(<WizardNotificationScreen />);
    fireEvent.press(getByTestId('enable-notifications-button'));

    await waitFor(() => {
      expect(notificationService.setNotificationsEnabled).toHaveBeenCalledWith(
        true,
      );
    });
  });

  it('disables notifications when permissions are denied', async () => {
    notificationService.requestPermissions.mockResolvedValue('denied');

    const { getByTestId } = renderWithTheme(<WizardNotificationScreen />);
    fireEvent.press(getByTestId('enable-notifications-button'));

    await waitFor(() => {
      expect(notificationService.setNotificationsEnabled).toHaveBeenCalledWith(
        false,
      );
    });
  });

  it('navigates to WizardCompletion after pressing Maybe Later', async () => {
    const { getByTestId } = renderWithTheme(<WizardNotificationScreen />);

    fireEvent.press(getByTestId('maybe-later-button'));

    await waitFor(() => {
      expect(notificationService.setHasAskedForPermissions).toHaveBeenCalledWith(true);
      expect(notificationService.setNotificationsEnabled).toHaveBeenCalledWith(false);
      expect(mockNavigate).toHaveBeenCalledWith('WizardCompletion');
    });
  });

  it('does not request OS permissions when pressing Maybe Later', async () => {
    const { getByTestId } = renderWithTheme(<WizardNotificationScreen />);

    fireEvent.press(getByTestId('maybe-later-button'));

    await waitFor(() => {
      expect(notificationService.setHasAskedForPermissions).toHaveBeenCalled();
    });

    expect(notificationService.requestPermissions).not.toHaveBeenCalled();
  });

  it('shows loading state while requesting permissions', async () => {
    notificationService.requestPermissions.mockImplementation(
      () => new Promise(() => {}),
    );

    const { getByTestId, getByText } = renderWithTheme(
      <WizardNotificationScreen />,
    );

    fireEvent.press(getByTestId('enable-notifications-button'));

    await waitFor(() => {
      expect(getByText('Requesting...')).toBeTruthy();
    });
  });

  describe('Theme-aware styling', () => {
    it('should use light button text color in light mode', () => {
      const { getByText } = renderWithTheme(<WizardNotificationScreen />);
      const buttonText = getByText('Enable Notifications');
      const flatStyle = Array.isArray(buttonText.props.style)
        ? Object.assign({}, ...buttonText.props.style.flat())
        : buttonText.props.style;
      expect(flatStyle.color).toBe('#FFFFFF');
    });

    it('should use dark button text color in dark mode', () => {
      const { getByText } = renderWithTheme(
        <WizardNotificationScreen />,
        'dark',
      );
      const buttonText = getByText('Enable Notifications');
      const flatStyle = Array.isArray(buttonText.props.style)
        ? Object.assign({}, ...buttonText.props.style.flat())
        : buttonText.props.style;
      expect(flatStyle.color).toBe('#121212');
    });
  });
});
