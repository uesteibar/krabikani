import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';

import { ItemDetails } from '../../src/components/ItemDetails';
import type { Meaning, Reading, KanjiReading } from '../../src/api/types';
import type { ReviewComponentRadical, ReviewComponentKanji } from '../../src/components/ReviewSession';

// Helper functions to create test data
function createMeaning(meaning: string, primary: boolean = false, accepted: boolean = true): Meaning {
  return {
    meaning,
    primary,
    accepted_answer: accepted,
  };
}

function createReading(reading: string, primary: boolean = false, accepted: boolean = true): Reading {
  return {
    reading,
    primary,
    accepted_answer: accepted,
  };
}

function createKanjiReading(
  reading: string,
  type: 'onyomi' | 'kunyomi' | 'nanori',
  primary: boolean = false,
  accepted: boolean = true
): KanjiReading {
  return {
    reading,
    type,
    primary,
    accepted_answer: accepted,
  };
}

function createComponentRadical(
  id: number,
  characters: string | null,
  meaning: string,
  characterImages?: string | null
): ReviewComponentRadical {
  return {
    id,
    characters,
    meaning,
    characterImages,
  };
}

function createComponentKanji(
  id: number,
  characters: string,
  meaning: string,
  reading: string
): ReviewComponentKanji {
  return {
    id,
    characters,
    meaning,
    reading,
  };
}

