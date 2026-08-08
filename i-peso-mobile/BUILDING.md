# Building installable i-PESO Mobile apps

This document explains how to produce installable Android (APK/AAB) and iOS builds for the `i-peso-mobile` Expo project.

Two recommended approaches:

1. EAS Build (recommended)
2. Local native builds (requires macOS for iOS)

Prerequisites
- Node.js and yarn/npm
- Expo CLI and EAS CLI

Install CLI tools:

```bash
# from workspace root
cd i-peso-mobile
npm install # or yarn
npm install -g eas-cli # or: npm i -g eas-cli
```

1) EAS Build (recommended)
- Sign in to an Expo account (create one at https://expo.dev if you don't have it).

```bash
cd i-peso-mobile
eas login
```

- Configure credentials (EAS will guide you for Android keystore and iOS signing):

```bash
# configure android keystore and app signing
eas build:configure
```

- Run a production Android App Bundle (AAB):

```bash
eas build -p android --profile production
```

- Run a production iOS build (requires an Apple developer account):

```bash
eas build -p ios --profile production
```

EAS stores the resulting artifacts on Expo servers and provides download links once the builds finish.

2) Local native builds (bare / prebuild)
- This produces local Android/iOS projects and uses native toolchains. It requires additional setup and is more involved.

```bash
cd i-peso-mobile
# generate native projects
expo prebuild

# Android: build locally (Linux/Windows/macOS)
cd android
./gradlew assembleRelease
# Output APK/AAB in android/app/build/outputs/

# iOS: requires macOS
cd ios
# open Xcode workspace and build or run
```

Notes and recommendations
- EAS Build is the simplest way to create an installable app while staying on managed Expo workflow.
- You will need developer accounts for store distribution (Google Play, Apple App Store) and platform-specific credentials.
- If you want, I can:
  - add a small CI workflow (GitHub Actions) to trigger EAS builds on tags/releases,
  - add `eas.json` profiles tuned for debugging vs production (already added),
  - or walk you through obtaining and uploading store credentials.

If you'd like me to prepare CI or automate submission steps, tell me which provider (Google Play / App Store) and I will scaffold the workflow.