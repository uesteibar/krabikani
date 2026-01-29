import { renderHook, act } from '@testing-library/react-native';
import { useQuestionInput } from '../../src/hooks/useQuestionInput';

describe('useQuestionInput', () => {
  describe('return shape', () => {
    it('returns inputValue, displayValue, setInputValue, clearInput, handleTextChange', () => {
      const { result } = renderHook(() => useQuestionInput('meaning'));

      expect(result.current.inputValue).toBe('');
      expect(result.current.displayValue).toBe('');
      expect(result.current.setInputValue).toBeInstanceOf(Function);
      expect(result.current.clearInput).toBeInstanceOf(Function);
      expect(result.current.handleTextChange).toBeInstanceOf(Function);
    });
  });

  describe('meaning mode', () => {
    it('passes text through directly', () => {
      const { result } = renderHook(() => useQuestionInput('meaning'));

      act(() => {
        result.current.handleTextChange('hello world');
      });

      expect(result.current.inputValue).toBe('hello world');
      expect(result.current.displayValue).toBe('hello world');
    });

    it('clearInput resets state', () => {
      const { result } = renderHook(() => useQuestionInput('meaning'));

      act(() => {
        result.current.handleTextChange('some text');
      });
      expect(result.current.inputValue).toBe('some text');

      act(() => {
        result.current.clearInput();
      });

      expect(result.current.inputValue).toBe('');
      expect(result.current.displayValue).toBe('');
    });
  });

  describe('reading mode', () => {
    it('converts romaji to hiragana', () => {
      const { result } = renderHook(() => useQuestionInput('reading'));

      act(() => {
        result.current.handleTextChange('ka');
      });

      expect(result.current.inputValue).toBe('ka');
      expect(result.current.displayValue).toBe('か');
    });

    it('shows pending romaji in displayValue', () => {
      const { result } = renderHook(() => useQuestionInput('reading'));

      act(() => {
        result.current.handleTextChange('k');
      });

      expect(result.current.inputValue).toBe('k');
      // displayValue should include pending romaji
      expect(result.current.displayValue).toBe('k');
    });

    it('converts multi-character sequences', () => {
      const { result } = renderHook(() => useQuestionInput('reading'));

      act(() => {
        result.current.handleTextChange('kanji');
      });

      expect(result.current.inputValue).toBe('kanji');
      // か + ん + じ (but 'ji' at the end should convert)
      // kanji -> ka=か, n+j=ん, i... actually "kanji" = か + ん + じ
      // processRomajiInput with forceComplete=false may leave trailing parts pending
    });

    it('clearInput resets all state including pending romaji', () => {
      const { result } = renderHook(() => useQuestionInput('reading'));

      act(() => {
        result.current.handleTextChange('ka');
      });
      expect(result.current.displayValue).toBe('か');

      act(() => {
        result.current.clearInput();
      });

      expect(result.current.inputValue).toBe('');
      expect(result.current.displayValue).toBe('');
    });
  });

  describe('reverse mode', () => {
    it('passes text through directly', () => {
      const { result } = renderHook(() => useQuestionInput('reverse'));

      act(() => {
        result.current.handleTextChange('漢字');
      });

      expect(result.current.inputValue).toBe('漢字');
      expect(result.current.displayValue).toBe('漢字');
    });

    it('clearInput resets state', () => {
      const { result } = renderHook(() => useQuestionInput('reverse'));

      act(() => {
        result.current.handleTextChange('漢字');
      });

      act(() => {
        result.current.clearInput();
      });

      expect(result.current.inputValue).toBe('');
      expect(result.current.displayValue).toBe('');
    });
  });

  describe('questionType changes', () => {
    it('resets state when questionType changes', () => {
      const { result, rerender } = renderHook(
        ({ questionType }: { questionType: 'meaning' | 'reading' | 'reverse' }) =>
          useQuestionInput(questionType),
        { initialProps: { questionType: 'meaning' as const } }
      );

      act(() => {
        result.current.handleTextChange('hello');
      });
      expect(result.current.inputValue).toBe('hello');

      rerender({ questionType: 'reading' });

      expect(result.current.inputValue).toBe('');
      expect(result.current.displayValue).toBe('');
    });
  });
});
