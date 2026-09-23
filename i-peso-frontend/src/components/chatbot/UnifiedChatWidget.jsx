import { createElement, useEffect, useRef, useState } from 'react'
import {
  MapPin, Send, X, Sparkles, LogIn, KeyRound, HelpCircle,
  UserPlus, Briefcase, CalendarDays, BadgeCheck,
  CheckCircle2, UserCog, Users, ClipboardList,
} from 'lucide-react'
import { chatbotService } from '@/services/chatbotService'
import { useAuthStore } from '@/stores/authStore'
import AceMascot from './AceMascot'
import AceAvatarMark from './AceAvatarMark'

import JobCardList from './RichComponents/JobCardList'
import InteractiveMap from './RichComponents/InteractiveMap'
import JobFairCard from './RichComponents/JobFairCard'
import ActionButtons from './RichComponents/ActionButtons'

/**
 * Unified chat widget — appears on every screen (guest, seeker, employer).
 *
 * Mounted once in App.jsx so it persists across navigation. The backend
 * detects the authenticated user (if any) and adjusts the assistant's context.
 */

// How long the "Ace is arriving" beat holds before the greeting bubble
// swaps in — timed to land as the greeting rig's wave animation starts
// (see aceWaveArm's 0.85s delay in AceMascot.css) so the text lands right
// as Ace waves, instead of appearing the instant the panel opens.
const GREETING_REVEAL_DELAY = 800

const GUEST_STARTERS = [
  { icon: HelpCircle, text: 'Ano po ang i-PESO?' },
  { icon: UserPlus, text: 'Paano po mag-register?' },
  { icon: LogIn, text: 'Paano po mag-login?' },
  { icon: KeyRound, text: 'Nakalimutan ko ang password ko, paano mababawi?' },
]

const SEEKER_STARTERS = [
  { icon: CheckCircle2, text: 'Ano po ang status ng mga application ko?' },
  { icon: ClipboardList, text: 'May interview schedule po ba ako?' },
  { icon: UserCog, text: 'Ano po ang kailangan para maging kumpleto ang profile?' },
  { icon: CalendarDays, text: 'Kailan po ang susunod na job fair?' },
]

const EMPLOYER_STARTERS = [
  { icon: Briefcase, text: 'Paano mag-post ng bakante?' },
  { icon: Users, text: 'Ilan po ang aplikante sa mga bakante ko?' },
  { icon: ClipboardList, text: 'Paano gumawa ng placement report?' },
  { icon: CalendarDays, text: 'Paano mag-register sa job fair bilang employer?' },
]

function startersFor(user) {
  if (!user) return GUEST_STARTERS
  if (user.role === 'employer') return EMPLOYER_STARTERS
  if (user.role === 'seeker') return SEEKER_STARTERS
  return GUEST_STARTERS
}

const DEFAULT_GREETING =
  'Kumusta po! Ako si Ace, ang i-PESO assistant ng Urdaneta City PESO. ' +
  'Maaari po kayong magtanong tungkol sa registration, trabaho, job fairs, at government programs.'

function greetingFor(user) {
  if (!user) return DEFAULT_GREETING

  const name = user.first_name || user.company_name
  const hello = `Kumusta po${name ? ` ${name}` : ''}!`

  if (user.role === 'employer') {
    return `${hello} Ako si Ace, ang inyong Assistant for Career and Employment. ` +
      'Kaya ko kayong tulungan sa job postings, mga aplikante, o job fair registration — ano po ang gagawin natin ngayon?'
  }

  if (user.role === 'seeker') {
    return `${hello} Ako si Ace, ang inyong Assistant for Career and Employment. ` +
      'Tanungin mo ako tungkol sa job matches, application status, o job fairs — paano kita matutulungan ngayon?'
  }

  return `${hello} Ako si Ace, ang i-PESO assistant. Paano ko kayo matutulungan ngayon?`
}

