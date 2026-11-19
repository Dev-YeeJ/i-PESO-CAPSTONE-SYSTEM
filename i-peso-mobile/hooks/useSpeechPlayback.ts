import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'
import * as Speech from 'expo-speech'
import { useToastStore } from '@/stores/toastStore'
import { detectSpokenLanguage, textForSpeech } from '@/utils/speechText'

type Target = 'en' | 'fil'

const norm = (lang: string) => lang.toLowerCase().replace('_', '-')

/** Best installed voice for the target language, or null when the device has none. */
function pickVoice(voices: Speech.Voice[], target: Target): Speech.Voice | null {
  const matches = voices.filter((voice) => {
    const lang = norm(voice.language)
    return target === 'fil' ? lang.startsWith('fil') || lang.startsWith('tl') : lang.startsWith('en')
  })
  if (!matches.length) return null
  const rank = (voice: Speech.Voice) => {
    const lang = norm(voice.language)
    let score = voice.quality === Speech.VoiceQuality.Enhanced ? 2 : 0
    if (target === 'en' && lang === 'en-ph') score += 3
    if (target === 'en' && lang === 'en-us') score += 1
    return score
  }
  return [...matches].sort((a, b) => rank(b) - rank(a))[0]
}

/**
 * "Listen" for ACE replies (text-to-speech via expo-speech, which also works in Expo Go).
 *
 * One utterance at a time: starting a new one stops the previous, and every callback is
 * matched against the id that is current *now*, so a late onStopped/onDone from an earlier
 * utterance can never reset the button of the one playing. Speech stops when the screen
 * unmounts.
 */
export function useSpeechPlayback() {
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const currentRef = useRef<string | null>(null)
  const voicesRef = useRef<Speech.Voice[] | null>(null)
  const warnedNoFilipinoRef = useRef(false)

  useEffect(() => () => {
    currentRef.current = null
    Speech.stop().catch(() => undefined)
  }, [])

  const finish = useCallback((id: string) => {
    if (currentRef.current === id) {
      currentRef.current = null
      setSpeakingId(null)
    }
  }, [])

  const stop = useCallback(() => {
    currentRef.current = null
    setSpeakingId(null)
    Speech.stop().catch(() => undefined)
  }, [])

  const start = useCallback(async (id: string, text: string, target: Target) => {
    currentRef.current = id
    setSpeakingId(id)
    await Speech.stop().catch(() => undefined)

    if (!voicesRef.current) {
      try {
        voicesRef.current = await Speech.getAvailableVoicesAsync()
      } catch {
        voicesRef.current = []
      }
    }
    // Another Listen (or Stop) was tapped while we were getting ready.
    if (currentRef.current !== id) return

    const voice = pickVoice(voicesRef.current, target)
    if (target === 'fil' && !voice && !warnedNoFilipinoRef.current) {
      warnedNoFilipinoRef.current = true
      useToastStore.getState().showToast(
        'No Filipino voice on this phone — using the default voice. You can add one in Settings › Text-to-speech.',
        'info',
      )
    }

    Speech.speak(text, {
      language: voice?.language ?? (target === 'fil' ? 'fil-PH' : 'en-US'),
      voice: voice?.identifier,
      rate: 0.95,
      onDone: () => finish(id),
      onStopped: () => finish(id),
      onError: () => {
        finish(id)
        useToastStore.getState().showToast('Could not play this reply aloud. Please try again.', 'error')
      },
    })
  }, [finish])

  /** Tap Listen: play this reply (stopping any other), or stop it if it is the one playing. */
  const toggle = useCallback((id: string, rawText: string) => {
    if (currentRef.current === id) {
      stop()
      return
    }
    const text = textForSpeech(rawText, Speech.maxSpeechInputLength)
    if (!text) return

    const language = detectSpokenLanguage(rawText)
    if (language === 'pag') {
      // No phone ships a Pangasinan voice. Keep the Pangasinan text as it is and say so,
      // rather than silently reading it in another language.
      Alert.alert(
        'Walang boses para sa Pangasinan',
        'Pangasinan voice playback isn’t available on this phone. The reply stays in Pangasinan. Do you want to hear it read with the Filipino voice instead? Some words may sound off.',
        [
          { text: 'Huwag na', style: 'cancel' },
          { text: 'Basahin sa Filipino', onPress: () => { start(id, text, 'fil') } },
        ],
      )
      return
    }
    start(id, text, language === 'en' ? 'en' : 'fil')
  }, [start, stop])

  return { speakingId, toggle, stop }
}
