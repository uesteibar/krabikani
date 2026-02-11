import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import {
  LessonBatch,
  LessonBatchProps,
  LessonItem,
  LESSON_BATCH_SIZE,
  SWIPE_THRESHOLD,
} from '../../src/components/LessonBatch';
import { ComponentRadical, ComponentKanji } from '../../src/components/LessonCard';
import type { Meaning, Reading, KanjiReading } from '../../src/api/types';
import { SUBJECT_COLORS, COLORS } from '../../src/theme';

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

// Helper to create kanji readings
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

// Create sample lesson items
function createRadicalItem(
  id: number,
  character: string,
  meaning: string,
): LessonItem {
  return {
    id,
    subjectType: 'radical',
    characters: character,
    meanings: createMeanings([{ meaning, primary: true }]),
    readings: null,
    meaningMnemonic: `Mnemonic for ${meaning}`,
    readingMnemonic: null,
  };
}

function createKanjiItem(
  id: number,
  character: string,
  meaning: string,
  reading: string,
  componentSubjectIds?: number[],
): LessonItem {
  return {
    id,
    subjectType: 'kanji',
    characters: character,
    meanings: createMeanings([{ meaning, primary: true }]),
    readings: createKanjiReadings([
      { reading, primary: true, type: 'kunyomi' },
    ]),
    meaningMnemonic: `Meaning mnemonic for ${meaning}`,
    readingMnemonic: `Reading mnemonic for ${reading}`,
    componentSubjectIds,
  };
}

function createVocabularyItem(
  id: number,
  characters: string,
  meaning: string,
  reading: string,
  componentSubjectIds?: number[],
): LessonItem {
  return {
    id,
    subjectType: 'vocabulary',
    characters,
    meanings: createMeanings([{ meaning, primary: true }]),
    readings: createReadings([{ reading, primary: true }]),
    meaningMnemonic: `Meaning mnemonic for ${meaning}`,
    readingMnemonic: `Reading mnemonic for ${reading}`,
    componentSubjectIds,
  };
}

// Sample items for testing
const sampleRadical = createRadicalItem(1, '一', 'Ground');
const sampleKanji = createKanjiItem(2, '大', 'Big', 'おお', [1, 3]);
const sampleVocabulary = createVocabularyItem(3, '大きい', 'Big', 'おおきい');
const sampleRadical2 = createRadicalItem(4, '人', 'Person');
const sampleKanji2 = createKanjiItem(5, '小', 'Small', 'しょう');

const fiveItems: LessonItem[] = [
  sampleRadical,
  sampleKanji,
  sampleVocabulary,
  sampleRadical2,
  sampleKanji2,
];

// Component radicals map
const componentRadicalsMap = new Map<number, ComponentRadical>([
  [1, { id: 1, characters: '一', meaning: 'Ground' }],
  [3, { id: 3, characters: '人', meaning: 'Person' }],
]);

const defaultProps: LessonBatchProps = {
  items: fiveItems,
  componentRadicals: componentRadicalsMap,
  onBatchComplete: jest.fn(),
};

