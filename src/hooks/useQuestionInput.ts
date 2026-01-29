import { useState, useCallback, useEffect, useRef } from 'react';
import { processRomajiInput } from '../utils/romajiToHiragana';

type QuestionType = 'meaning' | 'reading' | 'reverse';

interface UseQuestionInputResult {
  inputValue: string;
  displayValue: string;
  setInputValue: (value: string) => void;
  clearInput: () => void;
  handleTextChange: (text: string) => void;
}

export function useQuestionInput(
  questionType: QuestionType
): UseQuestionInputResult {
  const [inputValue, setInputValue] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const prevQuestionType = useRef(questionType);

  useEffect(() => {
    if (prevQuestionType.current !== questionType) {
      prevQuestionType.current = questionType;
      setInputValue('');
      setDisplayValue('');
    }
  }, [questionType]);

  const handleTextChange = useCallback(
    (text: string) => {
      if (questionType === 'reading') {
        const state = processRomajiInput(text, false);
        setInputValue(text);
        setDisplayValue(state.hiragana + state.pending);
      } else {
        setInputValue(text);
        setDisplayValue(text);
      }
    },
    [questionType]
  );

  const clearInput = useCallback(() => {
    setInputValue('');
    setDisplayValue('');
  }, []);

  return {
    inputValue,
    displayValue,
    setInputValue,
    clearInput,
    handleTextChange,
  };
}
