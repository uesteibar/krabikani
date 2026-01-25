import React from 'react';
import { render } from '@testing-library/react-native';

import { MnemonicText } from '../../src/components/MnemonicText';
import { SUBJECT_COLORS } from '../../src/theme';

describe('MnemonicText', () => {
  describe('basic rendering', () => {
    it('renders plain text without tags', () => {
      const { getByText } = render(
        <MnemonicText text="This is plain text" testID="mnemonic" />,
      );
      expect(getByText('This is plain text')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <MnemonicText text="Test" testID="mnemonic-text" />,
      );
      expect(getByTestId('mnemonic-text')).toBeTruthy();
    });

    it('renders empty string', () => {
      const { getByTestId } = render(
        <MnemonicText text="" testID="mnemonic-text" />,
      );
      expect(getByTestId('mnemonic-text')).toBeTruthy();
    });
  });

  describe('radical tag parsing', () => {
    it('highlights text within <radical> tags with blue color', () => {
      const { getByText } = render(
        <MnemonicText text="The <radical>ground</radical> radical" testID="mnemonic" />,
      );
      const groundText = getByText('ground');
      expect(groundText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.radical })]),
      );
    });

    it('renders text before radical tag normally', () => {
      const { getByText } = render(
        <MnemonicText text="Before <radical>ground</radical>" testID="mnemonic" />,
      );
      const beforeText = getByText('Before ');
      // Plain text should not have the radical color
      expect(beforeText.props.style).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.radical })]),
      );
    });

    it('renders text after radical tag normally', () => {
      const { getByText } = render(
        <MnemonicText text="<radical>ground</radical> after" testID="mnemonic" />,
      );
      const afterText = getByText(' after');
      expect(afterText.props.style).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.radical })]),
      );
    });

    it('handles multiple radical tags', () => {
      const { getByText } = render(
        <MnemonicText
          text="The <radical>sun</radical> and <radical>moon</radical>"
          testID="mnemonic"
        />,
      );
      const sunText = getByText('sun');
      const moonText = getByText('moon');
      expect(sunText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.radical })]),
      );
      expect(moonText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.radical })]),
      );
    });
  });

  describe('kanji tag parsing', () => {
    it('highlights text within <kanji> tags with pink color', () => {
      const { getByText } = render(
        <MnemonicText text="The <kanji>大</kanji> kanji" testID="mnemonic" />,
      );
      const kanjiText = getByText('大');
      expect(kanjiText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.kanji })]),
      );
    });

    it('handles multiple kanji tags', () => {
      const { getByText } = render(
        <MnemonicText
          text="<kanji>大</kanji> and <kanji>小</kanji>"
          testID="mnemonic"
        />,
      );
      const bigKanji = getByText('大');
      const smallKanji = getByText('小');
      expect(bigKanji.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.kanji })]),
      );
      expect(smallKanji.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.kanji })]),
      );
    });
  });

  describe('vocabulary tag parsing', () => {
    it('highlights text within <vocabulary> tags with purple color', () => {
      const { getByText } = render(
        <MnemonicText text="The <vocabulary>大きい</vocabulary> word" testID="mnemonic" />,
      );
      const vocabText = getByText('大きい');
      expect(vocabText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.vocabulary })]),
      );
    });

    it('handles multiple vocabulary tags', () => {
      const { getByText } = render(
        <MnemonicText
          text="<vocabulary>食べる</vocabulary> and <vocabulary>飲む</vocabulary>"
          testID="mnemonic"
        />,
      );
      const eatVocab = getByText('食べる');
      const drinkVocab = getByText('飲む');
      expect(eatVocab.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.vocabulary })]),
      );
      expect(drinkVocab.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.vocabulary })]),
      );
    });
  });

  describe('mixed tags', () => {
    it('handles radical, kanji, and vocabulary tags together', () => {
      const { getByText } = render(
        <MnemonicText
          text="Use the <radical>ground</radical> in <kanji>大</kanji> to remember <vocabulary>大きい</vocabulary>"
          testID="mnemonic"
        />,
      );
      const radicalText = getByText('ground');
      const kanjiText = getByText('大');
      const vocabText = getByText('大きい');

      expect(radicalText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.radical })]),
      );
      expect(kanjiText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.kanji })]),
      );
      expect(vocabText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.vocabulary })]),
      );
    });

    it('preserves text between different tag types', () => {
      const { getByText } = render(
        <MnemonicText
          text="<radical>sun</radical> shines on <kanji>日</kanji>"
          testID="mnemonic"
        />,
      );
      const betweenText = getByText(' shines on ');
      expect(betweenText.props.style).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.radical })]),
      );
      expect(betweenText.props.style).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.kanji })]),
      );
    });
  });

  describe('malformed tags handling', () => {
    it('renders unclosed tag as plain text', () => {
      const { getByText } = render(
        <MnemonicText text="This has <radical>unclosed tag" testID="mnemonic" />,
      );
      // Unclosed tag should render as plain text
      expect(getByText('This has <radical>unclosed tag')).toBeTruthy();
    });

    it('renders unmatched closing tag as plain text', () => {
      const { getByText } = render(
        <MnemonicText text="This has </radical> unmatched" testID="mnemonic" />,
      );
      expect(getByText('This has </radical> unmatched')).toBeTruthy();
    });

    it('renders unknown tags as plain text', () => {
      const { getByText } = render(
        <MnemonicText text="<unknown>content</unknown>" testID="mnemonic" />,
      );
      expect(getByText('<unknown>content</unknown>')).toBeTruthy();
    });

    it('handles empty tags gracefully', () => {
      const { getByTestId } = render(
        <MnemonicText text="Before <radical></radical> after" testID="mnemonic" />,
      );
      // Should render without crashing
      expect(getByTestId('mnemonic')).toBeTruthy();
    });

    it('handles tags with whitespace only', () => {
      const { getByTestId } = render(
        <MnemonicText text="<radical>   </radical>" testID="mnemonic" />,
      );
      expect(getByTestId('mnemonic')).toBeTruthy();
    });

    it('handles mismatched tag types as plain text', () => {
      const { getByText } = render(
        <MnemonicText text="<radical>content</kanji>" testID="mnemonic" />,
      );
      // Mismatched tags should render as plain text
      expect(getByText('<radical>content</kanji>')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('handles consecutive tags without text between', () => {
      const { getByText } = render(
        <MnemonicText
          text="<radical>sun</radical><kanji>日</kanji>"
          testID="mnemonic"
        />,
      );
      const sunText = getByText('sun');
      const kanjiText = getByText('日');
      expect(sunText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.radical })]),
      );
      expect(kanjiText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.kanji })]),
      );
    });

    it('handles special characters in content', () => {
      const { getByText } = render(
        <MnemonicText text="<radical>sun & moon</radical>" testID="mnemonic" />,
      );
      expect(getByText('sun & moon')).toBeTruthy();
    });

    it('handles unicode characters in content', () => {
      const { getByText } = render(
        <MnemonicText text="<kanji>日本語</kanji>" testID="mnemonic" />,
      );
      const kanjiText = getByText('日本語');
      expect(kanjiText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: SUBJECT_COLORS.kanji })]),
      );
    });

    it('handles newlines in text', () => {
      const { getByTestId } = render(
        <MnemonicText text="Line 1\n<radical>radical</radical>\nLine 3" testID="mnemonic" />,
      );
      expect(getByTestId('mnemonic')).toBeTruthy();
    });

    it('is case-sensitive for tags', () => {
      const { getByText } = render(
        <MnemonicText text="<RADICAL>content</RADICAL>" testID="mnemonic" />,
      );
      // Uppercase tags should be treated as unknown
      expect(getByText('<RADICAL>content</RADICAL>')).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('applies fontWeight bold to highlighted text', () => {
      const { getByText } = render(
        <MnemonicText text="<radical>bold</radical>" testID="mnemonic" />,
      );
      const boldText = getByText('bold');
      expect(boldText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontWeight: 'bold' })]),
      );
    });
  });
});
