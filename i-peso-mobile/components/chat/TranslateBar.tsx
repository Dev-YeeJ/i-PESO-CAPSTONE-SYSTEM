import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { PressableScale } from '@/components/ui/PressableScale'
import { chatbotService, TRANSLATE_LANGUAGES, type TranslateLanguage } from '@/services/chatbotService'
import { colors, radii, spacing, typography } from '@/theme'

interface Props {
  /** The reply as ACE wrote it. */
  original: string
  /** Called with the translated text, or null to show the original again. */
  onTranslated: (text: string | null) => void
}

/**
 * "Translate" under one of ACE's replies (panel revision #6, same feature as
 * the website): opens a row of the languages ACE understands. Inline chips
 * rather than a pop-up menu, so they're easy to tap. White + blue only.
 */
export function TranslateBar({ original, onTranslated }: Props) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<TranslateLanguage | null>(null)
  const [busy, setBusy] = useState<TranslateLanguage | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pick = async (language: TranslateLanguage) => {
    setBusy(language)
    setError(null)
    try {
      onTranslated(await chatbotService.translate(original, language))
      setCurrent(language)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not translate right now.')
    } finally {
      setBusy(null)
    }
  }

  const showOriginal = () => {
    setCurrent(null)
    onTranslated(null)
  }

  const currentLabel = TRANSLATE_LANGUAGES.find((l) => l.value === current)?.label

  return (
    <View style={styles.wrap}>
      {current ? (
        <Text style={styles.note}>
          Translated to {currentLabel} by ACE ·{' '}
          <Text style={styles.noteLink} onPress={showOriginal} accessibilityRole="button">Show original</Text>
        </Text>
      ) : null}

      <PressableScale
        scaleTo="buttonPress"
        ripple={null}
        onPress={() => setOpen((v) => !v)}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityLabel="Translate reply"
        accessibilityState={{ expanded: open }}
      >
        <MaterialIcons name="translate" size={14} color={colors.info} />
        <Text style={styles.toggleText}>Translate</Text>
      </PressableScale>

      {open ? (
        <View style={styles.chips} accessibilityLabel="Translate to">
          {TRANSLATE_LANGUAGES.map((language) => {
            const active = current === language.value
            return (
              <PressableScale
                key={language.value}
                scaleTo="buttonPress"
                ripple={null}
                disabled={Boolean(busy) || active}
                onPress={() => pick(language.value)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active, busy: busy === language.value }}
              >
                {busy === language.value ? <ActivityIndicator size="small" color={colors.info} /> : null}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{language.label}</Text>
              </PressableScale>
            )
          })}
        </View>
      ) : null}

      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xs, gap: spacing.xs, alignSelf: 'stretch' },
  note: { color: colors.textSecondary, fontSize: 11, lineHeight: 15 },
  noteLink: { color: colors.info, fontFamily: typography.family.bold, textDecorationLine: 'underline' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 2 },
  toggleText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    minHeight: 32,
  },
  chipActive: { borderColor: colors.info, backgroundColor: colors.info },
  chipText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  chipTextActive: { color: colors.white },
  error: { color: colors.danger, fontSize: 11 },
})
