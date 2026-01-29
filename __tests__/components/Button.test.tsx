import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { Button } from '../../src/components/Button';

describe('Button', () => {
  const defaultProps = {
    label: 'Submit',
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label text', () => {
    const { getByText } = render(<Button {...defaultProps} />);
    expect(getByText('Submit')).toBeTruthy();
  });

  it('forwards testID', () => {
    const { getByTestId } = render(
      <Button {...defaultProps} testID="my-button" />,
    );
    expect(getByTestId('my-button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button {...defaultProps} onPress={onPress} />,
    );
    fireEvent.press(getByText('Submit'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  describe('variants', () => {
    it('renders primary variant by default', () => {
      const { getByText } = render(<Button {...defaultProps} />);
      expect(getByText('Submit')).toBeTruthy();
    });

    it('renders secondary variant', () => {
      const { getByText } = render(
        <Button {...defaultProps} variant="secondary" />,
      );
      expect(getByText('Submit')).toBeTruthy();
    });

    it('renders danger variant', () => {
      const { getByText } = render(
        <Button {...defaultProps} variant="danger" />,
      );
      expect(getByText('Submit')).toBeTruthy();
    });
  });

  describe('disabled state', () => {
    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button {...defaultProps} onPress={onPress} disabled />,
      );
      fireEvent.press(getByText('Submit'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('applies reduced opacity when disabled', () => {
      const { getByTestId } = render(
        <Button {...defaultProps} testID="btn" disabled />,
      );
      const button = getByTestId('btn');
      const flatStyle = Array.isArray(button.props.style)
        ? Object.assign({}, ...button.props.style.flat(Infinity).filter(Boolean))
        : button.props.style;
      expect(flatStyle.opacity).toBe(0.5);
    });
  });
});
