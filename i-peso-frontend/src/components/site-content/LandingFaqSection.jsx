import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircleQuestion } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import RichText from './RichText'
import { FaqFeedback, FaqLink } from './HelpCenter'

/**
 * Landing page "Common questions": the (at most five) FAQs PESO staff marked
 * Featured. Renders nothing when none are featured.
 */
export default function LandingFaqSection({ faqs = [], office }) {
  if (!faqs.length) return null

  return (
    <section id="faq" className="relative z-10 border-t border-white/5 bg-[#0D1F38] px-6 py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/15 text-yellow-400">
            <MessageCircleQuestion className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">Common questions</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">Answers before you visit the office.</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">Straight from PESO Urdaneta City. More answers are on the Help page.</p>
          <Link to="/help" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-yellow-400 hover:text-yellow-300">
            See all questions <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white px-5 text-[#0A192F] shadow-xl sm:px-6">
          <Accordion type="single" collapsible>
            {faqs.map((faq) => (
              <AccordionItem key={faq.id} value={`faq-${faq.id}`}>
                <AccordionTrigger className="text-[15px]">{faq.question}</AccordionTrigger>
                <AccordionContent>
                  <RichText text={faq.answer} office={office} className="space-y-3 leading-6 text-slate-700" />
                  <FaqLink faq={faq} className="mt-4" />
                  <FaqFeedback faqId={faq.id} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
