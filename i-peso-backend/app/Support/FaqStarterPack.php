<?php

namespace App\Support;

/**
 * Suggested FAQs offered once, when the FAQ list is still empty. They are
 * written from what the software itself does (the same facts as the `site`
 * part of config/peso_knowledge.php) and are created UNPUBLISHED: PESO staff
 * read, adjust and publish them. Office facts (hours, fees, approval time)
 * are deliberately not invented here — those come from Office info.
 */
final class FaqStarterPack
{
    /** @return array<int, array{question: string, answer: string, audience: string, topic: string, link_label?: string, link_url?: string}> */
    public static function items(): array
    {
        return [
            [
                'topic' => 'account', 'audience' => 'everyone',
                'question' => 'Do I need an account to look for jobs?',
                'answer' => "No. Anyone can browse job vacancies, job fairs and government programs without an account.\n\nYou only need a free account to apply, to be matched with employers, and to be notified of new openings.",
            ],
            [
                'topic' => 'account', 'audience' => 'seekers',
                'question' => 'What are the steps to register as a job seeker?',
                'answer' => "Registration has 9 steps and follows the DOLE NSRP Form 1:\n- Account setup\n- Email verification\n- Personal information\n- Employment status\n- Job preference\n- Language skills\n- Education and skills\n- Training and eligibility\n- Work experience\n\nEvery finished step is saved, so you can stop and continue later from where you left off.",
                'link_label' => 'Register as a job seeker', 'link_url' => '/register/seeker',
            ],
            [
                'topic' => 'account', 'audience' => 'seekers',
                'question' => 'What do I need to prepare before registering?',
                'answer' => "Nothing needs to be uploaded. Have these ready:\n- An email address you can open\n- Your mobile number and date of birth\n- Your complete home address\n- Your school records for the education step\n- Details of your past jobs\n\nA TIN can be entered but is optional.",
            ],
            [
                'topic' => 'account', 'audience' => 'everyone',
                'question' => 'I did not receive the verification code. What should I do?',
                'answer' => "The code is emailed right after you sign up. Check your spam or junk folder first, then use the resend option on the verification screen.\n\nCodes expire, so request a new one instead of using an old email.",
            ],
            [
                'topic' => 'account', 'audience' => 'everyone',
                'question' => 'I forgot my password.',
                'answer' => 'Use the "Forgot password" link on the sign-in page. A reset link is sent to the email address you registered with.',
                'link_label' => 'Go to sign in', 'link_url' => '/login',
            ],
            [
                'topic' => 'jobs', 'audience' => 'seekers',
                'question' => 'How do I apply for a job?',
                'answer' => "Register a free job seeker account, complete your profile, then open the job posting and submit an application.\n\nEmployers need your profile to evaluate you, so applications are not accepted without an account.",
                'link_label' => 'Find jobs', 'link_url' => '/seeker/job-map',
            ],
            [
                'topic' => 'jobs', 'audience' => 'everyone',
                'question' => 'Do I have to pay to use i-PESO or to apply?',
                'answer' => 'No. All PESO services on the portal are free of charge. No job seeker will ever be asked to pay a fee to register, apply, or be considered for a job, program or job fair listed on i-PESO. If anyone asks you for payment, report it to PESO.',
            ],
            [
                'topic' => 'verification', 'audience' => 'employers',
                'question' => 'How do I register my company?',
                'answer' => "Employer registration has 5 steps:\n- Account setup\n- Email verification\n- Company profile\n- Legal documents\n- Authorised representative\n\nA PESO administrator reviews your account before job posting is turned on.",
                'link_label' => 'Register as an employer', 'link_url' => '/register/employer',
            ],
            [
                'topic' => 'verification', 'audience' => 'employers',
                'question' => 'What documents does my company need to upload?',
                'answer' => "Every employer uploads:\n- Mayor's Permit (with its expiration date)\n- BIR Certificate of Registration\n- Proof of PhilJobNet posting\n- A valid government ID of the authorised representative\n\nPlus the document for your company type: DTI Certificate (sole proprietorship), SEC Certificate (corporation, partnership or recruitment agency), PRPA License (local recruitment agency) or DOLE/POEA License (overseas recruitment agency).\n\nRecruitment agencies also submit an Affidavit of Undertaking and a Certificate of No Pending Case.",
            ],
            [
                'topic' => 'reports', 'audience' => 'employers',
                'question' => 'What is the monthly Placement Report?',
                'answer' => "Every verified employer files a Placement Report each month listing everyone they hired that month, however the hire happened (online, job fair, walk-in, referral).\n\nUpload a spreadsheet (Excel or CSV), check the preview, then submit. If nobody was hired, file a \"nil\" declaration instead — PESO needs to know the difference. It is due on the 10th of the following month.",
            ],
            [
                'topic' => 'job_fairs', 'audience' => 'employers',
                'question' => 'What is the Establishment Report after a job fair?',
                'answer' => 'The Establishment Report (RO1-JF Form 3) is tied to one job fair. After the event, record the applicants you met — qualified, near-hired, hired on the spot, or mismatched with a reason — from your Job Fair dashboard, or PESO staff can encode your paper form for you.',
            ],
            [
                'topic' => 'job_fairs', 'audience' => 'seekers',
                'question' => 'How do I join a job fair?',
                'answer' => 'Open Job Fairs in your account, choose an upcoming fair and register. You can see which employers are joining and what positions they are hiring for before the event.',
                'link_label' => 'See job fairs', 'link_url' => '/seeker/job-fairs',
            ],
        ];
    }
}
