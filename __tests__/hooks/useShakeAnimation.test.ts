import { renderHook, act } from '@testing-library/react-native';
import { useShakeAnimation } from '../../src/hooks/useShakeAnimation';

describe('useShakeAnimation', () => {
  it('returns shakeStyle and triggerShake', () => {
    const { result } = renderHook(() => useShakeAnimation());

    expect(result.current.shakeStyle).toBeDefined();
    expect(result.current.triggerShake).toBeInstanceOf(Function);
  });

  it('shakeStyle contains transform with translateX', () => {
    const { result } = renderHook(() => useShakeAnimation());

    expect(result.current.shakeStyle).toEqual({
      transform: [{ translateX: expect.any(Object) }],
    });
  });

  it('triggerShake can be called without errors', () => {
    const { result } = renderHook(() => useShakeAnimation());

    expect(() => {
      act(() => {
        result.current.triggerShake();
      });
    }).not.toThrow();
  });

  it('returns stable references across renders', () => {
    const { result, rerender } = renderHook(() => useShakeAnimation());

    const firstShakeStyle = result.current.shakeStyle;
    const firstTriggerShake = result.current.triggerShake;

    rerender({});

    expect(result.current.triggerShake).toBe(firstTriggerShake);
    expect(result.current.shakeStyle.transform[0].translateX).toBe(
      firstShakeStyle.transform[0].translateX
    );
  });
});
