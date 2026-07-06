<?php

namespace App\Services\Sms;

class PhoneNumberNormalizer
{
    public function normalize(?string $phoneNumber): ?string
    {
        if (! filled($phoneNumber)) {
            return null;
        }

        $number = preg_replace('/[^0-9+]/', '', trim($phoneNumber));
        if (str_starts_with($number, '+')) {
            $number = '+'.preg_replace('/\D/', '', substr($number, 1));
        } else {
            $number = preg_replace('/\D/', '', $number);
        }

        if (preg_match('/^09\d{9}$/', $number)) {
            return '+63'.substr($number, 1);
        }
        if (preg_match('/^639\d{9}$/', $number)) {
            return '+'.$number;
        }
        if (preg_match('/^\+639\d{9}$/', $number)) {
            return $number;
        }

        return null;
    }

    public function mask(?string $phoneNumber): string
    {
        $normalized = $this->normalize($phoneNumber);
        if (! $normalized) {
            return 'Not available';
        }

        return substr($normalized, 0, 4).'******'.substr($normalized, -3);
    }
}
