import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import { RootNavigator } from '../../src/navigation/RootNavigator';
import { ThemeProvider } from '../../src/theme';

const mockHasApiKey = jest.fn();
jest.mock('../../src/storage', () => ({
  hasApiKey: (...args: unknown[]) => mockHasApiKey(...args),
}));

// Mock all screens to lightweight components
jest.mock('../../src/screens/HomeScreen', () => ({
  HomeScreen: () => {
    const { View, Text } = require('react-native');
    return (
      <View testID="home-screen">
        <Text>Home</Text>
      </View>
    );
  },
}));

jest.mock('../../src/screens/WelcomeScreen', () => ({
  WelcomeScreen: () => {
    const { View, Text } = require('react-native');
    return (
      <View testID="welcome-screen">
        <Text>Welcome</Text>
      </View>
    );
  },
}));

// Mock remaining screens to prevent import errors
jest.mock('../../src/screens/ApiKeyInputScreen', () => ({
  ApiKeyInputScreen: () => null,
}));
jest.mock('../../src/screens/InstructionsScreen', () => ({
  InstructionsScreen: () => null,
}));
jest.mock('../../src/screens/SyncScreen', () => ({
  SyncScreen: () => null,
}));
jest.mock('../../src/screens/WizardNotificationScreen', () => ({
  WizardNotificationScreen: () => null,
}));
jest.mock('../../src/screens/WizardCompletionScreen', () => ({
  WizardCompletionScreen: () => null,
}));
jest.mock('../../src/screens/LessonsScreen', () => ({
  LessonsScreen: () => null,
}));
jest.mock('../../src/screens/ReviewsScreen', () => ({
  ReviewsScreen: () => null,
}));
jest.mock('../../src/screens/PracticeScreen', () => ({
  PracticeScreen: () => null,
}));
jest.mock('../../src/screens/SearchScreen', () => ({
  SearchScreen: () => null,
}));
jest.mock('../../src/screens/SettingsScreen', () => ({
  SettingsScreen: () => null,
}));
jest.mock('../../src/screens/ItemDetailScreen', () => ({
  ItemDetailScreen: () => null,
}));
jest.mock('../../src/screens/RadicalDetailScreen', () => ({
  RadicalDetailScreen: () => null,
}));
jest.mock('../../src/screens/KanjiDetailScreen', () => ({
  KanjiDetailScreen: () => null,
}));
jest.mock('../../src/screens/VocabularyDetailScreen', () => ({
  VocabularyDetailScreen: () => null,
}));
jest.mock('../../src/screens/NotificationPermissionScreen', () => ({
  NotificationPermissionScreen: () => null,
}));

function renderNavigator() {
  return render(
    <ThemeProvider forcedColorScheme="light">
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </ThemeProvider>,
  );
}

describe('RootNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Home screen when API key exists', async () => {
    mockHasApiKey.mockResolvedValue(true);

    const { findByTestId } = renderNavigator();

    await waitFor(() => {
      expect(mockHasApiKey).toHaveBeenCalled();
    });

    const homeScreen = await findByTestId('home-screen');
    expect(homeScreen).toBeTruthy();
  });

  it('shows Welcome screen when no API key exists', async () => {
    mockHasApiKey.mockResolvedValue(false);

    const { findByTestId } = renderNavigator();

    await waitFor(() => {
      expect(mockHasApiKey).toHaveBeenCalled();
    });

    const welcomeScreen = await findByTestId('welcome-screen');
    expect(welcomeScreen).toBeTruthy();
  });
});
