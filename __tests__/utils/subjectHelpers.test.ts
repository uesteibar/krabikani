import { hasReadingQuestion } from '../../src/utils/subjectHelpers';

describe('hasReadingQuestion', () => {
  it('returns false for radical', () => {
    expect(hasReadingQuestion('radical')).toBe(false);
  });

  it('returns false for kana_vocabulary', () => {
    expect(hasReadingQuestion('kana_vocabulary')).toBe(false);
  });

  it('returns true for kanji', () => {
    expect(hasReadingQuestion('kanji')).toBe(true);
  });

  it('returns true for vocabulary', () => {
    expect(hasReadingQuestion('vocabulary')).toBe(true);
  });
});
