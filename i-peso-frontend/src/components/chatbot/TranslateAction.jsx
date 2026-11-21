import { useEffect, useRef, useState } from 'react'
import { Languages, Loader2 } from 'lucide-react'
import { TRANSLATE_LANGUAGES } from '@/services/chatbotService'

/**
 * "Translate" under one of ACE's messages (panel revision #6): a small menu
 * of the languages ACE understands. The parent owns the translated text and
 * shows it in the bubble; this only asks for a language.
 *
 * @param {{ current: string|null, busy: boolean, onPick: (language: string) => void, label?: string }} props
 *   current — the language now shown (null = original), so it can be marked and skipped.
 */
export default function TranslateAction({ current, busy, onPick, label = 'message' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={rootRef} className="ipeso-chat-translate">
      <button
        type="button"
        className="ipeso-chat-voice-action"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Translate ${label}`}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        {busy ? <Loader2 size={14} className="ipeso-chat-spin" aria-hidden /> : <Languages size={14} aria-hidden />}
        {busy ? 'Translating…' : 'Translate'}
      </button>
      {open && (
        <span role="menu" aria-label="Translate to" className="ipeso-chat-translate-menu">
          {TRANSLATE_LANGUAGES.map((language) => (
            <button
              key={language.value}
              type="button"
              role="menuitemradio"
              aria-checked={current === language.value}
              disabled={current === language.value}
              onClick={() => { setOpen(false); onPick(language.value) }}
            >
              {language.label}
            </button>
          ))}
        </span>
      )}
    </span>
  )
}
