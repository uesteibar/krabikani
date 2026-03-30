import { open, type DB } from '@op-engineering/op-sqlite';
import type { DictionaryVocab } from '../types/dictionary';

const DICTIONARY_DB_NAME = 'dictionary.db';

let dictionaryDb: DB | null = null;

/**
 * Opens the bundled dictionary database (read-only).
 */
export function getDictionaryDatabase(): DB {
  if (dictionaryDb !== null) {
    return dictionaryDb;
  }

  dictionaryDb = open({
    name: DICTIONARY_DB_NAME,
  });

  return dictionaryDb;
}

/**
 * Closes the dictionary database connection.
 */
export function closeDictionaryDatabase(): void {
  if (dictionaryDb !== null) {
    dictionaryDb.close();
    dictionaryDb = null;
  }
}

/** Reset for testing. */
export function _resetDictionaryInstance(): void {
  dictionaryDb = null;
}

// CJK Unified Ideographs range
const KANJI_MIN = 0x4e00;
const KANJI_MAX = 0x9fff;

function isKanji(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return code >= KANJI_MIN && code <= KANJI_MAX;
}

/**
 * Returns dictionary vocab items where every kanji character in the entry
 * is in the learnedKanji set, and the entry's characters are not in excludeCharacters.
 * Kana-only characters are allowed and not checked against learnedKanji.
 * Results are shuffled so each session feels different.
 */
export async function getIntuitionPracticeItems(
  learnedKanji: Set<string>,
  excludeCharacters: Set<string>,
  limit: number,
): Promise<DictionaryVocab[]> {
  const db = getDictionaryDatabase();

  // Fetch a larger pool from the dictionary, randomized in SQL
  const poolSize = limit * 10;
  const result = await db.execute(
    'SELECT characters, readings, meanings FROM dictionary_vocab ORDER BY RANDOM() LIMIT ?',
    [poolSize],
  );

  const items: DictionaryVocab[] = [];

  for (const row of result.rows) {
    const { characters, readings, meanings } = row as {
      characters: string;
      readings: string;
      meanings: string;
    };

    if (excludeCharacters.has(characters)) {
      continue;
    }

    // Check that every kanji character in the entry is in the learned set
    let allKanjiLearned = true;
    for (const char of characters) {
      if (isKanji(char) && !learnedKanji.has(char)) {
        allKanjiLearned = false;
        break;
      }
    }

    if (!allKanjiLearned) {
      continue;
    }

    items.push({
      characters,
      readings: JSON.parse(readings),
      meanings: JSON.parse(meanings),
    });

    if (items.length >= limit) {
      break;
    }
  }

  return items;
}
