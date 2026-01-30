import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import notifee from '@notifee/react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation';
import {
  initializeReviewNotificationScheduler,
  stopReviewNotificationScheduler,
  handleNotificationEvent,
} from './src/services';
import { initializeDatabaseWithMigrations } from './src/storage';
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
  const [isDbReady, setIsDbReady] = useState(false);

  // Initialize database on mount
  useEffect(() => {
    const initDb = async () => {
      console.log('[App] Initializing database...');
      const success = await initializeDatabaseWithMigrations();
      console.log('[App] Database initialization result:', success);
      setIsDbReady(true);
    };
    initDb();
  }, []);

  // Initialize network monitoring and app state sync on mount
  useEffect(() => {
    initializeNetworkMonitoring();
    initializeAppStateSync();

    return () => {
      stopNetworkMonitoring();
      stopAppStateSync();
    };
  }, []);

  // Initialize review notification scheduler after database is ready
  useEffect(() => {
    if (!isDbReady) {
      return;
    }

    // Initialize the scheduler
    initializeReviewNotificationScheduler();

    // Set up foreground notification event handler
    const unsubscribeForeground = notifee.onForegroundEvent(
      async ({ type, detail }) => {
        await handleNotificationEvent(type, detail.notification?.id);
      },
    );

    return () => {
      unsubscribeForeground();
      stopReviewNotificationScheduler();
    };
  }, [isDbReady]);

  // Memoize navigation theme to prevent unnecessary re-renders
  const navigationTheme = useMemo(
    () => (isDarkMode ? DarkNavigationTheme : LightNavigationTheme),
    [isDarkMode],
  );

  const loadingBackground = useMemo(
    () => ({
      backgroundColor: isDarkMode ? '#121212' : COLORS.background.primary,
    }),
    [isDarkMode],
  );

  // Show loading screen while database initializes
  if (!isDbReady) {
    return (
      <SafeAreaProvider>
        <View style={[appStyles.loadingContainer, loadingBackground]}>
          <ActivityIndicator size="large" color={COLORS.subject.kanji} />
        </View>
      </SafeAreaProvider>
    );
  }

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

const appStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
