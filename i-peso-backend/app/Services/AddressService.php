<?php

namespace App\Services;

class AddressService
{
    /**
     * Build a full display address from individual components.
     * Removes duplicates and standardizes casing.
     */
    public function buildFullAddress(
        ?string $street,
        ?string $barangay,
        ?string $city,
        ?string $province,
        ?string $region = null
    ): string {
        $components = [
            $this->cleanText($street),
            $this->cleanText($barangay),
            $this->cleanText($city),
            $this->cleanText($province),
        ];

        if ($region) {
            $components[] = $this->cleanText($region);
        }

        $filtered = array_values(array_filter(array_unique($components)));

        if (empty($filtered)) {
            return 'N/A';
        }

        return implode(', ', $filtered);
    }

    /**
     * Calculate an address completeness score (0-100).
     */
    public function getCompletenessScore(
        ?string $street,
        ?string $barangay,
        ?string $city,
        ?string $province
    ): int {
        $score = 0;
        
        if (!empty(trim($province ?? ''))) $score += 25;
        if (!empty(trim($city ?? ''))) $score += 25;
        if (!empty(trim($barangay ?? ''))) $score += 25;
        if (!empty(trim($street ?? ''))) $score += 25;

        return $score;
    }

    /**
     * Cleans whitespace and standardizes casing for a single address component.
     */
    private function cleanText(?string $text): ?string
    {
        if (empty($text)) {
            return null;
        }

        $text = trim(preg_replace('/\s+/', ' ', $text));
        
        // Basic title casing, but keep things like "NCRP", "NCR" upper
        $uppers = ['NCR', 'NCRP', 'CAR', 'ARMM', 'BARMM', 'MIMAROPA', 'SOCCSKSARGEN'];
        if (in_array(strtoupper($text), $uppers, true)) {
            return strtoupper($text);
        }

        return ucwords(strtolower($text));
    }
}
