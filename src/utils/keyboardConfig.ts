import type { QuestionType } from '../components/quiz/types';

export function getAnswerKeyboardType(
  questionType: QuestionType | undefined,
  preferKanaKeyboard: boolean,
): 'default' | 'ascii-capable' {
  if (questionType === 'reading' && !preferKanaKeyboard) return 'ascii-capable';
  return 'default';
}
