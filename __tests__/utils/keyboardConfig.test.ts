import { getAnswerKeyboardType } from '../../src/utils/keyboardConfig';

describe('getAnswerKeyboardType', () => {
  it('uses the default keyboard for readings when Japanese hinting is enabled', () => {
    expect(getAnswerKeyboardType('reading', true)).toBe('default');
  });

  it('keeps ASCII keyboard behavior when Japanese hinting is disabled', () => {
    expect(getAnswerKeyboardType('reading', false)).toBe('ascii-capable');
  });

  it('uses the default keyboard for non-reading questions', () => {
    expect(getAnswerKeyboardType('meaning', false)).toBe('default');
  });
});
