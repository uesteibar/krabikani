import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  addNetworkStatusListener,
  isOnline as getIsOnline,
} from '../utils/networkStatus';
import { COLORS, SPACING, FONT_SIZES } from '../theme';

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
    backgroundColor: COLORS.status.offline,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  text: {
    color: COLORS.text.inverse,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});