describe('ItemDetails', () => {
  describe('basic rendering', () => {
    it('renders with testID', () => {
      const { getByTestId } = render(
        <ItemDetails
          subjectType="radical"
          meanings={[createMeaning('Ground', true)]}
          readings={null}
          meaningMnemonic="The ground is below us."
          readingMnemonic={null}
          testID="item-details"
        />
      );
      expect(getByTestId('item-details')).toBeTruthy();
    });

    it('renders meanings section', () => {
      const { getByTestId, getByText } = render(
        <ItemDetails
          subjectType="radical"
          meanings={[createMeaning('Ground', true)]}
          readings={null}
          meaningMnemonic="The ground is below us."
          readingMnemonic={null}
          testID="test"
        />
      );
      expect(getByTestId('test-meanings')).toBeTruthy();
      expect(getByText('Meanings')).toBeTruthy();
    });

    it('renders meaning mnemonic section', () => {
      const { getByTestId, getByText } = render(
        <ItemDetails
          subjectType="radical"
          meanings={[createMeaning('Ground', true)]}
          readings={null}
          meaningMnemonic="The ground is below us."
          readingMnemonic={null}
          testID="test"
        />
      );
      expect(getByTestId('test-meaning-mnemonic')).toBeTruthy();
      expect(getByText('Meaning Mnemonic')).toBeTruthy();
    });
  });

  describe('meanings section', () => {
    it('displays primary meaning with bold styling', () => {
      const { getByTestId } = render(
        <ItemDetails
          subjectType="radical"
          meanings={[
            createMeaning('Ground', true),
            createMeaning('Earth', false),
          ]}
          readings={null}
          meaningMnemonic="Test mnemonic"
          readingMnemonic={null}
          testID="test"
        />
      );

      const primaryMeaning = getByTestId('test-meaning-0');
      expect(primaryMeaning.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontWeight: 'bold' })])
      );
    });

    it('displays primary label for primary meaning', () => {
      const { getByText } = render(
        <ItemDetails
          subjectType="radical"
          meanings={[createMeaning('Ground', true)]}
          readings={null}
          meaningMnemonic="Test mnemonic"
          readingMnemonic={null}
        />
      );

      expect(getByText(' (primary)')).toBeTruthy();
    });

    it('displays alternative meanings without bold styling', () => {
      const { getByTestId } = render(
        <ItemDetails
          subjectType="radical"
          meanings={[
            createMeaning('Ground', true),
            createMeaning('Earth', false),
          ]}
          readings={null}
          meaningMnemonic="Test mnemonic"
          readingMnemonic={null}
          testID="test"
        />
      );

      const altMeaning = getByTestId('test-meaning-1');
      // Alternative meanings don't have bold style
      expect(altMeaning.props.style).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ fontWeight: 'bold' })])
      );
    });

    it('displays multiple meanings', () => {
      const { getByTestId } = render(
        <ItemDetails
          subjectType="radical"
          meanings={[
            createMeaning('Ground', true),
            createMeaning('Earth', false),
            createMeaning('Soil', false),
          ]}
          readings={null}
          meaningMnemonic="Test mnemonic"
          readingMnemonic={null}
          testID="test"
        />
      );

      expect(getByTestId('test-meaning-0')).toBeTruthy();
      expect(getByTestId('test-meaning-1')).toBeTruthy();
      expect(getByTestId('test-meaning-2')).toBeTruthy();
    });
  });

  describe('readings section', () => {
    it('does not render readings section for radicals', () => {
      const { queryByTestId, queryByText } = render(
        <ItemDetails
          subjectType="radical"
          meanings={[createMeaning('Ground', true)]}
          readings={null}
          meaningMnemonic="Test mnemonic"
          readingMnemonic={null}
          testID="test"
        />
      );

      expect(queryByTestId('test-readings')).toBeNull();
      expect(queryByText('Readings')).toBeNull();
    });

    it('renders readings section for vocabulary', () => {
      const { getByTestId, getByText } = render(
        <ItemDetails
          subjectType="vocabulary"
          meanings={[createMeaning('Big', true)]}
          readings={[
            createReading('おおきい', true),
            createReading('おおい', false),
          ]}
          meaningMnemonic="Test mnemonic"
          readingMnemonic="Test reading mnemonic"
          testID="test"
        />
      );

      expect(getByTestId('test-readings')).toBeTruthy();
      expect(getByText('Readings')).toBeTruthy();
      expect(getByTestId('test-reading-0')).toBeTruthy();
      expect(getByTestId('test-reading-1')).toBeTruthy();
    });

    it('displays primary reading with bold styling', () => {
      const { getByTestId } = render(
        <ItemDetails
          subjectType="vocabulary"
          meanings={[createMeaning('Big', true)]}
          readings={[
            createReading('おおきい', true),
            createReading('おおい', false),
          ]}
          meaningMnemonic="Test mnemonic"
          readingMnemonic="Test reading mnemonic"
          testID="test"
        />
      );

      const primaryReading = getByTestId('test-reading-0');
      expect(primaryReading.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontWeight: 'bold' })])
      );
    });

    it('displays kanji readings grouped by type', () => {
      const { getByText, getByTestId } = render(
        <ItemDetails
          subjectType="kanji"
          meanings={[createMeaning('Big', true)]}
          readings={[
            createKanjiReading('だい', 'onyomi', true),
            createKanjiReading('たい', 'onyomi', false),
            createKanjiReading('おお', 'kunyomi', true),
          ]}
          meaningMnemonic="Test mnemonic"
          readingMnemonic="Test reading mnemonic"
          testID="test"
        />
      );

      expect(getByTestId('test-readings-onyomi')).toBeTruthy();
      expect(getByTestId('test-readings-kunyomi')).toBeTruthy();
      expect(getByText("On'yomi")).toBeTruthy();
      expect(getByText("Kun'yomi")).toBeTruthy();
      expect(getByTestId('test-reading-onyomi-0')).toBeTruthy();
      expect(getByTestId('test-reading-onyomi-1')).toBeTruthy();
      expect(getByTestId('test-reading-kunyomi-0')).toBeTruthy();
    });

    it('displays nanori readings when present', () => {
      const { getByText, getByTestId } = render(
        <ItemDetails
          subjectType="kanji"
          meanings={[createMeaning('Big', true)]}
          readings={[
            createKanjiReading('だい', 'onyomi', true),
            createKanjiReading('ひろし', 'nanori', false),
          ]}
          meaningMnemonic="Test mnemonic"
          readingMnemonic="Test reading mnemonic"
          testID="test"
        />
      );

      expect(getByTestId('test-readings-nanori')).toBeTruthy();
      expect(getByText('Nanori')).toBeTruthy();
      expect(getByText('ひろし')).toBeTruthy();
    });

    it('does not render empty reading type groups', () => {
      const { queryByTestId, queryByText } = render(
        <ItemDetails
          subjectType="kanji"
          meanings={[createMeaning('Big', true)]}
          readings={[
            createKanjiReading('だい', 'onyomi', true),
          ]}
          meaningMnemonic="Test mnemonic"
          readingMnemonic="Test reading mnemonic"
          testID="test"
        />
      );

      expect(queryByTestId('test-readings-kunyomi')).toBeNull();
      expect(queryByTestId('test-readings-nanori')).toBeNull();
      expect(queryByText("Kun'yomi")).toBeNull();
      expect(queryByText('Nanori')).toBeNull();
    });
  });

  describe('mnemonic sections', () => {
    it('renders meaning mnemonic with MnemonicText', () => {
      const { getByTestId } = render(
        <ItemDetails
          subjectType="radical"
          meanings={[createMeaning('Ground', true)]}
          readings={null}
          meaningMnemonic="The <radical>ground</radical> is below us."
          readingMnemonic={null}
          testID="test"
        />
      );

      expect(getByTestId('test-meaning-mnemonic-text')).toBeTruthy();
    });

    it('renders reading mnemonic section when present', () => {
      const { getByTestId, getByText } = render(
        <ItemDetails
          subjectType="kanji"
          meanings={[createMeaning('Big', true)]}
          readings={[createKanjiReading('だい', 'onyomi', true)]}
          meaningMnemonic="Test meaning mnemonic"
          readingMnemonic="Test reading mnemonic"
          testID="test"
        />
      );

      expect(getByTestId('test-reading-mnemonic')).toBeTruthy();
      expect(getByText('Reading Mnemonic')).toBeTruthy();
      expect(getByTestId('test-reading-mnemonic-text')).toBeTruthy();
    });

    it('does not render reading mnemonic section when null', () => {
      const { queryByTestId, queryByText } = render(
        <ItemDetails
          subjectType="radical"
          meanings={[createMeaning('Ground', true)]}
          readings={null}
          meaningMnemonic="Test meaning mnemonic"
          readingMnemonic={null}
          testID="test"
        />
      );

      expect(queryByTestId('test-reading-mnemonic')).toBeNull();
      expect(queryByText('Reading Mnemonic')).toBeNull();
    });
  });

  describe('components section', () => {
    it('renders component radicals for kanji', () => {
      const { getByTestId, getByText } = render(
        <ItemDetails
          subjectType="kanji"
          meanings={[createMeaning('Big', true)]}
          readings={[createKanjiReading('だい', 'onyomi', true)]}
          meaningMnemonic="Test mnemonic"
          readingMnemonic="Test reading mnemonic"
          componentRadicals={[
            createComponentRadical(1, '一', 'One'),
            createComponentRadical(2, '人', 'Person'),
          ]}
          testID="test"
        />
      );

      expect(getByTestId('test-components')).toBeTruthy();
      expect(getByText('Made up of')).toBeTruthy();
      expect(getByTestId('test-component-1')).toBeTruthy();
      expect(getByTestId('test-component-2')).toBeTruthy();
    });

    it('renders component kanji for vocabulary', () => {
      const { getByTestId, getByText } = render(
        <ItemDetails
          subjectType="vocabulary"
          meanings={[createMeaning('Big', true)]}
          readings={[createReading('おおきい', true)]}
          meaningMnemonic="Test mnemonic"
          readingMnemonic="Test reading mnemonic"
          componentKanji={[
            createComponentKanji(1, '大', 'Big', 'だい'),
          ]}
          testID="test"
        />
      );

      expect(getByTestId('test-components')).toBeTruthy();
      expect(getByText('Made up of')).toBeTruthy();
      expect(getByTestId('test-component-1')).toBeTruthy();
    });

    it('does not render components section when no components', () => {
      const { queryByTestId, queryByText } = render(
        <ItemDetails
          subjectType="kanji"
          meanings={[createMeaning('Big', true)]}
          readings={[createKanjiReading('だい', 'onyomi', true)]}
          meaningMnemonic="Test mnemonic"
          readingMnemonic="Test reading mnemonic"
          testID="test"
        />
      );

      expect(queryByTestId('test-components')).toBeNull();
      expect(queryByText('Made up of')).toBeNull();
    });

    it('does not render components section with empty arrays', () => {
      const { queryByTestId } = render(
        <ItemDetails
          subjectType="kanji"
          meanings={[createMeaning('Big', true)]}
          readings={[createKanjiReading('だい', 'onyomi', true)]}
          meaningMnemonic="Test mnemonic"
          readingMnemonic="Test reading mnemonic"
          componentRadicals={[]}
          testID="test"
        />
      );

      expect(queryByTestId('test-components')).toBeNull();
    });

    it('renders radicals without characters (image-only radicals)', () => {
      const { getByTestId } = render(
        <ItemDetails
          subjectType="kanji"
          meanings={[createMeaning('Big', true)]}
          readings={[createKanjiReading('だい', 'onyomi', true)]}
          meaningMnemonic="Test mnemonic"
          readingMnemonic="Test reading mnemonic"
          componentRadicals={[
            createComponentRadical(1, null, 'Spoon', '[]'),
          ]}
          testID="test"
        />
      );

      expect(getByTestId('test-component-1')).toBeTruthy();
    });
  });

  describe('dividers', () => {
    it('renders dividers between sections', () => {
      const { UNSAFE_root } = render(
        <ItemDetails
          subjectType="kanji"
          meanings={[createMeaning('Big', true)]}
          readings={[createKanjiReading('だい', 'onyomi', true)]}
          meaningMnemonic="Test mnemonic"
          readingMnemonic="Test reading mnemonic"
          componentRadicals={[createComponentRadical(1, '一', 'One')]}
        />
      );

      // Count divider elements by looking for views that are positioned between sections
      // Dividers have height: 1 which is applied as a style
      const allViews = UNSAFE_root.findAllByType(View);
      const dividerViews = allViews.filter(view => {
        const style = view.props.style;
        if (style && typeof style === 'object' && !Array.isArray(style)) {
          return style.height === 1;
        }
        return false;
      });
      // Should have dividers: after meanings, after readings, after meaning mnemonic, after reading mnemonic
      expect(dividerViews.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('kana vocabulary', () => {
    it('renders correctly for kana_vocabulary subject type', () => {
      const { getByTestId } = render(
        <ItemDetails
          subjectType="kana_vocabulary"
          meanings={[createMeaning('Like This', true)]}
          readings={[createReading('こう', true)]}
          meaningMnemonic="Test mnemonic"
          readingMnemonic={null}
          testID="test"
        />
      );

      expect(getByTestId('test')).toBeTruthy();
      expect(getByTestId('test-meaning-0')).toBeTruthy();
      expect(getByTestId('test-reading-0')).toBeTruthy();
    });
  });

  describe('default testID', () => {
    it('uses default testID when not provided', () => {
      const { getByTestId } = render(
        <ItemDetails
          subjectType="radical"
          meanings={[createMeaning('Ground', true)]}
          readings={null}
          meaningMnemonic="Test mnemonic"
          readingMnemonic={null}
        />
      );

      expect(getByTestId('item-details')).toBeTruthy();
      expect(getByTestId('item-details-meanings')).toBeTruthy();
      expect(getByTestId('item-details-meaning-mnemonic')).toBeTruthy();
    });
  });
});
