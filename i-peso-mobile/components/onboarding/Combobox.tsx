import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme'

interface ComboboxProps<T> {
  label: string
  value: string
  onChangeText: (text: string) => void
  onSelect: (item: T) => void
  search: (query: string) => Promise<T[]>
  renderLabel: (item: T) => string
  renderSubLabel?: (item: T) => string | undefined | null
  keyExtractor: (item: T) => string
  placeholder?: string
  error?: string
  required?: boolean
  minChars?: number
  /**
   * When true, typing no longer commits on every keystroke — onChangeText only
   * fires when the seeker taps a real suggestion or explicitly confirms their
   * typed text via the "Use ... as-is" row. Without this, whatever's on screen
   * the moment the form saves becomes the stored value even if it was still
   * mid-search (e.g. "PROG" typed while aiming for "Programmer") — fine for a
   * free-text field like Institution, but wrong for something that gets
   * classified into a catalog occupation and shown back on a resume.
   */
  requireExplicitCommit?: boolean
}

export function Combobox<T>({
  label,
  value,
  onChangeText,
  onSelect,
  search,
  renderLabel,
  renderSubLabel,
  keyExtractor,
  placeholder,
  error,
  required = false,
  minChars = 2,
  requireExplicitCommit = false,
}: ComboboxProps<T>) {
  const [suggestions, setSuggestions] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const requestId = useRef(0)

  // Keeps the draft in sync whenever the committed value changes from outside
  // (a real selection, a reset, switching records) — only relevant in
  // requireExplicitCommit mode, where typing no longer drives `value` itself.
  useEffect(() => {
    if (requireExplicitCommit) setDraft(value)
  }, [value, requireExplicitCommit])

  const displayValue = requireExplicitCommit ? draft : value
  const trimmedDisplayValue = displayValue.trim()

  useEffect(() => {
    if (!open || trimmedDisplayValue.length < minChars) {
      setSuggestions([])
      return
    }

    const currentRequest = ++requestId.current
    const timer = setTimeout(() => {
      setLoading(true)
      search(trimmedDisplayValue)
        .then((results) => {
          if (requestId.current === currentRequest) setSuggestions(results)
        })
        .catch(() => {
          if (requestId.current === currentRequest) setSuggestions([])
        })
        .finally(() => {
          if (requestId.current === currentRequest) setLoading(false)
        })
    }, 300)

    return () => clearTimeout(timer)
  }, [trimmedDisplayValue, open, minChars, search])

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={displayValue}
        onChangeText={(text) => {
          if (requireExplicitCommit) setDraft(text)
          else onChangeText(text)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        autoCapitalize="words"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {open && trimmedDisplayValue.length >= minChars ? (
        <View style={styles.dropdown}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.info} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : suggestions.length ? (
            suggestions.slice(0, 8).map((item) => (
              <TouchableOpacity
                key={keyExtractor(item)}
                style={styles.suggestionRow}
                onPress={() => {
                  onSelect(item)
                  setOpen(false)
                  setSuggestions([])
                }}
              >
                <Text style={styles.suggestionLabel}>{renderLabel(item)}</Text>
                {renderSubLabel?.(item) ? <Text style={styles.suggestionSub}>{renderSubLabel(item)}</Text> : null}
              </TouchableOpacity>
            ))
          ) : requireExplicitCommit ? (
            <TouchableOpacity
              style={styles.suggestionRow}
              onPress={() => {
                onChangeText(trimmedDisplayValue)
                setOpen(false)
              }}
            >
              <Text style={styles.suggestionLabel}>Use &quot;{trimmedDisplayValue}&quot; as your job title</Text>
              <Text style={styles.suggestionSub}>No catalog match — this will be reviewed by PESO staff.</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.suggestionRow}>
              <Text style={styles.noResultsText}>No catalog matches — your typed text will be used as-is.</Text>
            </View>
          )}
          <TouchableOpacity style={styles.closeRow} onPress={() => setOpen(false)}>
            <Text style={styles.closeText}>Close suggestions</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.sm, color: colors.muted, fontSize: typography.small, fontFamily: typography.family.bold },
  required: { color: colors.danger },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.primary,
    fontSize: typography.body,
  },
  inputError: { borderColor: colors.danger },
  errorText: { marginTop: spacing.xs, color: colors.danger, fontSize: typography.small, fontFamily: typography.family.medium },
  dropdown: { marginTop: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, overflow: 'hidden' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  loadingText: { color: colors.secondaryText, fontSize: typography.small },
  suggestionRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestionLabel: { color: colors.primary, fontSize: typography.body, fontFamily: typography.family.medium },
  suggestionSub: { color: colors.secondaryText, fontSize: typography.small, marginTop: 2 },
  noResultsText: { color: colors.secondaryText, fontSize: typography.small, fontStyle: 'italic' },
  closeRow: { paddingVertical: spacing.sm, alignItems: 'center', backgroundColor: colors.background },
  closeText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
})
