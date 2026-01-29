import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressHeader } from '../../src/components/ProgressHeader';

describe('ProgressHeader', () => {
  describe('none mode', () => {
    it('renders nothing', () => {
      const { toJSON } = render(<ProgressHeader mode="none" />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('zen mode', () => {
    it('renders Zen Mode label', () => {
      const { getByText, getByTestId } = render(<ProgressHeader mode="zen" />);
      expect(getByTestId('progress-header-zen')).toBeTruthy();
      expect(getByText('Zen Mode')).toBeTruthy();
    });
  });

  describe('practice mode', () => {
    it('renders phrase and icon', () => {
      const { getByText, getByTestId } = render(
        <ProgressHeader
          mode="practice"
          phrase="Practice makes progress"
          icon="weight-lifter"
        />
      );
      expect(getByTestId('progress-header-practice')).toBeTruthy();
      expect(getByText('Practice makes progress')).toBeTruthy();
    });

    it('renders with different phrase and icon', () => {
      const { getByText } = render(
        <ProgressHeader
          mode="practice"
          phrase="Reverse your recall"
          icon="swap-horizontal"
        />
      );
      expect(getByText('Reverse your recall')).toBeTruthy();
    });
  });

  describe('progress mode', () => {
    it('renders progress count and remaining', () => {
      const { getByTestId, getByText } = render(
        <ProgressHeader mode="progress" current={5} total={20} />
      );
      expect(getByTestId('progress-header-progress')).toBeTruthy();
      expect(getByTestId('progress-header-count')).toHaveTextContent('5 / 20');
      expect(getByText(/15 remaining/)).toBeTruthy();
    });

    it('calculates progress percentage correctly', () => {
      const { getByTestId } = render(
        <ProgressHeader mode="progress" current={10} total={20} />
      );
      const fill = getByTestId('progress-header-fill');
      const flatStyle = [fill.props.style].flat(Infinity).filter(Boolean);
      const widthStyle = flatStyle.find(
        (s: Record<string, unknown>) => s.width !== undefined
      );
      expect(widthStyle).toEqual({ width: '50%' });
    });

    it('handles zero total without crashing', () => {
      const { getByTestId } = render(
        <ProgressHeader mode="progress" current={0} total={0} />
      );
      const fill = getByTestId('progress-header-fill');
      const flatStyle = [fill.props.style].flat(Infinity).filter(Boolean);
      const widthStyle = flatStyle.find(
        (s: Record<string, unknown>) => s.width !== undefined
      );
      expect(widthStyle).toEqual({ width: '0%' });
    });

    it('renders wrap-up text when wrapUpRemaining is provided', () => {
      const { getByTestId, queryByTestId } = render(
        <ProgressHeader
          mode="progress"
          current={8}
          total={12}
          wrapUpRemaining={4}
        />
      );
      expect(getByTestId('progress-header-wrap-up')).toHaveTextContent(
        'Wrapping up: 4 remaining'
      );
      expect(queryByTestId('progress-header-remaining')).toBeNull();
    });

    it('does not render wrap-up text when wrapUpRemaining is not provided', () => {
      const { queryByTestId, getByTestId } = render(
        <ProgressHeader mode="progress" current={3} total={10} />
      );
      expect(queryByTestId('progress-header-wrap-up')).toBeNull();
      expect(getByTestId('progress-header-remaining')).toBeTruthy();
    });
  });
});
