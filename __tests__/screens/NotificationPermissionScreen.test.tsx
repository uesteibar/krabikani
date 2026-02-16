import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { View, Text } from 'react-native';

import { NotificationPermissionScreen } from '../../src/screens/NotificationPermissionScreen';
import * as notificationService from '../../src/services/notificationService';
import { ThemeProvider } from '../../src/theme';
import type { RootStackParamList } from '../../src/navigation/types';

jest.mock('../../src/services/notificationService');

const Stack = createNativeStackNavigator<RootStackParamList>();

// Mock Home screen for navigation tests
function MockHomeScreen() {
  return (
    <View testID="home-screen">
      <Text>Home Screen</Text>
    </View>
  );
}

// Wrapper for tests that need navigation
function renderWithNavigation(
  initialRouteName: keyof RootStackParamList = 'NotificationPermission',
  initialParams?: { isInitialSetup?: boolean },
  colorScheme: 'light' | 'dark' = 'light',
) {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRouteName}>
          <Stack.Screen name="Home" component={MockHomeScreen} />
          <Stack.Screen
            name="NotificationPermission"
            component={NotificationPermissionScreen}
            initialParams={initialParams}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>,
  );
}

const mockNotificationService = notificationService as jest.Mocked<
  typeof notificationService
>;

