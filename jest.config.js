module.exports = {
  preset: 'react-native',
  testPathIgnorePatterns: ['/node_modules/', '\\.ralph/'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|react-native-screens|react-native-safe-area-context|@testing-library|react-native-reanimated|react-native-worklets)/)',
  ],
  setupFilesAfterEnv: ['./jest.setup.js'],
};
