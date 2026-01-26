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
  const { handleNotificationEvent } = await import('./src/services/reviewNotificationScheduler');
  await handleNotificationEvent(type, detail.notification?.id);
});

AppRegistry.registerComponent(appName, () => App);
