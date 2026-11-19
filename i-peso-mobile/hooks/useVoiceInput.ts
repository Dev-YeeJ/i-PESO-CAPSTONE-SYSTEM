import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Linking, Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo'
import * as SecureStore from 'expo-secure-store'
import type { ExpoSpeechRecognitionErrorEvent, ExpoSpeechRecognitionOptions } from 'expo-speech-recognition'
import { useToastStore } from '@/stores/toastStore'

/**
 * Voice input for ACE (speech-to-text via expo-speech-recognition).
 *
 * The native module only exists in a development/production build — not in Expo Go. It is
 * loaded lazily and only if present, because the package throws at import time otherwise,
 * which would take the whole chat screen down. Without it the mic explains that it needs the
 * app build and typing still works.
 */
type RecognitionPackage = typeof import('expo-speech-recognition')
let recognitionPackage: RecognitionPackage | null | undefined
function loadRecognition(): RecognitionPackage | null {
  if (recognitionPackage !== undefined) return recognitionPackage
  try {
    recognitionPackage = requireOptionalNativeModule('ExpoSpeechRecognition')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ? (require('expo-speech-recognition') as RecognitionPackage)
      : null
  } catch {
    recognitionPackage = null
  }
  return recognitionPackage
}

/**
 * - auto: Filipino recognition (handles Taglish), with Android's automatic Filipino⇄English
 *   switching where the phone supports it.
 * - fil-PH / en-US: one language only.
 * No speech engine offers Pangasinan; Pangasinan speech goes through the Filipino recogniser
 * and may come out partly wrong, so the user always reviews the text before sending.
 */
export type VoiceLanguage = 'auto' | 'fil-PH' | 'en-US'
export const VOICE_LANGUAGE_LABEL: Record<VoiceLanguage, string> = {
  auto: 'Auto (Filipino + English)',
  'fil-PH': 'Filipino',
  'en-US': 'English',
}
const STORE_KEY = 'ace-voice-language'
const SWITCH_LANGUAGES = ['fil-PH', 'en-US']

const toast = (message: string, variant: 'info' | 'error' = 'info') => useToastStore.getState().showToast(message, variant)

const joinText = (base: string, spoken: string) => [base, spoken.trim()].filter(Boolean).join(base ? ' ' : '')

