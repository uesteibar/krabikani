import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { LessonCard, LessonCardProps } from '../../src/components/LessonCard';
import type { Meaning, Reading, KanjiReading } from '../../src/api/types';

// Helper to create test meanings
function createMeanings(
  meanings: Array<{ meaning: string; primary?: boolean; accepted?: boolean }>,
): Meaning[] {
  return meanings.map(({ meaning, primary = false, accepted = true }) => ({
    meaning,
    primary,
    accepted_answer: accepted,
  }));
}

// Helper to create test readings
function createReadings(
  readings: Array<{ reading: string; primary?: boolean; accepted?: boolean }>,
): Reading[] {
  return readings.map(({ reading, primary = false, accepted = true }) => ({
    reading,
    primary,
    accepted_answer: accepted,
  }));
}

// Helper to create kanji readings with type
function createKanjiReadings(
  readings: Array<{
    reading: string;
    primary?: boolean;
    accepted?: boolean;
    type?: 'onyomi' | 'kunyomi' | 'nanori';
  }>,
): KanjiReading[] {
  return readings.map(
    ({ reading, primary = false, accepted = true, type = 'onyomi' }) => ({
      reading,
      primary,
      accepted_answer: accepted,
      type,
    }),
  );
}

// Default props for testing
const defaultRadicalProps: LessonCardProps = {
  subjectType: 'radical',
  characters: '大',
  meanings: createMeanings([{ meaning: 'Big', primary: true }]),
  readings: null,
  meaningMnemonic: 'This radical looks like a big person with their arms spread wide.',
  readingMnemonic: null,
  onNext: jest.fn(),
};

const defaultKanjiProps: LessonCardProps = {
  subjectType: 'kanji',
  characters: '大',
  meanings: createMeanings([
    { meaning: 'Big', primary: true },
    { meaning: 'Large', accepted: true },
  ]),
  readings: createKanjiReadings([
    { reading: 'おお', primary: true, type: 'kunyomi' },
    { reading: 'たい', accepted: true, type: 'onyomi' },
    { reading: 'だい', accepted: true, type: 'onyomi' },
  ]),
  meaningMnemonic:
    'Think of a person standing with their arms and legs spread out. They are so BIG that they take up all the space!',
  readingMnemonic:
    'When something is big, you say "OOH!" (おお) in amazement.',
  onNext: jest.fn(),
};

const defaultVocabularyProps: LessonCardProps = {
  subjectType: 'vocabulary',
  characters: '大きい',
  meanings: createMeanings([
    { meaning: 'Big', primary: true },
    { meaning: 'Large', accepted: true },
    { meaning: 'Great', accepted: true },
  ]),
  readings: createReadings([{ reading: 'おおきい', primary: true }]),
  meaningMnemonic: 'This word uses the kanji for big, so it means big!',
  readingMnemonic: 'You read the kanji 大 with its kun reading おお.',
  onNext: jest.fn(),
};

