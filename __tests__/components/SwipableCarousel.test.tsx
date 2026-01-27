import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import { SwipableCarousel } from '../../src/components/SwipableCarousel';
import { ThemeProvider } from '../../src/theme';

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider forcedColorScheme="light">{ui}</ThemeProvider>,
  );
}

const pages = [
  <Text key="1">Page 1</Text>,
  <Text key="2">Page 2</Text>,
  <Text key="3">Page 3</Text>,
];

describe('SwipableCarousel', () => {
  it('renders all pages', () => {
    const { getByText } = renderWithTheme(
      <SwipableCarousel pages={pages} />,
    );
    expect(getByText('Page 1')).toBeTruthy();
    expect(getByText('Page 2')).toBeTruthy();
    expect(getByText('Page 3')).toBeTruthy();
  });

  it('renders page indicator dots matching page count', () => {
    const { getByTestId } = renderWithTheme(
      <SwipableCarousel pages={pages} />,
    );
    const indicators = getByTestId('page-indicators');
    expect(indicators.children).toHaveLength(3);
  });

  it('highlights the first dot as active by default', () => {
    const { getByTestId } = renderWithTheme(
      <SwipableCarousel pages={pages} />,
    );
    const activeDot = getByTestId('page-dot-0');
    const inactiveDot = getByTestId('page-dot-1');

    // Active dot should have higher opacity than inactive
    const activeStyle = activeDot.props.style;
    const inactiveStyle = inactiveDot.props.style;

    const getOpacity = (style: any) => {
      if (Array.isArray(style)) {
        for (const s of style) {
          if (s && typeof s === 'object' && 'opacity' in s) {
            return s.opacity;
          }
        }
      }
      return style?.opacity;
    };

    expect(getOpacity(activeStyle)).toBe(1);
    expect(getOpacity(inactiveStyle)).toBeLessThan(1);
  });

  it('calls onPageChange when page changes', () => {
    const onPageChange = jest.fn();
    const { getByTestId } = renderWithTheme(
      <SwipableCarousel pages={pages} onPageChange={onPageChange} />,
    );

    const scrollView = getByTestId('carousel-scroll-view');

    // Simulate scroll to page 2 (index 1)
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { x: 375, y: 0 },
        layoutMeasurement: { width: 375, height: 600 },
        contentSize: { width: 1125, height: 600 },
      },
    });

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('renders with a single page', () => {
    const singlePage = [<Text key="1">Only Page</Text>];
    const { getByText, getByTestId } = renderWithTheme(
      <SwipableCarousel pages={singlePage} />,
    );
    expect(getByText('Only Page')).toBeTruthy();
    const indicators = getByTestId('page-indicators');
    expect(indicators.children).toHaveLength(1);
  });

  it('uses custom testID when provided', () => {
    const { getByTestId } = renderWithTheme(
      <SwipableCarousel pages={pages} testID="custom-carousel" />,
    );
    expect(getByTestId('custom-carousel')).toBeTruthy();
  });

  it('renders with default testID', () => {
    const { getByTestId } = renderWithTheme(
      <SwipableCarousel pages={pages} />,
    );
    expect(getByTestId('swipable-carousel')).toBeTruthy();
  });
});