export function useVoiceInput(onText: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [language, setLanguageState] = useState<VoiceLanguage>('auto')

  const onTextRef = useRef(onText)
  useEffect(() => { onTextRef.current = onText })
  const baseRef = useRef('')
  const activeRef = useRef(false)
  const usedSwitchRef = useRef(false)
  const retriedRef = useRef(false)
  const switchDisabledRef = useRef(false)
  const localesRef = useRef<string[] | null>(null)
  const warnedNoFilipinoRef = useRef(false)
  const languageRef = useRef<VoiceLanguage>('auto')
  useEffect(() => { languageRef.current = language }, [language])

  // Remembered choice from a previous session.
  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY)
      .then((saved) => {
        if (saved === 'auto' || saved === 'fil-PH' || saved === 'en-US') setLanguageState(saved)
      })
      .catch(() => undefined)
  }, [])

  const setLanguage = useCallback((next: VoiceLanguage) => {
    setLanguageState(next)
    SecureStore.setItemAsync(STORE_KEY, next).catch(() => undefined)
  }, [])

  const begin = useCallback(async () => {
    const pkg = loadRecognition()
    if (!pkg) return
    const module = pkg.ExpoSpeechRecognitionModule
    const choice = languageRef.current
    let lang = choice === 'en-US' ? 'en-US' : 'fil-PH'

    // Only use Filipino if this phone's recogniser offers it (an empty list means "unknown").
    if (lang === 'fil-PH') {
      if (!localesRef.current) {
        try {
          const { locales } = await module.getSupportedLocales({})
          localesRef.current = locales.map((l) => l.toLowerCase().replace('_', '-'))
        } catch {
          localesRef.current = []
        }
      }
      const known = localesRef.current
      if (known.length && !known.some((l) => l.startsWith('fil') || l.startsWith('tl'))) {
        lang = 'en-US'
        if (!warnedNoFilipinoRef.current) {
          warnedNoFilipinoRef.current = true
          toast('Filipino voice input isn’t available on this phone — listening in English.')
        }
      }
    }

    const useSwitch = choice === 'auto' && lang === 'fil-PH' && Platform.OS === 'android' && !switchDisabledRef.current
    usedSwitchRef.current = useSwitch
    const options: ExpoSpeechRecognitionOptions = {
      lang,
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      addsPunctuation: true,
      androidIntentOptions: {
        EXTRA_LANGUAGE_MODEL: 'free_form',
        // Android 14+ with downloaded models: follow a switch between Filipino and English
        // mid-sentence. Other phones ignore it, or error — then we retry without it (below).
        ...(useSwitch
          ? { EXTRA_ENABLE_LANGUAGE_SWITCH: 'balanced' as const, EXTRA_LANGUAGE_SWITCH_ALLOWED_LANGUAGES: SWITCH_LANGUAGES }
          : {}),
      },
    }
    activeRef.current = true
    module.start(options)
  }, [])

  const handleError = useCallback((event: ExpoSpeechRecognitionErrorEvent) => {
    activeRef.current = false
    setListening(false)
    if (event.error === 'aborted') return

    // Automatic language switching needs models some phones don't have — retry once without.
    if (usedSwitchRef.current && !retriedRef.current && ['language-not-supported', 'client', 'unknown'].includes(event.error)) {
      switchDisabledRef.current = true
      retriedRef.current = true
      begin()
      return
    }

    switch (event.error) {
      case 'not-allowed':
        Alert.alert('Microphone permission needed', 'Allow i-PESO to use the microphone to talk to ACE.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => { Linking.openSettings().catch(() => undefined) } },
        ])
        return
      case 'network':
        toast('Voice input needs an internet connection. Please check your connection and try again.', 'error')
        return
      case 'no-speech':
      case 'speech-timeout':
        toast('Walang narinig — I didn’t catch that. Tap the mic and try again.')
        return
      case 'language-not-supported':
        toast('This language isn’t supported for voice input on this phone. Try English, or type your message.', 'error')
        return
      case 'busy':
        toast('The speech service is busy. Please try again in a moment.', 'error')
        return
      case 'service-not-allowed':
        toast('Speech recognition isn’t available on this phone. You can still type your message.', 'error')
        return
      default:
        toast('Voice input stopped unexpectedly. Please try again, or type your message.', 'error')
    }
  }, [begin])

  // One set of listeners for the screen's lifetime; removed (and any session aborted) on unmount.
  useEffect(() => {
    const pkg = loadRecognition()
    if (!pkg) return undefined
    const module = pkg.ExpoSpeechRecognitionModule
    const subs = [
      module.addListener('start', () => setListening(true)),
      module.addListener('end', () => {
        activeRef.current = false
        setListening(false)
      }),
      module.addListener('result', (event) => {
        const spoken = event.results[0]?.transcript ?? ''
        if (spoken) onTextRef.current(joinText(baseRef.current, spoken))
      }),
      module.addListener('error', (event) => handleError(event)),
    ]
    return () => {
      subs.forEach((sub) => sub.remove())
      if (activeRef.current) {
        try { module.abort() } catch { /* already stopped */ }
      }
    }
  }, [handleError])

  /** Start listening; recognised words are appended to `currentText`. */
  const start = useCallback(async (currentText: string) => {
    const pkg = loadRecognition()
    if (!pkg) {
      Alert.alert(
        'Voice input needs the i-PESO app build',
        'The microphone works in the installed i-PESO app (development or release build), not in Expo Go. You can still type your message — and Listen works here.',
      )
      return
    }
    const module = pkg.ExpoSpeechRecognitionModule
    if (!module.isRecognitionAvailable()) {
      toast('Speech recognition isn’t available on this phone. You can still type your message.', 'error')
      return
    }
    const permission = await module.requestPermissionsAsync()
    if (!permission.granted) {
      if (permission.canAskAgain) {
        toast('Microphone permission is needed for voice input.', 'error')
      } else {
        Alert.alert('Microphone permission needed', 'Allow i-PESO to use the microphone (and speech recognition) in your phone settings to talk to ACE.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => { Linking.openSettings().catch(() => undefined) } },
        ])
      }
      return
    }
    baseRef.current = currentText.trim()
    retriedRef.current = false
    await begin()
  }, [begin])

  /** Stop listening and keep what was recognised so far. */
  const stop = useCallback(() => {
    const pkg = loadRecognition()
    if (!pkg || !activeRef.current) return
    try { pkg.ExpoSpeechRecognitionModule.stop() } catch { /* already stopped */ }
  }, [])

  return { listening, start, stop, language, setLanguage }
}
