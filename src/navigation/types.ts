export type RootStackParamList = {
  Welcome: undefined;
  Instructions: undefined;
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
