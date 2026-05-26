# Repository Guidelines

## Project Structure & Module Organization
This is a React Native + TypeScript app. Source code lives in `src/`, grouped by concern:
`src/screens/` for screens, `src/components/` for reusable UI, `src/services/` for API and scheduling logic, `src/storage/` for SQLite and secure storage, `src/navigation/` for navigation, and `src/theme/` for colors and typography. Tests live in `__tests__/` and generally mirror the source layout. Static assets are in `assets/` (screenshots, wizard images, and fonts). Platform code is under `android/` and `ios/`.

## Build, Test, and Development Commands
- `npm start` - start the Metro bundler.
- `npm run ios` - launch the iOS app in a simulator.
- `npm run android` - launch the Android app on a device or emulator.
- `npm test` - run the Jest suite.
- `npm run lint` - run ESLint across the repo.
- `npm run typecheck` - run TypeScript without emitting files.
- `npm run android:install` - build and install a release APK on a connected Android device.

## Coding Style & Naming Conventions
Use TypeScript, function components, and small focused modules. Follow the repo formatter: 2-space indentation, single quotes, trailing commas, and no parentheses for single-argument arrow functions. Prefer descriptive names that match the feature area, such as `ReviewSession.tsx`, `useQuestionInput.ts`, or `syncService.ts`. Keep shared UI in `src/components/` and feature logic close to the screens or services that use it.

## Testing Guidelines
Jest is the test runner, with React Native Testing Library for component tests. Place tests in `__tests__/` using the source path pattern, such as `__tests__/screens/HomeScreen.test.tsx` or `__tests__/utils/srs.test.ts`. Test names should describe behavior, not implementation. Run `npm test` before submitting changes, and add focused tests for any behavioral change.

Every new feature or bug fix should include tests that cover the new behavior. After any change, run the full test suite to ensure no regressions.

For UI changes, use React Native Testing Library to verify the new UI elements render correctly and respond to interactions. For logic changes, write unit tests that cover edge cases and expected outcomes. If you fix a bug, add a test that reproduces the bug before the fix and passes after.

## Commit & Pull Request Guidelines
Git history uses scoped Conventional Commits, for example `feat(theme): ...` or `fix(reviews): ...`. Keep commit messages short, imperative, and scoped when possible. Pull requests should summarize the change, note tests run (`npm test`, `npm run lint`, `npm run typecheck`), and include screenshots or screen recordings for visible UI changes. Link related issues when applicable.

## Configuration & Secrets
Do not commit API keys or device-specific secrets. The app expects a WaniKani API key from user settings at runtime. If you touch native code, verify the corresponding Android or iOS build path before merging.
