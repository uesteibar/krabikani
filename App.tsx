import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import React, { useEffect, useMemo } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation';
import { ThemeProvider, COLORS } from './src/theme';
import {
  initializeNetworkMonitoring,
  stopNetworkMonitoring,
  initializeAppStateSync,
  stopAppStateSync,
} from './src/utils';

/**
 * Custom navigation theme for light mode.
 */
const LightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.subject.kanji,
    background: COLORS.background.primary,
    card: COLORS.background.primary,
    text: COLORS.text.primary,
    border: COLORS.border.light,
  },
};

/**
 * Custom navigation theme for dark mode.
 */
const DarkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.subject.kanji,
    background: '#121212',
    card: '#1E1E1E',
    text: '#E0E0E0',
    border: '#333333',
  },
};

function App() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  // Initialize network monitoring and app state sync on mount
  useEffect(() => {
    initializeNetworkMonitoring();
    initializeAppStateSync();

    return () => {
      stopNetworkMonitoring();
      stopAppStateSync();
    };
  }, []);

  // Memoize navigation theme to prevent unnecessary re-renders
  const navigationTheme = useMemo(
    () => (isDarkMode ? DarkNavigationTheme : LightNavigationTheme),
    [isDarkMode],
  );

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