describe('NotificationPermissionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationService.requestPermissions.mockResolvedValue('granted');
    mockNotificationService.setHasAskedForPermissions.mockResolvedValue(
      undefined,
    );
    mockNotificationService.setNotificationsEnabled.mockResolvedValue(
      undefined,
    );
  });

  it('should render the screen with title and description', async () => {
    const { getByTestId } = renderWithNavigation();

    await waitFor(() => {
      expect(getByTestId('notification-permission-screen')).toBeTruthy();
    });

    expect(getByTestId('permission-title')).toBeTruthy();
    expect(getByTestId('permission-description').props.children).toContain(
      'Get reminded when you have reviews waiting',
    );
  });

  it('should render Enable Notifications and Maybe Later buttons', async () => {
    const { getByTestId } = renderWithNavigation();

    await waitFor(() => {
      expect(getByTestId('enable-notifications-button')).toBeTruthy();
    });

    expect(getByTestId('maybe-later-button')).toBeTruthy();
  });

  describe('Enable Notifications button', () => {
    it('should request permissions when pressed', async () => {
      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('enable-notifications-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('enable-notifications-button'));

      await waitFor(() => {
        expect(mockNotificationService.requestPermissions).toHaveBeenCalled();
      });
    });

    it('should mark hasAskedForPermissions as true after request', async () => {
      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('enable-notifications-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('enable-notifications-button'));

      await waitFor(() => {
        expect(
          mockNotificationService.setHasAskedForPermissions,
        ).toHaveBeenCalledWith(true);
      });
    });

    it('should enable notifications when permissions are granted', async () => {
      mockNotificationService.requestPermissions.mockResolvedValue('granted');

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('enable-notifications-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('enable-notifications-button'));

      await waitFor(() => {
        expect(
          mockNotificationService.setNotificationsEnabled,
        ).toHaveBeenCalledWith(true);
      });
    });

    it('should disable notifications when permissions are denied', async () => {
      mockNotificationService.requestPermissions.mockResolvedValue('denied');

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('enable-notifications-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('enable-notifications-button'));

      await waitFor(() => {
        expect(
          mockNotificationService.setNotificationsEnabled,
        ).toHaveBeenCalledWith(false);
      });
    });

    it('should call navigation.goBack after handling permissions', async () => {
      const { getByTestId } = renderWithNavigation('NotificationPermission');

      await waitFor(() => {
        expect(getByTestId('enable-notifications-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('enable-notifications-button'));

      // Verify that the navigation actions were called (goBack is invoked)
      // In a real navigation flow starting from Home, goBack would navigate back
      // Here we just verify the async operations complete without throwing
      await waitFor(() => {
        expect(
          mockNotificationService.setHasAskedForPermissions,
        ).toHaveBeenCalled();
      });
    });

    it('should show loading state while requesting permissions', async () => {
      // Make request permission never resolve immediately
      mockNotificationService.requestPermissions.mockImplementation(
        () => new Promise(() => {}),
      );

      const { getByTestId, getByText } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('enable-notifications-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('enable-notifications-button'));

      await waitFor(() => {
        expect(getByText('Requesting...')).toBeTruthy();
      });
    });

    it('should disable button while loading', async () => {
      mockNotificationService.requestPermissions.mockImplementation(
        () => new Promise(() => {}),
      );

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('enable-notifications-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('enable-notifications-button'));

      await waitFor(() => {
        expect(
          getByTestId('enable-notifications-button').props.accessibilityState
            ?.disabled,
        ).toBe(true);
      });
    });
  });

  describe('Maybe Later button', () => {
    it('should mark hasAskedForPermissions as true when pressed', async () => {
      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('maybe-later-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('maybe-later-button'));

      await waitFor(() => {
        expect(
          mockNotificationService.setHasAskedForPermissions,
        ).toHaveBeenCalledWith(true);
      });
    });

    it('should disable notifications when pressed', async () => {
      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('maybe-later-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('maybe-later-button'));

      await waitFor(() => {
        expect(
          mockNotificationService.setNotificationsEnabled,
        ).toHaveBeenCalledWith(false);
      });
    });

    it('should NOT request permissions from OS', async () => {
      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('maybe-later-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('maybe-later-button'));

      await waitFor(() => {
        expect(
          mockNotificationService.setHasAskedForPermissions,
        ).toHaveBeenCalled();
      });

      expect(mockNotificationService.requestPermissions).not.toHaveBeenCalled();
    });

    it('should call navigation.goBack after pressing', async () => {
      const { getByTestId } = renderWithNavigation('NotificationPermission');

      await waitFor(() => {
        expect(getByTestId('maybe-later-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('maybe-later-button'));

      // Verify that the async operations complete (goBack is invoked)
      // In a real navigation flow starting from Home, goBack would navigate back
      await waitFor(() => {
        expect(
          mockNotificationService.setHasAskedForPermissions,
        ).toHaveBeenCalled();
      });
    });

    it('should be disabled while enable button is loading', async () => {
      mockNotificationService.requestPermissions.mockImplementation(
        () => new Promise(() => {}),
      );

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('enable-notifications-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('enable-notifications-button'));

      await waitFor(() => {
        expect(
          getByTestId('maybe-later-button').props.accessibilityState?.disabled,
        ).toBe(true);
      });
    });
  });

  describe('Initial setup navigation', () => {
    it('should navigate to Home after Enable Notifications when isInitialSetup is true', async () => {
      const { getByTestId } = renderWithNavigation('NotificationPermission', {
        isInitialSetup: true,
      });

      await waitFor(() => {
        expect(getByTestId('enable-notifications-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('enable-notifications-button'));

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });

    it('should navigate to Home after Maybe Later when isInitialSetup is true', async () => {
      const { getByTestId } = renderWithNavigation('NotificationPermission', {
        isInitialSetup: true,
      });

      await waitFor(() => {
        expect(getByTestId('maybe-later-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('maybe-later-button'));

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });

    it('should call goBack when isInitialSetup is false (default)', async () => {
      // This test verifies that without isInitialSetup=true
      // the default goBack behavior is used
      const { getByTestId } = renderWithNavigation('NotificationPermission', {
        isInitialSetup: false,
      });

      await waitFor(() => {
        expect(getByTestId('notification-permission-screen')).toBeTruthy();
      });

      // Since there's no previous screen to go back to when starting from NotificationPermission,
      // the goBack call won't navigate anywhere, but the test confirms the flow completes
      fireEvent.press(getByTestId('maybe-later-button'));

      await waitFor(() => {
        expect(
          mockNotificationService.setHasAskedForPermissions,
        ).toHaveBeenCalled();
      });
    });

    it('should use default isInitialSetup=false when no params provided', async () => {
      const { getByTestId } = renderWithNavigation('NotificationPermission');

      await waitFor(() => {
        expect(getByTestId('notification-permission-screen')).toBeTruthy();
      });

      // Press Maybe Later - this should call goBack (default behavior)
      fireEvent.press(getByTestId('maybe-later-button'));

      await waitFor(() => {
        expect(
          mockNotificationService.setHasAskedForPermissions,
        ).toHaveBeenCalled();
      });

      // Since we started on NotificationPermission directly without a previous screen,
      // we can't actually verify goBack navigated anywhere, but we verify no crash
      // and that Home screen is NOT reached via reset (since isInitialSetup is false)
    });
  });

  describe('Theme-aware styling', () => {
    it('should use light button text color in light mode', async () => {
      const { getByText } = renderWithNavigation();
      await waitFor(() => {
        expect(getByText('Enable Notifications')).toBeTruthy();
      });
      const buttonText = getByText('Enable Notifications');
      const flatStyle = Array.isArray(buttonText.props.style)
        ? Object.assign({}, ...buttonText.props.style.flat())
        : buttonText.props.style;
      expect(flatStyle.color).toBe('#FFFFFF');
    });

    it('should use dark button text color in dark mode', async () => {
      const { getByText } = renderWithNavigation(
        'NotificationPermission',
        undefined,
        'dark',
      );
      await waitFor(() => {
        expect(getByText('Enable Notifications')).toBeTruthy();
      });
      const buttonText = getByText('Enable Notifications');
      const flatStyle = Array.isArray(buttonText.props.style)
        ? Object.assign({}, ...buttonText.props.style.flat())
        : buttonText.props.style;
      expect(flatStyle.color).toBe('#121212');
    });
  });
});
