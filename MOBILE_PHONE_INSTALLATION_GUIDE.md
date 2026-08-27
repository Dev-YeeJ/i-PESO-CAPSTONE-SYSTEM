# i-PESO Mobile Phone Installation Guide

This guide is for running the i-PESO mobile app directly on an Android phone. It does not use Expo Go.

## Copy-Paste Prompt for Groupmates

```text
Please help me install and run the i-PESO mobile app directly on my Android phone without using Expo Go.

The project uses Expo React Native, but I run it with:

npx expo run:android

Please follow these requirements:

- Use Windows PowerShell commands.
- Use Android Studio, Android SDK, and an Android phone with USB Debugging enabled.
- Connect the phone to the laptop with a USB cable.
- Confirm the phone is detected with `adb devices`.
- Configure the mobile app to reach the Laravel backend through the laptop's Wi-Fi IPv4 address, not `localhost`.
- Start Laravel with `php artisan serve --host=0.0.0.0 --port=8000`.
- Set `i-peso-mobile/.env.local` to:

  EXPO_PUBLIC_API_URL=http://<LAPTOP_IPV4_ADDRESS>:8000/api

- Install dependencies with `npm install`.
- Build and install the app on the connected phone with `npx expo run:android`.
- After installation, start the development server with `npx expo start --dev-client --lan -c`.
- Explain how to test the backend connection and troubleshoot USB, Wi-Fi, firewall, API URL, and Android SDK problems.

Do not use Expo Go. The app must be installed as its own Android application.
```

## Step-by-Step Guide

### Requirements

Install or prepare the following:

- Windows laptop
- Node.js LTS and npm
- Android Studio
- Android SDK and Android SDK Platform-Tools
- Android phone
- USB cable
- Phone and laptop connected to the same Wi-Fi network

### 1. Download the Project

Clone or download the project to the laptop. The project should be located at:

```powershell
C:\i-PESO-CAPSTONE-SYSTEM
```

Open PowerShell and go to the project root:

```powershell
cd C:\i-PESO-CAPSTONE-SYSTEM
```

### 2. Enable USB Debugging

On the Android phone:

1. Open **Settings > About phone**.
2. Tap **Build number** seven times to enable Developer Options.
3. Open **Settings > Developer options**.
4. Enable **USB debugging**.
5. Connect the phone to the laptop using a USB cable.
6. Choose **File Transfer** if the phone asks for a USB connection mode.
7. Tap **Allow** when the phone displays the USB debugging authorization prompt.

### 3. Confirm the Phone Is Detected

In PowerShell, run:

```powershell
adb devices
```

A device should appear with the status `device`.

If the status is `unauthorized`, unlock the phone and accept the authorization prompt. If no device appears, install the correct USB driver, try another cable or USB port, and run `adb devices` again.

### 4. Find the Laptop's Wi-Fi IP Address

Run:

```powershell
ipconfig
```

Find the active Wi-Fi adapter's **IPv4 Address**. Example:

```text
192.168.1.25
```

Use the actual address from the laptop. It can change when the laptop reconnects to Wi-Fi.

### 5. Configure the Mobile API URL

Create or edit this file:

```text
i-peso-mobile\.env.local
```

