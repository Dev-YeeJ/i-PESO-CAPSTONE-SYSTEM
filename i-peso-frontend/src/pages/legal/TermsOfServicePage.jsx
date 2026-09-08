import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';
import LegalPageLayout, { PolicySection } from './LegalPageLayout';

const inlineLinkClass = 'font-semibold text-[#0A192F] underline decoration-[#B45309]/50 decoration-2 underline-offset-2 hover:decoration-[#B45309]';

// Effective date of this policy text. Bump this whenever the content below
// changes materially — it is the only date on the page that is not a
// [PESO/LEGAL TO CONFIRM] placeholder.
const EFFECTIVE_DATE = 'September 9, 2026';

const SECTIONS = [
  { id: 'acceptance', label: 'Acceptance of Terms' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'accounts', label: 'Your Account' },
  { id: 'seeker-terms', label: 'For Job Seekers' },
  { id: 'employer-terms', label: 'For Employers' },
  { id: 'acceptable-use', label: 'Acceptable Use' },
  { id: 'your-content', label: 'Content You Submit' },
  { id: 'our-role', label: 'Our Role & Disclaimers' },
  { id: 'suspension', label: 'Suspension & Termination' },
  { id: 'liability', label: 'Limitation of Liability' },
  { id: 'governing-law', label: 'Governing Law' },
  { id: 'changes', label: 'Changes to These Terms' },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      badge="Terms of Service Agreement"
      badgeIcon={Scale}
      title="Terms of Service"
      description="The rules for using the i-PESO Urdaneta City Employment Portal, for both job seekers and employers."
      effectiveDate={EFFECTIVE_DATE}
      sections={SECTIONS}
      crossLink={{ to: '/privacy-policy', label: 'Privacy Policy' }}
    >
      <PolicySection id="acceptance" number={1} title="Acceptance of Terms">
        <p>
          These Terms of Service ("Terms") govern your use of the i-PESO Urdaneta City Employment Portal and
          its associated mobile app (together, the "Portal"), operated by the Public Employment Service Office
          (PESO) of Urdaneta City, Pangasinan. By creating an account or otherwise using the Portal, you agree
          to these Terms. If you do not agree, please do not use the Portal.
        </p>
        <p>
          See also our <Link to="/privacy-policy" className={inlineLinkClass}>Privacy Policy</Link>, which explains how we handle your personal data and is incorporated
          into these Terms by reference.
        </p>
      </PolicySection>

      <PolicySection id="eligibility" number={2} title="Eligibility">
        <p>
          You may register as a job seeker if you are legally allowed to work in the Philippines under the
          Labor Code and related child-labor protections. You may register as an employer only if you are
          authorized to represent and bind the business, organization, or agency you register on behalf of.
        </p>
        <p>
          Employer accounts are reviewed and verified by a PESO administrator before job postings are enabled.
          We may request additional documents or decline to verify an account that does not meet our
          requirements.
        </p>
      </PolicySection>

      <PolicySection id="accounts" number={3} title="Your Account">
        <ul className="list-disc space-y-2 pl-5">
          <li>You must provide accurate, current information when registering and keep it up to date.</li>
          <li>You are responsible for keeping your password confidential and for all activity under your
            account.</li>
          <li>Each person or business should maintain only one account, unless PESO approves otherwise (for
            example, an employer with more than one authorized representative).</li>
          <li>Notify us promptly if you suspect unauthorized use of your account.</li>
        </ul>
      </PolicySection>

      <PolicySection id="seeker-terms" number={4} title="For Job Seekers">
        <ul className="list-disc space-y-2 pl-5">
          <li>All PESO services on the Portal are free of charge. No job seeker will ever be asked to pay a
            fee to register, apply, or be considered for a job, program, or job fair listed here.</li>
          <li>Submitting an application does not guarantee an interview, a job offer, or any employment
            outcome. Hiring decisions are made solely by the employer.</li>
          <li>You are responsible for the accuracy of the profile, work history, and documents you submit.
            Misrepresenting your qualifications may result in account suspension.</li>
          <li>You may withdraw an application at any time before it reaches a final status (hired or
            rejected).</li>
        </ul>
      </PolicySection>

      <PolicySection id="employer-terms" number={5} title="For Employers">
        <ul className="list-disc space-y-2 pl-5">
          <li>Job postings must be accurate, lawful, and for genuine vacancies. Do not post fictitious,
            duplicate, or misleading listings.</li>
          <li>Postings and hiring decisions must comply with applicable Philippine labor law, including the
            Anti-Age Discrimination in Employment Act (Republic Act No. 10911) — candidates must be evaluated
            on merit and qualifications, not on age, sex, or other protected characteristics disclosed through
            the Portal.</li>
          <li>You may not charge a job seeker any placement, processing, or referral fee for a position posted
            through the Portal.</li>
          <li>You are responsible for keeping your vacancy postings current, including closing or updating a
            listing once a position is filled.</li>
          <li>Verification documents you submit (SEC/DTI/CDA registration, business permit, BIR certificate,
            representative ID) must be genuine and current.</li>
        </ul>
      </PolicySection>

      <PolicySection id="acceptable-use" number={6} title="Acceptable Use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide false information, impersonate another person or business, or create an account on
            someone else's behalf without authorization.</li>
          <li>Post fraudulent, discriminatory, or unlawful job listings or content.</li>
          <li>Harass, threaten, or discriminate against another user of the Portal.</li>
          <li>Scrape, data-mine, or use automated tools to extract data from the Portal outside of its normal
            use.</li>
          <li>Attempt to gain unauthorized access to another account or to any part of the Portal's systems.</li>
          <li>Use the Portal for any purpose other than legitimate job seeking, hiring, or government program
            participation.</li>
        </ul>
        <p>We may investigate and take action, including account suspension, for violations of this section.</p>
      </PolicySection>

      <PolicySection id="your-content" number={7} title="Content You Submit">
        <p>
          You retain ownership of the profile information, resumes, company documents, and other content you
          submit to the Portal ("Your Content"). By submitting it, you give PESO a license to use, store, and
          share Your Content solely to operate the Portal — for example, showing your job seeker profile to an
          employer you apply to, or your company profile to job seekers browsing your vacancies — and to meet
          PESO's DOLE reporting obligations.
        </p>
        <p>We do not sell Your Content or use it for advertising.</p>
      </PolicySection>

      <PolicySection id="our-role" number={8} title="Our Role & Disclaimers">
        <p>
          PESO operates the Portal as a facilitator that connects job seekers, employers, and government
          employment programs. PESO is not the employer of any job seeker who applies through the Portal, and
          using the Portal does not create an employment relationship between PESO and any user.
        </p>
        <p>
          We do our best to verify employer accounts and keep vacancy and program listings accurate, but we do
          not guarantee the accuracy, completeness, or outcome of any listing, application, or hire. Job
          seekers and employers are each responsible for their own decisions made through the Portal.
        </p>
        <p>The Portal is provided on an "as is" and "as available" basis, without warranties of any kind,
          to the extent permitted by law.</p>
      </PolicySection>

      <PolicySection id="suspension" number={9} title="Suspension & Termination">
        <p>
          We may suspend or terminate an account that violates these Terms, submits fraudulent information or
          documents, or misuses the Portal. You may close your own account at any time by contacting your PESO
          administrator. Some records may be retained after account closure as described in our{' '}
          <Link to="/privacy-policy" className={inlineLinkClass}>Privacy Policy</Link>.
        </p>
      </PolicySection>

      <PolicySection id="liability" number={10} title="Limitation of Liability">
        <p>
          PESO's liability for any claim arising from or related to your use of the Portal, to the extent
          permitted by Philippine law, does not extend beyond PESO's own direct fault or negligence in
          operating the Portal. PESO is not liable for indirect, incidental, consequential, or exemplary
          damages, or for any loss arising from the acts, omissions, representations, or conduct of another
          user — including an employer's hiring decision or a job seeker's application — made through the
          Portal.
        </p>
        <p>
          PESO is an instrumentality of the City Government of Urdaneta operating the Portal as part of its
          public employment-facilitation mandate under the Public Employment Service Office Act of 1999
          (Republic Act No. 8759). Its liability is further limited and qualified by the laws governing the
          liability of local government units and their instrumentalities for acts performed in a governmental
          capacity.
        </p>
      </PolicySection>

      <PolicySection id="governing-law" number={11} title="Governing Law & Dispute Resolution">
        <p>These Terms are governed by the laws of the Republic of the Philippines.</p>
        <p>
          Where both parties to a dispute — for example, a job seeker and an employer — reside or operate
          within the same city or municipality, the dispute must first be referred to barangay conciliation
          under the Katarungang Pambarangay system (Sections 399–422, Local Government Code of 1991) before
          any court action is filed, except as otherwise allowed by law. This requirement does not apply to a
          dispute involving PESO itself, since it is a government instrumentality, or to parties who do not
          reside or operate in the same city or municipality.
        </p>
        <p>
          Subject to the foregoing, any dispute relating to the Portal shall be brought before the proper
          courts of Urdaneta City, Pangasinan.
        </p>
      </PolicySection>

      <PolicySection id="changes" number={12} title="Changes to These Terms">
        <p>
          We may update these Terms as the Portal or applicable law changes. Material changes will update the
          effective date at the top of this page. Continuing to use the Portal after a change takes effect
          means you accept the updated Terms.
        </p>
      </PolicySection>
    </LegalPageLayout>
  );
}
