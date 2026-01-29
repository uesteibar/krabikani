import {
  validateMeaningAnswer,
  validateReadingAnswer,
} from '../../utils/answerValidation';
import {
  romajiToHiragana,
  isValidReadingInput,
} from '../../utils/romajiToHiragana';
import type { Meaning, Reading, KanjiReading } from '../../api/types';
import type { Question, AnswerResult } from './types';

function containsRomaji(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

function getAcceptedMeaningsDisplay(meanings: Meaning[]): string {
  return meanings
    .filter(m => m.accepted_answer)
    .map(m => m.meaning)
    .join(', ');
}

function getAcceptedReadingsDisplay(
  readings: (Reading | KanjiReading)[],
): string {
  return readings
    .filter(r => r.accepted_answer)
    .map(r => r.reading)
    .join(', ');
}

export type InputValidation =
  | { valid: true }
  | { valid: false; reason: 'empty' | 'shake' };

export function validateInput(
  question: Question,
  rawInput: string,
): InputValidation {
  if (question.questionType === 'reverse') {
    const answer = rawInput.trim();
    if (containsRomaji(answer) || answer.length === 0) {
      return { valid: false, reason: 'shake' };
    }
    return { valid: true };
  }

  if (question.questionType === 'reading') {
    if (!isValidReadingInput(rawInput)) {
      return { valid: false, reason: 'shake' };
    }
    return { valid: true };
  }

  if (rawInput.trim().length === 0) {
    return { valid: false, reason: 'shake' };
  }

  return { valid: true };
}

export function validateAnswer(
  question: Question,
  rawInput: string,
): AnswerResult {
  const { questionType, meanings, readings, auxiliaryMeanings, userSynonyms } =
    question;

  if (questionType === 'reverse') {
    const answer = rawInput.trim();
    const correctAnswer = question.displayText;
    const isCorrect = answer === correctAnswer;
    return {
      status: isCorrect ? 'correct' : 'incorrect',
      userAnswer: answer,
      correctAnswer,
    };
  }

  if (questionType === 'reading') {
    const answer = romajiToHiragana(rawInput);
    const result = validateReadingAnswer(answer, readings);
    const correctAnswer = getAcceptedReadingsDisplay(readings);
    return {
      status: result.isCorrect ? 'correct' : 'incorrect',
      userAnswer: answer,
      correctAnswer,
    };
  }

  // meaning
  const answer = rawInput.trim();
  const result = validateMeaningAnswer(
    answer,
    meanings,
    auxiliaryMeanings,
    userSynonyms,
  );
  const correctAnswer = getAcceptedMeaningsDisplay(meanings);

  let status: AnswerResult['status'];
  if (!result.isCorrect) {
    status = 'incorrect';
  } else if (result.isFuzzyMatch) {
    status = 'fuzzyMatch';
  } else {
    status = 'correct';
  }

  return { status, userAnswer: answer, correctAnswer };
}
