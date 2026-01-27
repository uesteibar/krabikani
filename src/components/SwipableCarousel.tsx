import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { useTheme } from '../theme';
import { SPACING, BORDER_RADIUS } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface SwipableCarouselProps {
  /** Array of page content to render as swipable pages */
  pages: React.ReactNode[];
  /** Callback fired when the current page changes */
  onPageChange?: (index: number) => void;
  /** Test ID for testing */
  testID?: string;
}

export function SwipableCarousel({
  pages,
  onPageChange,
  testID = 'swipable-carousel',
}: SwipableCarouselProps) {
  const { colors } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const pageWidth = event.nativeEvent.layoutMeasurement.width;
      const newPage = Math.round(offsetX / pageWidth);

      if (newPage !== currentPage && newPage >= 0 && newPage < pages.length) {
        setCurrentPage(newPage);
        onPageChange?.(newPage);
      }
    },
    [currentPage, pages.length, onPageChange],
  );

  return (
    <View style={styles.container} testID={testID}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        testID="carousel-scroll-view"
      >
        {pages.map((page, index) => (
          <View
            key={index}
            style={[styles.page, { width: SCREEN_WIDTH }]}
            testID={`carousel-page-${index}`}
          >
            {page}
          </View>
        ))}
      </ScrollView>

      <View style={styles.indicators} testID="page-indicators">
        {pages.map((_, index) => (
          <View
            key={index}
            testID={`page-dot-${index}`}
            style={[
              styles.dot,
              {
                backgroundColor: colors.text.primary,
                opacity: index === currentPage ? 1 : 0.3,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.full,
    marginHorizontal: SPACING.xs,
  },
});
