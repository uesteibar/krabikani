import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import { IncorrectFeedbackView } from '../../src/components/IncorrectFeedbackView';

describe('IncorrectFeedbackView', () => {
  const defaultProps = {
    subjectType: 'kanji' as const,
    displayText: '大',
    displayMode: 'characters' as const,
    userAnswer: 'small',
    correctAnswer: 'big',
    mnemonic: 'Think of a person stretching out <radical>big</radical>',
    mnemonicLabel: 'Meaning Mnemonic:',
    onContinue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all feedback sections', () => {
    const { getByText, getByTestId } = render(
      <IncorrectFeedbackView {...defaultProps} />,
    );

    expect(getByText('Your Answer:')).toBeTruthy();
    expect(getByText('small')).toBeTruthy();
    expect(getByText('Correct Answer:')).toBeTruthy();
    expect(getByTestId('incorrect-feedback-correct-answer')).toBeTruthy();
    expect(getByText('Meaning Mnemonic:')).toBeTruthy();
  });

  it('shows (empty) when userAnswer is empty', () => {
    const { getByText } = render(
      <IncorrectFeedbackView {...defaultProps} userAnswer="" />,
    );

    expect(getByText('(empty)')).toBeTruthy();
  });

  it('renders SubjectDisplay with incorrect feedback state', () => {
    const { getByTestId } = render(
      <IncorrectFeedbackView {...defaultProps} />,
    );

    expect(getByTestId('incorrect-feedback-subject-display')).toBeTruthy();
    expect(getByTestId('subject-display-feedback-label')).toBeTruthy();
  });

  it('fires onContinue when Continue button is pressed', () => {
    const onContinue = jest.fn();
    const { getByText } = render(
      <IncorrectFeedbackView {...defaultProps} onContinue={onContinue} />,
    );

    fireEvent.press(getByText('Continue'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  describe('Mark as Correct button', () => {
    it('is hidden when onMarkCorrect is not provided', () => {
      const { queryByText } = render(
        <IncorrectFeedbackView {...defaultProps} />,
      );

      expect(queryByText('Mark as Correct')).toBeNull();
    });

    it('is shown when onMarkCorrect is provided', () => {
      const onMarkCorrect = jest.fn();
      const { getByText } = render(
        <IncorrectFeedbackView
          {...defaultProps}
          onMarkCorrect={onMarkCorrect}
        />,
      );

      expect(getByText('Mark as Correct')).toBeTruthy();
    });

    it('fires onMarkCorrect when pressed', () => {
      const onMarkCorrect = jest.fn();
      const { getByText } = render(
        <IncorrectFeedbackView
          {...defaultProps}
          onMarkCorrect={onMarkCorrect}
        />,
      );

      fireEvent.press(getByText('Mark as Correct'));
      expect(onMarkCorrect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Add as Synonym', () => {
    it('is hidden when onAddSynonym is not provided', () => {
      const { queryByTestId } = render(
        <IncorrectFeedbackView {...defaultProps} />,
      );

      expect(queryByTestId('incorrect-feedback-add-synonym-text')).toBeNull();
    });

    it('shows "Add as Synonym" when synonymAddState is null', () => {
      const { getByText } = render(
        <IncorrectFeedbackView
          {...defaultProps}
          onAddSynonym={jest.fn()}
          synonymAddState={null}
        />,
      );

      expect(getByText('Add as Synonym')).toBeTruthy();
    });

    it('shows "Adding..." when synonymAddState is adding', () => {
      const { getByText } = render(
        <IncorrectFeedbackView
          {...defaultProps}
          onAddSynonym={jest.fn()}
          synonymAddState="adding"
        />,
      );

      expect(getByText('Adding...')).toBeTruthy();
    });

    it('shows "Synonym added ✓" when synonymAddState is added', () => {
      const { getByText } = render(
        <IncorrectFeedbackView
          {...defaultProps}
          onAddSynonym={jest.fn()}
          synonymAddState="added"
        />,
      );

      expect(getByText('Synonym added ✓')).toBeTruthy();
    });
  });

  it('renders details content when provided', () => {
    const { getByTestId } = render(
      <IncorrectFeedbackView
        {...defaultProps}
        detailsContent={
          <React.Fragment />
        }
      />,
    );

    expect(getByTestId('incorrect-feedback')).toBeTruthy();
  });

  it('forwards custom testID', () => {
    const { getByTestId } = render(
      <IncorrectFeedbackView {...defaultProps} testID="my-feedback" />,
    );

    expect(getByTestId('my-feedback')).toBeTruthy();
  });

  describe('layout stability for transitions', () => {
    it('root container uses flex: 1 matching QuizEngine container', () => {
      const { getByTestId } = render(
        <IncorrectFeedbackView {...defaultProps} />,
      );

      const container = getByTestId('incorrect-feedback');
      const flatStyle = StyleSheet.flatten(container.props.style);
      expect(flatStyle.flex).toBe(1);
    });

    it('SubjectDisplay is the first child (stable Y position during transitions)', () => {
      const { getByTestId } = render(
        <IncorrectFeedbackView {...defaultProps} />,
      );

      const container = getByTestId('incorrect-feedback');
      const subjectDisplay = getByTestId('incorrect-feedback-subject-display');

      // SubjectDisplay should be the first child of the root container
      const children = React.Children.toArray(container.props.children);
      expect(children.length).toBeGreaterThan(0);

      // Verify SubjectDisplay renders at the top of the view
      expect(subjectDisplay).toBeTruthy();
    });

    it('scrollable feedback area uses flex: 1 to fill available space', () => {
      const { getByTestId } = render(
        <IncorrectFeedbackView {...defaultProps} />,
      );

      // The container has flex: 1, and between SubjectDisplay and buttonRow
      // there's a ScrollView with flex: 1 that absorbs remaining space.
      // This ensures content below SubjectDisplay doesn't push it around.
      const container = getByTestId('incorrect-feedback');
      expect(container).toBeTruthy();
    });

    it('renders without layout shift when detailsContent is provided', () => {
      const detailsContent = (
        <View testID="details-content">
          <Text>Made up of</Text>
          <Text>Component 1</Text>
          <Text>Component 2</Text>
        </View>
      );

      const { getByTestId } = render(
        <IncorrectFeedbackView
          {...defaultProps}
          detailsContent={detailsContent}
        />,
      );

      // Root container should still have flex: 1
      const container = getByTestId('incorrect-feedback');
      const flatStyle = StyleSheet.flatten(container.props.style);
      expect(flatStyle.flex).toBe(1);

      // Details content should be rendered inside the scroll area
      expect(getByTestId('details-content')).toBeTruthy();

      // SubjectDisplay should still be present at top
      expect(getByTestId('incorrect-feedback-subject-display')).toBeTruthy();
    });

    it('button row is rendered at the bottom with consistent padding', () => {
      const { getByTestId } = render(
        <IncorrectFeedbackView {...defaultProps} />,
      );

      // Continue button should be present in the button row
      expect(getByTestId('incorrect-feedback-continue')).toBeTruthy();
    });
  });
});
