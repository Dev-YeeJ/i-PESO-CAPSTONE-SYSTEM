import { useId, useState } from 'react'
import { CalendarDays, ChevronDown, FileText, ListChecks, MapPin, Phone, Users } from 'lucide-react'
import { categoryLabel } from './programConstants'

const formatDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * A government program on the public landing page.
 *
 * Expands in place rather than linking anywhere: the programs list and detail
 * pages need a signed-in seeker (they score eligibility per person), so a card
 * that navigated would dead-end a visitor at a login wall. Everything a
 * citizen needs to act — who qualifies, what to bring, the PESO steps, where
 * to go and who to ask — is readable here without an account, which is the
 * point of the module. Government Programs is postings and announcements
 * only; the transaction happens in person at PESO.
 */
export default function PublicProgramCard({ program }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  const deadline = formatDate(program.application_deadline)
  const start = formatDate(program.start_date)
  const slotsLeft = program.total_slots > 0 ? program.available_slots : null

  const requirements = program.eligibility_requirements ?? []
  const documents = program.required_documents ?? []
  const steps = program.citizen_charter_steps ?? []
  const contact = [program.contact_person, program.contact_phone, program.contact_email].filter(Boolean)
  const hasDetail = requirements.length || documents.length || steps.length || contact.length || program.description

  return (
    <div className="rounded-xl border border-[#0A192F]/10 bg-white shadow-sm transition-all hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        disabled={!hasDetail}
        className="flex w-full flex-col items-start gap-2 p-5 text-left disabled:cursor-default"
      >
        <span className="flex w-full items-start justify-between gap-3">
          <span className="font-mono text-[10px] font-medium tracking-wide text-[#B45309]">{categoryLabel(program.category)}</span>
          {hasDetail && (
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          )}
        </span>

        <h3 className="text-sm font-bold leading-snug text-[#0A192F]">{program.name}</h3>
        {program.blurb && <p className="text-xs leading-relaxed text-slate-600 line-clamp-3">{program.blurb}</p>}

        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
          {deadline && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> Until {deadline}
            </span>
          )}
          {slotsLeft !== null && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {slotsLeft} of {program.total_slots} slots left
            </span>
          )}
          {program.venue && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {program.venue}
            </span>
          )}
        </span>
      </button>

      {open && hasDetail && (
        <div id={panelId} className="space-y-4 border-t border-[#0A192F]/10 px-5 py-4 text-xs leading-relaxed text-slate-600">
          {program.description && <p className="whitespace-pre-line">{program.description}</p>}

          {program.target_beneficiaries && (
            <p><span className="font-bold text-[#0A192F]">Who it is for: </span>{program.target_beneficiaries}</p>
          )}

          {start && <p><span className="font-bold text-[#0A192F]">Starts: </span>{start}</p>}

          {requirements.length > 0 && (
            <DetailList icon={<ListChecks className="h-3.5 w-3.5" />} title="Who qualifies" items={requirements} />
          )}
          {documents.length > 0 && (
            <DetailList icon={<FileText className="h-3.5 w-3.5" />} title="What to bring" items={documents} />
          )}
          {steps.length > 0 && (
            <DetailList icon={<ListChecks className="h-3.5 w-3.5" />} title="How to avail" items={steps} ordered />
          )}

          {(contact.length > 0 || program.location_address) && (
            <div>
              <p className="flex items-center gap-1.5 font-bold text-[#0A192F]"><Phone className="h-3.5 w-3.5" /> Where to go</p>
              {program.location_address && <p className="mt-1">{program.location_address}</p>}
              {contact.length > 0 && <p className="mt-1">{contact.join(' · ')}</p>}
            </div>
          )}

          <p className="rounded-lg bg-[#F8F7F2] p-3 font-semibold text-[#0A192F]">
            Apply in person at the PESO office — bring the documents above. Registering on i-PESO lets you check your eligibility before you go.
          </p>
        </div>
      )}
    </div>
  )
}

function DetailList({ icon, title, items, ordered = false }) {
  const ListTag = ordered ? 'ol' : 'ul'

  return (
    <div>
      <p className="flex items-center gap-1.5 font-bold text-[#0A192F]">{icon} {title}</p>
      <ListTag className={`mt-1.5 space-y-1 pl-4 ${ordered ? 'list-decimal' : 'list-disc'}`}>
        {items.map((item, index) => <li key={index}>{item}</li>)}
      </ListTag>
    </div>
  )
}
