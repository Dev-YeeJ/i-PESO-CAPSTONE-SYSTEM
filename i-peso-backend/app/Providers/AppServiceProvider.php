<?php

namespace App\Providers;

use App\Services\Sms\LogOnlySmsProvider;
use App\Services\Sms\SmsProviderInterface;
use App\Services\Sms\UniSmsProvider;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;
use App\Models\JobSeeker;
use App\Observers\JobSeekerObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(SmsProviderInterface::class, function ($app) {
            $liveRequested = config('services.sms.driver') === 'unisms'
                && config('services.sms.provider') === 'unisms'
                && ! config('services.sms.log_only')
                && filled(config('services.sms.secret_key'))
                && filled(config('services.sms.sender_id'));

            return $liveRequested
                ? $app->make(UniSmsProvider::class)
                : $app->make(LogOnlySmsProvider::class);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Throws in local/testing the instant a relation is accessed without
        // being eager-loaded, instead of silently firing an extra query.
        // Off in production: an unnoticed N+1 there should degrade
        // performance, not 500 the request.
        Model::preventLazyLoading(! $this->app->isProduction());

        JobSeeker::observe(JobSeekerObserver::class);
        \Illuminate\Support\Facades\Event::listen(
            \App\Events\ApplicationStatusChanged::class,
            \App\Listeners\SendApplicationStatusNotification::class
        );
    }
}
