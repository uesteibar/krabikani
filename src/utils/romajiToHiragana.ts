/**
 * Romaji to Hiragana conversion utility.
 * Implements wapuro-style input conversion with support for:
 * - Basic syllables (ka→か, shi/si→し, tsu/tu→つ, etc.)
 * - Double consonants producing っ (kka→っか)
 * - nn producing ん, n followed by vowel producing な/に/ぬ/ね/の
 * - Long vowels (ou→おう, uu→うう)
 * - Combination kana (youon) like きゃ, しゅ, ちょ
 */

export interface RomajiInputState {
  /** Converted hiragana characters */
  hiragana: string;
  /** Pending romaji that hasn't been converted yet */
  pending: string;
}

// Romaji to hiragana mapping table
// Ordered from longest to shortest to ensure correct matching
const ROMAJI_MAP: Record<string, string> = {
  // Combination kana (youon) - 3+ characters
  kya: 'きゃ',
  kyu: 'きゅ',
  kyo: 'きょ',
  sha: 'しゃ',
  shu: 'しゅ',
  sho: 'しょ',
  sya: 'しゃ',
  syu: 'しゅ',
  syo: 'しょ',
  cha: 'ちゃ',
  chu: 'ちゅ',
  cho: 'ちょ',
  tya: 'ちゃ',
  tyu: 'ちゅ',
  tyo: 'ちょ',
  nya: 'にゃ',
  nyu: 'にゅ',
  nyo: 'にょ',
  hya: 'ひゃ',
  hyu: 'ひゅ',
  hyo: 'ひょ',
  mya: 'みゃ',
  myu: 'みゅ',
  myo: 'みょ',
  rya: 'りゃ',
  ryu: 'りゅ',
  ryo: 'りょ',
  gya: 'ぎゃ',
  gyu: 'ぎゅ',
  gyo: 'ぎょ',
  jya: 'じゃ',
  jyu: 'じゅ',
  jyo: 'じょ',
  bya: 'びゃ',
  byu: 'びゅ',
  byo: 'びょ',
  pya: 'ぴゃ',
  pyu: 'ぴゅ',
  pyo: 'ぴょ',

  // 3-character basic syllables
  shi: 'し',
  chi: 'ち',
  tsu: 'つ',

  // 2-character j-row
  ja: 'じゃ',
  ju: 'じゅ',
  jo: 'じょ',
  ji: 'じ',

  // 2-character basic syllables (ordered by consonant)
  ka: 'か',
  ki: 'き',
  ku: 'く',
  ke: 'け',
  ko: 'こ',
  sa: 'さ',
  si: 'し',
  su: 'す',
  se: 'せ',
  so: 'そ',
  ta: 'た',
  ti: 'ち',
  tu: 'つ',
  te: 'て',
  to: 'と',
  na: 'な',
  ni: 'に',
  nu: 'ぬ',
  ne: 'ね',
  no: 'の',
  ha: 'は',
  hi: 'ひ',
  fu: 'ふ',
  hu: 'ふ',
  he: 'へ',
  ho: 'ほ',
  ma: 'ま',
  mi: 'み',
  mu: 'む',
  me: 'め',
  mo: 'も',
  ya: 'や',
  yu: 'ゆ',
  yo: 'よ',
  ra: 'ら',
  ri: 'り',
  ru: 'る',
  re: 'れ',
  ro: 'ろ',
  wa: 'わ',
  wo: 'を',
  nn: 'ん',

  // Voiced consonants (dakuten)
  ga: 'が',
  gi: 'ぎ',
  gu: 'ぐ',
  ge: 'げ',
  go: 'ご',
  za: 'ざ',
  zi: 'じ',
  zu: 'ず',
  ze: 'ぜ',
  zo: 'ぞ',
  da: 'だ',
  di: 'ぢ',
  du: 'づ',
  de: 'で',
  do: 'ど',
  ba: 'ば',
  bi: 'び',
  bu: 'ぶ',
  be: 'べ',
  bo: 'ぼ',

  // Half-voiced consonants (handakuten)
  pa: 'ぱ',
  pi: 'ぴ',
  pu: 'ぷ',
  pe: 'ぺ',
  po: 'ぽ',

  // Single vowels
  a: 'あ',
  i: 'い',
  u: 'う',
  e: 'え',
  o: 'お',
};

// Consonants that can be doubled to produce っ
const DOUBLING_CONSONANTS = new Set([
  'k',
  's',
  't',
  'p',
  'c',
  'g',
  'z',
  'd',
  'b',
  'f',
  'h',
  'm',
  'r',
  'w',
  'j',
]);

// Partial sequences that need more input
const PARTIAL_SEQUENCES = new Set([
  'k',
  's',
  't',
  'n',
  'h',
  'm',
  'y',
  'r',
  'w',
  'g',
  'z',
  'd',
  'b',
  'p',
  'f',
  'c',
  'j',
  'sh',
  'ch',
  'ts',
  'ky',
  'sy',
  'ty',
  'ny',
  'hy',
  'my',
  'ry',
  'gy',
  'jy',
  'by',
  'py',
]);

// Check if a character is a vowel
function isVowel(char: string): boolean {
  return 'aiueo'.includes(char.toLowerCase());
}

// Check if a character is a consonant that can follow 'n' without converting it to ん
function isNFollowableConsonant(char: string): boolean {
  return 'aiueony'.includes(char.toLowerCase());
}

// Check if a character is hiragana
function isHiragana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x3040 && code <= 0x309f;
}

/**
 * Converts a complete romaji string to hiragana.
 * This handles the full conversion including trailing 'n' → 'ん'.
 */