describe('LessonCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders the component with testID', () => {
      const { getByTestId } = render(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card')).toBeTruthy();
    });

    it('renders the header with testID', () => {
      const { getByTestId } = render(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-header')).toBeTruthy();
    });

    it('renders the characters', () => {
      const { getByTestId } = render(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-characters').props.children).toBe('大');
    });

    it('renders the subject type', () => {
      const { getByTestId } = render(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-type').props.children).toBe('radical');
    });

    it('renders the next button', () => {
      const { getByTestId } = render(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-next-button')).toBeTruthy();
    });

    it('displays "Next" text on the button', () => {
      const { getByText } = render(<LessonCard {...defaultRadicalProps} />);
      expect(getByText('Next')).toBeTruthy();
    });
  });

  describe('characters display', () => {
    it('displays characters for kanji', () => {
      const { getByTestId } = render(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-characters').props.children).toBe('大');
    });

    it('displays characters for vocabulary', () => {
      const { getByTestId } = render(<LessonCard {...defaultVocabularyProps} />);
      expect(getByTestId('lesson-card-characters').props.children).toBe('大きい');
    });

    it('displays ? when characters is null', () => {
      const props = { ...defaultRadicalProps, characters: null };
      const { getByTestId } = render(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-characters').props.children).toBe('?');
    });
  });

  describe('subject type colors', () => {
    it('uses blue background for radicals', () => {
      const { getByTestId } = render(<LessonCard {...defaultRadicalProps} />);
      const header = getByTestId('lesson-card-header');
      expect(header.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#00aaff' })]),
      );
    });

    it('uses pink background for kanji', () => {
      const { getByTestId } = render(<LessonCard {...defaultKanjiProps} />);
      const header = getByTestId('lesson-card-header');
      expect(header.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#e8a4c9' })]),
      );
    });

    it('uses purple background for vocabulary', () => {
      const { getByTestId } = render(<LessonCard {...defaultVocabularyProps} />);
      const header = getByTestId('lesson-card-header');
      expect(header.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#8f5bc4' })]),
      );
    });

    it('uses purple background for kana_vocabulary', () => {
      const props = { ...defaultVocabularyProps, subjectType: 'kana_vocabulary' as const };
      const { getByTestId } = render(<LessonCard {...props} />);
      const header = getByTestId('lesson-card-header');
      expect(header.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#8f5bc4' })]),
      );
    });
  });

  describe('subject type display', () => {
    it('displays "radical" for radical type', () => {
      const { getByTestId } = render(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-type').props.children).toBe('radical');
    });

    it('displays "kanji" for kanji type', () => {
      const { getByTestId } = render(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-type').props.children).toBe('kanji');
    });

    it('displays "vocabulary" for vocabulary type', () => {
      const { getByTestId } = render(<LessonCard {...defaultVocabularyProps} />);
      expect(getByTestId('lesson-card-type').props.children).toBe('vocabulary');
    });

    it('displays "kana vocabulary" for kana_vocabulary type', () => {
      const props = { ...defaultVocabularyProps, subjectType: 'kana_vocabulary' as const };
      const { getByTestId } = render(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-type').props.children).toBe('kana vocabulary');
    });
  });

  describe('meaning section', () => {
    it('renders the meaning section', () => {
      const { getByTestId } = render(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-meaning-section')).toBeTruthy();
    });

    it('displays Meaning section title', () => {
      const { getByText } = render(<LessonCard {...defaultRadicalProps} />);
      expect(getByText('Meaning')).toBeTruthy();
    });

    it('displays the primary meaning', () => {
      const { getByTestId } = render(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-primary-meaning').props.children).toBe('Big');
    });

    it('displays other accepted meanings when more than one', () => {
      const { getByTestId } = render(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-other-meanings').props.children).toEqual([
        'Also: ',
        'Large',
      ]);
    });

    it('does not display other meanings when only one accepted meaning', () => {
      const { queryByTestId } = render(<LessonCard {...defaultRadicalProps} />);
      expect(queryByTestId('lesson-card-other-meanings')).toBeNull();
    });

    it('displays multiple other meanings separated by commas', () => {
      const { getByTestId } = render(<LessonCard {...defaultVocabularyProps} />);
      expect(getByTestId('lesson-card-other-meanings').props.children).toEqual([
        'Also: ',
        'Large, Great',
      ]);
    });

    it('uses first meaning when no primary is specified', () => {
      const props = {
        ...defaultRadicalProps,
        meanings: createMeanings([{ meaning: 'First' }, { meaning: 'Second' }]),
      };
      const { getByTestId } = render(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-primary-meaning').props.children).toBe('First');
    });
  });

  describe('reading section (radicals)', () => {
    it('does not render reading section for radicals', () => {
      const { queryByTestId } = render(<LessonCard {...defaultRadicalProps} />);
      expect(queryByTestId('lesson-card-reading-section')).toBeNull();
    });

    it('does not render reading mnemonic section for radicals', () => {
      const { queryByTestId } = render(<LessonCard {...defaultRadicalProps} />);
      expect(queryByTestId('lesson-card-reading-mnemonic-section')).toBeNull();
    });
  });

  describe('reading section (kanji)', () => {
    it('renders reading section for kanji', () => {
      const { getByTestId } = render(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-reading-section')).toBeTruthy();
    });

    it('displays Reading section title', () => {
      const { getByText } = render(<LessonCard {...defaultKanjiProps} />);
      expect(getByText('Reading')).toBeTruthy();
    });

    it('displays the primary reading', () => {
      const { getByTestId } = render(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-primary-reading').props.children).toBe('おお');
    });

    it('displays other accepted readings when more than one', () => {
      const { getByTestId } = render(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-other-readings').props.children).toEqual([
        'Also: ',
        'たい, だい',
      ]);
    });
  });

  describe('reading section (vocabulary)', () => {
    it('renders reading section for vocabulary', () => {
      const { getByTestId } = render(<LessonCard {...defaultVocabularyProps} />);
      expect(getByTestId('lesson-card-reading-section')).toBeTruthy();
    });

    it('displays the primary reading', () => {
      const { getByTestId } = render(<LessonCard {...defaultVocabularyProps} />);
      expect(getByTestId('lesson-card-primary-reading').props.children).toBe('おおきい');
    });

    it('does not display other readings when only one', () => {
      const { queryByTestId } = render(<LessonCard {...defaultVocabularyProps} />);
      expect(queryByTestId('lesson-card-other-readings')).toBeNull();
    });
  });

  describe('reading section (kana_vocabulary)', () => {
    it('renders reading section for kana_vocabulary', () => {
      const props = { ...defaultVocabularyProps, subjectType: 'kana_vocabulary' as const };
      const { getByTestId } = render(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-reading-section')).toBeTruthy();
    });
  });

  describe('meaning mnemonic section', () => {
    it('renders meaning mnemonic section', () => {
      const { getByTestId } = render(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-meaning-mnemonic-section')).toBeTruthy();
    });

    it('displays Meaning Mnemonic section title', () => {
      const { getByText } = render(<LessonCard {...defaultRadicalProps} />);
      expect(getByText('Meaning Mnemonic')).toBeTruthy();
    });

    it('displays the meaning mnemonic text', () => {
      const { getByTestId } = render(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-meaning-mnemonic').props.children).toBe(
        'This radical looks like a big person with their arms spread wide.',
      );
    });
  });

  describe('reading mnemonic section', () => {
    it('renders reading mnemonic section for kanji', () => {
      const { getByTestId } = render(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-reading-mnemonic-section')).toBeTruthy();
    });

    it('displays Reading Mnemonic section title for kanji', () => {
      const { getByText } = render(<LessonCard {...defaultKanjiProps} />);
      expect(getByText('Reading Mnemonic')).toBeTruthy();
    });

    it('displays the reading mnemonic text', () => {
      const { getByTestId } = render(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-reading-mnemonic').props.children).toBe(
        'When something is big, you say "OOH!" (おお) in amazement.',
      );
    });

    it('renders reading mnemonic section for vocabulary', () => {
      const { getByTestId } = render(<LessonCard {...defaultVocabularyProps} />);
      expect(getByTestId('lesson-card-reading-mnemonic-section')).toBeTruthy();
    });

    it('does not render reading mnemonic section when readingMnemonic is null', () => {
      const props = {
        ...defaultKanjiProps,
        readingMnemonic: null,
      };
      const { queryByTestId } = render(<LessonCard {...props} />);
      expect(queryByTestId('lesson-card-reading-mnemonic-section')).toBeNull();
    });
  });

  describe('next button', () => {
    it('calls onNext when pressed', () => {
      const onNext = jest.fn();
      const props = { ...defaultRadicalProps, onNext };
      const { getByTestId } = render(<LessonCard {...props} />);

      fireEvent.press(getByTestId('lesson-card-next-button'));
      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('calls onNext for kanji', () => {
      const onNext = jest.fn();
      const props = { ...defaultKanjiProps, onNext };
      const { getByTestId } = render(<LessonCard {...props} />);

      fireEvent.press(getByTestId('lesson-card-next-button'));
      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('calls onNext for vocabulary', () => {
      const onNext = jest.fn();
      const props = { ...defaultVocabularyProps, onNext };
      const { getByTestId } = render(<LessonCard {...props} />);

      fireEvent.press(getByTestId('lesson-card-next-button'));
      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty meanings array', () => {
      const props = { ...defaultRadicalProps, meanings: [] };
      const { getByTestId } = render(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-primary-meaning').props.children).toBe('');
    });

    it('handles empty readings array', () => {
      const props = { ...defaultKanjiProps, readings: [] };
      const { getByTestId } = render(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-primary-reading').props.children).toBe('');
    });

    it('handles meanings with no primary specified', () => {
      const props = {
        ...defaultRadicalProps,
        meanings: createMeanings([{ meaning: 'Test' }]),
      };
      const { getByTestId } = render(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-primary-meaning').props.children).toBe('Test');
    });

    it('handles readings with no primary specified', () => {
      const props = {
        ...defaultKanjiProps,
        readings: createKanjiReadings([{ reading: 'てすと' }]),
      };
      const { getByTestId } = render(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-primary-reading').props.children).toBe('てすと');
    });

    it('filters out non-accepted meanings from "Also" list', () => {
      const props = {
        ...defaultRadicalProps,
        meanings: [
          { meaning: 'Primary', primary: true, accepted_answer: true },
          { meaning: 'Accepted', primary: false, accepted_answer: true },
          { meaning: 'Not Accepted', primary: false, accepted_answer: false },
        ],
      };
      const { getByTestId } = render(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-other-meanings').props.children).toEqual([
        'Also: ',
        'Accepted',
      ]);
    });

    it('filters out non-accepted readings from "Also" list', () => {
      const props = {
        ...defaultKanjiProps,
        readings: [
          { reading: 'おお', primary: true, accepted_answer: true, type: 'kunyomi' as const },
          { reading: 'たい', primary: false, accepted_answer: true, type: 'onyomi' as const },
          { reading: 'だい', primary: false, accepted_answer: false, type: 'onyomi' as const },
        ],
      };
      const { getByTestId } = render(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-other-readings').props.children).toEqual([
        'Also: ',
        'たい',
      ]);
    });
  });
});
