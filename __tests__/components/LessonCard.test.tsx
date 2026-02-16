import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import {
  LessonCard,
  LessonCardProps,
  ComponentRadical,
  ComponentKanji,
} from '../../src/components/LessonCard';
import type { Meaning, Reading, KanjiReading } from '../../src/api/types';
import { SUBJECT_COLORS, COLORS } from '../../src/theme';
import { ThemeProvider } from '../../src/theme/ThemeContext';

function renderWithTheme(ui: React.ReactElement, colorScheme?: 'light' | 'dark') {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme ?? 'light'}>
      {ui}
    </ThemeProvider>,
  );
}

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
  meaningMnemonic:
    'This radical looks like a big person with their arms spread wide.',
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
  readingMnemonic: 'When something is big, you say "OOH!" (おお) in amazement.',
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
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card')).toBeTruthy();
    });

    it('renders the header with testID', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-header')).toBeTruthy();
    });

    it('renders the characters', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-characters').props.children).toBe('大');
    });

    it('renders the subject type', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-type').props.children).toBe('radical');
    });

    it('renders the next button', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-next-button')).toBeTruthy();
    });

    it('displays "Next" text on the button', () => {
      const { getByText } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(getByText('Next')).toBeTruthy();
    });
  });

  describe('characters display', () => {
    it('displays characters for kanji', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-characters').props.children).toBe('大');
    });

    it('displays characters for vocabulary', () => {
      const { getByTestId } = renderWithTheme(
        <LessonCard {...defaultVocabularyProps} />,
      );
      expect(getByTestId('lesson-card-characters').props.children).toBe(
        '大きい',
      );
    });

    it('displays ? when characters is null and no characterImages', () => {
      const props = { ...defaultRadicalProps, characters: null };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-characters').props.children).toBe('?');
    });

    it('displays RadicalImage when characters is null but characterImages is provided', () => {
      const characterImages = JSON.stringify([
        {
          url: 'https://files.wanikani.com/test-radical.png',
          content_type: 'image/png',
          metadata: {},
        },
      ]);
      const props = {
        ...defaultRadicalProps,
        characters: null,
        characterImages,
      };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);

      // Should render RadicalImage component (container has the testID)
      expect(getByTestId('lesson-card-characters')).toBeTruthy();
      // Should NOT render the '?' text directly (it's now in the RadicalImage fallback)
      // The RadicalImage will show the image or a fallback
    });

    it('displays text characters even when characterImages is provided', () => {
      const characterImages = JSON.stringify([
        {
          url: 'https://files.wanikani.com/test-radical.png',
          content_type: 'image/png',
          metadata: {},
        },
      ]);
      const props = {
        ...defaultRadicalProps,
        characters: '大',
        characterImages,
      };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      // When characters is provided, should use text not image
      expect(getByTestId('lesson-card-characters').props.children).toBe('大');
    });
  });

  describe('subject type colors', () => {
    it('uses blue background for radicals', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      const header = getByTestId('lesson-card-header');
      expect(header.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.radical }),
        ]),
      );
    });

    it('uses pink background for kanji', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultKanjiProps} />);
      const header = getByTestId('lesson-card-header');
      expect(header.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.kanji }),
        ]),
      );
    });

    it('uses purple background for vocabulary', () => {
      const { getByTestId } = renderWithTheme(
        <LessonCard {...defaultVocabularyProps} />,
      );
      const header = getByTestId('lesson-card-header');
      expect(header.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: SUBJECT_COLORS.vocabulary,
          }),
        ]),
      );
    });

    it('uses purple background for kana_vocabulary', () => {
      const props = {
        ...defaultVocabularyProps,
        subjectType: 'kana_vocabulary' as const,
      };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      const header = getByTestId('lesson-card-header');
      expect(header.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: SUBJECT_COLORS.kana_vocabulary,
          }),
        ]),
      );
    });
  });

  describe('subject type display', () => {
    it('displays "radical" for radical type', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-type').props.children).toBe('radical');
    });

    it('displays "kanji" for kanji type', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-type').props.children).toBe('kanji');
    });

    it('displays "vocabulary" for vocabulary type', () => {
      const { getByTestId } = renderWithTheme(
        <LessonCard {...defaultVocabularyProps} />,
      );
      expect(getByTestId('lesson-card-type').props.children).toBe('vocabulary');
    });

    it('displays "kana vocabulary" for kana_vocabulary type', () => {
      const props = {
        ...defaultVocabularyProps,
        subjectType: 'kana_vocabulary' as const,
      };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-type').props.children).toBe(
        'kana vocabulary',
      );
    });
  });

  describe('meaning section', () => {
    it('renders the meaning section', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-meaning-section')).toBeTruthy();
    });

    it('displays Meaning section title', () => {
      const { getByText } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(getByText('Meaning')).toBeTruthy();
    });

    it('displays the primary meaning', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-primary-meaning').props.children).toBe(
        'Big',
      );
    });

    it('displays other accepted meanings when more than one', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-other-meanings').props.children).toEqual([
        'Also:',
        ' ',
        'Large',
      ]);
    });

    it('does not display other meanings when only one accepted meaning', () => {
      const { queryByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(queryByTestId('lesson-card-other-meanings')).toBeNull();
    });

    it('displays multiple other meanings separated by commas', () => {
      const { getByTestId } = renderWithTheme(
        <LessonCard {...defaultVocabularyProps} />,
      );
      expect(getByTestId('lesson-card-other-meanings').props.children).toEqual([
        'Also:',
        ' ',
        'Large, Great',
      ]);
    });

    it('uses first meaning when no primary is specified', () => {
      const props = {
        ...defaultRadicalProps,
        meanings: createMeanings([{ meaning: 'First' }, { meaning: 'Second' }]),
      };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-primary-meaning').props.children).toBe(
        'First',
      );
    });
  });

  describe('reading section (radicals)', () => {
    it('does not render reading section for radicals', () => {
      const { queryByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(queryByTestId('lesson-card-reading-section')).toBeNull();
    });

    it('does not render reading mnemonic section for radicals', () => {
      const { queryByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(queryByTestId('lesson-card-reading-mnemonic-section')).toBeNull();
    });
  });

  describe('reading section (kanji)', () => {
    it('renders reading section for kanji', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-reading-section')).toBeTruthy();
    });

    it('displays Reading section title', () => {
      const { getByText } = renderWithTheme(<LessonCard {...defaultKanjiProps} />);
      expect(getByText('Reading')).toBeTruthy();
    });

    it('displays the primary reading', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-primary-reading').props.children).toBe(
        'おお',
      );
    });

    it('displays other accepted readings when more than one', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-other-readings').props.children).toEqual([
        'Also:',
        ' ',
        'たい, だい',
      ]);
    });
  });

  describe('reading section (vocabulary)', () => {
    it('renders reading section for vocabulary', () => {
      const { getByTestId } = renderWithTheme(
        <LessonCard {...defaultVocabularyProps} />,
      );
      expect(getByTestId('lesson-card-reading-section')).toBeTruthy();
    });

    it('displays the primary reading', () => {
      const { getByTestId } = renderWithTheme(
        <LessonCard {...defaultVocabularyProps} />,
      );
      expect(getByTestId('lesson-card-primary-reading').props.children).toBe(
        'おおきい',
      );
    });

    it('does not display other readings when only one', () => {
      const { queryByTestId } = renderWithTheme(
        <LessonCard {...defaultVocabularyProps} />,
      );
      expect(queryByTestId('lesson-card-other-readings')).toBeNull();
    });
  });

  describe('reading section (kana_vocabulary)', () => {
    it('renders reading section for kana_vocabulary', () => {
      const props = {
        ...defaultVocabularyProps,
        subjectType: 'kana_vocabulary' as const,
      };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-reading-section')).toBeTruthy();
    });
  });

  describe('meaning mnemonic section', () => {
    it('renders meaning mnemonic section', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(getByTestId('lesson-card-meaning-mnemonic-section')).toBeTruthy();
    });

    it('displays Meaning Mnemonic section title', () => {
      const { getByText } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(getByText('Meaning Mnemonic')).toBeTruthy();
    });

    it('displays the meaning mnemonic text', () => {
      const { getByText } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(
        getByText(
          'This radical looks like a big person with their arms spread wide.',
        ),
      ).toBeTruthy();
    });
  });

  describe('reading mnemonic section', () => {
    it('renders reading mnemonic section for kanji', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultKanjiProps} />);
      expect(getByTestId('lesson-card-reading-mnemonic-section')).toBeTruthy();
    });

    it('displays Reading Mnemonic section title for kanji', () => {
      const { getByText } = renderWithTheme(<LessonCard {...defaultKanjiProps} />);
      expect(getByText('Reading Mnemonic')).toBeTruthy();
    });

    it('displays the reading mnemonic text', () => {
      const { getByText } = renderWithTheme(<LessonCard {...defaultKanjiProps} />);
      expect(
        getByText('When something is big, you say "OOH!" (おお) in amazement.'),
      ).toBeTruthy();
    });

    it('renders reading mnemonic section for vocabulary', () => {
      const { getByTestId } = renderWithTheme(
        <LessonCard {...defaultVocabularyProps} />,
      );
      expect(getByTestId('lesson-card-reading-mnemonic-section')).toBeTruthy();
    });

    it('does not render reading mnemonic section when readingMnemonic is null', () => {
      const props = {
        ...defaultKanjiProps,
        readingMnemonic: null,
      };
      const { queryByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(queryByTestId('lesson-card-reading-mnemonic-section')).toBeNull();
    });
  });

  describe('next button', () => {
    it('calls onNext when pressed', () => {
      const onNext = jest.fn();
      const props = { ...defaultRadicalProps, onNext };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);

      fireEvent.press(getByTestId('lesson-card-next-button'));
      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('calls onNext for kanji', () => {
      const onNext = jest.fn();
      const props = { ...defaultKanjiProps, onNext };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);

      fireEvent.press(getByTestId('lesson-card-next-button'));
      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('calls onNext for vocabulary', () => {
      const onNext = jest.fn();
      const props = { ...defaultVocabularyProps, onNext };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);

      fireEvent.press(getByTestId('lesson-card-next-button'));
      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('back button', () => {
    it('does not render back button when onBack is not provided', () => {
      const { queryByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(queryByTestId('lesson-card-back-button')).toBeNull();
    });

    it('renders back button when onBack is provided', () => {
      const onBack = jest.fn();
      const props = { ...defaultRadicalProps, onBack };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-back-button')).toBeTruthy();
    });

    it('displays "Back" text on the back button', () => {
      const onBack = jest.fn();
      const props = { ...defaultRadicalProps, onBack };
      const { getByText } = renderWithTheme(<LessonCard {...props} />);
      expect(getByText('Back')).toBeTruthy();
    });

    it('calls onBack when back button is pressed', () => {
      const onBack = jest.fn();
      const props = { ...defaultRadicalProps, onBack };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);

      fireEvent.press(getByTestId('lesson-card-back-button'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('renders footer with both buttons when onBack is provided', () => {
      const onBack = jest.fn();
      const props = { ...defaultRadicalProps, onBack };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);

      expect(getByTestId('lesson-card-footer')).toBeTruthy();
      expect(getByTestId('lesson-card-back-button')).toBeTruthy();
      expect(getByTestId('lesson-card-next-button')).toBeTruthy();
    });

    it('back button uses subject color for border', () => {
      const onBack = jest.fn();
      const props = { ...defaultRadicalProps, onBack };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      const backButton = getByTestId('lesson-card-back-button');

      expect(backButton.props.style).toEqual(
        expect.objectContaining({ borderColor: SUBJECT_COLORS.radical }),
      );
    });

    it('back button uses subject color for text', () => {
      const onBack = jest.fn();
      const props = { ...defaultKanjiProps, onBack };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      const backButton = getByTestId('lesson-card-back-button');
      const backButtonText = backButton.findByProps({ children: 'Back' });

      expect(backButtonText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: SUBJECT_COLORS.kanji }),
        ]),
      );
    });
  });

  describe('component radicals section', () => {
    const componentRadicals: ComponentRadical[] = [
      { id: 1, characters: '一', meaning: 'Ground' },
      { id: 3, characters: '人', meaning: 'Person' },
    ];

    it('renders component radicals section when provided for kanji', () => {
      const props = { ...defaultKanjiProps, componentRadicals };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-components')).toBeTruthy();
    });

    it('displays "Made up of:" title', () => {
      const props = { ...defaultKanjiProps, componentRadicals };
      const { getByText } = renderWithTheme(<LessonCard {...props} />);
      expect(getByText('Made up of:')).toBeTruthy();
    });

    it('displays each component radical', () => {
      const props = { ...defaultKanjiProps, componentRadicals };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-component-1')).toBeTruthy();
      expect(getByTestId('lesson-card-component-3')).toBeTruthy();
    });

    it('displays component radical characters', () => {
      const props = { ...defaultKanjiProps, componentRadicals };
      const { getByText } = renderWithTheme(<LessonCard {...props} />);
      expect(getByText('一')).toBeTruthy();
      expect(getByText('人')).toBeTruthy();
    });

    it('displays component radical meanings', () => {
      const props = { ...defaultKanjiProps, componentRadicals };
      const { getByText } = renderWithTheme(<LessonCard {...props} />);
      expect(getByText('Ground')).toBeTruthy();
      expect(getByText('Person')).toBeTruthy();
    });

    it('does not render component radicals section when not provided', () => {
      const { queryByTestId } = renderWithTheme(<LessonCard {...defaultKanjiProps} />);
      expect(queryByTestId('lesson-card-components')).toBeNull();
    });

    it('does not render component radicals section when array is empty', () => {
      const props = { ...defaultKanjiProps, componentRadicals: [] };
      const { queryByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(queryByTestId('lesson-card-components')).toBeNull();
    });

    it('displays meaning as fallback for radicals with null characters and no images', () => {
      const radicalsWithNull: ComponentRadical[] = [
        { id: 50, characters: null, meaning: 'Image Radical' },
      ];
      const props = {
        ...defaultKanjiProps,
        componentRadicals: radicalsWithNull,
      };
      const { getByTestId, getAllByText } = renderWithTheme(<LessonCard {...props} />);
      // Should use RadicalImage which falls back to meaning
      expect(getByTestId('lesson-card-component-50-image')).toBeTruthy();
      // The meaning appears twice - once in RadicalImage fallback and once as the label
      expect(getAllByText('Image Radical').length).toBeGreaterThanOrEqual(1);
    });

    it('displays RadicalImage for radicals with null characters but has characterImages', () => {
      const characterImages = JSON.stringify([
        {
          url: 'https://files.wanikani.com/test-radical.png',
          content_type: 'image/png',
          metadata: {},
        },
      ]);
      const radicalsWithImages: ComponentRadical[] = [
        { id: 50, characters: null, meaning: 'Image Radical', characterImages },
      ];
      const props = {
        ...defaultKanjiProps,
        componentRadicals: radicalsWithImages,
      };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      // Should render a component with the RadicalImage
      expect(getByTestId('lesson-card-component-50')).toBeTruthy();
      expect(getByTestId('lesson-card-component-50-image')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('handles empty meanings array', () => {
      const props = { ...defaultRadicalProps, meanings: [] };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-primary-meaning').props.children).toBe(
        '',
      );
    });

    it('handles empty readings array', () => {
      const props = { ...defaultKanjiProps, readings: [] };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-primary-reading').props.children).toBe(
        '',
      );
    });

    it('handles meanings with no primary specified', () => {
      const props = {
        ...defaultRadicalProps,
        meanings: createMeanings([{ meaning: 'Test' }]),
      };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-primary-meaning').props.children).toBe(
        'Test',
      );
    });

    it('handles readings with no primary specified', () => {
      const props = {
        ...defaultKanjiProps,
        readings: createKanjiReadings([{ reading: 'てすと' }]),
      };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-primary-reading').props.children).toBe(
        'てすと',
      );
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
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-other-meanings').props.children).toEqual([
        'Also:',
        ' ',
        'Accepted',
      ]);
    });

    it('filters out non-accepted readings from "Also" list', () => {
      const props = {
        ...defaultKanjiProps,
        readings: [
          {
            reading: 'おお',
            primary: true,
            accepted_answer: true,
            type: 'kunyomi' as const,
          },
          {
            reading: 'たい',
            primary: false,
            accepted_answer: true,
            type: 'onyomi' as const,
          },
          {
            reading: 'だい',
            primary: false,
            accepted_answer: false,
            type: 'onyomi' as const,
          },
        ],
      };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-other-readings').props.children).toEqual([
        'Also:',
        ' ',
        'たい',
      ]);
    });
  });

  describe('component kanji section (vocabulary)', () => {
    const componentKanji: ComponentKanji[] = [
      { id: 10, characters: '大', meaning: 'Big' },
      { id: 11, characters: '小', meaning: 'Small' },
    ];

    it('renders component kanji section for vocabulary items', () => {
      const props = { ...defaultVocabularyProps, componentKanji };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-components')).toBeTruthy();
    });

    it('displays "Made up of:" title for vocabulary', () => {
      const props = { ...defaultVocabularyProps, componentKanji };
      const { getByText } = renderWithTheme(<LessonCard {...props} />);
      expect(getByText('Made up of:')).toBeTruthy();
    });

    it('displays each component kanji', () => {
      const props = { ...defaultVocabularyProps, componentKanji };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(getByTestId('lesson-card-component-10')).toBeTruthy();
      expect(getByTestId('lesson-card-component-11')).toBeTruthy();
    });

    it('displays component kanji characters', () => {
      const props = { ...defaultVocabularyProps, componentKanji };
      const { getByText } = renderWithTheme(<LessonCard {...props} />);
      expect(getByText('大')).toBeTruthy();
      expect(getByText('小')).toBeTruthy();
    });

    it('displays component kanji meanings', () => {
      const props = { ...defaultVocabularyProps, componentKanji };
      const { getAllByText, getByText } = renderWithTheme(<LessonCard {...props} />);
      // "Big" appears both as primary meaning and component meaning
      expect(getAllByText('Big').length).toBeGreaterThanOrEqual(2);
      expect(getByText('Small')).toBeTruthy();
    });

    it('does not render component kanji section when not provided', () => {
      const { queryByTestId } = renderWithTheme(
        <LessonCard {...defaultVocabularyProps} />,
      );
      expect(queryByTestId('lesson-card-components')).toBeNull();
    });

    it('does not render component kanji section when array is empty', () => {
      const props = { ...defaultVocabularyProps, componentKanji: [] };
      const { queryByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(queryByTestId('lesson-card-components')).toBeNull();
    });

    it('uses kanji background color for component items', () => {
      const props = { ...defaultVocabularyProps, componentKanji };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      const component = getByTestId('lesson-card-component-10');
      expect(component.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.kanji }),
        ]),
      );
    });

    it('calls onComponentPress when a component kanji is pressed', () => {
      const onComponentPress = jest.fn();
      const props = { ...defaultVocabularyProps, componentKanji, onComponentPress };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />);
      fireEvent.press(getByTestId('lesson-card-component-10'));
      expect(onComponentPress).toHaveBeenCalledWith(10);
    });
  });

  describe('radicals do not show Made up of', () => {
    it('does not show components section for radical items', () => {
      const { queryByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />);
      expect(queryByTestId('lesson-card-components')).toBeNull();
    });

    it('does not show components section for radical even with componentRadicals prop', () => {
      const props = {
        ...defaultRadicalProps,
        componentRadicals: [{ id: 1, characters: '一', meaning: 'Ground' }],
      };
      const { queryByTestId } = renderWithTheme(<LessonCard {...props} />);
      expect(queryByTestId('lesson-card-components')).toBeNull();
    });
  });

  describe('theme-awareness', () => {
    const componentRadicals: ComponentRadical[] = [
      { id: 1, characters: '一', meaning: 'Ground' },
      { id: 3, characters: '人', meaning: 'Person' },
    ];

    it('uses light componentSection.background for components container in light mode', () => {
      const props = { ...defaultKanjiProps, componentRadicals };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />, 'light');
      const container = getByTestId('lesson-card-components');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: COLORS.componentSection.background }),
        ]),
      );
    });

    it('uses dark componentSection.background for components container in dark mode', () => {
      const props = { ...defaultKanjiProps, componentRadicals };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />, 'dark');
      const container = getByTestId('lesson-card-components');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#1A2A3A' }),
        ]),
      );
    });

    it('uses dark componentSection.border in dark mode', () => {
      const props = { ...defaultKanjiProps, componentRadicals };
      const { getByTestId } = renderWithTheme(<LessonCard {...props} />, 'dark');
      const container = getByTestId('lesson-card-components');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ borderBottomColor: '#2A3A4A' }),
        ]),
      );
    });

    it('uses dark background.primary for container in dark mode', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />, 'dark');
      const container = getByTestId('lesson-card');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#121212' }),
        ]),
      );
    });

    it('uses dark text.primary for primary text in dark mode', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultKanjiProps} />, 'dark');
      const primaryMeaning = getByTestId('lesson-card-primary-meaning');
      expect(primaryMeaning.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#E0E0E0' }),
        ]),
      );
    });

    it('uses dark text.secondary for section title in dark mode', () => {
      const { getByTestId } = renderWithTheme(<LessonCard {...defaultRadicalProps} />, 'dark');
      const section = getByTestId('lesson-card-meaning-section');
      const sectionTitle = section.children[0];
      expect((sectionTitle as any).props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#AAAAAA' }),
        ]),
      );
    });
  });
});
