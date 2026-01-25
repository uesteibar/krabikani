import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation';
import {
  initializeNetworkMonitoring,
  stopNetworkMonitoring,
  initializeAppStateSync,
  stopAppStateSync,
} from './src/utils';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Initialize network monitoring and app state sync on mount
  useEffect(() => {
    initializeNetworkMonitoring();
    initializeAppStateSync();

    return () => {
      stopNetworkMonitoring();
      stopAppStateSync();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
