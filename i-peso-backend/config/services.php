<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'psoc' => [
        'token' => env('PSOC_API_TOKEN'),
        'base_url' => env('PSOC_API_BASE_URL', 'https://classification.psa.gov.ph/psoc'),
    ],

    'google_maps' => [
        'server_key' => env('GOOGLE_MAPS_SERVER_API_KEY'),
        'places_base_url' => env('GOOGLE_MAPS_PLACES_BASE_URL', 'https://places.googleapis.com/v1'),
        'geocoding_base_url' => env('GOOGLE_MAPS_GEOCODING_BASE_URL', 'https://maps.googleapis.com/maps/api/geocode'),
        'routes_base_url' => env('GOOGLE_MAPS_ROUTES_BASE_URL', 'https://routes.googleapis.com'),
        'country_code' => env('GOOGLE_MAPS_COUNTRY_CODE', 'PH'),
        'language' => env('GOOGLE_MAPS_LANGUAGE', 'en'),
        'routes_enabled' => env('GOOGLE_MAPS_ROUTES_ENABLED', false),
    ],

    'vertex_ai' => [
        'enabled' => env('GOOGLE_VERTEX_AI_ENABLED', false),
        'project_id' => env('GOOGLE_CLOUD_PROJECT_ID'),
        'location' => env('GOOGLE_CLOUD_LOCATION', 'us-central1'),
        'model' => env('GOOGLE_VERTEX_AI_MODEL', 'gemini-2.5-flash'),
        'access_token' => env('GOOGLE_VERTEX_AI_ACCESS_TOKEN'),
        'credentials_path' => env('GOOGLE_APPLICATION_CREDENTIALS'),
        'timeout' => env('GOOGLE_VERTEX_AI_TIMEOUT', 20),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'calendar_redirect' => env('GOOGLE_CALENDAR_REDIRECT_URI', 'http://localhost:8000/api/employer/calendar/callback'),
        'calendar_id' => env('GOOGLE_CALENDAR_ID', 'primary'),
    ],

    'jobdatalake' => [
        'key' => env('JOB_DATA_LAKE_API_KEY'),
        'base_url' => env('JOB_DATA_LAKE_BASE_URL', 'https://api.jobdatalake.com'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
