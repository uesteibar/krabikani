import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  LayoutChangeEvent,
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

export interface SwipableCarouselRef {
  scrollToPage: (index: number) => void;
}

export const SwipableCarousel = forwardRef<
  SwipableCarouselRef,
  SwipableCarouselProps
>(function SwipableCarousel(
  { pages, onPageChange, testID = 'swipable-carousel' },
  ref,
) {
  const { colors } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setScrollHeight(event.nativeEvent.layout.height);
  }, []);

  useImperativeHandle(ref, () => ({
    scrollToPage(index: number) {
      scrollViewRef.current?.scrollTo({
        x: index * SCREEN_WIDTH,
        animated: true,
      });
    },
  }));

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

  const activeDotStyle = useMemo(
    () => ({ backgroundColor: colors.text.primary, opacity: 1 }),
    [colors.text.primary],
  );
  const inactiveDotStyle = useMemo(
    () => ({ backgroundColor: colors.text.primary, opacity: 0.3 }),
    [colors.text.primary],
  );

  return (
    <View style={styles.container} testID={testID}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onLayout={handleLayout}
        scrollEventThrottle={16}
        testID="carousel-scroll-view"
      >
        {pages.map((page, index) => (
          <View
            key={index}
            style={[
              styles.page,
              { width: SCREEN_WIDTH, height: scrollHeight || undefined },
            ]}
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
              index === currentPage ? activeDotStyle : inactiveDotStyle,
            ]}
          />
        ))}
      </View>
    </View>
  );
});

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
