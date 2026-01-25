import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';

import { SUBJECT_COLORS } from '../theme';

export interface MnemonicTextProps {
  /** The mnemonic text that may contain <radical>, <kanji>, <vocabulary>, and <reading> tags */
  text: string;
  /** Optional testID for testing */
  testID?: string;
  /** Optional style to apply to the container Text */
  style?: TextStyle;
}

/** Supported tag types and their colors */
const TAG_COLORS: Record<string, string> = {
  radical: SUBJECT_COLORS.radical,
  kanji: SUBJECT_COLORS.kanji,
  vocabulary: SUBJECT_COLORS.vocabulary,
};

/** Regex pattern to match valid tags: <tagname>content</tagname> */
const TAG_PATTERN = /<(radical|kanji|vocabulary|reading)>(.*?)<\/\1>/g;

interface ParsedSegment {
  text: string;
  tagType: string | null;
}

/**
 * Parse mnemonic text into segments.
 * Returns array of segments where each has text and optional tag type.
 */
function parseMnemonicText(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  // Reset regex state
  TAG_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TAG_PATTERN.exec(text)) !== null) {
    const [fullMatch, tagType, content] = match;
    const matchStart = match.index;

    // Add text before the match as plain text
    if (matchStart > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, matchStart),
        tagType: null,
      });
    }

    // Add the tagged content
    segments.push({
      text: content,
      tagType,
    });

    lastIndex = matchStart + fullMatch.length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      tagType: null,
    });
  }

  // If no matches found, return original text as single segment
  if (segments.length === 0) {
    segments.push({
      text,
      tagType: null,
    });
  }

  return segments;
}

/**
 * MnemonicText parses and renders mnemonic text with highlighted tags.
 *
 * Supports the following tags:
 * - <radical>text</radical> - renders in blue (#00AAFF) with bold
 * - <kanji>text</kanji> - renders in pink (#FF00AA) with bold
 * - <vocabulary>text</vocabulary> - renders in purple (#AA00FF) with bold
 * - <reading>text</reading> - renders in italic (no color, no bold)
 *
 * Malformed, nested, or unknown tags are rendered as plain text.
 */
export function MnemonicText({ text, testID, style }: MnemonicTextProps) {
  const segments = parseMnemonicText(text);

  return (
    <Text style={style} testID={testID}>
      {segments.map((segment, index) => {
        if (segment.tagType === 'reading') {
          return (
            <Text key={index} style={styles.reading}>
              {segment.text}
            </Text>
          );
        }
        if (segment.tagType && TAG_COLORS[segment.tagType]) {
          return (
            <Text
              key={index}
              style={[
                styles.highlighted,
                { color: TAG_COLORS[segment.tagType] },
              ]}>
              {segment.text}
            </Text>
          );
        }
        return <Text key={index}>{segment.text}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  highlighted: {
    fontWeight: 'bold',
  },
  reading: {
    fontStyle: 'italic',
  },
});
