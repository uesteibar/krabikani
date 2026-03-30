import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import Database from 'better-sqlite3';
import {
  containsKanji,
  hasMinLength,
  isHighPriority,
  shouldIncludeEntry,
  filterEntryCharacters,
} from '../../scripts/dictionary-filters';
import {createDatabase} from '../../scripts/build-dictionary';

describe('dictionary-filters', () => {
  describe('containsKanji', () => {
    it('returns true for strings containing kanji', () => {
      expect(containsKanji('漢字')).toBe(true);
      expect(containsKanji('食べる')).toBe(true);
      expect(containsKanji('a漢b')).toBe(true);
    });

    it('returns false for strings without kanji', () => {
      expect(containsKanji('ひらがな')).toBe(false);
      expect(containsKanji('カタカナ')).toBe(false);
      expect(containsKanji('abc')).toBe(false);
      expect(containsKanji('')).toBe(false);
    });
  });

  describe('hasMinLength', () => {
    it('returns true for strings meeting minimum length', () => {
      expect(hasMinLength('漢字', 2)).toBe(true);
      expect(hasMinLength('abc', 2)).toBe(true);
      expect(hasMinLength('食べる', 2)).toBe(true);
    });

    it('returns false for strings below minimum length', () => {
      expect(hasMinLength('字', 2)).toBe(false);
      expect(hasMinLength('a', 2)).toBe(false);
      expect(hasMinLength('', 2)).toBe(false);
    });
  });

  describe('isHighPriority', () => {
    it('returns true for entries with priority tags', () => {
      expect(isHighPriority(['ichi1'])).toBe(true);
      expect(isHighPriority(['news1'])).toBe(true);
      expect(isHighPriority(['spec1'])).toBe(true);
      expect(isHighPriority(['nf01'])).toBe(true);
      expect(isHighPriority(['nf20'])).toBe(true);
      expect(isHighPriority(['other', 'ichi1'])).toBe(true);
    });

    it('returns false for entries without priority tags', () => {
      expect(isHighPriority([])).toBe(false);
      expect(isHighPriority(['ichi2'])).toBe(false);
      expect(isHighPriority(['news2'])).toBe(false);
      expect(isHighPriority(['nf21'])).toBe(false);
      expect(isHighPriority(['spec2'])).toBe(false);
    });
  });

  describe('shouldIncludeEntry', () => {
    it('includes entries with kanji, 2+ chars, priority, readings, and meanings', () => {
      expect(
        shouldIncludeEntry({
          characters: ['食べ物'],
          readings: ['たべもの'],
          meanings: ['food'],
          priorities: ['ichi1'],
        }),
      ).toBe(true);
    });

    it('excludes entries without kanji characters', () => {
      expect(
        shouldIncludeEntry({
          characters: ['たべもの'],
          readings: ['たべもの'],
          meanings: ['food'],
          priorities: ['ichi1'],
        }),
      ).toBe(false);
    });

    it('excludes single-character entries', () => {
      expect(
        shouldIncludeEntry({
          characters: ['食'],
          readings: ['しょく'],
          meanings: ['food'],
          priorities: ['ichi1'],
        }),
      ).toBe(false);
    });

    it('excludes entries without priority tags', () => {
      expect(
        shouldIncludeEntry({
          characters: ['食べ物'],
          readings: ['たべもの'],
          meanings: ['food'],
          priorities: [],
        }),
      ).toBe(false);
    });

    it('excludes entries without meanings', () => {
      expect(
        shouldIncludeEntry({
          characters: ['食べ物'],
          readings: ['たべもの'],
          meanings: [],
          priorities: ['ichi1'],
        }),
      ).toBe(false);
    });

    it('excludes entries without readings', () => {
      expect(
        shouldIncludeEntry({
          characters: ['食べ物'],
          readings: [],
          meanings: ['food'],
          priorities: ['ichi1'],
        }),
      ).toBe(false);
    });

    it('includes entry if at least one character variant qualifies', () => {
      expect(
        shouldIncludeEntry({
          characters: ['あ', '食べ物'],
          readings: ['たべもの'],
          meanings: ['food'],
          priorities: ['ichi1'],
        }),
      ).toBe(true);
    });
  });

  describe('filterEntryCharacters', () => {
    it('keeps characters with 2+ length and kanji', () => {
      expect(filterEntryCharacters(['食べ物', '食物'])).toEqual([
        '食べ物',
        '食物',
      ]);
    });

    it('removes single-character entries', () => {
      expect(filterEntryCharacters(['食'])).toEqual([]);
    });

    it('removes kana-only entries', () => {
      expect(filterEntryCharacters(['たべもの'])).toEqual([]);
    });

    it('filters mixed arrays correctly', () => {
      expect(
        filterEntryCharacters(['食べ物', 'あ', 'カタカナ', '漢字']),
      ).toEqual(['食べ物', '漢字']);
    });
  });
});

