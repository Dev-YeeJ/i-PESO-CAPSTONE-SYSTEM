<?php

namespace App\Services;

class LocationService
{
    /**
     * Compute Haversine distance between two points in kilometers.
     */
    public function getDistanceKm(?float $lat1, ?float $lon1, ?float $lat2, ?float $lon2): ?float
    {
        if ($lat1 === null || $lon1 === null || $lat2 === null || $lon2 === null) {
            return null;
        }

        $earthRadius = 6371; // km

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);
            
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($earthRadius * $c, 2);
    }

    /**
     * Ensure coordinates are within valid ranges.
     */
    public function isValidCoordinate(?float $lat, ?float $lng): bool
    {
        if ($lat === null || $lng === null) {
            return false;
        }

        return ($lat >= -90 && $lat <= 90) && ($lng >= -180 && $lng <= 180);
    }

    /**
     * Format a Google Maps direction URL based on coordinates or address.
     */
    public function getGoogleMapsUrl(?float $lat, ?float $lng, ?string $address = null): ?string
    {
        if ($this->isValidCoordinate($lat, $lng)) {
            return "https://www.google.com/maps/search/?api=1&query={$lat},{$lng}";
        }

        if (!empty($address) && $address !== 'N/A') {
            $query = urlencode($address);
            return "https://www.google.com/maps/search/?api=1&query={$query}";
        }

        return null;
    }

    /**
     * Verify if location coordinates are complete.
     */
    public function hasValidCoordinates($model): bool
    {
        return $this->isValidCoordinate($model->latitude, $model->longitude);
    }
}
