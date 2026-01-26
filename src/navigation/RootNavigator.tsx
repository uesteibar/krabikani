import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { HomeScreen } from '../screens/HomeScreen';
import { ItemDetailScreen } from '../screens/ItemDetailScreen';
import { KanjiDetailScreen } from '../screens/KanjiDetailScreen';
import { LessonsScreen } from '../screens/LessonsScreen';
import { NotificationPermissionScreen } from '../screens/NotificationPermissionScreen';
import { RadicalDetailScreen } from '../screens/RadicalDetailScreen';
import { ReviewsScreen } from '../screens/ReviewsScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTheme } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Screen transition animation configuration.
 * Uses smooth slide animation for a polished feel.
 */
const screenOptions = {
  /** Smooth fade transition between screens */
  animation: 'slide_from_right' as const,
  /** Animation duration in ms */
  animationDuration: 250,
  /** Enable gesture-based navigation */
  gestureEnabled: true,
};

export function RootNavigator() {
  const theme = useTheme();
  const { colors, isDark } = theme;

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        ...screenOptions,
        headerStyle: {
          backgroundColor: colors.background.primary,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: colors.background.primary,
        },
        headerShadowVisible: !isDark,
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Lessons"
        component={LessonsScreen}
        options={{ title: 'Lessons' }}
      />
      <Stack.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={{ title: 'Reviews' }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ title: 'Item Details' }}
      />
      <Stack.Screen
        name="RadicalDetail"
        component={RadicalDetailScreen}
        options={{ title: 'Radical' }}
      />
      <Stack.Screen
        name="KanjiDetail"
        component={KanjiDetailScreen}
        options={{ title: 'Kanji' }}
      />
      <Stack.Screen
        name="NotificationPermission"
        component={NotificationPermissionScreen}
        options={{ title: 'Notifications', headerBackVisible: false }}
      />
    </Stack.Navigator>
  );
}
