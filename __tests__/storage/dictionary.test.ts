import {
  getIntuitionPracticeItems,
  getDictionaryDatabase,
  closeDictionaryDatabase,
  _resetDictionaryInstance,
} from '../../src/storage/dictionary';

jest.mock('@op-engineering/op-sqlite');

const { __resetMockDatabase, __insertRow } =
  jest.requireMock('@op-engineering/op-sqlite');

describe('dictionary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetMockDatabase();
    _resetDictionaryInstance();
  });

  describe('getDictionaryDatabase', () => {
    it('should open the dictionary database', () => {
      const { open } = jest.requireMock('@op-engineering/op-sqlite');
      getDictionaryDatabase();

      expect(open).toHaveBeenCalledWith({
        name: 'dictionary.db',
      });
    });

    it('should return the same instance on subsequent calls', () => {
      const { open } = jest.requireMock('@op-engineering/op-sqlite');
      const db1 = getDictionaryDatabase();
      const db2 = getDictionaryDatabase();

      expect(db1).toBe(db2);
      expect(open).toHaveBeenCalledTimes(1);
    });
  });

  describe('closeDictionaryDatabase', () => {
    it('should close the database connection', () => {
      const db = getDictionaryDatabase();
      closeDictionaryDatabase();

      expect(db.close).toHaveBeenCalled();
    });

    it('should be safe to call when no database is open', () => {
      expect(() => closeDictionaryDatabase()).not.toThrow();
    });
  });

  describe('getIntuitionPracticeItems', () => {
    beforeEach(() => {
      // Initialize the dictionary database by calling getDictionaryDatabase
      getDictionaryDatabase();

      // Insert test dictionary entries
      __insertRow('dictionary_vocab', {
        id: 1,
        characters: '大人', // 大 and 人 are kanji
        readings: JSON.stringify(['おとな']),
        meanings: JSON.stringify(['adult']),
      });
      __insertRow('dictionary_vocab', {
        id: 2,
        characters: '火山', // 火 and 山 are kanji
        readings: JSON.stringify(['かざん']),
        meanings: JSON.stringify(['volcano']),
      });
      __insertRow('dictionary_vocab', {
        id: 3,
        characters: '大学', // 大 and 学 are kanji
        readings: JSON.stringify(['だいがく']),
        meanings: JSON.stringify(['university']),
      });
      __insertRow('dictionary_vocab', {
        id: 4,
        characters: '未知', // 未 and 知 are kanji
        readings: JSON.stringify(['みち']),
        meanings: JSON.stringify(['unknown']),
      });
    });

    it('should return items where all kanji are in the learned set', async () => {
      const learnedKanji = new Set(['大', '人', '火', '山']);
      const exclude = new Set<string>();

      const items = await getIntuitionPracticeItems(learnedKanji, exclude, 10);

      const chars = items.map(i => i.characters);
      expect(chars).toContain('大人');
      expect(chars).toContain('火山');
      // 大学 should not be included because 学 is not learned
      expect(chars).not.toContain('大学');
      // 未知 should not be included because neither kanji is learned
      expect(chars).not.toContain('未知');
    });

    it('should exclude WaniKani vocabulary', async () => {
      const learnedKanji = new Set(['大', '人', '火', '山']);
      const exclude = new Set(['大人']); // exclude this one

      const items = await getIntuitionPracticeItems(learnedKanji, exclude, 10);

      const chars = items.map(i => i.characters);
      expect(chars).not.toContain('大人');
      expect(chars).toContain('火山');
    });

    it('should respect the limit parameter', async () => {
      const learnedKanji = new Set(['大', '人', '火', '山']);
      const exclude = new Set<string>();

      const items = await getIntuitionPracticeItems(learnedKanji, exclude, 1);

      expect(items.length).toBe(1);
    });

    it('should return empty array when no kanji are learned', async () => {
      const learnedKanji = new Set<string>();
      const exclude = new Set<string>();

      const items = await getIntuitionPracticeItems(learnedKanji, exclude, 10);

      expect(items.length).toBe(0);
    });

    it('should allow kana-only characters in entries', async () => {
      // Add an entry with mixed kanji and kana
      __insertRow('dictionary_vocab', {
        id: 5,
        characters: '大きい', // 大 is kanji, きい is kana
        readings: JSON.stringify(['おおきい']),
        meanings: JSON.stringify(['big']),
      });

      const learnedKanji = new Set(['大']);
      const exclude = new Set<string>();

      const items = await getIntuitionPracticeItems(learnedKanji, exclude, 10);

      const chars = items.map(i => i.characters);
      expect(chars).toContain('大きい');
    });

    it('should parse readings and meanings from JSON', async () => {
      const learnedKanji = new Set(['大', '人']);
      const exclude = new Set<string>();

      const items = await getIntuitionPracticeItems(learnedKanji, exclude, 10);

      const otona = items.find(i => i.characters === '大人');
      expect(otona).toBeDefined();
      expect(otona!.readings).toEqual(['おとな']);
      expect(otona!.meanings).toEqual(['adult']);
    });

    it('should return empty array when all matching items are excluded', async () => {
      const learnedKanji = new Set(['大', '人', '火', '山']);
      const exclude = new Set(['大人', '火山', '大学', '未知']);

      const items = await getIntuitionPracticeItems(learnedKanji, exclude, 10);

      expect(items.length).toBe(0);
    });
  });
});
