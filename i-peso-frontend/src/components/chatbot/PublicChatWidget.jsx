import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { chatbotService } from '@/services/chatbotService'

/**
 * Floating assistant for visitors without an account.
 *
 * Mounted once in GuestLayout, so it appears on the landing page, login, and
 * every registration step. Answers come from the Laravel endpoint, which is
 * scoped to public data only — no personal records are ever in play here.
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

const GREETING =
  'Kumusta po! Ako ang i-PESO assistant ng Urdaneta City PESO. Maaari po kayong magtanong ' +
  'tungkol sa registration, trabaho, job fairs, at government programs.'

export default function PublicChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const launcherRef = useRef(null)
  const inputRef = useRef(null)
  const logEndRef = useRef(null)

  // Escape closes the panel from anywhere inside it.
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Move focus into the panel on open, and back to the launcher on close, so
  // keyboard users are never stranded.
  useEffect(() => {
    if (open) inputRef.current?.focus()
    else launcherRef.current?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  const send = async (text) => {
    const question = text.trim()
    if (!question || busy) return

    // Snapshot the history *before* adding the new turn — the server appends
    // the message itself, so sending it twice would duplicate it.
    const history = messages.map(({ role, text: body }) => ({ role, text: body }))

    setMessages((current) => [...current, { role: 'user', text: question }])
    setInput('')
    setBusy(true)

    const { reply } = await chatbotService.askPublic(question, history)

    setMessages((current) => [...current, { role: 'model', text: reply }])
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
            <div>
              <p className="ipeso-chat-title">i-PESO Assistant</p>
              <p className="ipeso-chat-sub">Urdaneta City PESO</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="ipeso-chat-close" aria-label="Close assistant">
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="ipeso-chat-log" aria-live="polite" aria-atomic="false">
            <p className="ipeso-chat-bubble is-model">{GREETING}</p>

            {messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={`ipeso-chat-bubble ${message.role === 'user' ? 'is-user' : 'is-model'}`}
              >
                {message.text}
              </p>
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