describe('createDatabase', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dict-test-'));
    dbPath = path.join(tmpDir, 'test-dictionary.db');
  });

  afterEach(() => {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    fs.rmdirSync(tmpDir);
  });

  it('creates a database with metadata and vocab tables', () => {
    const entries = [
      {
        characters: ['食べ物'],
        readings: ['たべもの'],
        meanings: ['food'],
        priorities: ['ichi1'],
      },
    ];

    createDatabase(dbPath, entries);

    const db = new Database(dbPath, {readonly: true});
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all() as {name: string}[];
    expect(tables.map(t => t.name)).toEqual([
      'dictionary_vocab',
      'metadata',
    ]);
    db.close();
  });

  it('inserts CC-BY-SA attribution metadata', () => {
    createDatabase(dbPath, []);

    const db = new Database(dbPath, {readonly: true});
    const metadata = db.prepare('SELECT key, value FROM metadata').all() as {
      key: string;
      value: string;
    }[];
    const metaMap = Object.fromEntries(metadata.map(m => [m.key, m.value]));

    expect(metaMap.source).toContain('EDRDG');
    expect(metaMap.license).toContain('CC BY-SA');
    expect(metaMap.url).toContain('edrdg.org');
    db.close();
  });

  it('inserts filtered vocabulary entries', () => {
    const entries = [
      {
        characters: ['食べ物'],
        readings: ['たべもの'],
        meanings: ['food', 'provisions'],
        priorities: ['ichi1'],
      },
      {
        characters: ['ひらがな'],
        readings: ['ひらがな'],
        meanings: ['hiragana'],
        priorities: ['ichi1'],
      },
      {
        characters: ['漢字'],
        readings: ['かんじ'],
        meanings: ['kanji'],
        priorities: ['news1'],
      },
    ];

    const count = createDatabase(dbPath, entries);
    expect(count).toBe(2);

    const db = new Database(dbPath, {readonly: true});
    const rows = db
      .prepare('SELECT characters, readings, meanings FROM dictionary_vocab')
      .all() as {characters: string; readings: string; meanings: string}[];

    expect(rows).toHaveLength(2);
    expect(rows[0].characters).toBe('食べ物');
    expect(JSON.parse(rows[0].readings)).toEqual(['たべもの']);
    expect(JSON.parse(rows[0].meanings)).toEqual(['food', 'provisions']);
    expect(rows[1].characters).toBe('漢字');
    db.close();
  });

  it('skips duplicate characters', () => {
    const entries = [
      {
        characters: ['食べ物'],
        readings: ['たべもの'],
        meanings: ['food'],
        priorities: ['ichi1'],
      },
      {
        characters: ['食べ物'],
        readings: ['たべもの'],
        meanings: ['different meaning'],
        priorities: ['news1'],
      },
    ];

    const count = createDatabase(dbPath, entries);
    expect(count).toBe(1);
  });

  it('excludes entries without priority tags', () => {
    const entries = [
      {
        characters: ['食べ物'],
        readings: ['たべもの'],
        meanings: ['food'],
        priorities: [],
      },
    ];

    const count = createDatabase(dbPath, entries);
    expect(count).toBe(0);
  });
});
