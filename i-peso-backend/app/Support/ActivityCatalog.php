<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Turns an API request into an activity-log entry: an action key and a
 * sentence a PESO officer can read ("Published job fair #12").
 *
 * Writes (POST/PUT/PATCH/DELETE) are described from the route automatically,
 * with hand-written wording for routes the generic rules would phrase badly.
 * Reads (GET) are only logged for the routes listed in VIEWS: the ones that
 * open someone's personal data, which the Data Privacy Act asks us to trace.
 */
final class ActivityCatalog
{
    /**
     * Never logged: background calls that change nothing anyone cares about
     * (read receipts, device tokens, AI drafting helpers, map lookups) and
     * routes whose controllers already write their own entry.
     */
    private const IGNORED = [
        '#^api/auth/#',
        '#^api/(chat|geo)/#',
        '#^api/cookie-consent$#',
        '#/notifications/#',
        '#/notifications/read-all$#',
        '#/push-tokens$#',
        '#/ai-[a-z-]+$#',
        '#/nearby-jobs/ai-parse$#',
        '#/classify-occupation$#',
        '#/placement-reports/\{placementReport\}/preview$#',
    ];

    /** Hand-written wording: "METHOD uri" => [action, description]. ":id" is the last route parameter. */
    private const WRITES = [
        // Job seekers
        'POST api/seeker/profile' => ['updated_profile', 'Updated their profile.'],
        'PUT api/seeker/professional-summary' => ['updated_profile', 'Updated their professional summary.'],
        'POST api/seeker/profile-image' => ['updated_profile_photo', 'Uploaded a new profile photo.'],
        'DELETE api/seeker/profile-image' => ['removed_profile_photo', 'Removed their profile photo.'],
        'POST api/seeker/certificates' => ['uploaded_certificate', 'Uploaded a certificate.'],
        'DELETE api/seeker/certificates/{certificate}' => ['deleted_certificate', 'Deleted certificate #:id.'],
        'POST api/seeker/saved-jobs/{vacancy}' => ['saved_job', 'Saved or unsaved job #:id.'],
        'POST api/seeker/resume/generate' => ['generated_resume', 'Generated their resume.'],
        'POST api/seeker/employers/{employer}/report' => ['filed_safety_report', 'Filed a safety report about employer #:id.'],
        'POST api/seeker/safety-reports' => ['filed_safety_report', 'Filed a safety report about an employer.'],
        'POST api/seeker/safety-reports/{safetyReport}/details' => ['updated_safety_report', 'Added information to their safety report #:id.'],
        'PATCH api/seeker/work-experiences/{workExperience}/responsibilities' => ['updated_profile', 'Updated work experience #:id.'],
        'POST api/job-fairs/{id}/rsvp' => ['rsvp_job_fair', 'Registered for job fair #:id.'],

        // Employers
        'PUT api/employer/profile' => ['updated_company_profile', 'Updated the company profile.'],
        'POST api/employer/profile/logo' => ['updated_company_logo', 'Uploaded a new company logo.'],
        'POST api/employer/profile/photo' => ['updated_company_photo', 'Uploaded a company photo.'],
        'POST api/employer/register/company-type' => ['employer_registration', 'Chose the company type during registration.'],
        'PATCH api/employer/applications/{application}/status' => ['updated_application_status', 'Moved application #:id to :status.'],
        'PATCH api/employer/applications/bulk-status' => ['updated_application_status', 'Moved several applications to :status at once.'],
        'POST api/employer/reports/hiring-activity/export' => ['exported_report', 'Exported the hiring activity report.'],
        'POST api/employer/safety-reports' => ['filed_safety_report', 'Filed a safety report about a job seeker.'],
        'POST api/employer/safety-reports/{safetyReport}/details' => ['updated_safety_report', 'Added information to their safety report #:id.'],
        'PATCH api/admin/safety-reports/{safetyReport}' => ['updated_safety_report', 'Updated the priority or assignment of safety report #:id.'],
        'POST api/admin/safety-reports/{safetyReport}/notes' => ['added_safety_report_note', 'Added an internal note to safety report #:id.'],
        'POST api/employer/placement-reports' => ['uploaded_placement_report', 'Uploaded a placement report.'],
        'POST api/employer/placement-reports/manual' => ['created_placement_report', 'Started a placement report by hand.'],
        'POST api/employer/placement-reports/nil' => ['submitted_placement_report', 'Submitted a "no hires" placement report.'],
        'POST api/employer/placement-reports/{placementReport}/sheet' => ['uploaded_placement_report', 'Uploaded a spreadsheet to placement report #:id.'],
        'POST api/employer/placement-reports/{placementReport}/submit' => ['submitted_placement_report', 'Submitted placement report #:id to PESO.'],
        'PUT api/employer/placement-reports/{placementReport}/records' => ['updated_placement_report', 'Edited the hires in placement report #:id.'],
        'POST api/employer/job-fairs/{jobFair}/interest' => ['job_fair_interest', 'Said they are interested in job fair #:id.'],
        'POST api/employer/job-fairs/{jobFair}/respond' => ['job_fair_response', 'Answered the invitation to job fair #:id.'],
        'POST api/employer/job-fairs/{jobFair}/requirements/{requirement}' => ['uploaded_job_fair_requirement', 'Uploaded a requirement for a job fair.'],
        'POST api/employer/job-fairs/{jobFair}/results' => ['submitted_job_fair_results', 'Submitted results for job fair #:id.'],
        'POST api/employer/job-fairs/{jobFair}/confirmation-slip' => ['submitted_confirmation_slip', 'Submitted the confirmation slip for job fair #:id.'],
        'DELETE api/employer/job-fair-requirements/{submission}' => ['deleted_job_fair_requirement', 'Removed job fair requirement upload #:id.'],

        // PESO staff
        'POST api/admin/documents/{document}/download' => ['downloaded_employer_document', 'Downloaded employer document #:id.'],
        'POST api/admin/documents/{id}/review' => ['reviewed_employer_document', 'Reviewed employer document #:id (:status).'],
        'POST api/admin/job-fairs/{id}/banner' => ['updated_job_fair', 'Uploaded the banner for job fair #:id.'],
        'POST api/admin/job-fairs/{jobFair}/check-in' => ['job_fair_check_in', 'Registered an attendee at job fair #:id.'],
        'POST api/admin/job-fairs/{jobFair}/walk-ins' => ['job_fair_walk_in', 'Encoded a walk-in at job fair #:id.'],
        'POST api/admin/job-fairs/{jobFair}/invite' => ['sent_job_fair_invitations', 'Sent invitations for job fair #:id.'],
        'POST api/admin/job-fairs/{jobFair}/resend-invitations' => ['sent_job_fair_invitations', 'Resent invitations for job fair #:id.'],
        'POST api/admin/job-fairs/{jobFair}/proxy-results' => ['encoded_job_fair_results', 'Encoded results for an employer at job fair #:id.'],
        'POST api/admin/job-fairs/{jobFair}/proxy-confirmation-slip' => ['encoded_confirmation_slip', 'Encoded a confirmation slip for an employer at job fair #:id.'],
        'PATCH api/admin/job-fairs/{jobFair}/participants/{participation}' => ['updated_job_fair_participant', 'Updated an employer\'s participation in a job fair (:status).'],
        'PATCH api/admin/job-fair-requirements/{submission}/review' => ['reviewed_job_fair_requirement', 'Reviewed job fair requirement #:id (:status).'],
        'PATCH api/admin/job-fair-results/{resultReport}/review' => ['reviewed_job_fair_results', 'Reviewed job fair results #:id (:status).'],
        'PATCH api/admin/job-fair-confirmation-slips/{confirmationSlip}/review' => ['reviewed_confirmation_slip', 'Reviewed confirmation slip #:id (:status).'],
        'POST api/admin/reports/generate' => ['generated_report', 'Generated a labor market report.'],
        'POST api/admin/reports/generate-sprs' => ['generated_report', 'Generated an SPRS report.'],
        'PUT api/admin/reports/{id}/sprs' => ['updated_report', 'Edited SPRS report #:id.'],
        'POST api/admin/reports/hiring-activity/export' => ['exported_report', 'Exported the hiring activity report.'],
        'DELETE api/admin/sms-notifications' => ['cleared_sms_log', 'Cleared the SMS notification log.'],
        'POST api/admin/sms-notifications/{smsNotification}/retry' => ['retried_sms', 'Retried sending SMS #:id.'],
        'POST api/admin/occupation-mappings/{preference}/map' => ['mapped_occupation', 'Mapped a job seeker\'s preferred occupation (#:id).'],
        'POST api/admin/occupation-title-candidates/{candidate}/map' => ['mapped_occupation', 'Mapped occupation title #:id.'],
        'POST api/admin/occupation-title-candidates/{candidate}/reject' => ['rejected_occupation_title', 'Rejected occupation title #:id.'],
        'POST api/admin/placement-reports/{placementReport}/records/{record}/link' => ['linked_placement_record', 'Linked a hire in a placement report to a job seeker.'],
        'POST api/admin/government-programs/{governmentProgram}' => ['updated_government_program', 'Updated government program #:id.'],
    ];