/** Matches a bare URL or email address inside otherwise plain chat text. */
const URL_OR_EMAIL = /(https?:\/\/[^\s]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g

function linkifyText(text) {
  return text.split(URL_OR_EMAIL).map((part, index) => {
    if (!part) return null

    const isUrl = /^https?:\/\//.test(part)
    const isEmail = !isUrl && /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(part)
    if (!isUrl && !isEmail) return part

    const trailing = part.match(/[.,)\]]+$/)?.[0] ?? ''
    const clean = trailing ? part.slice(0, part.length - trailing.length) : part

    return (
      <span key={index}>
        <a
          href={isUrl ? clean : `mailto:${clean}`}
          target={isUrl ? '_blank' : undefined}
          rel={isUrl ? 'noreferrer' : undefined}
          className="ipeso-chat-inline-link"
        >
          {clean}
        </a>
        {trailing}
      </span>
    )
  })
}

export default function UnifiedChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [greetingVisible, setGreetingVisible] = useState(false)
  const user = useAuthStore((state) => state.user)

  const launcherRef = useRef(null)
  const inputRef = useRef(null)
  const logEndRef = useRef(null)
  const aceRef = useRef(null)

  const openPanel = () => {
    // Reset before the open-triggered effect runs, so the panel never
    // flashes a stale greeting bubble from a previous session.
    setGreetingVisible(false)
    setOpen(true)
  }
  const closePanel = () => setOpen(false)

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape') closePanel() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (!open) {
      launcherRef.current?.focus({ preventScroll: true })
      return undefined
    }

    inputRef.current?.focus()
    if (aceRef.current) { aceRef.current.play('greeting') }
    const revealTimer = setTimeout(() => setGreetingVisible(true), GREETING_REVEAL_DELAY)
    return () => clearTimeout(revealTimer)
  }, [open])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  const handleInputFocus = () => {
    if (aceRef.current && !busy) { aceRef.current.play('listening') }
  }
  const handleInputBlur = () => {
    if (aceRef.current && !busy) { aceRef.current.play('idle') }
  }

  const send = async (text) => {
    const question = text.trim()
    if (!question || busy) return

    const history = messages.map(({ role, text: body }) => ({ role, text: body }))
    setMessages((current) => [...current, { role: 'user', text: question }])
    setInput('')
    setBusy(true)

    if (aceRef.current) { aceRef.current.play('thinking') }

    const { reply, officeLocation, retryable, toolResults } = await chatbotService.askPublic(question, history)

    if (retryable) {
      if (aceRef.current) { aceRef.current.play('error') }
    } else {
      if (aceRef.current) { aceRef.current.play('success') }
    }

    setMessages((current) => [...current, { role: 'model', text: reply, officeLocation, toolResults }])
    setBusy(false)
  }

  const onSubmit = (event) => {
    event.preventDefault()
    send(input)
  }

  const greetingText = greetingFor(user)
  const starters = startersFor(user)

  return (
    <div className="ipeso-chat">
      {open && (
        <section className="ipeso-chat-panel" role="dialog" aria-label="Ace — i-PESO assistant">

          {/* ── Hero header with Ace ── */}
          <header className="ipeso-chat-hero">
            <div className="ipeso-chat-hero-bg" />
            <button type="button" onClick={closePanel} className="ipeso-chat-close" aria-label="Close assistant">
              <X size={18} aria-hidden="true" />
            </button>
            <div className="ipeso-chat-hero-content">
              <AceMascot ref={aceRef} className="ipeso-chat-ace" />
              <div className="ipeso-chat-hero-text">
                <p className="ipeso-chat-hero-name">
                  <Sparkles size={14} aria-hidden="true" />
                  Ace
                </p>
                <p className="ipeso-chat-hero-role">Assistant for Career and Employment</p>
              </div>
            </div>
            <div className="ipeso-chat-hero-status">
              <span className="ipeso-chat-status-dot" />
              Online — Urdaneta City PESO
            </div>
          </header>

          {/* ── Message log ── */}
          <div className="ipeso-chat-log" aria-live="polite" aria-atomic="false">

            {/* Greeting bubble — holds on a typing beat until Ace's
                greeting animation lands, so it reads as a live greeting
                rather than static text that was just there on open. */}
            <div className="ipeso-chat-msg is-ace">
              <AceAvatarMark className="ipeso-chat-msg-avatar" />
              {greetingVisible ? (
                <p className="ipeso-chat-bubble is-model">{greetingText}</p>
              ) : (
                <p className="ipeso-chat-bubble is-model is-typing" aria-label="Ace is greeting you">
                  <span /><span /><span />
                </p>
              )}
            </div>

            {messages.map((message, index) => {
              const hasJobs = message.toolResults?.search_job_vacancies?.vacancies?.length > 0;
              const hasFairs = message.toolResults?.list_job_fairs?.upcoming_job_fairs?.length > 0;

              return (
                <div key={`${message.role}-${index}`}>
                  <div className={`ipeso-chat-msg ${message.role === 'user' ? 'is-user' : 'is-ace'}`}>
                    {message.role !== 'user' && <AceAvatarMark className="ipeso-chat-msg-avatar" />}
                    
                    <div className="flex flex-col w-full">
                      <p className={`ipeso-chat-bubble ${message.role === 'user' ? 'is-user' : 'is-model'}`}>
                        {linkifyText(message.text)}
                      </p>

                      {message.role === 'model' && hasJobs && (
                        <div className="mt-2 w-full max-w-sm">
                          <InteractiveMap jobs={message.toolResults.search_job_vacancies.vacancies} />
                          <JobCardList jobs={message.toolResults.search_job_vacancies.vacancies} />
                          <ActionButtons context="jobs" onActionSelected={send} />
                        </div>
                      )}

                      {message.role === 'model' && hasFairs && (
                        <div className="mt-2 w-full max-w-sm">
                          <JobFairCard fairs={message.toolResults.list_job_fairs.upcoming_job_fairs} />
                        </div>
                      )}
                      
                      {message.role === 'model' && !hasJobs && !hasFairs && index === messages.length - 1 && (
                         <div className="mt-2 w-full max-w-sm">
                           <ActionButtons context="default" onActionSelected={send} />
                         </div>
                      )}
                    </div>
                  </div>
                  {message.officeLocation && <InlineOfficeMap address={message.officeLocation.address} />}
                </div>
              )
            })}

            {busy && (
              <div className="ipeso-chat-msg is-ace">
                <AceAvatarMark className="ipeso-chat-msg-avatar" />
                <p className="ipeso-chat-bubble is-model is-typing" aria-label="Ace is thinking">
                  <span /><span /><span />
                </p>
              </div>
            )}

            {messages.length === 0 && !busy && greetingVisible && (
              <div className="ipeso-chat-starters">
                <p className="ipeso-chat-starters-label">Mga Madalas Itanong</p>
                {starters.map(({ icon: Icon, text }) => (
                  <button key={text} type="button" onClick={() => send(text)} className="ipeso-chat-starter">
                    {createElement(Icon, { size: 15, className: 'ipeso-chat-starter-icon', 'aria-hidden': true })}
                    {text}
                  </button>
                ))}
              </div>
            )}

            <div ref={logEndRef} />
          </div>

          {/* ── Composer ── */}
          <form onSubmit={onSubmit} className="ipeso-chat-form">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              maxLength={500}
              placeholder="Magtanong kay Ace…"
              aria-label="Your question"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send message">
              <Send size={16} aria-hidden="true" />
            </button>
          </form>

          <p className="ipeso-chat-foot">
            Powered by iChitech · Batay sa impormasyon ng PESO
          </p>
        </section>
      )}

      {/* ── Launcher FAB with Ace ── */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        className={`ipeso-chat-launcher ${open ? 'is-open' : ''}`}
        aria-expanded={open}
        aria-label={open ? 'Close Ace assistant' : 'Ask Ace'}
      >
        {open ? (
          <X size={22} aria-hidden="true" />
        ) : (
          <>
            <AceMascot className="ipeso-chat-launcher-ace" />
            <span className="ipeso-chat-launcher-pulse" />
          </>
        )}
      </button>
    </div>
  )
}

function InlineOfficeMap({ address }) {
  const mapKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(mapKey)}&q=${encodeURIComponent(address)}`
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  return (
    <div className="ipeso-chat-map-card">
      <p className="ipeso-chat-map-card-label">
        <MapPin size={13} aria-hidden="true" />
        PESO Urdaneta City
      </p>

      {mapKey ? (
        <iframe
          title="PESO office location"
          src={mapUrl}
          className="ipeso-chat-map-card-iframe"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <p className="ipeso-chat-map-card-fallback">{address}</p>
      )}

      <a href={directionsUrl} target="_blank" rel="noreferrer" className="ipeso-chat-map-card-link">
        Buksan sa Google Maps
      </a>
    </div>
  )
}