describe('LessonBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constants', () => {
    it('exports LESSON_BATCH_SIZE as 5', () => {
      expect(LESSON_BATCH_SIZE).toBe(5);
    });
  });

  describe('basic rendering', () => {
    it('renders the component with testID', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);
      expect(getByTestId('lesson-batch')).toBeTruthy();
    });

    it('renders the progress indicator', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);
      expect(getByTestId('lesson-batch-progress')).toBeTruthy();
    });

    it('renders the lesson card', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);
      expect(getByTestId('lesson-card')).toBeTruthy();
    });

    it('renders the first item initially', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);
      expect(getByTestId('lesson-card-characters').props.children).toBe('一');
    });
  });

  describe('progress indicator', () => {
    it('displays progress text showing current position', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);
      expect(getByTestId('lesson-batch-progress-text').props.children).toEqual([
        1,
        ' / ',
        5,
      ]);
    });

    it('renders correct number of progress dots', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);
      for (let i = 0; i < 5; i++) {
        expect(getByTestId(`lesson-batch-dot-${i}`)).toBeTruthy();
      }
    });

    it('highlights the current dot and previous dots', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);
      // First dot should be colored (blue for radical)
      const dot0 = getByTestId('lesson-batch-dot-0');
      expect(dot0.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.radical }),
        ]),
      );
    });

    it('shows unvisited dots in gray', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);
      // Second dot should be gray (not visited yet)
      const dot1 = getByTestId('lesson-batch-dot-1');
      expect(dot1.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: COLORS.neutral.gray300 }),
        ]),
      );
    });

    it('updates progress when advancing', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);

      // Advance to second item
      fireEvent.press(getByTestId('lesson-card-next-button'));

      expect(getByTestId('lesson-batch-progress-text').props.children).toEqual([
        2,
        ' / ',
        5,
      ]);
    });

    it('colors dots based on their subject type', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);

      // Advance to kanji item (index 1)
      fireEvent.press(getByTestId('lesson-card-next-button'));

      // Dot 1 (kanji) should now be pink since we visited it
      const dot1 = getByTestId('lesson-batch-dot-1');
      expect(dot1.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.kanji }),
        ]),
      );
    });
  });

  describe('navigation through items', () => {
    it('advances to the next item when Next is pressed', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);

      // First item is radical "一"
      expect(getByTestId('lesson-card-characters').props.children).toBe('一');

      // Press next
      fireEvent.press(getByTestId('lesson-card-next-button'));

      // Second item is kanji "大"
      expect(getByTestId('lesson-card-characters').props.children).toBe('大');
    });

    it('navigates through all items in sequence', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);

      const expectedCharacters = ['一', '大', '大きい', '人', '小'];

      for (let i = 0; i < expectedCharacters.length; i++) {
        expect(getByTestId('lesson-card-characters').props.children).toBe(
          expectedCharacters[i],
        );
        if (i < expectedCharacters.length - 1) {
          fireEvent.press(getByTestId('lesson-card-next-button'));
        }
      }
    });

    it('updates progress indicator as items are viewed', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);

      for (let i = 1; i <= 5; i++) {
        expect(
          getByTestId('lesson-batch-progress-text').props.children,
        ).toEqual([i, ' / ', 5]);
        if (i < 5) {
          fireEvent.press(getByTestId('lesson-card-next-button'));
        }
      }
    });
  });

  describe('back button navigation', () => {
    it('does not show back button on the first item', () => {
      const { queryByTestId } = render(<LessonBatch {...defaultProps} />);

      // On first item, back button should not exist
      expect(queryByTestId('lesson-card-back-button')).toBeNull();
    });

    it('shows back button when not on the first item', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);

      // Advance to second item
      fireEvent.press(getByTestId('lesson-card-next-button'));

      // Back button should now be visible
      expect(getByTestId('lesson-card-back-button')).toBeTruthy();
    });

    it('goes back to previous item when Back is pressed', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);

      // First item is "一"
      expect(getByTestId('lesson-card-characters').props.children).toBe('一');

      // Advance to second item "大"
      fireEvent.press(getByTestId('lesson-card-next-button'));
      expect(getByTestId('lesson-card-characters').props.children).toBe('大');

      // Go back to first item
      fireEvent.press(getByTestId('lesson-card-back-button'));
      expect(getByTestId('lesson-card-characters').props.children).toBe('一');
    });

    it('hides back button after going back to first item', () => {
      const { getByTestId, queryByTestId } = render(
        <LessonBatch {...defaultProps} />,
      );

      // Advance to second item
      fireEvent.press(getByTestId('lesson-card-next-button'));
      expect(getByTestId('lesson-card-back-button')).toBeTruthy();

      // Go back to first item
      fireEvent.press(getByTestId('lesson-card-back-button'));

      // Back button should be hidden again
      expect(queryByTestId('lesson-card-back-button')).toBeNull();
    });

    it('updates progress text when going back', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);

      // Advance to third item (index 2)
      fireEvent.press(getByTestId('lesson-card-next-button'));
      fireEvent.press(getByTestId('lesson-card-next-button'));

      expect(getByTestId('lesson-batch-progress-text').props.children).toEqual([
        3,
        ' / ',
        5,
      ]);

      // Go back
      fireEvent.press(getByTestId('lesson-card-back-button'));

      expect(getByTestId('lesson-batch-progress-text').props.children).toEqual([
        2,
        ' / ',
        5,
      ]);
    });

    it('can navigate back and forth multiple times', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);

      const expectedCharacters = ['一', '大', '大きい', '人', '小'];

      // Navigate forward to item 3
      fireEvent.press(getByTestId('lesson-card-next-button'));
      fireEvent.press(getByTestId('lesson-card-next-button'));
      expect(getByTestId('lesson-card-characters').props.children).toBe(
        expectedCharacters[2],
      );

      // Go back twice
      fireEvent.press(getByTestId('lesson-card-back-button'));
      fireEvent.press(getByTestId('lesson-card-back-button'));
      expect(getByTestId('lesson-card-characters').props.children).toBe(
        expectedCharacters[0],
      );

      // Go forward again
      fireEvent.press(getByTestId('lesson-card-next-button'));
      expect(getByTestId('lesson-card-characters').props.children).toBe(
        expectedCharacters[1],
      );
    });

    it('shows back button on the last item', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);

      // Navigate to the last item
      for (let i = 0; i < 4; i++) {
        fireEvent.press(getByTestId('lesson-card-next-button'));
      }

      // Verify we're on the last item
      expect(getByTestId('lesson-batch-progress-text').props.children).toEqual([
        5,
        ' / ',
        5,
      ]);

      // Back button should be visible
      expect(getByTestId('lesson-card-back-button')).toBeTruthy();
    });

    it('can go back from the last item', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);

      // Navigate to the last item
      for (let i = 0; i < 4; i++) {
        fireEvent.press(getByTestId('lesson-card-next-button'));
      }

      // Go back
      fireEvent.press(getByTestId('lesson-card-back-button'));

      expect(getByTestId('lesson-batch-progress-text').props.children).toEqual([
        4,
        ' / ',
        5,
      ]);
    });
  });

  describe('batch completion', () => {
    it('calls onBatchComplete when pressing Next on the last item', () => {
      const onBatchComplete = jest.fn();
      const { getByTestId } = render(
        <LessonBatch {...defaultProps} onBatchComplete={onBatchComplete} />,
      );

      // Navigate to the last item
      for (let i = 0; i < 4; i++) {
        fireEvent.press(getByTestId('lesson-card-next-button'));
      }

      // Verify we're on the last item
      expect(getByTestId('lesson-batch-progress-text').props.children).toEqual([
        5,
        ' / ',
        5,
      ]);

      // Press next on the last item
      fireEvent.press(getByTestId('lesson-card-next-button'));

      expect(onBatchComplete).toHaveBeenCalledTimes(1);
    });

    it('does not call onBatchComplete before viewing all items', () => {
      const onBatchComplete = jest.fn();
      const { getByTestId } = render(
        <LessonBatch {...defaultProps} onBatchComplete={onBatchComplete} />,
      );

      // Navigate to the second-to-last item
      for (let i = 0; i < 3; i++) {
        fireEvent.press(getByTestId('lesson-card-next-button'));
      }

      expect(onBatchComplete).not.toHaveBeenCalled();
    });
  });

  describe('component radicals display', () => {
    it('shows component radicals section for kanji items', () => {
      const { getByTestId, queryByTestId } = render(
        <LessonBatch {...defaultProps} />,
      );

      // First item is radical - no components
      expect(queryByTestId('lesson-card-components')).toBeNull();

      // Navigate to kanji item
      fireEvent.press(getByTestId('lesson-card-next-button'));

      // Kanji item should have components
      expect(getByTestId('lesson-card-components')).toBeTruthy();
    });

    it('displays component radicals with correct data', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);

      // Navigate to kanji item (index 1)
      fireEvent.press(getByTestId('lesson-card-next-button'));

      // Should show both component radicals
      expect(getByTestId('lesson-card-component-1')).toBeTruthy();
      expect(getByTestId('lesson-card-component-3')).toBeTruthy();
    });

    it('displays component radical characters', () => {
      const { getByTestId, getByText } = render(
        <LessonBatch {...defaultProps} />,
      );

      // Navigate to kanji item
      fireEvent.press(getByTestId('lesson-card-next-button'));

      // The components section should exist
      expect(getByTestId('lesson-card-component-1')).toBeTruthy();
      // The character should be displayed
      expect(getByText('一')).toBeTruthy(); // Ground radical
      expect(getByText('Ground')).toBeTruthy(); // Meaning
    });

    it('does not show components for vocabulary items without componentSubjectIds', () => {
      const { getByTestId, queryByTestId } = render(
        <LessonBatch {...defaultProps} />,
      );

      // Navigate to vocabulary item (index 2) — this one has no componentSubjectIds
      fireEvent.press(getByTestId('lesson-card-next-button')); // kanji
      fireEvent.press(getByTestId('lesson-card-next-button')); // vocabulary

      expect(queryByTestId('lesson-card-components')).toBeNull();
    });

    it('does not show components for radicals', () => {
      const { queryByTestId } = render(<LessonBatch {...defaultProps} />);

      // First item is a radical
      expect(queryByTestId('lesson-card-components')).toBeNull();
    });

    it('does not show components when kanji has no componentSubjectIds', () => {
      const items = [createKanjiItem(10, '本', 'Book', 'ほん')]; // No component_subject_ids
      const { queryByTestId } = render(
        <LessonBatch
          items={items}
          componentRadicals={componentRadicalsMap}
          onBatchComplete={jest.fn()}
        />,
      );

      expect(queryByTestId('lesson-card-components')).toBeNull();
    });

    it('does not show components when componentRadicals map is not provided', () => {
      const items = [createKanjiItem(10, '本', 'Book', 'ほん', [1, 2])];
      const { queryByTestId } = render(
        <LessonBatch items={items} onBatchComplete={jest.fn()} />,
      );

      expect(queryByTestId('lesson-card-components')).toBeNull();
    });

    it('filters out missing component radicals', () => {
      const items = [createKanjiItem(10, '本', 'Book', 'ほん', [1, 999])]; // 999 doesn't exist
      const { getByTestId, queryByTestId } = render(
        <LessonBatch
          items={items}
          componentRadicals={componentRadicalsMap}
          onBatchComplete={jest.fn()}
        />,
      );

      // Should only show component 1, not 999
      expect(getByTestId('lesson-card-component-1')).toBeTruthy();
      expect(queryByTestId('lesson-card-component-999')).toBeNull();
    });
  });

  describe('empty state', () => {
    it('renders empty state when no items provided', () => {
      const { getByTestId, getByText } = render(
        <LessonBatch
          items={[]}
          componentRadicals={componentRadicalsMap}
          onBatchComplete={jest.fn()}
        />,
      );

      expect(getByTestId('lesson-batch-empty')).toBeTruthy();
      expect(getByText('No lessons available')).toBeTruthy();
    });
  });

  describe('single item batch', () => {
    it('handles a batch with a single item', () => {
      const onBatchComplete = jest.fn();
      const { getByTestId } = render(
        <LessonBatch
          items={[sampleRadical]}
          componentRadicals={componentRadicalsMap}
          onBatchComplete={onBatchComplete}
        />,
      );

      expect(getByTestId('lesson-batch-progress-text').props.children).toEqual([
        1,
        ' / ',
        1,
      ]);

      // Press next should complete the batch
      fireEvent.press(getByTestId('lesson-card-next-button'));
      expect(onBatchComplete).toHaveBeenCalledTimes(1);
    });

    it('shows correct number of dots for single item', () => {
      const { getByTestId, queryByTestId } = render(
        <LessonBatch
          items={[sampleRadical]}
          componentRadicals={componentRadicalsMap}
          onBatchComplete={jest.fn()}
        />,
      );

      expect(getByTestId('lesson-batch-dot-0')).toBeTruthy();
      expect(queryByTestId('lesson-batch-dot-1')).toBeNull();
    });
  });

  describe('partial batch (less than 5 items)', () => {
    it('handles a batch with 3 items', () => {
      const items = [sampleRadical, sampleKanji, sampleVocabulary];
      const onBatchComplete = jest.fn();
      const { getByTestId } = render(
        <LessonBatch
          items={items}
          componentRadicals={componentRadicalsMap}
          onBatchComplete={onBatchComplete}
        />,
      );

      expect(getByTestId('lesson-batch-progress-text').props.children).toEqual([
        1,
        ' / ',
        3,
      ]);

      // Navigate through all items
      fireEvent.press(getByTestId('lesson-card-next-button'));
      fireEvent.press(getByTestId('lesson-card-next-button'));

      // Complete
      fireEvent.press(getByTestId('lesson-card-next-button'));
      expect(onBatchComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('subject type colors in progress dots', () => {
    it('uses blue for radical dots', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonBatch
          items={items}
          componentRadicals={componentRadicalsMap}
          onBatchComplete={jest.fn()}
        />,
      );

      const dot = getByTestId('lesson-batch-dot-0');
      expect(dot.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.radical }),
        ]),
      );
    });

    it('uses pink for kanji dots when visited', () => {
      const items = [sampleKanji];
      const { getByTestId } = render(
        <LessonBatch
          items={items}
          componentRadicals={componentRadicalsMap}
          onBatchComplete={jest.fn()}
        />,
      );

      const dot = getByTestId('lesson-batch-dot-0');
      expect(dot.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.kanji }),
        ]),
      );
    });

    it('uses purple for vocabulary dots when visited', () => {
      const items = [sampleVocabulary];
      const { getByTestId } = render(
        <LessonBatch
          items={items}
          componentRadicals={componentRadicalsMap}
          onBatchComplete={jest.fn()}
        />,
      );

      const dot = getByTestId('lesson-batch-dot-0');
      expect(dot.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: SUBJECT_COLORS.vocabulary,
          }),
        ]),
      );
    });

    it('uses purple for kana_vocabulary dots when visited', () => {
      const kanaVocab: LessonItem = {
        id: 100,
        subjectType: 'kana_vocabulary',
        characters: 'あめ',
        meanings: createMeanings([{ meaning: 'Candy', primary: true }]),
        readings: createReadings([{ reading: 'あめ', primary: true }]),
        meaningMnemonic: 'Candy mnemonic',
        readingMnemonic: 'Candy reading mnemonic',
      };
      const { getByTestId } = render(
        <LessonBatch
          items={[kanaVocab]}
          componentRadicals={componentRadicalsMap}
          onBatchComplete={jest.fn()}
        />,
      );

      const dot = getByTestId('lesson-batch-dot-0');
      expect(dot.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: SUBJECT_COLORS.kana_vocabulary,
          }),
        ]),
      );
    });
  });

  describe('component radicals with null characters', () => {
    it('displays meaning fallback for radicals with null characters and no images', () => {
      const items = [createKanjiItem(10, '本', 'Book', 'ほん', [50])];
      const radicalsWithNull = new Map<number, ComponentRadical>([
        [50, { id: 50, characters: null, meaning: 'Image Radical' }],
      ]);
      const { getByTestId, getAllByText } = render(
        <LessonBatch
          items={items}
          componentRadicals={radicalsWithNull}
          onBatchComplete={jest.fn()}
        />,
      );

      expect(getByTestId('lesson-card-component-50')).toBeTruthy();
      // RadicalImage falls back to meaning text when no characterImages
      expect(getAllByText('Image Radical').length).toBeGreaterThan(0);
    });
  });

  describe('card content display', () => {
    it('displays radical card content correctly', () => {
      const { getByTestId, queryByTestId } = render(
        <LessonBatch {...defaultProps} />,
      );

      // First item is radical
      expect(getByTestId('lesson-card-characters').props.children).toBe('一');
      expect(getByTestId('lesson-card-type').props.children).toBe('radical');
      expect(queryByTestId('lesson-card-reading-section')).toBeNull();
    });

    it('displays kanji card content correctly', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);

      // Navigate to kanji
      fireEvent.press(getByTestId('lesson-card-next-button'));

      expect(getByTestId('lesson-card-characters').props.children).toBe('大');
      expect(getByTestId('lesson-card-type').props.children).toBe('kanji');
      expect(getByTestId('lesson-card-reading-section')).toBeTruthy();
    });

    it('displays vocabulary card content correctly', () => {
      const { getByTestId } = render(<LessonBatch {...defaultProps} />);

      // Navigate to vocabulary (third item)
      fireEvent.press(getByTestId('lesson-card-next-button'));
      fireEvent.press(getByTestId('lesson-card-next-button'));

      expect(getByTestId('lesson-card-characters').props.children).toBe(
        '大きい',
      );
      expect(getByTestId('lesson-card-type').props.children).toBe('vocabulary');
      expect(getByTestId('lesson-card-reading-section')).toBeTruthy();
    });
  });

  describe('swipe gestures', () => {
    // Note: PanResponder's gesture state is managed internally and cannot be easily unit tested
    // by calling the handler directly. The handler attached to props.onResponderRelease is
    // PanResponder's internal handler which tracks gesture state separately.
    // Functional swipe testing requires manual browser verification or E2E tests.

    describe('constants', () => {
      it('exports SWIPE_THRESHOLD as 50', () => {
        expect(SWIPE_THRESHOLD).toBe(50);
      });
    });

    describe('swipe area rendering', () => {
      it('renders the swipe area with testID', () => {
        const { getByTestId } = render(<LessonBatch {...defaultProps} />);
        expect(getByTestId('lesson-batch-swipe-area')).toBeTruthy();
      });

      it('swipe area contains the lesson card', () => {
        const { getByTestId } = render(<LessonBatch {...defaultProps} />);
        const swipeArea = getByTestId('lesson-batch-swipe-area');
        // The lesson card should be a child of the swipe area
        expect(swipeArea).toBeTruthy();
        expect(getByTestId('lesson-card')).toBeTruthy();
      });

      it('swipe area has responder handlers attached', () => {
        const { getByTestId } = render(<LessonBatch {...defaultProps} />);
        const swipeArea = getByTestId('lesson-batch-swipe-area');
        // PanResponder attaches these handlers to enable gesture recognition
        expect(swipeArea.props.onResponderRelease).toBeDefined();
        expect(swipeArea.props.onMoveShouldSetResponder).toBeDefined();
        expect(swipeArea.props.onStartShouldSetResponder).toBeDefined();
      });
    });

    describe('button navigation works alongside swipe area', () => {
      it('Next button advances to next item', () => {
        const { getByTestId } = render(<LessonBatch {...defaultProps} />);

        // First item should be "一"
        expect(getByTestId('lesson-card-characters').props.children).toBe('一');

        // Use button to advance
        fireEvent.press(getByTestId('lesson-card-next-button'));

        // Should be on second item
        expect(getByTestId('lesson-card-characters').props.children).toBe('大');
      });

      it('Back button goes to previous item', () => {
        const { getByTestId } = render(<LessonBatch {...defaultProps} />);

        // Navigate to third item
        fireEvent.press(getByTestId('lesson-card-next-button'));
        fireEvent.press(getByTestId('lesson-card-next-button'));
        expect(getByTestId('lesson-card-characters').props.children).toBe(
          '大きい',
        );

        // Use button to go back
        fireEvent.press(getByTestId('lesson-card-back-button'));

        // Should be on second item
        expect(getByTestId('lesson-card-characters').props.children).toBe('大');
      });

      it('Next button on last item calls onBatchComplete', () => {
        const onBatchComplete = jest.fn();
        const { getByTestId } = render(
          <LessonBatch {...defaultProps} onBatchComplete={onBatchComplete} />,
        );

        // Navigate to the last item
        for (let i = 0; i < 4; i++) {
          fireEvent.press(getByTestId('lesson-card-next-button'));
        }

        // Verify we're on the last item
        expect(
          getByTestId('lesson-batch-progress-text').props.children,
        ).toEqual([5, ' / ', 5]);

        // Press next on last item
        fireEvent.press(getByTestId('lesson-card-next-button'));

        expect(onBatchComplete).toHaveBeenCalledTimes(1);
      });

      it('Back button does nothing on first item (not rendered)', () => {
        const { queryByTestId } = render(<LessonBatch {...defaultProps} />);

        // Back button should not be rendered on first item
        expect(queryByTestId('lesson-card-back-button')).toBeNull();
      });
    });
  });

  describe('component kanji display (vocabulary)', () => {
    const componentKanjiMap = new Map<number, ComponentKanji>([
      [20, { id: 20, characters: '大', meaning: 'Big' }],
      [21, { id: 21, characters: '小', meaning: 'Small' }],
    ]);

    const vocabWithComponents = createVocabularyItem(
      50,
      '大小',
      'Size',
      'たいしょう',
      [20, 21],
    );

    it('shows component kanji section for vocabulary items with componentSubjectIds', () => {
      const { getByTestId } = render(
        <LessonBatch
          items={[vocabWithComponents]}
          componentKanji={componentKanjiMap}
          onBatchComplete={jest.fn()}
        />,
      );

      expect(getByTestId('lesson-card-components')).toBeTruthy();
    });

    it('displays component kanji characters and meanings', () => {
      const { getByText, getByTestId } = render(
        <LessonBatch
          items={[vocabWithComponents]}
          componentKanji={componentKanjiMap}
          onBatchComplete={jest.fn()}
        />,
      );

      expect(getByTestId('lesson-card-component-20')).toBeTruthy();
      expect(getByTestId('lesson-card-component-21')).toBeTruthy();
      expect(getByText('Big')).toBeTruthy();
      expect(getByText('Small')).toBeTruthy();
    });

    it('does not show component kanji for vocabulary without componentSubjectIds', () => {
      const vocabNoComponents = createVocabularyItem(
        51,
        '大きい',
        'Big',
        'おおきい',
      );
      const { queryByTestId } = render(
        <LessonBatch
          items={[vocabNoComponents]}
          componentKanji={componentKanjiMap}
          onBatchComplete={jest.fn()}
        />,
      );

      expect(queryByTestId('lesson-card-components')).toBeNull();
    });

    it('does not show component kanji when componentKanji map is not provided', () => {
      const { queryByTestId } = render(
        <LessonBatch
          items={[vocabWithComponents]}
          onBatchComplete={jest.fn()}
        />,
      );

      expect(queryByTestId('lesson-card-components')).toBeNull();
    });

    it('filters out missing component kanji', () => {
      const vocabWithMissing = createVocabularyItem(
        52,
        '大中',
        'Large-Medium',
        'たいちゅう',
        [20, 999], // 999 doesn't exist in map
      );
      const { getByTestId, queryByTestId } = render(
        <LessonBatch
          items={[vocabWithMissing]}
          componentKanji={componentKanjiMap}
          onBatchComplete={jest.fn()}
        />,
      );

      expect(getByTestId('lesson-card-component-20')).toBeTruthy();
      expect(queryByTestId('lesson-card-component-999')).toBeNull();
    });
  });
});
