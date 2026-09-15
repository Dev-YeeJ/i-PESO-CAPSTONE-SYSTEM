import { useEffect, useRef, useState } from 'react'
import { MapPin, MessageCircle, Send, X } from 'lucide-react'
import { chatbotService } from '@/services/chatbotService'
import { useAuthStore } from '@/stores/authStore'
import AceMascot from './AceMascot'

/**
 * Unified chat widget — appears on every screen (guest, seeker, employer).
 *
 * Mounted once in App.jsx so it persists across navigation. The backend
 * detects the authenticated user (if any) and adjusts the AI's context.
 */

/**
 * Guests rarely know what a chatbot can do, so the opening move is showing
 * them. These four are the highest-frequency guest questions: what do I need,
 * is there work, when is the next event, and does this cost anything.
 */
const STARTERS = [
  'Paano po mag-register?',
  'May trabaho po ba para sa welder?',
  'Kailan po ang susunod na job fair?',
  'Libre po ba ang i-PESO?',
]

const DEFAULT_GREETING =
  'Kumusta po! Ako ang i-PESO assistant ng Urdaneta City PESO. Maaari po kayong magtanong ' +
  'tungkol sa registration, trabaho, job fairs, at government programs.'

/** Matches a bare URL or email address inside otherwise plain chat text. */
const URL_OR_EMAIL = /(https?:\/\/[^\s]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g

/**
 * Turns bare URLs and email addresses in the assistant's plain-text reply
 * into clickable links, without pulling in a markdown renderer the model was
 * never asked to produce output for.
 */
function linkifyText(text) {
  return text.split(URL_OR_EMAIL).map((part, index) => {
    if (!part) return null

    const isUrl = /^https?:\/\//.test(part)
    const isEmail = !isUrl && /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(part)
    if (!isUrl && !isEmail) return part

    // The model often leaves the match butted up against sentence
    // punctuation, e.g. "...facebook.com/page. Maaari" — that trailing
    // punctuation is not part of the link.
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
  const user = useAuthStore((state) => state.user)

  const launcherRef = useRef(null)
  const inputRef = useRef(null)
  const logEndRef = useRef(null)
  const aceRef = useRef(null)

  // Escape closes the panel from anywhere inside it.
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Play greeting when the chat panel opens; move focus into the panel on
  // open, and back to the launcher on close, so keyboard users are never
  // stranded.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      if (aceRef.current) { aceRef.current.play('greeting') }
    } else {
      launcherRef.current?.focus({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  // --- Input focus/blur → Ace listening/idle ---
  const handleInputFocus = () => {
    if (aceRef.current && !busy) { aceRef.current.play('listening') }
  }
  const handleInputBlur = () => {
    if (aceRef.current && !busy) { aceRef.current.play('idle') }
  }

  const send = async (text) => {
    const question = text.trim()
    if (!question || busy) return

    // Snapshot the history *before* adding the new turn — the server appends
    // the message itself, so sending it twice would duplicate it.
    const history = messages.map(({ role, text: body }) => ({ role, text: body }))

    setMessages((current) => [...current, { role: 'user', text: question }])
    setInput('')
    setBusy(true)

    // → Ace: thinking (right before the request goes out)
    if (aceRef.current) { aceRef.current.play('thinking') }

    const { reply, officeLocation, retryable } = await chatbotService.askPublic(question, history)

    // chatbotService.askPublic never throws — errors are returned as
    // { reply: "...", retryable: true/false }. A retryable response means
    // the backend returned a 429/503 or a network failure happened.
    if (retryable) {
      if (aceRef.current) { aceRef.current.play('error') }
    } else {
      if (aceRef.current) { aceRef.current.play('success') }
    }

    setMessages((current) => [...current, { role: 'model', text: reply, officeLocation }])
    setBusy(false)
  }

  const onSubmit = (event) => {
    event.preventDefault()
    send(input)
  }

  return (
    <div className="ipeso-chat">
      {open && (
        <section className="ipeso-chat-panel" role="dialog" aria-label="i-PESO assistant">
          <header className="ipeso-chat-header">
            <div className="ipeso-chat-header-left">
              <AceMascot ref={aceRef} className="ipeso-chat-ace" />
              <div>
                <p className="ipeso-chat-title">Ace — i-PESO Assistant</p>
                <p className="ipeso-chat-sub">Urdaneta City PESO</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="ipeso-chat-close" aria-label="Close assistant">
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="ipeso-chat-log" aria-live="polite" aria-atomic="false">
            <p className="ipeso-chat-bubble is-model">
              {user ? `Kumusta po${user.first_name || user.company_name ? ` ${user.first_name || user.company_name}` : ''}! Ako si Ace, ang i-PESO assistant. Paano ko kayo matutulungan ngayon?` : DEFAULT_GREETING}
            </p>

            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`}>
                <p className={`ipeso-chat-bubble ${message.role === 'user' ? 'is-user' : 'is-model'}`}>
                  {linkifyText(message.text)}
                </p>
                {message.officeLocation && <InlineOfficeMap address={message.officeLocation.address} />}
              </div>
            ))}

            {busy && (
              <p className="ipeso-chat-bubble is-model is-typing" aria-label="Assistant is typing">
                <span /><span /><span />
              </p>
            )}

            {messages.length === 0 && !busy && (
              <div className="ipeso-chat-starters">
                {STARTERS.map((starter) => (
                  <button key={starter} type="button" onClick={() => send(starter)} className="ipeso-chat-starter">
                    {starter}
                  </button>
                ))}
              </div>
            )}

            <div ref={logEndRef} />
          </div>

          <form onSubmit={onSubmit} className="ipeso-chat-form">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              maxLength={500}
              placeholder="Magtanong po kayo…"
              aria-label="Your question"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send message">
              <Send size={16} aria-hidden="true" />
            </button>
          </form>

          <p className="ipeso-chat-foot">
            Sagot batay sa impormasyon ng PESO. Huwag pong maglagay ng personal na impormasyon dito.
          </p>
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="ipeso-chat-launcher"
        aria-expanded={open}
        aria-label={open ? 'Close i-PESO assistant' : 'Open i-PESO assistant'}
      >
        {open ? <X size={22} aria-hidden="true" /> : <MessageCircle size={22} aria-hidden="true" />}
      </button>
    </div>
  )
}

/**
 * Map shown right in the chat log when the visitor asked a "where" question
 * and the reply gave the office's on-record address. The embed accepts a
 * free-text address directly — no geocoding needed on our side.
 */
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