export function romajiToHiragana(romaji: string): string {
  const result = processRomajiInput(romaji.toLowerCase(), true);
  return result.hiragana;
}

/**
 * Processes romaji input in real-time, returning both converted hiragana
 * and any pending romaji that hasn't been converted yet.
 *
 * @param input The romaji input string
 * @param forceComplete If true, converts trailing 'n' to 'ん'
 * @returns Object with hiragana (converted) and pending (unconverted) parts
 */
export function processRomajiInput(
  input: string,
  forceComplete: boolean = false,
): RomajiInputState {
  const lowerInput = input.toLowerCase();
  let result = '';
  let i = 0;

  while (i < lowerInput.length) {
    const char = lowerInput[i];

    // Pass through hiragana characters
    if (isHiragana(char)) {
      result += char;
      i++;
      continue;
    }

    // Pass through non-alphabetic characters
    if (!/[a-z]/.test(char)) {
      result += char;
      i++;
      continue;
    }

    // Try to find the longest matching romaji sequence
    let matched = false;

    // Handle 'n' specially - this must come before double consonant check
    if (char === 'n') {
      // Check if followed by 'n'
      if (i + 1 < lowerInput.length && lowerInput[i + 1] === 'n') {
        // Check if there's more after 'nn'
        if (i + 2 < lowerInput.length) {
          const charAfterNN = lowerInput[i + 2];
          // If followed by a vowel, 'y', or 'n', the second 'n' starts a new syllable
          // e.g., 'nna' → ん + な, 'nnyo' → ん + にょ
          if (isVowel(charAfterNN) || charAfterNN === 'y' || charAfterNN === 'n') {
            result += 'ん';
            i++; // Move past first 'n', let second 'n' be processed
            continue;
          }
        }
        // 'nn' at end or followed by consonant → ん
        result += 'ん';
        i += 2;
        continue;
      }

      // Check if 'n' is followed by a consonant (except 'y' and 'n')
      if (i + 1 < lowerInput.length) {
        const nextChar = lowerInput[i + 1];
        if (!isNFollowableConsonant(nextChar)) {
          // n followed by non-vowel, non-y, non-n consonant → ん + continue with consonant
          result += 'ん';
          i++;
          continue;
        }
      }

      // Check if this could be a youon starting with 'n' (nya, nyu, nyo)
      if (i + 1 < lowerInput.length && lowerInput[i + 1] === 'y') {
        // Check for full youon
        if (i + 2 < lowerInput.length) {
          const sequence = lowerInput.slice(i, i + 3);
          if (ROMAJI_MAP[sequence]) {
            result += ROMAJI_MAP[sequence];
            i += 3;
            matched = true;
            continue;
          }
        }
        // Partial 'ny' - check if more input is coming
        if (i + 2 >= lowerInput.length && !forceComplete) {
          // Return partial state
          return {
            hiragana: result,
            pending: lowerInput.slice(i),
          };
        }
      }

      // Single 'n' at end of input
      if (i + 1 >= lowerInput.length) {
        if (forceComplete) {
          result += 'ん';
          i++;
          continue;
        } else {
          // Keep 'n' as pending
          return {
            hiragana: result,
            pending: 'n',
          };
        }
      }
    }

    // Check for double consonant (っ) - but not 'nn' which is handled above
    if (
      i + 1 < lowerInput.length &&
      DOUBLING_CONSONANTS.has(char) &&
      char === lowerInput[i + 1] &&
      char !== 'n'
    ) {
      // Special case: 'tch' should become っち
      if (
        char === 't' &&
        i + 2 < lowerInput.length &&
        lowerInput[i + 1] === 'c'
      ) {
        // This is 'tc' - check if followed by 'h'
        if (i + 3 < lowerInput.length && lowerInput[i + 2] === 'h') {
          result += 'っ';
          i++; // Skip first 't', let 'ch' be processed next
          continue;
        }
      }

      // Standard double consonant
      result += 'っ';
      i++; // Skip first consonant, let second one be processed normally
      continue;
    }

    // Handle 'tch' pattern (っち)
    if (
      char === 't' &&
      i + 1 < lowerInput.length &&
      lowerInput[i + 1] === 'c' &&
      i + 2 < lowerInput.length &&
      lowerInput[i + 2] === 'h'
    ) {
      result += 'っ';
      i++; // Skip 't', let 'ch' be processed next
      continue;
    }

    // Try matching longest to shortest sequences
    for (let len = 4; len >= 1; len--) {
      if (i + len > lowerInput.length) continue;
      const sequence = lowerInput.slice(i, i + len);

      if (ROMAJI_MAP[sequence]) {
        result += ROMAJI_MAP[sequence];
        i += len;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    // Check if this is a partial sequence that needs more input
    const remaining = lowerInput.slice(i);

    // Don't return as pending if forceComplete and remaining is just 'n'
    if (forceComplete && remaining === 'n') {
      result += 'ん';
      break;
    }

    for (let len = remaining.length; len >= 1; len--) {
      const partial = remaining.slice(0, len);
      if (PARTIAL_SEQUENCES.has(partial)) {
        // This is a partial sequence, return it as pending
        return {
          hiragana: result,
          pending: remaining,
        };
      }
    }

    // Check if current character starts a valid sequence
    if (PARTIAL_SEQUENCES.has(char)) {
      return {
        hiragana: result,
        pending: lowerInput.slice(i),
      };
    }

    // No match found - pass through the character
    result += char;
    i++;
  }

  return {
    hiragana: result,
    pending: '',
  };
}
