<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CookieConsent;
use Illuminate\Http\Request;

class CookieConsentController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'status' => 'required|in:accepted,declined',
        ]);

        CookieConsent::create([
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'status' => $request->status,
        ]);

        return response()->json(['message' => 'Cookie consent saved.']);
    }
}
