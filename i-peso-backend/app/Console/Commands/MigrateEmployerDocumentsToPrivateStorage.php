<?php

namespace App\Console\Commands;

use App\Models\EmployerDocument;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrateEmployerDocumentsToPrivateStorage extends Command
{
    protected $signature = 'employer-documents:migrate-private {--delete-source : Delete public files after verified copy}';

    protected $description = 'Copy legacy employer documents from public storage to the configured private disk';

    public function handle(): int
    {
        $targetDisk = (string) config('filesystems.employer_documents_disk', 'local');

        if ($targetDisk === 'public') {
            $this->error('EMPLOYER_DOCUMENTS_DISK must not be public.');

            return self::FAILURE;
        }

        $copied = 0;
        $alreadyPrivate = 0;
        $missing = 0;

        EmployerDocument::query()
            ->orderBy('document_id')
            ->each(function (EmployerDocument $document) use (
                $targetDisk,
                &$copied,
                &$alreadyPrivate,
                &$missing
            ): void {
                $path = $document->document_path;

                if (Storage::disk($targetDisk)->exists($path)) {
                    $alreadyPrivate++;

                    return;
                }

                if (! Storage::disk('public')->exists($path)) {
                    $missing++;
                    $this->warn("Missing document #{$document->document_id}: {$path}");

                    return;
                }

                $stream = Storage::disk('public')->readStream($path);
                $stored = $stream !== false && Storage::disk($targetDisk)->writeStream($path, $stream);

                if (is_resource($stream)) {
                    fclose($stream);
                }

                if (! $stored || ! Storage::disk($targetDisk)->exists($path)) {
                    $this->error("Unable to copy document #{$document->document_id}: {$path}");

                    return;
                }

                if ($this->option('delete-source')) {
                    Storage::disk('public')->delete($path);
                }

                $copied++;
            });

        $this->info("Copied: {$copied}; already private: {$alreadyPrivate}; missing: {$missing}.");

        return $missing === 0 ? self::SUCCESS : self::FAILURE;
    }
}
