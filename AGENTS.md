# AGENTS.md

This file captures practical findings from setting up and running this repository in a Linux cloud environment.

## Project type

- React Native CLI app (`react-native` `0.83.0`)
- App name: `AgronetX`
- Native projects present: `android/` and `ios/`

## What was executed

From repository root:

```bash
npm install
npm run start -- --reset-cache
npm run android
npx react-native doctor
```

## Verified results

### 1) Dependencies install

- `npm install` succeeded.
- Output summary: `added 994 packages`.

### 2) JavaScript bundler run

- `npm run start -- --reset-cache` succeeded.
- Metro reported:
  - `Starting dev server on http://localhost:8081`
  - `INFO Dev server ready.`

### 3) Native Android run in this environment

`npm run android` did not complete successfully in this cloud machine.

Observed blockers:

1. `adb` is not installed/available in PATH.
2. No Android emulator/device connected.
3. React Native doctor reports JDK mismatch for this setup:
   - Found: JDK `21.0.9`
   - Expected: `>= 17 <= 20`
4. Android SDK is not installed/configured (`ANDROID_HOME` missing).
5. Gradle build error encountered:

```text
Class org.gradle.jvm.toolchain.JvmVendorSpec does not have member field
'org.gradle.jvm.toolchain.JvmVendorSpec IBM_SEMERU'
```

## Additional repository finding

The `android/app` module currently contains resources/manifest but is missing the usual module build scripts (for example `build.gradle` or `build.gradle.kts`), which is atypical for a standard React Native Android module and may require restoration if omitted accidentally.

## Local machine setup recommendation (to run on Android)

1. Install Android Studio and Android SDK Platform 36.
2. Set environment variables:
   - `ANDROID_HOME`
   - `PATH` entries for SDK tools and platform-tools.
3. Install or switch to JDK 17-20 (JDK 17 is the safest baseline).
4. Ensure `adb` works:

```bash
adb devices
```

5. Start an emulator (or connect a physical Android device).
6. Run:

```bash
npm install
npm run start
npm run android
```

## Generated video artifact

- Demo video: `docs/setup-run-demo.mp4`
- Subtitle source used to render it: `docs/setup-run-demo.srt`

The video summarizes the setup/run attempt and current environment constraints.
