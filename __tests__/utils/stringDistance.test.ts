import {
  damerauLevenshtein,
  isWithinDistance,
} from '../../src/utils/stringDistance';

describe('stringDistance', () => {
  // ============================================
  // Damerau-Levenshtein Distance Tests
  // ============================================
  describe('damerauLevenshtein', () => {
    describe('identical strings', () => {
      it('returns 0 for empty strings', () => {
        expect(damerauLevenshtein('', '')).toBe(0);
      });

      it('returns 0 for identical strings', () => {
        expect(damerauLevenshtein('cat', 'cat')).toBe(0);
      });

      it('returns 0 for identical longer strings', () => {
        expect(damerauLevenshtein('vocabulary', 'vocabulary')).toBe(0);
      });
    });

    describe('insertions', () => {
      it('counts single insertion at end', () => {
        expect(damerauLevenshtein('cat', 'cats')).toBe(1);
      });

      it('counts single insertion at start', () => {
        expect(damerauLevenshtein('at', 'cat')).toBe(1);
      });

      it('counts single insertion in middle', () => {
        expect(damerauLevenshtein('cat', 'cart')).toBe(1);
      });

      it('counts multiple insertions', () => {
        expect(damerauLevenshtein('cat', 'catch')).toBe(2);
      });

      it('handles insertion from empty string', () => {
        expect(damerauLevenshtein('', 'abc')).toBe(3);
      });
    });

    describe('deletions', () => {
      it('counts single deletion at end', () => {
        expect(damerauLevenshtein('cats', 'cat')).toBe(1);
      });

      it('counts single deletion at start', () => {
        expect(damerauLevenshtein('cat', 'at')).toBe(1);
      });

      it('counts single deletion in middle', () => {
        expect(damerauLevenshtein('cart', 'cat')).toBe(1);
      });

      it('counts multiple deletions', () => {
        expect(damerauLevenshtein('catch', 'cat')).toBe(2);
      });

      it('handles deletion to empty string', () => {
        expect(damerauLevenshtein('abc', '')).toBe(3);
      });
    });

    describe('substitutions', () => {
      it('counts single substitution at end', () => {
        expect(damerauLevenshtein('cat', 'car')).toBe(1);
      });

      it('counts single substitution at start', () => {
        expect(damerauLevenshtein('cat', 'bat')).toBe(1);
      });

      it('counts single substitution in middle', () => {
        expect(damerauLevenshtein('cat', 'cot')).toBe(1);
      });

      it('counts multiple substitutions', () => {
        expect(damerauLevenshtein('cat', 'dog')).toBe(3);
      });
    });

    describe('transpositions', () => {
      it('counts single transposition at start', () => {
        expect(damerauLevenshtein('ab', 'ba')).toBe(1);
      });

      it('counts single transposition at end', () => {
        expect(damerauLevenshtein('abc', 'acb')).toBe(1);
      });

      it('counts single transposition in middle', () => {
        expect(damerauLevenshtein('abcd', 'abdc')).toBe(1);
      });

      it('counts transposition of common typing mistake', () => {
        expect(damerauLevenshtein('teh', 'the')).toBe(1);
      });

      it('handles transposition in longer word', () => {
        expect(damerauLevenshtein('recieve', 'receive')).toBe(1);
      });
    });

    describe('mixed operations', () => {
      it('handles substitution + insertion', () => {
        expect(damerauLevenshtein('cat', 'dogs')).toBe(4);
      });

      it('handles transposition + insertion', () => {
        expect(damerauLevenshtein('ab', 'bac')).toBe(2);
      });

      it('handles deletion + substitution', () => {
        expect(damerauLevenshtein('cats', 'dog')).toBe(4);
      });

      it('handles complex transformations', () => {
        // 'kitten' -> 'sitting': k->s, e->i, insert g = 3
        expect(damerauLevenshtein('kitten', 'sitting')).toBe(3);
      });
    });

    describe('real-world typo scenarios', () => {
      it('handles common double letter typo', () => {
        expect(damerauLevenshtein('hello', 'helo')).toBe(1);
      });

      it('handles missing letter', () => {
        expect(damerauLevenshtein('friend', 'frend')).toBe(1);
      });

      it('handles extra letter', () => {
        expect(damerauLevenshtein('friend', 'frieend')).toBe(1);
      });

      it('handles wrong letter', () => {
        expect(damerauLevenshtein('water', 'weter')).toBe(1);
      });

      it('handles swapped letters', () => {
        expect(damerauLevenshtein('form', 'from')).toBe(1);
      });

      it('handles common spelling mistake ie/ei', () => {
        expect(damerauLevenshtein('believe', 'beleive')).toBe(1);
      });

      it('handles phonetic spelling mistakes', () => {
        // 'necessary' misspelled as 'neccessary'
        expect(damerauLevenshtein('necessary', 'neccessary')).toBe(1);
      });
    });

    describe('WaniKani meaning scenarios', () => {
      it('handles single char typo in short word', () => {
        // "dog" -> "dig" = 1 substitution
        expect(damerauLevenshtein('dog', 'dig')).toBe(1);
      });

      it('handles typo in medium word', () => {
        // "water" -> "watar" = 1 substitution
        expect(damerauLevenshtein('water', 'watar')).toBe(1);
      });

      it('handles typo in long word', () => {
        // "mountain" -> "mountian" = 1 transposition
        expect(damerauLevenshtein('mountain', 'mountian')).toBe(1);
      });

      it('handles two typos in long word', () => {
        // "electricity" -> "electrisity" = 1 substitution (c->s)
        expect(damerauLevenshtein('electricity', 'electrisity')).toBe(1);
        // "electricity" -> "elecricity" = 1 deletion (t removed)
        expect(damerauLevenshtein('electricity', 'elecricity')).toBe(1);
      });
    });

    describe('case sensitivity', () => {
      it('treats different cases as different characters', () => {
        expect(damerauLevenshtein('Cat', 'cat')).toBe(1);
      });

      it('treats all uppercase vs lowercase as different', () => {
        expect(damerauLevenshtein('CAT', 'cat')).toBe(3);
      });
    });

    describe('special characters', () => {
      it('handles strings with spaces', () => {
        expect(damerauLevenshtein('big dog', 'big cat')).toBe(3);
      });

      it('handles strings with hyphens', () => {
        expect(damerauLevenshtein('self-aware', 'self-awrae')).toBe(1);
      });

      it('handles strings with apostrophes', () => {
        expect(damerauLevenshtein("let's", "lets")).toBe(1);
      });
    });

    describe('maxDistance option (early termination)', () => {
      it('returns exact distance when within maxDistance', () => {
        expect(damerauLevenshtein('cat', 'car', { maxDistance: 1 })).toBe(1);
      });

      it('returns exact distance when equal to maxDistance', () => {
        expect(damerauLevenshtein('cat', 'dog', { maxDistance: 3 })).toBe(3);
      });

      it('returns maxDistance + 1 when exceeded', () => {
        expect(damerauLevenshtein('cat', 'elephant', { maxDistance: 2 })).toBe(3);
      });

      it('terminates early for obviously different strings', () => {
        // "a" vs "bcdefghij" - length difference alone is 8
        expect(damerauLevenshtein('a', 'bcdefghij', { maxDistance: 2 })).toBe(3);
      });

      it('handles length difference exceeding maxDistance', () => {
        expect(damerauLevenshtein('cat', 'catalog', { maxDistance: 2 })).toBe(3);
      });

      it('returns 0 for identical strings with maxDistance', () => {
        expect(damerauLevenshtein('cat', 'cat', { maxDistance: 1 })).toBe(0);
      });

      it('handles maxDistance of 0', () => {
        expect(damerauLevenshtein('cat', 'cat', { maxDistance: 0 })).toBe(0);
        expect(damerauLevenshtein('cat', 'car', { maxDistance: 0 })).toBe(1);
      });
    });

    describe('performance edge cases', () => {
      it('handles single character strings', () => {
        expect(damerauLevenshtein('a', 'a')).toBe(0);
        expect(damerauLevenshtein('a', 'b')).toBe(1);
        expect(damerauLevenshtein('a', '')).toBe(1);
        expect(damerauLevenshtein('', 'a')).toBe(1);
      });

      it('handles strings with repeated characters', () => {
        expect(damerauLevenshtein('aaa', 'aaaa')).toBe(1);
        expect(damerauLevenshtein('aaaa', 'aaa')).toBe(1);
      });
    });
  });

  // ============================================
  // isWithinDistance Tests
  // ============================================
  describe('isWithinDistance', () => {
    it('returns true for identical strings', () => {
      expect(isWithinDistance('cat', 'cat', 0)).toBe(true);
      expect(isWithinDistance('cat', 'cat', 1)).toBe(true);
    });

    it('returns true when distance equals maxDistance', () => {
      expect(isWithinDistance('cat', 'car', 1)).toBe(true);
    });

    it('returns true when distance is less than maxDistance', () => {
      expect(isWithinDistance('cat', 'car', 2)).toBe(true);
    });

    it('returns false when distance exceeds maxDistance', () => {
      expect(isWithinDistance('cat', 'dog', 2)).toBe(false);
    });

    it('returns false when distance equals maxDistance + 1', () => {
      expect(isWithinDistance('cat', 'dog', 2)).toBe(false);
    });

    it('handles maxDistance of 0', () => {
      expect(isWithinDistance('cat', 'cat', 0)).toBe(true);
      expect(isWithinDistance('cat', 'car', 0)).toBe(false);
    });

    describe('tolerance scenarios for typo forgiveness', () => {
      describe('short words (1-3 chars) - exact match only', () => {
        it('requires exact match for 3-char words', () => {
          expect(isWithinDistance('dog', 'dig', 0)).toBe(false);
          expect(isWithinDistance('dog', 'dog', 0)).toBe(true);
        });
      });

      describe('medium words (4-6 chars) - 1 edit allowed', () => {
        it('accepts 1 typo in 4-char word', () => {
          expect(isWithinDistance('fire', 'frie', 1)).toBe(true);
          expect(isWithinDistance('fire', 'fir', 1)).toBe(true);
        });

        it('rejects 2 typos in 4-char word', () => {
          expect(isWithinDistance('fire', 'feer', 1)).toBe(false);
        });

        it('accepts 1 typo in 6-char word', () => {
          expect(isWithinDistance('person', 'preson', 1)).toBe(true);
        });
      });

      describe('long words (7+ chars) - 2 edits allowed', () => {
        it('accepts 2 typos in 7-char word', () => {
          expect(isWithinDistance('country', 'cuntory', 2)).toBe(true);
        });

        it('accepts 2 typos in long word', () => {
          expect(isWithinDistance('beautiful', 'beutaful', 2)).toBe(true);
        });

        it('rejects 3 typos in long word', () => {
          expect(isWithinDistance('beautiful', 'beutafil', 2)).toBe(false);
        });
      });
    });
  });
});
