<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmployerVerificationProgressUpdated extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $event,
        public ?string $documentType = null,
        public ?string $remarks = null,
    ) {
    }

    public function via(object $notifiable): array
    {
        return in_array($this->event, [
            'registration_submitted',
            'registration_resubmitted',
            'document_rejected',
            'all_required_documents_approved',
        ], true)
            ? ['database', 'mail']
            : ['database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $content = $this->content();
        
        return (new MailMessage)
            ->subject($content['subject'])
            ->view('emails.employer-verification', [
                'title' => $content['title'],
                'message' => $content['message'],
                'status' => $content['status'],
                'documentType' => $this->documentType,
                'documentLabel' => $this->documentLabel(),
                'remarks' => $this->remarks,
                'actionLabel' => $content['action_label'],
                'actionUrl' => $this->actionUrl(),
            ]);
    }

    public function toArray(object $notifiable): array
    {
        $content = $this->content();

        return [
            'event' => $this->event,
            'title' => $content['title'],
            'message' => $content['message'],
            'status' => $content['status'],
            'document_type' => $this->documentType,
            'document_label' => $this->documentLabel(),
            'remarks' => $this->remarks,
            'action_url' => '/employer/dashboard',
            'employer_id' => $notifiable->getKey(),
        ];
    }

    private function content(): array
    {
        return match ($this->event) {
            'registration_resubmitted' => [
                'subject' => 'Your corrected i-PESO application was resubmitted',
                'title' => 'Application resubmitted',
                'message' => 'PESO received your corrected employer application and placed it back in the verification queue.',
                'status' => 'pending',
                'action_label' => 'Track Application',
            ],
            'document_rejected' => [
                'subject' => 'Action required for your i-PESO employer document',
                'title' => $this->documentLabel().' needs correction',
                'message' => 'PESO could not approve your '.$this->documentLabel().'. Please review the notes and upload a corrected document.',
                'status' => 'action_required',
                'action_label' => 'Review Requirement',
            ],
            'document_approved' => [
                'subject' => 'An employer document was approved',
                'title' => $this->documentLabel().' approved',
                'message' => 'PESO approved your '.$this->documentLabel().'. The remaining requirements are still being reviewed.',
                'status' => 'progress',
                'action_label' => 'View Progress',
            ],
            'all_required_documents_approved' => [
                'subject' => 'All required i-PESO employer documents are approved',
                'title' => 'All required documents approved',
                'message' => 'PESO approved all required company documents. Your employer account is now awaiting the final verification decision.',
                'status' => 'pending',
                'action_label' => 'Track Application',
            ],
            default => [
                'subject' => 'Your i-PESO employer application was submitted',
                'title' => 'Application submitted',
                'message' => 'PESO received your employer registration and requirements. Your application is now waiting for review.',
                'status' => 'pending',
                'action_label' => 'Track Application',
            ],
        };
    }

    private function documentLabel(): string
    {
        return match ($this->documentType) {
            'mayors_permit' => "Mayor's Permit",
            'bir_certificate' => 'BIR Certificate',
            'dti_certificate' => 'DTI Certificate',
            'sec_certificate' => 'SEC Certificate',
            'prpa_license' => 'PRPA License',
            'dme_poea_license' => 'DMW/POEA License',
            'philJobnet_proof' => 'PhilJobNet Proof',
            'government_id' => 'Government ID',
            'authorization_letter' => 'Authorization Letter',
            default => 'Submitted document',
        };
    }

    private function actionUrl(): string
    {
        return rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/').'/employer/dashboard';
    }
}
