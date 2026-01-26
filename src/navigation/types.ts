export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  Lessons: undefined;
  Reviews: undefined;
  Search: undefined;
  ItemDetail: { subjectId: number };
  NotificationPermission: { isInitialSetup?: boolean } | undefined;
};
