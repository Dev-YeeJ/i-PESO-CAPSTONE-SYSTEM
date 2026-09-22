<?php

/*
|--------------------------------------------------------------------------
| Government Program Presets
|--------------------------------------------------------------------------
|
| PESO programs are national programs whose criteria are fixed by statute or
| DOLE guidelines, so an administrator posting one should not be authoring
| eligibility logic by hand. Picking a category pre-fills everything standard;
| the admin then supplies only what is local to the batch — dates, slots,
| venue and contact.
|
| Everything here is a starting point, not a constraint: the posting form
| lets an admin edit or clear any pre-filled value for a batch that differs.
|
| `citizen_charter_steps` follow the Urdaneta City PESO Citizen's Charter
| (2021, 1st edition). Step durations come straight from it. Staff names are
| deliberately NOT included — the charter names specific people, which goes
| stale and is personal data; role titles are stable and sufficient.
|
| `eligibility_rules` are scored by EligibilityMatchingService. That engine
| can only read what is on a seeker's profile, so criteria it cannot check —
| "is an enrolled student", "parents' income below the poverty threshold" —
| are listed under `eligibility_requirements` as plain text instead. Those
| are verified in person at PESO, which is where the whole transaction
| happens: Government Programs is postings and announcements only.
|
| Rule shape (see EligibilityMatchingService::checkRule):
|   age              => min, max
|   employment_status=> values[]
|   educ_attainment  => value (minimum attainment)
|   is_4ps_beneficiary / is_ofw => value (bool)
|   sex              => value
|   civil_status     => values[]
|   residency        => value (city/municipality)
| plus label, weight (default 1) and required (default false).
|
*/

