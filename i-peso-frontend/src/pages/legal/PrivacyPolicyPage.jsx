import { ShieldCheck } from 'lucide-react';
import LegalPageLayout, { ConfirmNote, PolicySection } from './LegalPageLayout';

// Effective date of this policy text. Bump this whenever the content below
// changes materially — it is the only date on the page that is not a
// [PESO TO CONFIRM] placeholder.
const EFFECTIVE_DATE = 'August 18, 2026';

const SECTIONS = [
  { id: 'introduction', label: 'Introduction & Scope' },
  { id: 'who-we-are', label: 'Who We Are' },
  { id: 'data-we-collect', label: 'What We Collect' },
  { id: 'why-we-collect', label: 'Why We Collect It' },
  { id: 'legal-basis', label: 'Legal Basis' },
  { id: 'data-sharing', label: 'Who We Share It With' },
  { id: 'retention', label: 'How Long We Keep It' },
  { id: 'security', label: 'How We Protect It' },
  { id: 'your-rights', label: 'Your Rights' },
  { id: 'changes', label: 'Changes to This Policy' },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      badge="Republic Act No. 10173 · Data Privacy Act of 2012"
      badgeIcon={ShieldCheck}
      title="Privacy Policy"
      description="This policy explains what personal data the i-PESO Urdaneta City Employment Portal collects, why, and what rights you have over it."
      effectiveDate={EFFECTIVE_DATE}
      sections={SECTIONS}
      crossLink={{ to: '/terms-of-service', label: 'Terms of Service' }}
    >
      <PolicySection id="introduction" number={1} title="Introduction & Scope">
        <p>
          i-PESO is the online employment portal of the Public Employment Service Office (PESO) of Urdaneta
          City, Pangasinan. This policy applies to job seekers, employers, and visitors who use the portal,
          and to the associated i-PESO mobile app. It describes how we collect, use, share, and protect
          personal data in compliance with the Data Privacy Act of 2012 (Republic Act No. 10173), its
          Implementing Rules and Regulations, and issuances of the National Privacy Commission (NPC).
        </p>
        <p>
          Anyone may browse job vacancies, job fairs, and government program listings without an account.
          An account — and the personal data described below — is only required to apply for a job, be
          matched with employers, or be notified of new openings.
        </p>
      </PolicySection>

      <PolicySection id="who-we-are" number={2} title="Who We Are">
        <p>
          The Public Employment Service Office (PESO) of Urdaneta City is the personal information
          controller responsible for the data described in this policy.
        </p>
        <ConfirmNote>
          Office address, official phone number, and email address have not yet been supplied by PESO and
          will be published here once confirmed. These are the same contact details tracked internally for
          the i-PESO assistant (see <code>config/peso_knowledge.php</code>).
        </ConfirmNote>
        <ConfirmNote>
          Data Protection Officer (DPO): name/position and direct contact details to be confirmed by PESO.
          Until then, privacy concerns may be raised through the office contact details above once
          published, or through your PESO administrator.
        </ConfirmNote>
      </PolicySection>

      <PolicySection id="data-we-collect" number={3} title="What Personal Data We Collect">
        <p><strong>If you register as a job seeker</strong>, we collect the information used to build your
          National Skills Registration Program (NSRP) profile: your name, date of birth, sex, contact
          number, email address, complete home address, employment status, job preferences, language
          skills, educational attainment, training and eligibility records, and work experience. A Tax
          Identification Number (TIN) may be provided but is optional.</p>
        <p><strong>If you register as an employer</strong>, we collect your company profile (name, industry,
          size, address), Tax Identification Number, legal registration documents (SEC, DTI, or CDA
          registration; Mayor's/business permit; BIR Certificate of Registration), and the name, position,
          and valid ID of your authorized company representative.</p>
        <p><strong>When you use the portal</strong>, we also record the applications you submit, interview
          schedules and outcomes, messages and remarks exchanged through the applicant tracking system, job
          fair attendance, and standard activity logs (sign-ins, status changes) for accountability.</p>
      </PolicySection>

      <PolicySection id="why-we-collect" number={4} title="Why We Collect and Use Your Data">
        <ul className="list-disc space-y-2 pl-5">
          <li>To create and verify your job seeker or employer account.</li>
          <li>To match job seekers with suitable vacancies and to let employers evaluate applicants.</li>
          <li>To administer government employment and livelihood programs (e.g., SPES, TUPAD, GIP) and job
            fairs you apply to or join.</li>
          <li>To schedule interviews and record hiring/placement outcomes.</li>
          <li>To meet DOLE reporting obligations, including placement and establishment reports (such as the
            RO1-JF Establishment Report) that PESO offices are required to submit.</li>
          <li>To communicate with you about your account, applications, or program eligibility.</li>
          <li>To maintain the security, integrity, and audit trail of the portal.</li>
        </ul>
      </PolicySection>

      <PolicySection id="legal-basis" number={5} title="Legal Basis for Processing">
        <p>We process your personal data on one or more of the following legal bases recognized under
          Sections 12 and 13 of the Data Privacy Act:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Consent</strong> — when you register an account and submit your profile information.</li>
          <li><strong>Contract necessity</strong> — to provide the job-matching and application services you
            request.</li>
          <li><strong>Legal obligation</strong> — to comply with DOLE and PESO reporting requirements under
            the PESO Act and related labor and employment issuances.</li>
          <li><strong>Legitimate interest</strong> — to keep the portal secure and to improve how vacancies
            are matched to job seekers.</li>
        </ul>
      </PolicySection>

      <PolicySection id="data-sharing" number={6} title="Who We Share Your Data With">
        <p>
          A job seeker's profile is shared with an employer only after that job seeker applies to one of
          that employer's vacancies. An employer's verification documents are reviewed by authorized PESO
          administrators. Placement and establishment data may be reported to the DOLE Regional Office as
          required by law.
        </p>
        <p>We do not sell, rent, or trade your personal data to any third party for marketing purposes.</p>
        <p>
          We do not use cookies for tracking or advertising, and the portal has no analytics or advertising
          scripts. Signing in relies on your browser's local storage, not cookies, to keep you signed in.
        </p>
      </PolicySection>

      <PolicySection id="retention" number={7} title="How Long We Keep Your Data">
        <ConfirmNote>
          PESO has not yet specified a formal retention period for job seeker and employer records after
          account closure or prolonged inactivity. Once confirmed, that period will be published here. Until
          then, data is retained for as long as your account remains active and as needed to comply with
          DOLE reporting and record-keeping requirements.
        </ConfirmNote>
      </PolicySection>

      <PolicySection id="security" number={8} title="How We Protect Your Data">
        <ul className="list-disc space-y-2 pl-5">
          <li>Role-based access: job seeker, employer, and administrator accounts can only see the data
            relevant to their role.</li>
          <li>Passwords are stored using one-way cryptographic hashing — no one at PESO can view a user's
            actual password.</li>
          <li>Administrator actions (approvals, rejections, document reviews) are recorded in an internal
            activity log for accountability.</li>
          <li>Data submitted to the portal is transmitted over encrypted (HTTPS) connections.</li>
          <li>Employer verification documents are only accessible to authorized PESO administrators.</li>
        </ul>
      </PolicySection>

      <PolicySection id="your-rights" number={9} title="Your Rights & How to File a Request">
        <p>Under Section 16 of the Data Privacy Act, you have the right to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Be informed that your personal data will be, is being, or was processed.</li>
          <li>Access your personal data on file.</li>
          <li>Object to or withdraw consent for processing, where applicable.</li>
          <li>Request correction of inaccurate or outdated data.</li>
          <li>Request erasure or blocking of data that was unlawfully obtained or is no longer necessary.</li>
          <li>Be indemnified for damages from inaccurate, incomplete, or unlawfully obtained data.</li>
          <li>Data portability, where technically feasible.</li>
          <li>File a complaint with the National Privacy Commission (NPC).</li>
        </ul>
        <ConfirmNote>
          Requests to exercise these rights may be filed at the office contact details in Section 2 once
          published. PESO's National Privacy Commission registration number, if applicable, will also be
          published here.
        </ConfirmNote>
      </PolicySection>

      <PolicySection id="changes" number={10} title="Changes to This Policy">
        <p>
          We may update this policy as the portal or applicable law changes. Material changes will update
          the effective date at the top of this page. We encourage you to review this page periodically.
        </p>
      </PolicySection>
    </LegalPageLayout>
  );
}
