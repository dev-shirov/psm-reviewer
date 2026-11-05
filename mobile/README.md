# PSM I Reviewer — Mobile App (iOS + Android)

A native iOS and Android study app for the Professional Scrum Master I exam, built with
[Expo](https://expo.dev) and React Native. One codebase ships to both platforms and uses the
same 500-question bank as the web app.

## Features

- **Practice mode** — instant grading, explanation and Scrum Guide reference after every question
- **Mock exam** — 80 questions, 60-minute countdown, question palette, no feedback until you submit, scored against the real 85% pass mark
- **Exam resume** — close the app mid-exam and pick up exactly where you left off
- **Flashcards** — tap to flip through all 500 questions for fast recall drilling
- **Browse** — full-text search plus domain, difficulty and flagged filters
- **Stats** — per-domain accuracy, correct/incorrect totals, and recent session history
- **Retry incorrect only** — rebuild a session from just the questions you missed
- Flagging, haptic feedback, and automatic light/dark theme

## Prerequisites

- **Node.js 18+** — check with `node --version`
- **Expo Go** on your phone — free, from the [App Store](https://apps.apple.com/app/expo-go/id982107779) or [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
- Phone and computer on the **same Wi-Fi network**

You do **not** need Xcode or Android Studio to run the app this way.

## Quick start

```bash
cd mobile
npm install
npx expo start
```

A QR code appears in the terminal:

- **iOS** — open the Camera app, point it at the QR code, tap the banner
- **Android** — open **Expo Go**, tap *Scan QR code*

The app loads on your device with live reload on save.

### Other run targets

```bash
npm run ios      # iOS Simulator (requires Xcode)
npm run android  # Android emulator (requires Android Studio)
npm run web      # run in a browser, handy for quick checks
```

If your network blocks the default LAN connection, use a tunnel:

```bash
npx expo start --tunnel
```

## Building a real, installable APK (locally, no account needed)

Expo Go is great for studying, but it needs the dev server running. To get a standalone `.apk`
you can install and run on its own, build it locally with the Android command-line tools —
no Android Studio UI, no Expo/EAS account, nothing uploaded anywhere.

**One-time setup:**

```bash
brew install --cask android-commandlinetools
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT=$ANDROID_HOME
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-36" "build-tools;35.0.0" \
  "ndk;27.1.12297006" "cmake;3.22.1"
```

**Generate the native Android project and build:**

```bash
cd mobile
npx expo prebuild --platform android      # creates ./android (gitignored, regenerate anytime)
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

cd android
./gradlew assembleRelease                 # minified, ~65 MB
# or: ./gradlew assembleDebug              # unminified, larger, useful for debugging
```

The APK lands at `android/app/build/outputs/apk/release/app-release.apk` (debug variant under
`.../debug/app-debug.apk`). Copy it wherever you like, e.g.:

```bash
cp app/build/outputs/apk/release/app-release.apk ../../PSM-I-Reviewer.apk
```

**Installing it on an Android phone:**

- Transfer the `.apk` to the phone (cable, cloud drive, email — any method) and tap it.
- Android will warn about installing from an unknown source the first time — allow it for this file.
- It installs as a real app icon on the home screen; no Expo Go or dev server needed afterward.

Both `assembleDebug` and `assembleRelease` are signed automatically with the Android **debug
keystore** (`android/app/debug.keystore`), so they install straight away. That's fine for your own
devices, but it is **not** accepted by the Play Store — publishing requires generating your own
release keystore and signing with it instead.

Re-run `npx expo prebuild --platform android --clean` any time you change `app.json` (icon, name,
permissions, plugins) — the generated `android/` folder does not update itself.

**iOS** has no equivalent local path here since this machine has no Xcode. Use Expo Go for
day-to-day testing (above), or build on an actual Mac with Xcode installed via
`npx expo prebuild --platform ios` followed by `npx expo run:ios --configuration Release`, or
opening the generated `ios/` project directly in Xcode.

App identity lives in [app.json](./app.json): bundle identifier and Android package are both
`com.psmreviewer.app`. Change these before publishing under your own account.

## Updating the question bank

`src/data/questions.json` is a **copy** of the root `questions.json`. The root project is the
single source of truth. After editing questions in `data/raw/`, run from the repo root:

```bash
npm run build:all   # rebuild + validate the bank, then copy it into mobile/
```

Never hand-edit `mobile/src/data/questions.json` — the next sync overwrites it.

## Project layout

```
App.tsx                  providers, tab bar, overlay routing (quiz/flashcards/results)
src/engine.ts            question dealing, shuffling, grading, scoring, search
src/store.ts             AsyncStorage persistence and pure progress reducers
src/dialogs.ts           cross-platform confirm/alert helpers
src/theme.ts             light + dark palettes
src/AppContext.tsx       progress state shared across screens
src/ThemeContext.tsx     follows the system colour scheme
src/components/          reusable UI primitives
src/screens/             Home, Quiz, Results, Flashcards, Browse, Stats
src/data/questions.json  generated bank (synced from the root project)
```

## Data & privacy

Everything is stored locally on the device with AsyncStorage under the keys `psm1.progress.v1`
and `psm1.exam.v1`. There is no account, no network call, and no analytics. Mobile and web
progress are kept separately and do not sync. "Reset all progress" on the Stats tab clears it.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| QR code scan does nothing | Make sure phone and computer are on the same Wi-Fi, or run `npx expo start --tunnel` |
| "Something went wrong" in Expo Go | Update Expo Go to the latest version, then restart with `npx expo start -c` to clear the cache |
| Stale questions after an edit | Run `npm run build:all` from the repo root, then restart the dev server |
| Metro port already in use | `npx expo start --port 8082` |
| Type errors | `npx tsc --noEmit` to see them all |

---

Questions are original study material written against the publicly available
**Scrum Guide 2020**. Not affiliated with or endorsed by Scrum.org.
