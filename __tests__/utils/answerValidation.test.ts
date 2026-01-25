import {
  validateMeaningAnswer,
  validateReadingAnswer,
  MeaningValidationResult,
  ReadingValidationResult,
} from '../../src/utils/answerValidation';
import type { Meaning, AuxiliaryMeaning, Reading, KanjiReading } from '../../src/api/types';

describe('answerValidation', () => {
  // ============================================
  // Meaning Validation Tests
  // ============================================
  describe('validateMeaningAnswer', () => {
    describe('basic matching', () => {
      const meanings: Meaning[] = [
        { meaning: 'dog', primary: true, accepted_answer: true },
      ];

      it('accepts exact match', () => {
        const result = validateMeaningAnswer('dog', meanings);
        expect(result.isCorrect).toBe(true);
        expect(result.matchedMeaning).toBe('dog');
      });

      it('rejects incorrect answer', () => {
        const result = validateMeaningAnswer('cat', meanings);
        expect(result.isCorrect).toBe(false);
        expect(result.matchedMeaning).toBeUndefined();
      });
    });

    describe('case insensitivity', () => {
      const meanings: Meaning[] = [
        { meaning: 'Dog', primary: true, accepted_answer: true },
      ];

      it('accepts lowercase when meaning is capitalized', () => {
        const result = validateMeaningAnswer('dog', meanings);
        expect(result.isCorrect).toBe(true);
      });

      it('accepts uppercase when meaning is lowercase', () => {
        const meanings2: Meaning[] = [
          { meaning: 'cat', primary: true, accepted_answer: true },
        ];
        const result = validateMeaningAnswer('CAT', meanings2);
        expect(result.isCorrect).toBe(true);
      });

      it('accepts mixed case', () => {
        const result = validateMeaningAnswer('DoG', meanings);
        expect(result.isCorrect).toBe(true);
      });
    });

    describe('whitespace trimming', () => {
      const meanings: Meaning[] = [
        { meaning: 'dog', primary: true, accepted_answer: true },
      ];

      it('trims leading whitespace', () => {
        const result = validateMeaningAnswer('  dog', meanings);
        expect(result.isCorrect).toBe(true);
      });

      it('trims trailing whitespace', () => {
        const result = validateMeaningAnswer('dog  ', meanings);
        expect(result.isCorrect).toBe(true);
      });

      it('trims both leading and trailing whitespace', () => {
        const result = validateMeaningAnswer('  dog  ', meanings);
        expect(result.isCorrect).toBe(true);
      });

      it('handles multiple spaces between words by normalizing', () => {
        const meanings2: Meaning[] = [
          { meaning: 'big dog', primary: true, accepted_answer: true },
        ];
        const result = validateMeaningAnswer('big   dog', meanings2);
        expect(result.isCorrect).toBe(true);
      });
    });

    describe('multiple meanings', () => {
      const meanings: Meaning[] = [
        { meaning: 'dog', primary: true, accepted_answer: true },
        { meaning: 'hound', primary: false, accepted_answer: true },
        { meaning: 'canine', primary: false, accepted_answer: true },
      ];

      it('accepts primary meaning', () => {
        const result = validateMeaningAnswer('dog', meanings);
        expect(result.isCorrect).toBe(true);
        expect(result.matchedMeaning).toBe('dog');
      });

      it('accepts alternative meanings', () => {
        const result = validateMeaningAnswer('hound', meanings);
        expect(result.isCorrect).toBe(true);
        expect(result.matchedMeaning).toBe('hound');
      });

      it('accepts all valid alternative meanings', () => {
        const result = validateMeaningAnswer('canine', meanings);
        expect(result.isCorrect).toBe(true);
        expect(result.matchedMeaning).toBe('canine');
      });
    });

    describe('accepted_answer flag', () => {
      const meanings: Meaning[] = [
        { meaning: 'dog', primary: true, accepted_answer: true },
        { meaning: 'mutt', primary: false, accepted_answer: false },
      ];

      it('accepts meanings with accepted_answer: true', () => {
        const result = validateMeaningAnswer('dog', meanings);
        expect(result.isCorrect).toBe(true);
      });

      it('rejects meanings with accepted_answer: false', () => {
        const result = validateMeaningAnswer('mutt', meanings);
        expect(result.isCorrect).toBe(false);
      });
    });

    describe('auxiliary meanings', () => {
      const meanings: Meaning[] = [
        { meaning: 'dog', primary: true, accepted_answer: true },
      ];

      describe('whitelist auxiliary meanings', () => {
        const auxiliaryMeanings: AuxiliaryMeaning[] = [
          { meaning: 'puppy', type: 'whitelist' },
          { meaning: 'doggy', type: 'whitelist' },
        ];

        it('accepts whitelisted auxiliary meaning', () => {
          const result = validateMeaningAnswer('puppy', meanings, auxiliaryMeanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isAuxiliary).toBe(true);
          expect(result.matchedMeaning).toBe('puppy');
        });

        it('accepts all whitelisted auxiliary meanings', () => {
          const result = validateMeaningAnswer('doggy', meanings, auxiliaryMeanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isAuxiliary).toBe(true);
        });

        it('case insensitive for auxiliary meanings', () => {
          const result = validateMeaningAnswer('PUPPY', meanings, auxiliaryMeanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isAuxiliary).toBe(true);
        });

        it('trims whitespace for auxiliary meanings', () => {
          const result = validateMeaningAnswer('  puppy  ', meanings, auxiliaryMeanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isAuxiliary).toBe(true);
        });
      });

      describe('blacklist auxiliary meanings', () => {
        const auxiliaryMeanings: AuxiliaryMeaning[] = [
          { meaning: 'wolf', type: 'blacklist' },
        ];

        it('rejects blacklisted auxiliary meaning', () => {
          const result = validateMeaningAnswer('wolf', meanings, auxiliaryMeanings);
          expect(result.isCorrect).toBe(false);
          expect(result.isBlacklisted).toBe(true);
        });

        it('case insensitive for blacklist', () => {
          const result = validateMeaningAnswer('WOLF', meanings, auxiliaryMeanings);
          expect(result.isCorrect).toBe(false);
          expect(result.isBlacklisted).toBe(true);
        });
      });

      describe('mixed whitelist and blacklist', () => {
        const auxiliaryMeanings: AuxiliaryMeaning[] = [
          { meaning: 'puppy', type: 'whitelist' },
          { meaning: 'wolf', type: 'blacklist' },
        ];

        it('accepts whitelist', () => {
          const result = validateMeaningAnswer('puppy', meanings, auxiliaryMeanings);
          expect(result.isCorrect).toBe(true);
        });

        it('rejects blacklist', () => {
          const result = validateMeaningAnswer('wolf', meanings, auxiliaryMeanings);
          expect(result.isCorrect).toBe(false);
          expect(result.isBlacklisted).toBe(true);
        });

        it('accepts primary meaning over auxiliary check', () => {
          const result = validateMeaningAnswer('dog', meanings, auxiliaryMeanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isAuxiliary).toBeFalsy();
        });
      });
    });

    describe('edge cases', () => {
      it('handles empty answer', () => {
        const meanings: Meaning[] = [
          { meaning: 'dog', primary: true, accepted_answer: true },
        ];
        const result = validateMeaningAnswer('', meanings);
        expect(result.isCorrect).toBe(false);
      });

      it('handles whitespace-only answer', () => {
        const meanings: Meaning[] = [
          { meaning: 'dog', primary: true, accepted_answer: true },
        ];
        const result = validateMeaningAnswer('   ', meanings);
        expect(result.isCorrect).toBe(false);
      });

      it('handles empty meanings array', () => {
        const result = validateMeaningAnswer('dog', []);
        expect(result.isCorrect).toBe(false);
      });

      it('handles meaning with special characters', () => {
        const meanings: Meaning[] = [
          { meaning: "let's go", primary: true, accepted_answer: true },
        ];
        const result = validateMeaningAnswer("let's go", meanings);
        expect(result.isCorrect).toBe(true);
      });

      it('handles hyphenated meanings', () => {
        const meanings: Meaning[] = [
          { meaning: 'self-aware', primary: true, accepted_answer: true },
        ];
        const result = validateMeaningAnswer('self-aware', meanings);
        expect(result.isCorrect).toBe(true);
      });
    });

    describe('return value structure', () => {
      it('returns correct structure for correct answer', () => {
        const meanings: Meaning[] = [
          { meaning: 'dog', primary: true, accepted_answer: true },
        ];
        const result = validateMeaningAnswer('dog', meanings);
        expect(result).toEqual<MeaningValidationResult>({
          isCorrect: true,
          matchedMeaning: 'dog',
        });
      });

      it('returns correct structure for incorrect answer', () => {
        const meanings: Meaning[] = [
          { meaning: 'dog', primary: true, accepted_answer: true },
        ];
        const result = validateMeaningAnswer('cat', meanings);
        expect(result).toEqual<MeaningValidationResult>({
          isCorrect: false,
        });
      });

      it('returns correct structure for auxiliary match', () => {
        const meanings: Meaning[] = [
          { meaning: 'dog', primary: true, accepted_answer: true },
        ];
        const auxiliaryMeanings: AuxiliaryMeaning[] = [
          { meaning: 'puppy', type: 'whitelist' },
        ];
        const result = validateMeaningAnswer('puppy', meanings, auxiliaryMeanings);
        expect(result).toEqual<MeaningValidationResult>({
          isCorrect: true,
          isAuxiliary: true,
          matchedMeaning: 'puppy',
        });
      });

      it('returns correct structure for blacklisted answer', () => {
        const meanings: Meaning[] = [
          { meaning: 'dog', primary: true, accepted_answer: true },
        ];
        const auxiliaryMeanings: AuxiliaryMeaning[] = [
          { meaning: 'wolf', type: 'blacklist' },
        ];
        const result = validateMeaningAnswer('wolf', meanings, auxiliaryMeanings);
        expect(result).toEqual<MeaningValidationResult>({
          isCorrect: false,
          isBlacklisted: true,
        });
      });
    });
  });

  // ============================================
  // Reading Validation Tests
  // ============================================
  describe('validateReadingAnswer', () => {
    describe('basic hiragana matching', () => {
      const readings: Reading[] = [
        { reading: 'いぬ', primary: true, accepted_answer: true },
      ];

      it('accepts exact hiragana match', () => {
        const result = validateReadingAnswer('いぬ', readings);
        expect(result.isCorrect).toBe(true);
        expect(result.matchedReading).toBe('いぬ');
      });

      it('rejects incorrect hiragana', () => {
        const result = validateReadingAnswer('ねこ', readings);
        expect(result.isCorrect).toBe(false);
        expect(result.matchedReading).toBeUndefined();
      });
    });

    describe('exact match requirement', () => {
      const readings: Reading[] = [
        { reading: 'いぬ', primary: true, accepted_answer: true },
      ];

      it('requires exact match (no partial match)', () => {
        const result = validateReadingAnswer('い', readings);
        expect(result.isCorrect).toBe(false);
      });

      it('rejects answer longer than reading', () => {
        const result = validateReadingAnswer('いぬこ', readings);
        expect(result.isCorrect).toBe(false);
      });
    });

    describe('whitespace handling', () => {
      const readings: Reading[] = [
        { reading: 'いぬ', primary: true, accepted_answer: true },
      ];

      it('trims leading whitespace', () => {
        const result = validateReadingAnswer('  いぬ', readings);
        expect(result.isCorrect).toBe(true);
      });

      it('trims trailing whitespace', () => {
        const result = validateReadingAnswer('いぬ  ', readings);
        expect(result.isCorrect).toBe(true);
      });

      it('trims both leading and trailing whitespace', () => {
        const result = validateReadingAnswer('  いぬ  ', readings);
        expect(result.isCorrect).toBe(true);
      });
    });

    describe('multiple readings', () => {
      const readings: Reading[] = [
        { reading: 'おんな', primary: true, accepted_answer: true },
        { reading: 'じょ', primary: false, accepted_answer: true },
      ];

      it('accepts primary reading', () => {
        const result = validateReadingAnswer('おんな', readings);
        expect(result.isCorrect).toBe(true);
        expect(result.matchedReading).toBe('おんな');
      });

      it('accepts alternative readings', () => {
        const result = validateReadingAnswer('じょ', readings);
        expect(result.isCorrect).toBe(true);
        expect(result.matchedReading).toBe('じょ');
      });
    });

    describe('kanji readings (onyomi/kunyomi/nanori)', () => {
      const kanjiReadings: KanjiReading[] = [
        { reading: 'にち', primary: true, accepted_answer: true, type: 'onyomi' },
        { reading: 'ひ', primary: false, accepted_answer: true, type: 'kunyomi' },
        { reading: 'か', primary: false, accepted_answer: false, type: 'nanori' },
      ];

      it('accepts primary onyomi reading', () => {
        const result = validateReadingAnswer('にち', kanjiReadings);
        expect(result.isCorrect).toBe(true);
      });

      it('accepts kunyomi reading when accepted', () => {
        const result = validateReadingAnswer('ひ', kanjiReadings);
        expect(result.isCorrect).toBe(true);
      });

      it('rejects reading with accepted_answer: false', () => {
        const result = validateReadingAnswer('か', kanjiReadings);
        expect(result.isCorrect).toBe(false);
      });
    });

    describe('accepted_answer flag', () => {
      const readings: Reading[] = [
        { reading: 'いぬ', primary: true, accepted_answer: true },
        { reading: 'けん', primary: false, accepted_answer: false },
      ];

      it('accepts readings with accepted_answer: true', () => {
        const result = validateReadingAnswer('いぬ', readings);
        expect(result.isCorrect).toBe(true);
      });

      it('rejects readings with accepted_answer: false', () => {
        const result = validateReadingAnswer('けん', readings);
        expect(result.isCorrect).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('handles empty answer', () => {
        const readings: Reading[] = [
          { reading: 'いぬ', primary: true, accepted_answer: true },
        ];
        const result = validateReadingAnswer('', readings);
        expect(result.isCorrect).toBe(false);
      });

      it('handles whitespace-only answer', () => {
        const readings: Reading[] = [
          { reading: 'いぬ', primary: true, accepted_answer: true },
        ];
        const result = validateReadingAnswer('   ', readings);
        expect(result.isCorrect).toBe(false);
      });

      it('handles empty readings array', () => {
        const result = validateReadingAnswer('いぬ', []);
        expect(result.isCorrect).toBe(false);
      });

      it('handles long vowel marks', () => {
        const readings: Reading[] = [
          { reading: 'おう', primary: true, accepted_answer: true },
        ];
        const result = validateReadingAnswer('おう', readings);
        expect(result.isCorrect).toBe(true);
      });

      it('handles small kana', () => {
        const readings: Reading[] = [
          { reading: 'しょ', primary: true, accepted_answer: true },
        ];
        const result = validateReadingAnswer('しょ', readings);
        expect(result.isCorrect).toBe(true);
      });

      it('handles double consonants (っ)', () => {
        const readings: Reading[] = [
          { reading: 'がっこう', primary: true, accepted_answer: true },
        ];
        const result = validateReadingAnswer('がっこう', readings);
        expect(result.isCorrect).toBe(true);
      });

      it('handles ん at the end', () => {
        const readings: Reading[] = [
          { reading: 'にほん', primary: true, accepted_answer: true },
        ];
        const result = validateReadingAnswer('にほん', readings);
        expect(result.isCorrect).toBe(true);
      });
    });

    describe('return value structure', () => {
      it('returns correct structure for correct answer', () => {
        const readings: Reading[] = [
          { reading: 'いぬ', primary: true, accepted_answer: true },
        ];
        const result = validateReadingAnswer('いぬ', readings);
        expect(result).toEqual<ReadingValidationResult>({
          isCorrect: true,
          matchedReading: 'いぬ',
        });
      });

      it('returns correct structure for incorrect answer', () => {
        const readings: Reading[] = [
          { reading: 'いぬ', primary: true, accepted_answer: true },
        ];
        const result = validateReadingAnswer('ねこ', readings);
        expect(result).toEqual<ReadingValidationResult>({
          isCorrect: false,
        });
      });
    });
  });
});
