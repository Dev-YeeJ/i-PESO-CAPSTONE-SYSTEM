<?php

namespace App\Providers;

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
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        JobSeeker::observe(JobSeekerObserver::class);
        \Illuminate\Support\Facades\Event::listen(
            \App\Events\ApplicationStatusChanged::class,
            \App\Listeners\SendApplicationStatusNotification::class
        );
    }
}
