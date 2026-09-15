import { useEffect, useRef, useState } from 'react'
import { MapPin, Send, X, Sparkles } from 'lucide-react'
import { chatbotService } from '@/services/chatbotService'
import { useAuthStore } from '@/stores/authStore'
import AceMascot from './AceMascot'

/**
 * Unified chat widget — appears on every screen (guest, seeker, employer).
 *
 * Mounted once in App.jsx so it persists across navigation. The backend
 * detects the authenticated user (if any) and adjusts the AI's context.
 */

const STARTERS = [
  { emoji: '📝', text: 'Paano po mag-register?' },
  { emoji: '🔧', text: 'May trabaho po ba para sa welder?' },
  { emoji: '🎪', text: 'Kailan po ang susunod na job fair?' },
  { emoji: '💰', text: 'Libre po ba ang i-PESO?' },
]

const DEFAULT_GREETING =
  'Kumusta po! Ako si Ace, ang i-PESO assistant ng Urdaneta City PESO. ' +
  'Maaari po kayong magtanong tungkol sa registration, trabaho, job fairs, at government programs.'

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
  const user = useAuthStore((state) => state.user)

  const launcherRef = useRef(null)
  const inputRef = useRef(null)
  const logEndRef = useRef(null)
  const aceRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

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

    const { reply, officeLocation, retryable } = await chatbotService.askPublic(question, history)

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

  const greetingText = user
    ? `Kumusta po${user.first_name || user.company_name ? ` ${user.first_name || user.company_name}` : ''}! Ako si Ace, ang i-PESO assistant. Paano ko kayo matutulungan ngayon?`
    : DEFAULT_GREETING

  return (
    <div className="ipeso-chat">
      {open && (
        <section className="ipeso-chat-panel" role="dialog" aria-label="Ace — i-PESO assistant">

          {/* ── Hero header with Ace ── */}
          <header className="ipeso-chat-hero">
            <div className="ipeso-chat-hero-bg" />
            <button type="button" onClick={() => setOpen(false)} className="ipeso-chat-close" aria-label="Close assistant">
              <X size={18} aria-hidden="true" />
            </button>
            <div className="ipeso-chat-hero-content">
              <AceMascot ref={aceRef} className="ipeso-chat-ace" />
              <div className="ipeso-chat-hero-text">
                <p className="ipeso-chat-hero-name">
                  <Sparkles size={14} aria-hidden="true" />
                  Ace
                </p>
                <p className="ipeso-chat-hero-role">i-PESO AI Assistant</p>
              </div>
            </div>
            <div className="ipeso-chat-hero-status">
              <span className="ipeso-chat-status-dot" />
              Online — Urdaneta City PESO
            </div>
          </header>

          {/* ── Message log ── */}
          <div className="ipeso-chat-log" aria-live="polite" aria-atomic="false">

            {/* Greeting bubble */}
            <div className="ipeso-chat-msg is-ace">
              <div className="ipeso-chat-msg-avatar">A</div>
              <p className="ipeso-chat-bubble is-model">{greetingText}</p>
            </div>

            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`}>
                <div className={`ipeso-chat-msg ${message.role === 'user' ? 'is-user' : 'is-ace'}`}>
                  {message.role !== 'user' && <div className="ipeso-chat-msg-avatar">A</div>}
                  <p className={`ipeso-chat-bubble ${message.role === 'user' ? 'is-user' : 'is-model'}`}>
                    {linkifyText(message.text)}
                  </p>
                </div>
                {message.officeLocation && <InlineOfficeMap address={message.officeLocation.address} />}
              </div>
            ))}

            {busy && (
              <div className="ipeso-chat-msg is-ace">
                <div className="ipeso-chat-msg-avatar">A</div>
                <p className="ipeso-chat-bubble is-model is-typing" aria-label="Ace is thinking">
                  <span /><span /><span />
                </p>
              </div>
            )}

            {messages.length === 0 && !busy && (
              <div className="ipeso-chat-starters">
                <p className="ipeso-chat-starters-label">Mga Madalas Itanong</p>
                {STARTERS.map(({ emoji, text }) => (
                  <button key={text} type="button" onClick={() => send(text)} className="ipeso-chat-starter">
                    <span className="ipeso-chat-starter-emoji">{emoji}</span>
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
            Powered by AI · Batay sa impormasyon ng PESO
          </p>
        </section>
      )}

      {/* ── Launcher FAB with Ace ── */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
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
