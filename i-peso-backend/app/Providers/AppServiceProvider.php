<?php

namespace App\Providers;

use App\Services\Sms\LogOnlySmsProvider;
use App\Services\Sms\SmsProviderInterface;
use App\Services\Sms\UniSmsProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
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

        // Baseline for `throttleApi()` (bootstrap/app.php) — every route
        // without its own more specific `throttle:` rule falls back to this.
        // Keyed by authenticated user (any of the three Sanctum-guarded
        // models — getAuthIdentifier() is column-name-agnostic) so one
        // account's usage can't exhaust another's, else by IP.
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->getAuthIdentifier() ?: $request->ip());
        });
    }
}