    /** Reads worth recording: someone opened another person's data. */
    private const VIEWS = [
        'GET api/admin/seekers/{id}' => ['viewed_job_seeker', 'Opened job seeker #:id\'s profile.'],
        'GET api/admin/job-seekers/{id}/export-nsrp-pdf' => ['downloaded_nsrp', 'Downloaded job seeker #:id\'s NSRP form.'],
        'GET api/admin/seekers/export' => ['exported_job_seekers', 'Exported the job seeker list.'],
        'GET api/admin/safety-reports/{safetyReport}' => ['viewed_safety_report', 'Opened safety report #:id.'],
        'GET api/admin/safety-reports/{safetyReport}/attachments/{attachment}' => ['viewed_safety_evidence', 'Opened evidence file #:id of a safety report.'],
        'GET api/admin/employers/export' => ['exported_employers', 'Exported the employer list.'],
        'GET api/admin/documents/{document}/view' => ['viewed_employer_document', 'Opened employer document #:id.'],
        'GET api/admin/job-fair-requirements/{submission}/view' => ['viewed_job_fair_requirement', 'Opened job fair requirement #:id.'],
        'GET api/admin/job-fairs/{jobFair}/download-attendance-pdf' => ['downloaded_attendance', 'Downloaded the attendance list (PDF) of job fair #:id.'],
        'GET api/admin/job-fairs/{jobFair}/download-attendance-excel' => ['downloaded_attendance', 'Downloaded the attendance list (Excel) of job fair #:id.'],
        'GET api/admin/placement-reports/{placementReport}/export' => ['exported_placement_report', 'Exported placement report #:id (CSV).'],
        'GET api/admin/placement-reports/{placementReport}/export-pdf' => ['exported_placement_report', 'Exported placement report #:id (PDF).'],
        'GET api/employer/applications/{application}' => ['viewed_applicant', 'Opened the applicant in application #:id.'],
        'GET api/employer/applications/{application}/resume' => ['downloaded_resume', 'Downloaded the resume in application #:id.'],
    ];

