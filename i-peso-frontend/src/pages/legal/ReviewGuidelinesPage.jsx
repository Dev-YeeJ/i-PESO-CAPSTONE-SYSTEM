import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import LegalPageLayout, { PolicySection } from './LegalPageLayout'

// Bump when the rules below change materially.
const EFFECTIVE_DATE = 'November 25, 2026'

const inlineLinkClass = 'font-semibold text-[#0A192F] underline decoration-[#B45309]/50 decoration-2 underline-offset-2 hover:decoration-[#B45309]'

const SECTIONS = [
  { id: 'purpose', label: 'Why reviews exist' },
  { id: 'who-can-review', label: 'Who can review' },
  { id: 'what-to-write', label: 'What to write about' },
  { id: 'not-allowed', label: 'What is not allowed' },
  { id: 'serious-problems', label: 'Serious problems' },
  { id: 'privacy', label: 'Your name and privacy' },
  { id: 'employers', label: 'For employers' },
  { id: 'moderation', label: 'How PESO moderates' },
]

/** The rules every review and reply is checked against. */
export default function ReviewGuidelinesPage({ notice = null, after = null }) {
  return (
    <LegalPageLayout
      badge="Verified reviews · i-PESO Urdaneta City"
      badgeIcon={Star}
      title="Review Guidelines"
      description="How job seekers and employers give feedback on i-PESO, what is allowed, and how PESO keeps it fair for both sides."
      effectiveDate={EFFECTIVE_DATE}
      sections={SECTIONS}
      crossLink={{ to: '/privacy-policy', label: 'Privacy Policy' }}
      notice={notice}
      after={after}
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <p className="font-bold">Buod (Filipino)</p>
        <p className="mt-1">
          Ang mga review sa i-PESO ay galing lamang sa mga taong totoong nag-apply sa kumpanya, tungkol sa kanilang hiring process. Hindi ipinapakita ang
          iyong pangalan. Isulat ang tapat mong karanasan. Bawal ang pagmumura, panlalait, diskriminasyon, at paglalagay ng pangalan,
          numero ng telepono o email ng ibang tao. Kung may seryosong problema tulad ng paniningil ng bayad o pekeng trabaho,
          i-report ito sa PESO. Ang mga tapat na review, kahit hindi maganda, ay hindi tinatanggal.
        </p>
      </div>

      <PolicySection id="purpose" number={1} title="Why reviews exist">
        <p>
          Reviews help job seekers in Urdaneta City decide where to apply, and help employers see how their hiring
          process is experienced. They only work if they are honest, fair to both sides, and based on real experience.
        </p>
      </PolicySection>

      <PolicySection id="who-can-review" number={2} title="Who can review">
        <p>
          Every review is tied to a real application in i-PESO. Once you apply to an employer, you can review their
          hiring process: one review per application. You can edit it or take it back at any time.
        </p>
        <p>
          Reviews written earlier about working at a company stay on its profile, counted in the same rating as every
          other review.
        </p>
      </PolicySection>

      <PolicySection id="what-to-write" number={3} title="What to write about">
        <p>
          <strong>Rate how the hiring was handled, not whether you got the job.</strong> Was the employer clear and quick
          to reply? Was the process organized and fair? Were you treated with respect? Did the job posting describe the
          job honestly?
        </p>
        <p>Be specific and stick to your own experience. Negative reviews are welcome when they are honest and respectful.</p>
      </PolicySection>

      <PolicySection id="not-allowed" number={4} title="What is not allowed">
        <ul className="list-disc space-y-1 pl-5">
          <li>Profanity, insults, threats or harassment of anyone.</li>
          <li>Discrimination or remarks about age, sex, gender, religion, disability, ethnicity, civil status, pregnancy or similar traits.</li>
          <li>Personal information: names of individual staff or applicants, phone numbers, emails, addresses or social media accounts.</li>
          <li>Accusations of crimes you can't back up. Report those to PESO instead (see below).</li>
          <li>Fake reviews, reviews written for someone else, or reviews written in exchange for money, favors or pressure.</li>
          <li>Advertising, links and content unrelated to the employer.</li>
        </ul>
      </PolicySection>

      <PolicySection id="serious-problems" number={5} title="Serious problems">
        <p>
          If an employer asked you for a placement or processing fee, posted a fake job, or treated you abusively, use
          <strong> Report this employer</strong> on the company profile. A report goes straight to PESO for investigation.
          A review alone is not enough for problems like these, so please report them too.
        </p>
      </PolicySection>

      <PolicySection id="privacy" number={6} title="Your name and privacy">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your name is never shown. Others see you as a <em>Verified applicant</em>, with the month of your review.</li>
          <li>The employer never sees who wrote a review. PESO staff can see it, only to verify and moderate.</li>
          <li>
            Employers can give feedback about people they hired. The comments are private: only you and PESO can read them,
            on your My Reviews page, as soon as they are written. Employers you apply to can see your average rating from
            employers and how many employers rated you, but never the comments or which companies wrote them.
          </li>
        </ul>
        <p>
          How i-PESO handles personal data is explained in the{' '}
          <Link to="/privacy-policy" className={inlineLinkClass}>Privacy Policy</Link>.
        </p>
      </PolicySection>

      <PolicySection id="employers" number={7} title="For employers">
        <ul className="list-disc space-y-1 pl-5">
          <li>You can post <strong>one public reply</strong> to each review. Keep it professional and don't try to identify the reviewer.</li>
          <li>You cannot edit, hide or delete reviews. PESO checks reviews against these guidelines and hides ones that break them.</li>
          <li>Never pressure, reward or retaliate against anyone for a review, or for not writing one.</li>
          <li>Feedback about people you hired must be about their work: professionalism, communication, reliability and job performance.</li>
        </ul>
      </PolicySection>

      <PolicySection id="moderation" number={8} title="How PESO moderates">
        <ul className="list-disc space-y-1 pl-5">
          <li>Comments with contact details, links or profanity are held for PESO to read before they appear.</li>
          <li>PESO keeps reviews that follow these guidelines, including negative ones, and hides reviews that don't. When a review is hidden, the writer is told why and can edit it.</li>
          <li>Every moderation decision is recorded in i-PESO's activity log.</li>
        </ul>
        <p>Questions about these guidelines can be brought to the PESO office in Urdaneta City.</p>
      </PolicySection>
    </LegalPageLayout>
  )
}
