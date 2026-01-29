import { useEffect, type RefObject } from 'react';
import { type TextInput } from 'react-native';

const AUTO_FOCUS_DELAY_MS = 100;

export function useAutoFocus(
  ref: RefObject<TextInput | null>,
  dependencies: readonly unknown[]
): void {
  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.focus();
    }, AUTO_FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
