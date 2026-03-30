export interface JMdictEntry {
  characters: string[];
  readings: string[];
  meanings: string[];
  priorities: string[];
}

const KANJI_RANGE_START = 0x4e00;
const KANJI_RANGE_END = 0x9fff;

export function containsKanji(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code >= KANJI_RANGE_START && code <= KANJI_RANGE_END) {
      return true;
    }
  }
  return false;
}

export function hasMinLength(text: string, minLength: number): boolean {
  return [...text].length >= minLength;
}

const PRIORITY_TAGS = new Set([
  'ichi1',
  'news1',
  'spec1',
  ...Array.from({length: 20}, (_, i) => `nf${String(i + 1).padStart(2, '0')}`),
]);

export function isHighPriority(priorities: string[]): boolean {
  return priorities.some(p => PRIORITY_TAGS.has(p));
}

export function shouldIncludeEntry(entry: JMdictEntry): boolean {
  const validCharacters = entry.characters.filter(
    c => hasMinLength(c, 2) && containsKanji(c),
  );
  if (validCharacters.length === 0) {
    return false;
  }
  if (!isHighPriority(entry.priorities)) {
    return false;
  }
  if (entry.meanings.length === 0 || entry.readings.length === 0) {
    return false;
  }
  return true;
}

export function filterEntryCharacters(characters: string[]): string[] {
  return characters.filter(c => hasMinLength(c, 2) && containsKanji(c));
}
