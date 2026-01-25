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

    describe('typo forgiveness', () => {
      describe('short words (1-3 characters) - exact match only', () => {
        it('requires exact match for 1-char word', () => {
          const meanings: Meaning[] = [
            { meaning: 'to', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('ti', meanings);
          expect(result.isCorrect).toBe(false);
        });

        it('requires exact match for 2-char word', () => {
          const meanings: Meaning[] = [
            { meaning: 'go', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('gi', meanings);
          expect(result.isCorrect).toBe(false);
        });

        it('requires exact match for 3-char word', () => {
          const meanings: Meaning[] = [
            { meaning: 'dog', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('dgo', meanings);
          expect(result.isCorrect).toBe(false);
        });

        it('accepts exact match for short word', () => {
          const meanings: Meaning[] = [
            { meaning: 'cat', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('cat', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBeUndefined();
        });
      });

      describe('medium words (4-6 characters) - 1 edit allowed', () => {
        it('accepts 1 substitution typo for 4-char word', () => {
          const meanings: Meaning[] = [
            { meaning: 'fire', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('fure', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
          expect(result.matchedMeaning).toBe('fire');
        });

        it('accepts 1 insertion typo for 5-char word', () => {
          const meanings: Meaning[] = [
            { meaning: 'water', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('watter', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
        });

        it('accepts 1 deletion typo for 6-char word', () => {
          const meanings: Meaning[] = [
            { meaning: 'person', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('peson', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
        });

        it('accepts 1 transposition typo for 4-char word', () => {
          const meanings: Meaning[] = [
            { meaning: 'blue', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('bleu', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
        });

        it('rejects 2 typos for 4-char word', () => {
          const meanings: Meaning[] = [
            { meaning: 'fire', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('fure$', meanings);
          expect(result.isCorrect).toBe(false);
        });

        it('rejects 2 typos for 6-char word', () => {
          const meanings: Meaning[] = [
            { meaning: 'person', primary: true, accepted_answer: true },
          ];
          // 'perxyz' has 3 substitutions from 'person' (s->x, o->y, n->z)
          const result = validateMeaningAnswer('perxyz', meanings);
          expect(result.isCorrect).toBe(false);
        });

        it('exact match does not set isFuzzyMatch', () => {
          const meanings: Meaning[] = [
            { meaning: 'fire', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('fire', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBeUndefined();
        });
      });

      describe('long words (7+ characters) - 2 edits allowed', () => {
        it('accepts 1 typo for 7-char word', () => {
          const meanings: Meaning[] = [
            { meaning: 'teacher', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('teachre', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
        });

        it('accepts 2 typos for 7-char word', () => {
          const meanings: Meaning[] = [
            { meaning: 'teacher', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('techaer', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
        });

        it('accepts 2 typos for 10-char word', () => {
          const meanings: Meaning[] = [
            { meaning: 'university', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('univeristy', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
        });

        it('rejects 3 typos for 7-char word', () => {
          const meanings: Meaning[] = [
            { meaning: 'teacher', primary: true, accepted_answer: true },
          ];
          // 'txyzher' has 3 substitutions from 'teacher' (e->x, a->y, c->z)
          const result = validateMeaningAnswer('txyzher', meanings);
          expect(result.isCorrect).toBe(false);
        });

        it('accepts 2 typos for very long word', () => {
          const meanings: Meaning[] = [
            { meaning: 'understanding', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('understadning', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
        });
      });

      describe('blacklist still rejects fuzzy matches', () => {
        it('rejects blacklisted meaning even if exact match', () => {
          const meanings: Meaning[] = [
            { meaning: 'person', primary: true, accepted_answer: true },
          ];
          const auxiliaryMeanings: AuxiliaryMeaning[] = [
            { meaning: 'people', type: 'blacklist' },
          ];
          const result = validateMeaningAnswer('people', meanings, auxiliaryMeanings);
          expect(result.isCorrect).toBe(false);
          expect(result.isBlacklisted).toBe(true);
        });

        it('does not fuzzy match to blacklisted meaning', () => {
          const meanings: Meaning[] = [
            { meaning: 'person', primary: true, accepted_answer: true },
          ];
          const auxiliaryMeanings: AuxiliaryMeaning[] = [
            { meaning: 'people', type: 'blacklist' },
          ];
          // "peopel" is 1 edit from "people" (blacklist) but we should not block it
          // it's also far from "person" so should just be rejected
          const result = validateMeaningAnswer('peopel', meanings, auxiliaryMeanings);
          expect(result.isCorrect).toBe(false);
          expect(result.isBlacklisted).toBeUndefined();
        });
      });

      describe('auxiliary whitelist with fuzzy matching', () => {
        it('accepts fuzzy match on whitelisted auxiliary meaning', () => {
          const meanings: Meaning[] = [
            { meaning: 'dog', primary: true, accepted_answer: true },
          ];
          const auxiliaryMeanings: AuxiliaryMeaning[] = [
            { meaning: 'canine', type: 'whitelist' },
          ];
          const result = validateMeaningAnswer('cannie', meanings, auxiliaryMeanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isAuxiliary).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
        });

        it('primary meaning fuzzy match takes priority over auxiliary fuzzy match', () => {
          const meanings: Meaning[] = [
            { meaning: 'study', primary: true, accepted_answer: true },
          ];
          const auxiliaryMeanings: AuxiliaryMeaning[] = [
            { meaning: 'learn', type: 'whitelist' },
          ];
          const result = validateMeaningAnswer('stuyd', meanings, auxiliaryMeanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isAuxiliary).toBeUndefined();
          expect(result.isFuzzyMatch).toBe(true);
          expect(result.matchedMeaning).toBe('study');
        });
      });

      describe('multiple meanings with fuzzy matching', () => {
        it('finds fuzzy match in alternative meaning', () => {
          const meanings: Meaning[] = [
            { meaning: 'dog', primary: true, accepted_answer: true },
            { meaning: 'hound', primary: false, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('houdn', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
          expect(result.matchedMeaning).toBe('hound');
        });

        it('prefers exact match over fuzzy match', () => {
          const meanings: Meaning[] = [
            { meaning: 'test', primary: true, accepted_answer: true },
            { meaning: 'testing', primary: false, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('test', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBeUndefined();
          expect(result.matchedMeaning).toBe('test');
        });
      });

      describe('common WaniKani typo scenarios', () => {
        it('accepts "recieve" for "receive"', () => {
          const meanings: Meaning[] = [
            { meaning: 'receive', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('recieve', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
        });

        it('accepts "occurance" for "occurrence"', () => {
          const meanings: Meaning[] = [
            { meaning: 'occurrence', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('occurance', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
        });

        it('accepts "seperete" for "separate"', () => {
          const meanings: Meaning[] = [
            { meaning: 'separate', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('seperete', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
        });

        it('accepts "accomodate" for "accommodate"', () => {
          const meanings: Meaning[] = [
            { meaning: 'accommodate', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('accomodate', meanings);
          expect(result.isCorrect).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
        });
      });

      describe('return value structure for fuzzy match', () => {
        it('returns correct structure for fuzzy match', () => {
          const meanings: Meaning[] = [
            { meaning: 'water', primary: true, accepted_answer: true },
          ];
          const result = validateMeaningAnswer('weter', meanings);
          expect(result).toEqual<MeaningValidationResult>({
            isCorrect: true,
            matchedMeaning: 'water',
            isFuzzyMatch: true,
          });
        });

        it('returns correct structure for fuzzy auxiliary match', () => {
          const meanings: Meaning[] = [
            { meaning: 'dog', primary: true, accepted_answer: true },
          ];
          const auxiliaryMeanings: AuxiliaryMeaning[] = [
            { meaning: 'canine', type: 'whitelist' },
          ];
          const result = validateMeaningAnswer('cannie', meanings, auxiliaryMeanings);
          expect(result).toEqual<MeaningValidationResult>({
            isCorrect: true,
            isAuxiliary: true,
            matchedMeaning: 'canine',
            isFuzzyMatch: true,
          });
        });
      });
    });

    describe('user synonyms', () => {
      const meanings: Meaning[] = [
        { meaning: 'dog', primary: true, accepted_answer: true },
      ];

      describe('exact matching', () => {
        it('accepts exact match on user synonym', () => {
          const userSynonyms = ['puppy', 'pooch'];
          const result = validateMeaningAnswer('puppy', meanings, [], userSynonyms);
          expect(result.isCorrect).toBe(true);
          expect(result.isUserSynonym).toBe(true);
          expect(result.matchedMeaning).toBe('puppy');
        });

        it('accepts all user synonyms', () => {
          const userSynonyms = ['puppy', 'pooch'];
          const result = validateMeaningAnswer('pooch', meanings, [], userSynonyms);
          expect(result.isCorrect).toBe(true);
          expect(result.isUserSynonym).toBe(true);
          expect(result.matchedMeaning).toBe('pooch');
        });

        it('is case insensitive for user synonyms', () => {
          const userSynonyms = ['puppy'];
          const result = validateMeaningAnswer('PUPPY', meanings, [], userSynonyms);
          expect(result.isCorrect).toBe(true);
          expect(result.isUserSynonym).toBe(true);
        });

        it('trims whitespace for user synonyms', () => {
          const userSynonyms = ['puppy'];
          const result = validateMeaningAnswer('  puppy  ', meanings, [], userSynonyms);
          expect(result.isCorrect).toBe(true);
          expect(result.isUserSynonym).toBe(true);
        });
      });

      describe('fuzzy matching', () => {
        it('accepts fuzzy match on user synonym', () => {
          const userSynonyms = ['canine'];
          const result = validateMeaningAnswer('cannie', meanings, [], userSynonyms);
          expect(result.isCorrect).toBe(true);
          expect(result.isUserSynonym).toBe(true);
          expect(result.isFuzzyMatch).toBe(true);
          expect(result.matchedMeaning).toBe('canine');
        });

        it('requires exact match for short user synonyms (3 chars)', () => {
          const userSynonyms = ['pup'];
          const result = validateMeaningAnswer('pub', meanings, [], userSynonyms);
          expect(result.isCorrect).toBe(false);
        });
      });

      describe('priority order', () => {
        it('primary meaning match takes priority over user synonym', () => {
          const userSynonyms = ['hound'];
          const result = validateMeaningAnswer('dog', meanings, [], userSynonyms);
          expect(result.isCorrect).toBe(true);
          expect(result.isUserSynonym).toBeUndefined();
          expect(result.matchedMeaning).toBe('dog');
        });

        it('auxiliary whitelist takes priority over user synonym', () => {
          const auxiliaryMeanings: AuxiliaryMeaning[] = [
            { meaning: 'hound', type: 'whitelist' },
          ];
          const userSynonyms = ['hound'];
          const result = validateMeaningAnswer('hound', meanings, auxiliaryMeanings, userSynonyms);
          expect(result.isCorrect).toBe(true);
          expect(result.isAuxiliary).toBe(true);
          expect(result.isUserSynonym).toBeUndefined();
        });

        it('blacklist takes priority over user synonym', () => {
          const auxiliaryMeanings: AuxiliaryMeaning[] = [
            { meaning: 'wolf', type: 'blacklist' },
          ];
          const userSynonyms = ['wolf'];
          const result = validateMeaningAnswer('wolf', meanings, auxiliaryMeanings, userSynonyms);
          expect(result.isCorrect).toBe(false);
          expect(result.isBlacklisted).toBe(true);
        });
      });

      describe('combined with other meanings', () => {
        it('works with both auxiliary and user synonyms', () => {
          const auxiliaryMeanings: AuxiliaryMeaning[] = [
            { meaning: 'hound', type: 'whitelist' },
          ];
          const userSynonyms = ['pooch'];

          const result1 = validateMeaningAnswer('hound', meanings, auxiliaryMeanings, userSynonyms);
          expect(result1.isCorrect).toBe(true);
          expect(result1.isAuxiliary).toBe(true);

          const result2 = validateMeaningAnswer('pooch', meanings, auxiliaryMeanings, userSynonyms);
          expect(result2.isCorrect).toBe(true);
          expect(result2.isUserSynonym).toBe(true);
        });

        it('handles empty user synonyms array', () => {
          const result = validateMeaningAnswer('dog', meanings, [], []);
          expect(result.isCorrect).toBe(true);
          expect(result.isUserSynonym).toBeUndefined();
        });
      });

      describe('return value structure', () => {
        it('returns correct structure for user synonym match', () => {
          const userSynonyms = ['puppy'];
          const result = validateMeaningAnswer('puppy', meanings, [], userSynonyms);
          expect(result).toEqual<MeaningValidationResult>({
            isCorrect: true,
            isUserSynonym: true,
            matchedMeaning: 'puppy',
          });
        });

        it('returns correct structure for fuzzy user synonym match', () => {
          const userSynonyms = ['canine'];
          const result = validateMeaningAnswer('cannie', meanings, [], userSynonyms);
          expect(result).toEqual<MeaningValidationResult>({
            isCorrect: true,
            isUserSynonym: true,
            matchedMeaning: 'canine',
            isFuzzyMatch: true,
          });
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
