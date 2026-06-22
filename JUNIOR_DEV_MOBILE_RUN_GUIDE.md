# Junior Developer Mobile Run Guide

Use this guide when the i-PESO mobile app opens but registration shows:

```text
Registration failed. Check your connection to the i-PESO backend.
```

That message usually means the phone cannot reach the Laravel API. The mobile app must call the computer's LAN IP address, not `localhost` or `127.0.0.1`.

## Apps Involved

- `i-peso-backend`: Laravel API, must run on port `8000`
- `i-peso-mobile`: Expo mobile app

## Required Tools

- PHP and Composer
- Node.js LTS and npm
- Expo Go on the phone, or an Android emulator
- Phone and laptop connected to the same Wi-Fi network

On Windows PowerShell, use `npm.cmd` and `npx.cmd` if normal `npm` or `npx` is blocked by execution policy.

## 1. Start the Backend for Phone Access

From the project root:

```powershell
.\start-backend-8000.ps1
```

This script runs:

```powershell
php artisan serve --host=0.0.0.0 --port=8000
```

Important: `0.0.0.0` allows other devices on the same Wi-Fi network to reach the backend. If you run Laravel with `127.0.0.1`, the phone cannot connect.

Keep this terminal open.

## 2. Find the Computer's LAN IP Address

Open a second PowerShell terminal:

```powershell
ipconfig
```

Look for the active Wi-Fi adapter and copy the `IPv4 Address`.

Example:

```text
IPv4 Address . . . . . . . . . . . : 192.168.1.25
```

In the examples below, replace `192.168.1.25` with your own computer IP.

## 3. Confirm the Phone Can See the Backend

On the phone browser, open:

```text
http://192.168.1.25:8000
```

Expected result:

- A Laravel page loads, or
- The browser reaches the server without a connection error

If the phone cannot open it:

- Make sure phone and laptop are on the same Wi-Fi.
- Allow PHP/Laravel through Windows Defender Firewall when prompted.
- Temporarily turn off VPN/hotspot isolation if it blocks local devices.
- Recheck the IP address with `ipconfig`; it can change after reconnecting Wi-Fi.

## 4. Set the Mobile API URL

Create this file if it does not exist:

```text
i-peso-mobile/.env.local
```

Add:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.25:8000/api
```

Again, replace `192.168.1.25` with the computer's real IPv4 address.

Do not use this for a physical phone:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

On a phone, `localhost` means the phone itself, not the laptop.

## 5. Start the Mobile App

Open a third PowerShell terminal:

```powershell
cd i-peso-mobile
npm.cmd install
npx.cmd expo start --lan -c
```

Scan the QR code with Expo Go.

Use `--lan` so the phone connects through the local network. Use `-c` so Expo clears its cache and reloads the new `EXPO_PUBLIC_API_URL`.

## 6. Test Registration

In the mobile app:

1. Open Register.
2. Enter a new job seeker email.
3. Use a valid Philippine mobile number, for example:

```text
09171234567
```

4. Use a password with at least 8 characters.
5. Tap Create Account.

Expected result:

- The app moves to the email verification screen.
- The backend returns `Registration successful. Please check your email for your verification code.`

The mobile registration payload is seeker-only:

```json
{
  "role": "seeker",
  "first_name": "Juan",
  "last_name": "Dela Cruz",
  "email": "juan.mobile.test@example.com",
  "mobile_number": "09171234567",
  "password": "password123",
  "password_confirmation": "password123"
}
```

## 7. Get the OTP in Local Development

The backend default mail setup logs OTP emails locally.

Open:

```text
i-peso-backend/storage/logs/laravel.log
```

Or run:

```powershell
Get-Content i-peso-backend\storage\logs\laravel.log -Tail 80
```

Find the latest OTP email content and enter the 6-digit code in the mobile verification screen.

## Quick Backend Health Check

From the laptop:

```powershell
Test-NetConnection 127.0.0.1 -Port 8000
Test-NetConnection 192.168.1.25 -Port 8000
```

Both should show:

```text
TcpTestSucceeded : True
```

If `127.0.0.1` works but the LAN IP fails, the backend is not bound to `0.0.0.0` or Windows Firewall is blocking it.

## Common Fixes

### Still Getting the Registration Failed Connection Message

Check these first:

- Backend terminal is still running.
- Backend command uses `--host=0.0.0.0 --port=8000`.
- `i-peso-mobile/.env.local` uses `http://<computer-ip>:8000/api`.
- Expo was restarted with `npx.cmd expo start --lan -c`.
- Phone and laptop are on the same Wi-Fi.
- Windows Firewall allows PHP.

### Android Emulator Instead of Physical Phone

For Android emulator, use:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
```

Then restart Expo:

```powershell
npx.cmd expo start -c
```

### 422 Validation Error

If the backend is reachable but the app shows a field error, that is not a connection problem. Fix the form data:

- Email must be unique.
- Mobile number must match `09XXXXXXXXX`.
- Password must be at least 8 characters.
- Password and confirmation must match.

### Too Many Attempts

The register endpoint is throttled. Wait one minute, then try again with a new email if needed.

## Final Success Checklist

- [ ] Backend runs on `0.0.0.0:8000`
- [ ] Phone can open `http://<computer-ip>:8000`
- [ ] `i-peso-mobile/.env.local` has `EXPO_PUBLIC_API_URL=http://<computer-ip>:8000/api`
- [ ] Expo starts with `npx.cmd expo start --lan -c`
- [ ] Job seeker registration reaches the verify-email screen
- [ ] OTP can be found in `i-peso-backend/storage/logs/laravel.log`
