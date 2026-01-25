import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  addNetworkStatusListener,
  isOnline as getIsOnline,
} from '../utils/networkStatus';

export interface OfflineIndicatorProps {
  testID?: string;
}

export function OfflineIndicator({ testID }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(getIsOnline());

  useEffect(() => {
    // Update state when network status changes
    const unsubscribe = addNetworkStatusListener(connected => {
      setIsOnline(connected);
    });

    return unsubscribe;
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID ?? 'offline-indicator'}>
      <Text style={styles.text}>No Internet Connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
