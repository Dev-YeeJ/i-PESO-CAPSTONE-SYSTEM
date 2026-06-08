<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ProductionReadinessCheck extends Command
{
    protected $signature = 'app:production-check';

    protected $description = 'Validate critical i-PESO production configuration and infrastructure';

    public function handle(): int
    {
        $checks = [
            $this->check('Production environment', app()->environment('production'), app()->environment()),
            $this->check('Debug mode disabled', ! (bool) config('app.debug'), config('app.debug') ? 'enabled' : 'disabled'),
            $this->check('Application key configured', filled(config('app.key')), 'APP_KEY'),
            $this->httpsCheck('Backend HTTPS URL', (string) config('app.url')),
            $this->httpsCheck('Frontend HTTPS URL', (string) config('app.frontend_url')),
            $this->check(
                'Private employer documents',
                config('filesystems.employer_documents_disk') !== 'public',
                (string) config('filesystems.employer_documents_disk')
            ),
            $this->check(
                'Persistent queue configured',
                ! in_array(config('queue.default'), ['sync', 'null'], true),
                (string) config('queue.default')
            ),
            $this->check(
                'Real mailer configured',
                ! in_array(config('mail.default'), ['log', 'array'], true),
                (string) config('mail.default')
            ),
            $this->check(
                'SMTP credentials configured',
                config('mail.default') !== 'smtp'
                    || (filled(config('mail.mailers.smtp.username')) && filled(config('mail.mailers.smtp.password'))),
                'MAIL_USERNAME and MAIL_PASSWORD'
            ),
            $this->corsCheck(),
            $this->databaseCheck(),
            $this->storageCheck(),
        ];

        $this->table(
            ['Check', 'Result', 'Details'],
            array_map(fn (array $check) => [
                $check['name'],
                $check['passed'] ? 'PASS' : 'FAIL',
                $check['details'],
            ], $checks)
        );

        $failed = collect($checks)->contains(fn (array $check) => ! $check['passed']);

        if ($failed) {
            $this->error('Production readiness check failed.');

            return self::FAILURE;
        }

        $this->info('Production readiness check passed.');

        return self::SUCCESS;
    }

    private function check(string $name, bool $passed, string $details): array
    {
        return compact('name', 'passed', 'details');
    }

    private function httpsCheck(string $name, string $url): array
    {
        return $this->check($name, str_starts_with($url, 'https://'), $url ?: 'not configured');
    }

    private function corsCheck(): array
    {
        $origins = config('cors.allowed_origins', []);
        $valid = $origins !== []
            && collect($origins)->every(
                fn (string $origin) => str_starts_with($origin, 'https://')
                    && ! str_contains($origin, 'localhost')
            );

        return $this->check('Production CORS origins', $valid, implode(', ', $origins));
    }

    private function databaseCheck(): array
    {
        try {
            DB::connection()->getPdo();

            return $this->check('Database connection', true, (string) config('database.default'));
        } catch (Throwable $exception) {
            return $this->check('Database connection', false, $exception->getMessage());
        }
    }

    private function storageCheck(): array
    {
        try {
            $disk = (string) config('filesystems.employer_documents_disk');
            $path = '.production-readiness-check';
            Storage::disk($disk)->put($path, 'ok');
            $writable = Storage::disk($disk)->exists($path);
            Storage::disk($disk)->delete($path);

            return $this->check('Private storage writable', $writable, $disk);
        } catch (Throwable $exception) {
            return $this->check('Private storage writable', false, $exception->getMessage());
        }
    }
}
