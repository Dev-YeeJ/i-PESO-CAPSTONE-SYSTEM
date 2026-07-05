<?php

namespace Tests\Feature;

use App\Mail\AccountVerificationStatusMail;
use App\Mail\OtpMail;
use Tests\TestCase;

class EmailBrandingTest extends TestCase
{
    public function test_otp_email_renders_the_shared_brand_and_security_content(): void
    {
        $html = (new OtpMail('620526'))->render();

        $this->assertStringContainsString('i-PESO', $html);
        $this->assertStringContainsString('620526', $html);
        $this->assertStringContainsString('Keep this code private', $html);
        $this->assertMatchesRegularExpression('/(?:cid:|data:image\/png;base64,|i_peso_app_icon_1024\.png)/', $html);
    }

    public function test_account_status_email_uses_the_shared_website_layout(): void
    {
        $html = (new AccountVerificationStatusMail(
            recipientName: 'Juan Dela Cruz',
            accountType: 'Job Seeker',
            status: 'verified',
            portalUrl: 'http://localhost:5173/login',
        ))->render();

        $this->assertStringContainsString('Juan Dela Cruz', $html);
        $this->assertStringContainsString('Account approved', $html);
        $this->assertStringContainsString('Open i-PESO', $html);
        $this->assertMatchesRegularExpression('/(?:cid:|data:image\/png;base64,|i_peso_app_icon_1024\.png)/', $html);
    }
}
