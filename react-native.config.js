module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts/'],
  dependencies: {
    '@react-native-vector-icons/material-design-icons': {
      platforms: {
        android: {
          cmakeListsPath: null,
        },
      },
    },
    'react-native-keychain': {
      platforms: {
        android: {
          cmakeListsPath: null,
        },
      },
    },
  },
};
