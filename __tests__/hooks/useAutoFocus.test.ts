import { renderHook } from '@testing-library/react-native';
import { useAutoFocus } from '../../src/hooks/useAutoFocus';

describe('useAutoFocus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('focuses the ref after 100ms delay', () => {
    const focusMock = jest.fn();
    const ref = { current: { focus: focusMock } };

    renderHook(() => useAutoFocus(ref as any, []));

    expect(focusMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);

    expect(focusMock).toHaveBeenCalledTimes(1);
  });

  it('does not focus if ref.current is null', () => {
    const ref = { current: null };

    expect(() => {
      renderHook(() => useAutoFocus(ref as any, []));
      jest.advanceTimersByTime(100);
    }).not.toThrow();
  });

  it('cleans up timer on unmount', () => {
    const focusMock = jest.fn();
    const ref = { current: { focus: focusMock } };

    const { unmount } = renderHook(() => useAutoFocus(ref as any, []));

    unmount();

    jest.advanceTimersByTime(100);

    expect(focusMock).not.toHaveBeenCalled();
  });

  it('re-focuses when dependencies change', () => {
    const focusMock = jest.fn();
    const ref = { current: { focus: focusMock } };
    let dep = 0;

    const { rerender } = renderHook(() => useAutoFocus(ref as any, [dep]));

    jest.advanceTimersByTime(100);
    expect(focusMock).toHaveBeenCalledTimes(1);

    dep = 1;
    rerender({});

    jest.advanceTimersByTime(100);
    expect(focusMock).toHaveBeenCalledTimes(2);
  });
});
