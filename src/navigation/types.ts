export type RootStackParamList = {
  Welcome: undefined;
  Instructions: undefined;
  ApiKeyInput: undefined;
  Sync: undefined;
  WizardNotification: undefined;
  WizardCompletion: undefined;
  Home: undefined;
  Settings: undefined;
  Lessons: undefined;
  Reviews: undefined;
  Practice: undefined;
  Search: undefined;
  ItemDetail: { subjectId: number };
  RadicalDetail: { subjectId: number };
  KanjiDetail: { subjectId: number };
  VocabularyDetail: { subjectId: number };
  NotificationPermission: { isInitialSetup?: boolean } | undefined;
};
