import {
  validateInput,
  validateAnswer,
} from '../../../src/components/quiz/answerValidation';
import type { Question } from '../../../src/components/quiz/types';
import type { Meaning, AuxiliaryMeaning, Reading } from '../../../src/api/types';

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'test-1',
    subjectId: 1,
    subjectType: 'vocabulary',
    displayText: '犬',
    displayMode: 'characters',
    correctAnswers: ['dog'],
    questionType: 'meaning',
    mnemonic: 'A dog barks',
    mnemonicLabel: 'Meaning Mnemonic:',
    meanings: [{ meaning: 'dog', primary: true, accepted_answer: true }],
    readings: [{ reading: 'いぬ', primary: true, accepted_answer: true }],
    auxiliaryMeanings: [],
    userSynonyms: [],
    ...overrides,
  };
}

describe('quiz answerValidation', () => {
  describe('validateInput', () => {
    describe('meaning questions', () => {
      const question = makeQuestion({ questionType: 'meaning' });

      it('accepts non-empty input', () => {
        expect(validateInput(question, 'dog')).toEqual({ valid: true });
      });

      it('allows empty input (processed as incorrect)', () => {
        expect(validateInput(question, '  ')).toEqual({ valid: true });
      });
    });

    describe('reading questions', () => {
      const question = makeQuestion({ questionType: 'reading' });

      it('accepts valid romaji input', () => {
        expect(validateInput(question, 'inu')).toEqual({ valid: true });
      });

      it('rejects empty input', () => {
        expect(validateInput(question, '')).toEqual({
          valid: false,
          reason: 'shake',
        });
      });

      it('rejects non-convertible input', () => {
        expect(validateInput(question, 'xyz')).toEqual({
          valid: false,
          reason: 'shake',
        });
      });
    });

    describe('reverse questions', () => {
      const question = makeQuestion({
        questionType: 'reverse',
        displayMode: 'meaning',
        displayText: '犬',
      });

      it('accepts Japanese input', () => {
        expect(validateInput(question, '犬')).toEqual({ valid: true });
      });

      it('rejects input containing romaji', () => {
        expect(validateInput(question, 'dog')).toEqual({
          valid: false,
          reason: 'shake',
        });
      });

      it('rejects empty input', () => {
        expect(validateInput(question, '')).toEqual({
          valid: false,
          reason: 'shake',
        });
      });

      it('rejects mixed input with romaji', () => {
        expect(validateInput(question, '犬a')).toEqual({
          valid: false,
          reason: 'shake',
        });
      });
    });
  });

  describe('validateAnswer', () => {
    describe('meaning validation', () => {
      const question = makeQuestion({ questionType: 'meaning' });

      it('returns correct for exact match', () => {
        const result = validateAnswer(question, 'dog');
        expect(result.status).toBe('correct');
        expect(result.userAnswer).toBe('dog');
        expect(result.correctAnswer).toBe('dog');
      });

      it('returns incorrect for wrong answer', () => {
        const result = validateAnswer(question, 'cat');
        expect(result.status).toBe('incorrect');
        expect(result.userAnswer).toBe('cat');
      });

      it('returns fuzzyMatch for typo within threshold', () => {
        const meanings: Meaning[] = [
          { meaning: 'mountain', primary: true, accepted_answer: true },
        ];
        const q = makeQuestion({
          questionType: 'meaning',
          meanings,
          correctAnswers: ['mountain'],
        });
        const result = validateAnswer(q, 'mountian');
        expect(result.status).toBe('fuzzyMatch');
      });

      it('does not fuzzy match short words', () => {
        const result = validateAnswer(question, 'dgo');
        expect(result.status).toBe('incorrect');
      });
    });

    describe('meaning validation with synonyms', () => {
      it('accepts user synonyms', () => {
        const q = makeQuestion({
          questionType: 'meaning',
          userSynonyms: ['puppy'],
        });
        const result = validateAnswer(q, 'puppy');
        expect(result.status).toBe('correct');
      });
    });

    describe('meaning validation with auxiliary meanings', () => {
      it('accepts whitelist auxiliary meanings', () => {
        const q = makeQuestion({
          questionType: 'meaning',
          auxiliaryMeanings: [{ meaning: 'hound', type: 'whitelist' }],
        });
        const result = validateAnswer(q, 'hound');
        expect(result.status).toBe('correct');
      });

      it('rejects blacklist auxiliary meanings', () => {
        const q = makeQuestion({
          questionType: 'meaning',
          auxiliaryMeanings: [{ meaning: 'cat', type: 'blacklist' }],
        });
        const result = validateAnswer(q, 'cat');
        expect(result.status).toBe('incorrect');
      });
    });

    describe('reading validation', () => {
      const question = makeQuestion({ questionType: 'reading' });

      it('returns correct for matching reading via romaji', () => {
        const result = validateAnswer(question, 'inu');
        expect(result.status).toBe('correct');
        expect(result.userAnswer).toBe('いぬ');
        expect(result.correctAnswer).toBe('いぬ');
      });

      it('returns incorrect for wrong reading', () => {
        const result = validateAnswer(question, 'neko');
        expect(result.status).toBe('incorrect');
        expect(result.userAnswer).toBe('ねこ');
      });

      it('never returns fuzzyMatch for readings', () => {
        const readings: Reading[] = [
          { reading: 'やま', primary: true, accepted_answer: true },
        ];
        const q = makeQuestion({
          questionType: 'reading',
          readings,
        });
        const result = validateAnswer(q, 'yama');
        expect(result.status).toBe('correct');

        const wrong = validateAnswer(q, 'yamo');
        expect(wrong.status).toBe('incorrect');
      });
    });

    describe('reverse validation', () => {
      const question = makeQuestion({
        questionType: 'reverse',
        displayText: '犬',
        displayMode: 'meaning',
      });

      it('returns correct for exact character match', () => {
        const result = validateAnswer(question, '犬');
        expect(result.status).toBe('correct');
        expect(result.userAnswer).toBe('犬');
        expect(result.correctAnswer).toBe('犬');
      });

      it('returns incorrect for wrong characters', () => {
        const result = validateAnswer(question, '猫');
        expect(result.status).toBe('incorrect');
        expect(result.userAnswer).toBe('猫');
      });

      it('does not apply fuzzy matching', () => {
        const q = makeQuestion({
          questionType: 'reverse',
          displayText: '食べる',
          displayMode: 'meaning',
        });
        const result = validateAnswer(q, '食べた');
        expect(result.status).toBe('incorrect');
      });

      it('uses displayText as correctAnswer', () => {
        const result = validateAnswer(question, '猫');
        expect(result.correctAnswer).toBe('犬');
      });
    });
  });
});
