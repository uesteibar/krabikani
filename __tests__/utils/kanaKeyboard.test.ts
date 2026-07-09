import { normalizePreferKanaKeyboard } from '../../src/utils/kanaKeyboard';

describe('normalizePreferKanaKeyboard', () => {
  it('defaults missing and invalid values to enabled', () => {
    expect(normalizePreferKanaKeyboard(null)).toBe(true);
    expect(normalizePreferKanaKeyboard('false')).toBe(true);
  });

  it('honors an explicit false value', () => {
    expect(normalizePreferKanaKeyboard(false)).toBe(false);
  });
});
