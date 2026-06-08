

Install:

1. Git: https://git-scm.com/download/win
2. XAMPP with PHP 8.2 or newer: https://www.apachefriends.org/
3. Composer 2: https://getcomposer.org/download/
4. Node.js 22 LTS: https://nodejs.org/
5. Visual Studio Code: https://code.visualstudio.com/
6. Google Chrome or Microsoft Edge

Restart the computer after installation.

No VS Code extension or browser plugin is required.

## 2. Check the Installation

Open PowerShell:

```powershell
git --version
php -v
composer --version
node --version
npm --version
```

Required versions:

```text
PHP 8.2 or newer
Composer 2
Node.js 22 recommended
```

If `php` is not recognized, add this folder to the Windows `Path`:

```text
C:\xampp\php
```

Restart PowerShell and run `php -v` again.

## 3. Enable PHP Extensions

Open:

```text
C:\xampp\php\php.ini
```

Find these lines and remove the semicolon `;` at the beginning:

```ini
extension=curl
extension=fileinfo
extension=gd
extension=mbstring
extension=mysqli
extension=openssl
extension=pdo_mysql
extension=pdo_sqlite
extension=zip
```

Save the file and restart XAMPP.

## 4. Download the Project

Open PowerShell:

```powershell
New-Item -ItemType Directory -Force C:\projects
Set-Location C:\projects
git clone <GITHUB_REPOSITORY_URL>
Set-Location i-peso-capstone-system
```

Replace `<GITHUB_REPOSITORY_URL>` with the real repository URL.

If the repository is private, sign in to GitHub when requested.

## 5. Create the Database

1. Open **XAMPP Control Panel**.
2. Start **Apache**.
3. Start **MySQL**.
4. Open `http://localhost/phpmyadmin`.
5. Click **Databases**.
6. Create:

```text
i_peso_db
```

Use:

```text
utf8mb4_unicode_ci
```

Keep MySQL running.

## 6. Set Up the Backend

Open PowerShell:

```powershell
Set-Location C:\projects\i-peso-capstone-system\i-peso-backend
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Open:

```text
i-peso-backend\.env
```

Keep the generated `APP_KEY` and configure the file like this:

```env
APP_NAME="i-PESO Urdaneta City"
APP_ENV=local
APP_KEY=KEEP_THE_GENERATED_KEY
APP_DEBUG=true
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

LOG_CHANNEL=stack
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=i_peso_db
DB_USERNAME=root
DB_PASSWORD=

SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=database
FILESYSTEM_DISK=public

MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=jaimeyeev.2@gmail.com
MAIL_PASSWORD=<GMAIL_APP_PASSWORD_FROM_DEVELOPER>
MAIL_FROM_ADDRESS=jaimeyeev.2@gmail.com
MAIL_FROM_NAME="i-PESO Urdaneta City"
```

Ask the developer privately for the Gmail App Password. Do not share or commit it.

Run:

```powershell
php artisan optimize:clear
php artisan migrate --force
php artisan db:seed --class=AdminSeeder
php artisan storage:link
```

If `storage:link` says the link already exists, continue.

## 7. Set Up the Frontend

Open another PowerShell window:

```powershell
Set-Location C:\projects\i-peso-capstone-system\i-peso-frontend
npm install
```

Create:

```text
i-peso-frontend\.env
```

Add:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## 8. Run the System

Keep MySQL running in XAMPP.

Open three PowerShell windows.

### Terminal 1: Backend

```powershell
Set-Location C:\projects\i-peso-capstone-system\i-peso-backend
php artisan serve --host=127.0.0.1 --port=8000
```

### Terminal 2: Email Queue

```powershell
Set-Location C:\projects\i-peso-capstone-system\i-peso-backend
php artisan queue:work --sleep=3 --tries=3 --timeout=60
```

### Terminal 3: Frontend

```powershell
Set-Location C:\projects\i-peso-capstone-system\i-peso-frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

If Windows Firewall asks for permission, allow PHP and Node.js on private networks.

## 9. Admin Login

```text
Email: admin@peso.com
Password: password123
```

## 10. Run the System Again

The installation is only required once.

For the next session:

1. Start Apache and MySQL in XAMPP.
2. Start the backend:

```powershell
Set-Location C:\projects\i-peso-capstone-system\i-peso-backend
php artisan serve --host=127.0.0.1 --port=8000
```

3. Start the queue:

```powershell
Set-Location C:\projects\i-peso-capstone-system\i-peso-backend
php artisan queue:work --sleep=3 --tries=3 --timeout=60
```

4. Start the frontend:

```powershell
Set-Location C:\projects\i-peso-capstone-system\i-peso-frontend
npm run dev
```

5. Open `http://localhost:5173`.

## 11. Quick Fixes

### Database connection error

Confirm MySQL is running and the database is named `i_peso_db`.

```powershell
Set-Location C:\projects\i-peso-capstone-system\i-peso-backend
php artisan optimize:clear
```

### Port is already being used

Close old PHP or Node terminals.

```powershell
Get-NetTCPConnection -State Listen -LocalPort 8000,5173
```

### Upload preview does not work

```powershell
Set-Location C:\projects\i-peso-capstone-system\i-peso-backend
php artisan storage:link
```

### Email does not send

Confirm the queue terminal is running.

```powershell
php artisan queue:failed
Get-Content storage\logs\laravel.log -Tail 100
```

### Frontend cannot connect

Confirm:

```text
Frontend: http://localhost:5173
Backend: http://localhost:8000
API: http://localhost:8000/api
```

## 12. Stop the System

Press `Ctrl + C` in all three PowerShell terminals.

Stop Apache and MySQL in XAMPP.