    /** Same person opening the same record again within this many minutes is logged once. */
    public const VIEW_REPEAT_MINUTES = 10;

    /** @return array{0: string, 1: string}|null [action, description] */
    public static function describe(Request $request): ?array
    {
        $route = $request->route();
        if (! $route) {
            return null;
        }

        $uri = $route->uri();
        foreach (self::IGNORED as $pattern) {
            if (preg_match($pattern, $uri)) {
                return null;
            }
        }

        $method = $request->method() === 'PATCH' && in_array('PUT', $route->methods(), true) ? 'PUT' : $request->method();
        $key = "{$method} {$uri}";

        if ($request->isMethodSafe()) {
            return isset(self::VIEWS[$key]) ? self::fill(self::VIEWS[$key], $request) : null;
        }

        return isset(self::WRITES[$key]) ? self::fill(self::WRITES[$key], $request) : self::generic($request, $method, $uri);
    }

    private static function fill(array $entry, Request $request): array
    {
        [$action, $description] = $entry;

        $status = $request->input('status') ?? $request->input('decision') ?? $request->input('action');
        $replacements = [
            ':id' => (string) (self::lastParameter($request) ?? '?'),
            ':status' => is_string($status) && $status !== '' ? Str::of($status)->replace('_', ' ')->title()->toString() : 'a new status',
        ];

        return [$action, strtr($description, $replacements)];
    }

