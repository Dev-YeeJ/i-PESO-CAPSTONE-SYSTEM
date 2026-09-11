<?php

/*
|--------------------------------------------------------------------------
| PESO knowledge base for the public assistant
|--------------------------------------------------------------------------
|
| Everything here is injected into the assistant's system prompt, so it can
| answer without a database round-trip. Live data (jobs, fairs, programs,
| charter) still comes from the tools — this file is only for facts that have
| no table behind them.
|
| ────────────────────────────────────────────────────────────────────────────
| TWO KINDS OF ENTRY. Please respect the difference.
|
|  1. `site` — how the i-PESO software works. Authored from the codebase and
|     verifiable there. Safe to edit when the software changes.
|
|  2. `office` — facts about the physical PESO office. These are NULL on
|     purpose. Only Urdaneta City PESO can supply them, and the assistant is
|     instructed to say "please contact the office" for anything still null.
|     DO NOT GUESS THESE. A wrong address or fee on a government service sends
|     a job seeker on a wasted trip, or worse, makes the LGU look like it is
|     charging for something that is free.
| ────────────────────────────────────────────────────────────────────────────
*/

return [

    /*
     | Supplied by Urdaneta City PESO. Fill each in as you receive it — the
     | assistant automatically starts answering that question once it is set,
     | and keeps deferring to the office while it is null.
     */
    'office' => [
        'address' => 'XHG8+FV3, Alexander St, Urdaneta City, Pangasinan',
        'hours' => null,            // e.g. 'Monday to Friday, 8:00 AM - 5:00 PM (closed on holidays)'
        'phone' => '0923 810 2011',
        'email' => 'pesourdanetacity@gmail.com',
        'facebook' => 'https://www.facebook.com/profile.php?id=100069233858883',
        'fees_policy' => null,      // e.g. 'All PESO services are free of charge.'
        'employer_approval_time' => null, // e.g. '3 to 5 working days after complete documents'
    ],

    /*
     | How the i-PESO system works. Authored from the application itself, so
     | these are statements of fact about the software, not office policy.
     | Update them when the corresponding flow changes.
     */
    'site' => [

        'what_is_ipeso' =>
            'i-PESO is the online employment portal of the Public Employment Service Office '
            . '(PESO) of Urdaneta City, Pangasinan. Job seekers can register a profile, browse '
            . 'job vacancies, join job fairs, and apply to government employment and livelihood '
            . 'programs. Employers can register, post vacancies, and take part in job fairs.',

        'browse_without_account' =>
            'Anyone may browse job vacancies, job fairs, and government programs without an '
            . 'account. An account is only needed to APPLY, to be matched with employers, and '
            . 'to be notified of new openings.',

        'seeker_registration' =>
            'Registering as a job seeker has 9 steps: (1) Account Setup, (2) Email Verification, '
            . '(3) Personal Information, (4) Employment Status, (5) Job Preference, '
            . '(6) Language Skills, (7) Education and Skills, (8) Training and Eligibility, '
            . '(9) Work Experience. It follows DOLE NSRP Form 1. Every completed step is saved, '
            . 'so a person can stop and continue later from where they left off.',

        'seeker_requirements' =>
            'Nothing needs to be uploaded to register as a job seeker. Have ready: an email '
            . 'address you can open, your mobile number, your date of birth, your complete home '
            . 'address, your school records for the education step, and details of past jobs. '
            . 'A TIN may be entered but is optional.',

        'employer_registration' =>
            'Registering as an employer has 5 steps: (1) Account Setup, (2) Email Verification, '
            . '(3) Company Profile, (4) Legal Documents, (5) Authorised Representative. The '
            . 'account is reviewed by a PESO administrator before job posting is enabled.',

        'employer_documents' =>
            'Every employer must upload: a Mayor\'s Permit (with its expiration date), a BIR '
            . 'Certificate of Registration, proof of PhilJobNet posting, and a valid government ID '
            . 'for the authorised representative. On top of that, the company-type-specific '
            . 'document is: DTI Certificate for a sole proprietorship; SEC Certificate for a '
            . 'corporation/partnership or a recruitment agency; PRPA License for a local '
            . 'recruitment agency; or DOLE/POEA License for an overseas recruitment agency. '
            . 'Recruitment agencies (local or overseas) must also submit an Affidavit of '
            . 'Undertaking and a Certificate of No Pending Case — optional for every other '
            . 'company type, though PESO may still ask for one. A company logo can be added too '
            . 'but is optional and is not a verification requirement. All documents are uploaded '
            . 'in Step 3 of registration; the representative\'s ID is Step 4.',

        'how_to_apply' =>
            'To apply for a job or a program, register a free job seeker account, complete your '
            . 'profile, then open the posting and submit an application. Applications are not '
            . 'accepted without an account because employers need the profile to evaluate you.',

        'forgot_password' =>
            'Use the "Forgot password" link on the login page. A reset link is sent to the '
            . 'registered email address.',

        'verification_email' =>
            'The verification code is emailed right after sign-up. If it has not arrived, check '
            . 'the spam or junk folder first, then use the resend option on the verification '
            . 'screen. Codes expire, so request a new one rather than reusing an old email.',

        'account_status' =>
            'The assistant cannot look up an account, an application, or a verification status. '
            . 'That requires logging in.',

        'placement_report' =>
            'The Placement Report is a recurring MONTHLY report every verified employer files, '
            . 'listing everyone they hired that month — no matter how the hire happened (online '
            . 'application, job fair, walk-in, referral, etc.). It is filed by uploading a '
            . 'spreadsheet (Excel or CSV), which gets mapped and previewed before final '
            . 'submission, or by filing a "nil" declaration if nobody was hired that month — that '
            . 'is different from simply not submitting, since PESO needs to know the difference. '
            . 'It is due on the 10th of the following month by default, and a PESO administrator '
            . 'reviews each submission.',

        'establishment_report' =>
            'The Establishment Report (RO1-JF Form 3) is a different report tied to one specific '
            . 'Job Fair event — not a recurring monthly report like the Placement Report. After a '
            . 'job fair, each participating employer records the applicants they saw at that '
            . 'event (qualified, near-hired, hired-on-the-spot, or mismatched, with a reason '
            . 'code), either themselves through their Job Fair dashboard or via PESO staff '
            . 'encoding a paper form on their behalf. It produces one printable RO1-JF Form 3 '
            . 'per employer per job fair, and PESO can also see a combined total across every '
            . 'employer that joined that fair.',
    ],
];
