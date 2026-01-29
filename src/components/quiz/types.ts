import type {
  SubjectType,
  Meaning,
  AuxiliaryMeaning,
  Reading,
  KanjiReading,
} from '../../api/types';

export type QuestionType = 'meaning' | 'reading' | 'reverse';

export type AnswerStatus = 'correct' | 'incorrect' | 'fuzzyMatch';

export interface Question {
  id: string;
  subjectId: number;
  subjectType: SubjectType;
  displayText: string;
  displayMode: 'characters' | 'meaning';
  correctAnswers: string[];
  questionType: QuestionType;
  mnemonic: string;
  mnemonicLabel: string;
  meanings: Meaning[];
  readings: (Reading | KanjiReading)[];
  auxiliaryMeanings: AuxiliaryMeaning[];
  userSynonyms: string[];
}

export interface AnswerResult {
  status: AnswerStatus;
  userAnswer: string;
  correctAnswer: string;
}