Add the following line, replacing the example IP address:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.25:8000/api
```

Do not use these addresses on a physical phone:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

On a physical phone, `localhost` refers to the phone itself, not the laptop.

### 6. Start the Laravel Backend

Open a PowerShell window and run:

```powershell
cd C:\i-PESO-CAPSTONE-SYSTEM\i-peso-backend
php artisan serve --host=0.0.0.0 --port=8000
```

Keep this terminal open.

The `0.0.0.0` host allows devices on the same Wi-Fi network to reach the backend.

### 7. Test the Backend From the Phone

On the phone, open a browser and visit:

```text
http://192.168.1.25:8000
```

Replace the IP address with the laptop's actual IPv4 address.

A Laravel page or server response should load. If it does not load:

- Confirm the phone and laptop use the same Wi-Fi.
- Confirm Laravel is still running.
- Allow PHP through Windows Defender Firewall.
- Disconnect any VPN that blocks local network traffic.
- Check the IPv4 address again with `ipconfig`.

### 8. Install Mobile Dependencies

Open a second PowerShell window and run:

```powershell
cd C:\i-PESO-CAPSTONE-SYSTEM\i-peso-mobile
npm install
```

### 9. Build and Install the App

Make sure the phone is connected and detected, then run:

```powershell
npx expo run:android
```

This command will build the native Android application and install it directly on the connected phone. Expo Go is not required.

The first build may take several minutes because Gradle compiles the Android project.

### 10. Start the Development Server

After the app is installed, run:

```powershell
cd C:\i-PESO-CAPSTONE-SYSTEM\i-peso-mobile
npx expo start --dev-client --lan -c
```

Open the installed **i-PESO Mobile** app on the phone. Do not open Expo Go.

Keep the development server and Laravel backend terminals open while using the app.

### 11. Test the App

Confirm that:

- The i-PESO app opens from its own Android icon.
- The login screen loads.
- Registration can reach the backend.
- The phone can load data from the Laravel API.
- Login and other API actions work normally.

For local email verification, check the OTP in:

```text
i-peso-backend\storage\logs\laravel.log
```

You can also run:

```powershell
Get-Content C:\i-PESO-CAPSTONE-SYSTEM\i-peso-backend\storage\logs\laravel.log -Tail 80
```

## Running the App Again Later

If the app is already installed:

1. Connect the phone by USB.
2. Start Laravel:

```powershell
cd C:\i-PESO-CAPSTONE-SYSTEM\i-peso-backend
php artisan serve --host=0.0.0.0 --port=8000
```

3. Start the mobile development server:

```powershell
cd C:\i-PESO-CAPSTONE-SYSTEM\i-peso-mobile
npx expo start --dev-client --lan -c
```

4. Open the installed i-PESO app.

Run `npx expo run:android` again when native dependencies, Android configuration, or native code changes. For ordinary JavaScript or TypeScript changes, the development server is usually enough.

## Common Problems

### `adb devices` shows no phone

- Enable USB Debugging.
- Unlock the phone and accept the authorization prompt.
- Use a data-capable USB cable.
- Install the phone's USB driver.
- Try another USB port.

### The app says it cannot connect to the backend

- Confirm Laravel is running on port `8000`.
- Confirm Laravel uses `--host=0.0.0.0`.
- Confirm `.env.local` contains the laptop's current IPv4 address.
- Restart the app after changing `.env.local`.
- Restart Metro with `npx expo start --dev-client --lan -c`.
- Check Windows Firewall and Wi-Fi isolation settings.

### `npx expo run:android` fails during the Android build

- Confirm Android Studio and the Android SDK are installed.
- Confirm Android SDK Platform-Tools are available.
- Open Android Studio once and finish its setup wizard.
- Confirm the phone appears as `device` in `adb devices`.
- Accept any Android SDK license prompts.

### Registration returns a validation error

This usually means the backend is reachable. Check that:

- The email address is not already registered.
- The Philippine mobile number uses the format `09XXXXXXXXX`.
- The password has at least eight characters.
- Password confirmation matches the password.

## Final Checklist

- [ ] Android Studio and Android SDK are installed.
- [ ] USB Debugging is enabled.
- [ ] `adb devices` shows the phone as `device`.
- [ ] Phone and laptop use the same Wi-Fi.
- [ ] Laravel runs on `0.0.0.0:8000`.
- [ ] `.env.local` uses the laptop's Wi-Fi IPv4 address.
- [ ] The phone browser can reach the backend.
- [ ] `npx expo run:android` installs the app.
- [ ] The installed i-PESO app opens without Expo Go.
- [ ] `npx expo start --dev-client --lan -c` is running for development updates.
