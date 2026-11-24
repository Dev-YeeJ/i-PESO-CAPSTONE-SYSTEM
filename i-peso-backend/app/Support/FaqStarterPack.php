<?php

namespace App\Support;

/**
 * Suggested FAQs staff can add at any time: only the questions not already in
 * the FAQ list are added. They are written from what the software itself does
 * (the same facts as the `site` part of config/peso_knowledge.php) and are
 * created UNPUBLISHED: PESO staff read, adjust and publish them. Office facts (hours, fees, approval time)
 * are deliberately not invented here — those come from Office info.
 */
final class FaqStarterPack
{
    /** How a question is compared with the FAQ list (case, spacing and punctuation ignored). */
    public static function normalize(string $question): string
    {
        return trim(preg_replace('/[^\p{L}\p{N}]+/u', ' ', mb_strtolower($question)));
    }

    /**
     * The suggestions whose question is not in the FAQ list yet.
     *
     * @param  iterable<string>  $existingQuestions
     * @return array<int, array<string, string>>
     */
    public static function missing(iterable $existingQuestions): array
    {
        $have = [];
        foreach ($existingQuestions as $question) {
            $have[self::normalize((string) $question)] = true;
        }

        return array_values(array_filter(self::items(), fn (array $item) => ! isset($have[self::normalize($item['question'])])));
    }

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
            // ── Added 2026-11-25: more of what people ask, from how i-PESO works today ──
            [
                'topic' => 'account', 'audience' => 'seekers',
                'question' => 'How do I update my profile?',
                'answer' => "Open your Profile and choose Edit. Your profile follows the DOLE NSRP Form 1, step by step, and each step saves on its own.\n\nKeep your skills, education and work experience up to date: they decide which jobs match you, and employers see your latest details when you apply.",
            ],
            [
                'topic' => 'account', 'audience' => 'everyone',
                'question' => 'Who can see my personal information?',
                'answer' => "Employers only see the profile details of job seekers who applied to their vacancies. Disability details are seen by PESO staff only, never by employers.\n\nYour name is never shown on reviews you write. PESO staff can see your account to help you and to verify reports.",
                'link_label' => 'Read the Privacy Policy', 'link_url' => '/privacy-policy',
            ],
            [
                'topic' => 'jobs', 'audience' => 'seekers',
                'question' => 'How do I know what is happening with my application?',
                'answer' => "Open My Applications. Each application shows its stage: Pending, Reviewed, Shortlisted, Interview, Hired or Not selected.\n\nYou are notified in the app and by email whenever the employer moves your application or schedules an interview.",
                'link_label' => 'My Applications', 'link_url' => '/seeker/applications',
            ],
            [
                'topic' => 'jobs', 'audience' => 'seekers',
                'question' => 'How do interviews work?',
                'answer' => "When an employer invites you, you get a notification with the date, time and how the interview happens: an online video call, a phone call, or face-to-face.\n\nFor an online interview, open the application in My Applications and use Join call when it is time. You also get reminders before the interview.",
                'link_label' => 'My Applications', 'link_url' => '/seeker/applications',
            ],
            [
                'topic' => 'jobs', 'audience' => 'seekers',
                'question' => 'Can I withdraw an application?',
                'answer' => "Yes, while the employer has not yet hired or turned you down. Open the application in My Applications and choose Withdraw.\n\nIf an interview was scheduled, it is cancelled and the employer is told.",
            ],
            [
                'topic' => 'jobs', 'audience' => 'seekers',
                'question' => 'What does the match score mean?',
                'answer' => "The match score shows how well a vacancy fits your profile: your skills, education, work experience and job preferences compared with what the employer asked for.\n\nIt is a guide, not a decision. A more complete profile gives more accurate matches.",
            ],
            [
                'topic' => 'jobs', 'audience' => 'seekers',
                'question' => 'Can I review a company I applied to?',
                'answer' => "Yes. Once you apply, you can review that company's hiring process: one review per application. Rate how the hiring was handled, not whether you got the job.\n\nYour name is never shown; others see you as a Verified applicant. You can edit or take back your review at any time.",
                'link_label' => 'Review guidelines', 'link_url' => '/review-guidelines',
            ],
            [
                'topic' => 'jobs', 'audience' => 'everyone',
                'question' => 'How do I report a suspicious employer or job?',
                'answer' => "Use Report this employer on the company profile, or Report this vacancy on the job. A report goes straight to PESO staff, who review it before anything happens. Your report is confidential: the employer is never told who reported them.\n\nReport anyone who asks you to pay a fee, offers a fake job, or treats you abusively.",
            ],
            [
                'topic' => 'programs', 'audience' => 'everyone',
                'question' => 'What government programs are listed on i-PESO?',
                'answer' => 'Government Programs lists the programs PESO is running, such as livelihood, training and employment programs, with who can join, what to bring and the deadline. Only programs that are open are shown.',
            ],
            [
                'topic' => 'programs', 'audience' => 'seekers',
                'question' => 'How do I apply for a government program?',
                'answer' => "Open the program in Government Programs to see the requirements. Applications are made in person at the PESO office: bring the listed documents and a valid ID.\n\ni-PESO does not take program applications online.",
            ],
            [
                'topic' => 'verification', 'audience' => 'employers',
                'question' => 'When can my company post job vacancies?',
                'answer' => "Once PESO has checked your documents and verified your account. You are notified in the portal and by email when your account is verified.\n\nIf PESO returns a document, re-upload the corrected one from your dashboard; it goes back for review.",
            ],
            [
                'topic' => 'verification', 'audience' => 'employers',
                'question' => "What happens when our Mayor's Permit is about to expire?",
                'answer' => "i-PESO reminds you before the permit expires and on the expiry day. Upload the renewed permit with its new expiration date from your company documents so your account stays in good standing.",
            ],
            [
                'topic' => 'jobs', 'audience' => 'employers',
                'question' => 'How do I schedule an interview with an applicant?',
                'answer' => "Open Applicants, choose the applicant and move them to Interview. Set the date, time and type (online video call, phone or face-to-face); for online calls a meeting link is created for you.\n\nThe applicant is notified right away and reminded before the interview. All interviews appear on your Interview calendar.",
                'link_label' => 'Interview calendar', 'link_url' => '/employer/calendar',
            ],
            [
                'topic' => 'jobs', 'audience' => 'employers',
                'question' => 'How are applicants ranked?',
                'answer' => 'Applicants are ranked by match score: how well each applicant\'s skills, education and experience fit your vacancy. You can also sort by date applied or name, and move several applicants to the next stage at once.',
                'link_label' => 'Applicants', 'link_url' => '/employer/ats',
            ],
            [
                'topic' => 'reports', 'audience' => 'employers',
                'question' => 'Will I be reminded about the Placement Report?',
                'answer' => "Yes. i-PESO reminds employers who have not filed before the due day, on the due day, and again if the report becomes overdue. File as soon as you can — a nil declaration is enough if nobody was hired that month.",
            ],
            [
                'topic' => 'job_fairs', 'audience' => 'employers',
                'question' => 'How does my company join a job fair?',
                'answer' => "Verified employers are invited when PESO publishes a job fair. Accept the invitation from Job fairs in your account, then submit the requirements listed for that fair. PESO reviews them and confirms your participation.",
            ],
        ];
    }
}
