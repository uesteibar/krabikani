/**
 * @format
 */

// Must be imported before any component that uses reanimated
import 'react-native-reanimated';

import notifee from '@notifee/react-native';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

/**
 * Register background event handler for notifee notifications.
 * This must be called before the app is registered.
 * We use dynamic import to avoid circular dependencies during bootstrap.
 */
notifee.onBackgroundEvent(async ({ type, detail }) => {
  try {
    // Database must be initialized before any storage queries in background/headless mode
    const { initializeDatabaseWithMigrations } = await import('./src/storage');
    await initializeDatabaseWithMigrations();

    const { handleNotificationEvent } = await import('./src/services/reviewNotificationScheduler');
    await handleNotificationEvent(type, detail.notification?.id);
  } catch (error) {
    console.error('[BackgroundEvent] Failed to handle notification event:', error);
  }
});

AppRegistry.registerComponent(appName, () => App);
