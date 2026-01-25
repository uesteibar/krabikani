/* eslint-env jest */
// Mock react-native-worklets first (dependency of reanimated)
jest.mock('react-native-worklets', () => ({
  init: jest.fn(),
  createWorklet: jest.fn(),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  const Text = require('react-native').Text;

  return {
    default: {
      View,
      Text,
      call: jest.fn(),
    },
    View,
    Text,
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((toValue) => toValue),
    withSequence: jest.fn((...values) => values[values.length - 1]),
    withDelay: jest.fn((_, animation) => animation),
    runOnJS: jest.fn((fn) => fn),
    Easing: {
      out: jest.fn(() => ({})),
      in: jest.fn(() => ({})),
      inOut: jest.fn(() => ({})),
      cubic: {},
      linear: {},
      poly: jest.fn(() => ({})),
      back: jest.fn(() => ({})),
      ease: {},
    },
    interpolateColor: jest.fn((progress, inputRange, outputRange) => {
      // Return the second color (end color) by default
      return outputRange[1];
    }),
    SharedValue: {},
  };
});
