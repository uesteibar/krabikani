import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { ExpandableDetails } from '../../src/components/ExpandableDetails';

describe('ExpandableDetails', () => {
  const TestContent = () => (
    <View testID="test-content">
      <Text>Test content inside expandable</Text>
    </View>
  );

  describe('rendering', () => {
    it('should render the component', () => {
      const { getByTestId } = render(
        <ExpandableDetails>
          <TestContent />
        </ExpandableDetails>,
      );

      expect(getByTestId('expandable-details')).toBeTruthy();
    });

    it('should render with custom testID', () => {
      const { getByTestId } = render(
        <ExpandableDetails testID="custom-expandable">
          <TestContent />
        </ExpandableDetails>,
      );

      expect(getByTestId('custom-expandable')).toBeTruthy();
    });

    it('should render the toggle button', () => {
      const { getByTestId } = render(
        <ExpandableDetails>
          <TestContent />
        </ExpandableDetails>,
      );

      expect(getByTestId('expandable-details-toggle')).toBeTruthy();
    });

    it('should render the chevron', () => {
      const { getByTestId } = render(
        <ExpandableDetails>
          <TestContent />
        </ExpandableDetails>,
      );

      expect(getByTestId('expandable-details-chevron')).toBeTruthy();
    });

    it('should render the content container', () => {
      const { getByTestId } = render(
        <ExpandableDetails>
          <TestContent />
        </ExpandableDetails>,
      );

      expect(getByTestId('expandable-details-content')).toBeTruthy();
    });
  });

  describe('toggle text', () => {
    it('should show "Show full details" when collapsed', () => {
      const { getByText } = render(
        <ExpandableDetails>
          <TestContent />
        </ExpandableDetails>,
      );

      expect(getByText('Show full details')).toBeTruthy();
    });

    it('should show "Hide details" when expanded', () => {
      const { getByText, getByTestId } = render(
        <ExpandableDetails>
          <TestContent />
        </ExpandableDetails>,
      );

      // Verify initial state
      expect(getByText('Show full details')).toBeTruthy();

      // Toggle to expand
      fireEvent.press(getByTestId('expandable-details-toggle'));

      expect(getByText('Hide details')).toBeTruthy();
    });

    it('should toggle back to "Show full details" when collapsed again', () => {
      const { getByText, getByTestId } = render(
        <ExpandableDetails>
          <TestContent />
        </ExpandableDetails>,
      );

      // Toggle to expand
      fireEvent.press(getByTestId('expandable-details-toggle'));
      expect(getByText('Hide details')).toBeTruthy();

      // Toggle to collapse
      fireEvent.press(getByTestId('expandable-details-toggle'));
      expect(getByText('Show full details')).toBeTruthy();
    });
  });

  describe('toggle behavior', () => {
    it('should start collapsed by default', () => {
      const { getByText } = render(
        <ExpandableDetails>
          <TestContent />
        </ExpandableDetails>,
      );

      // Default state shows "Show full details"
      expect(getByText('Show full details')).toBeTruthy();
    });

    it('should expand when toggle is pressed', () => {
      const { getByText, getByTestId } = render(
        <ExpandableDetails>
          <TestContent />
        </ExpandableDetails>,
      );

      fireEvent.press(getByTestId('expandable-details-toggle'));

      // Text changes to "Hide details"
      expect(getByText('Hide details')).toBeTruthy();
    });

    it('should collapse when toggle is pressed again', () => {
      const { getByText, getByTestId } = render(
        <ExpandableDetails>
          <TestContent />
        </ExpandableDetails>,
      );

      // Expand
      fireEvent.press(getByTestId('expandable-details-toggle'));
      expect(getByText('Hide details')).toBeTruthy();

      // Collapse
      fireEvent.press(getByTestId('expandable-details-toggle'));
      expect(getByText('Show full details')).toBeTruthy();
    });
  });

  describe('resetKey behavior', () => {
    it('should reset to collapsed state when resetKey changes', () => {
      const { getByText, getByTestId, rerender } = render(
        <ExpandableDetails resetKey="key-1">
          <TestContent />
        </ExpandableDetails>,
      );

      // Expand
      fireEvent.press(getByTestId('expandable-details-toggle'));
      expect(getByText('Hide details')).toBeTruthy();

      // Change resetKey
      rerender(
        <ExpandableDetails resetKey="key-2">
          <TestContent />
        </ExpandableDetails>,
      );

      // Should be collapsed again
      expect(getByText('Show full details')).toBeTruthy();
    });

    it('should stay expanded when resetKey stays the same', () => {
      const { getByText, getByTestId, rerender } = render(
        <ExpandableDetails resetKey="key-1">
          <TestContent />
        </ExpandableDetails>,
      );

      // Expand
      fireEvent.press(getByTestId('expandable-details-toggle'));
      expect(getByText('Hide details')).toBeTruthy();

      // Rerender with same key
      rerender(
        <ExpandableDetails resetKey="key-1">
          <TestContent />
        </ExpandableDetails>,
      );

      // Should still be expanded
      expect(getByText('Hide details')).toBeTruthy();
    });
  });

  describe('children rendering', () => {
    it('should render children content', () => {
      const { getByTestId } = render(
        <ExpandableDetails>
          <TestContent />
        </ExpandableDetails>,
      );

      expect(getByTestId('test-content')).toBeTruthy();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <ExpandableDetails>
          <Text>First child</Text>
          <Text>Second child</Text>
        </ExpandableDetails>,
      );

      expect(getByText('First child')).toBeTruthy();
      expect(getByText('Second child')).toBeTruthy();
    });
  });

  describe('testID variants', () => {
    it('should use custom testID prefix for toggle', () => {
      const { getByTestId } = render(
        <ExpandableDetails testID="my-details">
          <TestContent />
        </ExpandableDetails>,
      );

      expect(getByTestId('my-details-toggle')).toBeTruthy();
    });

    it('should use custom testID prefix for chevron', () => {
      const { getByTestId } = render(
        <ExpandableDetails testID="my-details">
          <TestContent />
        </ExpandableDetails>,
      );

      expect(getByTestId('my-details-chevron')).toBeTruthy();
    });

    it('should use custom testID prefix for content', () => {
      const { getByTestId } = render(
        <ExpandableDetails testID="my-details">
          <TestContent />
        </ExpandableDetails>,
      );

      expect(getByTestId('my-details-content')).toBeTruthy();
    });
  });
});
