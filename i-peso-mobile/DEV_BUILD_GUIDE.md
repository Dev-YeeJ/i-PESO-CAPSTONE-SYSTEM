# i-PESO Mobile — Convert from Expo Go to a Development Build

**Goal:** stop running the app inside the shared **Expo Go** sandbox and instead run **our own installable app** (a *development build*) while developing — and know how to make a real store-ready build later.

> This is **not** an SDK upgrade. The project stays on **Expo SDK 54 / React Native 0.81 / New Architecture**. We're only changing *how the app is packaged and run*.

---

## Concepts (read once)

| | What it is | When you use it |
|---|---|---|
| **Expo Go** | Expo's shared sandbox client from the app store. Limited to the native modules Expo bundles. | Quick throwaway prototyping. |
| **Development build** | *Our* app binary built with `expo-dev-client`. Still has Fast Refresh + the dev menu, but it's a real installable app with our own icon/name and any native module. | **Day-to-day development** (what we're switching to). |
| **Production build** | The store-ready standalone: `.aab`/`.apk` (Android), `.ipa` (iOS). | Releasing / sharing the actual app. |

**Environment note:** we develop on **Windows**, so:
- **Android** is the practical local target.
- **iOS builds must go through EAS cloud** and need an **Apple Developer account** ($99/yr) — there is no local iOS build on Windows.

---

## Prerequisites
- A **free Expo account** — sign up at https://expo.dev (needed for EAS cloud builds).
- **Node/npm** (already installed).
- *For the local Android route only:* **Android Studio** + Android SDK + an emulator or a USB device with USB debugging enabled.
- *For iOS:* an **Apple Developer account**.

---

## Step 1 — Add app identifiers (MANDATORY, do this first)
`app.json` currently has **no** `android.package` or `ios.bundleIdentifier`. **Every native/EAS build fails without them.** Add them under `expo`:

```jsonc
"android": {
  "package": "com.ipeso.mobile",          // <-- add this line
  "adaptiveIcon": { /* ...unchanged... */ },
  "edgeToEdgeEnabled": true,
  "predictiveBackGestureEnabled": false
},
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.ipeso.mobile"   // <-- add this line
},
```

> Use a real reverse-domain id we own if/when this goes to the stores. `com.ipeso.mobile` is fine for now.
> `app.config.js` already spreads `app.json`, so these values flow through automatically.

---

## Step 2 — Add the dev client
```bash
cd i-peso-mobile
npx expo install expo-dev-client
```
(`expo install` picks the version that matches SDK 54 — don't use plain `npm install` for Expo packages.)

---

## Step 3 — Build the development app

### Recommended: EAS cloud build (works cross-platform, no local Android toolchain)
```bash
npm install -g eas-cli
eas login                              # use the free Expo account
eas build:configure                    # creates eas.json + writes extra.eas.projectId
eas build --profile development --platform android
```
When it finishes, open the link / scan the QR to **download and install the APK** on a device or emulator.
*(iOS: `--platform ios` — needs the Apple account + a registered device UDID.)*

### Alternative: local Android build (fastest loop, needs Android Studio)
```bash
npx expo install expo-dev-client
npx expo run:android                   # compiles + installs the dev app locally
```

---

## Step 4 — Run it while developing
```bash
npx expo start --dev-client
```
Open **our installed app** (its own icon) — **not** Expo Go. It connects to Metro and Fast Refresh works exactly like before.

> You only need to **rebuild** (Step 3) when you **add/upgrade a native module** or change native config. Plain JS/TS changes just reload.

---

## Making the "actual" standalone app (later)
- **Shareable Android APK (test):** `eas build --profile preview --platform android`
- **Play Store bundle:** `eas build --profile production --platform android` → `.aab`
- **iOS:** `eas build --profile production --platform ios` → `.ipa`, then `eas submit`

---

## Backend reachability (already mostly set up)
The app talks to the Laravel backend over the **LAN IP** (`.env` → `EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:8000/api`), and `services/api.ts` derives the host. On a real device, `localhost` won't work — so:
- Serve Laravel on the LAN: `php artisan serve --host=0.0.0.0 --port=8000`
- Keep `EXPO_PUBLIC_API_URL` pointed at the **PC's current LAN IP** (it changes per network).
- `android.usesCleartextTraffic` is already enabled, so plain-HTTP dev traffic is allowed.

---

## Files this touches
- `app.json` — add `android.package` + `ios.bundleIdentifier` (EAS also injects `extra.eas.projectId`).
- `package.json` — adds `expo-dev-client`.
- `eas.json` — **new**, created by `eas build:configure`.
- `.env` — keep the LAN API URL current.

---

## Verification checklist
- [ ] `npx expo start --dev-client` and open the **installed dev app** (own icon, not Expo Go).
- [ ] App loads; the **dev menu** opens (shake the device or press `m` in the terminal).
- [ ] Edit a JS/TS file → **Fast Refresh** updates the app.
- [ ] **Log in** against the backend → confirms the device reaches the LAN API.
- [ ] Standalone check: install the `preview` APK on a device with **Metro not running** → it launches on its own.
