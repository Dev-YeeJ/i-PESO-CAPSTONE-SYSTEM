# i-PESO Production Deployment

This guide targets an Ubuntu server using Nginx, PHP-FPM, MySQL, Node.js, Supervisor, and HTTPS.

## 1. Server requirements

- Ubuntu 22.04 or newer
- Nginx
- PHP 8.2+ with `curl`, `fileinfo`, `gd`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, `xml`, and `zip`
- Composer 2
- Node.js 22 and npm
- MySQL 8
- Supervisor
- Git and Certbot
- Two DNS records: `example.com` for React and `api.example.com` for Laravel

## 2. Install the project

```bash
sudo mkdir -p /var/www/i-peso
sudo chown -R "$USER":www-data /var/www/i-peso
git clone YOUR_REPOSITORY_URL /var/www/i-peso
```

Create the production configuration:

```bash
cd /var/www/i-peso/i-peso-backend
cp .env.production.example .env
php artisan key:generate

cd ../i-peso-frontend
cp .env.production.example .env.production
```

Replace every `example.com` and `CHANGE_ME` value. Never commit the completed `.env` files.

## 3. Database and mail

Create a dedicated MySQL database and user with access only to that database. Configure a transactional email provider or authenticated SMTP account. Do not use a personal Gmail password; use an app password only for demonstrations.

## 4. First deployment

```bash
cd /var/www/i-peso
chmod +x deployment/deploy.sh
sudo -u www-data ./deployment/deploy.sh /var/www/i-peso
```

Give Laravel write access:

```bash
sudo chown -R www-data:www-data i-peso-backend/storage i-peso-backend/bootstrap/cache
sudo chmod -R ug+rwX i-peso-backend/storage i-peso-backend/bootstrap/cache
```

## 5. Nginx and HTTPS

Copy both files from `deployment/nginx` to `/etc/nginx/sites-available`, replace the example domains, and enable them:

```bash
sudo ln -s /etc/nginx/sites-available/i-peso-api.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/i-peso-frontend.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d example.com -d www.example.com -d api.example.com
```

## 6. Queue worker and scheduler

```bash
sudo cp deployment/supervisor/i-peso-worker.conf /etc/supervisor/conf.d/
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status i-peso-worker:*
```

Add Laravel's scheduler:

```cron
* * * * * cd /var/www/i-peso/i-peso-backend && php artisan schedule:run >> /dev/null 2>&1
```

The queue worker is mandatory for email and website notifications.

## 7. Release verification

```bash
curl -I https://api.example.com/up
sudo supervisorctl status
cd /var/www/i-peso/i-peso-backend
php artisan migrate:status
php artisan queue:failed
php artisan app:production-check
```

Then test:

1. Employer registration and document upload.
2. Admin document preview and rejection notes.
3. Employer email and notification bell.
4. Employer approval and job posting.
5. Logout and protected-route access.

## 8. Backups

Back up MySQL and `i-peso-backend/storage/app/private` every day. Keep at least one encrypted off-server copy and perform a restore test before the capstone presentation.

## 9. Required production values

- `APP_ENV=production`
- `APP_DEBUG=false`
- HTTPS URLs in `APP_URL`, `FRONTEND_URL`, and `VITE_API_BASE_URL`
- Exact frontend origin in `CORS_ALLOWED_ORIGINS`
- Correct domains in `SANCTUM_STATEFUL_DOMAINS`
- `SESSION_SECURE_COOKIE=true`
- `SESSION_ENCRYPT=true`
- `EMPLOYER_DOCUMENTS_DISK=local`
- `QUEUE_CONNECTION=database`
- Valid SMTP credentials