    /**
     * "POST api/admin/job-fairs/{jobFair}/publish" → Published job fair #12.
     * "PUT api/admin/citizen-charter/{citizenCharter}" → Updated citizen charter #3.
     */
    private static function generic(Request $request, string $method, string $uri): array
    {
        $segments = array_slice(explode('/', $uri), 2); // drop "api" and the area (admin/employer/seeker)
        $isParam = fn (string $segment) => str_starts_with($segment, '{');
        $id = self::lastParameter($request);
        $ref = $id !== null ? " #{$id}" : '';

        $count = count($segments);
        $endsWithVerb = $count >= 3 && ! $isParam($segments[$count - 1]) && $isParam($segments[$count - 2]);

        // POST .../job-fairs/{jobFair}/publish → verb "publish" on resource "job-fairs"
        $verb = $endsWithVerb ? str_replace('-', ' ', $segments[$count - 1]) : null;
        $nouns = array_values(array_filter($endsWithVerb ? array_slice($segments, 0, -1) : $segments, fn ($segment) => ! $isParam($segment)));
        $resource = Str::of(end($nouns) ?: 'record')->replace('-', ' ')->singular()->toString();

        if ($verb !== null) {
            $past = self::pastTense($verb);

            return [Str::snake("{$past} {$resource}"), ucfirst("{$past} {$resource}{$ref}.")];
        }

        $endsWithParam = $count > 0 && $isParam($segments[$count - 1]);

        return match ($method) {
            'POST' => ['created_'.Str::snake($resource), "Created a new {$resource}."],
            'PUT' => ['updated_'.Str::snake($resource), "Updated {$resource}{$ref}."],
            'DELETE' => $endsWithParam
                ? ['deleted_'.Str::snake($resource), "Deleted {$resource}{$ref}."]
                : ['cleared_'.Str::snake($resource), 'Cleared all '.Str::plural($resource).'.'],
            default => [strtolower($method).'_'.Str::snake($resource), "{$method} {$resource}{$ref}."],
        };
    }

    private static function pastTense(string $verb): string
    {
        return match ($verb) {
            'approve' => 'approved',
            'reject' => 'rejected',
            'publish' => 'published',
            'finalize' => 'finalized',
            'submit' => 'submitted',
            'withdraw' => 'withdrew',
            'apply' => 'applied to',
            'review' => 'reviewed',
            'deactivate' => 'deactivated',
            'reactivate' => 'reactivated',
            'send password' => 'sent a new password to',
            'approve pending' => 'approved pending hours of',
            default => Str::endsWith($verb, 'e') ? "{$verb}d" : "{$verb}ed",
        };
    }

    private static function lastParameter(Request $request): mixed
    {
        $parameters = $request->route()?->parameters() ?? [];
        if ($parameters === []) {
            return null;
        }

        $value = end($parameters);

        return is_object($value) && method_exists($value, 'getKey') ? $value->getKey() : (is_scalar($value) ? $value : null);
    }
}
