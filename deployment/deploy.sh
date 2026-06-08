#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-/var/www/i-peso}"
BACKEND_DIR="$ROOT_DIR/i-peso-backend"
FRONTEND_DIR="$ROOT_DIR/i-peso-frontend"

cd "$BACKEND_DIR"
php artisan down --retry=60

composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan employer-documents:migrate-private
php artisan storage:link
php artisan optimize
php artisan app:production-check
php artisan queue:restart

cd "$FRONTEND_DIR"
npm ci
npm run check:production

cd "$BACKEND_DIR"
php artisan up

echo "Deployment complete. Verify /up, the queue worker, login, and one test notification."