return [

    'spes' => [
        'short_description' => 'Wage employment for students, out-of-school youth and dependents of displaced workers during school breaks.',
        'target_beneficiaries' => 'Poor but deserving students, out-of-school youth (OSY) and dependents of displaced workers, 15 to 30 years old.',
        'description' => "The Special Program for Employment of Students (SPES) gives poor but deserving students, out-of-school youth and dependents of displaced workers paid work during school breaks so they can help fund their education.\n\nParticipants are paid the applicable wage for the duration of their engagement, with a portion shouldered by the employer and the balance issued by DOLE as an education voucher. Under RA 10917 a student may render up to 78 working days.",
        'eligibility_requirements' => [
            '15 to 30 years old at the time of application',
            'Currently an enrolled student, an out-of-school youth, or a dependent of a displaced worker',
            "Combined parents' income does not exceed the regional poverty threshold",
            'No failing grades in the immediately preceding school term',
        ],
        'required_documents' => [
            'PSA Birth Certificate (photocopy)',
            'School ID, or Certificate of Registration / Enrolment',
            "Parents' latest Income Tax Return, or Barangay Certificate of Indigency",
            'Certificate of grades from the previous school term',
            '1x1 ID photo (2 copies)',
        ],
        'citizen_charter_steps' => [
            'Visit the PESO Office and submit the requirements to the PESO staff.',
            'Fill up the SPES application form and the Skills Registry System (SRS) Form 1 clearly and legibly, including a contact number.',
            'Undergo a one-on-one interview with the SLEO/PESO Coordinator (5-10 minutes).',
            'Wait for your referral to the participating employer.',
            "Report to the employer on the agreed start date. At the end of the engagement the employer issues your Student's Employment Record (SPES Form 04).",
        ],
        'eligibility_rules' => [
            ['field' => 'age', 'op' => 'between', 'min' => 15, 'max' => 30, 'label' => '15 to 30 years old', 'weight' => 2, 'required' => true],
        ],
    ],

    'tupad' => [
        'short_description' => 'Emergency community employment for displaced, underemployed and seasonal workers in the informal sector.',
        'target_beneficiaries' => 'Displaced, underemployed and seasonal workers, and the self-employed who lost their livelihood.',
        'description' => "TUPAD (Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers) is a community-based safety net that provides short-term emergency employment to workers in the informal sector.\n\nBeneficiaries render community work for the scheduled number of days and are paid the prevailing minimum wage for the locality, with accident insurance and an orientation on safety and health.",
        'eligibility_requirements' => [
            'At least 18 years old',
            'A displaced, underemployed or seasonal worker, or self-employed and has lost livelihood',
            'A resident of the barangay covered by this batch',
            'Not a beneficiary of another DOLE emergency employment program within the same year',
        ],
        'required_documents' => [
            'Valid government-issued ID',
            'Barangay Certificate of Residency',
            'Accomplished TUPAD beneficiary profile form',
        ],
        'citizen_charter_steps' => [
            'Visit the PESO Office or your barangay hall and submit the requirements to the PESO staff.',
            'Fill up the TUPAD beneficiary profile form.',
            'Wait for the beneficiary list to be validated by PESO and DOLE.',
            'Attend the orientation and safety briefing before the work period begins.',
            'Render the community work for the scheduled number of days. Wages are released after the work period.',
        ],
        'eligibility_rules' => [
            ['field' => 'age', 'op' => 'between', 'min' => 18, 'max' => 200, 'label' => 'At least 18 years old', 'weight' => 2, 'required' => true],
            ['field' => 'employment_status', 'op' => 'in', 'values' => ['unemployed'], 'label' => 'Currently unemployed or underemployed', 'weight' => 1, 'required' => false],
        ],
    ],

    'gip' => [
        'short_description' => 'Paid internship in a government office, building public-service work experience for youth.',
        'target_beneficiaries' => 'Youth 18 to 30 years old, preferably from poor families, who are at least high school graduates.',
        'description' => "The Government Internship Program (GIP) engages young workers in government offices so they gain work experience and exposure to public service while earning.\n\nInterns are paid a percentage of the prevailing minimum wage for the duration of the engagement and are covered by an endorsement from DOLE.",
        'eligibility_requirements' => [
            '18 to 30 years old',
            'At least a high school graduate',
            'Preferably from a poor or indigent family',
            'Willing to render the full engagement period',
        ],
        'required_documents' => [
            'Accomplished DOLE-GIP Form A',
            'PSA Birth Certificate (photocopy)',
            'School records or diploma',
            'Barangay Clearance',
            'Medical Certificate',
        ],
        'citizen_charter_steps' => [
            'Visit the PESO Office and fill up the NSRP Jobseekers Registration Form.',
            'Ask the PESO staff for a copy of DOLE-GIP Form A and fill it up completely and correctly (about 3 minutes).',
            'Undergo an interview with the SLEO/PESO Coordinator or the PESO Manager-Designate to assess your qualifications and match you to a suitable office (about 5 minutes).',
            'Wait for DOLE approval. An endorsement letter is issued to the scholar.',
            'Submit the Accomplishment Report and other documents in the format provided by DOLE at the end of the engagement.',
        ],
        'eligibility_rules' => [
            ['field' => 'age', 'op' => 'between', 'min' => 18, 'max' => 30, 'label' => '18 to 30 years old', 'weight' => 2, 'required' => true],
            ['field' => 'educ_attainment', 'op' => 'min_level', 'value' => 'high school graduate', 'label' => 'At least a high school graduate', 'weight' => 1, 'required' => false],
        ],
    ],

    'ofw_assistance' => [
        'short_description' => 'Financial and reintegration assistance for distressed or displaced Overseas Filipino Workers.',
        'target_beneficiaries' => 'Land-based and sea-based OFWs who are distressed, displaced or repatriated.',
        'description' => "DOLE-AKAP (Abot Kamay ang Pagtulong) provides one-time financial assistance and reintegration support to Overseas Filipino Workers who were displaced, repatriated, or are otherwise in distress.\n\nPESO assists with the documentary requirements and endorses qualified OFWs to DOLE.",
        'eligibility_requirements' => [
            'Certified as a distressed, displaced or repatriated OFW',
            'Land-based or sea-based, documented or undocumented',
            'Has not received the same assistance within the covered period',
        ],
        'required_documents' => [
            'Passport (photocopy of the data page)',
            'Overseas Employment Certificate (OEC) or employment contract',
            'Proof of displacement or repatriation',
            'Valid government-issued ID',
        ],
        'citizen_charter_steps' => [
            'Wait for announcements. Overseas agencies may conduct recruitment at Urdaneta City PESO any time of the year, and announcements are posted on the Urdaneta City PESO Facebook page.',
            'Prepare the requirements listed above, together with any other documents the recruitment agency may require.',
            'Submit the requirements to the PESO staff and fill up the agency application form.',
            'Undergo the interview with the agency representative. Other documents, if any, are prepared once your qualifications have been assessed.',
        ],
        'eligibility_rules' => [
            ['field' => 'is_ofw', 'op' => 'equals', 'value' => true, 'label' => 'OFW or former OFW', 'weight' => 2, 'required' => true],
        ],
    ],

    'livelihood_program' => [
        'short_description' => 'Livelihood starter kits and capacity building for self-employed and marginalised workers.',
        'target_beneficiaries' => 'Self-employed, marginalised and informal-sector workers, individually or as an organised group.',
        'description' => "The DOLE Integrated Livelihood Program (Kabuhayan) helps marginalised and informal-sector workers start or restore a livelihood through starter kits, equipment and capacity building.\n\nAssistance may be granted to an individual or to an accredited workers' association, and is released after the proposal is validated and approved by DOLE.",
        'eligibility_requirements' => [
            'At least 18 years old',
            "Self-employed or a marginalised worker, or a member of an accredited workers' association",
            'Has a viable livelihood or business plan',
            'Has not received the same livelihood assistance within the same year',
        ],
        'required_documents' => [
            'Livelihood or business plan',
            'Valid government-issued ID',
            'Barangay Clearance',
            'For groups: proof of registration or accreditation of the association',
        ],
        'citizen_charter_steps' => [
            'Visit the PESO Office and submit the requirements to the PESO staff.',
            'Fill up the livelihood application form and present your livelihood or business plan.',
            'Undergo assessment and interview with the SLEO/PESO Coordinator.',
            'Wait for the proposal to be validated and approved by DOLE.',
            'Attend the orientation before the release of the starter kit or assistance.',
        ],
        'eligibility_rules' => [
            ['field' => 'age', 'op' => 'between', 'min' => 18, 'max' => 200, 'label' => 'At least 18 years old', 'weight' => 2, 'required' => true],
        ],
    ],

    'tech_voc_training' => [
        'short_description' => 'Scholarships and technical-vocational training so job seekers can qualify for in-demand skills.',
        'target_beneficiaries' => 'Job seekers and out-of-school youth who want a technical-vocational qualification.',
        'description' => "Technical-vocational training and scholarship programs let job seekers gain a recognised qualification in an in-demand trade, improving their chances of placement.\n\nPESO assesses and endorses qualified applicants to the accredited training institution. Training slots are limited and are filled on a first-qualified basis.",
        'eligibility_requirements' => [
            'At least 15 years old',
            'Physically and mentally fit to undergo the training',
            'Able to complete the full training schedule',
            'Meets any additional entry requirement set by the training institution',
        ],
        'required_documents' => [
            'PSA Birth Certificate (photocopy)',
            'School records or proof of highest educational attainment',
            '1x1 ID photos (2 copies)',
            'Valid government-issued ID',
        ],
        'citizen_charter_steps' => [
            'Visit the PESO Office and submit the requirements to the PESO staff.',
            'Fill up the Skills Registry System (SRS) Form 1 and the training application form.',
            'Undergo assessment and a one-on-one interview with the PESO staff.',
            'Wait for your referral or endorsement to the training institution.',
            'Attend the scheduled orientation and the start of training.',
        ],
        'eligibility_rules' => [
            ['field' => 'age', 'op' => 'between', 'min' => 15, 'max' => 200, 'label' => 'At least 15 years old', 'weight' => 2, 'required' => true],
        ],
    ],

    'career_guidance' => [
        'short_description' => 'Career guidance, coaching and employment counselling for students and job seekers.',
        'target_beneficiaries' => 'Students, out-of-school youth and job seekers who need help choosing or changing a career path.',
        'description' => "Career guidance and employment coaching help students and job seekers understand local labour market conditions, assess their own skills, and plan a realistic career path.\n\nSessions are conducted at the Community Employment Center (CEC) and are free of charge.",
        'eligibility_requirements' => [
            'Open to all students, out-of-school youth and job seekers',
        ],
        'required_documents' => [
            'Valid school ID or any government-issued ID',
        ],
        'citizen_charter_steps' => [
            'Visit the Community Employment Center (CEC) at the PESO Office.',
            'Fill up the Skills Registry System (SRS) Form 1 if you are not yet registered (2-5 minutes).',
            'Undergo a one-on-one interview with the SLEO/PESO Coordinator. Career coaching is also available (5-10 minutes).',
            'Receive your career guidance output and the recommended next steps.',
        ],
        'eligibility_rules' => [],
    ],

    'citizen_charter' => [
        'short_description' => 'PESO frontline services, the steps to avail them, and how long each step takes.',
        'target_beneficiaries' => 'All citizens transacting with the Public Employment Service Office.',
        'description' => "The PESO Citizen's Charter sets out the frontline services of the Public Employment Service Office, the steps a citizen follows for each, and the time each step should take.\n\nAll PESO services are free of charge. PESO is a non-fee charging facility established under RA 8759, as amended by RA 10691.",
        'eligibility_requirements' => [
            'Open to all citizens',
        ],
        'required_documents' => [
            'Valid government-issued ID',
        ],
        'citizen_charter_steps' => [
            'Submit the requirements to the Community Employment Center (CEC) staff (2-5 minutes).',
            'Fill up the Skills Registry System (SRS) Form 1 clearly and legibly. Make sure to indicate a contact number; if you have no telephone, provide the number and name of someone who can accept the call for you.',
            'Wait for the validation of your filled-up SRS Registration Form.',
            'Your data is encoded in the Skills Registry System and the job matching facility is run (2-5 minutes).',
            'Undergo a one-on-one interview with the SLEO/PESO Coordinator. Career coaching is also available (5-10 minutes).',
            'Choose one or two positions from the Job Opportunities Bulletin Series (JOBS) posted on the PESO bulletin board.',
            'Receive your Referral Letter from the Administrative Aide (about 5 minutes).',
            'Proceed to the employer you are referred to, attaching the referral letter to your curriculum vitae. One set of documents is required per referral, and you will need to follow up your application.',
            'For succeeding referrals, note your application number and the date you submitted the requirements, fill up a Referral Form and undergo another interview (5-10 minutes).',
            'Renew or update your Skills Registry System information after 6 months. A new set of requirements is required.',
        ],
        'eligibility_rules' => [],
    ],

    'other' => [
        'short_description' => '',
        'target_beneficiaries' => '',
        'description' => '',
        'eligibility_requirements' => [],
        'required_documents' => [
            'Valid government-issued ID',
        ],
        'citizen_charter_steps' => [
            'Visit the PESO Office and submit the requirements to the PESO staff.',
        ],
        'eligibility_rules' => [],
    ],

];
